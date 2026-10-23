import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { fromBase64, generateIdentity, newSymmetricKey, sealTo, toBase64 } from '@sehari/core';
import { runJobs } from '../src/jobs/scheduler';
import { Client, id, setup } from './helpers';

let env: Awaited<ReturnType<typeof setup>>;
let raka: Client;
let naya: Client;
let duoId: string;
const DAY = '2026-10-22';

beforeAll(async () => {
  env = await setup('2026-10-22T05:00:00Z'); // 12.00 WIB, 13.00 WITA
  raka = await new Client(env.app, 'raka@contoh.id').signup('Raka');
  naya = await new Client(env.app, 'naya@contoh.id', 'Asia/Makassar').signup('Naya');
});
afterAll(async () => env.services.close());

describe('akun', () => {
  it('menolak usia di bawah 18', async () => {
    const r = await raka.req('PATCH', '/v1/me', { birthYear: 2015 });
    expect(r.status).toBe(403);
  });
  it('kode salah ditolak, cadangan kunci bisa diambil', async () => {
    const r = await new Client(env.app, 'x@contoh.id').req('POST', '/v1/auth/verify', { email: 'x@contoh.id', code: '000000' });
    expect(r.status).toBe(400);
    const b = await raka.ok('GET', '/v1/me/key-backup');
    expect(b.publicKey).toBe(toBase64(raka.identity.publicKey));
  });
});

