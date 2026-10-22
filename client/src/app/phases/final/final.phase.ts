import { Component, afterNextRender, computed, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import type { TitleKey } from '@mentira/shared';
import confetti from 'canvas-confetti';
import { GameStore } from '../../core/game.store';
import { Avatar } from '../../shared/avatar';

const TITLE_STYLE: Record<TitleKey, { color: string; detail: (n: number) => string }> = {
  liar: { color: '#FF8A65', detail: (n) => `enganou ${n} ${n === 1 ? 'pessoa' : 'pessoas'}` },
  detector: { color: '#3ECFAE', detail: (n) => `${n} ${n === 1 ? 'voto certo' : 'votos certos'}` },
  disbelieved: { color: '#FFC94D', detail: (n) => (n === 1 ? '1 pessoa duvidou da verdade' : `${n} duvidaram da verdade`) },
  openBook: { color: '#C9B8FF', detail: (n) => `${n} ${n === 1 ? 'verdade' : 'verdades'}` },
};

@Component({
  selector: 'app-final-phase',
  imports: [MatButtonModule, MatIconModule, Avatar],
  templateUrl: './final.phase.html',
  styleUrl: './final.phase.scss',
})
export class FinalPhase {
  protected readonly store = inject(GameStore);

  protected readonly final = computed(() => this.store.state()!.final!);
  protected readonly ranking = computed(() =>
    this.final().ranking.map((r, i) => ({ ...r, pos: i + 1, player: this.store.player(r.playerId) })),
  );
  /** Ordem visual do pódio: 2º, 1º, 3º. */
  protected readonly podium = computed(() => {
    const [first, second, third] = this.ranking();
    return [second, first, third].filter((x) => x !== undefined);
  });
  protected readonly rest = computed(() => this.ranking().slice(3));
  protected readonly winner = computed(() => this.ranking().at(0));
  protected readonly tie = computed(() => {
    const [a, b] = this.ranking();
    return !!a && !!b && a.score === b.score;
  });

  protected readonly titles = computed(() =>
    this.final().titles.map((t) => ({
      ...t,
      color: TITLE_STYLE[t.key].color,
      detail: TITLE_STYLE[t.key].detail(t.value),
      who: t.playerIds.map((id) => this.store.player(id)?.nickname ?? '?').join(' e '),
    })),
  );

  constructor() {
    afterNextRender(() => {
      if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      const colors = ['#FFC94D', '#3ECFAE', '#FF8A65', '#C9B8FF', '#5B2BD9'];
      confetti({ particleCount: 140, spread: 90, origin: { y: 0.35 }, colors });
      setTimeout(() => confetti({ particleCount: 80, angle: 60, spread: 70, origin: { x: 0, y: 0.6 }, colors }), 400);
      setTimeout(() => confetti({ particleCount: 80, angle: 120, spread: 70, origin: { x: 1, y: 0.6 }, colors }), 600);
    });
  }
}
