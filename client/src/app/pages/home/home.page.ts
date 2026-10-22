import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { LIMITS, ROOM_CODE_LENGTH } from '@mentira/shared';
import { GameStore } from '../../core/game.store';
import { AvatarPicker, rememberedAvatar } from '../../shared/avatar-picker';
import { Logo } from '../../shared/logo';

@Component({
  selector: 'app-home',
  imports: [FormsModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatIconModule, Logo, AvatarPicker],
  templateUrl: './home.page.html',
  styleUrl: './home.page.scss',
})
export class HomePage {
  protected readonly store = inject(GameStore);
  protected readonly limits = LIMITS;
  protected readonly codeLength = ROOM_CODE_LENGTH;

  protected readonly nickname = signal(localStorage.getItem('mentira:nickname') ?? '');
  protected readonly code = signal('');
  protected readonly avatar = signal(rememberedAvatar());
  protected readonly nicknameError = signal(false);
  /** Modo treino oculto: `/?bots=3` cria a sala já com 3 bots. */
  private readonly bots = Math.max(0, Math.floor(Number(new URLSearchParams(location.search).get('bots')) || 0));

  private validNickname() {
    const name = this.nickname().trim();
    this.nicknameError.set(!name);
    if (name) localStorage.setItem('mentira:nickname', name);
    return name;
  }

  protected onCode(value: string) {
    this.code.set(value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, ROOM_CODE_LENGTH));
  }

  protected join() {
    const name = this.validNickname();
    if (name && this.code().length === ROOM_CODE_LENGTH) this.store.joinRoom(this.code(), name, this.avatar());
  }

  protected create() {
    const name = this.validNickname();
    if (name) this.store.createRoom(name, this.avatar(), this.bots);
  }
}