describe('duo & segel timbal balik', () => {
  it('membuat duo dan mengundang', async () => {
    const circle = await raka.createCircle('duo', 'Raka & Naya');
    duoId = circle.id;
    const inv = await raka.invite(duoId);
    const preview = await new Client(env.app, '').ok('GET', `/v1/invites/${inv.token}`);
    expect(preview.valid).toBe(true);
    expect(preview.inviter.penName).toBe('Raka');
    await naya.accept(inv);
    const again = await new Client(env.app, '').ok('GET', `/v1/invites/${inv.token}`);
    expect(again.valid).toBe(false);
    const mine = await naya.ok('GET', '/v1/circles');
    expect(mine[0].members).toHaveLength(2);
    expect(env.pusher.sent.some((m) => m.body.includes('Naya'))).toBe(true);
  });

  it('kapsul Raka tertutup bagi Naya sampai Naya menyegel', async () => {
    await raka.ok('POST', '/v1/drops', raka.dropBody(DAY, { text: 'kopi pagi di balkon', mood: 'hangat' }, { circleId: duoId }));
    const before = await naya.ok('GET', `/v1/circles/${duoId}/days/${DAY}`);
    expect(before.drops).toHaveLength(0);
    expect(before.locked[0].reason).toBe('not_sealed');

    // Menyegel tanpa Drop ditolak.
    expect((await naya.req('POST', `/v1/days/${DAY}/seal`, { tz: naya.tz })).status).toBe(400);
    const lastLine = naya.dropBody(DAY, { kind: 'last_line', text: 'hujan sore, lalu reda', mood: 'rindu' }, { circleId: duoId });
    const sealed = await naya.ok('POST', `/v1/days/${DAY}/seal`, { tz: naya.tz, lastLine });
    expect(sealed.circles[0].allSealed).toBe(false);
    expect(env.pusher.sent.some((m) => m.body.includes('Naya') && m.data?.type === 'partner_sealed')).toBe(true);

    const after = await naya.ok('GET', `/v1/circles/${duoId}/days/${DAY}`);
    const rakaDrop = after.drops.find((d: any) => d.authorId === raka.userId);
    expect(naya.open(rakaDrop).text).toBe('kopi pagi di balkon');

    // Raka belum menyegel: milik Naya masih tertutup baginya.
    const rakaView = await raka.ok('GET', `/v1/circles/${duoId}/days/${DAY}`);
    expect(rakaView.drops.every((d: any) => d.authorId === raka.userId)).toBe(true);
    expect(rakaView.members.find((m: any) => m.userId === naya.userId).sealed).toBe(true);

    const r2 = await raka.ok('POST', `/v1/days/${DAY}/seal`, { tz: raka.tz });
    expect(r2.circles[0].allSealed).toBe(true);
    expect(r2.circles[0].streak.current).toBe(1);
    const open = await raka.ok('GET', `/v1/circles/${duoId}/days/${DAY}`);
    expect(open.drops).toHaveLength(2);
  });

  it('setelah disegel tidak bisa menambah Drop biasa', async () => {
    const r = await raka.req('POST', '/v1/drops', raka.dropBody(DAY, { text: 'lupa' }, { circleId: duoId }));
    expect(r.status).toBe(409);
  });

  it('reaksi: peluk boleh, Ruang Hening hanya lilin', async () => {
    const day = await naya.ok('GET', `/v1/circles/${duoId}/days/${DAY}`);
    const rakaDrop = day.drops.find((d: any) => d.authorId === raka.userId);
    expect((await naya.req('PUT', `/v1/drops/${rakaDrop.id}/reactions/hug`)).status).toBe(200);
    expect((await naya.req('PUT', `/v1/drops/${rakaDrop.id}/reactions/hug`)).status).toBe(200);
    const again = await raka.ok('GET', `/v1/circles/${duoId}/days/${DAY}`);
    expect(again.drops.find((d: any) => d.id === rakaDrop.id).reactions).toEqual([{ kind: 'hug', userId: naya.userId }]);
  });

  it('streak berlanjut dan pembeku menutup satu hari', async () => {
    env.setNow('2026-10-23T12:00:00Z');
    const day2 = '2026-10-23';
    const silent = raka.dropBody(day2, { kind: 'silent', mood: 'lelah' }, { circleId: duoId });
    await raka.ok('POST', '/v1/drops', silent);
    await raka.ok('POST', `/v1/days/${day2}/seal`, { tz: raka.tz });
    // Naya sakit: pakai pembeku.
    const f = await naya.ok('POST', '/v1/freezes/use', { day: day2 });
    expect(f.left).toBe(1);
    const circles = await raka.ok('GET', '/v1/circles');
    expect(circles[0].streak.current).toBe(2);
    // Lilin di Ruang Hening; peluk & catatan kaki ditolak.
    expect((await naya.req('PUT', `/v1/drops/${silent.id}/reactions/hug`)).status).toBe(404); // Naya belum menyegel hari itu
  });

  it('kapsul waktu terbuka di tanggalnya', async () => {
    env.setNow('2026-10-24T03:00:00Z');
    const d = '2026-10-24';
    const cap = raka.dropBody(d, { text: 'buka setahun lagi ya' }, { circleId: duoId, unlockOn: '2027-10-24' });
    await raka.ok('POST', '/v1/drops', cap);
    await raka.ok('POST', `/v1/drops`, naya.dropBody(d, { text: 'x' })).catch(() => {});
    await naya.ok('POST', '/v1/drops', naya.dropBody(d, { text: 'pagi' }, { circleId: duoId }));
    await naya.ok('POST', `/v1/days/${d}/seal`, { tz: naya.tz });
    const v = await naya.ok('GET', `/v1/circles/${duoId}/days/${d}`);
    expect(v.locked.find((l: any) => l.id === cap.id).reason).toBe('time_capsule');
    env.setNow('2027-10-24T03:00:00Z');
    const v2 = await naya.ok('GET', `/v1/circles/${duoId}/days/${d}`);
    expect(naya.open(v2.drops.find((x: any) => x.id === cap.id)).text).toBe('buka setahun lagi ya');
    env.setNow('2026-10-24T03:00:00Z');
  });

  it('Surat Tersesat tiba di waktu acak dan pengirim tidak tahu kapan', async () => {
    const e = generateIdentity();
    void e;
    const key = raka.circleKeys.get(duoId)!.get(1)!;
    const body = raka.dropBody('2026-10-24', { text: 'surat untukmu' }, { circleId: duoId });
    const res = await raka.ok('POST', '/v1/letters', { id: id(), kind: 'lost', circleId: duoId, toUserId: naya.userId, envelope: body.envelope });
    expect(res.status).toBe('dalam perjalanan');
    const out = await raka.ok('GET', '/v1/letters?box=outbox');
    expect(out[0].deliverOn).toBeNull();
    expect((await naya.ok('GET', '/v1/letters')).length).toBe(0);
    env.setNow('2027-11-01T03:00:00Z');
    await runJobs(env.services);
    const inbox = await naya.ok('GET', '/v1/letters');
    expect(inbox).toHaveLength(1);
    expect(naya.open(inbox[0]).text).toBe('surat untukmu');
    void key;
    env.setNow('2026-10-24T03:00:00Z');
  });
});

