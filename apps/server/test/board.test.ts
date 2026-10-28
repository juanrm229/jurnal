import { sealEnvelope } from '@sehari/core';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Client, id, setup } from './helpers';

let env: Awaited<ReturnType<typeof setup>>;
let a: Client;
let b: Client;
let luar: Client;

beforeAll(async () => {
  env = await setup('2026-10-22T05:00:00Z');
  a = await new Client(env.app, 'papan-a@contoh.id').signup('Ayu');
  b = await new Client(env.app, 'papan-b@contoh.id').signup('Bima');
  luar = await new Client(env.app, 'papan-c@contoh.id').signup('Citra');
});
afterAll(async () => env.services.close());

describe('papan inspirasi', () => {
  it('tempel foto & incaran, anggota bisa melihat fotonya, orang luar tidak', async () => {
    const c = await a.createCircle('duo', 'Ayu & Bima');
    await b.accept(await a.invite(c.id));
    const up = await a.req('POST', '/v1/media', undefined, new Uint8Array([1, 2, 3, 4]));
    expect(up.status).toBe(201);
    const mediaId = up.json.id as string;
    const e = sealEnvelope({ v: 1, type: 'photo', title: 'tas kanvas', price: 'Rp120.000' }, [{ t: 'circle', circleId: c.id, epoch: 1, key: a.circleKeys.get(c.id)!.get(1)! }]);
    const pin = await a.ok('POST', `/v1/circles/${c.id}/board`, { id: id(), envelope: { ciphertext: e.ciphertext, recipients: e.recipients }, mediaIds: [mediaId] });
    expect(pin.mediaIds).toEqual([mediaId]);

    const list = await b.ok('GET', `/v1/circles/${c.id}/board`);
    expect(list).toHaveLength(1);
    expect((await b.req('GET', `/v1/media/${mediaId}`)).status).toBe(200);
    expect((await luar.req('GET', `/v1/media/${mediaId}`)).status).toBe(404);
    expect((await luar.req('GET', `/v1/circles/${c.id}/board`)).status).toBeGreaterThanOrEqual(400);

    // Siapa pun di lingkaran boleh menandai "sudah"; hanya penempel yang boleh melepas.
    expect((await b.ok('PATCH', `/v1/board/${pin.id}`, { done: true })).doneAt).not.toBeNull();
    expect((await b.req('DELETE', `/v1/board/${pin.id}`)).status).toBe(403);
    await a.ok('DELETE', `/v1/board/${pin.id}`);
    expect(await b.ok('GET', `/v1/circles/${c.id}/board`)).toHaveLength(0);
  });

  it('tidak bisa menempel foto milik orang lain', async () => {
    const c = await a.createCircle('circle', 'Geng');
    const up = await luar.req('POST', '/v1/media', undefined, new Uint8Array([9, 9]));
    const e = sealEnvelope({ v: 1, type: 'photo' }, [{ t: 'circle', circleId: c.id, epoch: 1, key: a.circleKeys.get(c.id)!.get(1)! }]);
    const r = await a.req('POST', `/v1/circles/${c.id}/board`, { id: id(), envelope: { ciphertext: e.ciphertext, recipients: e.recipients }, mediaIds: [up.json.id] });
    expect(r.status).toBe(400);
  });

  it('Niat Pagi bisa disimpan sebagai drop', async () => {
    const r = await a.req('POST', '/v1/drops', a.dropBody('2026-10-22', { kind: 'intent', text: 'pelan-pelan saja hari ini' }));
    expect(r.status).toBe(201);
  });
});
