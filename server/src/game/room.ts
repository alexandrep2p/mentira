import { randomUUID } from 'node:crypto';
import {
  AUTO_ADVANCE_MS,
  AVATAR_EMOJIS,
  DEFAULT_SETTINGS,
  HOST_GRACE_MS,
  LIMITS,
  PLAYER_COLORS,
  type FinalTitle,
  type Phase,
  type Settings,
} from '@mentira/shared';
import { applyCardResult, computeRanking, computeTitles, scoreCard } from './scoring';
import { emptyStats, fail, ok, type Player, type Result, type Round } from './types';

export interface RoomDeps {
  now: () => number;
  random: () => number;
  id: () => string;
}

const defaultDeps: RoomDeps = { now: Date.now, random: Math.random, id: randomUUID };

const clean = (value: unknown) => (typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '');

/**
 * Estado e regras de uma sala. Não conhece Socket.IO: cada ação valida,
 * muta o estado e devolve ok/erro, o que deixa tudo testável isoladamente.
 */
export class Room {
  readonly players = new Map<string, Player>();
  hostId = '';
  questions: string[] = [];
  settings: Settings = { ...DEFAULT_SETTINGS };
  phase: Phase = 'lobby';
  roundIndex = 0;
  round: Round | null = null;
  deadline: number | null = null;
  hostDisconnectedAt: number | null = null;
  emptySince: number | null = null;
  final: { ranking: { playerId: string; score: number }[]; titles: FinalTitle[] } | null = null;
  private joinCounter = 0;

  constructor(
    readonly code: string,
    private readonly deps: RoomDeps = defaultDeps,
  ) {
    this.emptySince = deps.now();
  }

  // ---------- consultas ----------

  isActive(player: Player) {
    return player.activeFromRound <= this.roundIndex;
  }

  activePlayers() {
    return [...this.players.values()].filter((p) => this.isActive(p));
  }

  currentAuthorId(): string | null {
    if (!this.round || (this.phase !== 'voting' && this.phase !== 'reveal')) return null;
    return this.round.cardOrder[this.round.cardIndex] ?? null;
  }

  eligibleVoters() {
    const author = this.currentAuthorId();
    return this.activePlayers().filter((p) => p.id !== author);
  }

  findByToken(token: string) {
    return [...this.players.values()].find((p) => p.token === token);
  }

  // ---------- presença ----------

  /** Sem avatar (ou undefined), sorteia um da lista; um avatar fora da lista é recusado. */
  join(nickname: unknown, avatar?: unknown): Result<{ player: Player }> {
    const name = clean(nickname);
    if (!name || name.length > LIMITS.nicknameMax) return fail('INVALID_NICKNAME');
    if (avatar !== undefined && (typeof avatar !== 'string' || !AVATAR_EMOJIS.includes(avatar))) {
      return fail('INVALID_AVATAR');
    }
    if (this.players.size >= LIMITS.maxPlayers) return fail('ROOM_FULL');
    const lower = name.toLocaleLowerCase('pt-BR');
    if ([...this.players.values()].some((p) => p.nickname.toLocaleLowerCase('pt-BR') === lower)) {
      return fail('NICKNAME_TAKEN');
    }

    const usedColors = new Set([...this.players.values()].map((p) => p.color));
    const color = PLAYER_COLORS.findIndex((_, i) => !usedColors.has(i));
    const player: Player = {
      id: this.deps.id(),
      token: this.deps.id(),
      nickname: name,
      avatar: (avatar as string | undefined) ?? AVATAR_EMOJIS[Math.floor(this.deps.random() * AVATAR_EMOJIS.length)],
      color: color === -1 ? this.players.size % PLAYER_COLORS.length : color,
      connected: true,
      joinedAt: this.joinCounter++,
      activeFromRound: this.phase === 'lobby' ? 0 : this.roundIndex + 1,
      score: 0,
      stats: emptyStats(),
    };
    this.players.set(player.id, player);
    if (!this.hostId) this.hostId = player.id;
    this.emptySince = null;
    return ok({ player });
  }

