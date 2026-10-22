# Mentira! — Design do Jogo

> Status: aprovado · 2026-10-21

## 1. Visão

Jogo de festa para navegador, feito para happy hours de trabalho/escola. Um **host** cria uma sala, os jogadores entram pelo celular ou computador com um código, e todos escrevem respostas a perguntas — algumas verdadeiras, outras inventadas. Depois, cada resposta é apresentada a todos, que votam **Verdade** ou **Mentira**. A graça está em conhecer histórias reais dos colegas e em ver quem consegue enganar o grupo.

Funciona em dois contextos, com a mesma experiência:

- **Presencial** — todos na mesma sala física, cada um no seu celular.
- **Remoto** — todos numa chamada de vídeo, cada um com o jogo aberto em outra aba/dispositivo.

## 2. Papéis

| Papel | O que faz |
|---|---|
| **Host** | Cria a sala, define as perguntas e as configurações, inicia o jogo e controla o ritmo (avançar, pular, remover jogador). **Também joga**: escreve respostas e vota como qualquer um. |
| **Jogador** | Entra com código + apelido, escreve respostas, vota. |

Limites: **mínimo 2 jogadores** (incluindo o host), **sem máximo** (o host controla quem entra).

**Modo treino (oculto):** abrir o site com `?bots=N` (ex.: `/?bots=3`) e criar uma sala coloca N bots (até 8) que respondem e votam sozinhos. Não aparece em nenhum lugar da interface.

## 3. Fluxo do jogo

```
LOBBY ──► [ RODADA 1 ] ──► [ RODADA 2 ] ──► … ──► PLACAR FINAL
            │
            ├─ ESCRITA     todos respondem a pergunta da rodada e marcam V/M
            ├─ VOTAÇÃO     uma resposta por vez:
            │                 VOTAR ──► REVELAR ──► próxima resposta
            └─ PLACAR DA RODADA
```

**Uma rodada = uma pergunta.** Escrever e votar na mesma rodada mantém a resposta fresca na cabeça e dá ritmo ao jogo.

### 3.1 Lobby
- O host cria a sala e recebe um **código de 4 letras** (ex.: `KXPQ`) e um **link/QR code** para compartilhar (útil para mandar no chat da chamada ou mostrar na TV).
- Jogadores entram com o código + apelido (único na sala) e veem a lista de quem já entrou, em tempo real.
- O host monta a lista de perguntas:
  - escrevendo as próprias, e/ou
  - sorteando do **banco de sugestões** embutido (perguntas prontas, seguras para ambiente de trabalho).
- O host ajusta as configurações (seção 6) e clica em **Iniciar** (habilitado com ≥ 2 jogadores e ≥ 1 pergunta).

### 3.2 Escrita
- Todos veem a pergunta da rodada.
- Cada um escreve uma resposta (até 200 caracteres) e marca, em segredo, se ela é **Verdade** ou **Mentira**.
- Dá para editar até confirmar. A tela mostra quem já respondeu (sem revelar o conteúdo).
- A fase termina quando todos confirmam ou o tempo acaba. Quem não respondeu fica sem card nessa rodada.

### 3.3 Votação (uma resposta por vez)
- As respostas da rodada são **embaralhadas** e apresentadas uma de cada vez, mostrando **o autor** (é preciso saber de quem é para julgar).
- Cada jogador, no próprio dispositivo, vota **Verdade** ou **Mentira**.
- O **autor não vota** no próprio card: a tela dele mostra "Esse é o seu! Faça cara de paisagem 😐" e quantos já votaram.
- A tela de todos mostra o progresso ("5/7 votaram"), sem revelar os votos.
- Quando todos votam (ou o tempo acaba), vem a revelação.

### 3.4 Revelação
- Animação: o card vira e mostra **VERDADE** ✅ ou **MENTIRA** 🤥.
- Lista de quem votou o quê, separada em acertou × errou.
- Pontos ganhos naquele card (seção 4).
- O host clica **Próxima** (ou avança sozinho após X segundos, se configurado).

### 3.5 Placar da rodada e placar final
- Ao fim de cada rodada: ranking parcial com a variação de pontos (+3, +1…).
- Ao fim do jogo: pódio e **títulos divertidos**:
  - 🤥 **Mestre da Mentira**: quem mais enganou com mentiras
  - 😇 **Ninguém acredita em mim**: verdades em que mais gente votou "mentira"
  - 🕵️ **Detector de Mentiras**: quem mais acertou votos
  - 📖 **Livro Aberto**: quem mais escreveu verdades
