import { Injectable } from '@angular/core';
import { SESSION_STORAGE_KEY, type Session } from '@mentira/shared';

const read = (storage: () => Storage): Session | null => {
  try {
    const raw = storage().getItem(SESSION_STORAGE_KEY);
    const value = raw ? JSON.parse(raw) : null;
    return value?.code && value?.token ? value : null;
  } catch {
    return null;
  }
};

/**
 * Guarda a sessão para reconectar após recarregar a página ou cair a rede.
 * A sessão da aba fica no sessionStorage (cada aba é um jogador); uma cópia
 * no localStorage permite voltar à sala ao reabrir o link em outra aba.
 */
@Injectable({ providedIn: 'root' })
export class SessionStorage {
  /** Sessão desta aba. */
  get(): Session | null {
    return read(() => sessionStorage);
  }

  /** Última sessão usada neste navegador, em qualquer aba. */
  remembered(): Session | null {
    return read(() => localStorage);
  }

  set(session: Session) {
    try {
      sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    } catch {
      // Sem storage (aba privada): o jogo funciona, só não reconecta.
    }
  }

  clear() {
    const mine = this.get();
    try {
      sessionStorage.removeItem(SESSION_STORAGE_KEY);
      // Só apaga a cópia lembrada se ela for desta aba.
      if (!mine || this.remembered()?.token === mine.token) localStorage.removeItem(SESSION_STORAGE_KEY);
    } catch {}
  }
}
