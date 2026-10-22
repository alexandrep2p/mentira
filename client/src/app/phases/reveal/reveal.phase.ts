import { Component, computed, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { GameStore } from '../../core/game.store';
import { Avatar } from '../../shared/avatar';
import { Countdown } from '../../shared/countdown';

@Component({
  selector: 'app-reveal-phase',
  imports: [MatButtonModule, MatIconModule, Avatar, Countdown],
  templateUrl: './reveal.phase.html',
  styleUrl: './reveal.phase.scss',
})
export class RevealPhase {
  protected readonly store = inject(GameStore);

  protected readonly view = computed(() => this.store.state()!);
  protected readonly reveal = computed(() => this.view().reveal!);
  protected readonly result = computed(() => this.reveal().result);
  protected readonly author = computed(() => this.store.player(this.result().authorId));
  protected readonly isLastCard = computed(() => this.reveal().cardNumber === this.reveal().cardTotal);

  protected readonly correct = computed(() =>
    this.result().votes.filter((v) => v.correct).map((v) => this.store.player(v.voterId)).filter((p) => p !== null),
  );
  protected readonly fooled = computed(() =>
    this.result().votes.filter((v) => !v.correct).map((v) => this.store.player(v.voterId)).filter((p) => p !== null),
  );

  /** Faixa com o resultado pessoal de quem está vendo. */
  protected readonly mine = computed(() => {
    const me = this.view().me.id;
    const r = this.result();
    const delta = r.points.find((p) => p.playerId === me)?.delta ?? 0;
    if (r.authorId === me) {
      const n = this.fooled().length;
      return n > 0
        ? { tone: 'good', icon: 'theater_comedy', text: `Você enganou ${n} ${n === 1 ? 'pessoa' : 'pessoas'}!`, delta }
        : { tone: 'meh', icon: 'sentiment_neutral', text: 'Ninguém caiu na sua.', delta };
    }
    const vote = r.votes.find((v) => v.voterId === me);
    if (!vote) return { tone: 'meh', icon: 'schedule', text: 'Você não votou neste card.', delta };
    if (vote.correct) {
      return { tone: 'good', icon: 'check_circle', text: r.isTruth ? 'Você acreditou e acertou!' : 'Você não caiu nessa!', delta };
    }
    return { tone: 'bad', icon: 'sentiment_dissatisfied', text: r.isTruth ? 'Era verdade! Você duvidou.' : 'Você caiu nessa.', delta };
  });
}
