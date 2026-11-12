/**
 * Kota Sehari: patok persil × rentang tahun di kota publik. Isi rumah adalah
 * naskah terbuka (visibility 'kota'). Identitas publiknya nama pena kota,
 * terpisah dari jurnal; tidak ada tautan ke halaman pribadi penulis.
 */
import {
  KOTA_HUBUNGAN,
  KOTA_KUOTA,
  KOTA_LAPOR_SEMBUNYI,
  KOTA_MUSIM,
  KOTA_TERBENGKALAI_HARI,
  type KotaClaimWire,
  type KotaHubungan,
  type KotaJiwa,
  type KotaRelasiWire,
  type KotaTautanWire,
  type KotaTokohWire,
  kotaCekHubungan,
  kotaClaimBody,
  kotaJawabBody,
  kotaKetukBody,
  kotaOpen,
  kotaOverlap,
  kotaPenaBody,
  kotaPlot,
  kotaRegion,
  kotaReportBody,
  type KotaWire,
} from '@sehari/core';
import { and, eq, inArray, sql } from 'drizzle-orm';
import { Hono } from 'hono';
import { type AppEnv, body, type Services } from '../context';
import { schema } from '../db';
import { pushTo } from '../lib/domain';
import { bad, conflict, forbidden, notFound } from '../lib/errors';
import { newId } from '../lib/ids';
import { rateLimit } from '../lib/rate';

const { cityProfiles, cityClaims, cityReports, cityRelations, manuscripts, msScenes, msCanon } = schema;
type RelRow = typeof cityRelations.$inferSelect;
type ClaimRow = typeof cityClaims.$inferSelect;

