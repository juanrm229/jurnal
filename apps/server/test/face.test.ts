import { openEnvelope, sealEnvelope, type FacePayload } from '@sehari/core';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Client, setup } from './helpers';

let env: Awaited<ReturnType<typeof setup>>;
let raka: Client;
let naya: Client;
let luar: Client;
let duo: string;
let dropId: string;
const DAY = '2026-10-22';

beforeAll(async () => {
  env = await setup('2026-10-22T05:00:00Z');
  raka = await new Client(env.app, 'raka-w@contoh.id').signup('Raka');
  naya = await new Client(env.app, 'naya-w@contoh.id').signup('Naya');
  luar = await new Client(env.app, 'luar-w@contoh.id').signup('Luar');
  duo = (await raka.createCircle('duo', 'Raka & Naya')).id;
  await naya.accept(await raka.invite(duo));
  const up = await raka.req('POST', '/v1/media', undefined, new Uint8Array([1, 2, 3]));
  dropId = (await raka.ok('POST', '/v1/drops', { ...raka.dropBody(DAY, { kind: 'photo' }, { circleId: duo }), mediaIds: [up.json.id], meta: { flash: 'snap' } })).id;
});
afterAll(async () => env.services.close());

async function face(c: Client, expression = 'ketawa') {
  const up = await c.req('POST', '/v1/media', undefined, new Uint8Array([7, 7, 7]));
  const key = c.circleKeys.get(duo)?.get(1);
  const payload: FacePayload = { v: 1, media: { id: up.json.id, key: 'k', mime: 'image/jpeg' } as never };
  const envl = sealEnvelope(payload, [
    { t: 'user', userId: c.userId, publicKey: c.identity.publicKey },
    ...(key ? [{ t: 'circle' as const, circleId: duo, epoch: 1, key }] : []),
  ]);
  return { res: await c.req('PUT', `/v1/drops/${dropId}/face`, { expression, envelope: { ciphertext: envl.ciphertext, recipients: envl.recipients }, mediaIds: [up.json.id] }), mediaId: up.json.id as string };
}

describe('reaksi wajah', () => {
  it('tersimpan, terenkripsi untuk lingkaran, dan dihitung sebagai pelukan', async () => {
    const { res, mediaId } = await face(naya);
    expect(res.status).toBe(200);
    const list = await raka.ok('GET', '/v1/flashes');
    const d = list.flashes.find((x: { id: string }) => x.id === dropId);
    expect(d.faces).toHaveLength(1);
    expect(d.faces[0]).toMatchObject({ userId: naya.userId, expression: 'ketawa', mediaIds: [mediaId] });
    expect(d.reactions).toContainEqual({ kind: 'hug', userId: naya.userId });
    const opened = openEnvelope<FacePayload>(d.faces[0].envelope, { userId: raka.userId, identity: raka.identity, circleKey: (c: string, e: number) => raka.circleKeys.get(c)?.get(e) });
    expect(opened.media.id).toBe(mediaId);
    // Penulis boleh mengunduh foto wajahnya.
    const m = await raka.req('GET', `/v1/media/${mediaId}`);
    expect(m.status).toBe(200);
  });

  it('mengabari penulis sekali; ganti ekspresi tidak mengabari lagi', async () => {
    await face(naya, 'terharu');
    const k = env.pusher.sent.filter((m) => m.to.includes('raka-w') && m.body.includes('wajah'));
    expect(k).toHaveLength(1);
    expect(k[0]!.body).toContain('kilasanmu');
    const list = await raka.ok('GET', '/v1/flashes');
    expect(list.flashes[0].faces[0].expression).toBe('terharu');
  });

  it('tidak untuk tulisan sendiri, dan orang luar tidak bisa', async () => {
    expect((await face(raka)).res.status).toBe(400);
    expect((await face(luar)).res.status).toBe(404);
  });

  it('bisa dihapus', async () => {
    await naya.ok('DELETE', `/v1/drops/${dropId}/face`);
    const list = await raka.ok('GET', '/v1/flashes');
    expect(list.flashes[0].faces).toHaveLength(0);
  });
});
