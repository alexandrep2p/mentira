import { describe, expect, it } from 'vitest';
import { AVATAR_EMOJIS, HOST_GRACE_MS, LIMITS } from '@mentira/shared';
import { answerAll, makeRoom, startedRoom } from './test-utils';

describe('lobby', () => {
  it('o primeiro jogador vira host', () => {
    const { room, ids } = makeRoom();
    expect(room.hostId).toBe(ids[0]);
  });

  it('valida apelidos', () => {
    const { room } = makeRoom();
    expect(room.join('   ')).toEqual({ ok: false, error: 'INVALID_NICKNAME' });
    expect(room.join('x'.repeat(LIMITS.nicknameMax + 1))).toEqual({ ok: false, error: 'INVALID_NICKNAME' });
    expect(room.join('  ana ')).toEqual({ ok: false, error: 'NICKNAME_TAKEN' });
  });

  it('aceita só avatares da lista e sorteia um quando não vem nenhum', () => {
    const { room } = makeRoom();
    expect(room.join('Edu', '🍕')).toEqual({ ok: false, error: 'INVALID_AVATAR' });
    expect(room.join('Edu', 42)).toEqual({ ok: false, error: 'INVALID_AVATAR' });
    const chosen = room.join('Edu', '🕵️‍♀️');
    expect(chosen.ok && chosen.player.avatar).toBe('🕵️‍♀️');
    const random = room.join('Fabi');
    expect(random.ok && AVATAR_EMOJIS.includes(random.player.avatar)).toBe(true);
  });

  it('respeita o limite de jogadores', () => {
    const { room } = makeRoom(Array.from({ length: LIMITS.maxPlayers }, (_, i) => `P${i}`));
    expect(room.join('Extra')).toEqual({ ok: false, error: 'ROOM_FULL' });
  });

  it('dá cores diferentes a cada jogador', () => {
    const { room } = makeRoom(['A', 'B', 'C', 'D']);
    const colors = [...room.players.values()].map((p) => p.color);
    expect(new Set(colors).size).toBe(4);
  });

  it('só o host configura e inicia', () => {
    const { room, ids, host } = makeRoom();
    expect(room.setQuestions(ids[1], ['Qual?'])).toEqual({ ok: false, error: 'NOT_HOST' });
    expect(room.start(host)).toEqual({ ok: false, error: 'NO_QUESTIONS' });
    expect(room.setQuestions(host, ['ab'])).toEqual({ ok: false, error: 'INVALID_QUESTIONS' });
    expect(room.setQuestions(host, ['Qual foi?'])).toEqual({ ok: true });
    expect(room.start(host)).toEqual({ ok: true });
    expect(room.phase).toBe('writing');
  });

  it('exige 3 jogadores conectados para iniciar', () => {
    const { room, ids, host } = makeRoom();
    room.setQuestions(host, ['Qual foi?']);
    room.disconnect(ids[2]);
    expect(room.start(host)).toEqual({ ok: false, error: 'NOT_ENOUGH_PLAYERS' });
  });

  it('valida configurações', () => {
    const { room, host } = makeRoom();
    expect(room.setSettings(host, { writingSeconds: 5 })).toEqual({ ok: false, error: 'INVALID_SETTINGS' });
    expect(room.setSettings(host, { votingSeconds: null, autoAdvanceReveal: true })).toEqual({ ok: true });
    expect(room.settings).toMatchObject({ votingSeconds: null, autoAdvanceReveal: true });
  });

  it('host pode remover jogador', () => {
    const { room, ids, host } = makeRoom();
    expect(room.kick(ids[1], ids[2])).toEqual({ ok: false, error: 'NOT_HOST' });
    expect(room.kick(host, ids[2])).toEqual({ ok: true });
    expect(room.players.has(ids[2])).toBe(false);
  });
});

