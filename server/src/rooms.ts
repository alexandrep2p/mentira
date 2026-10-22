import { EMPTY_ROOM_TTL_MS, ROOM_CODE_ALPHABET, ROOM_CODE_LENGTH } from '@mentira/shared';
import { Room } from './game/room';

export class RoomManager {
  private readonly rooms = new Map<string, Room>();

  create(): Room {
    let code: string;
    do {
      code = Array.from(
        { length: ROOM_CODE_LENGTH },
        () => ROOM_CODE_ALPHABET[Math.floor(Math.random() * ROOM_CODE_ALPHABET.length)],
      ).join('');
    } while (this.rooms.has(code));
    const room = new Room(code);
    this.rooms.set(code, room);
    return room;
  }

  get(code: unknown): Room | undefined {
    return typeof code === 'string' ? this.rooms.get(code.trim().toUpperCase()) : undefined;
  }

  all() {
    return [...this.rooms.values()];
  }

  delete(code: string) {
    this.rooms.delete(code);
  }

  /** Salas sem ninguém conectado por tempo demais. */
  expired(now: number) {
    return this.all().filter((r) => r.emptySince !== null && now - r.emptySince >= EMPTY_ROOM_TTL_MS);
  }
}
