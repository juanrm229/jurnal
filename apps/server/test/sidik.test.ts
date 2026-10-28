import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Client, setup } from './helpers';

let env: Awaited<ReturnType<typeof setup>>;
let host: Client;

beforeAll(async () => {
  env = await setup('2026-10-22T12:00:00Z');
  host = await new Client(env.app, 'sidik-host@contoh.id').signup('Dina');
});
afterAll(async () => env.services.close());

const guest = (token: string) => async (method: string, path: string, body?: unknown) => {
  const res = await env.app.request(path, { method, headers: { 'x-sidik-guest': token, ...(body ? { 'content-type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined });
  return { status: res.status, json: (await res.json()) as any };
};

describe('SIDIK di server', () => {
  it('buat ruang, tamu ikut tanpa akun, mulai, dan setiap orang hanya melihat miliknya', async () => {
    const room = await host.ok('POST', '/v1/sidik/rooms', { name: 'Dina', avatar: 'tunas' });
    expect(room.code).toMatch(/^[A-Z]{4}$/);
    const tamu = [guest('tamu-satu-0123456789'), guest('tamu-dua-0123456789'), guest('tamu-tiga-0123456789')];
    for (const [i, g] of tamu.entries()) expect((await g('POST', `/v1/sidik/rooms/${room.code}/join`, { name: `Tamu ${i}` })).status).toBe(200);
    // Tanpa nama/identitas tidak bisa ikut.
    expect((await env.app.request(`/v1/sidik/rooms/${room.code}/join`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: 'x' }) })).status).toBe(401);
    // Hanya tuan rumah yang memulai.
    expect((await tamu[0]!('POST', `/v1/sidik/rooms/${room.code}/act`, { action: { t: 'start' } })).status).toBe(400);
    const started = await host.ok('POST', `/v1/sidik/rooms/${room.code}/act`, { action: { t: 'start' } });
    expect(started.phase).toBe('intro');
    expect(started.players).toHaveLength(4);
    expect(started.suspects.length).toBeGreaterThanOrEqual(10);

    const views = await Promise.all(tamu.map((g) => g('GET', `/v1/sidik/rooms/${room.code}`)));
    const all = [started, ...views.map((v) => v.json)];
    // Setiap orang tahu perannya sendiri saja (kecuali tim jahat).
    for (const v of all) expect(v.me.role).toBeTruthy();
    const knowers = all.filter((v) => v.me.culprit !== null);
    expect(knowers.length).toBe(all.filter((v) => ['penyusup', 'kakitangan', 'peniru', 'forensik'].includes(v.me.role)).length);

    // Tampilan TV: tanpa rahasia siapa pun.
    const tv = await (await env.app.request(`/v1/sidik/rooms/${room.code}?tv=1`)).json();
    expect(tv.me).toBeNull();
    expect(tv.players.every((p: any) => p.role === null)).toBe(true);

    // Polling dengan rev yang sama dijawab singkat.
    const same = await host.ok('GET', `/v1/sidik/rooms/${room.code}?rev=${started.rev}`);
    expect(same.same).toBe(true);
  });

  it('kode salah → 404', async () => {
    expect((await host.req('GET', '/v1/sidik/rooms/ZZZZ')).status).toBe(404);
  });
});
