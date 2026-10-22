# Mentira! — Especificação Técnica

> Status: implementado · 2026-10-21 · Baseado em [01-design.md](01-design.md)

## 1. Stack

| Camada | Tecnologia |
|---|---|
| Linguagem | TypeScript em todo o projeto |
| Servidor | Node 22+, Express 5, Socket.IO 4.8 |
| Cliente | Angular 22 (standalone components, signals, zoneless), Angular Material 22 (M3) |
| Tempo real | Socket.IO (WebSocket com fallback para long-polling) |
| Estado | Em memória no servidor, sem banco de dados |
| Testes | Vitest (lógica do jogo no servidor), testes de componente do Angular onde fizer sentido |
| Extras | `qrcode` (QR code no lobby), `canvas-confetti` (pódio) |

## 2. Estrutura do repositório

Monorepo com npm workspaces:

```
mentira/
├─ package.json              workspaces + scripts raiz (dev, build, start, test)
├─ docs/                     design, specs, tasks
├─ shared/                   código usado por servidor e cliente
│  └─ src/
│     ├─ types.ts            RoomView, eventos, payloads
│     ├─ constants.ts        limites, defaults, nomes de eventos
│     └─ questions.ts        banco de sugestões
├─ server/
│  └─ src/
│     ├─ index.ts            bootstrap Express + Socket.IO, serve o cliente buildado
│     ├─ game/
│     │  ├─ room.ts          classe Room: máquina de estados e regras (pura, sem socket)
│     │  ├─ scoring.ts       cálculo de pontos e títulos
│     │  └─ view.ts          monta o RoomView de cada jogador (filtra segredos)
│     ├─ rooms.ts            RoomManager: criar/buscar/descartar salas, gerar códigos
│     ├─ handlers.ts         eventos Socket.IO → métodos da Room
│     └─ timers.ts           agendamento de timeouts de fase
└─ client/                   app Angular
   └─ src/app/
      ├─ core/               SocketService, GameStore, SessionStorage
      ├─ pages/home/         criar / entrar
      ├─ pages/room/         container que troca a tela conforme a fase
      ├─ phases/             lobby, writing, voting, reveal, round-score, final
      └─ shared/             avatar, timer, top-bar, player-list
```

`@mentira/shared` é importado por caminho (`paths` do tsconfig) a partir dos fontes TS. No servidor, o build final é feito com esbuild, que já embute o shared no bundle.

## 3. Modelo de domínio (servidor)

```ts
type Phase = 'lobby' | 'writing' | 'voting' | 'reveal' | 'roundScore' | 'final';

interface Settings {
  writingSeconds: number | null;   // null = sem limite. Padrão: 90
  votingSeconds: number | null;    // padrão: 20
  autoAdvanceReveal: boolean;      // padrão: false (quando ligado, avança após 8 s)
}

interface Player {
  id: string;            // uuid público
  token: string;         // uuid secreto, usado para reconectar
  nickname: string;
  color: string;         // de uma paleta fixa de 12 cores
  socketId: string | null;
  connected: boolean;
  joinedAt: number;
  activeFromRound: number; // quem entra no meio do jogo começa a jogar na rodada seguinte
  score: number;
  stats: { correctVotes: number; fooledWithLies: number;
           truthsDisbelieved: number; truthsWritten: number };
}

interface Answer { text: string; isTruth: boolean; }

interface Round {
  index: number;
  question: string;
  answers: Map<string /*playerId*/, Answer>;
  cardOrder: string[];             // playerIds embaralhados, definidos ao sair da escrita
  cardIndex: number;
  votes: Map<string /*voterId*/, boolean /*votou verdade*/>;
  cardResults: CardResult[];       // um por card já revelado
  roundDelta: Map<string, number>; // pontos ganhos na rodada
}

interface CardResult {
  authorId: string; text: string; isTruth: boolean;
  votes: { voterId: string; votedTruth: boolean; correct: boolean }[];
  points: { playerId: string; delta: number }[];
}

interface Room {
  code: string; hostId: string;
  players: Map<string, Player>;
  questions: string[]; settings: Settings;
  phase: Phase; round: Round | null; roundIndex: number;
  deadline: number | null;          // epoch ms do fim da fase atual
  hostDisconnectedAt: number | null;
  emptySince: number | null;
}
```

A classe `Room` concentra **todas as regras** e não conhece Socket.IO. Cada método valida a ação, muta o estado e devolve `{ ok: true }` ou `{ ok: false, error: ErrorCode }`. Isso deixa a lógica do jogo testável de forma isolada.

## 4. Máquina de estados

