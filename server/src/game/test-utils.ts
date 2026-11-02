import { Room } from './room';

/** Sala com relógio, aleatoriedade e ids controlados. */
export function makeRoom(nicknames: string[] = ['Ana', 'Bruno', 'Carla']) {
  const clock = { now: 1_000_000 };
  let seq = 0;
  const room = new Room('TEST', {
    now: () => clock.now,
    random: () => 0.999, // embaralhamento determinístico (mantém a ordem)
    id: () => `id${++seq}`,
  });
  const ids = nicknames.map((n) => {
    const res = room.join(n);
    if (!res.ok) throw new Error(res.error);
    return res.player.id;
  });
  return { room, clock, ids, host: ids[0] };
}

export function startedRoom(nicknames?: string[], questions = ['Pergunta um?', 'Pergunta dois?']) {
  const ctx = makeRoom(nicknames);
  ctx.room.setQuestions(ctx.host, questions);
  const res = ctx.room.start(ctx.host);
  if (!res.ok) throw new Error(res.error);
  return ctx;
}

/** Sala já iniciada no modo 2 mentiras, 1 verdade. */
export function tripleRoom(nicknames?: string[], questions = ['Pergunta um?', 'Pergunta dois?', 'Pergunta três?']) {
  const ctx = makeRoom(nicknames);
  ctx.room.setSettings(ctx.host, { mode: 'twoLiesOneTruth' });
  ctx.room.setQuestions(ctx.host, questions);
  const res = ctx.room.start(ctx.host);
  if (!res.ok) throw new Error(res.error);
  return ctx;
}

export function answerAllTriples(room: Room, ids: string[]) {
  ids.forEach((id) => room.submitTriple(id, `Verdade de ${id}`, [`Mentira A de ${id}`, `Mentira B de ${id}`]));
}

/** Todos respondem: os índices em `truths` dizem verdade, o resto mente. */
export function answerAll(room: Room, ids: string[], truths: number[] = []) {
  ids.forEach((id, i) => room.submitAnswer(id, `Resposta de ${id}`, truths.includes(i)));
}