  connect(playerId: string) {
    const player = this.players.get(playerId);
    if (!player) return;
    player.connected = true;
    this.emptySince = null;
    if (playerId === this.hostId) this.hostDisconnectedAt = null;
  }

  disconnect(playerId: string) {
    const player = this.players.get(playerId);
    if (!player) return;
    player.connected = false;
    const now = this.deps.now();
    if (playerId === this.hostId) this.hostDisconnectedAt = now;
    if (![...this.players.values()].some((p) => p.connected)) this.emptySince = now;
    this.checkProgress();
  }

  leave(playerId: string): Result {
    if (!this.players.has(playerId)) return fail('NOT_IN_ROOM');
    this.removePlayer(playerId);
    return ok();
  }

  kick(byId: string, targetId: string): Result {
    if (byId !== this.hostId) return fail('NOT_HOST');
    if (targetId === byId || !this.players.has(targetId)) return fail('INVALID_PLAYER');
    this.removePlayer(targetId);
    return ok();
  }

  /** Graça do host desconectado. Devolve true se algo mudou. */
  sweep(now: number): boolean {
    if (this.hostDisconnectedAt !== null && now - this.hostDisconnectedAt >= HOST_GRACE_MS) {
      return this.transferHost();
    }
    return false;
  }

  // ---------- lobby ----------

  setQuestions(byId: string, questions: unknown): Result {
    if (byId !== this.hostId) return fail('NOT_HOST');
    if (this.phase !== 'lobby') return fail('WRONG_PHASE');
    if (!Array.isArray(questions) || questions.length > LIMITS.questionsMax) return fail('INVALID_QUESTIONS');
    const cleaned = questions.map(clean);
    if (cleaned.some((q) => q.length < LIMITS.questionMin || q.length > LIMITS.questionMax)) {
      return fail('INVALID_QUESTIONS');
    }
    this.questions = cleaned;
    return ok();
  }

  setSettings(byId: string, patch: Partial<Settings>): Result {
    if (byId !== this.hostId) return fail('NOT_HOST');
    if (this.phase !== 'lobby') return fail('WRONG_PHASE');
    const next = { ...this.settings };
    const seconds = (value: unknown, range: { min: number; max: number }) =>
      value === null || (Number.isInteger(value) && (value as number) >= range.min && (value as number) <= range.max);

    if ('writingSeconds' in patch) {
      if (!seconds(patch.writingSeconds, LIMITS.writingSeconds)) return fail('INVALID_SETTINGS');
      next.writingSeconds = patch.writingSeconds ?? null;
    }
    if ('votingSeconds' in patch) {
      if (!seconds(patch.votingSeconds, LIMITS.votingSeconds)) return fail('INVALID_SETTINGS');
      next.votingSeconds = patch.votingSeconds ?? null;
    }
    if ('autoAdvanceReveal' in patch) {
      if (typeof patch.autoAdvanceReveal !== 'boolean') return fail('INVALID_SETTINGS');
      next.autoAdvanceReveal = patch.autoAdvanceReveal;
    }
    this.settings = next;
    return ok();
  }

  start(byId: string): Result {
    if (byId !== this.hostId) return fail('NOT_HOST');
    if (this.phase !== 'lobby') return fail('WRONG_PHASE');
    const connected = [...this.players.values()].filter((p) => p.connected).length;
    if (connected < LIMITS.minPlayers) return fail('NOT_ENOUGH_PLAYERS');
    if (this.questions.length === 0) return fail('NO_QUESTIONS');
    this.startRound(0);
    return ok();
  }

  // ---------- jogo ----------

