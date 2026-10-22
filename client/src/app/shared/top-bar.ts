import { Clipboard } from '@angular/cdk/clipboard';
import { Component, computed, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatSnackBar } from '@angular/material/snack-bar';
import { GameStore } from '../core/game.store';
import { Avatar } from './avatar';
import { Logo } from './logo';

@Component({
  selector: 'app-top-bar',
  imports: [MatButtonModule, MatIconModule, MatMenuModule, MatDividerModule, Avatar, Logo],
  template: `
    <app-logo class="logo" />
    <span class="code" aria-label="Código da sala">{{ view()?.code }}</span>
    <span class="status">
      <span>{{ roundLabel() }}</span>
      @if (cardLabel()) {
        <span class="card-label"> · {{ cardLabel() }}</span>
      }
    </span>
    @if (store.isHost()) {
      <span class="host-chip">{{ view()?.phase === 'lobby' ? 'Você é o host' : 'Host' }}</span>
    }
    <span class="me">
      <span class="me-name">{{ store.me()?.nickname }} · </span>{{ store.me()?.score ?? 0 }} pts
      <app-avatar [player]="store.me()" [size]="36" />
    </span>
    <button matIconButton [matMenuTriggerFor]="menu" aria-label="Menu da sala">
      <mat-icon>more_vert</mat-icon>
    </button>

    <mat-menu #menu="matMenu" xPosition="before">
      @if (store.isHost()) {
        @if (advanceLabel(); as label) {
          <button mat-menu-item (click)="store.advance()"><mat-icon>skip_next</mat-icon>{{ label }}</button>
        }
        @if (view()?.phase === 'voting' || view()?.phase === 'reveal') {
          <button mat-menu-item (click)="store.skipCard()"><mat-icon>redo</mat-icon>Pular card</button>
        }
        @if (inGame()) {
          <button mat-menu-item (click)="store.end()"><mat-icon>flag</mat-icon>Encerrar jogo</button>
        }
        @if (advanceLabel() || inGame()) {
          <mat-divider />
        }
      }
      <button mat-menu-item (click)="copyLink()"><mat-icon>link</mat-icon>Copiar link da sala</button>
      <button mat-menu-item (click)="store.leave()"><mat-icon>logout</mat-icon>Sair da sala</button>
    </mat-menu>
  `,
  styles: `
    :host {
      min-height: 64px;
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 0 4px 0 16px;
    }
    .logo { display: none; --logo-size: 26px; }
    .code {
      height: 32px; padding: 0 12px; border-radius: 10px; background: var(--surface);
      font-weight: 700; font-size: 14px; letter-spacing: 3px; display: flex; align-items: center;
    }
    .status { flex: 1; text-align: center; font-size: 14px; font-weight: 600; color: var(--ink-2); }
    .card-label, .me-name { display: none; }
    .host-chip {
      display: none; height: 28px; padding: 0 12px; border-radius: 14px;
      background: var(--primary-container); color: var(--on-primary-container);
      font-size: 13px; font-weight: 600; align-items: center;
    }
    .me { display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 700; white-space: nowrap; }
    @media (min-width: 960px) {
      :host { min-height: 72px; padding: 0 20px 0 32px; gap: 16px; }
      .logo { display: inline-flex; }
      .status { font-size: 15px; }
      .card-label, .me-name { display: inline; }
      .host-chip { display: flex; }
      .me { font-size: 15px; }
    }
  `,
})
export class TopBar {
  protected readonly store = inject(GameStore);
  private readonly clipboard = inject(Clipboard);
  private readonly snack = inject(MatSnackBar);

  protected readonly view = this.store.state;
  protected readonly inGame = computed(() => !['lobby', 'final'].includes(this.view()?.phase ?? 'lobby'));

  protected readonly roundLabel = computed(() => {
    const v = this.view();
    if (!v || v.phase === 'lobby') return 'Sala de espera';
    if (v.phase === 'final') return 'Fim de jogo';
    return `Rodada ${v.roundIndex + 1} de ${v.questionCount}`;
  });

  protected readonly cardLabel = computed(() => {
    const v = this.view();
    const card = v?.voting ?? v?.reveal;
    return card ? `Card ${card.cardNumber} de ${card.cardTotal}` : '';
  });

  protected readonly advanceLabel = computed(() => {
    switch (this.view()?.phase) {
      case 'writing': return 'Encerrar escrita';
      case 'voting': return 'Revelar agora';
      case 'reveal': return 'Próximo card';
      case 'roundScore': return this.view()?.roundScore?.isLastRound ? 'Ver resultado final' : 'Próxima rodada';
      default: return null;
    }
  });

  protected copyLink() {
    this.clipboard.copy(`${location.origin}/sala/${this.view()?.code}`);
    this.snack.open('Link copiado!', undefined, { duration: 2000 });
  }
}
