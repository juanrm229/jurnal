/**
 * Photobox berdua jarak jauh. Dua orang di lingkaran yang sama berpose di kota
 * masing-masing; server hanya menjadi jam bersama (startAt + serverNow) dan
 * kurir untuk pratinjau & jepretan yang sudah terenkripsi di perangkat.
 */
import { type BoothWire, boothCreateBody, boothFramesBody, boothUpdateBody } from '@sehari/core';
import { and, eq } from 'drizzle-orm';
import { Hono } from 'hono';
import { type AppEnv, body, type Services } from '../context';
import { schema } from '../db';
import { pushTo, requireMember } from '../lib/domain';
import { ApiError, bad, conflict, forbidden, notFound } from '../lib/errors';

const { booths, boothFrames, circleMembers, media } = schema;
type Row = typeof booths.$inferSelect;

/** Sesi kedaluwarsa setelah 3 jam. */
const TTL_MS = 3 * 3600_000;
/** Jeda dari "mulai" sampai jepretan pertama, supaya kedua HP sempat bersiap. */
const LEAD_MS = 4500;
const MAX_PREVIEW = 96 * 1024;

/** Pratinjau langsung (±1 fps) hanya di memori: tidak pernah disimpan. */
const previews = new Map<string, { data: Uint8Array; at: number }>();
function sweep(now: number) {
  for (const [k, v] of previews) if (now - v.at > 10 * 60_000) previews.delete(k);
}

async function wire(s: Services, r: Row): Promise<BoothWire> {
  const frames = await s.db.select().from(boothFrames).where(eq(boothFrames.boothId, r.id));
  const pv: Record<string, string> = {};
  for (const u of [r.hostId, r.guestId]) {
    const p = u ? previews.get(`${r.id}:${u}`) : undefined;
    if (u && p) pv[u] = new Date(p.at).toISOString();
  }
  return {
    id: r.id,
    circleId: r.circleId,
    hostId: r.hostId,
    guestId: r.guestId,
    envelope: r.envelope as BoothWire['envelope'],
    config: r.config,
    ready: r.ready,
    startAt: r.startAt?.toISOString() ?? null,
    serverNow: s.now().toISOString(),
    previews: pv,
    frames: frames.map((f) => ({ userId: f.userId, envelope: f.envelope as BoothWire['envelope'], mediaIds: f.mediaIds })),
    createdAt: r.createdAt.toISOString(),
  };
}

async function load(s: Services, id: string, userId: string): Promise<Row> {
  const [r] = await s.db.select().from(booths).where(eq(booths.id, id));
  if (!r || s.now().getTime() - r.createdAt.getTime() > TTL_MS) throw notFound('Photobox ini sudah tutup.');
  await requireMember(s, r.circleId, userId).catch(() => {
    throw notFound('Photobox ini sudah tutup.');
  });
  return r;
}
const isIn = (r: Row, uid: string) => r.hostId === uid || r.guestId === uid;

