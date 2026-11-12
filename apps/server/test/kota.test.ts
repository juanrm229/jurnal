import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Client, setup } from './helpers';

let env: Awaited<ReturnType<typeof setup>>;
let raka: Client;
let naya: Client;
let sari: Client;
let tono: Client;
let rumah: { id: string; msId: string };

beforeAll(async () => {
  env = await setup('2026-11-12T05:00:00Z');
  raka = await new Client(env.app, 'raka-k@contoh.id').signup('Raka');
  naya = await new Client(env.app, 'naya-k@contoh.id').signup('Naya');
  sari = await new Client(env.app, 'sari-k@contoh.id').signup('Sari');
  tono = await new Client(env.app, 'tono-k@contoh.id').signup('Tono');
});
afterAll(async () => env.services.close());

const patok = (c: Client, plotId: string, from: number, to: number, household = 'Keluarga Darmo') => c.req('POST', '/v1/kota/claims', { plotId, household, from, to });

describe('kota sehari', () => {
  it('nama pena wajib dan unik sebelum mematok', async () => {
    expect((await patok(raka, 'bantaran.12', 1952, 1981)).status).toBe(409);
    expect((await raka.req('PUT', '/v1/kota/profil', { penName: 'Padi Wangi' })).status).toBe(400);
    await raka.ok('PUT', '/v1/kota/profil', { penName: 'padiwangi' });
    expect((await naya.req('PUT', '/v1/kota/profil', { penName: 'padiwangi' })).status).toBe(409);
    await naya.ok('PUT', '/v1/kota/profil', { penName: 'lampukamis' });
    await sari.ok('PUT', '/v1/kota/profil', { penName: 'sari.kali' });
    await tono.ok('PUT', '/v1/kota/profil', { penName: 'tono' });
  });

  it('patok: wilayah harus dibuka, tahun sesuai, satu rumah per musim, tidak bertumpuk', async () => {
    expect((await patok(raka, 'pantai.1', 1952, 1981)).status).toBe(400);
    expect((await patok(raka, 'bantaran.12', 1920, 1981)).status).toBe(400);
    const r = await patok(raka, 'bantaran.12', 1952, 1981);
    expect(r.status).toBe(201);
    rumah = r.json;
    expect((await patok(raka, 'bantaran.13', 1960, 1970)).status).toBe(409);
    expect((await patok(naya, 'bantaran.12', 1981, 1990)).status).toBe(409);
    expect((await patok(naya, 'bantaran.12', 1995, 2030, 'Keluarga Wirya')).status).toBe(201);
    const kota = await sari.ok('GET', '/v1/kota');
    expect(kota.claims.map((x: any) => [x.household, x.penName])).toEqual(expect.arrayContaining([['Keluarga Darmo', 'padiwangi'], ['Keluarga Wirya', 'lampukamis']]));
    expect(kota.me).toEqual({ penName: 'sari.kali', quota: 1 });
  });

  it('isi rumah: naskah terbuka; warga membaca adegan terbit saja, hanya pemilik yang menulis', async () => {
    const plain = (v: unknown) => ({ plain: v });
    expect((await raka.req('POST', `/v1/naskah/${rumah.msId}/scenes`, { id: 'adegan1x', chapter: 1, order: 1, envelope: { ciphertext: 'AAAA', recipients: [] } })).status).toBe(400);
    await raka.ok('POST', `/v1/naskah/${rumah.msId}/scenes`, { id: 'adegan1x', chapter: 1, order: 1, envelope: plain({ v: 1, pov: 't', when: { label: '1979', sort: '1979' }, text: 'Air naik.' }), status: 'terbit' });
    await raka.ok('POST', `/v1/naskah/${rumah.msId}/scenes`, { id: 'adegan2x', chapter: 1, order: 2, envelope: plain({ v: 1, pov: 't', when: { label: '', sort: '' }, text: 'draf' }) });
    const seen = await sari.ok('GET', `/v1/naskah/${rumah.msId}`);
    expect(seen.visibility).toBe('kota');
    expect(seen.scenes.map((x: any) => x.id)).toEqual(['adegan1x']);
    expect(seen.scenes[0].envelope.plain.text).toBe('Air naik.');
    expect((await sari.req('POST', `/v1/naskah/${rumah.msId}/scenes`, { id: 'adegan3x', chapter: 1, order: 3, envelope: plain({}) })).status).toBe(404);
    expect((await sari.ok('GET', `/v1/kota/claims/${rumah.id}`)).scenes).toBe(1);
  });

  it('rumah tanpa adegan terbit jadi terbengkalai dan persilnya lowong lagi', async () => {
    const r = await patok(sari, 'kampungair.5', 1940, 1960, 'Keluarga Bandeng');
    expect(r.status).toBe(201);
    env.advanceDays(15);
    const kota = await tono.ok('GET', '/v1/kota');
    expect(kota.claims.find((x: any) => x.household === 'Keluarga Bandeng').state).toBe('terbengkalai');
    expect(kota.claims.find((x: any) => x.household === 'Keluarga Darmo').state).toBe('aktif');
    expect((await patok(tono, 'kampungair.5', 1945, 1950, 'Keluarga Teripang')).status).toBe(201);
    expect((await sari.ok('GET', '/v1/kota')).me.quota).toBe(1);
  });

  it('laporan dari tiga warga menyembunyikan rumah; melepas rumah mengosongkan persil', async () => {
    const wirya = (await raka.ok('GET', '/v1/kota')).claims.find((x: any) => x.household === 'Keluarga Wirya');
    expect((await naya.req('POST', `/v1/kota/claims/${wirya.id}/report`, { reason: 'spam' })).status).toBe(400);
    for (const c of [raka, sari, tono]) await c.ok('POST', `/v1/kota/claims/${wirya.id}/report`, { reason: 'spam' });
    expect((await raka.ok('GET', '/v1/kota')).claims.some((x: any) => x.id === wirya.id)).toBe(false);
    expect((await raka.req('GET', `/v1/naskah/${wirya.msId}`)).status).toBe(404);
    expect((await naya.req('DELETE', `/v1/kota/claims/${rumah.id}`)).status).toBe(403);
    await raka.ok('DELETE', `/v1/kota/claims/${rumah.id}`);
    expect((await sari.req('GET', `/v1/naskah/${rumah.msId}`)).status).toBe(404);
    expect((await raka.ok('GET', `/v1/naskah/${rumah.msId}`)).visibility).toBe('arsip');
  });
});
