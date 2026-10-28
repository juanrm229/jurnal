import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Client, setup } from './helpers';

let env: Awaited<ReturnType<typeof setup>>;
let host: Client;

beforeAll(async () => {
  env = await setup('2026-10-28T12:00:00Z');
  host = await new Client(env.app, 'segel-host@contoh.id').signup('Nara');
});
afterAll(async () => env.services.close());

const guest = (token: string) => async (method: string, path: string, body?: unknown) => {
  const res = await env.app.request(path, { method, headers: { 'x-sidik-guest': token, ...(body ? { 'content-type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined });
  return { status: res.status, json: (await res.json()) as any };
};

describe('SEBELUM DISEGEL di server', () => {
  it('meja, kubu rahasia, dan berkas hanya untuk pemegangnya', async () => {
    const room = await host.ok('POST', '/v1/segel/rooms', { name: 'Nara', avatar: 'tunas' });
    expect(room.code).toMatch(/^[A-Z]{4}$/);
    const tamu = Array.from({ length: 5 }, (_, i) => guest(`tamu-segel-${i}-0123456789`));
    for (const [i, g] of tamu.entries()) expect((await g('POST', `/v1/segel/rooms/${room.code}/join`, { name: `Tamu ${i}` })).status).toBe(200);
    expect((await tamu[0]!('POST', `/v1/segel/rooms/${room.code}/act`, { action: { t: 'start' } })).status).toBe(400);
    const started = await host.ok('POST', `/v1/segel/rooms/${room.code}/act`, { action: { t: 'start' } });
    expect(started.phase).toBe('intro');
    expect(started.players).toHaveLength(6);
    const views = [started, ...(await Promise.all(tamu.map((g) => g('GET', `/v1/segel/rooms/${room.code}`)))).map((v) => v.json)];
    // Tepat satu Revisi; hanya dia yang tahu dunia aktual.
    expect(views.filter((v) => v.mine.kubu === 'revisi')).toHaveLength(1);
    expect(views.filter((v) => v.mine.revisi)).toHaveLength(1);
    // Berkas bab 1: setiap orang memegang satu, isinya hanya di tangannya.
    for (const v of views) expect(v.mine.copies).toHaveLength(1);
    const tv = await (await env.app.request(`/v1/segel/rooms/${room.code}?tv=1`)).json();
    expect(tv.mine).toBeNull();
    expect(tv.players.every((p: any) => p.kubu === undefined && p.prof === undefined)).toBe(true);
    expect(JSON.stringify(tv)).not.toContain('"w":');
    // Aksi tidak sah ditolak dengan pesan.
    const bad = await tamu[1]!('POST', `/v1/segel/rooms/${room.code}/act`, { action: { t: 'aksi', main: { k: 'diam' } } });
    expect(bad.status).toBe(400);
  });

  it('kode salah → 404', async () => {
    expect((await env.app.request('/v1/segel/rooms/ZZZZ')).status).toBe(404);
  });
});
