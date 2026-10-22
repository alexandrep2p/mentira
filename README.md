# Mentira!

Jogo de festa para navegador: cada jogador responde uma pergunta com uma **verdade** ou uma **mentira**, e todo mundo vota em quem está enganando. Feito para happy hours, na mesma sala (cada um no celular) ou numa chamada de vídeo.

- Design: [docs/01-design.md](docs/01-design.md)
- Especificação técnica: [docs/02-specs.md](docs/02-specs.md)
- Tasks: [docs/03-tasks.md](docs/03-tasks.md)

## Stack

- **Servidor**: Node 22+, Express 5, Socket.IO 4.8. Estado em memória, sem banco.
- **Cliente**: Angular 22 (standalone, signals, zoneless) + Angular Material 22.
- **shared/**: tipos, constantes e o banco de perguntas, usados pelos dois lados.

## Rodando

```bash
npm install
```

```bash
npm run dev
```

Isso sobe o servidor em `http://localhost:3000` e o Angular em `http://localhost:4200`, com proxy para o Socket.IO. Abra `http://localhost:4200`.

### Testar no celular (mesma rede Wi-Fi)

O `ng serve` já escuta em `0.0.0.0`. Descubra o IP da máquina (`ipconfig` no Windows) e abra `http://<ip>:4200` no celular.

### Testar com vários jogadores no mesmo computador

Cada aba é um jogador diferente: a sessão fica no `sessionStorage` da aba. Abra o link da sala em outras abas e entre com apelidos diferentes. Recarregar uma aba devolve aquele jogador ao mesmo ponto do jogo.

## Testes

```bash
npm test
```

Testes unitários (Vitest) da lógica do jogo: regras da sala, pontuação, títulos e o filtro que impede que segredos vazem para os clientes.

```bash
npm run simulate
```

Simula uma partida completa com 3 clientes Socket.IO reais: 2 rodadas, pontuação, reconexão e verificação de que nenhum segredo vaza.

## Produção

```bash
npm run build
```

```bash
npm start
```

O servidor serve o cliente buildado e o Socket.IO na mesma porta (`PORT`, padrão 3000). Funciona em qualquer host de Node com WebSocket. Como o estado fica em memória, rode **uma única instância**: reiniciar o processo encerra as salas abertas.

### Deploy no Render (gratuito)

O [render.yaml](render.yaml) já descreve o serviço. No painel do Render, use **New → Blueprint**, escolha este repositório e confirme. Cada push na `main` faz um novo deploy.

No plano gratuito, o serviço dorme após 15 minutos sem uso. A primeira visita depois disso leva cerca de 1 minuto para acordá-lo. Durante uma partida ele não dorme, porque as mensagens WebSocket contam como atividade.

## Estrutura

```
shared/src/        tipos, constantes, banco de perguntas
server/src/game/   regras puras (Room, scoring, view) + testes
server/src/        Socket.IO (handlers), salas, timers, bootstrap
server/scripts/    simulação de partida
client/src/app/    core (socket, store, sessão), pages, phases, shared
```
