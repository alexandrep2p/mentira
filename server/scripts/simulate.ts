/**
 * Partida completa com 3 clientes Socket.IO reais contra um servidor em
 * memória. Falha (exit 1) se algo sair do esperado ou se algum segredo vazar.
 */
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { Server } from 'socket.io';
import { io as connect, type Socket } from 'socket.io-client';
import type { Ack, ClientToServerEvents, RoomView, ServerToClientEvents, Session } from '@mentira/shared';
import { registerHandlers } from '../src/handlers';

type Client = Socket<ServerToClientEvents, ClientToServerEvents> & { name: string; view?: RoomView; session?: Session };

const httpServer = createServer();
const io = new Server(httpServer);
const stopSweep = registerHandlers(io);
await new Promise<void>((r) => httpServer.listen(0, r));
const url = `http://localhost:${(httpServer.address() as AddressInfo).port}`;

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) {
    console.error(`FALHOU: ${msg}`);
    process.exit(1);
  }
}

const leaks: string[] = [];
function makeClient(name: string): Client {
  const socket = connect(url, { transports: ['websocket'], forceNew: true }) as Client;
  socket.name = name;
  socket.on('room:state', (view) => {
    socket.view = view;
    const raw = JSON.stringify(view);
    if (view.phase === 'voting' && /"isTruth"|votedTruth/.test(raw)) leaks.push(`${name}: segredo na votação`);
    if (view.phase === 'writing' && raw.split('"text"').length > 2) leaks.push(`${name}: resposta alheia na escrita`);
    if (/token/.test(raw)) leaks.push(`${name}: token no estado`);
  });
  return socket;
}

function emit<T>(c: Client, event: keyof ClientToServerEvents, payload: unknown): Promise<Ack<T>> {
  return new Promise((resolve) => (c.emit as any)(event, payload, resolve));
}

async function until(pred: () => boolean, what: string, ms = 2000) {
  const start = Date.now();
  while (!pred()) {
    if (Date.now() - start > ms) assert(false, `timeout esperando ${what}`);
    await new Promise((r) => setTimeout(r, 10));
  }
}

const [ana, bruno, carla] = ['Ana', 'Bruno', 'Carla'].map(makeClient);
const all = [ana, bruno, carla];

const created = await emit<Session>(ana, 'room:create', { nickname: 'Ana' });
assert(created.ok, 'criar sala');
const code = created.code;
console.log(`Sala ${code} criada`);

for (const c of [bruno, carla]) {
  const res = await emit<Session>(c, 'room:join', { code: code.toLowerCase(), nickname: c.name });
  assert(res.ok, `${c.name} entrar`);
  c.session = res;
}
assert((await emit(ana, 'host:setQuestions', { questions: ['Qual seu talento?', 'Qual viagem?'] })).ok, 'perguntas');
assert(!(await emit(bruno, 'host:start', {})).ok, 'não-host não inicia');
assert((await emit(ana, 'host:start', {})).ok, 'iniciar');
await until(() => all.every((c) => c.view?.phase === 'writing'), 'escrita');

for (let round = 0; round < 2; round++) {
  // Ana sempre mente, os outros dizem a verdade.
  for (const c of all) {
    const res = await emit(c, 'answer:submit', { text: `${c.name} rodada ${round}`, isTruth: c !== ana });
    assert(res.ok, `${c.name} responder`);
  }
  await until(() => all.every((c) => c.view?.phase === 'voting'), 'votação');

  for (let card = 0; card < 3; card++) {
    await until(() => all.every((c) => c.view?.phase === 'voting' && c.view.voting!.cardNumber === card + 1), `card ${card + 1}`);
    const authorId = ana.view!.voting!.authorId;
    for (const c of all) {
      if (c.view!.me.id === authorId) {
        assert(!(await emit(c, 'vote:cast', { votedTruth: true })).ok, 'autor não vota');
        continue;
      }
      assert((await emit(c, 'vote:cast', { votedTruth: true })).ok, `${c.name} votar`);
    }
    await until(() => all.every((c) => c.view?.phase === 'reveal'), 'revelação');
    assert((await emit(ana, 'host:advance', {})).ok, 'próximo card');
  }
  await until(() => all.every((c) => c.view?.phase === 'roundScore'), 'placar da rodada');
  assert((await emit(ana, 'host:advance', {})).ok, 'próxima rodada');
}

await until(() => all.every((c) => c.view?.phase === 'final'), 'final');
const final = ana.view!.final!;
const scoreOf = (c: Client) => ana.view!.players.find((p) => p.nickname === c.name)!.score;
// Todos votam "verdade": por rodada Ana engana 2 e acerta 2; Bruno só acerta o card da Carla.
assert(scoreOf(ana) === 8, `placar da Ana (${scoreOf(ana)})`);
assert(scoreOf(bruno) === 2, `placar do Bruno (${scoreOf(bruno)})`);
assert(final.titles.some((t) => t.key === 'liar'), 'título Mestre da Mentira');
console.log('Ranking:', final.ranking.map((r) => `${ana.view!.players.find((p) => p.id === r.playerId)!.nickname} ${r.score}`).join(', '));

// Reconexão: Bruno cai e volta com o token.
bruno.disconnect();
await until(() => ana.view!.players.find((p) => p.nickname === 'Bruno')!.connected === false, 'Bruno offline');
const bruno2 = makeClient('Bruno');
const resumed = await emit<Session>(bruno2, 'room:resume', { code, token: bruno.session!.token });
assert(resumed.ok && resumed.playerId === bruno.session!.playerId, 'retomar sessão');
await until(() => bruno2.view?.phase === 'final' && bruno2.view.players.find((p) => p.nickname === 'Bruno')!.score === 2, 'estado após reconexão');

assert(leaks.length === 0, `vazamentos: ${leaks.join('; ')}`);
console.log('OK: partida completa, pontuação, reconexão e nenhum vazamento.');

for (const c of [...all, bruno2]) c.disconnect();
stopSweep();
io.close();
process.exit(0);
