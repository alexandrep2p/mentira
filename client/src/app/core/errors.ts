import type { ErrorCode } from '@mentira/shared';

const MESSAGES: Record<ErrorCode | 'TIMEOUT', string> = {
  ROOM_NOT_FOUND: 'Sala não encontrada. Confira o código.',
  ROOM_FULL: 'Essa sala já está cheia (12 jogadores).',
  NICKNAME_TAKEN: 'Já tem alguém com esse apelido na sala.',
  INVALID_NICKNAME: 'Escolha um apelido de 1 a 20 caracteres.',
  INVALID_AVATAR: 'Escolha um dos avatares da lista.',
  INVALID_TOKEN: 'Sua sessão expirou. Entre de novo.',
  NOT_IN_ROOM: 'Você não está mais na sala.',
  NOT_HOST: 'Só o host pode fazer isso.',
  WRONG_PHASE: 'Isso não pode ser feito agora.',
  NOT_ENOUGH_PLAYERS: 'São precisos pelo menos 3 jogadores conectados.',
  NO_QUESTIONS: 'Adicione pelo menos uma pergunta.',
  INVALID_QUESTIONS: 'Cada pergunta precisa ter de 3 a 150 caracteres.',
  INVALID_ANSWER: 'Escreva uma resposta de até 200 caracteres e marque verdade ou mentira.',
  NOT_ELIGIBLE: 'Você não pode votar neste card.',
  INVALID_SETTINGS: 'Configuração inválida.',
  INVALID_PLAYER: 'Jogador inválido.',
  TIMEOUT: 'O servidor não respondeu. Verifique sua conexão.',
};

export const errorMessage = (code: ErrorCode | 'TIMEOUT') => MESSAGES[code] ?? 'Algo deu errado.';
