import type { Room } from './game/room';

/** Um setTimeout por sala, sempre alinhado ao deadline da fase atual. */
export class PhaseTimers {
  private readonly timers = new Map<string, { deadline: number; handle: NodeJS.Timeout }>();

  constructor(private readonly onExpire: (room: Room) => void) {}

  sync(room: Room) {
    const current = this.timers.get(room.code);
    if (current?.deadline === room.deadline) return;
    if (current) clearTimeout(current.handle);
    this.timers.delete(room.code);
    if (room.deadline === null) return;

    const deadline = room.deadline;
    const handle = setTimeout(() => {
      this.timers.delete(room.code);
      this.onExpire(room);
    }, Math.max(0, deadline - Date.now()));
    this.timers.set(room.code, { deadline, handle });
  }

  clear(code: string) {
    const current = this.timers.get(code);
    if (current) clearTimeout(current.handle);
    this.timers.delete(code);
  }
}
