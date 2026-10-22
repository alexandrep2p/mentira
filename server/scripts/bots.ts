/**
 * Jogadores-bot para testar o jogo com gente de verdade.
 *
 *   npm run bots -- <CODIGO> [quantidade] [url]
 *
 * Cada bot entra na sala, responde as perguntas (às vezes mentindo) e vota
 * com um atraso aleatório, como se estivesse pensando.
 */
import { io, type Socket } from 'socket.io-client';
import { AVATAR_EMOJIS, QUESTION_BANK, type ClientToServerEvents, type RoomView, type ServerToClientEvents } from '@mentira/shared';

const [codeArg, countArg, urlArg] = process.argv.slice(2);
if (!codeArg) {
  console.error('Uso: npm run bots -- <CODIGO> [quantidade=3] [url=http://localhost:3000]');
  process.exit(1);
}
const code = codeArg.toUpperCase();
const count = Math.min(8, Math.max(1, Number(countArg ?? 3)));
const url = urlArg ?? 'http://localhost:3000';

const NAMES = ['Bia', 'Caio', 'Duda', 'Edu', 'Fabi', 'Gui', 'Helô', 'Igor'];

/** Respostas por pergunta do banco: [texto, é verdade?] */
const ANSWERS: Record<string, [string, boolean][]> = {
  [QUESTION_BANK[0]]: [
    ['Fui pra Ushuaia de ônibus saindo de Curitiba, foram 4 dias de estrada', true],
    ['Passei uma noite num hotel feito inteiro de gelo na Suécia', false],
    ['Fui num casamento em Goiânia e voltei padrinho sem conhecer os noivos', false],
    ['Acampei sozinho na Chapada e um lobo-guará comeu meu pão', true],
  ],
  [QUESTION_BANK[1]]: [
    ['Consigo dobrar a língua em formato de trevo', true],
    ['Sei assobiar o hino nacional de trás pra frente', false],
    ['Faço malabares com 5 laranjas', false],
    ['Decoro qualquer placa de carro na primeira olhada', true],
  ],
  [QUESTION_BANK[2]]: [
    ['Formiga tanajura frita, em Minas, e achei bom', true],
    ['Sorvete de bacalhau em Portugal', false],
    ['Pizza de banana com canela e catupiry', true],
    ['Gafanhoto com chocolate num restaurante de São Paulo', false],
  ],
  [QUESTION_BANK[3]]: [
    ['Fui Papai Noel de shopping com 19 anos', true],
    ['Trabalhei testando colchão pra uma fábrica', false],
    ['Fui figurante de novela da Globo, apareci 2 segundos', true],
    ['Passeava com cachorro de famoso no Leblon', false],
  ],
  [QUESTION_BANK[4]]: [
    ['Dividi elevador com o Faustão', true],
    ['O Gil me pediu um isqueiro no aeroporto', false],
    ['Tirei foto com a Anitta numa farmácia', false],
    ['Joguei futevôlei com o Romário na praia', false],
  ],
  [QUESTION_BANK[5]]: [
    ['Escorreguei no palco da formatura bem na hora do diploma', true],
    ['Chamei a professora de "mãe" no meio da prova', true],
    ['Entrei no carro errado achando que era meu Uber e fui até a esquina', false],
    ['Caí na piscina de roupa num evento da empresa', false],
  ],
  [QUESTION_BANK[6]]: [
    ['Fiz curso de mágica por correspondência', true],
    ['Criei caracóis por dois anos', false],
    ['Colecionava sachês de açúcar de padaria', true],
    ['Pratiquei esgrima medieval com armadura', false],
  ],
  [QUESTION_BANK[7]]: [
    ['Uma foto minha bebê emoldurada… dada por um ex', true],
    ['Um peixe vivo num saco plástico', false],
    ['Uma cadeira de massagem quebrada', false],
    ['Um pote de areia da praia "pra lembrar de mim"', true],
  ],
  [QUESTION_BANK[8]]: [
    ['Ganhei um concurso de comer pastel na feira', true],
    ['Tenho o recorde da escola em pular corda', false],
    ['Fiquei em 3º num campeonato de truco', true],
    ['Já fui campeão estadual de pebolim', false],
  ],
  [QUESTION_BANK[9]]: [
    ['Fiquei preso num teleférico por 40 minutos', true],
    ['Fui confundido com um palestrante e dei a palestra', false],
    ['Fui parar num casamento cigano por engano', false],
    ['Perdi o voo porque dormi no portão de embarque', true],
  ],
};

const GENERIC: [string, boolean][] = [
  ['Isso aconteceu comigo em 2019 e até hoje ninguém acredita', true],
  ['Tenho até foto disso, mas perdi o celular', false],
  ['Foi numa viagem com a família, juro', true],
  ['Meu primo estava junto e pode confirmar', false],
  ['Aconteceu numa terça-feira chuvosa em Belo Horizonte', true],
  ['Saiu até no jornal do bairro', false],
  ['Minha mãe conta essa história em todo Natal', true],
  ['Foi no intercâmbio, no Canadá, com neve até o joelho', false],
  ['Eu tinha 7 anos e lembro de tudo', true],
  ['Rolou no aniversário de 15 anos da minha prima', false],
];

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const rand = (min: number, max: number) => min + Math.random() * (max - min);
const pick = <T>(items: T[]) => items[Math.floor(Math.random() * items.length)];

/** Respostas já usadas por algum bot em cada rodada, para não repetirem. */
const used = new Map<number, Set<string>>();
function answerFor(round: number, question: string): [string, boolean] {
  const taken = used.get(round) ?? new Set<string>();
  used.set(round, taken);
  const pool = [...(ANSWERS[question] ?? []), ...GENERIC].filter(([text]) => !taken.has(text));
  const choice = pool.length ? pick(pool.slice(0, ANSWERS[question] ? 4 : pool.length)) : pick(GENERIC);
  taken.add(choice[0]);
  return choice;
}

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
      const [text, isTruth] = answerFor(v.roundIndex, v.writing.question);
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
      used.clear();
    }
  });
}

console.log(`Mandando ${count} bots para a sala ${code} em ${url}…`);
NAMES.slice(0, count).forEach((name, i) => setTimeout(() => createBot(name), i * 400));
