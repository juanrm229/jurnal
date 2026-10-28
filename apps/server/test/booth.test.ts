import { sealEnvelope } from '@sehari/core';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Client, id, setup } from './helpers';

let env: Awaited<ReturnType<typeof setup>>;
let a: Client;
let b: Client;
let c3: Client;
let luar: Client;

beforeAll(async () => {
  env = await setup('2026-10-22T05:00:00Z');
  a = await new Client(env.app, 'booth-a@contoh.id').signup('Ayu');
  b = await new Client(env.app, 'booth-b@contoh.id').signup('Bima');
  c3 = await new Client(env.app, 'booth-c@contoh.id').signup('Cici');
  luar = await new Client(env.app, 'booth-d@contoh.id').signup('Dodo');
});
afterAll(async () => env.services.close());

const seal = (cl: Client, circleId: string, v: unknown) => {
  const e = sealEnvelope(v, [{ t: 'circle', circleId, epoch: 1, key: cl.circleKeys.get(circleId)!.get(1)! }]);
  return { ciphertext: e.ciphertext, recipients: e.recipients };
};

describe('photobox berdua jarak jauh', () => {
  it('buat → gabung → siap → mulai bersama → pratinjau → jepretan', async () => {
    const circle = await a.createCircle('circle', 'Geng Foto');
    await b.accept(await a.invite(circle.id));
    await c3.accept(await a.invite(circle.id));
    const config = { template: 'klasik', filter: 'asli', shots: 4, seed: 42 };
    const booth = await a.ok('POST', `/v1/circles/${circle.id}/booths`, { id: id(), envelope: seal(a, circle.id, { previewKey: 'x' }), config });
    expect(booth.guestId).toBeNull();

    // Belum bisa mulai sendirian.
    expect((await a.req('POST', `/v1/booths/${booth.id}/start`)).status).toBe(409);
    const joined = await b.ok('POST', `/v1/booths/${booth.id}/join`);
    expect(joined.guestId).toBe(b.userId);
    // Orang ketiga tidak bisa masuk; orang luar lingkaran tidak bisa melihat.
    expect((await c3.req('POST', `/v1/booths/${booth.id}/join`)).status).toBe(409);
    expect((await luar.req('GET', `/v1/booths/${booth.id}`)).status).toBe(404);

    // Hanya tuan rumah yang mengganti desain.
    expect((await b.req('PATCH', `/v1/booths/${booth.id}`, { config: { ...config, template: 'film' } })).status).toBe(403);
    await a.ok('PATCH', `/v1/booths/${booth.id}`, { config: { ...config, template: 'film' } });

    await a.ok('PATCH', `/v1/booths/${booth.id}`, { ready: true });
    expect((await a.req('POST', `/v1/booths/${booth.id}/start`)).status).toBe(409);
    await b.ok('PATCH', `/v1/booths/${booth.id}`, { ready: true });
    const started = await b.ok('POST', `/v1/booths/${booth.id}/start`);
    expect(new Date(started.startAt).getTime() - new Date(started.serverNow).getTime()).toBe(4500);
    expect(started.config.template).toBe('film');

    // Pratinjau langsung (terenkripsi di perangkat) lewat memori server.
    await a.req('POST', `/v1/booths/${booth.id}/preview`, undefined, new Uint8Array([7, 7, 7]));
    const pv = await b.ok('GET', `/v1/booths/${booth.id}`);
    expect(Object.keys(pv.previews)).toEqual([a.userId]);
    expect((await b.req('GET', `/v1/booths/${booth.id}/preview/${a.userId}`)).status).toBe(200);

    // Jepretan: media sendiri, terlihat oleh lingkaran, tidak oleh orang luar.
    const up = await a.req('POST', '/v1/media', undefined, new Uint8Array([1, 2, 3]));
    const done = await a.ok('PUT', `/v1/booths/${booth.id}/frames`, { envelope: seal(a, circle.id, { frames: [] }), mediaIds: [up.json.id] });
    expect(done.frames).toHaveLength(1);
    expect((await b.req('GET', `/v1/media/${up.json.id}`)).status).toBe(200);
    expect((await luar.req('GET', `/v1/media/${up.json.id}`)).status).toBe(404);
    const theirs = await luar.req('POST', '/v1/media', undefined, new Uint8Array([9]));
    expect((await b.req('PUT', `/v1/booths/${booth.id}/frames`, { envelope: seal(b, circle.id, {}), mediaIds: [theirs.json.id] })).status).toBe(400);

    // Foto ulang mengosongkan sesi.
    const reset = await b.ok('POST', `/v1/booths/${booth.id}/reset`);
    expect(reset.startAt).toBeNull();
    expect(reset.frames).toHaveLength(0);

    // Kedaluwarsa setelah 3 jam.
    env.setNow('2026-10-22T08:30:00Z');
    expect((await a.req('GET', `/v1/booths/${booth.id}`)).status).toBe(404);
  });
});