  submitAnswer(playerId: string, text: unknown, isTruth: unknown): Result {
    const player = this.players.get(playerId);
    if (!player) return fail('NOT_IN_ROOM');
    if (this.phase !== 'writing' || !this.round) return fail('WRONG_PHASE');
    if (!this.isActive(player)) return fail('NOT_ELIGIBLE');
    const value = typeof text === 'string' ? text.trim() : '';
    if (!value || value.length > LIMITS.answerMax || typeof isTruth !== 'boolean') return fail('INVALID_ANSWER');
    this.round.answers.set(playerId, { text: value, isTruth });
    this.checkProgress();
    return ok();
  }

  castVote(playerId: string, votedTruth: unknown): Result {
    if (!this.players.has(playerId)) return fail('NOT_IN_ROOM');
    if (this.phase !== 'voting' || !this.round) return fail('WRONG_PHASE');
    if (!this.eligibleVoters().some((p) => p.id === playerId)) return fail('NOT_ELIGIBLE');
    if (typeof votedTruth !== 'boolean') return fail('NOT_ELIGIBLE');
    this.round.votes.set(playerId, votedTruth);
    this.checkProgress();
    return ok();
  }

  advance(byId: string): Result {
    if (byId !== this.hostId) return fail('NOT_HOST');
    switch (this.phase) {
      case 'writing':
        this.closeWriting();
        return ok();
      case 'voting':
        this.revealCard();
        return ok();
      case 'reveal':
        this.nextCard();
        return ok();
      case 'roundScore':
        this.nextRound();
        return ok();
      default:
        return fail('WRONG_PHASE');
    }
  }

  skipCard(byId: string): Result {
    if (byId !== this.hostId) return fail('NOT_HOST');
    if (this.phase !== 'voting' && this.phase !== 'reveal') return fail('WRONG_PHASE');
    this.nextCard();
    return ok();
  }

  end(byId: string): Result {
    if (byId !== this.hostId) return fail('NOT_HOST');
    if (this.phase === 'lobby' || this.phase === 'final') return fail('WRONG_PHASE');
    this.finish();
    return ok();
  }

  playAgain(byId: string): Result {
    if (byId !== this.hostId) return fail('NOT_HOST');
    if (this.phase !== 'final') return fail('WRONG_PHASE');
    this.phase = 'lobby';
    this.roundIndex = 0;
    this.round = null;
    this.final = null;
    this.deadline = null;
    for (const p of this.players.values()) {
      p.score = 0;
      p.stats = emptyStats();
      p.activeFromRound = 0;
    }
    return ok();
  }

  /** Expiração do timer da fase. Devolve true se houve transição. */
  tick(now: number): boolean {
    if (this.deadline === null || now < this.deadline) return false;
    switch (this.phase) {
      case 'writing':
        this.closeWriting();
        return true;
      case 'voting':
        this.revealCard();
        return true;
      case 'reveal':
        this.nextCard();
        return true;
      default:
        this.deadline = null;
        return false;
    }
  }

  // ---------- transições internas ----------

  private deadlineIn(seconds: number | null) {
    return seconds === null ? null : this.deps.now() + seconds * 1000;
  }

  private startRound(index: number) {
    this.roundIndex = index;
    this.round = {
      index,
      question: this.questions[index],
      answers: new Map(),
      cardOrder: [],
      cardIndex: 0,
      votes: new Map(),
      cardResults: [],
      deltas: new Map(),
    };
    this.phase = 'writing';
    this.deadline = this.deadlineIn(this.settings.writingSeconds);
  }

  private closeWriting() {
    const round = this.round!;
    for (const [id, answer] of round.answers) {
      const player = this.players.get(id);
      if (!player) round.answers.delete(id);
      else if (answer.isTruth) player.stats.truthsWritten++;
    }
    round.cardOrder = this.shuffle([...round.answers.keys()]);
    if (round.cardOrder.length === 0) this.toRoundScore();
    else this.startCard(0);
  }

