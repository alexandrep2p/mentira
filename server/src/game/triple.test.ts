import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, LIMITS } from '@mentira/shared';
import { Room } from './room';
import { scoreTriple } from './scoring';
import { answerAllTriples, makeRoom, tripleRoom } from './test-utils';
import { buildView } from './view';

const json = (value: unknown) => JSON.stringify(value);

/** Joga até a escrita da próxima rodada: todos respondem e os cards são passados sem voto. */
function finishRound(room: Room, host: string, ids: string[]) {
  answerAllTriples(room, ids);
  while (room.phase === 'voting' || room.phase === 'reveal') room.advance(host);
  room.advance(host);
}

describe('modo 2 mentiras, 1 verdade: configuração', () => {
  it('o clássico é o padrão e o modo só muda com um valor válido', () => {
    expect(DEFAULT_SETTINGS.mode).toBe('classic');
    const { room, ids, host } = makeRoom();
    expect(room.setSettings(ids[1], { mode: 'twoLiesOneTruth' })).toEqual({ ok: false, error: 'NOT_HOST' });
    expect(room.setSettings(host, { mode: 'outro' as never })).toEqual({ ok: false, error: 'INVALID_SETTINGS' });
    expect(room.setSettings(host, { mode: 'twoLiesOneTruth' })).toEqual({ ok: true });
    expect(room.settings.mode).toBe('twoLiesOneTruth');
  });

  it('eventos do outro modo são recusados', () => {
    const { room, ids } = tripleRoom();
    expect(room.submitAnswer(ids[0], 'Resposta', true)).toEqual({ ok: false, error: 'WRONG_PHASE' });
    answerAllTriples(room, ids);
    const voter = ids.find((id) => id !== room.currentAuthorId())!;
    expect(room.castVote(voter, true)).toEqual({ ok: false, error: 'WRONG_PHASE' });
  });
});

describe('modo 2 mentiras, 1 verdade: rodízio de perguntas', () => {
  it('na mesma rodada as perguntas diferem e ninguém repete pergunta', () => {
    const { room, ids, host } = tripleRoom();
    const asked = new Map(ids.map((id) => [id, new Set<string>()]));
    for (let r = 0; r < 3; r++) {
      const questions = ids.map((id) => room.questionFor(id));
      expect(new Set(questions).size).toBe(3);
      ids.forEach((id, i) => asked.get(id)!.add(questions[i]));
      finishRound(room, host, ids);
    }
    expect(room.phase).toBe('final');
    for (const seen of asked.values()) expect(seen.size).toBe(3);
  });

  it('com mais jogadores que perguntas, ninguém repete entre rodadas', () => {
    const { room, ids, host } = tripleRoom(['A', 'B', 'C', 'D', 'E'], ['Pergunta um?', 'Pergunta dois?']);
    const first = ids.map((id) => room.questionFor(id));
    expect(new Set(first).size).toBe(2);
    finishRound(room, host, ids);
    ids.forEach((id, i) => expect(room.questionFor(id)).not.toBe(first[i]));
  });

  it('quem entra no meio recebe pergunta a partir da rodada seguinte', () => {
    const { room, ids, host } = tripleRoom();
    const late = room.join('Duda');
    if (!late.ok) throw new Error(late.error);
    expect(room.questionFor(late.player.id)).toBe('');
    finishRound(room, host, ids);
    expect(room.phase).toBe('writing');
    expect(room.questionFor(late.player.id)).not.toBe('');
  });

  it('jogar de novo sorteia o rodízio outra vez, sem deslocamentos antigos', () => {
    const { room, ids, host } = tripleRoom();
    room.end(host);
    room.playAgain(host);
    expect(room.start(host)).toEqual({ ok: true });
    ids.forEach((id) => expect(room.questionFor(id)).not.toBe(''));
  });
});

describe('modo 2 mentiras, 1 verdade: escrita', () => {
  it('valida as 3 frases', () => {
    const { room, ids } = tripleRoom();
    const invalid = { ok: false, error: 'INVALID_TRIPLE' };
    expect(room.submitTriple(ids[0], 'Uma', ['Duas'])).toEqual(invalid);
    expect(room.submitTriple(ids[0], '  ', ['Duas', 'Três'])).toEqual(invalid);
    expect(room.submitTriple(ids[0], 'Uma', ['Duas', 5])).toEqual(invalid);
    expect(room.submitTriple(ids[0], 'x'.repeat(LIMITS.answerMax + 1), ['Duas', 'Três'])).toEqual(invalid);
    expect(room.submitTriple(ids[0], 'Igual', ['igual ', 'Três'])).toEqual(invalid);
    expect(room.submitTriple(ids[0], 'Uma', ['Duas', 'Três'])).toEqual({ ok: true });
  });

  it('embaralha as frases e guarda a posição da verdade', () => {
    let seq = 0;
    const room = new Room('TEST', { now: () => 0, random: () => 0, id: () => `id${++seq}` });
    const a = room.join('Ana');
    const b = room.join('Bruno');
    if (!a.ok || !b.ok) throw new Error('join');
    room.setSettings(a.player.id, { mode: 'twoLiesOneTruth' });
    room.setQuestions(a.player.id, ['Pergunta um?']);
    room.start(a.player.id);
    room.submitTriple(a.player.id, 'Verdade', ['Mentira 1', 'Mentira 2']);
    expect(room.round!.triples.get(a.player.id)).toEqual({
      statements: ['Mentira 1', 'Mentira 2', 'Verdade'],
      truthIndex: 2,
    });
  });

  it('dá para editar até a fase fechar, e quem não respondeu fica sem card', () => {
    const { room, ids, host } = tripleRoom();
    room.submitTriple(ids[0], 'Uma', ['Duas', 'Três']);
    room.submitTriple(ids[0], 'Outra', ['Duas', 'Três']);
    room.submitTriple(ids[1], 'Uma', ['Duas', 'Três']);
    room.advance(host);
    expect(room.phase).toBe('voting');
    expect([...room.round!.cardOrder].sort()).toEqual([ids[0], ids[1]].sort());
    expect(buildView(room, room.currentAuthorId()!, 0).voting!.statements).toHaveLength(3);
  });
});

