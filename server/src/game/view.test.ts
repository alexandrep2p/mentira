import { describe, expect, it } from 'vitest';
import { buildView } from './view';
import { answerAll, makeRoom, startedRoom } from './test-utils';

const json = (value: unknown) => JSON.stringify(value);

describe('buildView não vaza segredos', () => {
  it('nunca inclui tokens', () => {
    const { room, ids } = makeRoom();
    for (const id of ids) {
      const view = json(buildView(room, id, 0));
      for (const p of room.players.values()) expect(view).not.toContain(p.token);
    }
  });

  it('só o host recebe as perguntas', () => {
    const { room, ids, host } = makeRoom();
    room.setQuestions(host, ['Pergunta secreta?']);
    expect(buildView(room, host, 0).questions).toEqual(['Pergunta secreta?']);
    expect(buildView(room, ids[1], 0).questions).toBeNull();
    expect(json(buildView(room, ids[1], 0))).not.toContain('Pergunta secreta');
  });

  it('na escrita, cada um só vê a própria resposta', () => {
    const { room, ids } = startedRoom();
    room.submitAnswer(ids[0], 'RESPOSTA-SECRETA-A', true);
    room.submitAnswer(ids[1], 'RESPOSTA-SECRETA-B', false);
    const viewB = buildView(room, ids[1], 0);
    expect(viewB.writing!.myAnswer).toEqual({ text: 'RESPOSTA-SECRETA-B', isTruth: false });
    expect(json(viewB)).not.toContain('RESPOSTA-SECRETA-A');
    expect(viewB.writing!.submittedIds).toEqual([ids[0], ids[1]]);
    const viewC = json(buildView(room, ids[2], 0));
    expect(viewC).not.toContain('RESPOSTA-SECRETA');
    expect(viewC).not.toContain('isTruth');
  });

  it('na votação, ninguém além do autor vê a marcação, e votos alheios ficam ocultos', () => {
    const { room, ids } = startedRoom(['A', 'B', 'C', 'D']);
    answerAll(room, ids, [0, 1, 2, 3]);
    const author = room.currentAuthorId()!;
    const voters = ids.filter((id) => id !== author);
    room.castVote(voters[0], false);

    for (const id of voters) {
      const view = buildView(room, id, 0);
      expect(view.voting!.myAnswerIsTruth).toBeNull();
      expect(json(view)).not.toMatch(/"isTruth"|votedTruth/);
      expect(view.voting!.votedIds).toEqual([voters[0]]);
      expect(view.voting!.myVote).toBe(id === voters[0] ? false : null);
    }
    expect(buildView(room, author, 0).voting!.myAnswerIsTruth).toBe(true);
    // Respostas dos próximos cards também não vazam.
    const others = ids.filter((id) => id !== author).map((id) => `Resposta de ${id}`);
    for (const text of others) expect(json(buildView(room, voters[1], 0))).not.toContain(text);
  });

  it('na revelação, o resultado completo aparece', () => {
    const { room, ids, host } = startedRoom();
    answerAll(room, ids);
    room.advance(host);
    const view = buildView(room, ids[1], 0);
    expect(view.phase).toBe('reveal');
    expect(view.reveal!.result.isTruth).toBe(false);
  });
});
