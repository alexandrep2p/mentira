import { Component, input } from '@angular/core';

@Component({
  selector: 'app-logo',
  template: `
    @if (mark()) {
      <span class="mark" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z" />
          <path d="M10.5 9.5a1.8 1.8 0 1 1 2.4 1.7c-.6.2-.9.7-.9 1.3v.5" />
          <path d="M12 15.6h.01" />
        </svg>
      </span>
    }
    <span class="word">Mentira!</span>
  `,
  styles: `
    :host { display: inline-flex; flex-direction: column; align-items: inherit; gap: 16px; color: var(--logo-color, var(--primary)); }
    .mark {
      width: var(--mark-size, 88px); height: var(--mark-size, 88px); border-radius: 30%;
      background: #5b2bd9; display: flex; align-items: center; justify-content: center; transform: rotate(-6deg);
    }
    .mark svg { width: 58%; height: 58%; }
    .word { font-family: var(--font-display); font-weight: 800; font-size: var(--logo-size, 22px); line-height: 1; letter-spacing: -0.03em; }
  `,
})
export class Logo {
  readonly mark = input(false);
}
