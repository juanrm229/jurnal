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
    expect((await patok(raka, 'lorongsumbu.12', 1952, 1981)).status).toBe(409);
    expect((await raka.req('PUT', '/v1/kota/profil', { penName: 'Padi Wangi' })).status).toBe(400);
    await raka.ok('PUT', '/v1/kota/profil', { penName: 'padiwangi' });
    expect((await naya.req('PUT', '/v1/kota/profil', { penName: 'padiwangi' })).status).toBe(409);
    await naya.ok('PUT', '/v1/kota/profil', { penName: 'lampukamis' });
    await sari.ok('PUT', '/v1/kota/profil', { penName: 'sari.kali' });
    await tono.ok('PUT', '/v1/kota/profil', { penName: 'tono' });
  });

  it('patok: wilayah harus dibuka, tahun sesuai, satu rumah per musim, tidak bertumpuk', async () => {
    expect((await patok(raka, 'pasirpengantin.1', 1952, 1981)).status).toBe(400);
    expect((await patok(raka, 'lorongsumbu.12', 1920, 1981)).status).toBe(400);
    const r = await patok(raka, 'lorongsumbu.12', 1952, 1981);
    expect(r.status).toBe(201);
    rumah = r.json;
    expect((await patok(raka, 'lorongsumbu.13', 1960, 1970)).status).toBe(409);
    expect((await patok(naya, 'lorongsumbu.12', 1981, 1990)).status).toBe(409);
    expect((await patok(naya, 'lorongsumbu.12', 1995, 2030, 'Keluarga Wirya')).status).toBe(201);
    const kota = await sari.ok('GET', '/v1/kota');
    expect(kota.claims.map((x: any) => [x.household, x.penName])).toEqual(expect.arrayContaining([['Keluarga Darmo', 'padiwangi'], ['Keluarga Wirya', 'lampukamis']]));
    expect(kota.me).toEqual({ penName: 'sari.kali', quota: 1, leluhur: 0 });
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
    const r = await patok(sari, 'tiangseribu.5', 1940, 1960, 'Keluarga Bandeng');
    expect(r.status).toBe(201);
    env.advanceDays(15);
    const kota = await tono.ok('GET', '/v1/kota');
    expect(kota.claims.find((x: any) => x.household === 'Keluarga Bandeng').state).toBe('terbengkalai');
    expect(kota.claims.find((x: any) => x.household === 'Keluarga Darmo').state).toBe('aktif');
    expect((await patok(tono, 'tiangseribu.5', 1945, 1950, 'Keluarga Teripang')).status).toBe(201);
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

  it('ketuk: pemeriksaan usia, jawaban pemilik, usul balik, silsilah, dan desas-desus saat rumah pergi', async () => {
    const tokoh = (c: Client, msId: string, name: string, born: number, died?: number) =>
      c.ok('POST', `/v1/naskah/${msId}/canon`, { id: `t${name.replace(/\W/g, '')}${born}`, kind: 'tokoh', envelope: { plain: { v: 1, kind: 'tokoh', name, aliases: [], known: [], born, died } } });
    const darmo = (await patok(raka, 'lorongsumbu.40', 1952, 1981, 'Keluarga Darmo')).json;
    const laras = (await patok(naya, 'tujuhlonceng.30', 1998, 2030, 'Kos Laras')).json;
    await tokoh(raka, darmo.msId, 'Pak Darmo', 1921, 1979);
    await tokoh(naya, laras.msId, 'Laras', 1977);
    const ketuk = (c: Client, from: any, ft: string, to: any, tt: string, type: string) =>
      c.req('POST', '/v1/kota/ketuk', { fromClaimId: from.id, fromTokoh: ft, toClaimId: to.id, toTokoh: tt, type, letter: 'Bu Sri, saya Laras. Ibu saya dulu menjahit di rumah Ibu.' });
    expect((await ketuk(naya, laras, 'tLaras1977', darmo, 'tPakDarmo1921', 'orangtua')).status).toBe(400);
    expect((await ketuk(raka, laras, 'tLaras1977', darmo, 'tPakDarmo1921', 'anak')).status).toBe(403);
    const k = await ketuk(naya, laras, 'tLaras1977', darmo, 'tPakDarmo1921', 'anak');
    expect(k.status).toBe(201);
    expect((await ketuk(naya, laras, 'tLaras1977', darmo, 'tPakDarmo1921', 'teman')).status).toBe(409);
    // Warga lain belum melihat ketukan yang menunggu; pemilik melihat suratnya.
    expect((await sari.ok('GET', `/v1/kota/claims/${darmo.id}/tautan`)).relations).toHaveLength(0);
    expect((await raka.ok('GET', `/v1/kota/claims/${darmo.id}/tautan`)).relations[0].letter).toMatch(/Laras/);
    expect((await naya.req('PUT', `/v1/kota/ketuk/${k.json.id}`, { action: 'kanon' })).status).toBe(403);
    expect((await raka.req('PUT', `/v1/kota/ketuk/${k.json.id}`, { action: 'usul', type: 'saudara' })).status).toBe(400);
    const after = await raka.ok('GET', `/v1/kota/claims/${darmo.id}/tautan`);
    expect(after.relations[0].state).toBe('ketuk');
    await raka.ok('PUT', `/v1/kota/ketuk/${k.json.id}`, { action: 'usul', type: 'teman' });
    await naya.ok('PUT', `/v1/kota/ketuk/${k.json.id}`, { action: 'terima' });
    const pub = await sari.ok('GET', `/v1/kota/claims/${darmo.id}/tautan`);
    expect(pub.relations[0]).toMatchObject({ state: 'kanon', type: 'teman', letter: null });
    expect(pub.tokoh.map((t: any) => t.name).sort()).toEqual(['Laras', 'Pak Darmo']);
    const sil = await sari.ok('GET', `/v1/kota/silsilah/${laras.id}`);
    expect(sil.claims.map((x: any) => x.household).sort()).toEqual(['Keluarga Darmo', 'Kos Laras']);
    // Rumah leluhur: harus dimulai sebelum rumah utama, dan pemiliknya sama jadi langsung kanon.
    expect((await raka.req('POST', '/v1/kota/claims', { plotId: 'tujuhlonceng.50', household: 'Keluarga Sitorus', from: 1960, to: 1990, kind: 'leluhur' })).status).toBe(400);
    const lel = await raka.ok('POST', '/v1/kota/claims', { plotId: 'tujuhlonceng.50', household: 'Keluarga Sitorus', from: 1900, to: 1960, kind: 'leluhur' });
    await tokoh(raka, lel.msId, 'Opa Sitorus', 1880, 1950);
    expect((await ketuk(raka, lel, 'tOpaSitorus1880', darmo, 'tPakDarmo1921', 'orangtua')).json.state).toBe('kanon');
    expect((await raka.ok('GET', '/v1/kota')).me).toMatchObject({ quota: 0, leluhur: 1 });
    // Rumah Laras pergi: hubungan turun jadi desas-desus.
    await naya.ok('DELETE', `/v1/kota/claims/${laras.id}`);
    const turun = await sari.ok('GET', `/v1/kota/claims/${darmo.id}/tautan`);
    expect(turun.relations.find((x: any) => x.id === k.json.id).state).toBe('desas');
  });
});
