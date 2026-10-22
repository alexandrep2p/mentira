import { Component, computed, inject } from '@angular/core';
import { GameStore } from '../core/game.store';
import { Avatar } from './avatar';

interface Row {
  id: string;
  name: string;
  status: string;
  tone: 'ok' | 'wait' | 'accent' | 'off';
  score: number;
  delta: number;
  me: boolean;
}

/** Coluna lateral do desktop: placar e quem já agiu na fase atual. */
@Component({
  selector: 'app-player-sidebar',
  imports: [Avatar],
  template: `
    <div class="head">
      <h2>{{ heading() }}</h2>
      <span class="muted">{{ summary() }}</span>
    </div>
    <ul>
      @for (row of rows(); track row.id) {
        <li [class.me]="row.me">
          <app-avatar [player]="store.player(row.id)" [size]="36" />
          <span class="who">
            <span class="name">{{ row.name }}</span>
            @if (row.status) {
              <span class="status" [class]="row.tone">{{ row.status }}</span>
            }
          </span>
          @if (row.delta > 0) {
            <span class="delta">+{{ row.delta }}</span>
          }
          <span class="score display">{{ row.score }}</span>
        </li>
      }
    </ul>
  `,
  styles: `
    :host {
      box-sizing: border-box; background: var(--surface); border-radius: 28px; padding: 20px;
      flex-direction: column; gap: 12px; align-self: flex-start;
    }
    .head { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; }
    h2 { font-size: 16px; font-weight: 700; }
    .head span { font-size: 13px; }
    ul { margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 4px; }
    li { min-height: 52px; display: flex; align-items: center; gap: 10px; padding: 0 8px; border-radius: 14px; }
    li.me { background: var(--surface-2); }
    .who { flex: 1; min-width: 0; display: flex; flex-direction: column; }
    .name { font-size: 15px; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .status { font-size: 12px; color: var(--muted); }
    .status.ok { color: light-dark(var(--verdade), #3ecfae); }
    .status.accent { color: var(--primary); }
    .status.off { color: var(--mentira-ink); }
    .delta {
      height: 24px; padding: 0 8px; border-radius: 12px; background: var(--verdade-container);
      color: var(--on-verdade-container); font-size: 12px; font-weight: 700; display: flex; align-items: center;
    }
    .score { min-width: 24px; text-align: right; font-size: 18px; }
  `,
})
export class PlayerSidebar {
  protected readonly store = inject(GameStore);

  protected readonly heading = computed(() => (this.store.phase() === 'reveal' ? 'Placar' : 'Jogadores'));

  protected readonly summary = computed(() => {
    const v = this.store.state();
    if (v?.writing) {
      const active = v.players.filter((p) => p.isActive).length;
      return `${v.writing.submittedIds.length} de ${active} responderam`;
    }
    if (v?.voting) return `${v.voting.votedCount} de ${v.voting.eligibleCount} votaram`;
    return '';
  });

  protected readonly rows = computed<Row[]>(() => {
    const v = this.store.state();
    if (!v) return [];
    const deltas = new Map(v.reveal?.result.points.map((p) => [p.playerId, p.delta]) ?? []);
    const rows = v.players.map((p): Row => {
      let status = '';
      let tone: Row['tone'] = 'wait';
      if (!p.connected) {
        status = 'Desconectado';
        tone = 'off';
      } else if (!p.isActive) {
        status = 'Entra na próxima rodada';
      } else if (v.writing) {
        const done = v.writing.submittedIds.includes(p.id);
        status = done ? 'Respondeu' : 'Escrevendo…';
        tone = done ? 'ok' : 'wait';
      } else if (v.voting && v.settings.anonymous) {
        // Sem status por jogador: quem não vota seria o autor.
      } else if (v.voting) {
        if (p.id === v.voting.authorId) {
          status = p.id === v.me.id ? 'Autor deste card' : 'Autor(a) deste card';
          tone = 'accent';
        } else {
          const done = v.voting.votedIds.includes(p.id);
          status = done ? 'Votou' : 'Pensando…';
          tone = done ? 'ok' : 'wait';
        }
      }
      return {
        id: p.id,
        name: p.id === v.me.id ? `${p.nickname} (você)` : p.nickname,
        status,
        tone,
        score: p.score,
        delta: deltas.get(p.id) ?? 0,
        me: p.id === v.me.id,
      };
    });
    return v.phase === 'reveal' ? rows.sort((a, b) => b.score - a.score) : rows;
  });
}