export function boothRoutes(s: Services) {
  const r = new Hono<AppEnv>();

  r.post('/circles/:id/booths', async (c) => {
    const user = c.get('user');
    const circleId = c.req.param('id');
    await requireMember(s, circleId, user.id);
    const input = await body(c, boothCreateBody);
    const [dup] = await s.db.select({ id: booths.id }).from(booths).where(eq(booths.id, input.id));
    if (dup) throw bad('duplicate', 'Photobox ini sudah ada.');
    await s.db.insert(booths).values({ id: input.id, circleId, hostId: user.id, envelope: input.envelope, config: input.config, ready: [], createdAt: s.now() });
    const others = (await s.db.select().from(circleMembers).where(and(eq(circleMembers.circleId, circleId), eq(circleMembers.state, 'active'))))
      .map((m) => m.userId)
      .filter((x) => x !== user.id);
    await pushTo(s, others, { body: `${user.penName ?? 'Seseorang'} menunggumu di photobox. Masuk, yuk! 📸`, data: { type: 'booth', boothId: input.id, circleId } }, 'notifyPartnerSealed');
    const [n] = await s.db.select().from(booths).where(eq(booths.id, input.id));
    return c.json(await wire(s, n!), 201);
  });

  r.get('/booths/:id', async (c) => c.json(await wire(s, await load(s, c.req.param('id'), c.get('user').id))));

  r.post('/booths/:id/join', async (c) => {
    const user = c.get('user');
    const b = await load(s, c.req.param('id'), user.id);
    if (!isIn(b, user.id)) {
      if (b.guestId) throw conflict('full', 'Photobox ini sudah berisi dua orang.');
      await s.db.update(booths).set({ guestId: user.id }).where(eq(booths.id, b.id));
    }
    const [n] = await s.db.select().from(booths).where(eq(booths.id, b.id));
    return c.json(await wire(s, n!));
  });

  r.patch('/booths/:id', async (c) => {
    const user = c.get('user');
    const b = await load(s, c.req.param('id'), user.id);
    if (!isIn(b, user.id)) throw forbidden();
    const input = await body(c, boothUpdateBody);
    const set: Partial<Row> = {};
    if (input.config) {
      if (b.hostId !== user.id) throw forbidden('Hanya yang membuka photobox yang bisa mengganti desain.');
      if (b.startAt) throw conflict('started', 'Sesi sudah dimulai.');
      set.config = input.config;
    }
    if (input.ready !== undefined) set.ready = input.ready ? [...new Set([...b.ready, user.id])] : b.ready.filter((x) => x !== user.id);
    if (Object.keys(set).length) await s.db.update(booths).set(set).where(eq(booths.id, b.id));
    const [n] = await s.db.select().from(booths).where(eq(booths.id, b.id));
    return c.json(await wire(s, n!));
  });

  r.post('/booths/:id/start', async (c) => {
    const user = c.get('user');
    const b = await load(s, c.req.param('id'), user.id);
    if (!isIn(b, user.id)) throw forbidden();
    if (!b.guestId) throw conflict('alone', 'Tunggu dia masuk dulu.');
    if (!b.startAt) {
      if (![b.hostId, b.guestId].every((u) => b.ready.includes(u))) throw conflict('not_ready', 'Kalian berdua harus siap dulu.');
      await s.db.update(booths).set({ startAt: new Date(s.now().getTime() + LEAD_MS) }).where(eq(booths.id, b.id));
    }
    const [n] = await s.db.select().from(booths).where(eq(booths.id, b.id));
    return c.json(await wire(s, n!));
  });

  /** Foto ulang: kosongkan jam mulai, jepretan, dan tanda siap. */
  r.post('/booths/:id/reset', async (c) => {
    const user = c.get('user');
    const b = await load(s, c.req.param('id'), user.id);
    if (!isIn(b, user.id)) throw forbidden();
    await s.db.delete(boothFrames).where(eq(boothFrames.boothId, b.id));
    await s.db.update(booths).set({ startAt: null, ready: [] }).where(eq(booths.id, b.id));
    const [n] = await s.db.select().from(booths).where(eq(booths.id, b.id));
    return c.json(await wire(s, n!));
  });

  r.post('/booths/:id/preview', async (c) => {
    const user = c.get('user');
    const b = await load(s, c.req.param('id'), user.id);
    if (!isIn(b, user.id)) throw forbidden();
    const buf = new Uint8Array(await c.req.arrayBuffer());
    if (!buf.length) throw bad('empty', 'Pratinjau kosong.');
    if (buf.length > MAX_PREVIEW) throw new ApiError(413, 'too_large', 'Pratinjau terlalu besar.');
    const now = s.now().getTime();
    sweep(now);
    previews.set(`${b.id}:${user.id}`, { data: buf, at: now });
    return c.json({ ok: true });
  });

  r.get('/booths/:id/preview/:userId', async (c) => {
    const b = await load(s, c.req.param('id'), c.get('user').id);
    const p = previews.get(`${b.id}:${c.req.param('userId')}`);
    if (!p) throw notFound();
    return new Response(p.data as unknown as BodyInit, { headers: { 'content-type': 'application/octet-stream', 'cache-control': 'no-store' } });
  });

  r.put('/booths/:id/frames', async (c) => {
    const user = c.get('user');
    const b = await load(s, c.req.param('id'), user.id);
    if (!isIn(b, user.id)) throw forbidden();
    const input = await body(c, boothFramesBody);
    for (const m of input.mediaIds) {
      const [row] = await s.db.select({ ownerId: media.ownerId }).from(media).where(eq(media.id, m));
      if (row?.ownerId !== user.id) throw bad('media', 'Foto itu bukan milikmu.');
    }
    await s.db
      .insert(boothFrames)
      .values({ boothId: b.id, userId: user.id, envelope: input.envelope, mediaIds: input.mediaIds })
      .onConflictDoUpdate({ target: [boothFrames.boothId, boothFrames.userId], set: { envelope: input.envelope, mediaIds: input.mediaIds, createdAt: s.now() } });
    const [n] = await s.db.select().from(booths).where(eq(booths.id, b.id));
    return c.json(await wire(s, n!));
  });

  return r;
}
