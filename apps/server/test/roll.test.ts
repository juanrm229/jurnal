import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { runJobs } from '../src/jobs/scheduler';
import { Client, setup } from './helpers';

let env: Awaited<ReturnType<typeof setup>>;
let raka: Client;
let naya: Client;
let duo: string;
const DAY = '2026-10-28'; // Rabu, minggu 2026-W44
const WEEK = '2026-W44';
const photos: string[] = [];

beforeAll(async () => {
  env = await setup('2026-10-28T05:00:00Z');
  raka = await new Client(env.app, 'raka-r@contoh.id').signup('Raka');
  naya = await new Client(env.app, 'naya-r@contoh.id').signup('Naya');
  duo = (await raka.createCircle('duo', 'Raka & Naya')).id;
  await naya.accept(await raka.invite(duo));
  for (let i = 0; i < 6; i++) {
    const up = await naya.req('POST', '/v1/media', undefined, new Uint8Array([i + 1, 2, 3]));
    photos.push((await naya.ok('POST', '/v1/drops', { ...naya.dropBody(DAY, { kind: 'photo' }, { circleId: duo }), mediaIds: [up.json.id], meta: { flash: 'snap' } })).id);
  }
});
afterAll(async () => env.services.close());

describe('rol minggu ini', () => {
  it('memilih sampai lima foto yang terlihat di minggu itu', async () => {
    expect((await raka.req('PUT', `/v1/circles/${duo}/rolls/${WEEK}`, { dropIds: photos.slice(0, 5) })).status).toBe(200);
    expect((await raka.req('PUT', `/v1/circles/${duo}/rolls/${WEEK}`, { dropIds: photos })).status).toBe(400);
    const rolls = await naya.ok('GET', `/v1/circles/${duo}/rolls/${WEEK}`);
    expect(rolls).toHaveLength(1);
    expect(rolls[0]).toMatchObject({ userId: raka.userId, dropIds: photos.slice(0, 5) });
  });

  it('tulisan, minggu lain, atau foto yang belum terlihat ditolak', async () => {
    const tulisan = (await naya.ok('POST', '/v1/drops', naya.dropBody(DAY, { text: 'rahasia' }, { circleId: duo }))).id;
    expect((await raka.req('PUT', `/v1/circles/${duo}/rolls/${WEEK}`, { dropIds: [tulisan] })).status).toBe(400);
    expect((await raka.req('PUT', `/v1/circles/${duo}/rolls/2026-W43`, { dropIds: [photos[0]] })).status).toBe(400);
    expect((await raka.req('PUT', `/v1/circles/${duo}/rolls/2026-W50`, { dropIds: [] })).status).toBe(400);
  });

  it('mengabari rekan saat pertama memilih; kosong = hapus', async () => {
    const k = env.pusher.sent.filter((m) => m.data?.type === 'roll' && m.to.includes('naya-r'));
    expect(k).toHaveLength(1);
    expect(k[0]!.data).toMatchObject({ circleId: duo, week: WEEK });
    await raka.ok('PUT', `/v1/circles/${duo}/rolls/${WEEK}`, { dropIds: [] });
    expect(await naya.ok('GET', `/v1/circles/${duo}/rolls/${WEEK}`)).toHaveLength(0);
  });

  it('Minggu sore: pengingat rol dibuka', async () => {
    env.setNow('2026-11-01T09:30:00Z'); // Minggu 16.30 WIB
    await runJobs(env.services);
    const buka = env.pusher.sent.filter((m) => m.data?.type === 'roll' && m.body.includes('dibuka'));
    for (const who of ['raka-r', 'naya-r']) {
      const k = buka.filter((m) => m.to.includes(who));
      expect(k).toHaveLength(1);
      expect(k[0]!.data).toMatchObject({ week: WEEK, circleId: duo });
    }
    await runJobs(env.services);
    expect(env.pusher.sent.filter((m) => m.data?.type === 'roll' && m.body.includes('dibuka'))).toHaveLength(2);
  });
});