describe('escrita', () => {
  it('fecha quando todos respondem e embaralha os cards', () => {
    const { room, ids } = startedRoom();
    room.submitAnswer(ids[0], 'Oi', true);
    room.submitAnswer(ids[1], 'Olá', false);
    expect(room.phase).toBe('writing');
    room.submitAnswer(ids[2], 'Eae', true);
    expect(room.phase).toBe('voting');
    expect(room.round!.cardOrder).toHaveLength(3);
  });

  it('permite editar a resposta antes de fechar', () => {
    const { room, ids } = startedRoom();
    room.submitAnswer(ids[0], 'Primeira', true);
    room.submitAnswer(ids[0], 'Segunda', false);
    expect(room.round!.answers.get(ids[0])).toEqual({ text: 'Segunda', isTruth: false });
  });

  it('valida a resposta', () => {
    const { room, ids } = startedRoom();
    expect(room.submitAnswer(ids[0], '  ', true)).toEqual({ ok: false, error: 'INVALID_ANSWER' });
    expect(room.submitAnswer(ids[0], 'x'.repeat(LIMITS.answerMax + 1), true)).toEqual({ ok: false, error: 'INVALID_ANSWER' });
    expect(room.submitAnswer(ids[0], 'ok', 'sim')).toEqual({ ok: false, error: 'INVALID_ANSWER' });
  });

  it('fecha no timeout; quem não respondeu fica sem card', () => {
    const { room, ids, clock } = startedRoom();
    room.submitAnswer(ids[0], 'Oi', true);
    clock.now = room.deadline! + 1;
    expect(room.tick(clock.now)).toBe(true);
    expect(room.phase).toBe('voting');
    expect(room.round!.cardOrder).toEqual([ids[0]]);
  });

  it('sem respostas vai direto para o placar', () => {
    const { room, host } = startedRoom();
    room.advance(host);
    expect(room.phase).toBe('roundScore');
  });

  it('jogador desconectado não trava a escrita', () => {
    const { room, ids } = startedRoom();
    room.submitAnswer(ids[0], 'Oi', true);
    room.submitAnswer(ids[1], 'Olá', true);
    room.disconnect(ids[2]);
    expect(room.phase).toBe('voting');
  });
});

