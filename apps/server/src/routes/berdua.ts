/**
 * Berdua: tiga hal kecil yang baru terjadi kalau dua orang sama-sama melakukannya.
 *
 * - Bendera putih: dikibarkan diam-diam. Server tidak pernah memberi tahu siapa
 *   pun, sampai orang lain di lingkaran itu juga mengibarkan miliknya.
 * - Tukar pena: sebulan sekali menulis hari orang lain menurut tebakanmu.
 *   Tebakan orang tentangmu baru terbuka setelah kamu mengirim tebakanmu.
 * - Tinta hilang: pesan yang ciphertext-nya hanya diserahkan saat penulis dan
 *   pembacanya sama-sama sedang membuka beranda lingkaran.
 *
 * Semua isi terenkripsi dengan kunci lingkaran; server hanya menahan dan
 * melepas ciphertext.
 */
import { INK_MAX_OPEN, type InkLive, type InkWire, inkBody, PRESENCE_TTL_SECONDS, type SwapState, type SwapWire, swapBody, swapTarget, todayIn, TRUCE_HOURS, type TruceState } from '@sehari/core';
import { and, desc, eq, gt, inArray, isNull } from 'drizzle-orm';
import { Hono } from 'hono';
import { type AppEnv, body, type Services } from '../context';
import { schema } from '../db';
import { pushTo, requireMember } from '../lib/domain';
import { bad, forbidden, notFound } from '../lib/errors';
import { newId } from '../lib/ids';

const { pairNotes, circlePresence, circleMembers } = schema;
type Note = typeof pairNotes.$inferSelect;

async function activeIds(s: Services, circleId: string): Promise<string[]> {
  const rows = await s.db.select({ id: circleMembers.userId }).from(circleMembers).where(and(eq(circleMembers.circleId, circleId), eq(circleMembers.state, 'active')));
  return rows.map((r) => r.id);
}

const notes = (s: Services, circleId: string, kind: Note['kind']) => s.db.select().from(pairNotes).where(and(eq(pairNotes.circleId, circleId), eq(pairNotes.kind, kind)));

// ── Bendera putih ───────────────────────────────────────────────────────────

async function truceState(s: Services, circleId: string, userId: string): Promise<TruceState> {
  const rows = await notes(s, circleId, 'truce');
  const fresh = new Date(s.now().getTime() - TRUCE_HOURS * 3600_000);
  const mine = rows.find((r) => r.authorId === userId && !r.matchedAt && r.createdAt > fresh);
  const byTime = new Map<string, string[]>();
  for (const r of rows) if (r.matchedAt) byTime.set(r.matchedAt.toISOString(), [...(byTime.get(r.matchedAt.toISOString()) ?? []), r.authorId]);
  return {
    mine: mine ? { raisedAt: mine.createdAt.toISOString(), expiresAt: new Date(mine.createdAt.getTime() + TRUCE_HOURS * 3600_000).toISOString() } : null,
    peace: [...byTime.entries()].sort((a, b) => b[0].localeCompare(a[0])).map(([at, userIds]) => ({ at, userIds })),
  };
}

// ── Tukar pena ──────────────────────────────────────────────────────────────

const swapWire = (r: Note, open: boolean): SwapWire => ({ id: r.id, authorId: r.authorId, aboutId: r.aboutId ?? '', enc: open ? r.enc : null, createdAt: r.createdAt.toISOString() });

async function swapState(s: Services, circleId: string, userId: string, month: string): Promise<SwapState> {
  const rows = (await notes(s, circleId, 'swap')).filter((r) => r.key === month);
  const mine = rows.find((r) => r.authorId === userId);
  return { month, mine: mine ? swapWire(mine, true) : null, others: rows.filter((r) => r.authorId !== userId).map((r) => swapWire(r, !!mine)) };
}