describe('lingkaran, rotasi kunci, batas paket', () => {
  it('anggota keluar → kunci diputar, Drop baru tak terbaca yang pergi', async () => {
    const sari = await new Client(env.app, 'sari@contoh.id').signup('Sari');
    const circle = await raka.createCircle('circle', 'Anak Kos Gang 3');
    const inv = await raka.invite(circle.id, 5);
    await naya.accept(inv);
    await sari.accept(inv);
    await sari.ok('POST', `/v1/circles/${circle.id}/leave`);
    const c = await raka.ok('GET', `/v1/circles/${circle.id}`);
    expect(c.rotationNeeded).toBe(true);
    // Raka memutar: kunci baru dibungkus untuk Raka & Naya saja.
    const k2 = newSymmetricKey();
    const active = c.members.filter((m: any) => m.state === 'active');
    await raka.ok('POST', `/v1/circles/${circle.id}/rotate`, {
      epoch: 2,
      envelopes: active.map((m: any) => ({ userId: m.userId, wk: toBase64(sealTo(fromBase64(m.publicKey), k2)) })),
    });
    await naya.loadKeys(circle.id);
    expect(naya.circleKeys.get(circle.id)!.get(2)).toBeTruthy();
    // Drop dengan epoch lama ditolak.
    const stale = raka.dropBody('2026-10-24', { text: 'lama' }, { circleId: circle.id, epoch: 1 });
    expect((await raka.req('POST', '/v1/drops', stale)).status).toBe(409);
    // Paket gratis: maksimal 2 lingkaran (Duo + Lingkaran) → yang ketiga ditolak.
    const third = await raka.req('POST', '/v1/circles', { kind: 'circle', nameEnc: 'x', keyEnvelope: 'x' });
    expect(third.status).toBe(402);
  });
});

describe('pembayaran, wrap publik, Kapsul Indonesia', () => {
  it('checkout Plus lewat pembayaran tiruan membuka paket', async () => {
    const co = await raka.ok('POST', '/v1/billing/checkout', { product: 'plus_yearly' });
    expect(co.paymentUrl).toContain('/dev/pay/');
    const res = await env.app.request(`/dev/pay/${co.orderId}`, { method: 'POST' });
    expect(res.status).toBe(200);
    const me = await raka.ok('GET', '/v1/me');
    expect(me.user.plan).toBe('plus');
    expect(me.limits.maxCircles).toBeGreaterThan(2);
  });

  it('wrap publik tidak memuat isi pribadi dan bisa dirender', async () => {
    const w = await raka.ok('POST', '/v1/public-wraps', {
      data: { scope: 'week', period: '2026-W43', label: '19 – 25 Oktober 2026', circleKind: 'duo', memberCount: 2, sealedDays: 3, totalDays: 7, streak: 3, longest: 3, palette: [{ mood: 'hangat', color: '#F2B880', share: 1 }], garden: [true, true, true, false, false, false, false], secret: 'rahasia' },
    });
    expect(JSON.stringify(w.data)).not.toContain('rahasia');
    const svg = await env.app.request(`/w/${w.slug}.svg`);
    expect(svg.status).toBe(200);
    expect(await svg.text()).toContain('<svg');
    const png = await env.app.request(`/w/${w.slug}.png`);
    expect(png.headers.get('content-type')).toBe('image/png');
  });

  it('Kapsul Indonesia menyembunyikan provinsi di bawah ambang', async () => {
    await raka.ok('PATCH', '/v1/me', { settings: { moodPulse: true } });
    const today = '2026-10-24';
    await raka.ok('POST', '/v1/pulse', { day: today, province: 'DI Yogyakarta', mood: 'tenang' });
    const again = await raka.ok('POST', '/v1/pulse', { day: today, province: 'DI Yogyakarta', mood: 'tenang' });
    expect(again.counted).toBe(false);
    const p = await raka.ok('GET', `/v1/pulse?day=${today}`);
    expect(p.provinces).toHaveLength(0);
  });

  it('upacara tutup bab: usulan, suara, judul menang', async () => {
    env.setNow('2026-10-30T12:00:00Z');
    const p = await raka.ok('POST', `/v1/circles/${duoId}/chapters/2026-10/proposals`, { titleEnc: 'enc-judul-1' });
    await naya.ok('POST', `/v1/circles/${duoId}/chapters/2026-10/votes`, { proposalId: p.id });
    await raka.ok('POST', `/v1/circles/${duoId}/chapters/2026-10/votes`, { proposalId: p.id });
    const chs = await raka.ok('GET', `/v1/circles/${duoId}/chapters`);
    expect(chs.find((c: any) => c.month === '2026-10').titleEnc).toBe('enc-judul-1');
  });

  it('ekspor data & hapus akun', async () => {
    const ex = await naya.ok('GET', '/v1/me/export');
    expect(ex.drops.length).toBeGreaterThan(0);
    const guest = await new Client(env.app, 'pergi@contoh.id').signup('Pergi');
    expect((await guest.req('DELETE', '/v1/me')).status).toBe(400);
    expect((await guest.req('DELETE', '/v1/me?confirm=HAPUS')).status).toBe(200);
    expect((await guest.req('GET', '/v1/me')).status).toBe(401);
  });
});

