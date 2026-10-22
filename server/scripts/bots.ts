/**
 * Jogadores-bot para testar o jogo com gente de verdade.
 *
 *   npm run bots -- <CODIGO> [quantidade] [url]
 *
 * Cada bot entra na sala, responde as perguntas (às vezes mentindo) e vota
 * com um atraso aleatório, como se estivesse pensando.
 */
import { io, type Socket } from 'socket.io-client';
import { BOT_NAMES, createAnswerPicker } from '../src/bots/answers';
import { AVATAR_EMOJIS, type ClientToServerEvents, type RoomView, type ServerToClientEvents } from '@mentira/shared';

const [codeArg, countArg, urlArg] = process.argv.slice(2);
if (!codeArg) {
  console.error('Uso: npm run bots -- <CODIGO> [quantidade=3] [url=http://localhost:3000]');
  process.exit(1);
}
const code = codeArg.toUpperCase();
const count = Math.min(8, Math.max(1, Number(countArg ?? 3)));
const url = urlArg ?? 'http://localhost:3000';

const NAMES = BOT_NAMES;
const answers = createAnswerPicker();

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const rand = (min: number, max: number) => min + Math.random() * (max - min);
const pick = <T>(items: T[]) => items[Math.floor(Math.random() * items.length)];

const bots: Socket<ServerToClientEvents, ClientToServerEvents>[] = [];

// Ao encerrar (Ctrl+C), os bots saem da sala em vez de ficarem como desconectados.
for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    let pending = bots.length;
    if (!pending) process.exit(0);
    for (const b of bots) b.emit('room:leave', {}, () => --pending === 0 && process.exit(0));
    setTimeout(() => process.exit(0), 1500);
  });
}

function createBot(name: string) {
  const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io(url, { transports: ['websocket'] });
  bots.push(socket);
  const done = new Set<string>();
  let view: RoomView | null = null;
  const log = (msg: string) => console.log(`[${name}] ${msg}`);
  const nick = (id: string) => view?.players.find((p) => p.id === id)?.nickname ?? '?';

  socket.on('connect', () => {
    socket.emit('room:join', { code, nickname: name, avatar: pick([...AVATAR_EMOJIS]) }, (res) => {
      if (!res.ok) {
        log(`não consegui entrar: ${res.error}`);
        socket.disconnect();
      } else log(`entrou na sala ${code}`);
    });
  });

  socket.on('room:kicked', () => {
    log('fui removido pelo host 😢');
    socket.disconnect();
  });

  socket.on('room:state', async (v) => {
    view = v;
    const me = v.me.id;

    if (v.phase === 'writing' && v.writing && v.me.isActive) {
      const key = `w${v.roundIndex}`;
      if (done.has(key) || v.writing.myAnswer) return;
      done.add(key);
      await sleep(rand(4000, 12000));
      const [text, isTruth] = answers.pick(v.roundIndex, v.writing.question);
      socket.emit('answer:submit', { text, isTruth }, (res) => {
        if (res.ok) log(`respondeu (${isTruth ? 'verdade' : 'MENTIRA'}): "${text}"`);
      });
    }

    if (v.phase === 'voting' && v.voting) {
      const key = `v${v.roundIndex}-${v.voting.cardNumber}`;
      if (done.has(key) || !v.voting.eligibleIds.includes(me) || v.voting.myVote !== null) return;
      done.add(key);
      await sleep(rand(2500, 9000));
      const votedTruth = Math.random() < 0.55;
      socket.emit('vote:cast', { votedTruth }, (res) => {
        if (res.ok) log(`votou ${votedTruth ? 'VERDADE' : 'MENTIRA'} no card de ${nick(v.voting!.authorId)}`);
      });
    }

    if (v.phase === 'reveal' && v.reveal) {
      const key = `r${v.roundIndex}-${v.reveal.cardNumber}`;
      if (done.has(key) || name !== NAMES[0]) return; // só um bot narra
      done.add(key);
      const r = v.reveal.result;
      const fooled = r.votes.filter((x) => !x.correct).map((x) => nick(x.voterId));
      console.log(
        `\n>>> REVELAÇÃO: ${nick(r.authorId)} — ${r.isTruth ? 'VERDADE' : 'MENTIRA'}: "${r.text}"` +
          (fooled.length ? ` | caíram: ${fooled.join(', ')}` : ' | ninguém caiu') + '\n',
      );
    }

    if (v.phase === 'final' && v.final && name === NAMES[0] && !done.has(`f${v.final.ranking.length}${v.final.ranking[0]?.score}`)) {
      done.add(`f${v.final.ranking.length}${v.final.ranking[0]?.score}`);
      console.log('\n>>> FIM DE JOGO: ' + v.final.ranking.map((x, i) => `${i + 1}º ${nick(x.playerId)} (${x.score})`).join(' · '));
      for (const t of v.final.titles) console.log(`    ${t.title}: ${t.playerIds.map(nick).join(' e ')}`);
    }

    if (v.phase === 'lobby') {
      done.clear(); // "Jogar de novo"
      answers.reset();
    }
  });
}

console.log(`Mandando ${count} bots para a sala ${code} em ${url}…`);
NAMES.slice(0, count).forEach((name, i) => setTimeout(() => createBot(name), i * 400));
