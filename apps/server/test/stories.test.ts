import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { STORY_DECK, storyDeckIds, storyPrereqMet } from '@sehari/core';
import { Client, id, setup } from './helpers';

let env: Awaited<ReturnType<typeof setup>>;
let raka: Client;
let naya: Client;
let sari: Client;
let duo: string;
const sid = id();

// Server tidak membaca isi; amplop apa pun yang bentuknya sah cukup untuk menguji giliran dan akses.
const amplop = (c: Client, tag: string) => ({ ciphertext: Buffer.from(tag).toString('base64'), recipients: [{ t: 'user', userId: c.userId, wk: 'AAAA' }] });

beforeAll(async () => {
  env = await setup('2026-11-12T05:00:00Z');
  raka = await new Client(env.app, 'raka-c@contoh.id').signup('Raka');
  naya = await new Client(env.app, 'naya-c@contoh.id').signup('Naya');
  sari = await new Client(env.app, 'sari-c@contoh.id').signup('Sari');
  duo = (await raka.createCircle('duo', 'Kita')).id;
  await naya.accept(await raka.invite(duo));
});
afterAll(async () => env.services.close());

const part = (c: Client, round: number, seal: boolean, tag = 'x', story = sid) =>
  c.req('PUT', `/v1/stories/${story}/parts`, { round, envelope: amplop(c, `adegan-${tag}`), handoff: amplop(c, `serah-${tag}`), intent: amplop(c, `maksud-${tag}`), seal });
const get = (c: Client, story = sid) => c.ok('GET', `/v1/stories/${story}`);

