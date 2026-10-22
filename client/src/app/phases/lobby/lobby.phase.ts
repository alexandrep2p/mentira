import { Clipboard } from '@angular/cdk/clipboard';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar } from '@angular/material/snack-bar';
import { LIMITS, QUESTION_BANK, type Settings } from '@mentira/shared';
import QRCode from 'qrcode';
import { GameStore } from '../../core/game.store';
import { Avatar } from '../../shared/avatar';

// 0 = sem limite (mat-select trata null como "limpar seleção")
const WRITING_OPTIONS = [30, 60, 90, 120, 180, 300, 0];
const VOTING_OPTIONS = [10, 15, 20, 30, 45, 60, 0];

@Component({
  selector: 'app-lobby-phase',
  imports: [
    FormsModule, MatButtonModule, MatFormFieldModule, MatIconModule, MatInputModule, MatMenuModule,
    MatSelectModule, MatSlideToggleModule, Avatar,
  ],
  templateUrl: './lobby.phase.html',
  styleUrl: './lobby.phase.scss',
})
export class LobbyPhase {
  protected readonly store = inject(GameStore);
  private readonly clipboard = inject(Clipboard);
  private readonly snack = inject(MatSnackBar);

  protected readonly limits = LIMITS;
  protected readonly writingOptions = WRITING_OPTIONS;
  protected readonly votingOptions = VOTING_OPTIONS;

  protected readonly view = computed(() => this.store.state()!);
  protected readonly link = computed(() => `${location.origin}/sala/${this.view().code}`);
  protected readonly displayLink = computed(() => this.link().replace(/^https?:\/\//, ''));
  protected readonly qr = signal<string | null>(null);
  protected readonly showQr = signal(false);

  protected readonly questions = computed(() => this.view().questions ?? []);
  protected readonly suggestions = computed(() => QUESTION_BANK.filter((q) => !this.questions().includes(q)));
  protected readonly canAddQuestion = computed(() => this.questions().length < LIMITS.questionsMax);
  protected readonly draft = signal('');
  protected readonly adding = signal(false);

  protected readonly connectedCount = computed(() => this.view().players.filter((p) => p.connected).length);
  protected readonly missingPlayers = computed(() => Math.max(0, LIMITS.minPlayers - this.connectedCount()));
  protected readonly canStart = computed(() => this.missingPlayers() === 0 && this.view().questionCount > 0);

  protected readonly settingsSummary = computed(() => {
    const s = this.view().settings;
    const fmt = (v: number | null) => (v === null ? 'sem limite' : `${v} s`);
    return `Escrita ${fmt(s.writingSeconds)} · Voto ${fmt(s.votingSeconds)} · ${s.autoAdvanceReveal ? 'Avanço automático' : 'Avanço manual'}`;
  });

  protected readonly estimate = computed(() => {
    const v = this.view();
    const rounds = v.questionCount;
    if (!rounds) return '';
    const players = Math.max(LIMITS.minPlayers, v.players.length);
    const writing = v.settings.writingSeconds ?? 90;
    const perCard = (v.settings.votingSeconds ?? 20) + 12;
    const minutes = Math.max(1, Math.round((rounds * (writing * 0.7 + players * perCard)) / 60));
    return `${rounds} ${rounds === 1 ? 'rodada' : 'rodadas'} · cerca de ${minutes} min`;
  });

  constructor() {
    effect(() => {
      QRCode.toDataURL(this.link(), { margin: 1, width: 320, color: { dark: '#1C1530', light: '#FFFFFF' } })
        .then((url) => this.qr.set(url))
        .catch(() => this.qr.set(null));
    });
  }

  protected copyLink() {
    this.clipboard.copy(this.link());
    this.snack.open('Link copiado! Mande no chat da chamada.', undefined, { duration: 2500 });
  }

  protected async addQuestion(text: string) {
    const q = text.trim().replace(/\s+/g, ' ');
    if (q.length < LIMITS.questionMin || !this.canAddQuestion() || this.questions().includes(q)) return;
    if (await this.store.setQuestions([...this.questions(), q])) {
      this.draft.set('');
      this.adding.set(false);
    }
  }

  protected randomQuestion() {
    const pool = this.suggestions();
    if (pool.length) this.addQuestion(pool[Math.floor(Math.random() * pool.length)]);
  }

  protected removeQuestion(index: number) {
    this.store.setQuestions(this.questions().filter((_, i) => i !== index));
  }

  protected setSetting<K extends keyof Settings>(key: K, value: Settings[K]) {
    this.store.setSettings({ [key]: value });
  }

  protected optionLabel(value: number) {
    return value === 0 ? 'Sem limite' : value >= 60 && value % 60 === 0 ? `${value / 60} min` : `${value} s`;
  }
}
