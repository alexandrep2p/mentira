import { TITLES, type Answer, type CardResult, type FinalTitle, type TitleKey } from '@mentira/shared';
import type { Player, PlayerStats } from './types';

/**
 * Calcula o resultado de um card. Quem acerta ganha +1; o autor ganha +1 por
 * pessoa enganada. Não altera os jogadores: use applyCardResult para isso.
 */
export function scoreCard(authorId: string, answer: Answer, votes: Map<string, boolean>): CardResult {
  const points = new Map<string, number>();
  const add = (id: string, delta: number) => points.set(id, (points.get(id) ?? 0) + delta);

  const cardVotes = [...votes].map(([voterId, votedTruth]) => {
    const correct = votedTruth === answer.isTruth;
    add(correct ? voterId : authorId, 1);
    return { voterId, votedTruth, correct };
  });

  return {
    authorId,
    text: answer.text,
    isTruth: answer.isTruth,
    votes: cardVotes,
    points: [...points].map(([playerId, delta]) => ({ playerId, delta })),
  };
}

export function applyCardResult(result: CardResult, players: Map<string, Player>, deltas: Map<string, number>) {
  for (const { playerId, delta } of result.points) {
    const player = players.get(playerId);
    if (!player) continue;
    player.score += delta;
    deltas.set(playerId, (deltas.get(playerId) ?? 0) + delta);
  }
  const author = players.get(result.authorId);
  for (const vote of result.votes) {
    if (vote.correct) {
      const voter = players.get(vote.voterId);
      if (voter) voter.stats.correctVotes++;
    } else if (author) {
      if (result.isTruth) author.stats.truthsDisbelieved++;
      else author.stats.fooledWithLies++;
    }
  }
}

const TITLE_STATS: [TitleKey, keyof PlayerStats][] = [
  ['liar', 'fooledWithLies'],
  ['disbelieved', 'truthsDisbelieved'],
  ['detector', 'correctVotes'],
  ['openBook', 'truthsWritten'],
];

/** Para cada stat vence o maior valor (> 0); empates dividem o título. */
export function computeTitles(players: Player[]): FinalTitle[] {
  const titles: FinalTitle[] = [];
  for (const [key, stat] of TITLE_STATS) {
    const best = Math.max(0, ...players.map((p) => p.stats[stat]));
    if (best === 0) continue;
    titles.push({
      key,
      title: TITLES[key],
      value: best,
      playerIds: players.filter((p) => p.stats[stat] === best).map((p) => p.id),
    });
  }
  return titles;
}

export function computeRanking(players: Player[]) {
  return [...players]
    .sort((a, b) => b.score - a.score || a.joinedAt - b.joinedAt)
    .map((p) => ({ playerId: p.id, score: p.score }));
}