export function kotaRoutes(s: Services) {
  const r = new Hono<AppEnv>();

  /** Klaim yang tampil (aktif atau terbengkalai), dengan nama pena dan jumlah adegan terbit. */
  const describe = async (rows: ClaimRow[], viewer: string, db: Pick<Services['db'], 'select'> = s.db): Promise<KotaClaimWire[]> => {
    if (!rows.length) return [];
    const [pens, counts] = await Promise.all([
      db.select().from(cityProfiles).where(inArray(cityProfiles.userId, [...new Set(rows.map((x) => x.ownerId))])),
      db
        .select({ msId: msScenes.msId, n: sql<number>`count(*)::int` })
        .from(msScenes)
        .where(and(inArray(msScenes.msId, rows.map((x) => x.msId)), eq(msScenes.status, 'terbit')))
        .groupBy(msScenes.msId),
    ]);
    const limit = s.now().getTime() - KOTA_TERBENGKALAI_HARI * 86_400_000;
    return rows.map((x) => {
      const scenes = counts.find((c) => c.msId === x.msId)?.n ?? 0;
      return {
        id: x.id,
        plotId: x.plotId,
        regionId: x.regionId,
        household: x.household,
        from: x.fromYear,
        to: x.toYear,
        ownerId: x.ownerId,
        penName: pens.find((p) => p.userId === x.ownerId)?.penName ?? 'warga',
        msId: x.msId,
        scenes,
        state: scenes === 0 && x.createdAt.getTime() < limit ? 'terbengkalai' : 'aktif',
        kind: x.kind as 'rumah' | 'leluhur',
        mine: x.ownerId === viewer,
        createdAt: x.createdAt.toISOString(),
      };
    });
  };
  const visible = () => s.db.select().from(cityClaims).where(and(eq(cityClaims.season, KOTA_MUSIM), eq(cityClaims.status, 'aktif')));

  r.get('/kota', async (c) => {
    const user = c.get('user');
    const [claims, [pen]] = await Promise.all([describe(await visible(), user.id), s.db.select().from(cityProfiles).where(eq(cityProfiles.userId, user.id))]);
    const used = (k: 'rumah' | 'leluhur') => claims.filter((x) => x.mine && x.state === 'aktif' && x.kind === k).length;
    const hasHome = used('rumah') > 0;
    const res: KotaWire = { season: KOTA_MUSIM, claims, me: { penName: pen?.penName ?? null, quota: Math.max(0, KOTA_KUOTA.rumah - used('rumah')), leluhur: hasHome ? Math.max(0, KOTA_KUOTA.leluhur - used('leluhur')) : 0 } };
    return c.json(res);
  });

  r.put('/kota/profil', async (c) => {
    const user = c.get('user');
    const { penName } = await body(c, kotaPenaBody);
    const [taken] = await s.db.select().from(cityProfiles).where(eq(cityProfiles.penName, penName));
    if (taken && taken.userId !== user.id) throw conflict('pena', 'Nama pena itu sudah dipakai warga lain.');
    await s.db.insert(cityProfiles).values({ userId: user.id, penName }).onConflictDoUpdate({ target: cityProfiles.userId, set: { penName } });
    return c.json({ penName });
  });

  /** Patok: persil harus di wilayah yang dibuka, rentangnya tidak bertumpuk dengan rumah lain. */
  r.post('/kota/claims', async (c) => {
    const user = c.get('user');
    const input = await body(c, kotaClaimBody);
    const plot = kotaPlot(input.plotId);
    const region = plot && kotaRegion(plot.region);
    if (!plot || !region || !kotaOpen(region)) throw bad('plot', 'Persil itu tidak ada atau wilayahnya belum dibuka.');
    if (input.from > input.to) throw bad('range', 'Tahun mulai harus sebelum tahun selesai.');
    if (input.from < region.since) throw bad('range', `${region.name} baru dihuni sejak ${region.since}.`);
    const [pen] = await s.db.select().from(cityProfiles).where(eq(cityProfiles.userId, user.id));
    if (!pen) throw conflict('pena', 'Pilih nama pena kota dulu.');
    await rateLimit(s, `kota:patok:${user.id}`, 10, 3600);
    const out = await s.db.transaction(async (tx) => {
      try {
        await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${input.plotId}))`);
      } catch {
        /* basis data tanpa kunci nasihat: transaksi tunggal sudah cukup */
      }
      const rows = await tx.select().from(cityClaims).where(and(eq(cityClaims.season, KOTA_MUSIM), eq(cityClaims.status, 'aktif'), sql`(${cityClaims.plotId} = ${input.plotId} or ${cityClaims.ownerId} = ${user.id})`));
      const live = (await describe(rows, user.id, tx)).filter((x) => x.state === 'aktif');
      const home = live.find((x) => x.mine && x.kind === 'rumah');
      if (input.kind === 'rumah' && home) throw conflict('quota', 'Musim ini kamu sudah punya satu rumah. Lepaskan dulu kalau ingin pindah.');
      if (input.kind === 'leluhur') {
        if (!home) throw conflict('quota', 'Patok rumah utamamu dulu, baru rumah leluhurnya.');
        if (input.from >= home.from) throw bad('range', `Rumah leluhur dimulai sebelum rumah utamamu (${home.from}).`);
        if (live.filter((x) => x.mine && x.kind === 'leluhur').length >= KOTA_KUOTA.leluhur) throw conflict('quota', `Paling banyak ${KOTA_KUOTA.leluhur} rumah leluhur per musim.`);
      }
      const clash = live.find((x) => x.plotId === input.plotId && kotaOverlap(x, input));
      if (clash) throw conflict('overlap', `Rentang itu bertumpuk dengan ${clash.household} (${clash.from}–${clash.to}).`);
      const now = s.now();
      const msId = `n${newId(19)}`;
      const id = `k${newId(19)}`;
      await tx.insert(manuscripts).values({ id: msId, circleId: null, ownerId: user.id, members: [user.id], visibility: 'kota', meta: { plain: { v: 1, title: input.household } }, createdAt: now, updatedAt: now });
      await tx.insert(cityClaims).values({ id, season: KOTA_MUSIM, regionId: region.id, plotId: input.plotId, ownerId: user.id, household: input.household, fromYear: input.from, toYear: input.to, msId, kind: input.kind, createdAt: now });
      return { id, msId };
    });
    return c.json(out, 201);
  });

  r.get('/kota/claims/:id', async (c) => {
    const user = c.get('user');
    const [x] = await s.db.select().from(cityClaims).where(eq(cityClaims.id, c.req.param('id')));
    if (!x || (x.status !== 'aktif' && x.ownerId !== user.id)) throw notFound('Rumah tidak ditemukan.');
    const [w] = await describe([x], user.id);
    return c.json(w);
  });

  /** Lepaskan rumah: persil lowong lagi; naskahnya tetap milik penulis. */
  r.delete('/kota/claims/:id', async (c) => {
    const user = c.get('user');
    const [x] = await s.db.select().from(cityClaims).where(eq(cityClaims.id, c.req.param('id')));
    if (!x) throw notFound('Rumah tidak ditemukan.');
    if (x.ownerId !== user.id) throw forbidden('Hanya pemilik rumah yang bisa melepasnya.');
    await s.db.update(cityClaims).set({ status: 'dilepas' }).where(eq(cityClaims.id, x.id));
    // Naskahnya tetap terbuka (tidak terenkripsi), tapi kini hanya terbaca oleh penulisnya.
    await s.db.update(manuscripts).set({ visibility: 'arsip' }).where(eq(manuscripts.id, x.msId));
    return c.json({ ok: true });
  });

  /** Laporan: sekali per warga; rumah disembunyikan setelah beberapa laporan berbeda. */
  r.post('/kota/claims/:id/report', async (c) => {
    const user = c.get('user');
    const { reason } = await body(c, kotaReportBody);
    const [x] = await s.db.select().from(cityClaims).where(eq(cityClaims.id, c.req.param('id')));
    if (!x || x.status !== 'aktif') throw notFound('Rumah tidak ditemukan.');
    if (x.ownerId === user.id) throw bad('own', 'Tidak bisa melaporkan rumah sendiri.');
    await s.db.insert(cityReports).values({ id: newId(), claimId: x.id, reporterId: user.id, reason }).onConflictDoNothing();
    const [n] = await s.db.select({ n: sql<number>`count(*)::int` }).from(cityReports).where(eq(cityReports.claimId, x.id));
    if ((n?.n ?? 0) >= KOTA_LAPOR_SEMBUNYI) {
      await s.db.update(cityClaims).set({ status: 'disembunyikan' }).where(eq(cityClaims.id, x.id));
      await s.db.update(manuscripts).set({ visibility: 'arsip' }).where(eq(manuscripts.id, x.msId));
    }
    return c.json({ ok: true });
  });

  // ── Ketuk ──

  /** Tokoh (entri Kanon jenis tokoh) di rumah-rumah ini. Isi rumah kota terbuka, jadi server bisa membacanya. */
  const tokohOf = async (rows: ClaimRow[]): Promise<KotaTokohWire[]> => {
    if (!rows.length) return [];
    const canon = await s.db.select().from(msCanon).where(and(inArray(msCanon.msId, rows.map((x) => x.msId)), eq(msCanon.kind, 'tokoh')));
    return canon.flatMap((e) => {
      const p = (e.envelope as { plain?: { name?: string; born?: number; died?: number } }).plain;
      const claim = rows.find((x) => x.msId === e.msId);
      return p?.name && claim ? [{ id: e.id, claimId: claim.id, name: p.name, born: p.born, died: p.died }] : [];
    });
  };
  const jiwa = (t: KotaTokohWire, c: ClaimRow): KotaJiwa => ({ name: t.name, born: t.born, died: t.died, from: c.fromYear, to: c.toYear });
  const claimById = async (id: string) => (await s.db.select().from(cityClaims).where(eq(cityClaims.id, id)))[0];
  /** Bentuk publik sebuah hubungan; surat hanya untuk kedua pemilik rumah. */
  const relWire = (x: RelRow, claims: ClaimRow[], live: Set<string>, viewer: string): KotaRelasiWire => {
    const a = claims.find((c) => c.id === x.fromClaimId);
    const b = claims.find((c) => c.id === x.toClaimId);
    const party = a?.ownerId === viewer || b?.ownerId === viewer;
    const gone = !live.has(x.fromClaimId) || !live.has(x.toClaimId);
    return {
      id: x.id,
      fromClaimId: x.fromClaimId,
      fromTokoh: x.fromTokoh,
      toClaimId: x.toClaimId,
      toTokoh: x.toTokoh,
      type: x.type as KotaRelasiWire['type'],
      counter: (x.counter as KotaRelasiWire['type']) ?? null,
      state: x.state === 'kanon' && gone ? 'desas' : (x.state as KotaRelasiWire['state']),
      letter: party ? x.letter : null,
      createdAt: x.createdAt.toISOString(),
    };
  };
  /** Kumpulkan rumah, tokoh, dan hubungan untuk ditampilkan. */
  const bundle = async (rels: RelRow[], seed: ClaimRow[], viewer: string): Promise<KotaTautanWire> => {
    const ids = [...new Set([...seed.map((x) => x.id), ...rels.flatMap((x) => [x.fromClaimId, x.toClaimId])])];
    const rows = ids.length ? await s.db.select().from(cityClaims).where(inArray(cityClaims.id, ids)) : [];
    const claims = await describe(rows, viewer);
    const live = new Set(claims.filter((c) => c.state === 'aktif' && rows.find((r) => r.id === c.id)?.status === 'aktif').map((c) => c.id));
    const shown = claims.filter((c) => rows.find((r) => r.id === c.id)?.status === 'aktif');
    return { relations: rels.map((x) => relWire(x, rows, live, viewer)), tokoh: await tokohOf(rows.filter((r) => r.status === 'aktif')), claims: shown };
  };
  const PUBLIC = ['kanon', 'desas'];

  r.get('/kota/claims/:id/tautan', async (c) => {
    const user = c.get('user');
    const me = await claimById(c.req.param('id'));
    if (!me || (me.status !== 'aktif' && me.ownerId !== user.id)) throw notFound('Rumah tidak ditemukan.');
    const rels = await s.db.select().from(cityRelations).where(sql`${cityRelations.fromClaimId} = ${me.id} or ${cityRelations.toClaimId} = ${me.id}`);
    const others = rels.length ? await s.db.select().from(cityClaims).where(inArray(cityClaims.id, rels.flatMap((x) => [x.fromClaimId, x.toClaimId]))) : [];
    const party = (x: RelRow) => [x.fromClaimId, x.toClaimId].some((id) => (id === me.id ? me : others.find((o) => o.id === id))?.ownerId === user.id);
    return c.json(await bundle(rels.filter((x) => PUBLIC.includes(x.state) || party(x)), [me], user.id));
  });

  /** Silsilah: semua rumah yang tersambung lewat hubungan kanon atau desas-desus. */
  r.get('/kota/silsilah/:id', async (c) => {
    const user = c.get('user');
    const me = await claimById(c.req.param('id'));
    if (!me || me.status !== 'aktif') throw notFound('Rumah tidak ditemukan.');
    const seen = new Set([me.id]);
    const rels = new Map<string, RelRow>();
    let frontier = [me.id];
    while (frontier.length && seen.size < 40) {
      const step = await s.db
        .select()
        .from(cityRelations)
        .where(and(inArray(cityRelations.state, PUBLIC), sql`(${cityRelations.fromClaimId} in ${frontier} or ${cityRelations.toClaimId} in ${frontier})`));
      frontier = [];
      for (const x of step) {
        rels.set(x.id, x);
        for (const id of [x.fromClaimId, x.toClaimId]) if (!seen.has(id) && seen.size < 40) (seen.add(id), frontier.push(id));
      }
    }
    return c.json(await bundle([...rels.values()], [me], user.id));
  });

  r.post('/kota/ketuk', async (c) => {
    const user = c.get('user');
    const input = await body(c, kotaKetukBody);
    const [a, b] = [await claimById(input.fromClaimId), await claimById(input.toClaimId)];
    if (!a || a.ownerId !== user.id || a.status !== 'aktif') throw forbidden('Ketuk dari rumahmu sendiri.');
    if (!b || b.status !== 'aktif') throw notFound('Rumah yang diketuk tidak ditemukan.');
    if (a.id === b.id) throw bad('same', 'Hubungan di dalam satu rumah ditulis di Kanon rumahmu.');
    const tokoh = await tokohOf([a, b]);
    const ta = tokoh.find((t) => t.id === input.fromTokoh && t.claimId === a.id);
    const tb = tokoh.find((t) => t.id === input.toTokoh && t.claimId === b.id);
    if (!ta || !tb) throw bad('tokoh', 'Tokoh itu tidak ada di rumahnya.');
    const fail = kotaCekHubungan(input.type, jiwa(ta, a), jiwa(tb, b)).find((x) => !x.ok);
    if (fail) throw bad('cek', fail.text);
    const dup = await s.db
      .select({ id: cityRelations.id })
      .from(cityRelations)
      .where(and(inArray(cityRelations.state, ['ketuk', 'usul', 'kanon', 'desas']), sql`((${cityRelations.fromTokoh} = ${ta.id} and ${cityRelations.toTokoh} = ${tb.id}) or (${cityRelations.fromTokoh} = ${tb.id} and ${cityRelations.toTokoh} = ${ta.id}))`));
    if (dup.length) throw conflict('dup', 'Kedua tokoh ini sudah punya hubungan atau ketukan yang menunggu.');
    await rateLimit(s, `kota:ketuk:${user.id}`, 12, 24 * 3600);
    const same = a.ownerId === b.ownerId;
    const now = s.now();
    const id = `r${newId(19)}`;
    await s.db.insert(cityRelations).values({ id, fromClaimId: a.id, fromTokoh: ta.id, toClaimId: b.id, toTokoh: tb.id, type: input.type, state: same ? 'kanon' : 'ketuk', letter: input.letter, createdAt: now, updatedAt: now });
    if (!same) void pushTo(s, [b.ownerId], { body: `Ada yang mengetuk pintu ${b.household}.`, data: { type: 'kota', claimId: b.id } }).catch(() => {});
    return c.json({ id, state: same ? 'kanon' : 'ketuk' }, 201);
  });

  /** Jawaban pemilik rumah (kanon, desas-desus, usul balik, tolak) atau pengetuk (terima usul balik, tarik). */
  r.put('/kota/ketuk/:rid', async (c) => {
    const user = c.get('user');
    const { action, type } = await body(c, kotaJawabBody);
    const [x] = await s.db.select().from(cityRelations).where(eq(cityRelations.id, c.req.param('rid')));
    if (!x) throw notFound('Ketukan tidak ditemukan.');
    const [a, b] = [await claimById(x.fromClaimId), await claimById(x.toClaimId)];
    if (!a || !b) throw notFound('Rumah tidak ditemukan.');
    const host = b.ownerId === user.id;
    const guest = a.ownerId === user.id;
    let set: Partial<RelRow> = {};
    if (host && x.state === 'ketuk' && ['kanon', 'desas', 'tolak'].includes(action)) set = { state: action };
    else if (host && x.state === 'ketuk' && action === 'usul') {
      if (!type || type === x.type) throw bad('type', 'Pilih jenis hubungan lain untuk diusulkan.');
      const tokoh = await tokohOf([a, b]);
      const ta = tokoh.find((t) => t.id === x.fromTokoh);
      const tb = tokoh.find((t) => t.id === x.toTokoh);
      const fail = ta && tb ? kotaCekHubungan(type, jiwa(ta, a), jiwa(tb, b)).find((k) => !k.ok) : undefined;
      if (fail) throw bad('cek', fail.text);
      set = { state: 'usul', counter: type };
    } else if (guest && x.state === 'usul' && action === 'terima') set = { state: 'kanon', type: x.counter!, counter: null };
    else if (guest && (x.state === 'ketuk' || x.state === 'usul') && action === 'tarik') set = { state: 'tarik' };
    else throw forbidden('Langkah itu tidak bisa dilakukan sekarang.');
    await s.db.update(cityRelations).set({ ...set, updatedAt: s.now() }).where(eq(cityRelations.id, x.id));
    const other = host ? a : b;
    const msg = set.state === 'kanon' ? `Ketukan antara ${a.household} dan ${b.household} kini jadi kanon.` : set.state === 'desas' ? `${b.household} menerima ketukanmu sebagai desas-desus.` : set.state === 'usul' ? `${b.household} mengusulkan hubungan lain.` : set.state === 'tolak' ? `${b.household} menolak ketukanmu dengan sopan.` : null;
    if (msg && other.ownerId !== user.id) void pushTo(s, [other.ownerId], { body: msg, data: { type: 'kota', claimId: other.id } }).catch(() => {});
    return c.json({ ok: true, state: set.state });
  });

  return r;
}
