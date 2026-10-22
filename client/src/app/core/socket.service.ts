import { Injectable, signal } from '@angular/core';
import type { Ack, ClientEvent, ClientToServerEvents, ErrorCode, RoomView, ServerToClientEvents } from '@mentira/shared';
import { io, type Socket } from 'socket.io-client';

type Payload<E extends ClientEvent> = Parameters<ClientToServerEvents[E]>[0];
type AckData<E extends ClientEvent> =
  Parameters<ClientToServerEvents[E]>[1] extends (res: Ack<infer T>) => void ? T : {};

export type EmitResult<T> = ({ ok: true } & T) | { ok: false; error: ErrorCode | 'TIMEOUT' };

@Injectable({ providedIn: 'root' })
export class SocketService {
  private readonly socket: Socket<ServerToClientEvents, ClientToServerEvents> = io({
    transports: ['websocket', 'polling'],
  });

  readonly connected = signal(false);

  constructor() {
    this.socket.on('connect', () => this.connected.set(true));
    this.socket.on('disconnect', () => this.connected.set(false));
  }

  onConnect(fn: () => void) {
    this.socket.on('connect', fn);
    if (this.socket.connected) fn();
  }

  onState(fn: (view: RoomView) => void) {
    this.socket.on('room:state', fn);
  }

  onKicked(fn: () => void) {
    this.socket.on('room:kicked', fn);
  }

  emit<E extends ClientEvent>(event: E, payload: Payload<E>): Promise<EmitResult<AckData<E>>> {
    return new Promise((resolve) => {
      (this.socket.timeout(8000) as any).emit(event, payload, (err: unknown, res: Ack<AckData<E>>) => {
        resolve(err ? { ok: false, error: 'TIMEOUT' } : (res as EmitResult<AckData<E>>));
      });
    });
  }
}
