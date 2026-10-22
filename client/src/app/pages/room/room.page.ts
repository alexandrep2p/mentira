import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Title } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { LIMITS } from '@mentira/shared';
import { GameStore } from '../../core/game.store';
import { Countdown } from '../../shared/countdown';
import { AvatarPicker, rememberedAvatar } from '../../shared/avatar-picker';
import { Logo } from '../../shared/logo';
import { PlayerSidebar } from '../../shared/player-sidebar';
import { TopBar } from '../../shared/top-bar';
import { FinalPhase } from '../../phases/final/final.phase';
import { LobbyPhase } from '../../phases/lobby/lobby.phase';
import { RevealPhase } from '../../phases/reveal/reveal.phase';
import { RoundScorePhase } from '../../phases/round-score/round-score.phase';
import { VotingPhase } from '../../phases/voting/voting.phase';
import { WritingPhase } from '../../phases/writing/writing.phase';

@Component({
  selector: 'app-room',
  imports: [
    FormsModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatProgressSpinnerModule, RouterLink,
    AvatarPicker, Countdown, Logo, PlayerSidebar, TopBar,
    LobbyPhase, WritingPhase, VotingPhase, RevealPhase, RoundScorePhase, FinalPhase,
  ],
  templateUrl: './room.page.html',
  styleUrl: './room.page.scss',
  host: { '[class.night]': 'night()' },
})
export class RoomPage {
  protected readonly store = inject(GameStore);
  private readonly title = inject(Title);
  protected readonly limits = LIMITS;

  /** Vem da rota /sala/:code. */
  readonly code = input.required<string>();

  protected readonly normalizedCode = computed(() => this.code().toUpperCase());
  protected readonly view = computed(() => {
    const s = this.store.state();
    return s && s.code === this.normalizedCode() ? s : null;
  });
  protected readonly phase = computed(() => this.view()?.phase ?? null);
  protected readonly withSidebar = computed(() => ['writing', 'voting', 'reveal'].includes(this.phase() ?? ''));
  protected readonly timed = computed(() => ['writing', 'voting'].includes(this.phase() ?? ''));
  protected readonly night = computed(() => {
    const v = this.view();
    return v?.phase === 'final' || (v?.phase === 'voting' && v.voting?.authorId === v.me.id);
  });
  protected readonly waitingResume = computed(
    () => !this.view() && this.store.resuming() && this.store.savedSession()?.code === this.normalizedCode(),
  );

  protected readonly nickname = signal(localStorage.getItem('mentira:nickname') ?? '');
  protected readonly avatar = signal(rememberedAvatar());

  constructor() {
    effect(() => this.title.setTitle(this.view() ? `Mentira! · Sala ${this.view()!.code}` : 'Mentira!'));
  }

  protected join() {
    const name = this.nickname().trim();
    if (!name) return;
    localStorage.setItem('mentira:nickname', name);
    this.store.joinRoom(this.normalizedCode(), name, this.avatar());
  }
}
