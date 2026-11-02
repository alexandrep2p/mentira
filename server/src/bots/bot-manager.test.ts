import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HOST_GRACE_MS, QUESTION_BANK } from '@mentira/shared';
import { makeRoom } from '../game/test-utils';
import type { Room } from '../game/room';
import { ANSWERS, createAnswerPicker } from './answers';
import { BotManager } from './bot-manager';

/** Sala com 1 humano (host) e N bots; onChange faz o papel do broadcast. */
function trainingRoom(bots = 2) {
  const ctx = makeRoom(['Ana']);
  const manager: BotManager = new BotManager((room: Room) => manager.react(room));
  const added = manager.addBots(ctx.room, bots);
  return { ...ctx, manager, added };
}

describe('BotManager', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('adiciona bots com nomes livres e eles contam para iniciar', () => {
    const ctx = makeRoom(['Bia']);
    const manager = new BotManager(() => {});
    expect(manager.addBots(ctx.room, 2)).toBe(2);
    const names = ctx.room.bots().map((b) => b.nickname);
    expect(names).toEqual(['Caio', 'Duda']);
    ctx.room.setQuestions(ctx.host, ['Pergunta um?']);
    expect(ctx.room.start(ctx.host)).toEqual({ ok: true });
  });

  it('bots respondem e votam sozinhos até a revelação', () => {
    // Atrasos sempre no máximo: sem isso, um bot pode votar no 1º card antes da checagem.
    vi.spyOn(Math, 'random').mockReturnValue(0.99);
    const { room, host, manager } = trainingRoom(2);
    room.setQuestions(host, ['Pergunta um?']);
    room.start(host);
    manager.react(room);

    room.submitAnswer(host, 'Minha resposta', true);
    manager.react(room);
    expect(room.phase).toBe('writing');

    vi.advanceTimersByTime(13_000); // bots respondem em até 12 s
    expect(room.phase).toBe('voting');

    // Em cada card o humano vota (quando pode) e os bots votam sozinhos.
    for (let card = 0; card < 3; card++) {
      expect(room.phase).toBe('voting');
      if (room.currentAuthorId() !== host) room.castVote(host, false);
      manager.react(room);
      vi.advanceTimersByTime(10_000); // bots votam em até 9 s
      expect(room.phase).toBe('reveal');
      room.advance(host);
      manager.react(room);
    }
    expect(room.phase).toBe('roundScore');
  });

  it('no 2 mentiras, 1 verdade, bots escrevem 3 frases e votam sozinhos', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.99);
    const { room, host, manager } = trainingRoom(2);
    room.setSettings(host, { mode: 'twoLiesOneTruth' });
    room.setQuestions(host, ['Pergunta um?']);
    room.start(host);
    manager.react(room);

    room.submitTriple(host, 'Verdade', ['Mentira um', 'Mentira dois']);
    manager.react(room);
    vi.advanceTimersByTime(13_000);
    expect(room.phase).toBe('voting');
    expect(room.round!.triples.size).toBe(3);

    for (let card = 0; card < 3; card++) {
      if (room.currentAuthorId() !== host) room.pickVote(host, 0);
      manager.react(room);
      vi.advanceTimersByTime(10_000);
      expect(room.phase).toBe('reveal');
      room.advance(host);
      manager.react(room);
    }
    expect(room.phase).toBe('roundScore');
  });

  it('toda pergunta do banco tem respostas próprias, com verdades e mentiras suficientes', () => {
    for (const question of QUESTION_BANK) {
      const answers = ANSWERS[question] ?? [];
      expect(answers.filter(([, truth]) => truth).length, question).toBeGreaterThanOrEqual(1);
      expect(answers.filter(([, truth]) => !truth).length, question).toBeGreaterThanOrEqual(2);
    }
  });

  it('com respostas próprias sobrando, os bots não usam as genéricas', () => {
    const picker = createAnswerPicker();
    const question = QUESTION_BANK[15];
    const own = new Set(ANSWERS[question].map(([text]) => text));
    for (let i = 0; i < ANSWERS[question].length; i++) expect(own.has(picker.pick(0, question)[0])).toBe(true);
    const { truth, lies } = createAnswerPicker().pickTriple(0, question);
    expect([truth, ...lies].every((text) => own.has(text))).toBe(true);
  });

  it('frases dos bots nunca se repetem no mesmo card, mesmo com o banco esgotado', () => {
    const picker = createAnswerPicker();
    for (let i = 0; i < 20; i++) {
      const { truth, lies } = picker.pickTriple(0, 'Pergunta fora do banco?');
      expect(new Set([truth, ...lies]).size).toBe(3);
    }
  });

  it('bot nunca vira host', () => {
    const { room, host, clock } = trainingRoom(2);
    room.disconnect(host);
    expect(room.sweep(clock.now + HOST_GRACE_MS * 2)).toBe(false);
    expect(room.hostId).toBe(host);
    room.leave(host);
    expect(room.bots().some((b) => b.id === room.hostId)).toBe(false);
  });

  it('sala só com bots conta como vazia e expira', () => {
    const { room, host, clock } = trainingRoom(2);
    expect(room.emptySince).toBeNull();
    room.disconnect(host);
    // Os bots continuam "conectados", mas a sala já conta como vazia.
    expect(room.bots().every((b) => b.connected)).toBe(true);
    expect(room.emptySince).toBe(clock.now);
  });

  it('forget cancela as ações pendentes', () => {
    const { room, host, manager } = trainingRoom(2);
    room.setQuestions(host, ['Pergunta um?']);
    room.start(host);
    manager.react(room);
    manager.forget(room.code);
    vi.advanceTimersByTime(20_000);
    expect(room.round!.answers.size).toBe(0);
  });
});
