import { Component, input, model } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

/** Escolha Verdade/Mentira da própria resposta. */
@Component({
  selector: 'app-truth-toggle',
  imports: [MatIconModule],
  template: `
    <fieldset [disabled]="disabled()">
      <legend>Isso é… <span>(só você vê)</span></legend>
      <div class="options">
        <button type="button" class="opt verdade" [attr.aria-pressed]="value() === true" (click)="value.set(true)">
          <mat-icon>check</mat-icon>Verdade
        </button>
        <button type="button" class="opt mentira" [attr.aria-pressed]="value() === false" (click)="value.set(false)">
          <mat-icon>close</mat-icon>Mentira
        </button>
      </div>
    </fieldset>
  `,
  styles: `
    fieldset { margin: 0; padding: 0; border: 0; min-width: 0; }
    legend { padding: 0; margin-bottom: 10px; font-size: 13px; font-weight: 600; color: var(--ink-2); }
    legend span { font-weight: 400; color: var(--muted); }
    .options { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
    .opt {
      height: var(--toggle-h, 64px); border: 2px solid var(--line-strong); border-radius: 18px; background: var(--surface);
      font: 700 17px var(--font-body); display: flex; align-items: center; justify-content: center; gap: 8px;
      cursor: pointer; transition: background 120ms, border-color 120ms, color 120ms;
    }
    .opt:focus-visible { outline: 3px solid var(--primary); outline-offset: 2px; }
    .opt:disabled { cursor: default; opacity: 0.7; }
    .verdade { color: light-dark(var(--verdade), #3ecfae); }
    .mentira { color: var(--mentira-ink); }
    .verdade[aria-pressed='true'] { background: var(--verdade); border-color: var(--verdade); color: #fff; }
    .mentira[aria-pressed='true'] { background: var(--mentira); border-color: var(--mentira); color: #fff; }
  `,
})
export class TruthToggle {
  readonly value = model<boolean | null>(null);
  readonly disabled = input(false);
}
