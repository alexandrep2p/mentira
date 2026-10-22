import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { LIMITS } from '@mentira/shared';
import { GameStore } from '../../core/game.store';
import { Avatar } from '../../shared/avatar';
import { TruthToggle } from '../../shared/truth-toggle';

@Component({
  selector: 'app-writing-phase',
  imports: [FormsModule, MatButtonModule, MatFormFieldModule, MatIconModule, MatInputModule, Avatar, TruthToggle],
  templateUrl: './writing.phase.html',
  styleUrl: './writing.phase.scss',
})
export class WritingPhase {
  protected readonly store = inject(GameStore);
  protected readonly limits = LIMITS;

  protected readonly view = computed(() => this.store.state()!);
  protected readonly writing = computed(() => this.view().writing!);
  protected readonly isActive = computed(() => this.view().me.isActive);

  protected readonly text = signal('');
  protected readonly isTruth = signal<boolean | null>(null);
  protected readonly editing = signal(true);

  protected readonly submitted = computed(() => this.writing().myAnswer !== null && !this.editing());
  protected readonly canSend = computed(() => this.text().trim().length > 0 && this.isTruth() !== null && !this.store.busy());

  protected readonly submittedPlayers = computed(() =>
    this.writing().submittedIds.map((id) => this.store.player(id)).filter((p) => p !== null),
  );
  protected readonly activeCount = computed(() => this.view().players.filter((p) => p.isActive).length);

  constructor() {
    // Ao voltar para a página (reconexão), recupera a resposta já enviada.
    effect(() => {
      const mine = this.writing().myAnswer;
      untracked(() => {
        if (mine && this.editing() && !this.text()) {
          this.text.set(mine.text);
          this.isTruth.set(mine.isTruth);
          this.editing.set(false);
        }
      });
    });
  }

  protected async send() {
    if (!this.canSend()) return;
    if (await this.store.submitAnswer(this.text().trim(), this.isTruth()!)) this.editing.set(false);
  }
}
