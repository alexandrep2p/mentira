import { Component, computed, inject, input } from '@angular/core';
import { GameStore } from '../core/game.store';

/** Barra fina + tempo restante da fase atual. Some quando não há limite. */
@Component({
  selector: 'app-countdown',
  template: `
    @if (left() !== null) {
      <div class="track" role="progressbar" aria-label="Tempo restante" [attr.aria-valuenow]="seconds()" aria-valuemin="0">
        <div class="fill" [style.width.%]="percent()" [class.urgent]="seconds() <= 5"></div>
      </div>
      @if (showLabel()) {
        <span class="label" [class.urgent]="seconds() <= 5">{{ label() }}</span>
      }
    }
  `,
  styles: `
    :host { display: flex; align-items: center; gap: 10px; }
    :host(:empty) { display: none; }
    .track { flex: 1; height: var(--track-h, 8px); border-radius: 4px; background: var(--line); overflow: hidden; }
    .fill { height: 100%; border-radius: 4px; background: var(--primary); transition: width 250ms linear; }
    .fill.urgent { background: var(--mentira); }
    .label { font-size: 13px; font-weight: 700; color: var(--primary); min-width: 34px; text-align: right; font-variant-numeric: tabular-nums; }
    .label.urgent { color: var(--mentira-ink); }
  `,
})
export class Countdown {
  private readonly store = inject(GameStore);
  readonly showLabel = input(true);

  protected readonly left = this.store.timeLeft;
  protected readonly seconds = computed(() => Math.ceil((this.left() ?? 0) / 1000));
  protected readonly percent = computed(() => {
    const total = this.store.phaseDuration();
    const left = this.left();
    return total && left !== null ? Math.min(100, (left / total) * 100) : 0;
  });
  protected readonly label = computed(() => {
    const s = this.seconds();
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  });
}
