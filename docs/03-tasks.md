# Mentira! — Tasks

> Baseado em [02-specs.md](02-specs.md). Cada task termina em algo verificável.

## Fase 0 — Fundação

- [x] **T01 · Monorepo**: `git init`, `package.json` raiz com workspaces (`shared`, `server`, `client`), `.gitignore`, `tsconfig.base.json` e scripts `dev`/`build`/`start`/`test`.
  *Pronto quando:* `npm install` roda sem erros.
- [x] **T02 · Shared**: `types.ts` (RoomView, payloads, Ack, ErrorCode), `constants.ts` (limites, defaults, nomes de eventos, paleta de cores) e `questions.ts` (10 perguntas).
- [x] **T03 · Esqueleto do servidor**: Express + Socket.IO na porta 3000, rota `/health` e Vitest configurado.
  *Pronto quando:* `npm run dev -w server` sobe e `/health` responde.
- [x] **T04 · Esqueleto do cliente**: `ng new` (standalone, zoneless, SCSS, roteamento), Angular Material com tema M3 customizado (roxo/coral, tokens verdade/mentira) e proxy de `/socket.io`.
  *Pronto quando:* `npm run dev` sobe servidor e cliente juntos.

## Fase 1 — Lógica do jogo (servidor, com testes)

- [x] **T05 · Room: lobby**: criar sala, entrar, validar apelido, limite de jogadores, kick, setQuestions, setSettings e iniciar.
- [x] **T06 · Room: escrita**: submit/edição de resposta, fechamento por "todos enviaram", timeout ou avanço do host, e embaralhamento dos cards.
- [x] **T07 · Room: votação e revelação**: elegibilidade, troca de voto, fechamento, skipCard e transições reveal → voting/roundScore → writing/final.
- [x] **T08 · Scoring**: pontos por card, stats, deltas da rodada, ranking e títulos com empate.
- [x] **T09 · View**: `RoomView` por jogador, com teste garantindo que nada secreto vaza.
- [x] **T10 · Presença**: desconectar/reconectar, recálculo de "todos fizeram", transferência de host após 30 s e entrada no meio do jogo (`activeFromRound`).
- [x] **T11 · RoomManager + timers**: geração de códigos únicos, um timer de fase por sala, varredura de 15 s e descarte de salas vazias.
- [x] **T12 · Handlers Socket.IO**: liga eventos → Room → broadcast de `room:state` personalizado, implementa `room:resume` e `room:kicked`.
  *Pronto quando:* um script de teste com 3 clientes `socket.io-client` joga uma partida completa.

## Fase 2 — Cliente

- [x] **T13 · Core**: `SocketService` (emit com ack em Promise), `SessionStorage`, `GameStore` (signals, offset do relógio, `timeLeft`), resume automático no connect e tradução de erros + snackbar.
- [x] **T14 · Home**: criar sala e entrar com código + apelido.
- [x] **T15 · RoomPage + TopBar**: troca de tela por fase, formulário de apelido para entrada via link, menu do host (avançar, pular card, encerrar).
- [x] **T16 · Lobby**: lista de jogadores, ShareRoom (código, QR, copiar link) e painel do host (editor de perguntas, sugestões/sortear, configurações, kick, iniciar).
- [x] **T17 · Escrita**: pergunta, textarea com contador, toggle V/M, enviar/editar, quem já respondeu e timer.
- [x] **T18 · Votação**: card com autor, botões grandes, tela do autor, progresso e timer.
- [x] **T19 · Revelação**: flip do card, acertou/errou, pontos e botão Próxima (host).
- [x] **T20 · Placar da rodada + Final**: ranking com deltas, pódio, títulos, confete e Jogar de novo.

## Fase 3 — Acabamento

- [x] **T21 · Responsividade e polish**: testar em 360px, 768px e desktop, modo escuro, estados vazios e de carregamento, e aviso de "reconectando…".
- [x] **T22 · Build de produção**: o servidor serve o `client/dist` com fallback de SPA para `/sala/:code`, e `npm run build && npm start` funciona.
- [ ] **T23 · Teste ponta a ponta manual**: percorrer os critérios de aceite da seção 13 das specs com 3+ abas e um celular na rede local. *Feito com 3 abas, uma em viewport de celular; falta testar num celular de verdade e a troca de host após 30 s.*
- [x] **T24 · README**: como rodar, testar no celular e fazer deploy.
