import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Client, setup } from './helpers';

let env: Awaited<ReturnType<typeof setup>>;
let raka: Client;
let naya: Client;
let sari: Client;
let duo: string;
const DAY = '2026-10-22';
const Q = 'q-langit';

beforeAll(async () => {
  env = await setup('2026-10-22T05:00:00Z');
  raka = await new Client(env.app, 'raka-q@contoh.id').signup('Raka');
  naya = await new Client(env.app, 'naya-q@contoh.id').signup('Naya');
  sari = await new Client(env.app, 'sari-q@contoh.id').signup('Sari');
  duo = (await raka.createCircle('circle', 'Kos')).id;
  await naya.accept(await raka.invite(duo));
  await sari.accept(await raka.invite(duo));
});
afterAll(async () => env.services.close());

const answer = (c: Client, text: string, q = Q) => c.ok('POST', '/v1/drops', { ...c.dropBody(DAY, { kind: 'answer', text, prompt: 'Langit hari ini?' }, { circleId: duo }), meta: { questionId: q } });
const list = (c: Client) => c.ok('GET', `/v1/circles/${duo}/drops?from=${DAY}&to=${DAY}`);

describe('jawab dulu, baru lihat', () => {
  it('jawaban teman terkunci "jawab dulu" lengkap dengan pertanyaannya', async () => {
    await answer(raka, 'biru pucat');
    await raka.ok('POST', '/v1/drops', raka.dropBody(DAY, { text: 'cerita biasa' }, { circleId: duo }));
    const l = await list(naya);
    expect(l.drops).toHaveLength(0);
    const kunci = l.locked.find((x: { reason: string }) => x.reason === 'answer_first');
    expect(kunci).toMatchObject({ authorId: raka.userId, questionId: Q });
  });

  it('rekan yang belum menjawab dikabari, tanpa isi', () => {
    const k = env.pusher.sent.filter((m) => m.data?.type === 'question');
    expect(k).toHaveLength(2);
    expect(k.some((m) => m.to.includes('naya-q'))).toBe(true);
    expect(k.some((m) => m.to.includes('sari-q'))).toBe(true);
    expect(k[0]!.body).toContain('Jawab dulu');
    expect(k[0]!.body).not.toContain('biru');
  });

  it('begitu menjawab, jawaban teman terbuka; tulisan biasa tetap menunggu segel', async () => {
    await answer(naya, 'abu-abu, mau hujan');
    const l = await list(naya);
    const lain = l.drops.filter((d: { authorId: string }) => d.authorId !== naya.userId);
    expect(lain.map((d: { authorId: string; kind: string }) => [d.authorId, d.kind])).toEqual([[raka.userId, 'answer']]);
    expect(l.locked.map((x: { reason: string }) => x.reason)).toEqual(['not_sealed']);
    // Naya menjawab: hanya Sari (yang belum) yang dikabari.
    const keSari = env.pusher.sent.filter((m) => m.data?.type === 'question' && m.to.includes('sari-q'));
    expect(keSari).toHaveLength(2);
    expect(env.pusher.sent.filter((m) => m.data?.type === 'question' && m.to.includes('raka-q'))).toHaveLength(0);
  });

  it('pertanyaan lain tidak membuka; menyegel tetap membuka semuanya', async () => {
    await answer(sari, 'jawaban untuk pertanyaan lain', 'q-lain');
    expect((await list(sari)).locked.filter((x: { reason: string }) => x.reason === 'answer_first')).toHaveLength(2);
    await sari.ok('POST', `/v1/days/${DAY}/seal`, { tz: sari.tz });
    const l = await list(sari);
    expect(l.locked).toHaveLength(0);
    expect(l.drops.length).toBeGreaterThanOrEqual(3);
  });
});
