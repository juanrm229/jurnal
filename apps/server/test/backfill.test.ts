import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Client, setup } from './helpers';

let env: Awaited<ReturnType<typeof setup>>;
let raka: Client;
let naya: Client;
let duo: string;
const OLD = '2026-09-01'; // 51 hari sebelum "hari ini" (22 Okt)

beforeAll(async () => {
  env = await setup('2026-10-22T05:00:00Z');
  raka = await new Client(env.app, 'raka-b@contoh.id').signup('Raka');
  naya = await new Client(env.app, 'naya-b@contoh.id').signup('Naya');
  duo = (await raka.createCircle('duo', 'Raka & Naya')).id;
  await naya.accept(await raka.invite(duo));
});
afterAll(async () => env.services.close());

async function backfill(c: Client, day: string, extra: Record<string, unknown> = {}) {
  const up = await c.req('POST', '/v1/media', undefined, new Uint8Array([1, 2, 3]));
  return c.req('POST', '/v1/drops', { ...c.dropBody(day, { kind: 'photo', tags: ['susulan'] }, { circleId: duo }), mediaIds: [up.json.id], meta: { backfill: true }, ...extra });
}

describe('kenangan susulan', () => {
  it('foto lama diterima dan terlihat lingkaran tanpa segel', async () => {
    const r = await backfill(raka, OLD);
    expect(r.status).toBe(201);
    const l = await naya.ok('GET', `/v1/circles/${duo}/drops?from=${OLD}&to=${OLD}`);
    expect(l.drops.map((d: { id: string }) => d.id)).toEqual([r.json.id]);
    expect(l.drops[0].meta.backfill).toBe(true);
  });

  it('halaman hari itu memuat pemilik kenangan walau lingkaran belum lahir', async () => {
    const d = await naya.ok('GET', `/v1/circles/${duo}/days/${OLD}`);
    expect(d.members.map((m: { userId: string }) => m.userId)).toEqual([raka.userId]);
    expect(d.drops.length).toBe(1);
    expect(d.locked).toEqual([]);
  });

  it('kalender menghitungnya, tapi tidak menambah api', async () => {
    const cal = await naya.ok('GET', `/v1/circles/${duo}/calendar?from=${OLD}&to=${OLD}`);
    expect(cal[0]).toMatchObject({ day: OLD, dropCount: 1, backfill: 1, sealed: [] });
    const circles = await raka.ok('GET', '/v1/circles');
    expect(circles.find((c: { id: string }) => c.id === duo).streak.togetherDays).toBe(0);
  });

  it('hanya untuk hari di luar jendela susulan biasa, sampai setahun, berupa foto', async () => {
    expect((await backfill(raka, '2026-10-19')).status).toBe(400); // masih dalam 7 hari: tulis biasa
    expect((await backfill(raka, '2025-10-01')).status).toBe(400); // lebih dari setahun
    expect((await backfill(raka, '2026-10-23')).status).toBe(400); // masa depan
    const teks = await raka.req('POST', '/v1/drops', { ...raka.dropBody(OLD, { text: 'teks lama' }, { circleId: duo }), meta: { backfill: true } });
    expect(teks.status).toBe(400);
    const biasa = await raka.req('POST', '/v1/drops', raka.dropBody(OLD, { text: 'tanpa tanda susulan' }, { circleId: duo }));
    expect(biasa.status).toBe(400);
    const sendiri = await raka.req('POST', '/v1/drops', { ...raka.dropBody(OLD, { kind: 'photo' }), mediaIds: [(await raka.req('POST', '/v1/media', undefined, new Uint8Array([4]))).json.id], meta: { backfill: true } });
    expect(sendiri.status).toBe(400);
  });

  it('paling banyak 12 per hari per orang', async () => {
    for (let i = 0; i < 11; i++) expect((await backfill(naya, '2026-08-17')).status).toBe(201);
    expect((await backfill(naya, '2026-08-17')).status).toBe(201);
    expect((await backfill(naya, '2026-08-17')).status).toBe(409);
  });
});