describe('votação e revelação', () => {
  it('autor não vota no próprio card', () => {
    const { room, ids } = startedRoom();
    answerAll(room, ids);
    const author = room.currentAuthorId()!;
    expect(room.castVote(author, true)).toEqual({ ok: false, error: 'NOT_ELIGIBLE' });
  });

  it('revela quando todos votam e pontua', () => {
    const { room, ids } = startedRoom();
    answerAll(room, ids, []); // todos mentem
    const author = room.currentAuthorId()!;
    const voters = ids.filter((id) => id !== author);
    room.castVote(voters[0], true); // enganado
    expect(room.phase).toBe('voting');
    room.castVote(voters[1], false); // acertou
    expect(room.phase).toBe('reveal');
    expect(room.players.get(author)!.score).toBe(1);
    expect(room.players.get(voters[1])!.score).toBe(1);
    expect(room.players.get(voters[0])!.score).toBe(0);
  });

  it('permite trocar o voto', () => {
    const { room, ids } = startedRoom(['A', 'B', 'C', 'D']);
    answerAll(room, ids);
    const voter = ids.find((id) => id !== room.currentAuthorId())!;
    room.castVote(voter, true);
    room.castVote(voter, false);
    expect(room.round!.votes.get(voter)).toBe(false);
  });

  it('percorre cards, placar da rodada e final', () => {
    const { room, ids, host } = startedRoom();
    answerAll(room, ids);
    for (let card = 0; card < 3; card++) {
      expect(room.phase).toBe('voting');
      room.advance(host);
      expect(room.phase).toBe('reveal');
      room.advance(host);
    }
    expect(room.phase).toBe('roundScore');
    room.advance(host);
    expect(room.phase).toBe('writing');
    expect(room.roundIndex).toBe(1);
    room.advance(host); // ninguém respondeu
    room.advance(host);
    expect(room.phase).toBe('final');
    expect(room.final!.ranking).toHaveLength(3);
  });

  it('pular card não dá pontos', () => {
    const { room, ids, host } = startedRoom();
    answerAll(room, ids);
    const voter = ids.find((id) => id !== room.currentAuthorId())!;
    room.castVote(voter, false);
    room.skipCard(host);
    expect(room.phase).toBe('voting');
    expect(room.round!.cardIndex).toBe(1);
    expect([...room.players.values()].every((p) => p.score === 0)).toBe(true);
  });

  it('avanço automático após a revelação', () => {
    const { room, ids, host, clock } = makeRoom();
    room.setQuestions(host, ['Qual foi?']);
    room.setSettings(host, { autoAdvanceReveal: true });
    room.start(host);
    answerAll(room, ids);
    room.advance(host);
    expect(room.phase).toBe('reveal');
    clock.now = room.deadline! + 1;
    room.tick(clock.now);
    expect(room.phase).toBe('voting');
  });

  it('desconectar durante a votação não trava', () => {
    const { room, ids } = startedRoom();
    answerAll(room, ids);
    const voters = ids.filter((id) => id !== room.currentAuthorId());
    room.castVote(voters[0], true);
    room.disconnect(voters[1]);
    expect(room.phase).toBe('reveal');
  });

  it('remover o autor do card atual pula para o próximo', () => {
    const { room, ids, host } = startedRoom(['A', 'B', 'C', 'D']);
    answerAll(room, ids);
    room.skipCard(host); // o primeiro card é do host
    const author = room.currentAuthorId()!;
    expect(author).not.toBe(host);
    room.kick(host, author);
    expect(room.phase).toBe('voting');
    expect(room.round!.cardOrder).not.toContain(author);
    expect(room.currentAuthorId()).not.toBe(author);
  });

  it('encerrar e jogar de novo zera o placar', () => {
    const { room, ids, host } = startedRoom();
    answerAll(room, ids);
    room.advance(host);
    room.end(host);
    expect(room.phase).toBe('final');
    room.playAgain(host);
    expect(room.phase).toBe('lobby');
    expect([...room.players.values()].every((p) => p.score === 0)).toBe(true);
  });
});

describe('presença', () => {
  it('quem entra no meio joga a partir da próxima rodada', () => {
    const { room, ids, host } = startedRoom();
    const late = room.join('Atrasado');
    if (!late.ok) throw new Error();
    expect(room.submitAnswer(late.player.id, 'oi', true)).toEqual({ ok: false, error: 'NOT_ELIGIBLE' });
    answerAll(room, ids);
    expect(room.phase).toBe('voting');
    while (room.phase !== 'roundScore') room.advance(host);
    room.advance(host);
    expect(room.submitAnswer(late.player.id, 'oi', true)).toEqual({ ok: true });
  });

  it('host desconectado perde o posto após a graça', () => {
    const { room, ids, host, clock } = makeRoom();
    room.disconnect(host);
    expect(room.sweep(clock.now + HOST_GRACE_MS - 1)).toBe(false);
    expect(room.sweep(clock.now + HOST_GRACE_MS)).toBe(true);
    expect(room.hostId).toBe(ids[1]);
    room.connect(host);
    expect(room.hostId).toBe(ids[1]);
  });

  it('host que sai passa o posto na hora', () => {
    const { room, ids, host } = makeRoom();
    room.leave(host);
    expect(room.hostId).toBe(ids[1]);
  });

  it('host que volta dentro da graça continua host', () => {
    const { room, host, clock } = makeRoom();
    room.disconnect(host);
    room.connect(host);
    expect(room.sweep(clock.now + HOST_GRACE_MS * 2)).toBe(false);
    expect(room.hostId).toBe(host);
  });
});
