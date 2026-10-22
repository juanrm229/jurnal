/**
 * Musim Bersama & Kapsul Indonesia, Wrap publik, serta keamanan (lapor & blokir).
 */
import {
  isDayKey,
  PROVINCES,
  publishWrapBody,
  type PublicWrapData,
  type PublicWrapWire,
  pulseBody,
  type PulseDay,
  reportBody,
  type ReportWire,
  sanitizePublicWrap,
  seasonsForYear,
  type SeasonOverrides,
} from '@sehari/core';
import { and, eq, lt, sql } from 'drizzle-orm';
import { Hono } from 'hono';
import { type AppEnv, body, type Services } from '../context';
import { schema } from '../db';
import { activeCircleIds, userSettings, userToday } from '../lib/domain';
import { bad, forbidden, notFound } from '../lib/errors';
import { hmacHex, newId } from '../lib/ids';
import { rateLimit } from '../lib/rate';

const { moodPulse, moodPulseDedupe, publicWraps, reports, blocks, seasonOverrides, circleMembers } = schema;

/** k-anonimitas: provinsi dengan kontribusi di bawah ini tidak ditampilkan. */
export const PULSE_THRESHOLD = 5;

export async function loadSeasonOverrides(s: Services): Promise<SeasonOverrides> {
  const rows = await s.db.select().from(seasonOverrides);
  return Object.fromEntries(rows.map((r) => [r.key, { start: r.start, end: r.end, peak: r.peak ?? undefined }]));
}