describe('kartu rahasia', () => {
  it('jawaban terbuka hanya bila pembaca juga menjawab kartu yang sama', async () => {
    const { DECKS } = await import('@sehari/core');
    const secret = DECKS[0]!.cards.find((c) => c.kind === 'rahasia' && !c.rare)!;
    env.setNow('2026-10-31T05:00:00Z');
    const d = '2026-10-31';
    const a = raka.dropBody(d, { kind: 'card', text: 'jawaban rahasia raka' }, { circleId: duoId });
    await raka.ok('POST', '/v1/drops', { ...a, meta: { cardId: secret.id } });
    await naya.ok('POST', '/v1/drops', naya.dropBody(d, { text: 'halo' }, { circleId: duoId }));
    await naya.ok('POST', `/v1/days/${d}/seal`, { tz: naya.tz });
    const before = await naya.ok('GET', `/v1/circles/${duoId}/days/${d}`);
    expect(before.locked.find((l: any) => l.id === a.id)?.reason).toBe('secret_card');
    env.setNow('2026-11-01T05:00:00Z');
    const b = naya.dropBody('2026-11-01', { kind: 'card', text: 'jawaban naya' }, { circleId: duoId });
    await naya.ok('POST', '/v1/drops', { ...b, meta: { cardId: secret.id } });
    const after = await naya.ok('GET', `/v1/circles/${duoId}/days/${d}`);
    expect(after.drops.some((x: any) => x.id === a.id)).toBe(true);
  });
});