| De | Para | Gatilho |
|---|---|---|
| lobby | writing | host `start` (≥ 3 jogadores conectados, ≥ 1 pergunta) |
| writing | voting | todos os ativos conectados enviaram, **ou** o timer acabou, **ou** o host avançou. Se ninguém respondeu → roundScore |
| voting | reveal | todos os votantes elegíveis conectados votaram, **ou** o timer acabou, **ou** o host avançou |
| reveal | voting | host `advance` (ou avanço automático) e ainda há cards |
| reveal | roundScore | host `advance` e era o último card |
| roundScore | writing | host `advance` e ainda há perguntas |
| roundScore | final | host `advance` na última rodada |
| qualquer (exceto lobby) | final | host `end` |
| final | lobby | host `playAgain` (zera placar e rodadas, mantém jogadores e perguntas) |

Definições:

- **Jogador ativo na rodada N**: `activeFromRound <= N`.
- **Votantes elegíveis de um card**: jogadores ativos, exceto o autor.
- A condição "todos fizeram a ação" considera **apenas os conectados**. Ela é recalculada sempre que alguém desconecta, então um jogador que caiu nunca trava a fase.
- O host pode **pular** um card (`skipCard`): o card é descartado sem pontos e o jogo vai para o próximo card, ou para o roundScore se era o último.

## 5. Pontuação (`scoring.ts`)

Na revelação de cada card:

```
para cada voto v:
  correct = (v.votedTruth === answer.isTruth)
  se correct: voter.score += 1; voter.stats.correctVotes++
  senão:      author.score += 1
              se answer.isTruth: author.stats.truthsDisbelieved++
              senão:             author.stats.fooledWithLies++
```

`truthsWritten` é incrementado quando a escrita fecha, para cada resposta verdadeira.

**Títulos no final**: para cada stat, vence o maior valor (> 0). Em caso de empate, todos os empatados recebem o título.

| Stat | Título |
|---|---|
| `fooledWithLies` | 🤥 Mestre da Mentira |
| `truthsDisbelieved` | 😇 Ninguém acredita em mim |
| `correctVotes` | 🕵️ Detector de Mentiras |
| `truthsWritten` | 📖 Livro Aberto |

## 6. Protocolo Socket.IO

### 6.1 Estratégia: sincronização do estado completo

A cada mudança, o servidor monta um `RoomView` **personalizado por jogador** e emite `room:state` para cada socket da sala. As salas são pequenas (≤ 12 jogadores), então mandar o estado inteiro é barato e evita bugs de dessincronização. O cliente só renderiza o que recebe.

### 6.2 Cliente → Servidor

Todos os eventos usam *acknowledgement* do Socket.IO: `socket.emit(evento, payload, (res: Ack) => …)`.

```ts
type Ack<T = {}> = ({ ok: true } & T) | { ok: false; error: ErrorCode };
```

| Evento | Payload | Resposta | Quem pode |
|---|---|---|---|
| `room:create` | `{ nickname, avatar? }` | `Ack<Session>` | qualquer um |
| `room:join` | `{ code, nickname, avatar? }` | `Ack<Session>` | qualquer um |
| `room:resume` | `{ code, token }` | `Ack<Session>` | dono do token |
| `room:leave` | — | `Ack` | jogador |
| `host:setQuestions` | `{ questions: string[] }` | `Ack` | host, no lobby |
| `host:setSettings` | `Partial<Settings>` | `Ack` | host, no lobby |
| `host:kick` | `{ playerId }` | `Ack` | host |
| `host:start` | — | `Ack` | host, no lobby |
| `host:advance` | — | `Ack` | host, em writing/voting/reveal/roundScore |
| `host:skipCard` | — | `Ack` | host, em voting/reveal |
| `host:end` | — | `Ack` | host |
| `host:playAgain` | — | `Ack` | host, no final |
| `answer:submit` | `{ text, isTruth }` | `Ack` | jogador ativo, em writing. Pode reenviar para editar até a fase fechar |
| `vote:cast` | `{ votedTruth }` | `Ack` | votante elegível, em voting. Pode trocar o voto até a revelação |

`Session = { code, playerId, token }`.

### 6.3 Servidor → Cliente

| Evento | Payload |
|---|---|
| `room:state` | `RoomView` |
| `room:kicked` | — (o cliente limpa a sessão e volta para o início) |

### 6.4 RoomView (o que cada cliente enxerga)

