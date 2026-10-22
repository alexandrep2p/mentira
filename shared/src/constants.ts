import type { Settings, TitleKey } from './types';

export const LIMITS = {
  minPlayers: 3,
  maxPlayers: 12,
  nicknameMax: 20,
  questionsMax: 10,
  questionMin: 3,
  questionMax: 150,
  answerMax: 200,
  writingSeconds: { min: 30, max: 300 },
  votingSeconds: { min: 10, max: 60 },
} as const;

export const DEFAULT_SETTINGS: Settings = {
  writingSeconds: 90,
  votingSeconds: 20,
  autoAdvanceReveal: false,
};

export const AUTO_ADVANCE_MS = 8_000;
export const HOST_GRACE_MS = 30_000;
export const EMPTY_ROOM_TTL_MS = 10 * 60_000;
export const SWEEP_INTERVAL_MS = 15_000;

export const ROOM_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
export const ROOM_CODE_LENGTH = 4;

export const SESSION_STORAGE_KEY = 'mentira:session';

/** Paleta dos avatares: fundo claro + inicial escura (contraste AA). */
export const PLAYER_COLORS: readonly { bg: string; fg: string }[] = [
  { bg: '#EDE4FF', fg: '#5B2BD9' },
  { bg: '#DDF1FF', fg: '#075985' },
  { bg: '#FFEFD1', fg: '#92400E' },
  { bg: '#D7F5E8', fg: '#065F46' },
  { bg: '#FFE1EF', fg: '#9D174D' },
  { bg: '#E3E6FF', fg: '#3730A3' },
  { bg: '#FFE4D6', fg: '#9A3412' },
  { bg: '#E0F7FA', fg: '#155E75' },
  { bg: '#F3E8FF', fg: '#7E22CE' },
  { bg: '#ECFCCB', fg: '#3F6212' },
  { bg: '#FEF3C7', fg: '#854D0E' },
  { bg: '#FCE7F3', fg: '#BE185D' },
];

/** Avatares disponíveis: só estes são aceitos pelo servidor. */
export const AVATAR_EMOJIS: readonly string[] = [
  '🕵️', '🕵️‍♂️', '🕵️‍♀️', '🥸', '😶‍🌫️', '😑',
  '😶', '🤐', '🤫', '🤥', '😏', '🧐',
  '🤔', '🙄', '😇', '😈', '🤡', '👻',
  '🎭', '🃏', '🦊', '🐍', '🦎', '👀',
];

export const TITLES: Record<TitleKey, string> = {
  liar: 'Mestre da Mentira',
  disbelieved: 'Ninguém acredita em mim',
  detector: 'Detector de Mentiras',
  openBook: 'Livro Aberto',
};
