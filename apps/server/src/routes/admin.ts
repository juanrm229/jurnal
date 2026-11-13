/**
 * Panel tim keamanan & operasional. Dilindungi ADMIN_TOKEN. Isi jurnal tidak
 * pernah terlihat di sini — hanya isi yang secara sadar dikirim pelapor.
 */
import { isDayKey } from '@sehari/core';
import { and, desc, eq, inArray } from 'drizzle-orm';
import { Hono } from 'hono';
import { z } from 'zod';
import type { Services } from '../context';
import { schema } from '../db';
import { bad, unauthorized } from '../lib/errors';
import { safeEqual } from '../lib/ids';

export function adminRoutes(s: Services) {
  const r = new Hono();
  r.use('*', async (c, next) => {
    const token = c.req.header('x-admin-token') ?? '';
    if (!s.cfg.adminToken || !safeEqual(token, s.cfg.adminToken)) throw unauthorized('Khusus tim Sehari.');
    await next();
  });

  r.get('/reports', async (c) => c.json(await s.db.select().from(schema.reports).orderBy(desc(schema.reports.createdAt)).limit(200)));

  r.patch('/reports/:id', async (c) => {
    const { status } = z.object({ status: z.enum(['open', 'reviewing', 'closed']) }).parse(await c.req.json());
    await s.db.update(schema.reports).set({ status }).where(eq(schema.reports.id, c.req.param('id')));
    return c.json({ ok: true });
  });

  /**
   * Antrean tinjau Kota: rumah yang disembunyikan karena laporan warga, dan rumah aktif yang
   * mulai dilaporkan. Isi rumah kota memang publik, jadi cuplikan adegan terbitnya ikut tampil.
   */
  r.get('/kota/laporan', async (c) => {
    const reports = await s.db.select().from(schema.cityReports);
    const ids = [...new Set(reports.map((x) => x.claimId))];
    if (!ids.length) return c.json([]);
    const claims = await s.db.select().from(schema.cityClaims).where(inArray(schema.cityClaims.id, ids));
    const pens = await s.db.select().from(schema.cityProfiles).where(inArray(schema.cityProfiles.userId, claims.map((x) => x.ownerId)));
    const scenes = await s.db.select().from(schema.msScenes).where(and(inArray(schema.msScenes.msId, claims.map((x) => x.msId)), eq(schema.msScenes.status, 'terbit')));
    return c.json(
      claims
        .filter((x) => x.status === 'aktif' || x.status === 'disembunyikan')
        .map((x) => ({
          id: x.id,
          status: x.status,
          household: x.household,
          plotId: x.plotId,
          penName: pens.find((p) => p.userId === x.ownerId)?.penName ?? null,
          laporan: reports.filter((r2) => r2.claimId === x.id).map((r2) => ({ reason: r2.reason, createdAt: r2.createdAt })),
          cuplikan: scenes
            .filter((sc) => sc.msId === x.msId)
            .slice(0, 3)
            .map((sc) => ((sc.envelope as { plain?: { text?: string } }).plain?.text ?? '').slice(0, 400)),
        }))
        .sort((a, b) => b.laporan.length - a.laporan.length),
    );
  });

  /** Putusan tim: pulihkan (laporan dihapus) atau tutup (tetap tersembunyi, naskah jadi arsip pemiliknya). */
  r.patch('/kota/claims/:id', async (c) => {
    const { aksi } = z.object({ aksi: z.enum(['pulihkan', 'tutup']) }).parse(await c.req.json());
    const [x] = await s.db.select().from(schema.cityClaims).where(eq(schema.cityClaims.id, c.req.param('id')));
    if (!x) throw bad('not_found', 'Rumah tidak ditemukan.');
    if (aksi === 'pulihkan') {
      await s.db.update(schema.cityClaims).set({ status: 'aktif' }).where(eq(schema.cityClaims.id, x.id));
      await s.db.update(schema.manuscripts).set({ visibility: 'kota' }).where(eq(schema.manuscripts.id, x.msId));
      await s.db.delete(schema.cityReports).where(eq(schema.cityReports.claimId, x.id));
    } else {
      await s.db.update(schema.cityClaims).set({ status: 'ditutup' }).where(eq(schema.cityClaims.id, x.id));
      await s.db.update(schema.manuscripts).set({ visibility: 'arsip' }).where(eq(schema.manuscripts.id, x.msId));
    }
    return c.json({ ok: true });
  });

  /** Tanggal resmi hasil sidang isbat, mis. key 'ramadan-2027'. */
  r.put('/season-overrides/:key', async (c) => {
    const input = z.object({ start: z.string(), end: z.string(), peak: z.string().optional() }).parse(await c.req.json());
    if (!isDayKey(input.start) || !isDayKey(input.end) || (input.peak && !isDayKey(input.peak))) throw bad('bad_day', 'Tanggal tidak valid.');
    await s.db
      .insert(schema.seasonOverrides)
      .values({ key: c.req.param('key'), ...input })
      .onConflictDoUpdate({ target: schema.seasonOverrides.key, set: input });
    return c.json({ ok: true });
  });

  r.get('/book-orders', async (c) => c.json(await s.db.select().from(schema.bookOrders)));

  r.patch('/book-orders/:id', async (c) => {
    const { status } = z.object({ status: z.enum(['awaiting_file', 'printing', 'shipped']) }).parse(await c.req.json());
    await s.db.update(schema.bookOrders).set({ status }).where(eq(schema.bookOrders.orderId, c.req.param('id')));
    return c.json({ ok: true });
  });

  r.get('/stats', async (c) => {
    const [users, circles, capsules] = await Promise.all([
      s.db.$count(schema.users),
      s.db.$count(schema.circles),
      s.db.$count(schema.capsules),
    ]);
    return c.json({ users, circles, capsules });
  });

  return r;
}
