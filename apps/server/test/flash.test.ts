import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Client, setup } from './helpers';

let env: Awaited<ReturnType<typeof setup>>;
let raka: Client;
let naya: Client;
let duo: string;
const DAY = '2026-10-22';

beforeAll(async () => {
  env = await setup('2026-10-22T05:00:00Z');
  raka = await new Client(env.app, 'raka-f@contoh.id').signup('Raka');
  naya = await new Client(env.app, 'naya-f@contoh.id').signup('Naya');
  duo = (await raka.createCircle('duo', 'Raka & Naya')).id;
  await naya.accept(await raka.invite(duo));
});
afterAll(async () => env.services.close());

async function snap(c: Client, extra: Record<string, unknown> = {}) {
  const up = await c.req('POST', '/v1/media', undefined, new Uint8Array([1, 2, 3, 4]));
  const body = { ...c.dropBody(DAY, { kind: 'photo', text: 'kopi sore' }, { circleId: duo }), mediaIds: [up.json.id], meta: { flash: 'snap' }, ...extra };
  return c.req('POST', '/v1/drops', body);
}

describe('kilasan', () => {
  it('terlihat lingkaran sebelum segel; tulisan biasa tetap terkunci', async () => {
    await raka.ok('POST', '/v1/drops', raka.dropBody(DAY, { text: 'cerita panjang hari ini' }, { circleId: duo }));
    const r = await snap(raka);
    expect(r.status).toBe(201);
    const list = await naya.ok('GET', `/v1/circles/${duo}/drops?from=${DAY}&to=${DAY}`);
    expect(list.drops.map((d: { id: string }) => d.id)).toEqual([r.json.id]);
    expect(list.locked).toHaveLength(1);
    const flashes = await naya.ok('GET', '/v1/flashes');
    expect(flashes.flashes.map((d: { id: string }) => d.id)).toEqual([r.json.id]);
    expect(flashes.flashes[0].meta.flash).toBe('snap');
  });

  it('mengabari rekan langsung', () => {
    const k = env.pusher.sent.filter((m) => m.data?.type === 'flash' && m.to.includes('naya-f'));
    expect(k).toHaveLength(1);
    expect(k[0]!.body).toContain('Raka');
    expect(k[0]!.data).toMatchObject({ circleId: duo, day: DAY });
  });

  it('kilasan butuh foto & hanya untuk lingkaran', async () => {
    const tanpaFoto = await raka.req('POST', '/v1/drops', { ...raka.dropBody(DAY, { kind: 'photo' }, { circleId: duo }), meta: { flash: 'snap' } });
    expect(tanpaFoto.status).toBe(400);
    const sendiri = await raka.req('POST', '/v1/drops', { ...raka.dropBody(DAY, { kind: 'sticker' }), meta: { flash: 'kangen' } });
    expect(sendiri.status).toBe(400);
  });

  it('kangen paling banyak tiga kali sehari', async () => {
    const kangen = () => naya.req('POST', '/v1/drops', { ...naya.dropBody(DAY, { kind: 'sticker', sticker: 'hati-dua', text: 'kangen' }, { circleId: duo }), meta: { flash: 'kangen' } });
    for (let i = 0; i < 3; i++) expect((await kangen()).status).toBe(201);
    const keempat = await kangen();
    expect(keempat.status).toBe(409);
    const k = env.pusher.sent.filter((m) => m.data?.type === 'flash' && m.to.includes('raka-f'));
    expect(k[0]!.body).toContain('memikirkanmu');
  });
});
