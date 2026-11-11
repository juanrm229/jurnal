import { encryptText, swapTarget } from '@sehari/core';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Client, id, setup } from './helpers';

let env: Awaited<ReturnType<typeof setup>>;
let raka: Client;
let naya: Client;
let sari: Client;
let duo: string;
const MONTH = '2026-10';

beforeAll(async () => {
  env = await setup('2026-10-22T05:00:00Z');
  raka = await new Client(env.app, 'raka-b@contoh.id').signup('Raka');
  naya = await new Client(env.app, 'naya-b@contoh.id').signup('Naya');
  sari = await new Client(env.app, 'sari-b@contoh.id').signup('Sari');
  duo = (await raka.createCircle('duo', 'Kita')).id;
  await naya.accept(await raka.invite(duo));
});
afterAll(async () => env.services.close());

const enc = (c: Client, text: string) => `e1:${encryptText(c.ring().circleKey(duo, 1)!, text)}`;
const pushes = (type: string) => env.pusher.sent.filter((m) => m.data?.type === type);

describe('bendera putih', () => {
  it('berkibar diam-diam: pasangan tidak tahu dan tidak dikabari', async () => {
    const r = await raka.req('POST', `/v1/circles/${duo}/truce`);
    expect(r.status).toBe(201);
    expect(r.json.mine).toBeTruthy();
    expect(r.json.peace).toEqual([]);
    const n = await naya.ok('GET', `/v1/circles/${duo}/truce`);
    expect(n).toEqual({ mine: null, peace: [] });
    expect(pushes('truce')).toHaveLength(0);
  });

  it('mengibarkan dua kali tidak menambah bendera', async () => {
    await raka.ok('POST', `/v1/circles/${duo}/truce`);
    const r = await raka.ok('GET', `/v1/circles/${duo}/truce`);
    expect(r.mine).toBeTruthy();
    expect(r.peace).toEqual([]);
  });

  it('saat keduanya mengibarkan, bendera bertemu dan hanya yang menunggu dikabari', async () => {
    const n = await naya.req('POST', `/v1/circles/${duo}/truce`);
    expect(n.status).toBe(200);
    expect(n.json.mine).toBeNull();
    expect(n.json.peace).toHaveLength(1);
    expect(n.json.peace[0].userIds.sort()).toEqual([raka.userId, naya.userId].sort());
    expect((await raka.ok('GET', `/v1/circles/${duo}/truce`)).peace).toHaveLength(1);
    const k = pushes('truce');
    expect(k).toHaveLength(1);
    expect(k[0]!.to).toContain('raka-b');
  });

  it('bendera turun sendiri setelah 72 jam, dan bisa diturunkan sendiri', async () => {
    await raka.ok('POST', `/v1/circles/${duo}/truce`);
    env.advanceDays(4);
    expect((await raka.ok('GET', `/v1/circles/${duo}/truce`)).mine).toBeNull();
    const n = await naya.req('POST', `/v1/circles/${duo}/truce`);
    expect(n.status).toBe(201);
    expect(n.json.peace).toHaveLength(1);
    expect((await naya.ok('DELETE', `/v1/circles/${duo}/truce`)).mine).toBeNull();
    env.setNow('2026-10-22T05:00:00Z');
  });

  it('bukan anggota tidak bisa mengintip', async () => {
    expect((await sari.req('GET', `/v1/circles/${duo}/truce`)).status).toBe(403);
    expect((await sari.req('POST', `/v1/circles/${duo}/truce`)).status).toBe(403);
  });
});