- O host pode **Jogar de novo** (mesma sala e jogadores, placar zerado).

## 4. Pontuação

| Evento | Pontos |
|---|---|
| Votar certo em um card | **+1** para quem votou |
| Cada pessoa enganada pelo seu card | **+1** para o autor |

Exemplo: Ana escreve uma mentira. Dos 6 votantes, 4 acreditaram (votaram Verdade) e 2 acertaram. Ana ganha **+4** e os 2 que acertaram ganham **+1** cada.

Isso funciona tanto para verdades quanto para mentiras: contar uma verdade absurda que ninguém acredita também rende pontos.

Votos não enviados: se o tempo acabar, quem não votou ganha 0 e não conta como enganado.

## 5. Telas

| # | Tela | Quem vê | Elementos principais |
|---|---|---|---|
| 1 | **Início** | todos | logo, botões "Criar sala" / "Entrar", campo de código e apelido |
| 2 | **Lobby** | todos | código + QR + copiar link, lista de jogadores com avatar/cor |
| 2a | ↳ painel do host | host | editor de perguntas, sugestões, configurações, Iniciar, remover jogador |
| 3 | **Escrita** | todos | pergunta, textarea com contador, toggle Verdade/Mentira, Confirmar, quem já respondeu, timer |
| 4 | **Votação** | votantes | card com autor + resposta, botões grandes Verdade/Mentira, progresso, timer |
| 4a | ↳ autor | autor | "Esse é o seu!", progresso |
| 5 | **Revelação** | todos | card virado, quem acertou/errou, pontos; host: Próxima |
| 6 | **Placar da rodada** | todos | ranking com variação; host: Próxima rodada |
| 7 | **Final** | todos | pódio, títulos; host: Jogar de novo |

Sempre visível: barra superior com código da sala, rodada atual (2/5) e o próprio apelido/pontos. O host tem um menu de controles (pausar timer, pular card, encerrar jogo).

### Direção visual
- **Angular Material** (Material 3), tema próprio:
  - Verdade = verde-azulado, Mentira = vermelho-coral, base com roxo profundo e clima de festa.
  - Modo claro e escuro (segue o sistema).
- **Mobile-first**: botões de voto grandes, ocupando a metade inferior da tela, fáceis de tocar com o polegar.
- No **desktop** (remoto), o layout centraliza num card de até ~600px. Em telas largas, o lobby mostra o QR code grande, para o host compartilhar a tela na chamada.
- Avatar = inicial do apelido sobre uma cor sorteada.
- Animações leves: virar o card na revelação, contagem de pontos subindo, confete no pódio.

## 6. Configurações do host

| Configuração | Padrão | Opções |
|---|---|---|
| Tempo de escrita | 90 s | 30–300 s, ou sem limite |
| Tempo de voto por card | 20 s | 10–60 s, ou sem limite |
| Avanço automático após revelação | desligado | ligado (8 s) |
| Perguntas | — | 1–10 |

Com "sem limite", o host avança manualmente (útil quando a conversa sobre uma história rende).

## 7. Regras de robustez

- **Reconexão**: o navegador guarda um token da sessão. Se a página recarregar ou a internet cair, o jogador volta ao mesmo lugar, com pontos e respostas intactos. Enquanto ele está desconectado, o jogo não fica esperando por ele (a fase fecha sem ele).
- **Host caiu**: depois de 30 s desconectado, o host passa para o jogador mais antigo da sala. Se ele voltar, vira jogador comum.
- **Entrar no meio**: é permitido. O jogador entra a partir da próxima rodada e começa com 0 pontos.
- **Sala vazia**: é descartada 10 min após o último jogador sair.
- **Privacidade**: o servidor nunca envia a um cliente a marcação V/M de um card antes da revelação, nem os votos individuais antes do fim da votação. Ninguém consegue "colar" pelo DevTools.

## 8. Fora do escopo (v1)

- Contas/login, histórico de partidas, banco de dados
- Modo "telão" separado (TV mostrando o jogo enquanto celulares só votam). Na v1, o host pode compartilhar a própria tela.
- Chat dentro do jogo
- Moderação de conteúdo automática (o host pode pular um card)
- Internacionalização (v1 só em pt-BR)

## 9. Decisões tomadas

1. Nome do jogo: **Mentira!**
2. O autor do card **aparece** durante a votação.
3. O banco de sugestões começa com **10 perguntas** para testes (lista em `02-specs.md`) e pode crescer depois.