export function berduaRoutes(s: Services) {
  const r = new Hono<AppEnv>();

  r.get('/circles/:id/truce', async (c) => {
    const user = c.get('user');
    await requireMember(s, c.req.param('id'), user.id);
    return c.json(await truceState(s, c.req.param('id'), user.id));
  });

  r.post('/circles/:id/truce', async (c) => {
    const user = c.get('user');
    const circleId = c.req.param('id');
    await requireMember(s, circleId, user.id);
    const members = await activeIds(s, circleId);
    if (members.length < 2) throw bad('alone', 'Belum ada siapa-siapa di lingkaran ini untuk diajak baikan.');
    const now = s.now();
    const fresh = new Date(now.getTime() - TRUCE_HOURS * 3600_000);
    const pending = (await notes(s, circleId, 'truce')).filter((x) => !x.matchedAt && x.createdAt > fresh && members.includes(x.authorId));
    if (!pending.some((x) => x.authorId === user.id)) {
      const row = { id: newId(), circleId, authorId: user.id, kind: 'truce' as const, key: todayIn(user.tz ?? 'Asia/Jakarta', now), createdAt: now };
      await s.db.insert(pairNotes).values(row);
      pending.push({ ...row, aboutId: null, enc: null, matchedAt: null });
    }
    const others = pending.filter((x) => x.authorId !== user.id);
    if (others.length) {
      // Bendera bertemu: baru sekarang ada yang diberi tahu.
      await s.db.update(pairNotes).set({ matchedAt: now }).where(inArray(pairNotes.id, pending.map((x) => x.id)));
      await pushTo(s, [...new Set(others.map((x) => x.authorId))], { body: 'Bendera putih kalian bertemu. Ternyata kalian sama-sama ingin baikan.', data: { type: 'truce', circleId } });
    }
    return c.json(await truceState(s, circleId, user.id), others.length ? 200 : 201);
  });

  r.delete('/circles/:id/truce', async (c) => {
    const user = c.get('user');
    const circleId = c.req.param('id');
    await requireMember(s, circleId, user.id);
    await s.db.delete(pairNotes).where(and(eq(pairNotes.circleId, circleId), eq(pairNotes.kind, 'truce'), eq(pairNotes.authorId, user.id), isNull(pairNotes.matchedAt)));
    return c.json(await truceState(s, circleId, user.id));
  });

  r.get('/circles/:id/swaps', async (c) => {
    const user = c.get('user');
    await requireMember(s, c.req.param('id'), user.id);
    const month = c.req.query('month') ?? todayIn(user.tz ?? 'Asia/Jakarta', s.now()).slice(0, 7);
    if (!/^\d{4}-\d{2}$/.test(month)) throw bad('month', 'Bulan tidak dikenali.');
    return c.json(await swapState(s, c.req.param('id'), user.id, month));
  });

  r.post('/circles/:id/swaps', async (c) => {
    const user = c.get('user');
    const circleId = c.req.param('id');
    await requireMember(s, circleId, user.id);
    const input = await body(c, swapBody);
    if (input.month !== todayIn(user.tz ?? 'Asia/Jakarta', s.now()).slice(0, 7)) throw bad('month', 'Tukar pena hanya untuk bulan ini.');
    const members = await activeIds(s, circleId);
    if (swapTarget(members, user.id, input.month) !== input.aboutId) throw bad('about', 'Bulan ini bukan giliranmu menulis hari orang itu.');
    const before = await swapState(s, circleId, user.id, input.month);
    if (before.mine) throw bad('done', 'Kamu sudah menukar pena bulan ini. Bulan depan lagi, ya.');
    await s.db.insert(pairNotes).values({ id: input.id, circleId, authorId: user.id, kind: 'swap', key: input.month, aboutId: input.aboutId, enc: input.enc, createdAt: s.now() });
    const wrote = new Set(before.others.map((o) => o.authorId));
    const waiting = members.filter((m) => m !== user.id && !wrote.has(m));
    await pushTo(s, waiting, { body: `${user.penName ?? 'Seseorang'} sudah menulis hari versi tebakannya. Tulis punyamu untuk membukanya.`, data: { type: 'swap', circleId } });
    await pushTo(s, members.filter((m) => m !== user.id && wrote.has(m)), { body: `${user.penName ?? 'Seseorang'} ikut menukar pena. Tebakannya sudah bisa dibaca.`, data: { type: 'swap', circleId } });
    return c.json(await swapState(s, circleId, user.id, input.month), 201);
  });

  // ── Tinta hilang ──────────────────────────────────────────────────────────

  r.post('/circles/:id/inks', async (c) => {
    const user = c.get('user');
    const circleId = c.req.param('id');
    await requireMember(s, circleId, user.id);
    const input = await body(c, inkBody);
    const open = (await notes(s, circleId, 'ink')).filter((x) => x.authorId === user.id && !x.matchedAt);
    if (open.length >= INK_MAX_OPEN) throw bad('too_many', `Masih ada ${INK_MAX_OPEN} tinta hilangmu yang belum terbaca. Tunggu dibaca bersama dulu, ya.`);
    await s.db.insert(pairNotes).values({ id: input.id, circleId, authorId: user.id, kind: 'ink', key: input.day, enc: input.enc, createdAt: s.now() });
    const others = (await activeIds(s, circleId)).filter((m) => m !== user.id);
    await pushTo(s, others, { body: `${user.penName ?? 'Seseorang'} menulis sesuatu dengan tinta hilang. Hanya terbaca saat kalian membuka lingkaran bersamaan.`, data: { type: 'ink', circleId } });
    return c.json({ ok: true }, 201);
  });

  /** Detak kehadiran + daftar tinta. Dipanggil berkala selama beranda lingkaran terbuka. */
  r.post('/circles/:id/inks/live', async (c) => {
    const user = c.get('user');
    const circleId = c.req.param('id');
    await requireMember(s, circleId, user.id);
    const now = s.now();
    await s.db.insert(circlePresence).values({ circleId, userId: user.id, at: now }).onConflictDoUpdate({ target: [circlePresence.circleId, circlePresence.userId], set: { at: now } });
    const members = await activeIds(s, circleId);
    const here = await s.db.select().from(circlePresence).where(and(eq(circlePresence.circleId, circleId), gt(circlePresence.at, new Date(now.getTime() - PRESENCE_TTL_SECONDS * 1000))));
    const present = here.map((p) => p.userId).filter((u) => members.includes(u));
    const week = new Date(now.getTime() - 7 * 86_400_000);
    const rows = (await s.db.select().from(pairNotes).where(and(eq(pairNotes.circleId, circleId), eq(pairNotes.kind, 'ink'))).orderBy(desc(pairNotes.createdAt)))
      // Yang belum terbaca tetap menunggu; yang sudah terbaca bertahan seminggu.
      .filter((x) => members.includes(x.authorId) && (!x.matchedAt || x.matchedAt > week))
      .slice(0, 40);
    const firstRead = rows.filter((x) => x.authorId !== user.id && !x.matchedAt && present.includes(x.authorId));
    if (firstRead.length) await s.db.update(pairNotes).set({ matchedAt: now }).where(inArray(pairNotes.id, firstRead.map((x) => x.id)));
    const inks: InkWire[] = rows.map((x) => {
      const visible = x.authorId === user.id || present.includes(x.authorId);
      const read = x.matchedAt ?? (firstRead.includes(x) ? now : null);
      return { id: x.id, authorId: x.authorId, day: x.key, enc: visible ? x.enc : null, readAt: read?.toISOString() ?? null, createdAt: x.createdAt.toISOString() };
    });
    return c.json({ present, inks } satisfies InkLive);
  });

  /** Menutup beranda: langsung dianggap pergi, tanpa menunggu detak basi. */
  r.delete('/circles/:id/inks/live', async (c) => {
    const user = c.get('user');
    await s.db.delete(circlePresence).where(and(eq(circlePresence.circleId, c.req.param('id')), eq(circlePresence.userId, user.id)));
    return c.json({ ok: true });
  });

  r.delete('/inks/:id', async (c) => {
    const user = c.get('user');
    const [n] = await s.db.select().from(pairNotes).where(and(eq(pairNotes.id, c.req.param('id')), eq(pairNotes.kind, 'ink')));
    if (!n) throw notFound('Tinta itu sudah tidak ada.');
    if (n.authorId !== user.id) throw forbidden('Hanya penulisnya yang bisa menghapus.');
    await s.db.delete(pairNotes).where(eq(pairNotes.id, n.id));
    return c.json({ ok: true });
  });

  return r;
}
