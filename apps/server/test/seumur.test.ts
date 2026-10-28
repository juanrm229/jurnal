import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Client, setup } from './helpers';

let env: Awaited<ReturnType<typeof setup>>;
let host: Client;

beforeAll(async () => {
  env = await setup('2026-10-28T12:00:00Z');
  host = await new Client(env.app, 'seumur-host@contoh.id').signup('Laras');
});
afterAll(async () => env.services.close());

const guest = (token: string) => async (method: string, path: string, body?: unknown) => {
  const res = await env.app.request(path, { method, headers: { 'x-sidik-guest': token, ...(body ? { 'content-type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined });
  return { status: res.status, json: (await res.json()) as any };
};

describe('SEUMUR di server', () => {
  it('meja, fokus bersama, kartu hanya terlihat oleh pemegangnya', async () => {
    const room = await host.ok('POST', '/v1/seumur/rooms', { name: 'Laras', avatar: 'tunas' });
    const t = [guest('tamu-seumur-1-0123456789'), guest('tamu-seumur-2-0123456789')];
    for (const [i, g] of t.entries()) expect((await g('POST', `/v1/seumur/rooms/${room.code}/join`, { name: `Tamu ${i}` })).status).toBe(200);
    await host.ok('POST', `/v1/seumur/rooms/${room.code}/act`, { action: { t: 'start' } });
    await host.ok('POST', `/v1/seumur/rooms/${room.code}/act`, { action: { t: 'ready' } });
    for (const g of t) await g('POST', `/v1/seumur/rooms/${room.code}/act`, { action: { t: 'ready' } });
    await host.ok('POST', `/v1/seumur/rooms/${room.code}/act`, { action: { t: 'fokus', tahan: true } });
    for (const g of t) await g('POST', `/v1/seumur/rooms/${room.code}/act`, { action: { t: 'fokus', tahan: true } });
    const v = (await t[0]!('GET', `/v1/seumur/rooms/${room.code}`)).json;
    expect(v.phase).toBe('main');
    expect(v.mine.tangan).toHaveLength(1);
    expect(v.mine.tangan[0].usia).toBeUndefined();
    const tv = await (await env.app.request(`/v1/seumur/rooms/${room.code}?tv=1`)).json();
    expect(tv.mine).toBeNull();
  });
});
