import { Component, computed, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { GameStore } from '../../core/game.store';
import { Avatar } from '../../shared/avatar';

@Component({
  selector: 'app-round-score-phase',
  imports: [MatButtonModule, MatIconModule, Avatar],
  templateUrl: './round-score.phase.html',
  styleUrl: './round-score.phase.scss',
})
export class RoundScorePhase {
  protected readonly store = inject(GameStore);

  protected readonly view = computed(() => this.store.state()!);
  protected readonly info = computed(() => this.view().roundScore!);
  protected readonly topFooler = computed(() => {
    const top = this.info().topFooler;
    return top ? { player: this.store.player(top.playerId), fooled: top.fooled } : null;
  });

  protected readonly rows = computed(() => {
    const v = this.view();
    const deltas = this.info().deltas;
    const max = Math.max(1, ...v.players.map((p) => p.score));
    return [...v.players]
      .sort((a, b) => b.score - a.score)
      .map((p, i) => {
        const delta = deltas[p.id] ?? 0;
        return {
          player: p,
          pos: i + 1,
          me: p.id === v.me.id,
          delta,
          base: ((p.score - delta) / max) * 100,
          gain: (delta / max) * 100,
        };
      });
  });
}
