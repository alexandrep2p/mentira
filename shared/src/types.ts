export type Phase = 'lobby' | 'writing' | 'voting' | 'reveal' | 'roundScore' | 'final';

export interface Settings {
  /** Segundos para escrever; null = sem limite. */
  writingSeconds: number | null;
  /** Segundos para votar em cada card; null = sem limite. */
  votingSeconds: number | null;
  autoAdvanceReveal: boolean;
  /** Modo anônimo: ninguém vê quem escreveu cada card, nem na revelação. */
  anonymous: boolean;
}

export interface Answer {
  text: string;
  isTruth: boolean;
}

export interface CardVote {
  voterId: string;
  votedTruth: boolean;
  correct: boolean;
}

export interface CardResult {
  /** null na revelação do modo anônimo, exceto para o próprio autor. */
  authorId: string | null;
  text: string;
  isTruth: boolean;
  votes: CardVote[];
  points: { playerId: string; delta: number }[];
}

export interface PlayerView {
  id: string;
  nickname: string;
  avatar: string;
  color: number;
  connected: boolean;
  score: number;
  isHost: boolean;
  isActive: boolean;
}

export type TitleKey = 'liar' | 'disbelieved' | 'detector' | 'openBook';

export interface FinalTitle {
  key: TitleKey;
  title: string;
  playerIds: string[];
  value: number;
}

export interface RoomView {
  code: string;
  me: { id: string; isHost: boolean; isActive: boolean };
  hostId: string;
  phase: Phase;
  players: PlayerView[];
  /** Só o host recebe a lista de perguntas. */
  questions: string[] | null;
  questionCount: number;
  settings: Settings;
  roundIndex: number;
  deadline: number | null;
  serverNow: number;

  writing?: {
    question: string;
    submittedIds: string[];
    myAnswer: Answer | null;
  };
  voting?: {
    question: string;
    cardNumber: number;
    cardTotal: number;
    /** No modo anônimo, só o próprio autor recebe o id; os outros recebem null. */
    authorId: string | null;
    text: string;
    /** No modo anônimo, só contém o próprio jogador (para não revelar o autor por exclusão). */
    votedIds: string[];
    eligibleIds: string[];
    votedCount: number;
    eligibleCount: number;
    myVote: boolean | null;
    /** A própria marcação, só para o autor do card. */
    myAnswerIsTruth: boolean | null;
  };
  reveal?: {
    question: string;
    cardNumber: number;
    cardTotal: number;
    /** No modo anônimo, votes e points só trazem o próprio jogador (quem não votou seria o autor). */
    result: CardResult;
    correctCount: number;
    fooledCount: number;
  };
  roundScore?: {
    question: string;
    deltas: Record<string, number>;
    isLastRound: boolean;
    nextQuestion: string | null;
    topFooler: { playerId: string; fooled: number } | null;
  };
  final?: {
    ranking: { playerId: string; score: number }[];
    titles: FinalTitle[];
  };
}

export interface Session {
  code: string;
  playerId: string;
  token: string;
}

export type ErrorCode =
  | 'ROOM_NOT_FOUND'
  | 'NICKNAME_TAKEN'
  | 'INVALID_NICKNAME'
  | 'INVALID_AVATAR'
  | 'INVALID_TOKEN'
  | 'NOT_IN_ROOM'
  | 'NOT_HOST'
  | 'WRONG_PHASE'
  | 'NOT_ENOUGH_PLAYERS'
  | 'NO_QUESTIONS'
  | 'INVALID_QUESTIONS'
  | 'INVALID_ANSWER'
  | 'NOT_ELIGIBLE'
  | 'INVALID_SETTINGS'
  | 'INVALID_PLAYER';

export type Ack<T = {}> = ({ ok: true } & T) | { ok: false; error: ErrorCode };
export type AckFn<T = {}> = (res: Ack<T>) => void;

export interface ClientToServerEvents {
  /** `bots`: modo treino oculto (`?bots=N` na URL), cria a sala já com N bots. */
  'room:create': (p: { nickname: string; avatar?: string; bots?: number }, ack: AckFn<Session>) => void;
  'room:join': (p: { code: string; nickname: string; avatar?: string }, ack: AckFn<Session>) => void;
  'room:resume': (p: { code: string; token: string }, ack: AckFn<Session>) => void;
  'room:leave': (p: {}, ack: AckFn) => void;
  'host:setQuestions': (p: { questions: string[] }, ack: AckFn) => void;
  'host:setSettings': (p: Partial<Settings>, ack: AckFn) => void;
  'host:kick': (p: { playerId: string }, ack: AckFn) => void;
  'host:start': (p: {}, ack: AckFn) => void;
  'host:advance': (p: {}, ack: AckFn) => void;
  'host:skipCard': (p: {}, ack: AckFn) => void;
  'host:end': (p: {}, ack: AckFn) => void;
  'host:playAgain': (p: {}, ack: AckFn) => void;
  'answer:submit': (p: Answer, ack: AckFn) => void;
  'vote:cast': (p: { votedTruth: boolean }, ack: AckFn) => void;
}

export interface ServerToClientEvents {
  'room:state': (view: RoomView) => void;
  'room:kicked': () => void;
}

export type ClientEvent = keyof ClientToServerEvents;
