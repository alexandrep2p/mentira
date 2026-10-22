import { Component, computed, inject } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { GameStore } from '../../core/game.store';
import { Avatar } from '../../shared/avatar';

@Component({
  selector: 'app-voting-phase',
  imports: [MatIconModule, Avatar],
  templateUrl: './voting.phase.html',
  styleUrl: './voting.phase.scss',
  host: { '(document:keydown)': 'onKey($event)' },
})
export class VotingPhase {
  protected readonly store = inject(GameStore);

  protected readonly view = computed(() => this.store.state()!);
  protected readonly voting = computed(() => this.view().voting!);
  protected readonly author = computed(() => this.store.player(this.voting().authorId));
  protected readonly isAuthor = computed(() => this.voting().authorId === this.view().me.id);
  protected readonly canVote = computed(() => this.voting().eligibleIds.includes(this.view().me.id));

  protected readonly voters = computed(() =>
    this.voting().eligibleIds.map((id) => ({ player: this.store.player(id), voted: this.voting().votedIds.includes(id) })),
  );

  protected vote(votedTruth: boolean) {
    if (this.canVote()) this.store.vote(votedTruth);
  }

  protected onKey(event: KeyboardEvent) {
    const target = event.target as HTMLElement | null;
    if (event.ctrlKey || event.metaKey || event.altKey || target?.closest('input, textarea, select, [contenteditable]')) return;
    const key = event.key.toLowerCase();
    if (key === 'v') this.vote(true);
    if (key === 'm') this.vote(false);
  }
}
