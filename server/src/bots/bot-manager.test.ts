import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HOST_GRACE_MS } from '@mentira/shared';
import { makeRoom } from '../game/test-utils';
import type { Room } from '../game/room';
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
  afterEach(() => vi.useRealTimers());

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
