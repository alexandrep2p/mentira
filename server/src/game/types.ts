import type { Answer, CardResult, ErrorCode } from '@mentira/shared';

export interface PlayerStats {
  correctVotes: number;
  fooledWithLies: number;
  truthsDisbelieved: number;
  truthsWritten: number;
}

export interface Player {
  id: string;
  token: string;
  nickname: string;
  avatar: string;
  color: number;
  connected: boolean;
  /** Jogador controlado pelo servidor (modo treino `?bots=N`). Não vai para o RoomView. */
  isBot: boolean;
  joinedAt: number;
  /** Primeira rodada (0-based) em que o jogador participa. */
  activeFromRound: number;
  score: number;
  stats: PlayerStats;
}

export interface Round {
  index: number;
  question: string;
  answers: Map<string, Answer>;
  /** Quem pulou a pergunta (modo clássico): não tem card, mas não trava a escrita. */
  skipped: Set<string>;
  cardOrder: string[];
  cardIndex: number;
  votes: Map<string, boolean>;
  /** Pergunta de cada jogador (2 mentiras, 1 verdade). */
  assigned: Map<string, string>;
  triples: Map<string, TripleCard>;
  /** Frase escolhida por votante (2 mentiras, 1 verdade). */
  picks: Map<string, number>;
  cardResults: ScoredCard[];
  deltas: Map<string, number>;
}

/** As frases já embaralhadas; truthIndex é a posição da verdade. */
export interface TripleCard {
  statements: string[];
  truthIndex: number;
}

/** Resultado interno: o servidor sempre sabe o autor; o RoomView pode escondê-lo. */
export type ScoredCard = CardResult & { authorId: string };

export type Result<T = {}> = ({ ok: true } & T) | { ok: false; error: ErrorCode };

export const ok = <T extends object>(value: T = {} as T): Result<T> => ({ ok: true, ...value });
export const fail = (error: ErrorCode): { ok: false; error: ErrorCode } => ({ ok: false, error });

export const emptyStats = (): PlayerStats => ({
  correctVotes: 0,
  fooledWithLies: 0,
  truthsDisbelieved: 0,
  truthsWritten: 0,
});