describe('modo 2 mentiras, 1 verdade: votação e pontos', () => {
  it('fecha quando todos votam, pontua e não gera títulos que não se aplicam', () => {
    const { room, ids, host } = tripleRoom(['A', 'B', 'C']);
    answerAllTriples(room, ids);
    const author = room.currentAuthorId()!;
    const [right, wrong] = ids.filter((id) => id !== author);
    const { truthIndex } = room.round!.triples.get(author)!;
    expect(room.pickVote(author, 0)).toEqual({ ok: false, error: 'NOT_ELIGIBLE' });
    expect(room.pickVote(right, 3)).toEqual({ ok: false, error: 'NOT_ELIGIBLE' });
    expect(room.pickVote(right, 1.5)).toEqual({ ok: false, error: 'NOT_ELIGIBLE' });
    room.pickVote(right, (truthIndex + 1) % 3);
    room.pickVote(right, truthIndex); // troca o voto
    expect(room.phase).toBe('voting');
    room.pickVote(wrong, (truthIndex + 1) % 3);
    expect(room.phase).toBe('reveal');

    expect(room.players.get(right)!.score).toBe(1);
    expect(room.players.get(wrong)!.score).toBe(0);
    expect(room.players.get(author)!.score).toBe(1);
    expect(room.players.get(author)!.stats.fooledWithLies).toBe(1);

    room.end(host);
    const keys = room.final!.titles.map((t) => t.key).sort();
    expect(keys).toEqual(['detector', 'liar']);
  });

  it('scoreTriple conta os votos por frase', () => {
    const picks = new Map([['b', 0], ['c', 0], ['d', 2]]);
    const result = scoreTriple('a', { statements: ['X', 'Y', 'Z'], truthIndex: 2 }, picks);
    expect(result.text).toBe('Z');
    expect(result.triple!.picks).toEqual([2, 0, 1]);
    expect(result.points).toEqual(
      expect.arrayContaining([{ playerId: 'a', delta: 2 }, { playerId: 'd', delta: 1 }]),
    );
  });

  it('remover o autor do card atual passa para o próximo sem travar', () => {
    const { room, ids, host } = tripleRoom(['A', 'B', 'C']);
    answerAllTriples(room, ids);
    const author = room.currentAuthorId()!;
    room.kick(host, author === host ? ids[1] : author);
    expect(['voting', 'roundScore', 'reveal']).toContain(room.phase);
    expect(() => buildView(room, host, 0)).not.toThrow();
  });
});

describe('modo 2 mentiras, 1 verdade: segredos', () => {
  it('na escrita, cada um só vê a própria pergunta e as próprias frases', () => {
    const { room, ids } = tripleRoom();
    room.submitTriple(ids[0], 'SECRETA-VERDADE', ['SECRETA-M1', 'SECRETA-M2']);
    const mine = buildView(room, ids[0], 0).writing!;
    expect(mine.myTriple!.truth).toBe('SECRETA-VERDADE');
    expect([...mine.myTriple!.lies].sort()).toEqual(['SECRETA-M1', 'SECRETA-M2']);
    expect(json(buildView(room, ids[1], 0))).not.toContain('SECRETA');
  });

  it('na votação, só o autor recebe a posição da verdade', () => {
    const { room, ids } = tripleRoom();
    answerAllTriples(room, ids);
    const author = room.currentAuthorId()!;
    const voter = ids.find((id) => id !== author)!;
    room.pickVote(voter, 1);
    const voterView = buildView(room, voter, 0);
    expect(voterView.voting!.myTruthIndex).toBeNull();
    expect(voterView.voting!.myPick).toBe(1);
    expect(json(voterView)).not.toContain('"truthIndex"');
    expect(buildView(room, author, 0).voting!.myTruthIndex).toBe(room.round!.triples.get(author)!.truthIndex);
    const other = ids.find((id) => id !== author && id !== voter)!;
    expect(buildView(room, other, 0).voting!.myPick).toBeNull();
  });

  it('no modo anônimo, a revelação traz contagens, sem dizer quem votou em quê', () => {
    const { room, ids } = makeTripleAnonymous();
    answerAllTriples(room, ids);
    const author = room.currentAuthorId()!;
    const voters = ids.filter((id) => id !== author);
    voters.forEach((id) => room.pickVote(id, 0));
    const reveal = buildView(room, voters[0], 0).reveal!;
    expect(reveal.result.authorId).toBeNull();
    expect(reveal.result.votes.map((v) => v.voterId)).toEqual([voters[0]]);
    expect(reveal.result.triple!.picks[0]).toBe(voters.length);
  });
});

function makeTripleAnonymous() {
  const ctx = makeRoom(['A', 'B', 'C', 'D']);
  ctx.room.setSettings(ctx.host, { mode: 'twoLiesOneTruth', anonymous: true });
  ctx.room.setQuestions(ctx.host, ['Pergunta um?', 'Pergunta dois?']);
  ctx.room.start(ctx.host);
  return ctx;
}
