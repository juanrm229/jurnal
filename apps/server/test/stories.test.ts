import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Client, id, setup } from './helpers';

let env: Awaited<ReturnType<typeof setup>>;
let raka: Client;
let naya: Client;
let sari: Client;
let duo: string;
const sid = id();

// Server tidak membaca isi; amplop apa pun yang bentuknya sah cukup untuk menguji giliran.
const amplop = (c: Client, tag: string) => ({ ciphertext: Buffer.from(tag).toString('base64'), recipients: [{ t: 'user', userId: c.userId, wk: 'AAAA' }] });

beforeAll(async () => {
  env = await setup('2026-11-12T05:00:00Z');
  raka = await new Client(env.app, 'raka-c@contoh.id').signup('Raka');
  naya = await new Client(env.app, 'naya-c@contoh.id').signup('Naya');
  sari = await new Client(env.app, 'sari-c@contoh.id').signup('Sari');
  duo = (await raka.createCircle('duo', 'Kita')).id;
  await naya.accept(await raka.invite(duo));
});
afterAll(async () => env.services.close());

const part = (c: Client, round: number, seal: boolean, tag = 'x') => c.req('PUT', `/v1/stories/${sid}/parts`, { round, envelope: amplop(c, tag), seal });

describe('hidup orang lain', () => {
  it('membuka cerita: role berbeda untuk tiap penulis, dan hanya role sendiri yang terlihat', async () => {
    const st = await raka.ok('POST', '/v1/stories', { id: sid, circleId: duo, premise: 'kunci', members: [naya.userId] });
    expect(st.members).toEqual([raka.userId, naya.userId]);
    expect(Object.keys(st.roles)).toEqual([raka.userId]);
    const n = await naya.ok('GET', `/v1/stories/${sid}`);
    expect(Object.keys(n.roles)).toEqual([naya.userId]);
    expect(n.roles[naya.userId]).not.toBe(st.roles[raka.userId]);
  });

  it('orang di luar lingkaran tidak bisa ikut atau membaca', async () => {
    expect((await sari.req('GET', `/v1/stories/${sid}`)).status).toBe(404);
    expect((await raka.req('POST', '/v1/stories', { id: id(), circleId: duo, premise: 'kunci', members: [sari.userId] })).status).toBe(403);
  });

  it('bagian orang lain tertutup sampai semua menyegel', async () => {
    expect((await part(raka, 1, true, 'raka-1')).status).toBe(200);
    const n = await naya.ok('GET', `/v1/stories/${sid}`);
    expect(n.phase).toBe('write');
    const p = n.parts.find((x: any) => x.authorId === raka.userId);
    expect(p.sealed).toBe(true);
    expect(p.envelope).toBeNull();
  });

  it('segel bisa ditarik selama belum semua menyegel', async () => {
    await part(raka, 1, false, 'raka-1b');
    const r = await raka.ok('GET', `/v1/stories/${sid}`);
    expect(r.parts[0].sealed).toBe(false);
    await part(raka, 1, true, 'raka-1c');
  });

  it('segel terakhir membuka ruang baca; setelah itu bagian tidak bisa diubah', async () => {
    const r = await part(naya, 1, true, 'naya-1');
    expect(r.json.phase).toBe('read');
    expect(r.json.parts.every((x: any) => x.envelope)).toBe(true);
    expect((await part(raka, 1, true, 'curang')).status).toBe(409);
  });

  it('jejak disepakati orang lain, bukan pemiliknya', async () => {
    const st = await naya.ok('GET', `/v1/stories/${sid}`);
    const rp = st.parts.find((x: any) => x.authorId === raka.userId);
    expect((await raka.req('PUT', `/v1/stories/${sid}/parts/${rp.id}/agree`)).status).toBe(400);
    const a = await naya.ok('PUT', `/v1/stories/${sid}/parts/${rp.id}/agree`);
    expect(a.parts.find((x: any) => x.id === rp.id).agrees).toEqual([naya.userId]);
  });

  it('putaran berikutnya baru terbuka saat semua siap; tiga putaran lalu selesai dan role terbuka', async () => {
    expect((await raka.ok('POST', `/v1/stories/${sid}/ready`)).phase).toBe('read');
    const two = await naya.ok('POST', `/v1/stories/${sid}/ready`);
    expect([two.phase, two.round]).toEqual(['write', 2]);
    for (const round of [2, 3]) {
      await part(raka, round, true);
      await part(naya, round, true);
      await raka.ok('POST', `/v1/stories/${sid}/ready`);
      await naya.ok('POST', `/v1/stories/${sid}/ready`);
    }
    const done = await raka.ok('GET', `/v1/stories/${sid}`);
    expect(done.phase).toBe('done');
    expect(Object.keys(done.roles).sort()).toEqual([raka.userId, naya.userId].sort());
    expect(done.parts).toHaveLength(6);
  });

  it('cerita sendiri tidak butuh lingkaran', async () => {
    const solo = id();
    const st = await sari.ok('POST', '/v1/stories', { id: solo, circleId: null, premise: 'warung', members: [] });
    expect(st.members).toEqual([sari.userId]);
    const r = await sari.req('PUT', `/v1/stories/${solo}/parts`, { round: 1, envelope: amplop(sari, 's'), seal: true });
    expect(r.json.phase).toBe('read');
  });
});
