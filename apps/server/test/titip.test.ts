import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Client, setup } from './helpers';

let env: Awaited<ReturnType<typeof setup>>;
let host: Client;

beforeAll(async () => {
  env = await setup('2026-10-28T12:00:00Z');
  host = await new Client(env.app, 'titip-host@contoh.id').signup('Rani');
});
afterAll(async () => env.services.close());

const guest = (token: string) => async (method: string, path: string, body?: unknown) => {
  const res = await env.app.request(path, { method, headers: { 'x-sidik-guest': token, ...(body ? { 'content-type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined });
  return { status: res.status, json: (await res.json()) as any };
};

describe('Titip Surat di server', () => {
  it('meja dengan tamu dan bot, kartu tiap orang rahasia, kode SIDIK tidak tertukar', async () => {
    const room = await host.ok('POST', '/v1/titip/rooms', { name: 'Rani', avatar: 'kucing' });
    const tamu = guest('tamu-titip-0123456789');
    expect((await tamu('POST', `/v1/titip/rooms/${room.code}/join`, { name: 'Bima' })).status).toBe(200);
    expect((await tamu('POST', `/v1/titip/rooms/${room.code}/act`, { action: { t: 'bot', tambah: true } })).status).toBe(400);
    await host.ok('POST', `/v1/titip/rooms/${room.code}/act`, { action: { t: 'bot', tambah: true } });
    const v = await host.ok('POST', `/v1/titip/rooms/${room.code}/act`, { action: { t: 'mulai' } });
    expect(v.phase).toBe('main');
    expect(v.players).toHaveLength(3);
    expect(v.me.hand.length).toBeGreaterThanOrEqual(1);
    expect(JSON.stringify(v.players)).not.toContain('hand');
    const tv = await (await env.app.request(`/v1/titip/rooms/${room.code}?tv=1`)).json();
    expect(tv.me).toBeNull();
    expect((await env.app.request(`/v1/sidik/rooms/${room.code}`)).status).toBe(404);
  });

  it('Kartu Satu: preset tongkrongan, mulai, kode tidak tertukar dengan Titip Surat', async () => {
    const room = await host.ok('POST', '/v1/satu/rooms', { name: 'Rani', avatar: 'kucing' });
    await host.ok('POST', `/v1/satu/rooms/${room.code}/act`, { action: { t: 'preset', nama: 'tongkrongan' } });
    await host.ok('POST', `/v1/satu/rooms/${room.code}/act`, { action: { t: 'bot', tambah: true } });
    const v = await host.ok('POST', `/v1/satu/rooms/${room.code}/act`, { action: { t: 'mulai' } });
    expect(v.preset).toBe('tongkrongan');
    expect(v.me.hand.length).toBeGreaterThanOrEqual(7);
    expect((await env.app.request(`/v1/titip/rooms/${room.code}`)).status).toBe(404);
  });
});
