import type { CardResult, RoomView } from '@mentira/shared';
import type { Room } from './room';

/**
 * Único ponto que transforma o estado interno em RoomView. Nunca expõe
 * tokens, respostas alheias na escrita, a marcação V/M de um card antes da
 * revelação, nem os votos de outros jogadores antes da revelação.
 *
 * No modo anônimo também esconde o autor de cada card de quem não é o autor:
 * o id, quem pode votar e quem votou (o autor sairia por exclusão), os pontos
 * da rodada em andamento e quem mais enganou na rodada.
 */
export function buildView(room: Room, playerId: string, now: number): RoomView {
  const me = room.players.get(playerId);
  const isHost = playerId === room.hostId;
  const round = room.round;
  const anonymous = room.settings.anonymous;
  // Placar congelado no início da rodada enquanto os cards são revelados.
  const hideScores = anonymous && round && (room.phase === 'voting' || room.phase === 'reveal');

  const view: RoomView = {
    code: room.code,
    me: { id: playerId, isHost, isActive: me ? room.isActive(me) : false },
    hostId: room.hostId,
    phase: room.phase,
    players: [...room.players.values()]
      .sort((a, b) => a.joinedAt - b.joinedAt)
      .map((p) => ({
        id: p.id,
        nickname: p.nickname,
        avatar: p.avatar,
        color: p.color,
        connected: p.connected,
        score: hideScores ? p.score - (round.deltas.get(p.id) ?? 0) : p.score,
        isHost: p.id === room.hostId,
        isActive: room.isActive(p),
      })),
    questions: isHost ? [...room.questions] : null,
    questionCount: room.questions.length,
    settings: { ...room.settings },
    roundIndex: room.roundIndex,
    deadline: room.deadline,
    serverNow: now,
  };

  if (!round) {
    if (room.phase === 'final' && room.final) view.final = structuredClone(room.final);
    return view;
  }

  switch (room.phase) {
    case 'writing': {
      const mine = round.answers.get(playerId);
      view.writing = {
        question: round.question,
        submittedIds: [...round.answers.keys()],
        myAnswer: mine ? { ...mine } : null,
      };
      break;
    }
    case 'voting': {
      const authorId = round.cardOrder[round.cardIndex];
      const answer = round.answers.get(authorId)!;
      const myVote = round.votes.get(playerId);
      const votedIds = [...round.votes.keys()];
      const eligibleIds = room.eligibleVoters().map((p) => p.id);
      const hide = anonymous && authorId !== playerId;
      const onlyMe = (ids: string[]) => (anonymous ? ids.filter((id) => id === playerId) : ids);
      view.voting = {
        question: round.question,
        cardNumber: round.cardIndex + 1,
        cardTotal: round.cardOrder.length,
        authorId: hide ? null : authorId,
        text: answer.text,
        votedIds: onlyMe(votedIds),
        eligibleIds: onlyMe(eligibleIds),
        votedCount: votedIds.length,
        eligibleCount: eligibleIds.length,
        myVote: myVote ?? null,
        myAnswerIsTruth: authorId === playerId ? answer.isTruth : null,
      };
      break;
    }
    case 'reveal': {
      const result: CardResult = structuredClone(round.cardResults.at(-1)!);
      const correctCount = result.votes.filter((v) => v.correct).length;
      if (anonymous) {
        result.votes = result.votes.filter((v) => v.voterId === playerId);
        result.points = result.points.filter((p) => p.playerId === playerId);
        if (result.authorId !== playerId) result.authorId = null;
      }
      view.reveal = {
        question: round.question,
        cardNumber: round.cardIndex + 1,
        cardTotal: round.cardOrder.length,
        result,
        correctCount,
        fooledCount: round.cardResults.at(-1)!.votes.length - correctCount,
      };
      break;
    }
    case 'roundScore': {
      const fooled = new Map<string, number>();
      for (const result of round.cardResults) {
        const wrong = result.votes.filter((v) => !v.correct).length;
        fooled.set(result.authorId, (fooled.get(result.authorId) ?? 0) + wrong);
      }
      const top = [...fooled].sort((a, b) => b[1] - a[1])[0];
      const isLastRound = room.roundIndex + 1 >= room.questions.length;
      view.roundScore = {
        question: round.question,
        deltas: Object.fromEntries(round.deltas),
        isLastRound,
        nextQuestion: isLastRound ? null : room.questions[room.roundIndex + 1],
        topFooler: !anonymous && top && top[1] > 0 ? { playerId: top[0], fooled: top[1] } : null,
      };
      break;
    }
    case 'final':
      if (room.final) view.final = structuredClone(room.final);
      break;
  }
  return view;
}
