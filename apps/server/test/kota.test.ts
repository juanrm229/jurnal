import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Client, setup } from './helpers';
import { antarSuratKota } from '../src/lib/kotaPos';
import { loncengKetujuh } from '../src/lib/kotaLonceng';

let env: Awaited<ReturnType<typeof setup>>;
let raka: Client;
let naya: Client;
let sari: Client;
let tono: Client;
let ana: Client;
let bima: Client;
let rumah: { id: string; msId: string };

beforeAll(async () => {
  env = await setup('2026-11-12T05:00:00Z');
  raka = await new Client(env.app, 'raka-k@contoh.id').signup('Raka');
  naya = await new Client(env.app, 'naya-k@contoh.id').signup('Naya');
  sari = await new Client(env.app, 'sari-k@contoh.id').signup('Sari');
  tono = await new Client(env.app, 'tono-k@contoh.id').signup('Tono');
});
afterAll(async () => env.services.close());

const patok = (c: Client, plotId: string, from: number, to: number, household = 'Keluarga Darmo', tokoh: Record<string, unknown> = { name: `Kepala ${household}` }) =>
  c.req('POST', '/v1/kota/claims', { plotId, household, from, to, tokoh });

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
    // Patok kedua dengan tokoh baru harus keluarga tokohmu (atau di persil yang sama).
    expect((await patok(raka, 'lorongsumbu.13', 1960, 1970)).status).toBe(400);
    expect((await raka.req('POST', '/v1/kota/claims', { plotId: 'lorongsumbu.14', household: 'Kosong', from: 1960, to: 1970 })).status).toBe(400);
    expect((await patok(naya, 'lorongsumbu.12', 1981, 1990)).status).toBe(409);
    expect((await patok(naya, 'lorongsumbu.12', 1995, 2030, 'Keluarga Wirya')).status).toBe(201);
    const kota = await sari.ok('GET', '/v1/kota');
    expect(kota.claims.map((x: any) => [x.household, x.penName])).toEqual(expect.arrayContaining([['Keluarga Darmo', 'padiwangi'], ['Keluarga Wirya', 'lampukamis']]));
    expect(kota.me).toEqual({ penName: 'sari.kali', penaLama: [], penaBolehGanti: null, patok: { pakai: 0, maks: 3 }, tokoh: { pakai: 0, maks: 3 }, tokohku: [], undangan: [] });
    expect((await raka.ok('GET', '/v1/kota')).me.tokohku.map((x: any) => x.name)).toEqual(['Kepala Keluarga Darmo']);
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
    expect((await sari.ok('GET', '/v1/kota')).me).toMatchObject({ patok: { pakai: 0 }, tokoh: { pakai: 0 } });
  });

  it('laporan dari tiga warga menyembunyikan rumah; melepas rumah mengosongkan persil', async () => {
    const wirya = (await raka.ok('GET', '/v1/kota')).claims.find((x: any) => x.household === 'Keluarga Wirya');
    expect((await naya.req('POST', `/v1/kota/claims/${wirya.id}/report`, { reason: 'spam' })).status).toBe(400);
    for (const c of [raka, sari, tono]) await c.ok('POST', `/v1/kota/claims/${wirya.id}/report`, { reason: 'spam' });
    expect((await raka.ok('GET', '/v1/kota')).claims.some((x: any) => x.id === wirya.id)).toBe(false);
    expect((await raka.req('GET', `/v1/naskah/${wirya.msId}`)).status).toBe(404);
    expect((await naya.req('DELETE', `/v1/kota/claims/${rumah.id}`)).status).toBe(403);
    // Rumah yang sudah punya adegan terbit berakar: tidak bisa dilepas.
    expect((await raka.req('DELETE', `/v1/kota/claims/${rumah.id}`)).status).toBe(409);
    await raka.ok('DELETE', `/v1/naskah/${rumah.msId}/scenes/adegan1x`);
    await raka.ok('DELETE', `/v1/kota/claims/${rumah.id}`);
    expect((await sari.req('GET', `/v1/naskah/${rumah.msId}`)).status).toBe(404);
    expect((await raka.ok('GET', `/v1/naskah/${rumah.msId}`)).visibility).toBe('arsip');
  });

  it('ketuk: pemeriksaan usia, jawaban pemilik, usul balik, silsilah, dan desas-desus saat rumah pergi', async () => {
    const tokoh = (c: Client, msId: string, name: string, born: number, died?: number) =>
      c.ok('POST', `/v1/naskah/${msId}/canon`, { id: `t${name.replace(/\W/g, '')}${born}`, kind: 'tokoh', envelope: { plain: { v: 1, kind: 'tokoh', name, aliases: [], known: [], born, died } } });
    const darmo = (await patok(raka, 'lorongsumbu.40', 1952, 1981, 'Keluarga Darmo', { id: 'tPakDarmo1921', name: 'Pak Darmo', born: 1921, died: 1979 })).json;
    const laras = (await patok(naya, 'tujuhlonceng.30', 1998, 2030, 'Kos Laras', { id: 'tLaras1977', name: 'Laras', born: 1977 })).json;
    const ketuk = (c: Client, from: any, ft: string, to: any, tt: string, type: string) =>
      c.req('POST', '/v1/kota/ketuk', { fromClaimId: from.id, fromTokoh: ft, toClaimId: to.id, toTokoh: tt, type, letter: 'Bu Sri, saya Laras. Ibu saya dulu menjahit di rumah Ibu.' });
    expect((await ketuk(naya, laras, 'tLaras1977', darmo, 'tPakDarmo1921', 'orangtua')).status).toBe(400);
    expect((await ketuk(raka, laras, 'tLaras1977', darmo, 'tPakDarmo1921', 'anak')).status).toBe(403);
    const k = await ketuk(naya, laras, 'tLaras1977', darmo, 'tPakDarmo1921', 'anak');
    expect(k.status).toBe(201);
    expect((await ketuk(naya, laras, 'tLaras1977', darmo, 'tPakDarmo1921', 'teman')).status).toBe(409);
    // Pos Sangkala: surat masih diantar Bang Jamil; tuan rumah belum melihat dan belum bisa menjawab.
    expect(k.json.sampaiAt).toBeTruthy();
    expect((await raka.ok('GET', `/v1/kota/claims/${darmo.id}/tautan`)).relations).toHaveLength(0);
    expect((await raka.req('PUT', `/v1/kota/ketuk/${k.json.id}`, { action: 'kanon' })).status).toBe(409);
    expect((await naya.ok('GET', '/v1/kota/surat'))[0]).toMatchObject({ jenis: 'ketuk', arah: 'keluar', sampai: false });
    expect(await raka.ok('GET', '/v1/kota/surat')).toHaveLength(0);
    env.advanceDays(1);
    expect((await raka.ok('GET', '/v1/kota/surat'))[0]).toMatchObject({ jenis: 'ketuk', arah: 'masuk', sampai: true, dari: 'Laras · Kos Laras' });
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
    // Rumah keluarga: tokoh baru harus diikat sebagai keluarga; ikatan langsung kanon.
    const sitorus = { plotId: 'tujuhlonceng.50', household: 'Keluarga Sitorus', from: 1900, to: 1960, tokoh: { id: 'tOpaSitorus1880', name: 'Opa Sitorus', born: 1880, died: 1950 } };
    expect((await raka.req('POST', '/v1/kota/claims', sitorus)).status).toBe(400);
    expect((await raka.req('POST', '/v1/kota/claims', { ...sitorus, ikat: { tokohId: 'tPakDarmo1921', type: 'anak' } })).status).toBe(400);
    const lel = await raka.ok('POST', '/v1/kota/claims', { ...sitorus, ikat: { tokohId: 'tPakDarmo1921', type: 'orangtua' } });
    const ikatan = (await sari.ok('GET', `/v1/kota/claims/${darmo.id}/tautan`)).relations.find((x: any) => x.fromClaimId === lel.id);
    expect(ikatan).toMatchObject({ type: 'orangtua', state: 'kanon', fromTokoh: 'tOpaSitorus1880', toTokoh: 'tPakDarmo1921' });
    // Tokoh pindah rumah: orang yang sama, tidak memakai jatah tokoh.
    expect((await raka.req('POST', '/v1/kota/claims', { plotId: 'tujuhlonceng.60', household: 'Rumah Dinas', from: 1985, to: 1990, pindah: ['tPakDarmo1921'] })).status).toBe(400);
    const dinas = await raka.ok('POST', '/v1/kota/claims', { plotId: 'tujuhlonceng.60', household: 'Rumah Dinas', from: 1940, to: 1951, pindah: ['tPakDarmo1921'] });
    const me = (await raka.ok('GET', '/v1/kota')).me;
    expect(me).toMatchObject({ patok: { pakai: 3, maks: 3 }, tokoh: { pakai: 2, maks: 3 } });
    expect(me.tokohku.find((x: any) => x.id === 'tPakDarmo1921').rumah).toEqual([darmo.id, dinas.id]);
    const salinan = (await raka.ok('GET', `/v1/naskah/${dinas.msId}`)).canon[0];
    expect(salinan.envelope.plain).toMatchObject({ name: 'Pak Darmo', born: 1921, asal: { claimId: darmo.id, tokohId: 'tPakDarmo1921' } });
    expect((await patok(raka, 'tujuhlonceng.70', 1950, 1960, 'Rumah Keempat')).status).toBe(409);
    // Jatah tokoh: tokoh utama ketiga boleh, keempat ditolak; figuran bebas; pindahan tidak bisa dibuat di Kanon.
    await tokoh(raka, darmo.msId, 'Bu Darmo', 1925);
    expect((await raka.req('POST', `/v1/naskah/${darmo.msId}/canon`, { id: 'tKeempat0001', kind: 'tokoh', envelope: { plain: { v: 1, kind: 'tokoh', name: 'Keempat', aliases: [], known: [] } } })).status).toBe(409);
    await raka.ok('POST', `/v1/naskah/${darmo.msId}/canon`, { id: 'tFiguran0001', kind: 'tokoh', envelope: { plain: { v: 1, kind: 'tokoh', name: 'Mang Ujang', aliases: [], known: [], peran: 'figuran' } } });
    expect((await raka.req('PUT', `/v1/naskah/${darmo.msId}/canon/tFiguran0001`, { envelope: { plain: { v: 1, kind: 'tokoh', name: 'Mang Ujang', aliases: [], known: [], peran: 'utama' } } })).status).toBe(409);
    expect((await raka.req('POST', `/v1/naskah/${dinas.msId}/canon`, { id: 'tPalsu00001', kind: 'tokoh', envelope: { plain: { v: 1, kind: 'tokoh', name: 'Palsu', aliases: [], known: [], asal: { claimId: darmo.id, tokohId: 'tPakDarmo1921' } } } })).status).toBe(400);
    // Nama asli diubah: salinannya ikut.
    await raka.ok('PUT', `/v1/naskah/${darmo.msId}/canon/tPakDarmo1921`, { envelope: { plain: { v: 1, kind: 'tokoh', name: 'Pak Darmo Wiryo', aliases: [], known: [], born: 1921, died: 1979 } } });
    expect((await raka.ok('GET', `/v1/naskah/${dinas.msId}`)).canon[0].envelope.plain.name).toBe('Pak Darmo Wiryo');
    await raka.ok('PUT', `/v1/naskah/${darmo.msId}/canon/tPakDarmo1921`, { envelope: { plain: { v: 1, kind: 'tokoh', name: 'Pak Darmo', aliases: [], known: [], born: 1921, died: 1979 } } });
    await raka.ok('DELETE', `/v1/naskah/${darmo.msId}/canon/tFiguran0001`);
    // Rumah Laras pergi: hubungan turun jadi desas-desus.
    await naya.ok('DELETE', `/v1/kota/claims/${laras.id}`);
    const turun = await sari.ok('GET', `/v1/kota/claims/${darmo.id}/tautan`);
    expect(turun.relations.find((x: any) => x.id === k.json.id).state).toBe('desas');
  });

  it('almanak: peristiwa awal kanon, usulan warga butuh dua persetujuan, kesaksian terkumpul di halaman peristiwa', async () => {
    const awal = await sari.ok('GET', '/v1/kota/almanak');
    expect(awal.find((e: any) => e.id === 'awal.banjir')).toMatchObject({ state: 'kanon', year: 1979 });
    const usul = { title: 'Festival layang-layang pertama', year: 1986, month: 8, regions: ['lorongsumbu'], body: 'Langit di atas Kali Sirah penuh layang-layang dari kertas minyak.' };
    // Warga tanpa rumah tidak bisa mengusulkan.
    const tamu = await new Client(env.app, 'tamu-k@contoh.id').signup('Tamu');
    expect((await tamu.req('POST', '/v1/kota/almanak', usul)).status).toBe(403);
    const r = await raka.req('POST', '/v1/kota/almanak', usul);
    expect(r.status).toBe(201);
    expect((await raka.req('PUT', `/v1/kota/almanak/${r.json.id}`, { action: 'setuju' })).status).toBe(400);
    expect((await sari.req('PUT', `/v1/kota/almanak/${r.json.id}`, { action: 'setuju' })).status).toBe(403);
    expect((await patok(sari, 'tujuhlonceng.80', 1950, 1990, 'Keluarga Kapur')).status).toBe(201);
    const satu = await sari.ok('PUT', `/v1/kota/almanak/${r.json.id}`, { action: 'setuju' });
    expect(satu.state).toBe('usul');
    const dua = await tono.ok('PUT', `/v1/kota/almanak/${r.json.id}`, { action: 'setuju' });
    expect(dua.state).toBe('kanon');
    // Kesaksian: adegan terbit di rumah kota yang menandai peristiwa.
    const rumahRaka = (await raka.ok('GET', '/v1/kota')).claims.find((x: any) => x.mine && x.kind === 'rumah');
    await raka.ok('POST', `/v1/naskah/${rumahRaka.msId}/scenes`, { id: 'saksi001x', chapter: 2, order: 1, status: 'terbit', envelope: { plain: { v: 1, pov: 'tPakDarmo1921', when: { label: 'malam kedua', sort: '1979-02-15' }, text: 'Air naik sejengkal tiap kali azan.', peristiwa: 'awal.banjir', saksi: 'mengalami' } } });
    const banjir = await sari.ok('GET', '/v1/kota/peristiwa/awal.banjir');
    expect(banjir.testimonies).toHaveLength(1);
    expect(banjir.testimonies[0]).toMatchObject({ household: 'Keluarga Darmo', tokoh: 'Pak Darmo', saksi: 'mengalami' });
    expect((await sari.ok('GET', '/v1/kota/almanak')).find((e: any) => e.id === 'awal.banjir').testimonies).toBe(1);
    expect((await raka.ok('GET', `/v1/kota/naskah/${rumahRaka.msId}`)).id).toBe(rumahRaka.id);
  });

  it('buku warga: figuran awal kanon; perubahan besar butuh persetujuan; perjumpaan terkumpul', async () => {
    const semua = await sari.ok('GET', '/v1/kota/warga');
    expect(semua.find((f: any) => f.id === 'warga.jamil')).toMatchObject({ state: 'kanon', name: 'Bang Jamil' });
    // Usul wafat Bang Jamil: sah setelah dua warga lain setuju, lalu lembarnya berubah.
    const u = await raka.ok('POST', '/v1/kota/warga/warga.jamil/ubah', { kind: 'wafat', text: 'Wafat di atas sepedanya, di tikungan Gg. Sampan.', year: 2019 });
    expect((await raka.req('POST', '/v1/kota/warga/warga.tembang/ubah', { kind: 'wafat', text: 'wafat lagi di pasar', year: 1990 })).status).toBe(409);
    await sari.ok('PUT', `/v1/kota/ubah/${u.id}`, { action: 'setuju' });
    await tono.ok('PUT', `/v1/kota/ubah/${u.id}`, { action: 'setuju' });
    const jamil = (await sari.ok('GET', '/v1/kota/warga')).find((f: any) => f.id === 'warga.jamil');
    expect(jamil.died).toBe(2019);
    expect(jamil.ubah[0]).toMatchObject({ state: 'kanon', kind: 'wafat' });
    // Figuran baru usulan warga.
    const baru = await raka.ok('POST', '/v1/kota/warga', { name: 'Cik Nur', julukan: 'penjual kue putu', region: 'lorongsumbu', tempat: 'mulut Gg. Kemiri', ciri: 'Peluit kukusan putunya terdengar dari ujung gang setiap magrib.', born: 1950, tetap: [] });
    expect((await raka.req('POST', '/v1/kota/warga', { name: 'Mbah Tembang', region: 'pasarsenja', tempat: 'tangga', ciri: 'nama yang sama dengan figuran lain' })).status).toBe(409);
    await sari.ok('PUT', `/v1/kota/warga/${baru.id}`, { action: 'setuju' });
    expect((await tono.ok('PUT', `/v1/kota/warga/${baru.id}`, { action: 'setuju' })).state).toBe('kanon');
    // Perjumpaan: adegan terbit yang mencatat figuran.
    const rumahRaka = (await raka.ok('GET', '/v1/kota')).claims.find((x: any) => x.mine && x.kind === 'rumah');
    await raka.ok('POST', `/v1/naskah/${rumahRaka.msId}/scenes`, { id: 'jumpa001x', chapter: 3, order: 1, status: 'terbit', envelope: { plain: { v: 1, pov: 'tPakDarmo1921', when: { label: 'sore', sort: '1975' }, text: 'Mbah Tembang berhenti bernyanyi saat lonceng berbunyi.', jumpa: ['warga.tembang'] } } });
    const tembang = await tono.ok('GET', '/v1/kota/warga/warga.tembang');
    expect(tembang.perjumpaan.map((x: any) => x.household)).toEqual(['Keluarga Darmo']);
    expect(tembang.figur.jumpa).toBe(1);
    // Indeks nama: warga rumah dan figuran kota.
    const nama = await sari.ok('GET', '/v1/kota/nama');
    expect(nama.some((n: any) => n.kind === 'figur' && n.name === 'Cik Nur')).toBe(true);
    expect(nama.some((n: any) => n.kind === 'warga' && n.name === 'Pak Darmo')).toBe(true);
  });

  it('memegang figuran rumah: hanya figuran, pemilik memutuskan, pemegang hanya menulis tokoh yang dipegangnya', async () => {
    const rumahRaka = (await raka.ok('GET', '/v1/kota')).claims.find((x: any) => x.mine && x.kind === 'rumah');
    await raka.ok('POST', `/v1/naskah/${rumahRaka.msId}/canon`, { id: 'tBuSri00001', kind: 'tokoh', envelope: { plain: { v: 1, kind: 'tokoh', name: 'Bu Sri', aliases: [], known: [], peran: 'figuran', born: 1926 } } });
    expect((await tono.req('POST', '/v1/kota/pegang', { claimId: rumahRaka.id, tokohId: 'tPakDarmo1921', letter: 'Aku ingin menulis Pak Darmo.' })).status).toBe(400);
    const minta = await tono.ok('POST', '/v1/kota/pegang', { claimId: rumahRaka.id, tokohId: 'tBuSri00001', letter: 'Aku ingin menulis Bu Sri dari mesin jahitnya.' });
    expect((await tono.req('POST', `/v1/naskah/${rumahRaka.msId}/scenes`, { id: 'sri00001x', chapter: 1, order: 9, envelope: { plain: { v: 1, pov: 'tBuSri00001', when: { label: '', sort: '' }, text: 'x' } } })).status).toBe(404);
    expect((await tono.req('PUT', `/v1/kota/pegang/${minta.id}`, { action: 'terima' })).status).toBe(403);
    expect((await raka.req('PUT', `/v1/kota/pegang/${minta.id}`, { action: 'terima' })).status).toBe(409);
    env.advanceDays(1);
    await raka.ok('PUT', `/v1/kota/pegang/${minta.id}`, { action: 'terima' });
    // Pemegang menulis dari Bu Sri, tapi tidak dari Pak Darmo, dan tidak mengubah kanon Pak Darmo.
    await tono.ok('POST', `/v1/naskah/${rumahRaka.msId}/scenes`, { id: 'sri00001x', chapter: 1, order: 9, envelope: { plain: { v: 1, pov: 'tBuSri00001', when: { label: '', sort: '' }, text: 'Mesin jahit berhenti.' } } });
    expect((await tono.req('POST', `/v1/naskah/${rumahRaka.msId}/scenes`, { id: 'darmo002x', chapter: 1, order: 10, envelope: { plain: { v: 1, pov: 'tPakDarmo1921', when: { label: '', sort: '' }, text: 'x' } } })).status).toBe(403);
    expect((await tono.req('PUT', `/v1/naskah/${rumahRaka.msId}/canon/tPakDarmo1921`, { envelope: { plain: { v: 1, kind: 'tokoh', name: 'Darmo palsu', aliases: [], known: [] } } })).status).toBe(403);
    expect((await tono.req('POST', `/v1/naskah/${rumahRaka.msId}/works`, { id: 'karya0001', bentuk: 'novel', envelope: { plain: { v: 1, title: 'x' } } })).status).toBe(403);
    const t = await sari.ok('GET', `/v1/kota/claims/${rumahRaka.id}/tautan`);
    expect(t.pegang).toEqual([expect.objectContaining({ tokoh: 'Bu Sri', state: 'pegang', letter: null })]);
    await tono.ok('PUT', `/v1/kota/pegang/${minta.id}`, { action: 'lepas' });
    expect((await tono.req('POST', `/v1/naskah/${rumahRaka.msId}/scenes`, { id: 'sri00002x', chapter: 1, order: 11, envelope: { plain: { v: 1, pov: 'tBuSri00001', when: { label: '', sort: '' }, text: 'x' } } })).status).toBe(404);
  });

  it('konsistensi: rumah lowong tak hidup lagi, masa hidup tokoh, tautan tak dihapus sepihak, perjumpaan semasa', async () => {
    ana = await new Client(env.app, 'ana-k@contoh.id').signup('Ana');
    bima = await new Client(env.app, 'bima-k@contoh.id').signup('Bima');
    await ana.ok('PUT', '/v1/kota/profil', { penName: 'ana.kota' });
    await bima.ok('PUT', '/v1/kota/profil', { penName: 'bima.kota' });
    const lama = (await patok(ana, 'tiangseribu.20', 1950, 1970, 'Keluarga Lama', { id: 'tAnaLama001', name: 'Ana Lama', born: 1940 })).json;
    env.advanceDays(15);
    const adegan = (id: string, pov: string, sort: string, text: string, extra = {}) => ({ id, chapter: 1, order: 1, status: 'terbit', envelope: { plain: { v: 1, pov, when: { label: '', sort }, text, ...extra } } });
    // Lewat masa fondasi tanpa adegan terbit: rumah tidak bisa dihidupkan lagi.
    expect((await ana.req('POST', `/v1/naskah/${lama.msId}/scenes`, adegan('lama0001x', 'tAnaLama001', '', 'Hidup lagi?'))).status).toBe(409);
    // Patok baru di persil itu meresmikan kepergiannya.
    const baru = await bima.ok('POST', '/v1/kota/claims', { plotId: 'tiangseribu.20', household: 'Keluarga Baru', from: 1955, to: 1965, tokoh: { id: 'tBimaBaru01', name: 'Bima Baru', born: 1930 } });
    expect((await ana.ok('GET', `/v1/naskah/${lama.msId}`)).visibility).toBe('arsip');
    // Masa hidup tokoh harus cocok dengan rumah tempat ia tinggal.
    const rumahAna = await ana.ok('POST', '/v1/kota/claims', { plotId: 'tiangseribu.21', household: 'Keluarga Ana', from: 1960, to: 1990, tokoh: { id: 'tAnaUtama01', name: 'Ana', born: 1950 } });
    expect((await ana.req('PUT', `/v1/naskah/${rumahAna.msId}/canon/tAnaUtama01`, { envelope: { plain: { v: 1, kind: 'tokoh', name: 'Ana', aliases: [], known: [], born: 1950, died: 1955 } } })).status).toBe(400);
    // Perjumpaan di luar masa hidup figur (Mbah Tembang wafat 1984) tidak dihitung.
    await ana.ok('POST', `/v1/naskah/${rumahAna.msId}/scenes`, adegan('jumpa002x', 'tAnaUtama01', '1989', 'Mbah Tembang bernyanyi lagi.', { jumpa: ['warga.tembang'] }));
    expect((await ana.ok('GET', '/v1/kota/warga/warga.tembang')).perjumpaan.some((x: any) => x.sceneId === 'jumpa002x')).toBe(false);
    // Tokoh yang sedang tertaut tidak bisa dihapus sepihak.
    await ana.ok('POST', '/v1/kota/ketuk', { fromClaimId: rumahAna.id, fromTokoh: 'tAnaUtama01', toClaimId: baru.id, toTokoh: 'tBimaBaru01', type: 'tetangga', letter: 'Pak Bima, saya Ana dari rumah sebelah.' });
    expect((await ana.req('DELETE', `/v1/naskah/${rumahAna.msId}/canon/tAnaUtama01`)).status).toBe(409);
  });

  it('kabar kota dan silsilah orang yang sama', async () => {
    // Bima menerima ketukan Ana: ikatan kanon masuk kabar. Rumah yang lewat masa fondasi tidak.
    env.advanceDays(1);
    const rumahBima = (await bima.ok('GET', '/v1/kota')).claims.find((x: any) => x.mine);
    const ketukan = (await bima.ok('GET', `/v1/kota/claims/${rumahBima.id}/tautan`)).relations.find((x: any) => x.state === 'ketuk');
    await bima.ok('PUT', `/v1/kota/ketuk/${ketukan.id}`, { action: 'kanon' });
    const kabar = await sari.ok('GET', '/v1/kota/kabar');
    const jenis = new Set(kabar.map((x: any) => x.jenis));
    for (const j of ['rumah', 'adegan', 'ikatan', 'peristiwa', 'figur', 'ubah']) expect(jenis.has(j)).toBe(true);
    expect(kabar.find((x: any) => x.jenis === 'ikatan').judul).toMatch(/Ana kini tetangga dari Bima Baru/);
    expect(kabar.some((x: any) => x.isi?.includes('Keluarga Sitorus'))).toBe(false);
    expect([...kabar].map((x: any) => x.at)).toEqual([...kabar].map((x: any) => x.at).sort().reverse());
    // Draf tidak pernah muncul di kabar.
    expect(kabar.some((x: any) => x.id === 'a:adegan2x')).toBe(false);
    const rumah = (await raka.ok('GET', '/v1/kota')).claims.filter((x: any) => x.mine);
    const dinas = rumah.find((x: any) => x.household === 'Rumah Dinas');
    const darmo = rumah.find((x: any) => x.household === 'Keluarga Darmo');
    const sil = await sari.ok('GET', `/v1/kota/silsilah/${dinas.id}`);
    expect(sil.sama).toEqual([{ a: dinas.id, b: darmo.id, tokoh: 'Pak Darmo' }]);
    expect(sil.claims.map((x: any) => x.household)).toEqual(expect.arrayContaining(['Rumah Dinas', 'Keluarga Darmo']));
  });

  it('ganti nama pena, pos sangkala di penjadwal, dan lonceng ketujuh', async () => {
    await tono.ok('PUT', '/v1/kota/profil', { penName: 'tono.baru' });
    const me = (await tono.ok('GET', '/v1/kota')).me;
    expect(me).toMatchObject({ penName: 'tono.baru', penaLama: ['tono'] });
    expect(me.penaBolehGanti).toBeTruthy();
    expect((await tono.req('PUT', '/v1/kota/profil', { penName: 'tono.lagi' })).status).toBe(409);
    expect((await sari.req('PUT', '/v1/kota/profil', { penName: 'tono.baru' })).status).toBe(409);
    env.advanceDays(31);
    await tono.ok('PUT', '/v1/kota/profil', { penName: 'tono' });
    expect((await tono.ok('GET', '/v1/kota')).me.penaLama).toEqual(['tono.baru']);
    // Penjadwal: surat yang sudah sampai dikabari sekali saja.
    const pertama = await antarSuratKota(env.services);
    expect(await antarSuratKota(env.services)).toBe(0);
    expect(pertama).toBeGreaterThanOrEqual(0);
    // Lonceng ketujuh: sekali sehari per warga, mulai pukul 19.
    const keys: string[] = [];
    const once = async (k: string) => (keys.includes(k) ? false : (keys.push(k), true));
    const u = { id: (await tono.ok('GET', '/v1/me')).user.id };
    await loncengKetujuh(env.services, u, '2026-12-01', 18, once);
    expect(keys).toHaveLength(0);
    await loncengKetujuh(env.services, u, '2026-12-01', 19, once);
    await loncengKetujuh(env.services, u, '2026-12-01', 20, once);
    expect(keys).toEqual([`lonceng:${u.id}:2026-12-01`]);
  });

  it('moderasi, validasi kesaksian, dan kabar desas-desus', async () => {
    const admin = (method: string, path: string, body?: unknown) => env.app.request(path, { method, headers: { 'x-admin-token': 'admin', 'content-type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
    expect((await env.app.request('/admin/kota/laporan')).status).toBe(401);
    const antrean = await (await admin('GET', '/admin/kota/laporan')).json();
    const wirya = antrean.find((x: any) => x.household === 'Keluarga Wirya');
    expect(wirya).toMatchObject({ status: 'disembunyikan' });
    expect(wirya.laporan).toHaveLength(3);
    await admin('PATCH', `/admin/kota/claims/${wirya.id}`, { aksi: 'pulihkan' });
    expect((await sari.ok('GET', '/v1/kota')).claims.some((x: any) => x.id === wirya.id)).toBe(true);
    await admin('PATCH', `/admin/kota/claims/${wirya.id}`, { aksi: 'tutup' });
    expect((await sari.ok('GET', '/v1/kota')).claims.some((x: any) => x.id === wirya.id)).toBe(false);
    // Kesaksian: rumah Ana (1960–1990) tidak mengalami Telaga Mangu digali (1925), dan tidak bisa mendengarnya sebelum terjadi.
    const rumahAna = (await ana.ok('GET', '/v1/kota')).claims.find((x: any) => x.mine && x.state === 'aktif');
    const saksi = (id: string, saksi: string, sort: string) => ({ id, chapter: 2, order: 1, status: 'draf', envelope: { plain: { v: 1, pov: 'tAnaUtama01', when: { label: '', sort }, text: 'Kabar dari telaga.', peristiwa: 'awal.telaga', saksi } } });
    const awal = (await sari.ok('GET', '/v1/kota/almanak')).find((e: any) => e.year === 1925);
    const s2 = (id: string, kind: string, sort: string) => ({ ...saksi(id, kind, sort), envelope: { plain: { ...saksi(id, kind, sort).envelope.plain, peristiwa: awal.id } } });
    expect((await ana.req('POST', `/v1/naskah/${rumahAna.msId}/scenes`, s2('saksi0002x', 'mengalami', '1925'))).status).toBe(400);
    expect((await ana.req('POST', `/v1/naskah/${rumahAna.msId}/scenes`, s2('saksi0003x', 'mendengar', '1920'))).status).toBe(400);
    await ana.ok('POST', `/v1/naskah/${rumahAna.msId}/scenes`, s2('saksi0004x', 'mendengar', '1965'));
    expect((await ana.req('POST', `/v1/naskah/${rumahAna.msId}/scenes`, { ...s2('saksi0005x', 'mendengar', '1965'), envelope: { plain: { ...s2('saksi0005x', 'mendengar', '1965').envelope.plain, peristiwa: 'tidak.ada' } } })).status).toBe(400);
  });

  it('arsip bisa dihapus; rumah yang masih berdiri tidak', async () => {
    const rumahAna = (await ana.ok('GET', '/v1/kota')).claims.find((x: any) => x.mine && x.state === 'aktif');
    expect((await ana.req('DELETE', `/v1/naskah/${rumahAna.msId}`)).status).toBe(403);
    // Rumah lama Ana sudah jadi arsip saat persilnya dipatok Bima: boleh dihapus.
    const arsip = (await ana.ok('GET', '/v1/naskah')).find((x: any) => x.visibility === 'arsip');
    await ana.ok('DELETE', `/v1/naskah/${arsip.id}`);
    expect((await ana.req('GET', `/v1/naskah/${arsip.id}`)).status).toBe(404);
    // Almanak dan Buku Warga lebih kaya, almanak berurutan menurut tahun.
    const almanak = await ana.ok('GET', '/v1/kota/almanak');
    expect(almanak.filter((e: any) => e.state === 'kanon').length).toBeGreaterThanOrEqual(39);
    expect(almanak.map((e: any) => e.year)).toEqual([...almanak.map((e: any) => e.year)].sort((a: number, b: number) => a - b));
    expect((await ana.ok('GET', '/v1/kota/warga')).filter((f: any) => f.state === 'kanon').length).toBeGreaterThanOrEqual(34);
  });

  it('jalan-jalan: jendela rumah dan warga kota yang dijumpai', async () => {
    const j = await sari.ok('GET', '/v1/kota/jalan?wilayah=lorongsumbu&tahun=1975');
    const rumah = j.langkah.filter((l: any) => l.jenis === 'rumah');
    expect(rumah.map((l: any) => l.household)).toContain('Keluarga Darmo');
    expect(rumah.find((l: any) => l.household === 'Keluarga Darmo').kalimat.length).toBeGreaterThan(10);
    const warga = j.langkah.filter((l: any) => l.jenis === 'warga').map((l: any) => l.name);
    expect(warga).toEqual(expect.arrayContaining(['Wak Lebai', 'Bang Jamil']));
    expect(warga).not.toContain('Mbah Tembang');
    expect((await sari.req('GET', '/v1/kota/jalan?wilayah=entah')).status).toBe(400);
  });

  it('hari ini di sangkala: adegan bertanggal sama, atau peristiwa bulan ini', async () => {
    // saksi001x bertanggal 1979-02-15 di rumah Darmo.
    const a = await sari.ok('GET', '/v1/kota/hari-ini?md=02-15');
    expect(a).toMatchObject({ jenis: 'adegan', tanggal: '15 Februari 1979' });
    const b = await sari.ok('GET', '/v1/kota/hari-ini?md=09-03');
    expect(b.jenis).toBe('peristiwa');
    expect(b.tanggal).toMatch(/^September/);
    expect((await sari.req('GET', '/v1/kota/hari-ini?md=2-15')).status).toBe(400);
  });

  it('ajak teman selingkaran memegang figuran', async () => {
    const lin = await new Client(env.app, 'lin-k@contoh.id').signup('Lin');
    const nur = await new Client(env.app, 'nur-k@contoh.id').signup('Nur');
    await lin.ok('PUT', '/v1/kota/profil', { penName: 'lin.kota' });
    const rumah = await lin.ok('POST', '/v1/kota/claims', { plotId: 'tiangseribu.30', household: 'Keluarga Lin', from: 1960, to: 1990, tokoh: { id: 'tLinUtama001', name: 'Lin', born: 1950 } });
    await lin.ok('POST', `/v1/naskah/${rumah.msId}/canon`, { id: 'tAdikLin001', kind: 'tokoh', envelope: { plain: { v: 1, kind: 'tokoh', name: 'Adik Lin', aliases: [], known: [], peran: 'figuran' } } });
    const nurId = (await nur.ok('GET', '/v1/me')).user.id;
    const undang = { claimId: rumah.id, tokohId: 'tAdikLin001', userId: nurId };
    // Belum satu lingkaran: ditolak.
    expect((await lin.req('POST', '/v1/kota/pegang/undang', undang)).status).toBe(403);
    const circle = await lin.createCircle('circle', 'Lingkar Lin');
    await nur.accept(await lin.invite(circle.id));
    expect((await lin.req('POST', '/v1/kota/pegang/undang', undang)).status).toBe(409);
    await nur.ok('PUT', '/v1/kota/profil', { penName: 'nur.kota' });
    const u = await lin.ok('POST', '/v1/kota/pegang/undang', undang);
    expect((await nur.ok('GET', '/v1/kota')).me.undangan).toEqual([expect.objectContaining({ id: u.id, tokoh: 'Adik Lin', household: 'Keluarga Lin' })]);
    expect((await lin.req('PUT', `/v1/kota/pegang/${u.id}`, { action: 'terima' })).status).toBe(403);
    await nur.ok('PUT', `/v1/kota/pegang/${u.id}`, { action: 'terima' });
    await nur.ok('POST', `/v1/naskah/${rumah.msId}/scenes`, { id: 'adiklin01x', chapter: 1, order: 1, envelope: { plain: { v: 1, pov: 'tAdikLin001', when: { label: '', sort: '' }, text: 'Adik Lin mendayung ke sekolah.' } } });
    expect((await nur.ok('GET', '/v1/kota')).me.tokoh.pakai).toBe(1);
  });
});
