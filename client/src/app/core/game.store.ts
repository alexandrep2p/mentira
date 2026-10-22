import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { AUTO_ADVANCE_MS, type ClientEvent, type ClientToServerEvents, type PlayerView, type RoomView, type Settings } from '@mentira/shared';
import { errorMessage } from './errors';
import { SessionStorage } from './session-storage';
import { SocketService } from './socket.service';

@Injectable({ providedIn: 'root' })
export class GameStore {
  private readonly socket = inject(SocketService);
  private readonly storage = inject(SessionStorage);
  private readonly snack = inject(MatSnackBar);
  private readonly router = inject(Router);

  readonly state = signal<RoomView | null>(null);
  readonly connected = this.socket.connected;
  /** true enquanto a tentativa de retomar a sessão salva está em andamento. */
  readonly resuming = signal(this.savedSession() !== null);
  readonly busy = signal(false);

  private readonly now = signal(Date.now());
  private clockOffset = 0;

  readonly phase = computed(() => this.state()?.phase ?? null);
  readonly me = computed(() => {
    const s = this.state();
    return s?.players.find((p) => p.id === s.me.id) ?? null;
  });
  readonly isHost = computed(() => this.state()?.me.isHost ?? false);
  readonly players = computed(() => this.state()?.players ?? []);
  readonly playerMap = computed(() => new Map(this.players().map((p) => [p.id, p])));
  readonly host = computed(() => this.playerMap().get(this.state()?.hostId ?? '') ?? null);

  /** Milissegundos restantes na fase atual (null = sem limite). */
  readonly timeLeft = computed(() => {
    const deadline = this.state()?.deadline;
    if (deadline == null) return null;
    return Math.max(0, deadline - (this.now() + this.clockOffset));
  });

  /** Duração total da fase atual, para a barra de progresso. */
  readonly phaseDuration = computed(() => {
    const s = this.state();
    if (!s || s.deadline == null) return null;
    if (s.phase === 'writing') return (s.settings.writingSeconds ?? 0) * 1000;
    if (s.phase === 'voting') return (s.settings.votingSeconds ?? 0) * 1000;
    if (s.phase === 'reveal') return AUTO_ADVANCE_MS;
    return null;
  });

  constructor() {
    const clock = setInterval(() => this.now.set(Date.now()), 250);
    inject(DestroyRef).onDestroy(() => clearInterval(clock));

    this.socket.onState((view) => {
      this.clockOffset = view.serverNow - Date.now();
      this.state.set(view);
    });
    this.socket.onKicked(() => {
      this.reset();
      this.snack.open('Você foi removido da sala pelo host.', 'OK', { duration: 5000 });
      this.router.navigateByUrl('/');
    });
    this.socket.onConnect(() => this.resume());
  }

  player(id: string | null | undefined): PlayerView | null {
    return id ? (this.playerMap().get(id) ?? null) : null;
  }

  /** Sessão desta aba, retomada automaticamente ao (re)conectar. */
  savedSession() {
    return this.storage.get();
  }

  /** Última sessão deste navegador (de outra aba), para retomar sob pedido. */
  rememberedSession(code?: string) {
    if (this.state()) return null;
    const remembered = this.storage.remembered();
    return remembered && (!code || remembered.code === code) ? remembered : null;
  }

  private async resume() {
    const session = this.savedSession();
    if (!session) {
      this.resuming.set(false);
      return;
    }
    this.resuming.set(true);
    const res = await this.socket.emit('room:resume', { code: session.code, token: session.token });
    this.resuming.set(false);
    if (res.ok) {
      this.storage.set(res);
    } else if (res.error !== 'TIMEOUT') {
      this.reset();
      this.snack.open('Essa sala não existe mais.', 'OK', { duration: 4000 });
    }
  }

  async rejoin() {
    const session = this.storage.remembered();
    if (!session) return;
    this.storage.set(session);
    await this.resume();
    if (this.state()) await this.router.navigate(['/sala', session.code]);
  }

  private reset() {
    this.storage.clear();
    this.state.set(null);
  }

  // ---------- ações ----------

  async createRoom(nickname: string, avatar: string, bots = 0) {
    const res = await this.run('room:create', bots > 0 ? { nickname, avatar, bots } : { nickname, avatar });
    if (res) {
      this.storage.set(res);
      await this.router.navigate(['/sala', res.code]);
    }
    return !!res;
  }

  async joinRoom(code: string, nickname: string, avatar: string) {
    const res = await this.run('room:join', { code, nickname, avatar });
    if (res) {
      this.storage.set(res);
      await this.router.navigate(['/sala', res.code]);
    }
    return !!res;
  }

  async leave() {
    await this.socket.emit('room:leave', {});
    this.reset();
    await this.router.navigateByUrl('/');
  }

  setQuestions = (questions: string[]) => this.run('host:setQuestions', { questions });
  setSettings = (settings: Partial<Settings>) => this.run('host:setSettings', settings);
  kick = (playerId: string) => this.run('host:kick', { playerId });
  start = () => this.run('host:start', {});
  advance = () => this.run('host:advance', {});
  skipCard = () => this.run('host:skipCard', {});
  end = () => this.run('host:end', {});
  playAgain = () => this.run('host:playAgain', {});
  submitAnswer = (text: string, isTruth: boolean) => this.run('answer:submit', { text, isTruth });
  vote = (votedTruth: boolean) => this.run('vote:cast', { votedTruth });

  /** Emite, mostra o erro num snackbar e devolve os dados (ou null). */
  private async run<E extends ClientEvent>(event: E, payload: Parameters<ClientToServerEvents[E]>[0]) {
    this.busy.set(true);
    try {
      const res = await this.socket.emit(event, payload);
      if (!res.ok) {
        this.snack.open(errorMessage(res.error), 'OK', { duration: 4000, panelClass: 'error-snack' });
        return null;
      }
      return res;
    } finally {
      this.busy.set(false);
    }
  }
}
