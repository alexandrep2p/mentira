import type { RoomView } from '@mentira/shared';
import type { Room } from './room';

/**
 * Único ponto que transforma o estado interno em RoomView. Nunca expõe
 * tokens, respostas alheias na escrita, a marcação V/M de um card antes da
 * revelação, nem os votos de outros jogadores antes da revelação.
 */
export function buildView(room: Room, playerId: string, now: number): RoomView {
  const me = room.players.get(playerId);
  const isHost = playerId === room.hostId;
  const round = room.round;

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
        score: p.score,
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
      view.voting = {
        question: round.question,
        cardNumber: round.cardIndex + 1,
        cardTotal: round.cardOrder.length,
        authorId,
        text: answer.text,
        votedIds: [...round.votes.keys()],
        eligibleIds: room.eligibleVoters().map((p) => p.id),
        myVote: myVote ?? null,
        myAnswerIsTruth: authorId === playerId ? answer.isTruth : null,
      };
      break;
    }
    case 'reveal': {
      const result = round.cardResults.at(-1)!;
      view.reveal = {
        question: round.question,
        cardNumber: round.cardIndex + 1,
        cardTotal: round.cardOrder.length,
        result: structuredClone(result),
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
        topFooler: top && top[1] > 0 ? { playerId: top[0], fooled: top[1] } : null,
      };
      break;
    }
    case 'final':
      if (room.final) view.final = structuredClone(room.final);
      break;
  }
  return view;
}
