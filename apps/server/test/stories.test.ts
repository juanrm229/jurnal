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

  it('setelah selesai: sanggahan dan jalan lain bisa ditambahkan', async () => {
    const st = await raka.ok('GET', `/v1/stories/${sid}`);
    const np = st.parts.find((x: any) => x.authorId === naya.userId && x.round === 1);
    const withNote = await raka.ok('POST', `/v1/stories/${sid}/parts/${np.id}/notes`, { id: id(), reason: 'pengetahuan', envelope: amplop(raka, 'dari mana dina tahu?') });
    expect(withNote.notes).toHaveLength(1);
    const b = await naya.ok('PUT', `/v1/stories/${sid}/branch`, { round: 2, envelope: amplop(naya, 'taksi berhenti') });
    expect(b.parts.filter((x: any) => x.world === 'b')).toHaveLength(1);
    expect(b.parts).toHaveLength(7);
  });

  it('novella: babak baru mengundi role baru, dan penulis yang macet bisa dilewati', async () => {
    const trio = (await raka.createCircle('circle', 'Geng')).id;
    await naya.accept(await raka.invite(trio));
    await sari.accept(await raka.invite(trio));
    const nid = id();
    const st = await raka.ok('POST', '/v1/stories', { id: nid, circleId: trio, premise: 'kunci', members: [naya.userId, sari.userId], rounds: 6, deck: 'lengkap' });
    expect([st.rounds, st.deck]).toEqual([6, 'lengkap']);
    const seal = (c: Client, round: number) => c.ok('PUT', `/v1/stories/${nid}/parts`, { round, envelope: amplop(c, 'x'), seal: true });
    const next = (c: Client) => c.ok('POST', `/v1/stories/${nid}/ready`);
    // Sari tidak menulis: belum boleh melewati sebelum menyegel, dan butuh semua yang sudah menyegel.
    expect((await sari.req('POST', `/v1/stories/${nid}/skip`)).status).toBe(400);
    await seal(raka, 1);
    await seal(naya, 1);
    expect((await raka.ok('POST', `/v1/stories/${nid}/skip`)).phase).toBe('write');
    expect((await naya.ok('POST', `/v1/stories/${nid}/skip`)).phase).toBe('read');
    await next(raka);
    expect((await next(naya)).round).toBe(2);
    for (const round of [2, 3]) {
      for (const c of [raka, naya, sari]) await seal(c, round);
      for (const c of [raka, naya, sari]) await next(c);
    }
    const four = await raka.ok('GET', `/v1/stories/${nid}`);
    expect([four.round, four.phase]).toEqual([4, 'write']);
    for (const round of [4, 5, 6]) {
      for (const c of [raka, naya, sari]) await seal(c, round);
      for (const c of [raka, naya, sari]) await next(c);
    }
    const done = await raka.ok('GET', `/v1/stories/${nid}`);
    expect(done.phase).toBe('done');
    expect(done.rolesLog).toHaveLength(1);
  });

  it('cerita sendiri tidak butuh lingkaran', async () => {
    const solo = id();
    const st = await sari.ok('POST', '/v1/stories', { id: solo, circleId: null, premise: 'warung', members: [] });
    expect(st.members).toEqual([sari.userId]);
    const r = await sari.req('PUT', `/v1/stories/${solo}/parts`, { round: 1, envelope: amplop(sari, 's'), seal: true });
    expect(r.json.phase).toBe('read');
  });
});
