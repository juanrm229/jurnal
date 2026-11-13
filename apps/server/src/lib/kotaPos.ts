/**
 * Pos Sangkala: surat ketukan dan permintaan memegang figuran diantar Bang Jamil.
 * Lama pengantaran mengikuti jarak di peta; penerima baru melihat (dan bisa menjawab)
 * suratnya setelah sampai. Penjadwal mengabari penerima saat surat tiba.
 */
import { KOTA_KANTOR_POS, kotaAntar, kotaPlot } from '@sehari/core';
import { and, eq, gte, inArray } from 'drizzle-orm';
import type { Services } from '../context';
import { schema } from '../db';
import { pushTo } from './domain';

const { cityClaims, cityRelations, cityHolds } = schema;
type Rumah = { plotId: string; regionId: string } | null | undefined;

const titik = (r: Rumah) => (r ? (kotaPlot(r.plotId) ?? KOTA_KANTOR_POS) : KOTA_KANTOR_POS);
/** Kapan surat dari rumah `a` (atau kantor pos) sampai di rumah `b`. */
export function sampaiDi(dibuat: Date, a: Rumah, b: Rumah): Date {
  const pulau = (a?.regionId === 'nusapelita') !== (b?.regionId === 'nusapelita');
  return new Date(dibuat.getTime() + kotaAntar(titik(a), titik(b), pulau) * 60_000);
}

async function sekali(s: Services, key: string) {
  const rows = await s.db.insert(schema.notificationLog).values({ key }).onConflictDoNothing().returning();
  return rows.length > 0;
}

/** Dipanggil penjadwal tiap menit. */
export async function antarSuratKota(s: Services): Promise<number> {
  const now = s.now();
  const since = new Date(now.getTime() - 3 * 86_400_000);
  let n = 0;
  const ketuk = await s.db.select().from(cityRelations).where(and(eq(cityRelations.state, 'ketuk'), gte(cityRelations.createdAt, since)));
  const holds = await s.db.select().from(cityHolds).where(and(eq(cityHolds.state, 'minta'), gte(cityHolds.createdAt, since)));
  const ids = [...new Set([...ketuk.flatMap((x) => [x.fromClaimId, x.toClaimId]), ...holds.map((x) => x.claimId)])];
  if (!ids.length) return 0;
  const claims = await s.db.select().from(cityClaims).where(inArray(cityClaims.id, ids));
  const byId = new Map(claims.map((c) => [c.id, c]));
  for (const x of ketuk) {
    const a = byId.get(x.fromClaimId);
    const b = byId.get(x.toClaimId);
    if (!a || !b || sampaiDi(x.createdAt, a, b) > now || !(await sekali(s, `kota-pos:k:${x.id}`))) continue;
    n++;
    await pushTo(s, [b.ownerId], { body: `Bang Jamil mengantar surat ke pintu ${b.household}: ada ketukan dari ${a.household}.`, data: { type: 'kota', claimId: b.id } }).catch(() => {});
  }
  for (const h of holds) {
    const b = byId.get(h.claimId);
    if (!b) continue;
    const [asal] = await s.db.select().from(cityClaims).where(and(eq(cityClaims.ownerId, h.requesterId), eq(cityClaims.status, 'aktif'))).limit(1);
    if (sampaiDi(h.createdAt, asal, b) > now || !(await sekali(s, `kota-pos:p:${h.id}`))) continue;
    n++;
    await pushTo(s, [b.ownerId], { body: `Bang Jamil mengantar surat ke ${b.household}: ada penulis yang ingin memegang salah satu tokohmu.`, data: { type: 'kota', claimId: b.id } }).catch(() => {});
  }
  return n;
}
