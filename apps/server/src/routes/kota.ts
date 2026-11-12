/**
 * Kota Sehari: patok persil × rentang tahun di kota publik. Isi rumah adalah
 * naskah terbuka (visibility 'kota'). Identitas publiknya nama pena kota,
 * terpisah dari jurnal; tidak ada tautan ke halaman pribadi penulis.
 */
import {
  KOTA_ALMANAK_AWAL,
  KOTA_WARGA_AWAL,
  type KotaFigurWire,
  type KotaNamaWire,
  type KotaPegangWire,
  type KotaUbahWire,
  kotaFigurBody,
  kotaFigurKini,
  kotaPegangBody,
  kotaPegangJawab,
  kotaUbahBody,
  KOTA_ID,
  KOTA_SETUJU_KANON,
  type KotaKesaksianWire,
  type KotaPeristiwaWire,
  kotaPeristiwaBody,
  kotaPeristiwaJawab,
  KOTA_PATOK_MAKS,
  KOTA_TOKOH_MAKS,
  kotaHidupDi,
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
import { tokohku } from '../lib/kotaTokoh';

const { cityProfiles, cityClaims, cityReports, cityRelations, cityEvents, cityFigures, cityFigureChanges, cityHolds, manuscripts, msScenes, msCanon } = schema;
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
  const visible = () => s.db.select().from(cityClaims).where(and(eq(cityClaims.city, KOTA_ID), eq(cityClaims.season, KOTA_MUSIM), eq(cityClaims.status, 'aktif')));

  r.get('/kota', async (c) => {
    const user = c.get('user');
    const [claims, [pen]] = await Promise.all([describe(await visible(), user.id), s.db.select().from(cityProfiles).where(eq(cityProfiles.userId, user.id))]);
    const mineT = await tokohku(s, user.id);
    const res: KotaWire = {
      season: KOTA_MUSIM,
      claims,
      me: {
        penName: pen?.penName ?? null,
        patok: { pakai: claims.filter((x) => x.mine && x.state === 'aktif').length, maks: KOTA_PATOK_MAKS },
        tokoh: { pakai: mineT.length, maks: KOTA_TOKOH_MAKS },
        tokohku: mineT,
      },
    };
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
      const rows = await tx.select().from(cityClaims).where(and(eq(cityClaims.city, KOTA_ID), eq(cityClaims.season, KOTA_MUSIM), eq(cityClaims.status, 'aktif'), sql`(${cityClaims.plotId} = ${input.plotId} or ${cityClaims.ownerId} = ${user.id})`));
      const live = (await describe(rows, user.id, tx)).filter((x) => x.state === 'aktif');
      // Aturan musim: paling banyak 3 patok dan 3 tokoh per warga.
      const own = live.filter((x) => x.mine);
      if (own.length >= KOTA_PATOK_MAKS) throw conflict('quota', `Paling banyak ${KOTA_PATOK_MAKS} patok per musim. Lepaskan salah satu rumahmu dulu.`);
      const kind = own.some((x) => x.kind === 'rumah') ? 'leluhur' : 'rumah';
      const mineT = await tokohku(s, user.id, tx);
      const asli = mineT.filter((x) => !x.dipegang);
      const rentang = { from: input.from, to: input.to };
      const pindah = [...new Set(input.pindah)].map((tid) => {
        const x = asli.find((y) => y.id === tid);
        if (!x) throw bad('pindah', 'Yang pindah ke sini harus tokohmu sendiri.');
        if (!kotaHidupDi(x, rentang)) throw bad('pindah', `${x.name} tidak hidup di rentang ${input.from}–${input.to}.`);
        return x;
      });
      const baru = input.tokoh;
      if (!baru && !pindah.length) throw bad('tokoh', 'Setiap patok dihuni minimal satu tokohmu: tokoh baru, atau tokohmu yang pindah dari rumah lain.');
      let ikat: (typeof asli)[number] | undefined;
      if (baru) {
        if (mineT.length >= KOTA_TOKOH_MAKS) throw conflict('tokoh', `Kamu sudah memakai ${KOTA_TOKOH_MAKS} tokoh. Pindahkan salah satu tokohmu ke rumah ini, atau tambahkan figuran.`);
        if (baru.born && baru.died && baru.died < baru.born) throw bad('tokoh', 'Tahun wafat harus sesudah tahun lahir.');
        if (!kotaHidupDi(baru, rentang)) throw bad('tokoh', `${baru.name} tidak hidup di rentang ${input.from}–${input.to}.`);
        const sePersil = own.some((x) => x.plotId === input.plotId);
        if (own.length && !pindah.length && !sePersil && !input.ikat) throw bad('ikat', 'Tokoh baru di patok tambahan harus keluarga salah satu tokohmu, kecuali ia tinggal di persil rumahmu yang sama.');
        if (input.ikat) {
          ikat = asli.find((y) => y.id === input.ikat!.tokohId);
          const rumahnya = ikat && own.find((x) => x.id === ikat!.claimId);
          if (!ikat || !rumahnya) throw bad('ikat', 'Ikatan keluarga harus dengan tokohmu sendiri.');
          const gagal = kotaCekHubungan(input.ikat.type, { name: baru.name, born: baru.born, died: baru.died, from: input.from, to: input.to }, { name: ikat.name, born: ikat.born, died: ikat.died, from: rumahnya.from, to: rumahnya.to }).find((x) => !x.ok);
          if (gagal) throw bad('ikat', gagal.text);
        }
      }
      const clash = live.find((x) => x.plotId === input.plotId && kotaOverlap(x, input));
      if (clash) throw conflict('overlap', `Rentang itu bertumpuk dengan ${clash.household} (${clash.from}–${clash.to}).`);
      const now = s.now();
      const msId = `n${newId(19)}`;
      const id = `k${newId(19)}`;
      await tx.insert(manuscripts).values({ id: msId, circleId: null, ownerId: user.id, members: [user.id], visibility: 'kota', meta: { plain: { v: 1, title: input.household } }, createdAt: now, updatedAt: now });
      await tx.insert(cityClaims).values({ id, city: KOTA_ID, season: KOTA_MUSIM, regionId: region.id, plotId: input.plotId, ownerId: user.id, household: input.household, fromYear: input.from, toYear: input.to, msId, kind, createdAt: now });
      const kanon = (cid: string, envelope: unknown) => ({ id: cid, msId, kind: 'tokoh', authorId: user.id, updatedBy: user.id, envelope, createdAt: now, updatedAt: now });
      if (baru) {
        const tid = baru.id ?? `c${newId(19)}`;
        const [ada] = await tx.select({ id: msCanon.id }).from(msCanon).where(eq(msCanon.id, tid));
        if (ada) throw conflict('id', 'Id tokoh sudah dipakai.');
        await tx.insert(msCanon).values(kanon(tid, { plain: { v: 1, kind: 'tokoh', name: baru.name, aliases: [], known: [], peran: 'utama', born: baru.born, died: baru.died } }));
        if (ikat && input.ikat) await tx.insert(cityRelations).values({ id: `r${newId(19)}`, fromClaimId: id, fromTokoh: tid, toClaimId: ikat.claimId, toTokoh: ikat.id, type: input.ikat.type, state: 'kanon', letter: 'diikat saat mematok rumah keluarga', createdAt: now, updatedAt: now });
      }
      if (pindah.length) {
        const asal = await tx.select().from(msCanon).where(inArray(msCanon.id, pindah.map((x) => x.id)));
        for (const x of pindah) {
          const p = (asal.find((e) => e.id === x.id)?.envelope as { plain?: Record<string, unknown> } | undefined)?.plain ?? {};
          // Kunci orangnya tetap tokoh asal pertama, walau yang dipindah sebuah salinan.
          const kunci = (p.asal as { claimId: string; tokohId: string } | undefined) ?? { claimId: x.claimId, tokohId: x.id };
          await tx.insert(msCanon).values(kanon(`c${newId(19)}`, { plain: { ...p, known: [], since: undefined, peran: 'utama', asal: kunci } }));
        }
      }
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
    const t = await bundle(rels.filter((x) => PUBLIC.includes(x.state) || party(x)), [me], user.id);
    return c.json({ ...t, pegang: await pegangOf(me, user.id) });
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

  // ── Almanak & peristiwa ──

  /** Adegan terbit di rumah-rumah kota yang ditandai sebagai kesaksian peristiwa. */
  const kesaksian = async (eventId: string | null, viewer: string) => {
    const claims = await visible();
    if (!claims.length) return [];
    const rows = await s.db
      .select({ id: msScenes.id, msId: msScenes.msId, envelope: msScenes.envelope })
      .from(msScenes)
      .where(and(inArray(msScenes.msId, claims.map((c) => c.msId)), eq(msScenes.status, 'terbit'), eventId ? sql`${msScenes.envelope}->'plain'->>'peristiwa' = ${eventId}` : sql`${msScenes.envelope}->'plain'->>'peristiwa' is not null`));
    const wires = await describe(claims, viewer);
    const tokoh = await tokohOf(claims);
    return rows.flatMap((x) => {
      const p = (x.envelope as { plain?: { peristiwa?: string; saksi?: string; pov?: string; when?: { label?: string }; text?: string } }).plain;
      const c = wires.find((w) => w.msId === x.msId);
      if (!p?.peristiwa || !c || c.state !== 'aktif') return [];
      const k: KotaKesaksianWire & { peristiwa: string } = {
        peristiwa: p.peristiwa,
        claimId: c.id,
        household: c.household,
        regionId: c.regionId,
        plotId: c.plotId,
        penName: c.penName,
        msId: c.msId,
        sceneId: x.id,
        tokoh: tokoh.find((t) => t.id === p.pov)?.name ?? 'seseorang',
        when: p.when?.label ?? '',
        text: (p.text ?? '').slice(0, 1600),
        saksi: p.saksi === 'mendengar' ? 'mendengar' : 'mengalami',
      };
      return [k];
    });
  };
  const eventWires = async (viewer: string): Promise<KotaPeristiwaWire[]> => {
    const [rows, saksi] = await Promise.all([s.db.select().from(cityEvents).where(and(eq(cityEvents.city, KOTA_ID), inArray(cityEvents.state, ['usul', 'kanon']))), kesaksian(null, viewer)]);
    const pens = rows.length ? await s.db.select().from(cityProfiles).where(inArray(cityProfiles.userId, [...new Set(rows.map((x) => x.proposerId))])) : [];
    const count = (id: string) => saksi.filter((k) => (k as { peristiwa: string }).peristiwa === id).length;
    return [
      ...KOTA_ALMANAK_AWAL.map((e) => ({ ...e, state: 'kanon' as const, proposer: null, endorsements: 0, endorsedByMe: false, mine: false, testimonies: count(e.id) })),
      ...rows.map((e) => ({
        id: e.id,
        title: e.title,
        year: e.year,
        month: e.month ?? undefined,
        toYear: e.toYear ?? undefined,
        regions: e.regions,
        body: e.body,
        state: e.state as 'kanon' | 'usul',
        proposer: pens.find((p) => p.userId === e.proposerId)?.penName ?? 'warga',
        endorsements: e.endorsers.length,
        endorsedByMe: e.endorsers.includes(viewer),
        mine: e.proposerId === viewer,
        testimonies: count(e.id),
      })),
    ].sort((a, b) => a.year - b.year || (a.month ?? 0) - (b.month ?? 0));
  };
  /** Warga = punya rumah aktif di kota ini. */
  const warga = async (userId: string) => (await describe((await visible()).filter((x) => x.ownerId === userId), userId)).some((x) => x.state === 'aktif');

  r.get('/kota/almanak', async (c) => c.json(await eventWires(c.get('user').id)));

  r.get('/kota/peristiwa/:id', async (c) => {
    const user = c.get('user');
    const event = (await eventWires(user.id)).find((e) => e.id === c.req.param('id'));
    if (!event) throw notFound('Peristiwa tidak ditemukan.');
    return c.json({ event, testimonies: await kesaksian(event.id, user.id) });
  });

  r.post('/kota/almanak', async (c) => {
    const user = c.get('user');
    const input = await body(c, kotaPeristiwaBody);
    if (!(await warga(user.id))) throw forbidden('Usulan peristiwa datang dari warga yang punya rumah di kota.');
    if (input.toYear !== undefined && input.toYear < input.year) throw bad('range', 'Tahun selesai harus sesudah tahun mulai.');
    if (input.regions.some((r) => !kotaRegion(r))) throw bad('region', 'Wilayah tidak dikenal.');
    await rateLimit(s, `kota:peristiwa:${user.id}`, 5, 24 * 3600);
    const id = `p${newId(19)}`;
    await s.db.insert(cityEvents).values({ id, city: KOTA_ID, title: input.title, year: input.year, month: input.month ?? null, toYear: input.toYear ?? null, regions: input.regions, body: input.body, proposerId: user.id });
    return c.json({ id }, 201);
  });

  /** Setuju (warga lain yang punya rumah) atau tarik (pengusul). Kanon setelah cukup warga setuju. */
  r.put('/kota/almanak/:id', async (c) => {
    const user = c.get('user');
    const { action } = await body(c, kotaPeristiwaJawab);
    const [e] = await s.db.select().from(cityEvents).where(eq(cityEvents.id, c.req.param('id')));
    if (!e || e.state === 'tarik') throw notFound('Usulan tidak ditemukan.');
    if (action === 'tarik') {
      if (e.proposerId !== user.id) throw forbidden('Hanya pengusul yang bisa menarik usulannya.');
      if (e.state === 'kanon') throw conflict('kanon', 'Peristiwa yang sudah kanon tidak bisa ditarik.');
      await s.db.update(cityEvents).set({ state: 'tarik' }).where(eq(cityEvents.id, e.id));
      return c.json({ ok: true, state: 'tarik' });
    }
    if (e.proposerId === user.id) throw bad('own', 'Usulanmu sendiri butuh persetujuan warga lain.');
    if (!(await warga(user.id))) throw forbidden('Hanya warga yang punya rumah di kota yang bisa menyetujui.');
    const endorsers = [...new Set([...e.endorsers, user.id])];
    const state = endorsers.length >= KOTA_SETUJU_KANON ? 'kanon' : e.state;
    await s.db.update(cityEvents).set({ endorsers, state }).where(eq(cityEvents.id, e.id));
    if (state === 'kanon' && e.state !== 'kanon') void pushTo(s, [e.proposerId], { body: `Usulanmu "${e.title}" kini tercatat di almanak kota.`, data: { type: 'kota' } }).catch(() => {});
    return c.json({ ok: true, state });
  });

  /** Rumah kota pemilik sebuah naskah: dipakai editor untuk "dari kota". */
  r.get('/kota/naskah/:msId', async (c) => {
    const user = c.get('user');
    const [x] = await s.db.select().from(cityClaims).where(and(eq(cityClaims.msId, c.req.param('msId')), eq(cityClaims.status, 'aktif')));
    if (!x) throw notFound('Naskah ini bukan rumah di kota.');
    const [w] = await describe([x], user.id);
    return c.json(w);
  });

  // ── Buku Warga Kota ──

  /** Adegan terbit di rumah aktif yang memenuhi syarat (kesaksian, perjumpaan). */
  const adeganKota = async (cond: ReturnType<typeof sql>, viewer: string) => {
    const claims = await visible();
    if (!claims.length) return [];
    const rows = await s.db.select({ id: msScenes.id, msId: msScenes.msId, envelope: msScenes.envelope }).from(msScenes).where(and(inArray(msScenes.msId, claims.map((c) => c.msId)), eq(msScenes.status, 'terbit'), cond));
    const wires = await describe(claims, viewer);
    const tokoh = await tokohOf(claims);
    return rows.flatMap((x) => {
      const p = (x.envelope as { plain?: { pov?: string; when?: { label?: string }; text?: string; jumpa?: string[] } }).plain;
      const c = wires.find((w) => w.msId === x.msId);
      if (!p || !c || c.state !== 'aktif') return [];
      return [{ claimId: c.id, household: c.household, regionId: c.regionId, plotId: c.plotId, penName: c.penName, msId: c.msId, sceneId: x.id, tokoh: tokoh.find((t) => t.id === p.pov)?.name ?? 'seseorang', when: p.when?.label ?? '', text: (p.text ?? '').slice(0, 1600), saksi: 'mengalami' as const, jumpa: p.jumpa ?? [] }];
    });
  };
  const figurWires = async (viewer: string): Promise<KotaFigurWire[]> => {
    const [rows, changes, jumpa] = await Promise.all([
      s.db.select().from(cityFigures).where(and(eq(cityFigures.city, KOTA_ID), inArray(cityFigures.state, ['usul', 'kanon']))),
      s.db.select().from(cityFigureChanges).where(inArray(cityFigureChanges.state, ['usul', 'kanon'])),
      adeganKota(sql`${msScenes.envelope}->'plain'->'jumpa' is not null`, viewer),
    ]);
    const pens = new Map((await s.db.select().from(cityProfiles)).map((p) => [p.userId, p.penName]));
    const ubahOf = (fid: string): KotaUbahWire[] =>
      changes
        .filter((x) => x.figureId === fid)
        .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
        .map((x) => ({ id: x.id, figurId: x.figureId, kind: x.kind as never, text: x.text, year: x.year ?? undefined, region: x.region ?? undefined, state: x.state as never, proposer: pens.get(x.proposerId) ?? 'warga', endorsements: x.endorsers.length, endorsedByMe: x.endorsers.includes(viewer), mine: x.proposerId === viewer, createdAt: x.createdAt.toISOString() }));
    const kini = (f: Parameters<typeof kotaFigurKini>[0], u: KotaUbahWire[]) => kotaFigurKini(f, u.filter((x) => x.state === 'kanon'));
    const n = (id: string) => jumpa.filter((j) => j.jumpa.includes(id)).length;
    return [
      ...KOTA_WARGA_AWAL.map((f) => {
        const u = ubahOf(f.id);
        return { ...kini(f, u), state: 'kanon' as const, proposer: null, endorsements: 0, endorsedByMe: false, mine: false, jumpa: n(f.id), ubah: u };
      }),
      ...rows.map((r) => {
        const u = ubahOf(r.id);
        const f = { id: r.id, name: r.name, julukan: r.julukan ?? undefined, region: r.region, tempat: r.tempat, ciri: r.ciri, born: r.born ?? undefined, died: r.died ?? undefined, tetap: r.tetap };
        return { ...kini(f, u), state: r.state as 'kanon' | 'usul', proposer: pens.get(r.proposerId) ?? 'warga', endorsements: r.endorsers.length, endorsedByMe: r.endorsers.includes(viewer), mine: r.proposerId === viewer, jumpa: n(r.id), ubah: u };
      }),
    ];
  };

  r.get('/kota/warga', async (c) => c.json(await figurWires(c.get('user').id)));

  r.get('/kota/warga/:id', async (c) => {
    const user = c.get('user');
    const figur = (await figurWires(user.id)).find((f) => f.id === c.req.param('id'));
    if (!figur) throw notFound('Figuran tidak ditemukan.');
    const perjumpaan = await adeganKota(sql`${msScenes.envelope}->'plain'->'jumpa' @> ${JSON.stringify([figur.id])}::jsonb`, user.id);
    return c.json({ figur, perjumpaan: perjumpaan.map(({ jumpa: _j, ...x }) => x) });
  });

  r.post('/kota/warga', async (c) => {
    const user = c.get('user');
    const input = await body(c, kotaFigurBody);
    if (!(await warga(user.id))) throw forbidden('Figuran kota diusulkan oleh warga yang punya rumah.');
    if (!kotaRegion(input.region)) throw bad('region', 'Wilayah tidak dikenal.');
    if (input.born && input.died && input.died < input.born) throw bad('range', 'Tahun wafat harus sesudah tahun lahir.');
    const taken = (await figurWires(user.id)).some((f) => f.name.toLowerCase() === input.name.toLowerCase());
    if (taken) throw conflict('nama', 'Sudah ada figuran kota dengan nama itu.');
    await rateLimit(s, `kota:figur:${user.id}`, 5, 24 * 3600);
    const id = `f${newId(19)}`;
    await s.db.insert(cityFigures).values({ id, city: KOTA_ID, name: input.name, julukan: input.julukan ?? null, region: input.region, tempat: input.tempat, ciri: input.ciri, born: input.born ?? null, died: input.died ?? null, tetap: input.tetap, proposerId: user.id });
    return c.json({ id }, 201);
  });

  r.put('/kota/warga/:id', async (c) => {
    const user = c.get('user');
    const { action } = await body(c, kotaPeristiwaJawab);
    const [f] = await s.db.select().from(cityFigures).where(eq(cityFigures.id, c.req.param('id')));
    if (!f || f.state === 'tarik') throw notFound('Usulan tidak ditemukan.');
    if (action === 'tarik') {
      if (f.proposerId !== user.id || f.state === 'kanon') throw forbidden('Hanya pengusul yang bisa menarik usulan yang belum kanon.');
      await s.db.update(cityFigures).set({ state: 'tarik' }).where(eq(cityFigures.id, f.id));
      return c.json({ ok: true, state: 'tarik' });
    }
    if (f.proposerId === user.id) throw bad('own', 'Usulanmu sendiri butuh persetujuan warga lain.');
    if (!(await warga(user.id))) throw forbidden('Hanya warga yang punya rumah yang bisa menyetujui.');
    const endorsers = [...new Set([...f.endorsers, user.id])];
    const state = endorsers.length >= KOTA_SETUJU_KANON ? 'kanon' : f.state;
    await s.db.update(cityFigures).set({ endorsers, state }).where(eq(cityFigures.id, f.id));
    return c.json({ ok: true, state });
  });

  /** Usul perubahan besar: wafat, pindah, atau fakta baru yang mengikat semua rumah. */
  r.post('/kota/warga/:id/ubah', async (c) => {
    const user = c.get('user');
    const input = await body(c, kotaUbahBody);
    const f = (await figurWires(user.id)).find((x) => x.id === c.req.param('id') && x.state === 'kanon');
    if (!f) throw notFound('Figuran tidak ditemukan.');
    if (!(await warga(user.id))) throw forbidden('Perubahan diusulkan oleh warga yang punya rumah.');
    if (input.kind === 'wafat' && (!input.year || (f.born && input.year < f.born))) throw bad('year', 'Tahun wafat harus sesudah tahun lahirnya.');
    if (input.kind === 'wafat' && f.died) throw conflict('wafat', `${f.name} sudah tercatat wafat pada ${f.died}.`);
    if (input.kind === 'pindah' && (!input.region || !kotaRegion(input.region))) throw bad('region', 'Pilih wilayah tujuan.');
    await rateLimit(s, `kota:ubah:${user.id}`, 8, 24 * 3600);
    const id = `u${newId(19)}`;
    await s.db.insert(cityFigureChanges).values({ id, figureId: f.id, kind: input.kind, text: input.text, year: input.year ?? null, region: input.region ?? null, proposerId: user.id });
    return c.json({ id }, 201);
  });

  r.put('/kota/ubah/:id', async (c) => {
    const user = c.get('user');
    const { action } = await body(c, kotaPeristiwaJawab);
    const [u] = await s.db.select().from(cityFigureChanges).where(eq(cityFigureChanges.id, c.req.param('id')));
    if (!u || u.state === 'tarik') throw notFound('Usulan tidak ditemukan.');
    if (action === 'tarik') {
      if (u.proposerId !== user.id || u.state === 'kanon') throw forbidden('Hanya pengusul yang bisa menarik usulan yang belum kanon.');
      await s.db.update(cityFigureChanges).set({ state: 'tarik' }).where(eq(cityFigureChanges.id, u.id));
      return c.json({ ok: true, state: 'tarik' });
    }
    if (u.proposerId === user.id) throw bad('own', 'Usulanmu sendiri butuh persetujuan warga lain.');
    if (!(await warga(user.id))) throw forbidden('Hanya warga yang punya rumah yang bisa menyetujui.');
    const endorsers = [...new Set([...u.endorsers, user.id])];
    const state = endorsers.length >= KOTA_SETUJU_KANON ? 'kanon' : u.state;
    await s.db.update(cityFigureChanges).set({ endorsers, state }).where(eq(cityFigureChanges.id, u.id));
    return c.json({ ok: true, state });
  });

  /** Indeks nama kota untuk penjaga konsistensi di studio. */
  r.get('/kota/nama', async (c) => {
    const user = c.get('user');
    const claims = await visible();
    const live = (await describe(claims, user.id)).filter((x) => x.state === 'aktif');
    const canon = live.length ? await s.db.select().from(msCanon).where(and(inArray(msCanon.msId, live.map((x) => x.msId)), eq(msCanon.kind, 'tokoh'))) : [];
    const out: KotaNamaWire[] = [];
    type P = { name?: string; peran?: string; sapa?: string; born?: number; died?: number; asal?: { tokohId: string } };
    const pl = (e: { envelope: unknown }) => (e.envelope as { plain?: P }).plain;
    for (const e of canon) {
      const p = pl(e);
      const cl = live.find((x) => x.msId === e.msId);
      if (!p?.name || !cl || p.asal) continue;
      // Tokoh yang pindah rumah tetap satu orang: semua rumahnya dicatat.
      const rumah = [cl.id, ...canon.filter((x) => pl(x)?.asal?.tokohId === e.id).flatMap((x) => live.filter((c) => c.msId === x.msId).map((c) => c.id))];
      out.push({ name: p.name, kind: p.peran === 'figuran' ? 'figuran' : 'warga', claimId: cl.id, household: cl.household, tokohId: e.id, rumah, sapa: p.sapa === 'disapa' ? 'disapa' : 'tertutup', born: p.born, died: p.died });
    }
    for (const f of (await figurWires(user.id)).filter((x) => x.state === 'kanon')) out.push({ name: f.name, kind: 'figur', figurId: f.id, born: f.born, died: f.died, julukan: f.julukan });
    return c.json(out);
  });

  // ── Memegang figuran rumah ──

  const pegangOf = async (claim: ClaimRow, viewer: string): Promise<KotaPegangWire[]> => {
    const rows = await s.db.select().from(cityHolds).where(and(eq(cityHolds.claimId, claim.id), inArray(cityHolds.state, ['minta', 'pegang'])));
    if (!rows.length) return [];
    const tokoh = await tokohOf([claim]);
    const pens = new Map((await s.db.select().from(cityProfiles).where(inArray(cityProfiles.userId, rows.map((x) => x.requesterId)))).map((p) => [p.userId, p.penName]));
    const owner = claim.ownerId === viewer;
    return rows
      .filter((x) => x.state === 'pegang' || owner || x.requesterId === viewer)
      .map((x) => ({ id: x.id, claimId: x.claimId, tokohId: x.tokohId, tokoh: tokoh.find((t) => t.id === x.tokohId)?.name ?? 'tokoh', requesterId: x.requesterId, penName: pens.get(x.requesterId) ?? 'warga', letter: owner || x.requesterId === viewer ? x.letter : null, state: x.state as never }));
  };

  r.post('/kota/pegang', async (c) => {
    const user = c.get('user');
    const input = await body(c, kotaPegangBody);
    const [pen] = await s.db.select().from(cityProfiles).where(eq(cityProfiles.userId, user.id));
    if (!pen) throw conflict('pena', 'Pilih nama pena kota dulu.');
    const claim = await claimById(input.claimId);
    if (!claim || claim.status !== 'aktif') throw notFound('Rumah tidak ditemukan.');
    if (claim.ownerId === user.id) throw bad('own', 'Tokoh ini sudah milikmu.');
    const [e] = await s.db.select().from(msCanon).where(and(eq(msCanon.id, input.tokohId), eq(msCanon.msId, claim.msId)));
    const p = (e?.envelope as { plain?: { peran?: string } } | undefined)?.plain;
    if (!e || p?.peran !== 'figuran') throw bad('tokoh', 'Hanya figuran rumah yang bisa dipegang penulis lain.');
    const ada = await s.db.select().from(cityHolds).where(and(eq(cityHolds.claimId, claim.id), eq(cityHolds.tokohId, e.id), inArray(cityHolds.state, ['minta', 'pegang'])));
    if (ada.some((x) => x.state === 'pegang')) throw conflict('dipegang', 'Tokoh ini sudah dipegang penulis lain.');
    if (ada.some((x) => x.requesterId === user.id)) throw conflict('dup', 'Permintaanmu masih menunggu jawaban.');
    if ((await tokohku(s, user.id)).length >= KOTA_TOKOH_MAKS) throw conflict('tokoh', `Kamu sudah memakai ${KOTA_TOKOH_MAKS} tokoh. Memegang figuran juga memakai satu jatah tokoh.`);
    await rateLimit(s, `kota:pegang:${user.id}`, 6, 24 * 3600);
    const id = `h${newId(19)}`;
    await s.db.insert(cityHolds).values({ id, claimId: claim.id, tokohId: e.id, requesterId: user.id, letter: input.letter });
    void pushTo(s, [claim.ownerId], { body: `Ada penulis yang ingin memegang salah satu tokoh di ${claim.household}.`, data: { type: 'kota', claimId: claim.id } }).catch(() => {});
    return c.json({ id }, 201);
  });

  /** Pemilik menerima/menolak; pemilik atau pemegang melepas. Pemegang ikut menjadi penulis naskah rumah. */
  r.put('/kota/pegang/:id', async (c) => {
    const user = c.get('user');
    const { action } = await body(c, kotaPegangJawab);
    const [x] = await s.db.select().from(cityHolds).where(eq(cityHolds.id, c.req.param('id')));
    if (!x) throw notFound('Permintaan tidak ditemukan.');
    const claim = await claimById(x.claimId);
    if (!claim) throw notFound('Rumah tidak ditemukan.');
    const owner = claim.ownerId === user.id;
    const [ms] = await s.db.select().from(manuscripts).where(eq(manuscripts.id, claim.msId));
    if (owner && x.state === 'minta' && (action === 'terima' || action === 'tolak')) {
      if (action === 'terima' && (await tokohku(s, x.requesterId)).length >= KOTA_TOKOH_MAKS) throw conflict('tokoh', 'Penulis itu sudah memakai semua jatah tokohnya.');
      await s.db.update(cityHolds).set({ state: action === 'terima' ? 'pegang' : 'tolak' }).where(eq(cityHolds.id, x.id));
      if (action === 'terima' && ms) await s.db.update(manuscripts).set({ members: [...new Set([...ms.members, x.requesterId])] }).where(eq(manuscripts.id, ms.id));
      void pushTo(s, [x.requesterId], { body: action === 'terima' ? `Kamu kini memegang satu tokoh di ${claim.household}.` : `${claim.household} belum bisa melepas tokohnya.`, data: { type: 'kota', claimId: claim.id } }).catch(() => {});
    } else if ((owner || x.requesterId === user.id) && x.state === 'pegang' && action === 'lepas') {
      await s.db.update(cityHolds).set({ state: 'lepas' }).where(eq(cityHolds.id, x.id));
      const still = await s.db.select().from(cityHolds).where(and(eq(cityHolds.claimId, claim.id), eq(cityHolds.requesterId, x.requesterId), eq(cityHolds.state, 'pegang')));
      if (!still.length && ms) await s.db.update(manuscripts).set({ members: ms.members.filter((m) => m !== x.requesterId) }).where(eq(manuscripts.id, ms.id));
    } else throw forbidden('Langkah itu tidak bisa dilakukan sekarang.');
    return c.json({ ok: true });
  });

  return r;
}
