import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { GameStore } from './core/game.store';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  template: `<router-outlet />`,
})
export class App {
  // Instancia o store cedo para reconectar a sessão salva assim que o socket conectar.
  private readonly store = inject(GameStore);
}
