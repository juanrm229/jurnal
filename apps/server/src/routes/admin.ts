/**
 * Panel tim keamanan & operasional. Dilindungi ADMIN_TOKEN. Isi jurnal tidak
 * pernah terlihat di sini — hanya isi yang secara sadar dikirim pelapor.
 */
import { isDayKey } from '@sehari/core';
import { desc, eq } from 'drizzle-orm';
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
