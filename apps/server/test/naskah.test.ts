import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Client, id, setup } from './helpers';

let env: Awaited<ReturnType<typeof setup>>;
let raka: Client;
let naya: Client;
let sari: Client;
let duo: string;
const nid = id();

const amplop = (c: Client, tag: string) => ({ ciphertext: Buffer.from(tag).toString('base64'), recipients: [{ t: 'user', userId: c.userId, wk: 'AAAA' }] });

beforeAll(async () => {
  env = await setup('2026-11-12T05:00:00Z');
  raka = await new Client(env.app, 'raka-n@contoh.id').signup('Raka');
  naya = await new Client(env.app, 'naya-n@contoh.id').signup('Naya');
  sari = await new Client(env.app, 'sari-n@contoh.id').signup('Sari');
  duo = (await raka.createCircle('duo', 'Kita')).id;
  await naya.accept(await raka.invite(duo));
});
afterAll(async () => env.services.close());

describe('studio naskah', () => {
  it('naskah bersama hanya untuk anggota lingkaran; orang luar tidak bisa membaca', async () => {
    const ms = await raka.ok('POST', '/v1/naskah', { id: nid, circleId: duo, members: [naya.userId], meta: amplop(raka, 'judul') });
    expect(ms.members.sort()).toEqual([raka.userId, naya.userId].sort());
    expect((await sari.req('GET', `/v1/naskah/${nid}`)).status).toBe(404);
    expect((await raka.req('POST', '/v1/naskah', { id: id(), circleId: duo, members: [sari.userId], meta: amplop(raka, 'x') })).status).toBe(403);
    expect((await sari.req('POST', '/v1/naskah', { id: id(), circleId: null, members: [raka.userId], meta: amplop(sari, 'x') })).status).toBe(400);
    expect((await naya.ok('GET', '/v1/naskah')).map((x: any) => x.id)).toContain(nid);
  });

  it('draf hanya terlihat penulisnya; setelah terbit, terbuka untuk semua dan tercatat versinya', async () => {
    const sid = id();
    await raka.ok('POST', `/v1/naskah/${nid}/scenes`, { id: sid, chapter: 1, order: 1, envelope: amplop(raka, 'draf') });
    const seen = (await naya.ok('GET', `/v1/naskah/${nid}`)).scenes.find((x: any) => x.id === sid);
    expect([seen.status, seen.envelope]).toEqual(['draf', null]);
    expect((await naya.req('GET', `/v1/naskah/${nid}/scenes/${sid}/versions`)).status).toBe(404);
    const pub = await raka.ok('PUT', `/v1/naskah/${nid}/scenes/${sid}`, { status: 'terbit' });
    expect(pub.scenes[0]).toMatchObject({ status: 'terbit', version: 1 });
    expect((await naya.ok('GET', `/v1/naskah/${nid}`)).scenes[0].envelope).toBeTruthy();
    // Suntingan dalam sepuluh menit menimpa versi yang sama; sesudahnya versi baru.
    await raka.ok('PUT', `/v1/naskah/${nid}/scenes/${sid}`, { envelope: amplop(raka, 'revisi') });
    env.advanceDays(1);
    const v2 = await raka.ok('PUT', `/v1/naskah/${nid}/scenes/${sid}`, { envelope: amplop(raka, 'revisi lagi') });
    expect(v2.scenes[0].version).toBe(2);
    expect(await naya.ok('GET', `/v1/naskah/${nid}/scenes/${sid}/versions`)).toHaveLength(2);
  });

  it('satu adegan, satu pemilik: penulis lain hanya boleh mengatur urutan', async () => {
    const sid = (await naya.ok('GET', `/v1/naskah/${nid}`)).scenes[0].id;
    expect((await naya.req('PUT', `/v1/naskah/${nid}/scenes/${sid}`, { envelope: amplop(naya, 'timpa') })).status).toBe(403);
    expect((await naya.req('DELETE', `/v1/naskah/${nid}/scenes/${sid}`)).status).toBe(403);
    const moved = await naya.ok('PUT', `/v1/naskah/${nid}/scenes/${sid}`, { chapter: 2, order: 5 });
    expect(moved.scenes[0]).toMatchObject({ chapter: 2, order: 5 });
  });

  it('kanon milik bersama: siapa pun mengubah, hanya pembuat atau pembuka naskah yang menghapus', async () => {
    const cid = id();
    await naya.ok('POST', `/v1/naskah/${nid}/canon`, { id: cid, kind: 'benda', envelope: amplop(naya, 'cincin') });
    const upd = await raka.ok('PUT', `/v1/naskah/${nid}/canon/${cid}`, { envelope: amplop(raka, 'cincin perak') });
    expect(upd.canon[0]).toMatchObject({ authorId: naya.userId, updatedBy: raka.userId });
    const c2 = id();
    await raka.ok('POST', `/v1/naskah/${nid}/canon`, { id: c2, kind: 'tokoh', envelope: amplop(raka, 'Dina') });
    expect((await naya.req('DELETE', `/v1/naskah/${nid}/canon/${c2}`)).status).toBe(403);
    expect((await raka.ok('DELETE', `/v1/naskah/${nid}/canon/${cid}`)).canon).toHaveLength(1);
  });

  it('naskah sendiri, dan hanya pembuka yang menghapus naskah', async () => {
    const solo = id();
    await sari.ok('POST', '/v1/naskah', { id: solo, circleId: null, members: [], meta: amplop(sari, 's') });
    expect((await naya.req('DELETE', `/v1/naskah/${nid}`)).status).toBe(403);
    await raka.ok('DELETE', `/v1/naskah/${nid}`);
    expect((await naya.req('GET', `/v1/naskah/${nid}`)).status).toBe(404);
  });

  it('rak karya: banyak karya berbagi kanon; adegan masuk karya; menghapus karya mengembalikan adegan jadi kisah lepas', async () => {
    const ms = id();
    await raka.ok('POST', '/v1/naskah', { id: ms, circleId: null, members: [], meta: amplop(raka, 'seri') });
    const jurnal = id();
    let w = await raka.ok('POST', `/v1/naskah/${ms}/works`, { id: jurnal, bentuk: 'jurnal', envelope: amplop(raka, 'Jurnal Dina') });
    expect(w.works).toEqual([expect.objectContaining({ id: jurnal, bentuk: 'jurnal' })]);
    expect((await raka.req('POST', `/v1/naskah/${ms}/works`, { id: id(), bentuk: 'puisi', envelope: amplop(raka, 'x') })).status).toBe(400);
    const sid = id();
    await raka.ok('POST', `/v1/naskah/${ms}/scenes`, { id: sid, chapter: 1, order: 1, envelope: amplop(raka, 'entri'), workId: jurnal });
    expect((await raka.req('POST', `/v1/naskah/${ms}/scenes`, { id: id(), chapter: 1, order: 2, envelope: amplop(raka, 'x'), workId: 'tidakada1' })).status).toBe(400);
    w = await raka.ok('GET', `/v1/naskah/${ms}`);
    expect(w.scenes[0].workId).toBe(jurnal);
    w = await raka.ok('DELETE', `/v1/naskah/${ms}/works/${jurnal}`);
    expect([w.works.length, w.scenes[0].workId]).toEqual([0, null]);
  });
});
