import { describe, expect, it } from 'vitest';
import { applyCardResult, computeRanking, computeTitles, scoreCard } from './scoring';
import { emptyStats, type Player } from './types';

const player = (id: string, joinedAt = 0): Player => ({
  id,
  token: `t-${id}`,
  nickname: id,
  avatar: '🥸',
  color: 0,
  connected: true,
  isBot: false,
  joinedAt,
  activeFromRound: 0,
  score: 0,
  stats: emptyStats(),
});

describe('scoreCard', () => {
  it('exemplo do design: mentira que engana 4 de 6', () => {
    const votes = new Map([
      ['b', true], ['c', true], ['d', true], ['e', true], // acreditaram
      ['f', false], ['g', false], // acertaram
    ]);
    const result = scoreCard('ana', { text: 'x', isTruth: false }, votes);
    const pts = Object.fromEntries(result.points.map((p) => [p.playerId, p.delta]));
    expect(pts).toEqual({ ana: 4, f: 1, g: 1 });
  });

  it('verdade desacreditada também pontua o autor', () => {
    const result = scoreCard('ana', { text: 'x', isTruth: true }, new Map([['b', false], ['c', true]]));
    const pts = Object.fromEntries(result.points.map((p) => [p.playerId, p.delta]));
    expect(pts).toEqual({ ana: 1, c: 1 });
  });

  it('sem votos ninguém pontua', () => {
    expect(scoreCard('ana', { text: 'x', isTruth: true }, new Map()).points).toEqual([]);
  });
});

describe('applyCardResult', () => {
  it('atualiza placar, deltas e stats', () => {
    const players = new Map(['ana', 'b', 'c'].map((id) => [id, player(id)]));
    const deltas = new Map<string, number>();
    applyCardResult(scoreCard('ana', { text: 'x', isTruth: false }, new Map([['b', true], ['c', false]])), players, deltas);
    applyCardResult(scoreCard('b', { text: 'y', isTruth: true }, new Map([['ana', false], ['c', false]])), players, deltas);
    expect(players.get('ana')!.score).toBe(1);
    expect(players.get('b')!.score).toBe(2);
    expect(players.get('c')!.score).toBe(1);
    expect(players.get('ana')!.stats.fooledWithLies).toBe(1);
    expect(players.get('b')!.stats.truthsDisbelieved).toBe(2);
    expect(players.get('c')!.stats.correctVotes).toBe(1);
    expect(Object.fromEntries(deltas)).toEqual({ ana: 1, b: 2, c: 1 });
  });
});

describe('títulos e ranking', () => {
  it('empates dividem o título e zero não premia', () => {
    const a = player('a');
    const b = player('b');
    a.stats.correctVotes = 3;
    b.stats.correctVotes = 3;
    a.stats.fooledWithLies = 2;
    const titles = computeTitles([a, b]);
    expect(titles.find((t) => t.key === 'detector')!.playerIds).toEqual(['a', 'b']);
    expect(titles.find((t) => t.key === 'liar')!.playerIds).toEqual(['a']);
    expect(titles.find((t) => t.key === 'openBook')).toBeUndefined();
  });

  it('ranking por pontos, desempate por ordem de entrada', () => {
    const a = player('a', 0);
    const b = player('b', 1);
    const c = player('c', 2);
    a.score = 2;
    b.score = 5;
    c.score = 2;
    expect(computeRanking([c, a, b]).map((r) => r.playerId)).toEqual(['b', 'a', 'c']);
  });
});