```ts
interface RoomView {
  code: string;
  me: { id: string; isHost: boolean; isActive: boolean };
  hostId: string;
  phase: Phase;
  players: { id; nickname; color; connected; score; isHost }[];  // ordenados por entrada
  questions: string[] | null;         // só para o host
  questionCount: number;
  settings: Settings;
  roundIndex: number;                 // 0-based
  deadline: number | null;            // epoch ms (o cliente corrige com serverTimeOffset)
  serverNow: number;

  writing?: {
    question: string;
    submittedIds: string[];
    myAnswer: Answer | null;          // só a própria resposta
  };
  voting?: {
    question: string;
    cardNumber: number; cardTotal: number;
    authorId: string; text: string;   // SEM isTruth
    votedIds: string[];               // quem votou, SEM o voto
    eligibleCount: number;
    myVote: boolean | null;
  };
  reveal?: { question: string; cardNumber: number; cardTotal: number; result: CardResult };
  roundScore?: { question: string; deltas: Record<string, number>; isLastRound: boolean };
  final?: { ranking: { playerId; score }[]; titles: { title; emoji; playerIds: string[] }[] };
}
```

**Regra de segurança**: `view.ts` é o único lugar que transforma o estado interno em `RoomView`. Ele nunca inclui `isTruth` de cards não revelados, os votos de outros jogadores antes da revelação, as respostas de outros jogadores na escrita nem o `token`. Há um teste unitário específico para garantir isso.

### 6.5 Códigos de erro

`ROOM_NOT_FOUND`, `ROOM_FULL`, `NICKNAME_TAKEN`, `INVALID_NICKNAME`, `INVALID_AVATAR`, `INVALID_TOKEN`, `NOT_HOST`, `WRONG_PHASE`, `NOT_ENOUGH_PLAYERS`, `NO_QUESTIONS`, `INVALID_QUESTIONS`, `INVALID_ANSWER`, `NOT_ELIGIBLE`, `INVALID_SETTINGS`. O cliente traduz cada código para uma mensagem em pt-BR (snackbar).

## 7. Validações e limites (`constants.ts`)

| Item | Regra |
|---|---|
| Código da sala | 4 letras do alfabeto `ABCDEFGHJKLMNPQRSTUVWXYZ` (sem I/O), único entre as salas ativas, case-insensitive na entrada |
| Apelido | 1–20 caracteres depois do trim, único na sala (sem diferenciar maiúsculas) |
| Avatar | um emoji de `AVATAR_EMOJIS` (24 opções com o tema do jogo); qualquer outro valor é recusado com `INVALID_AVATAR`; sem avatar, o servidor sorteia um. Avatares repetidos são permitidos (a cor de fundo diferencia) |
| Jogadores | mín. 3 para iniciar, máx. 12 por sala |
| Perguntas | 1–10, cada uma com 3–150 caracteres depois do trim |
| Resposta | 1–200 caracteres depois do trim |
| Tempo de escrita | `null` ou 30–300 s |
| Tempo de voto | `null` ou 10–60 s |
| Avanço automático | 8 s |
| Graça para o host desconectado | 30 s, depois o host passa para o jogador conectado mais antigo |
| Descarte de sala | 10 min sem nenhum jogador conectado |

## 8. Timers

- `timers.ts` mantém um único `setTimeout` por sala, para o `deadline` da fase atual. Ao expirar, chama `room.timeout()`, que faz a transição correspondente.
- O `deadline` vai no `RoomView` como timestamp absoluto, junto com `serverNow`. O cliente calcula `offset = serverNow - Date.now()` e mostra a contagem regressiva localmente, sem depender de ticks do servidor.
- Uma varredura a cada 15 s trata a graça do host e o descarte de salas vazias.

## 9. Reconexão

1. Ao criar ou entrar numa sala, o cliente salva `{ code, playerId, token }` em `sessionStorage['mentira:session']` (por aba: cada aba é um jogador) e uma cópia em `localStorage`.
2. Em todo `connect` (inclusive nas reconexões automáticas do Socket.IO), se houver sessão **da aba**, o cliente emite `room:resume`. A cópia do `localStorage` nunca é retomada sozinha. Ela vira o botão "Continuar de onde parei", no convite da sala, e "Voltar para a sala", na tela inicial. Assim outra pessoa no mesmo navegador consegue entrar sem tomar a vaga de ninguém.
3. O servidor associa o novo `socketId` ao jogador, marca como conectado e reenvia o estado.
4. Se o resume falhar (`ROOM_NOT_FOUND` ou `INVALID_TOKEN`), o cliente apaga a sessão e volta para o início.
5. Uma segunda aba com o mesmo token "rouba" a sessão: o socket antigo é desconectado.

## 10. Cliente Angular

### 10.1 Rotas

