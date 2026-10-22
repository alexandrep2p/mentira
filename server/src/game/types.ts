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
  cardOrder: string[];
  cardIndex: number;
  votes: Map<string, boolean>;
  cardResults: CardResult[];
  deltas: Map<string, number>;
}

export type Result<T = {}> = ({ ok: true } & T) | { ok: false; error: ErrorCode };

export const ok = <T extends object>(value: T = {} as T): Result<T> => ({ ok: true, ...value });
export const fail = (error: ErrorCode): { ok: false; error: ErrorCode } => ({ ok: false, error });

export const emptyStats = (): PlayerStats => ({
  correctVotes: 0,
  fooledWithLies: 0,
  truthsDisbelieved: 0,
  truthsWritten: 0,
});
