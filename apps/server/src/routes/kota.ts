/**
 * Kota Sehari: patok persil × rentang tahun di kota publik. Isi rumah adalah
 * naskah terbuka (visibility 'kota'). Identitas publiknya nama pena kota,
 * terpisah dari jurnal; tidak ada tautan ke halaman pribadi penulis.
 */
import {
  KOTA_LAPOR_SEMBUNYI,
  KOTA_MUSIM,
  KOTA_TERBENGKALAI_HARI,
  type KotaClaimWire,
  kotaClaimBody,
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
import { bad, conflict, forbidden, notFound } from '../lib/errors';
import { newId } from '../lib/ids';
import { rateLimit } from '../lib/rate';

const { cityProfiles, cityClaims, cityReports, manuscripts, msScenes } = schema;
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
        mine: x.ownerId === viewer,
        createdAt: x.createdAt.toISOString(),
      };
    });
  };
  const visible = () => s.db.select().from(cityClaims).where(and(eq(cityClaims.season, KOTA_MUSIM), eq(cityClaims.status, 'aktif')));

  r.get('/kota', async (c) => {
    const user = c.get('user');
    const [claims, [pen]] = await Promise.all([describe(await visible(), user.id), s.db.select().from(cityProfiles).where(eq(cityProfiles.userId, user.id))]);
    const used = claims.filter((x) => x.mine && x.state === 'aktif').length;
    const res: KotaWire = { season: KOTA_MUSIM, claims, me: { penName: pen?.penName ?? null, quota: Math.max(0, 1 - used) } };
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
      if (live.some((x) => x.mine)) throw conflict('quota', 'Musim ini kamu sudah punya satu rumah. Lepaskan dulu kalau ingin pindah.');
      const clash = live.find((x) => x.plotId === input.plotId && kotaOverlap(x, input));
      if (clash) throw conflict('overlap', `Rentang itu bertumpuk dengan ${clash.household} (${clash.from}–${clash.to}).`);
      const now = s.now();
      const msId = `n${newId(19)}`;
      const id = `k${newId(19)}`;
      await tx.insert(manuscripts).values({ id: msId, circleId: null, ownerId: user.id, members: [user.id], visibility: 'kota', meta: { plain: { v: 1, title: input.household } }, createdAt: now, updatedAt: now });
      await tx.insert(cityClaims).values({ id, season: KOTA_MUSIM, regionId: region.id, plotId: input.plotId, ownerId: user.id, household: input.household, fromYear: input.from, toYear: input.to, msId, createdAt: now });
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

  return r;
}
