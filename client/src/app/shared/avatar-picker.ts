import { Component, model, signal } from '@angular/core';
import { AVATAR_EMOJIS } from '@mentira/shared';

const STORAGE_KEY = 'mentira:avatar';

/** Avatar salvo neste navegador ou, na primeira vez, um sorteado da lista. */
export function rememberedAvatar(): string {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && AVATAR_EMOJIS.includes(saved)) return saved;
  } catch {}
  return AVATAR_EMOJIS[Math.floor(Math.random() * AVATAR_EMOJIS.length)];
}

export function rememberAvatar(avatar: string) {
  try {
    localStorage.setItem(STORAGE_KEY, avatar);
  } catch {}
}

/**
 * Botão com o avatar atual ao lado do campo projetado (o apelido); ao tocar,
 * abre a grade com os emojis permitidos.
 */
@Component({
  selector: 'app-avatar-picker',
  template: `
    <div class="row">
      <button type="button" class="current" (click)="open.set(!open())"
              [attr.aria-expanded]="open()" aria-controls="avatar-grid" aria-label="Escolher avatar, atual {{ value() }}">
        <span class="emoji">{{ value() }}</span>
        <span class="edit" aria-hidden="true">✎</span>
      </button>
      <div class="field"><ng-content /></div>
    </div>
    @if (open()) {
      <div id="avatar-grid" class="grid" role="radiogroup" aria-label="Avatares">
        @for (emoji of emojis; track emoji) {
          <button type="button" role="radio" class="option" [attr.aria-checked]="emoji === value()"
                  [attr.aria-label]="emoji" (click)="choose(emoji)">
            <span class="emoji">{{ emoji }}</span>
          </button>
        }
      </div>
    }
  `,
  styles: `
    :host { display: flex; flex-direction: column; gap: 8px; }
    .row { display: flex; align-items: flex-start; gap: 12px; }
    .field { flex: 1; min-width: 0; display: flex; flex-direction: column; }
    .emoji { font-family: 'Apple Color Emoji', 'Segoe UI Emoji', 'Noto Color Emoji', sans-serif; line-height: 1; }
    .current {
      position: relative; flex-shrink: 0; width: 56px; height: 56px; border-radius: 50%;
      border: 2px solid var(--line-strong); background: var(--surface-2); cursor: pointer;
      display: flex; align-items: center; justify-content: center; font-size: 32px; padding: 0;
    }
    .current[aria-expanded='true'] { border-color: var(--primary); }
    .current:focus-visible, .option:focus-visible { outline: 3px solid var(--primary); outline-offset: 2px; }
    .edit {
      position: absolute; right: -4px; bottom: -4px; width: 22px; height: 22px; border-radius: 50%;
      background: var(--primary); color: var(--on-primary); font-size: 12px;
      display: flex; align-items: center; justify-content: center;
    }
    .grid {
      display: grid; grid-template-columns: repeat(auto-fill, minmax(48px, 1fr)); gap: 6px;
      padding: 10px; border-radius: 18px; background: var(--surface-2); margin-bottom: 12px;
    }
    .option {
      height: 48px; border: 2px solid transparent; border-radius: 14px; background: transparent;
      font-size: 28px; cursor: pointer; display: flex; align-items: center; justify-content: center; padding: 0;
      transition: transform 100ms, background 100ms;
    }
    .option:hover { background: var(--surface); }
    .option:active { transform: scale(0.92); }
    .option[aria-checked='true'] { border-color: var(--primary); background: var(--surface); }
  `,
})
export class AvatarPicker {
  readonly value = model<string>(rememberedAvatar());
  protected readonly emojis = AVATAR_EMOJIS;
  protected readonly open = signal(false);

  protected choose(emoji: string) {
    this.value.set(emoji);
    rememberAvatar(emoji);
    this.open.set(false);
  }
}