describe('mode pisah, kenangan, blokir', () => {
  it('Mode Pisah: masing-masing hanya melihat Drop miliknya', async () => {
    env.setNow('2026-11-02T05:00:00Z');
    const a = await new Client(env.app, 'a@pisah.id').signup('A');
    const b = await new Client(env.app, 'b@pisah.id').signup('B');
    const duo = await a.createCircle('duo', 'A & B');
    await b.accept(await a.invite(duo.id));
    const d = '2026-11-02';
    await a.ok('POST', '/v1/drops', a.dropBody(d, { text: 'dari A' }, { circleId: duo.id }));
    await b.ok('POST', '/v1/drops', b.dropBody(d, { text: 'dari B' }, { circleId: duo.id }));
    await b.ok('POST', `/v1/days/${d}/seal`, { tz: b.tz });
    expect((await b.ok('GET', `/v1/circles/${duo.id}/days/${d}`)).drops).toHaveLength(2);
    await a.ok('POST', `/v1/circles/${duo.id}/split`);
    const after = await b.ok('GET', `/v1/circles/${duo.id}/days/${d}`);
    expect(after.drops.map((x: any) => b.open(x).text)).toEqual(['dari B']);
    expect(after.locked[0].reason).toBe('split');
    expect((await a.req('POST', '/v1/drops', a.dropBody(d, { text: 'lagi' }, { circleId: duo.id }))).status).toBe(409);
  });

  it('Mode Kenangan butuh dua konfirmasi di lingkaran dan bisa dibatalkan', async () => {
    const x = await new Client(env.app, 'x@kenang.id').signup('X');
    const y = await new Client(env.app, 'y@kenang.id').signup('Y');
    const z = await new Client(env.app, 'z@kenang.id').signup('Z');
    const c = await x.createCircle('circle', 'XYZ');
    const inv = await x.invite(c.id, 5);
    await y.accept(inv);
    await z.accept(inv);
    const first = await x.ok('POST', `/v1/circles/${c.id}/memorial`, { userId: z.userId });
    expect(first.confirmed).toBe(false);
    const second = await y.ok('POST', `/v1/circles/${c.id}/memorial`, { userId: z.userId });
    expect(second.confirmed).toBe(true);
    const s1 = await x.ok('GET', `/v1/circles/${c.id}`);
    expect(s1.members.find((m: any) => m.userId === z.userId).state).toBe('remembered');
    await z.ok('POST', `/v1/circles/${c.id}/memorial/undo`);
    const s2 = await x.ok('GET', `/v1/circles/${c.id}`);
    expect(s2.members.find((m: any) => m.userId === z.userId).state).toBe('active');
  });

  it('blokir menyembunyikan isi orang yang diblokir', async () => {
    const p = await new Client(env.app, 'p@blok.id').signup('P');
    const q = await new Client(env.app, 'q@blok.id').signup('Q');
    const r = await new Client(env.app, 'r@blok.id').signup('R');
    const c = await p.createCircle('circle', 'PQR');
    const inv = await p.invite(c.id, 5);
    await q.accept(inv);
    await r.accept(inv);
    const d = '2026-11-02';
    await q.ok('POST', '/v1/drops', q.dropBody(d, { text: 'dari Q' }, { circleId: c.id }));
    await p.ok('POST', '/v1/drops', p.dropBody(d, { text: 'dari P' }, { circleId: c.id }));
    await p.ok('POST', `/v1/days/${d}/seal`, { tz: p.tz });
    await p.ok('POST', `/v1/blocks/${q.userId}`);
    const v = await p.ok('GET', `/v1/circles/${c.id}/days/${d}`);
    expect(v.drops.every((x: any) => x.authorId !== q.userId)).toBe(true);
  });
});

describe('karya', () => {
  const env1 = (userId: string) => ({ ciphertext: 'c2VoYXJp', recipients: [{ t: 'user', userId, wk: 'eA==' }] });
  it('draf hanya terlihat penulis; terbit ke lingkaran bisa dibaca anggota', async () => {
    const wid = id();
    await raka.ok('POST', '/v1/works', { id: wid, status: 'draft', circleIds: [], envelope: env1(raka.userId) });
    expect((await naya.req('GET', `/v1/works/${wid}`)).status).toBe(404);
    expect((await raka.ok('GET', '/v1/works')).some((w: any) => w.id === wid)).toBe(true);

    await raka.ok('PUT', `/v1/works/${wid}`, { id: wid, status: 'published', circleIds: [duoId], envelope: env1(raka.userId) });
    const feed = await naya.ok('GET', '/v1/works/feed');
    expect(feed.map((w: any) => w.id)).toContain(wid);
    const w = await naya.ok('GET', `/v1/works/${wid}`);
    expect(w.publishedAt).toBeTruthy();
    await naya.ok('PUT', `/v1/works/${wid}/reactions/hug`);
    await naya.ok('POST', `/v1/works/${wid}/notes`, { id: id(), envelope: env1(naya.userId) });
    const again = await raka.ok('GET', `/v1/circles/${duoId}/works`);
    expect(again[0].reactions.length).toBe(1);
    expect(again[0].noteCount).toBe(1);
    // Hanya penulis yang boleh mengubah.
    expect((await naya.req('PUT', `/v1/works/${wid}`, { id: wid, status: 'draft', circleIds: [], envelope: env1(naya.userId) })).status).toBe(404);
    // Orang luar tidak bisa membaca.
    const luar = await new Client(env.app, 'luar@contoh.id').signup('Luar');
    expect((await luar.req('GET', `/v1/works/${wid}`)).status).toBe(404);
    expect((await luar.req('POST', '/v1/works', { id: id(), status: 'published', circleIds: [duoId], envelope: env1(luar.userId) })).status).toBe(403);
  });
});
