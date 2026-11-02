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
    if (view.phase === 'voting' && /"isTruth"|votedTruth|"truthIndex"/.test(raw)) leaks.push(`${name}: segredo na votação`);
    if (view.phase === 'voting' && view.voting!.authorId !== view.me.id && view.voting!.myTruthIndex !== null) {
      leaks.push(`${name}: posição da verdade na votação`);
    }
    if (view.phase === 'writing' && raw.split('"text"').length > 2) leaks.push(`${name}: resposta alheia na escrita`);
    if (view.phase === 'writing' && raw.split('"truth"').length > 2) leaks.push(`${name}: frases alheias na escrita`);
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

// Segunda partida na mesma sala: modo 2 mentiras, 1 verdade.
const players = [ana, bruno2, carla];
assert((await emit(ana, 'host:playAgain', {})).ok, 'jogar de novo');
await until(() => players.every((c) => c.view?.phase === 'lobby'), 'volta ao lobby');
assert((await emit(ana, 'host:setSettings', { mode: 'twoLiesOneTruth' })).ok, 'escolher o modo');
assert((await emit(ana, 'host:setQuestions', { questions: ['Qual seu talento?', 'Qual viagem?', 'Qual mico?'] })).ok, 'perguntas');
assert((await emit(ana, 'host:start', {})).ok, 'iniciar o modo');

for (let round = 0; round < 3; round++) {
  await until(() => players.every((c) => c.view?.phase === 'writing' && c.view.roundIndex === round), 'escrita do modo');
  const asked = new Set(players.map((c) => c.view!.writing!.question));
  assert(asked.size === 3, `perguntas diferentes na rodada ${round}`);
  for (const c of players) {
    const res = await emit(c, 'answer:submitTriple', { truth: `V ${c.name} ${round}`, lies: [`M1 ${c.name} ${round}`, `M2 ${c.name} ${round}`] });
    assert(res.ok, `${c.name} enviar 3 frases`);
  }

  // Todos acham a verdade: o autor conta qual é (só ele recebe a posição).
  for (let card = 0; card < 3; card++) {
    await until(() => players.every((c) => c.view?.phase === 'voting' && c.view.voting!.cardNumber === card + 1), `card ${card + 1} do modo`);
    const author = players.find((c) => c.view!.voting!.authorId === c.view!.me.id)!;
    const index = author.view!.voting!.myTruthIndex!;
    assert(!(await emit(author, 'vote:pick', { index })).ok, 'autor não vota no modo');
    for (const c of players) if (c !== author) assert((await emit(c, 'vote:pick', { index })).ok, `${c.name} escolher`);
    await until(() => players.every((c) => c.view?.phase === 'reveal'), 'revelação do modo');
    assert(ana.view!.reveal!.result.triple!.picks[index] === 2, 'votos por frase');
    assert((await emit(ana, 'host:advance', {})).ok, 'próximo card do modo');
  }
  await until(() => players.every((c) => c.view?.phase === 'roundScore'), 'placar do modo');
  assert(ana.view!.roundScore!.question === null, 'placar sem pergunta');
  assert((await emit(ana, 'host:advance', {})).ok, 'próxima rodada do modo');
}

await until(() => players.every((c) => c.view?.phase === 'final'), 'final do modo');
// 3 rodadas com 2 votos certos por jogador em cada uma.
assert(ana.view!.players.every((p) => p.score === 6), 'placar do modo');
const titleKeys = ana.view!.final!.titles.map((t) => t.key);
assert(titleKeys.length === 1 && titleKeys[0] === 'detector', `títulos do modo (${titleKeys})`);

assert(leaks.length === 0, `vazamentos: ${leaks.join('; ')}`);
console.log('OK: duas partidas (clássico e 2 mentiras, 1 verdade), pontuação, reconexão e nenhum vazamento.');

for (const c of [...all, bruno2]) c.disconnect();
stopSweep();
io.close();
process.exit(0);