describe('hidup orang lain', () => {
  it('mode pilih: dua kartu ditawarkan, hanya milik sendiri yang terlihat, dan bisa ditukar sebelum menyegel', async () => {
    const st = await raka.ok('POST', '/v1/stories', { id: sid, circleId: duo, premise: 'kunci', members: [naya.userId], mode: 'kejutan', pick: true, palette: amplop(raka, 'palet') });
    expect(st.offers).toHaveLength(2);
    expect(Object.keys(st.roles)).toEqual([raka.userId]);
    expect(st.roles[raka.userId]).toBe(st.offers[0]);
    const swapped = await raka.ok('POST', `/v1/stories/${sid}/role`, { roleId: st.offers[1] });
    expect(swapped.roles[raka.userId]).toBe(st.offers[1]);
    expect((await raka.req('POST', `/v1/stories/${sid}/role`, { roleId: '99' })).status).toBe(400);
    expect(st.palette).toHaveLength(1);
  });

  it('orang di luar lingkaran tidak bisa ikut atau membaca', async () => {
    expect((await sari.req('GET', `/v1/stories/${sid}`)).status).toBe(404);
    expect((await raka.req('POST', '/v1/stories', { id: id(), circleId: duo, premise: 'kunci', members: [sari.userId] })).status).toBe(403);
  });

  it('hanya Lensa gelombang ini yang memilih fokus', async () => {
    expect((await naya.req('PUT', `/v1/stories/${sid}/focus`, { round: 1, envelope: amplop(naya, 'f') })).status).toBe(403);
    const f = await raka.ok('PUT', `/v1/stories/${sid}/focus`, { round: 1, envelope: amplop(raka, 'kunci') });
    expect(Object.keys(f.focus)).toEqual(['1']);
  });

  it('selama menulis, bagian orang lain sama sekali tertutup', async () => {
    expect((await part(raka, 1, true, 'r1')).status).toBe(200);
    const p = (await get(naya)).parts.find((x: any) => x.authorId === raka.userId);
    expect([p.sealed, p.envelope, p.handoff, p.intent]).toEqual([true, null, null, null]);
  });

  it('mode kejutan: setelah dibuka, serah-terima terlihat tetapi adegan penuh ditahan', async () => {
    const r = await part(naya, 1, true, 'n1');
    expect(r.json.phase).toBe('read');
    const p = r.json.parts.find((x: any) => x.authorId === raka.userId);
    expect(p.handoff).toBeTruthy();
    expect(p.envelope).toBeNull();
    expect(p.intent).toBeNull();
    expect(r.json.parts.find((x: any) => x.authorId === naya.userId).envelope).toBeTruthy();
    expect((await part(raka, 1, true, 'curang')).status).toBe(409);
  });

  it('maksud penulis baru dilepas setelah pembaca menulis tafsirnya', async () => {
    const rp = (await get(naya)).parts.find((x: any) => x.authorId === raka.userId);
    expect((await raka.req('POST', `/v1/stories/${sid}/parts/${rp.id}/reads`, { id: id(), kind: 'tafsir', envelope: amplop(raka, 't') })).status).toBe(400);
    const after = await naya.ok('POST', `/v1/stories/${sid}/parts/${rp.id}/reads`, { id: id(), kind: 'tafsir', envelope: amplop(naya, 'yang kutangkap') });
    expect(after.parts.find((x: any) => x.id === rp.id).intent).toBeTruthy();
    expect(after.reads).toHaveLength(1);
  });

  it('handshake: fakta sah ketika semua setuju pada versi itu; revisi menggantikan yang lama', async () => {
    const f1 = id();
    let st = await naya.ok('POST', `/v1/stories/${sid}/facts`, { id: f1, round: 1, envelope: amplop(naya, 'kunci di laci') });
    expect(st.facts[0]).toMatchObject({ state: 'usul', agrees: [naya.userId] });
    st = await raka.ok('PUT', `/v1/stories/${sid}/facts/${f1}`, { vote: 'tunda' });
    expect(st.facts[0].state).toBe('tunda');
    st = await raka.ok('PUT', `/v1/stories/${sid}/facts/${f1}`, { vote: 'setuju' });
    expect(st.facts[0].state).toBe('sah');
    expect((await raka.req('PUT', `/v1/stories/${sid}/facts/${f1}`, { vote: 'tunda' })).status).toBe(409);
    const f2 = id();
    await raka.ok('POST', `/v1/stories/${sid}/facts`, { id: f2, round: 1, envelope: amplop(raka, 'kunci di saku'), supersedes: f1 });
    st = await naya.ok('PUT', `/v1/stories/${sid}/facts/${f2}`, { vote: 'setuju' });
    expect(st.facts.find((f: any) => f.id === f1).state).toBe('diganti');
    expect(st.facts.find((f: any) => f.id === f2).state).toBe('sah');
  });

  it('sanggahan punya jalan keluar yang dipilih penulis bagian; tirai tanpa nama', async () => {
    const np = (await get(raka)).parts.find((x: any) => x.authorId === naya.userId);
    const nid = id();
    await raka.ok('POST', `/v1/stories/${sid}/parts/${np.id}/notes`, { id: nid, reason: 'pengetahuan', envelope: amplop(raka, 'dari mana tahu?') });
    expect((await raka.req('PUT', `/v1/stories/${sid}/notes/${nid}`, { resolution: 'misteri' })).status).toBe(403);
    const res = await naya.ok('PUT', `/v1/stories/${sid}/notes/${nid}`, { resolution: 'adegan-antara' });
    expect(res.notes[0].resolution).toBe('adegan-antara');
    const v = await raka.ok('POST', `/v1/stories/${sid}/parts/${np.id}/veil`);
    expect(v.parts.find((x: any) => x.id === np.id)).toMatchObject({ veils: 1, veiledByMe: true });
    expect((await get(naya)).parts.find((x: any) => x.id === np.id)).toMatchObject({ veils: 1, veiledByMe: false });
  });

  it('tiga gelombang lalu selesai: adegan, role, dan maksud semua terbuka; edisi butuh persetujuan semua', async () => {
    await raka.ok('POST', `/v1/stories/${sid}/ready`);
    expect((await naya.ok('POST', `/v1/stories/${sid}/ready`)).round).toBe(2);
    for (const round of [2, 3]) {
      await part(raka, round, true);
      await part(naya, round, true);
      await raka.ok('POST', `/v1/stories/${sid}/ready`);
      await naya.ok('POST', `/v1/stories/${sid}/ready`);
    }
    const done = await get(raka);
    expect(done.phase).toBe('done');
    expect(done.parts.every((p: any) => p.envelope && p.intent)).toBe(true);
    expect(Object.keys(done.roles)).toHaveLength(2);
    const order = done.parts.map((p: any) => p.id);
    const ed = await raka.ok('PUT', `/v1/stories/${sid}/edition`, { order, ending: [order.at(-1)], template: 'dua-sisi' });
    expect(ed.editionOk).toEqual([raka.userId]);
    expect((await naya.ok('POST', `/v1/stories/${sid}/edition/approve`)).editionOk.sort()).toEqual([raka.userId, naya.userId].sort());
    const b = await naya.ok('PUT', `/v1/stories/${sid}/branch`, { round: 2, envelope: amplop(naya, 'taksi berhenti') });
    expect(b.parts.filter((x: any) => x.world === 'b')).toHaveLength(1);
  });

  it('novella: babak baru membagikan tawaran kartu baru, dan penulis yang macet bisa dilewati', async () => {
    const trio = (await raka.createCircle('circle', 'Geng')).id;
    await naya.accept(await raka.invite(trio));
    await sari.accept(await raka.invite(trio));
    const nid = id();
    const st = await raka.ok('POST', '/v1/stories', { id: nid, circleId: trio, premise: 'kunci', members: [naya.userId, sari.userId], rounds: 6, deck: 'lengkap', pick: true });
    const seal = (c: Client, round: number) => part(c, round, true, 'x', nid);
    const next = (c: Client) => c.ok('POST', `/v1/stories/${nid}/ready`);
    expect((await sari.req('POST', `/v1/stories/${nid}/skip`)).status).toBe(400);
    await seal(raka, 1);
    await seal(naya, 1);
    expect((await raka.ok('POST', `/v1/stories/${nid}/skip`)).phase).toBe('write');
    expect((await naya.ok('POST', `/v1/stories/${nid}/skip`)).phase).toBe('read');
    await next(raka);
    expect((await next(naya)).round).toBe(2);
    for (const round of [2, 3]) {
      for (const c of [raka, naya, sari]) await seal(c, round);
      for (const c of [raka, naya, sari]) await next(c);
    }
    const four = await get(raka, nid);
    expect([four.round, four.phase]).toEqual([4, 'write']);
    expect(four.offers).toHaveLength(2);
    expect(four.offers).not.toEqual(st.offers);
  });

  it('cerita sendiri: fakta langsung sah', async () => {
    const solo = id();
    await sari.ok('POST', '/v1/stories', { id: solo, circleId: null, premise: 'warung', members: [] });
    const r = await part(sari, 1, true, 's', solo);
    expect(r.json.phase).toBe('read');
    const f = await sari.ok('POST', `/v1/stories/${solo}/facts`, { id: id(), round: 1, envelope: amplop(sari, 'f') });
    expect(f.facts[0].state).toBe('sah');
  });
  it('ruang penelitian: privat sampai dibagikan; status pertanyaan bisa diubah siapa pun di meja', async () => {
    const r1 = id();
    let st = await raka.ok('POST', `/v1/stories/${sid}/research`, { id: r1, envelope: amplop(raka, 'tanya') });
    expect(st.research).toHaveLength(1);
    expect((await get(naya)).research).toHaveLength(0);
    expect((await naya.req('PUT', `/v1/stories/${sid}/research/${r1}`, { status: 'terjawab' })).status).toBe(404);
    await raka.ok('PUT', `/v1/stories/${sid}/research/${r1}`, { shared: true });
    st = await naya.ok('PUT', `/v1/stories/${sid}/research/${r1}`, { status: 'diperdebatkan' });
    expect(st.research[0]).toMatchObject({ shared: true, status: 'diperdebatkan' });
    expect((await naya.req('PUT', `/v1/stories/${sid}/research/${r1}`, { envelope: amplop(naya, 'ubah') })).status).toBe(403);
    await naya.ok('DELETE', `/v1/stories/${sid}/research/${r1}`);
    expect((await get(raka)).research).toHaveLength(1);
    expect((await raka.ok('DELETE', `/v1/stories/${sid}/research/${r1}`)).research).toHaveLength(0);
  });

  it('jatah keuntungan: sekali per babak', async () => {
    const solo = id();
    await sari.ok('POST', '/v1/stories', { id: solo, circleId: null, premise: 'warung', members: [] });
    const perk = (round: number) => sari.req('PUT', `/v1/stories/${solo}/parts`, { round, envelope: amplop(sari, 'a'), perk: true, seal: true });
    expect((await perk(1)).status).toBe(200);
    const st = await sari.ok('POST', `/v1/stories/${solo}/ready`);
    expect(st.round).toBe(2);
    expect(st.perkUsed).toBe(true);
    expect(st.aiOk).toBe(true);
    expect((await perk(2)).status).toBe(409);
  });

  it('kartu berprasyarat baru masuk dek setelah Peta memenuhi syaratnya', () => {
    const base = { round: 1, rounds: 3, members: 2, sah: 0, research: 0, misteri: 0 };
    expect(storyPrereqMet('22', base)).toBe(false);
    expect(storyPrereqMet('22', { ...base, sah: 2 })).toBe(true);
    expect(storyPrereqMet('36', { ...base, research: 1 })).toBe(true);
    const awal = storyDeckIds('lengkap', base);
    expect(awal.length).toBeLessThan(STORY_DECK.length);
    expect(storyDeckIds('lengkap', { round: 8, rounds: 12, members: 5, sah: 9, research: 3, misteri: 2 }).length).toBeGreaterThan(awal.length);
  });

  it('AI cerita meminta izin semua anggota lingkaran', async () => {
    const r = await raka.req('POST', `/v1/stories/${sid}/ai/jejak`, { text: 'Kunci itu kusimpan di laci.', tokoh: 'Raka', tokohs: ['Naya'] });
    expect(r.status).toBe(403);
    expect((await get(raka)).aiOk).toBe(false);
  });
});
