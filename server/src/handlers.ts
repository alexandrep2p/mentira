import { SWEEP_INTERVAL_MS, type ClientToServerEvents, type ServerToClientEvents, type Session } from '@mentira/shared';
import type { Server, Socket } from 'socket.io';
import type { Room } from './game/room';
import { buildView } from './game/view';
import { RoomManager } from './rooms';
import { PhaseTimers } from './timers';
import type { Result } from './game/types';

interface SocketData {
  code?: string;
  playerId?: string;
}

type GameServer = Server<ClientToServerEvents, ServerToClientEvents, {}, SocketData>;
type GameSocket = Socket<ClientToServerEvents, ServerToClientEvents, {}, SocketData>;

/** Liga os eventos Socket.IO às regras da Room e devolve uma função de limpeza. */
export function registerHandlers(io: GameServer) {
  const rooms = new RoomManager();
  /** playerId → socket.id atual */
  const sockets = new Map<string, string>();
  const timers = new PhaseTimers((room) => {
    if (room.tick(Date.now())) broadcast(room);
  });

  function broadcast(room: Room) {
    const now = Date.now();
    for (const player of room.players.values()) {
      const socketId = sockets.get(player.id);
      if (socketId) io.to(socketId).emit('room:state', buildView(room, player.id, now));
    }
    timers.sync(room);
  }

  function bind(socket: GameSocket, room: Room, playerId: string) {
    const previous = sockets.get(playerId);
    if (previous && previous !== socket.id) {
      // Outra aba assumiu esta sessão: derruba a antiga.
      const old = io.sockets.sockets.get(previous);
      if (old) {
        old.data = {};
        old.disconnect(true);
      }
    }
    socket.data = { code: room.code, playerId };
    sockets.set(playerId, socket.id);
  }

  function session(room: Room, playerId: string): Session {
    return { code: room.code, playerId, token: room.players.get(playerId)!.token };
  }

  /** Remove o socket da sala em que estava antes (ao criar/entrar em outra). */
  function detach(socket: GameSocket) {
    const { code, playerId } = socket.data;
    if (!code || !playerId) return;
    const room = rooms.get(code);
    socket.data = {};
    if (sockets.get(playerId) === socket.id) sockets.delete(playerId);
    if (room?.players.has(playerId)) {
      room.leave(playerId);
      broadcast(room);
    }
  }

  io.on('connection', (socket) => {
    /** Executa uma ação na sala do socket e faz broadcast se der certo. */
    const act = (ack: unknown, fn: (room: Room, playerId: string) => Result) => {
      const reply = typeof ack === 'function' ? (ack as (r: Result) => void) : () => {};
      const room = rooms.get(socket.data.code);
      const playerId = socket.data.playerId;
      if (!room || !playerId || !room.players.has(playerId)) return reply({ ok: false, error: 'NOT_IN_ROOM' });
      const result = fn(room, playerId);
      if (result.ok) broadcast(room);
      reply(result);
    };

    socket.on('room:create', (payload, ack) => {
      detach(socket);
      const room = rooms.create();
      const res = room.join(payload?.nickname, payload?.avatar);
      if (!res.ok) {
        rooms.delete(room.code);
        return ack(res);
      }
      bind(socket, room, res.player.id);
      ack({ ok: true, ...session(room, res.player.id) });
      broadcast(room);
    });

    socket.on('room:join', (payload, ack) => {
      const room = rooms.get(payload?.code);
      if (!room) return ack({ ok: false, error: 'ROOM_NOT_FOUND' });
      detach(socket);
      const res = room.join(payload?.nickname, payload?.avatar);
      if (!res.ok) return ack(res);
      bind(socket, room, res.player.id);
      ack({ ok: true, ...session(room, res.player.id) });
      broadcast(room);
    });

    socket.on('room:resume', (payload, ack) => {
      const room = rooms.get(payload?.code);
      if (!room) return ack({ ok: false, error: 'ROOM_NOT_FOUND' });
      const player = typeof payload?.token === 'string' ? room.findByToken(payload.token) : undefined;
      if (!player) return ack({ ok: false, error: 'INVALID_TOKEN' });
      if (socket.data.playerId !== player.id) detach(socket);
      bind(socket, room, player.id);
      room.connect(player.id);
      ack({ ok: true, ...session(room, player.id) });
      broadcast(room);
    });

    socket.on('room:leave', (_p, ack) => {
      if (!socket.data.playerId) return ack({ ok: false, error: 'NOT_IN_ROOM' });
      detach(socket);
      ack({ ok: true });
    });

    socket.on('host:kick', (payload, ack) =>
      act(ack, (room, id) => {
        const target = payload?.playerId;
        const res = room.kick(id, target);
        if (res.ok) {
          const targetSocket = sockets.get(target);
          sockets.delete(target);
          const s = targetSocket ? io.sockets.sockets.get(targetSocket) : undefined;
          if (s) {
            s.data = {};
            s.emit('room:kicked');
          }
        }
        return res;
      }),
    );

    socket.on('host:setQuestions', (p, ack) => act(ack, (room, id) => room.setQuestions(id, p?.questions)));
    socket.on('host:setSettings', (p, ack) => act(ack, (room, id) => room.setSettings(id, p ?? {})));
    socket.on('host:start', (_p, ack) => act(ack, (room, id) => room.start(id)));
    socket.on('host:advance', (_p, ack) => act(ack, (room, id) => room.advance(id)));
    socket.on('host:skipCard', (_p, ack) => act(ack, (room, id) => room.skipCard(id)));
    socket.on('host:end', (_p, ack) => act(ack, (room, id) => room.end(id)));
    socket.on('host:playAgain', (_p, ack) => act(ack, (room, id) => room.playAgain(id)));
    socket.on('answer:submit', (p, ack) => act(ack, (room, id) => room.submitAnswer(id, p?.text, p?.isTruth)));
    socket.on('vote:cast', (p, ack) => act(ack, (room, id) => room.castVote(id, p?.votedTruth)));

    socket.on('disconnect', () => {
      const { code, playerId } = socket.data;
      if (!code || !playerId || sockets.get(playerId) !== socket.id) return;
      sockets.delete(playerId);
      const room = rooms.get(code);
      if (!room) return;
      room.disconnect(playerId);
      broadcast(room);
    });
  });

  const sweep = setInterval(() => {
    const now = Date.now();
    for (const room of rooms.all()) if (room.sweep(now)) broadcast(room);
    for (const room of rooms.expired(now)) {
      timers.clear(room.code);
      rooms.delete(room.code);
    }
  }, SWEEP_INTERVAL_MS);

  return () => clearInterval(sweep);
}
