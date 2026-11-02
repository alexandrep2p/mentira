import { AVATAR_EMOJIS, TRIPLE_STATEMENTS } from '@mentira/shared';
import type { Room } from '../game/room';
import { BOT_NAMES, createAnswerPicker } from './answers';

export const MAX_BOTS = BOT_NAMES.length;

interface RoomBots {
  picker: ReturnType<typeof createAnswerPicker>;
  /** Ações já agendadas (uma por bot por fase), para não repetir. */
  scheduled: Set<string>;
  timers: Set<NodeJS.Timeout>;
}

const rand = (min: number, max: number) => min + Math.random() * (max - min);

/**
 * Bots que rodam dentro do servidor (modo treino `?bots=N`). Agem chamando os
 * métodos da Room diretamente, com atrasos aleatórios, e avisam via onChange
 * para que o estado seja reenviado aos humanos.
 */
export class BotManager {
  private readonly rooms = new Map<string, RoomBots>();

  constructor(private readonly onChange: (room: Room) => void) {}

  /** Adiciona até `count` bots com nomes livres na sala. Devolve quantos entraram. */
  addBots(room: Room, count: number): number {
    const taken = new Set([...room.players.values()].map((p) => p.nickname.toLocaleLowerCase('pt-BR')));
    const names = BOT_NAMES.filter((n) => !taken.has(n.toLocaleLowerCase('pt-BR'))).slice(0, Math.min(count, MAX_BOTS));
    const avatars = [...AVATAR_EMOJIS].sort(() => Math.random() - 0.5);
    let added = 0;
    names.forEach((name, i) => {
      if (room.addBot(name, avatars[i % avatars.length]).ok) added++;
    });
    return added;
  }

  /** Chamado a cada mudança de estado da sala: agenda o que os bots precisam fazer. */
  react(room: Room) {
    const bots = room.bots();
    if (bots.length === 0) return;
    const state = this.state(room.code);

    if (room.phase === 'lobby') {
      state.scheduled.clear();
      state.picker.reset();
      return;
    }

    const round = room.round;
    if (!round) return;
    const roundIndex = room.roundIndex;

    if (room.phase === 'writing') {
      const answered = new Set(room.answeredIds());
      for (const bot of bots) {
        if (!room.isActive(bot) || answered.has(bot.id)) continue;
        this.schedule(state, `w${roundIndex}:${bot.id}`, rand(4000, 12000), () => {
          if (room.phase !== 'writing' || room.roundIndex !== roundIndex) return;
          const question = room.questionFor(bot.id);
          let done;
          if (room.isTriple) {
            const { truth, lies } = state.picker.pickTriple(roundIndex, question);
            done = room.submitTriple(bot.id, truth, lies);
          } else {
            const [text, isTruth] = state.picker.pick(roundIndex, question);
            done = room.submitAnswer(bot.id, text, isTruth);
          }
          if (done.ok) this.onChange(room);
        });
      }
    }

    if (room.phase === 'voting') {
      const cardIndex = round.cardIndex;
      const eligible = new Set(room.eligibleVoters().map((p) => p.id));
      const voted = new Set(room.votedIds());
      for (const bot of bots) {
        if (!eligible.has(bot.id) || voted.has(bot.id)) continue;
        this.schedule(state, `v${roundIndex}-${cardIndex}:${bot.id}`, rand(2500, 9000), () => {
          if (room.phase !== 'voting' || room.roundIndex !== roundIndex || room.round?.cardIndex !== cardIndex) return;
          const done = room.isTriple
            ? room.pickVote(bot.id, Math.floor(Math.random() * TRIPLE_STATEMENTS))
            : room.castVote(bot.id, Math.random() < 0.55);
          if (done.ok) this.onChange(room);
        });
      }
    }
  }

  /** Cancela os timers de uma sala descartada. */
  forget(code: string) {
    const state = this.rooms.get(code);
    if (!state) return;
    for (const t of state.timers) clearTimeout(t);
    this.rooms.delete(code);
  }

  private state(code: string): RoomBots {
    let state = this.rooms.get(code);
    if (!state) {
      state = { picker: createAnswerPicker(), scheduled: new Set(), timers: new Set() };
      this.rooms.set(code, state);
    }
    return state;
  }

  private schedule(state: RoomBots, key: string, delay: number, fn: () => void) {
    if (state.scheduled.has(key)) return;
    state.scheduled.add(key);
    const timer = setTimeout(() => {
      state.timers.delete(timer);
      fn();
    }, delay);
    state.timers.add(timer);
  }
}