export function communityRoutes(s: Services) {
  const r = new Hono<AppEnv>();

  r.get('/seasons', async (c) => {
    const year = Number(c.req.query('year') ?? userToday(c.get('user'), s.now()).slice(0, 4));
    return c.json(seasonsForYear(year, await loadSeasonOverrides(s)));
  });

  /**
   * Kapsul Indonesia: peta mood anonim. Yang dikirim hanya (hari, provinsi,
   * warna). Pencegah hitung ganda memakai HMAC harian, bukan id pengguna.
   */
  r.post('/pulse', async (c) => {
    const input = await body(c, pulseBody);
    const user = c.get('user');
    if (!userSettings(user).moodPulse) throw forbidden('Aktifkan Kapsul Indonesia dulu di pengaturan.');
    if (!PROVINCES.includes(input.province)) throw bad('province', 'Provinsi tidak dikenal.');
    const today = userToday(user, s.now());
    if (input.day !== today) throw bad('day', 'Hanya untuk hari ini.');
    const tag = hmacHex(`${s.cfg.secret}:${input.day}`, user.id);
    const inserted = await s.db.insert(moodPulseDedupe).values({ tag, day: input.day }).onConflictDoNothing().returning();
    if (!inserted.length) return c.json({ ok: true, counted: false });
    await s.db
      .insert(moodPulse)
      .values({ day: input.day, province: input.province, mood: input.mood, count: 1 })
      .onConflictDoUpdate({
        target: [moodPulse.day, moodPulse.province, moodPulse.mood],
        set: { count: sql`${moodPulse.count} + 1` },
      });
    return c.json({ ok: true, counted: true });
  });

  r.get('/pulse', async (c) => {
    const day = c.req.query('day') ?? userToday(c.get('user'), s.now());
    if (!isDayKey(day)) throw bad('day', 'Tanggal tidak valid.');
    const rows = await s.db.select().from(moodPulse).where(eq(moodPulse.day, day));
    const byProv = new Map<string, { total: number; moods: Record<string, number> }>();
    for (const r of rows) {
      const e = byProv.get(r.province) ?? { total: 0, moods: {} };
      e.total += r.count;
      e.moods[r.mood] = (e.moods[r.mood] ?? 0) + r.count;
      byProv.set(r.province, e);
    }
    const out: PulseDay = {
      day,
      threshold: PULSE_THRESHOLD,
      provinces: [...byProv.entries()]
        .filter(([, e]) => e.total >= PULSE_THRESHOLD)
        .map(([province, e]) => ({ province, ...e }))
        .sort((a, b) => b.total - a.total),
    };
    return c.json(out);
  });

  // ── Wrap publik: artefaknya yang viral, bukan rahasianya ──────────────────

  r.post('/public-wraps', async (c) => {
    const input = await body(c, publishWrapBody);
    const user = c.get('user');
    await rateLimit(s, `wrap:${user.id}`, 30, 24 * 3600);
    const data = sanitizePublicWrap(input.data as PublicWrapData);
    const slug = newId(10);
    await s.db.insert(publicWraps).values({ slug, userId: user.id, data });
    const out: PublicWrapWire = {
      slug,
      url: `${s.cfg.publicUrl}/w/${slug}`,
      imageUrl: `${s.cfg.publicUrl}/w/${slug}.png`,
      data,
      createdAt: s.now().toISOString(),
    };
    return c.json(out, 201);
  });

  r.get('/public-wraps', async (c) => {
    const rows = await s.db.select().from(publicWraps).where(eq(publicWraps.userId, c.get('user').id));
    return c.json(
      rows
        .filter((x) => !x.revokedAt)
        .map((x) => ({ slug: x.slug, url: `${s.cfg.publicUrl}/w/${x.slug}`, imageUrl: `${s.cfg.publicUrl}/w/${x.slug}.png`, data: x.data, createdAt: x.createdAt.toISOString() })),
    );
  });

  r.delete('/public-wraps/:slug', async (c) => {
    await s.db
      .update(publicWraps)
      .set({ revokedAt: s.now() })
      .where(and(eq(publicWraps.slug, c.req.param('slug')), eq(publicWraps.userId, c.get('user').id)));
    return c.json({ ok: true });
  });

  // ── Lapor & blokir ────────────────────────────────────────────────────────

  r.post('/reports', async (c) => {
    const input = await body(c, reportBody);
    const user = c.get('user');
    await rateLimit(s, `report:${user.id}`, 20, 24 * 3600);
    const mine = new Set(await activeCircleIds(s, user.id));
    const theirs = await s.db.select().from(circleMembers).where(eq(circleMembers.userId, input.targetUserId));
    if (!theirs.some((m) => mine.has(m.circleId))) throw notFound('Orang ini tidak ada di lingkaranmu.');
    const id = newId();
    await s.db.insert(reports).values({ id, reporterId: user.id, ...input });
    const out: ReportWire = { id, reason: input.reason, status: 'open', createdAt: s.now().toISOString() };
    return c.json(out, 201);
  });

  r.get('/blocks', async (c) => {
    const rows = await s.db.select().from(blocks).where(eq(blocks.blockerId, c.get('user').id));
    return c.json(rows.map((b) => ({ userId: b.blockedId, createdAt: b.createdAt.toISOString() })));
  });

  /** Blokir: isi mereka tidak lagi sampai kepadamu. Di Duo, blokir juga berarti keluar. */
  r.post('/blocks/:userId', async (c) => {
    const user = c.get('user');
    const target = c.req.param('userId');
    if (target === user.id) throw bad('self', 'Tidak bisa memblokir diri sendiri.');
    await s.db.insert(blocks).values({ blockerId: user.id, blockedId: target }).onConflictDoNothing();
    const mine = await s.db.select().from(circleMembers).where(and(eq(circleMembers.userId, user.id), eq(circleMembers.state, 'active')));
    for (const m of mine) {
      const [circle] = await s.db.select().from(schema.circles).where(eq(schema.circles.id, m.circleId));
      if (circle?.kind !== 'duo') continue;
      const [other] = await s.db.select().from(circleMembers).where(and(eq(circleMembers.circleId, circle.id), eq(circleMembers.userId, target)));
      if (other) {
        await s.db.update(schema.circles).set({ status: 'split', rotationNeeded: true }).where(eq(schema.circles.id, circle.id));
        await s.db
          .update(circleMembers)
          .set({ state: 'left', leftDay: userToday(user, s.now()) })
          .where(and(eq(circleMembers.circleId, circle.id), eq(circleMembers.userId, user.id)));
      }
    }
    return c.json({ ok: true });
  });

  r.delete('/blocks/:userId', async (c) => {
    await s.db.delete(blocks).where(and(eq(blocks.blockerId, c.get('user').id), eq(blocks.blockedId, c.req.param('userId'))));
    return c.json({ ok: true });
  });

  return r;
}

export async function cleanupPulseDedupe(s: Services, beforeDay: string) {
  await s.db.delete(moodPulseDedupe).where(lt(moodPulseDedupe.day, beforeDay));
}