describe('tukar pena', () => {
  it('tebakan pasangan terkunci sampai aku menulis punyaku', async () => {
    expect(swapTarget([raka.userId, naya.userId], raka.userId, MONTH)).toBe(naya.userId);
    const r = await raka.ok('POST', `/v1/circles/${duo}/swaps`, { id: id(), month: MONTH, aboutId: naya.userId, enc: enc(raka, 'kamu pasti telat bangun lalu beli bubur') });
    expect(r.mine.enc).toBeTruthy();
    expect(r.others).toEqual([]);
    const n = await naya.ok('GET', `/v1/circles/${duo}/swaps`);
    expect(n.month).toBe(MONTH);
    expect(n.mine).toBeNull();
    expect(n.others).toHaveLength(1);
    expect(n.others[0].enc).toBeNull();
    expect(pushes('swap').at(-1)!.body).toContain('Tulis punyamu');
  });

  it('begitu keduanya menulis, dua-duanya terbuka', async () => {
    const n = await naya.ok('POST', `/v1/circles/${duo}/swaps`, { id: id(), month: MONTH, aboutId: raka.userId, enc: enc(naya, 'kamu ngopi tiga kali') });
    expect(n.others[0].enc).toMatch(/^e1:/);
    expect((await raka.ok('GET', `/v1/circles/${duo}/swaps?month=${MONTH}`)).others[0].enc).toMatch(/^e1:/);
  });

  it('sebulan sekali, hanya bulan ini, hanya orang yang jadi giliranmu', async () => {
    const again = await raka.req('POST', `/v1/circles/${duo}/swaps`, { id: id(), month: MONTH, aboutId: naya.userId, enc: enc(raka, 'lagi') });
    expect(again.status).toBe(400);
    expect((await raka.req('POST', `/v1/circles/${duo}/swaps`, { id: id(), month: '2026-09', aboutId: naya.userId, enc: enc(raka, 'x1x1') })).status).toBe(400);
    env.advanceDays(20);
    expect((await raka.req('POST', `/v1/circles/${duo}/swaps`, { id: id(), month: '2026-11', aboutId: raka.userId, enc: enc(raka, 'diri sendiri') })).status).toBe(400);
    env.setNow('2026-10-22T05:00:00Z');
  });
});

describe('tinta hilang', () => {
  const live = (c: Client) => c.ok('POST', `/v1/circles/${duo}/inks/live`);
  let inkId: string;

  it('pesan tersimpan, pasangan dikabari tanpa isi', async () => {
    inkId = id();
    await raka.ok('POST', `/v1/circles/${duo}/inks`, { id: inkId, day: '2026-10-22', enc: enc(raka, 'aku bangga sama kamu') });
    const k = pushes('ink');
    expect(k).toHaveLength(1);
    expect(k[0]!.body).not.toContain('bangga');
  });

  it('tidak terbaca selama penulisnya tidak sedang di sini', async () => {
    const n = await live(naya);
    expect(n.present).toEqual([naya.userId]);
    expect(n.inks).toHaveLength(1);
    expect(n.inks[0]).toMatchObject({ id: inkId, enc: null, readAt: null });
  });

  it('terbaca saat keduanya hadir, lalu hilang lagi ketika penulisnya pergi', async () => {
    await live(raka);
    const n = await live(naya);
    expect(n.present.sort()).toEqual([raka.userId, naya.userId].sort());
    expect(n.inks[0].enc).toMatch(/^e1:/);
    expect(n.inks[0].readAt).toBeTruthy();
    // Penulis selalu bisa membaca tulisannya sendiri, dan tahu sudah terbaca.
    const r = await live(raka);
    expect(r.inks[0].enc).toMatch(/^e1:/);
    expect(r.inks[0].readAt).toBeTruthy();
    await raka.ok('DELETE', `/v1/circles/${duo}/inks/live`);
    expect((await live(naya)).inks[0].enc).toBeNull();
  });

  it('kehadiran basi setelah 20 detik', async () => {
    await live(raka);
    env.setNow('2026-10-22T05:00:30Z');
    const n = await live(naya);
    expect(n.present).toEqual([naya.userId]);
    expect(n.inks[0].enc).toBeNull();
    env.setNow('2026-10-22T05:00:00Z');
  });

  it('yang sudah terbaca hilang setelah seminggu; hanya penulis yang bisa menghapus', async () => {
    expect((await naya.req('DELETE', `/v1/inks/${inkId}`)).status).toBe(403);
    env.advanceDays(8);
    expect((await live(naya)).inks).toHaveLength(0);
    env.setNow('2026-10-22T05:00:00Z');
    await raka.ok('DELETE', `/v1/inks/${inkId}`);
    expect((await live(raka)).inks).toHaveLength(0);
  });

  it('paling banyak lima yang belum terbaca', async () => {
    for (let i = 0; i < 5; i++) await raka.ok('POST', `/v1/circles/${duo}/inks`, { id: id(), day: '2026-10-22', enc: enc(raka, `pesan ${i}`) });
    expect((await raka.req('POST', `/v1/circles/${duo}/inks`, { id: id(), day: '2026-10-22', enc: enc(raka, 'keenam') })).status).toBe(400);
    expect((await sari.req('POST', `/v1/circles/${duo}/inks/live`)).status).toBe(403);
  });
});
