/**
 * Lonceng ketujuh: sekali sehari, pukul 19.00 waktu setempat, satu kabar ringkas
 * tentang kota untuk warga yang punya nama pena kota. Tidak dikirim bila kota sunyi.
 */
import { and, eq, gte, inArray, sql } from 'drizzle-orm';
import type { Services } from '../context';
import { schema } from '../db';
import { pushTo } from './domain';
import { sampaiDi } from './kotaPos';

const { cityProfiles, cityClaims, cityRelations, cityHolds, msScenes } = schema;
let memo: { at: number; v: { rumah: number; adegan: number; ikatan: number } } | null = null;

async function ringkasKota(s: Services) {
  const now = s.now().getTime();
  if (memo && now - memo.at < 60_000) return memo.v;
  const since = new Date(now - 86_400_000);
  const live = await s.db.select({ id: cityClaims.id, msId: cityClaims.msId, createdAt: cityClaims.createdAt }).from(cityClaims).where(eq(cityClaims.status, 'aktif'));
  const [adegan] = live.length
    ? await s.db.select({ n: sql<number>`count(*)::int` }).from(msScenes).where(and(inArray(msScenes.msId, live.map((x) => x.msId)), eq(msScenes.status, 'terbit'), gte(msScenes.updatedAt, since)))
    : [{ n: 0 }];
  const [ikatan] = await s.db.select({ n: sql<number>`count(*)::int` }).from(cityRelations).where(and(eq(cityRelations.state, 'kanon'), gte(cityRelations.updatedAt, since)));
  const v = { rumah: live.filter((x) => x.createdAt >= since).length, adegan: adegan?.n ?? 0, ikatan: ikatan?.n ?? 0 };
  memo = { at: now, v };
  return v;
}

export async function loncengKetujuh(s: Services, u: { id: string }, today: string, hour: number, once: (key: string) => Promise<boolean>) {
  if (hour < 19) return;
  const [pen] = await s.db.select({ userId: cityProfiles.userId }).from(cityProfiles).where(eq(cityProfiles.userId, u.id));
  if (!pen || !(await once(`lonceng:${u.id}:${today}`))) return;
  const k = await ringkasKota(s);
  // Surat yang sudah sampai di pintu rumah-rumahnya dan belum dijawab.
  const mine = await s.db.select().from(cityClaims).where(and(eq(cityClaims.ownerId, u.id), eq(cityClaims.status, 'aktif')));
  let pintu = 0;
  if (mine.length) {
    const ketuk = await s.db.select().from(cityRelations).where(and(eq(cityRelations.state, 'ketuk'), inArray(cityRelations.toClaimId, mine.map((x) => x.id))));
    const asal = ketuk.length ? await s.db.select().from(cityClaims).where(inArray(cityClaims.id, ketuk.map((x) => x.fromClaimId))) : [];
    pintu += ketuk.filter((x) => sampaiDi(x.createdAt, asal.find((a) => a.id === x.fromClaimId), mine.find((m) => m.id === x.toClaimId)) <= s.now()).length;
    const [h] = await s.db.select({ n: sql<number>`count(*)::int` }).from(cityHolds).where(and(eq(cityHolds.state, 'minta'), inArray(cityHolds.claimId, mine.map((x) => x.id))));
    pintu += h?.n ?? 0;
  }
  const bagian = [k.rumah ? `${k.rumah} rumah baru` : '', k.adegan ? `${k.adegan} adegan terbit` : '', k.ikatan ? `${k.ikatan} ikatan jadi kanon` : ''].filter(Boolean);
  if (!bagian.length && !pintu) return;
  const body = `Lonceng ketujuh berbunyi di Sangkala.${bagian.length ? ` Hari ini: ${bagian.join(', ')}.` : ''}${pintu ? ` Ada ${pintu} surat menunggu di pintumu.` : ''}`;
  await pushTo(s, [u.id], { body, data: { type: 'kota-kabar' } }, 'notifyActivity');
}