| Rota | Componente | Observação |
|---|---|---|
| `/` | `HomePage` | criar sala / entrar com código |
| `/sala/:code` | `RoomPage` | sem sessão para esse código → mostra o formulário de apelido (entrada via link/QR) |
| `**` | redireciona para `/` | |

### 10.2 Estado

- `SocketService`: encapsula o `socket.io-client` e expõe `emit<T>(evento, payload): Promise<Ack<T>>` e um signal de `connected`.
- `GameStore`:
  - `state = signal<RoomView | null>`
  - computeds: `phase`, `me`, `isHost`, `players`, `timeLeft` (atualizado a cada 250 ms)
  - métodos de ação que chamam o `SocketService` e mostram erros num `MatSnackBar`
- `SessionStorage`: lê, grava e limpa a sessão no `localStorage`.

### 10.3 Componentes

| Componente | Material usado |
|---|---|
| `TopBar` (código, rodada, eu/pontos, menu do host) | `mat-toolbar`, `mat-menu`, `mat-icon-button` |
| `PlayerList` / `Avatar` | `mat-list`, chips de cor |
| `LobbyPhase` + `HostSetupPanel` (perguntas, sugestões, configurações) | `mat-form-field`, `mat-slider`, `mat-slide-toggle`, `mat-chip-set`, `mat-expansion-panel` |
| `ShareRoom` (código grande, QR, copiar link) | `mat-card`, `cdkCopyToClipboard` |
| `WritingPhase` | `textarea matInput` + `mat-hint` com contador, `mat-button-toggle-group` V/M |
| `VotingPhase` | dois botões grandes de voto; no desktop, atalhos de teclado **V** (verdade) e **M** (mentira) |
| `RevealPhase` | `mat-card` com animação de flip (CSS) |
| `RoundScorePhase` / `FinalPhase` | `mat-list`, confete |
| `CountdownTimer` | `mat-progress-bar` |

### 10.4 Tema

- Tema M3 customizado via `mat.theme()`: cor primária roxa, terciária coral, `color-scheme: light dark`.
- Tokens próprios: `--verdade: #1fae8c` e `--mentira: #ff5a5f`.
- Layout mobile-first, conteúdo com `max-width: 600px` centralizado. Breakpoint de 960px no lobby para mostrar o QR grande ao lado da lista de jogadores.

## 11. Banco de sugestões inicial (`questions.ts`)

1. Qual foi a viagem mais inusitada que você já fez?
2. Qual é o seu talento mais escondido?
3. Qual foi a coisa mais estranha que você já comeu?
4. Qual foi o bico ou emprego mais curioso que você já teve?
5. Qual famoso você já encontrou pessoalmente?
6. Qual foi o maior mico que você já pagou em público?
7. Qual hobby inesperado você já teve?
8. Qual foi o presente mais estranho que você já ganhou?
9. Qual conquista inusitada você tem para contar?
10. Qual foi a situação mais absurda em que você já se meteu?

No lobby, o host pode adicionar uma pergunta específica do banco ou usar "Sortear" para preencher as vagas restantes sem repetir.

## 12. Scripts e execução

| Comando | Faz |
|---|---|
| `npm install` | instala todos os workspaces |
| `npm run dev` | servidor (`tsx watch`, porta 3000) + `ng serve` (porta 4200, com proxy de `/socket.io` para a 3000), em paralelo |
| `npm test` | Vitest no servidor |
| `npm run build` | build do Angular para `client/dist` + bundle do servidor com esbuild em `server/dist` |
| `npm start` | `node server/dist/index.js`: serve o cliente estático e o Socket.IO na mesma porta (`PORT`, padrão 3000) |

Para testar **no celular em rede local**, `ng serve --host 0.0.0.0` e acesso por `http://<ip-da-máquina>:4200`.

**Deploy**: qualquer host de Node com WebSocket (Render, Railway, Fly.io). Como o estado fica em memória, roda **uma única instância**.

## 13. Critérios de aceite da v1

1. Três ou mais abas/dispositivos conseguem jogar uma partida completa de 2 rodadas, do lobby ao pódio.
2. Pela aba Network do DevTools, nenhum cliente recebe `isTruth` de um card antes da revelação.
3. Recarregar a página em qualquer fase devolve o jogador ao mesmo ponto, com o placar intacto.
4. Um jogador que fecha a aba durante a votação não trava a fase.
5. Se o host fecha a aba, outro jogador vira host depois de 30 s.
6. As telas funcionam a partir de 360px de largura e no desktop.
7. Os testes unitários de `Room`, `scoring` e `view` passam.
