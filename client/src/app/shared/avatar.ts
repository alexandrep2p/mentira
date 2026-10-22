import { Component, computed, input } from '@angular/core';
import { PLAYER_COLORS, type PlayerView } from '@mentira/shared';

@Component({
  selector: 'app-avatar',
  template: `{{ face() }}`,
  host: {
    'aria-hidden': 'true',
    '[style.width.px]': 'size()',
    '[style.height.px]': 'size()',
    '[style.font-size.px]': 'size() * (player()?.avatar ? 0.6 : 0.42)',
    '[style.background]': 'colors().bg',
    '[style.color]': 'colors().fg',
    '[class.offline]': 'player() && !player()!.connected',
  },
  styles: `
    :host {
      flex-shrink: 0;
      border-radius: 50%;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      line-height: 1;
      user-select: none;
      font-family: 'Apple Color Emoji', 'Segoe UI Emoji', 'Noto Color Emoji', var(--font-body);
    }
    :host(.offline) {
      opacity: 0.45;
    }
  `,
})
export class Avatar {
  readonly player = input<PlayerView | null>(null);
  readonly size = input(36);

  protected readonly face = computed(
    () => this.player()?.avatar || (this.player()?.nickname.charAt(0).toLocaleUpperCase('pt-BR') ?? '?'),
  );
  protected readonly colors = computed(() => PLAYER_COLORS[(this.player()?.color ?? 0) % PLAYER_COLORS.length]);
}