  private startCard(index: number) {
    const round = this.round!;
    round.cardIndex = index;
    round.votes = new Map();
    this.phase = 'voting';
    this.deadline = this.deadlineIn(this.settings.votingSeconds);
    this.checkProgress();
  }

  private revealCard() {
    const round = this.round!;
    const authorId = round.cardOrder[round.cardIndex];
    const answer = round.answers.get(authorId)!;
    const eligible = new Set(this.eligibleVoters().map((p) => p.id));
    const votes = new Map([...round.votes].filter(([id]) => eligible.has(id)));
    const result = scoreCard(authorId, answer, votes);
    applyCardResult(result, this.players, round.deltas);
    round.cardResults.push(result);
    this.phase = 'reveal';
    this.deadline = this.settings.autoAdvanceReveal ? this.deps.now() + AUTO_ADVANCE_MS : null;
  }

  private nextCard() {
    const round = this.round!;
    if (round.cardIndex + 1 < round.cardOrder.length) this.startCard(round.cardIndex + 1);
    else this.toRoundScore();
  }

  private toRoundScore() {
    this.phase = 'roundScore';
    this.deadline = null;
  }

  private nextRound() {
    if (this.roundIndex + 1 < this.questions.length) this.startRound(this.roundIndex + 1);
    else this.finish();
  }

  private finish() {
    const players = [...this.players.values()];
    this.final = { ranking: computeRanking(players), titles: computeTitles(players) };
    this.phase = 'final';
    this.deadline = null;
  }

  /** Fecha a fase quando todos os conectados que podem agir já agiram. */
  private checkProgress() {
    const round = this.round;
    if (!round) return;
    if (this.phase === 'writing') {
      const connected = this.activePlayers().filter((p) => p.connected);
      if (connected.length > 0 && connected.every((p) => round.answers.has(p.id))) this.closeWriting();
    } else if (this.phase === 'voting') {
      const eligible = this.eligibleVoters();
      const connected = eligible.filter((p) => p.connected);
      const everyoneVoted = connected.length > 0 && connected.every((p) => round.votes.has(p.id));
      if (eligible.length === 0 || everyoneVoted) this.revealCard();
    }
  }

  private removePlayer(playerId: string) {
    const round = this.round;
    if (round) {
      const isCurrentAuthor = this.phase === 'voting' && this.currentAuthorId() === playerId;
      round.answers.delete(playerId);
      round.votes.delete(playerId);
      if (this.phase === 'voting' || this.phase === 'reveal') {
        // Cards ainda não revelados desse jogador saem da fila.
        const upcoming = round.cardOrder.slice(round.cardIndex + 1).filter((id) => id !== playerId);
        const kept = round.cardOrder.slice(0, round.cardIndex + 1);
        round.cardOrder = [...kept, ...upcoming];
      }
      this.players.delete(playerId);
      if (isCurrentAuthor) {
        round.cardOrder.splice(round.cardIndex, 1);
        if (round.cardIndex < round.cardOrder.length) this.startCard(round.cardIndex);
        else this.toRoundScore();
      }
    } else {
      this.players.delete(playerId);
    }

    if (playerId === this.hostId) {
      this.hostId = '';
      this.hostDisconnectedAt = null;
      this.transferHost();
    }
    if (this.players.size === 0) this.emptySince = this.deps.now();
    this.checkProgress();
  }

  /** Passa o host para o jogador conectado mais antigo. */
  private transferHost(): boolean {
    const candidates = [...this.players.values()]
      .filter((p) => p.id !== this.hostId)
      .sort((a, b) => Number(b.connected) - Number(a.connected) || a.joinedAt - b.joinedAt);
    const next = candidates[0];
    if (!next || (!next.connected && this.hostId)) return false;
    this.hostId = next.id;
    this.hostDisconnectedAt = next.connected ? null : this.deps.now();
    return true;
  }

  private shuffle<T>(items: T[]): T[] {
    const copy = [...items];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(this.deps.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }
}
