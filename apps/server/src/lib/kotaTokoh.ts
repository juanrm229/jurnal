/**
 * Hitungan tokoh seorang warga Kota: tokoh utama asli di rumah-rumahnya yang masih
 * hidup (bukan salinan pindahan, bukan figuran), ditambah figuran rumah lain yang ia pegang.
 */
import { KOTA_ID, KOTA_MUSIM, KOTA_TERBENGKALAI_HARI, type KotaTokohku } from '@sehari/core';
import { and, eq, inArray, sql } from 'drizzle-orm';
import type { Services } from '../context';
import { schema } from '../db';

const { cityClaims, cityHolds, msCanon, msScenes } = schema;
type Db = Pick<Services['db'], 'select'>;
type Plain = { name?: string; peran?: string; born?: number; died?: number; asal?: { claimId: string; tokohId: string } };
const plain = (e: { envelope: unknown }) => (e.envelope as { plain?: Plain }).plain;

/** Rumah aktif (belum terbengkalai) milik warga di musim ini. */
export async function rumahHidup(s: Services, userId: string, db: Db = s.db) {
  const rows = await db.select().from(cityClaims).where(and(eq(cityClaims.city, KOTA_ID), eq(cityClaims.season, KOTA_MUSIM), eq(cityClaims.status, 'aktif'), eq(cityClaims.ownerId, userId)));
  if (!rows.length) return rows;
  const counts = await db
    .select({ msId: msScenes.msId, n: sql<number>`count(*)::int` })
    .from(msScenes)
    .where(and(inArray(msScenes.msId, rows.map((x) => x.msId)), eq(msScenes.status, 'terbit')))
    .groupBy(msScenes.msId);
  const limit = s.now().getTime() - KOTA_TERBENGKALAI_HARI * 86_400_000;
  return rows.filter((x) => (counts.find((c) => c.msId === x.msId)?.n ?? 0) > 0 || x.createdAt.getTime() >= limit);
}

export async function tokohku(s: Services, userId: string, db: Db = s.db): Promise<KotaTokohku[]> {
  const rumah = await rumahHidup(s, userId, db);
  const out: KotaTokohku[] = [];
  if (rumah.length) {
    const canon = await db.select().from(msCanon).where(and(inArray(msCanon.msId, rumah.map((x) => x.msId)), eq(msCanon.kind, 'tokoh')));
    const claimOf = (msId: string) => rumah.find((x) => x.msId === msId)!;
    // Satu orang = satu kunci: tokoh asli, atau tokoh asal dari salinan pindahan.
    // Bila rumah asal sudah pergi, salinannya tetap dihitung sebagai orang yang sama.
    const orang = new Map<string, typeof canon>();
    for (const e of canon) {
      const p = plain(e);
      if (!p?.name || p.peran === 'figuran') continue;
      const kunci = p.asal?.tokohId ?? e.id;
      orang.set(kunci, [...(orang.get(kunci) ?? []), e]);
    }
    for (const [kunci, es] of orang) {
      const wakil = es.find((e) => e.id === kunci) ?? es[0]!;
      const p = plain(wakil)!;
      const c = claimOf(wakil.msId);
      out.push({ id: wakil.id, claimId: c.id, household: c.household, name: p.name!, born: p.born, died: p.died, rumah: [...new Set(es.map((e) => claimOf(e.msId).id))] });
    }
  }
  const holds = await db
    .select({ tokohId: cityHolds.tokohId, claimId: cityHolds.claimId, household: cityClaims.household, msId: cityClaims.msId })
    .from(cityHolds)
    .innerJoin(cityClaims, eq(cityClaims.id, cityHolds.claimId))
    .where(and(eq(cityHolds.requesterId, userId), eq(cityHolds.state, 'pegang'), eq(cityClaims.status, 'aktif')));
  if (holds.length) {
    const canon = await db.select().from(msCanon).where(inArray(msCanon.id, holds.map((h) => h.tokohId)));
    for (const h of holds) {
      const p = plain(canon.find((e) => e.id === h.tokohId) ?? { envelope: {} });
      out.push({ id: h.tokohId, claimId: h.claimId, household: h.household, name: p?.name ?? 'tokoh', born: p?.born, died: p?.died, dipegang: true, rumah: [h.claimId] });
    }
  }
  return out;
}
