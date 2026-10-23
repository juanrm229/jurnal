/**
 * Karya: tulisan panjang (esai, cerpen, puisi, …) di luar halaman harian.
 * Isinya terenkripsi end-to-end; server hanya menjaga siapa boleh membaca.
 */
import { reactionParams, type WorkNoteWire, type WorkWire, workBody, workNoteBody } from '@sehari/core';
import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import { Hono } from 'hono';
import { type AppEnv, body, type Services } from '../context';
import { schema } from '../db';
import { activeCircleIds, requireMember } from '../lib/domain';
import { forbidden, notFound } from '../lib/errors';

const { works, workCircles, workReactions, workNotes } = schema;
type WorkRow = typeof works.$inferSelect;

async function hydrate(s: Services, rows: WorkRow[]): Promise<WorkWire[]> {
  if (!rows.length) return [];
  const ids = rows.map((r) => r.id);
  const [circ, reacts, notes] = await Promise.all([
    s.db.select().from(workCircles).where(inArray(workCircles.workId, ids)),
    s.db.select().from(workReactions).where(inArray(workReactions.workId, ids)),
    s.db
      .select({ workId: workNotes.workId, n: sql<number>`count(*)::int` })
      .from(workNotes)
      .where(inArray(workNotes.workId, ids))
      .groupBy(workNotes.workId),
  ]);
  return rows.map((r) => ({
    id: r.id,
    authorId: r.authorId,
    status: r.status as WorkWire['status'],
    circleIds: circ.filter((c) => c.workId === r.id).map((c) => c.circleId),
    envelope: r.envelope as WorkWire['envelope'],
    reactions: reacts.filter((x) => x.workId === r.id).map((x) => ({ kind: x.kind as WorkWire['reactions'][number]['kind'], userId: x.userId })),
    noteCount: notes.find((n) => n.workId === r.id)?.n ?? 0,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
    publishedAt: r.publishedAt?.toISOString() ?? null,
  }));
}

/** Penulis selalu boleh; pembaca harus anggota aktif salah satu lingkaran tujuan karya terbit. */
async function readable(s: Services, workId: string, userId: string): Promise<WorkRow> {
  const [w] = await s.db.select().from(works).where(eq(works.id, workId));
  if (!w) throw notFound('Karya tidak ditemukan.');
  if (w.authorId === userId) return w;
  if (w.status !== 'published') throw notFound('Karya tidak ditemukan.');
  const mine = await activeCircleIds(s, userId);
  const circ = await s.db.select().from(workCircles).where(eq(workCircles.workId, workId));
  if (!circ.some((c) => mine.includes(c.circleId))) throw notFound('Karya tidak ditemukan.');
  return w;
}

export function workRoutes(s: Services) {
  const r = new Hono<AppEnv>();

  r.get('/works', async (c) => {
    const rows = await s.db.select().from(works).where(eq(works.authorId, c.get('user').id)).orderBy(desc(works.updatedAt));
    return c.json(await hydrate(s, rows));
  });

  /** Karya terbit dari semua lingkaranku (tanpa milikku sendiri). */
  r.get('/works/feed', async (c) => {
    const user = c.get('user');
    const mine = await activeCircleIds(s, user.id);
    if (!mine.length) return c.json([]);
    const ids = [...new Set((await s.db.select().from(workCircles).where(inArray(workCircles.circleId, mine))).map((x) => x.workId))];
    if (!ids.length) return c.json([]);
    const rows = await s.db
      .select()
      .from(works)
      .where(and(inArray(works.id, ids), eq(works.status, 'published')))
      .orderBy(desc(works.publishedAt))
      .limit(200);
    return c.json(await hydrate(s, rows.filter((w) => w.authorId !== user.id)));
  });

  r.get('/circles/:id/works', async (c) => {
    const user = c.get('user');
    const circleId = c.req.param('id');
    await requireMember(s, circleId, user.id);
    const ids = (await s.db.select().from(workCircles).where(eq(workCircles.circleId, circleId))).map((x) => x.workId);
    if (!ids.length) return c.json([]);
    const rows = await s.db
      .select()
      .from(works)
      .where(and(inArray(works.id, ids), eq(works.status, 'published')))
      .orderBy(desc(works.publishedAt));
    return c.json(await hydrate(s, rows));
  });

  r.get('/works/:id', async (c) => {
    const w = await readable(s, c.req.param('id'), c.get('user').id);
    return c.json((await hydrate(s, [w]))[0]);
  });

  const save = async (userId: string, input: ReturnType<typeof workBody.parse>, existing?: WorkRow) => {
    for (const cid of input.circleIds) await requireMember(s, cid, userId);
    const now = s.now();
    const publishedAt = input.status === 'published' ? (existing?.publishedAt ?? now) : null;
    if (existing) {
      await s.db.update(works).set({ status: input.status, envelope: input.envelope, updatedAt: now, publishedAt }).where(eq(works.id, existing.id));
      await s.db.delete(workCircles).where(eq(workCircles.workId, existing.id));
    } else {
      await s.db.insert(works).values({ id: input.id, authorId: userId, status: input.status, envelope: input.envelope, createdAt: now, updatedAt: now, publishedAt });
    }
    if (input.circleIds.length) await s.db.insert(workCircles).values(input.circleIds.map((circleId) => ({ workId: input.id, circleId })));
    const [w] = await s.db.select().from(works).where(eq(works.id, input.id));
    return (await hydrate(s, [w!]))[0]!;
  };

  r.post('/works', async (c) => {
    const input = await body(c, workBody);
    const [dup] = await s.db.select().from(works).where(eq(works.id, input.id));
    if (dup) {
      if (dup.authorId !== c.get('user').id) throw forbidden('Bukan karyamu.');
      return c.json(await save(c.get('user').id, input, dup));
    }
    return c.json(await save(c.get('user').id, input), 201);
  });

  r.put('/works/:id', async (c) => {
    const input = await body(c, workBody);
    const [w] = await s.db.select().from(works).where(eq(works.id, c.req.param('id')));
    if (!w || w.authorId !== c.get('user').id || input.id !== w.id) throw notFound('Karya tidak ditemukan.');
    return c.json(await save(c.get('user').id, input, w));
  });

  r.delete('/works/:id', async (c) => {
    const [w] = await s.db.select().from(works).where(eq(works.id, c.req.param('id')));
    if (!w || w.authorId !== c.get('user').id) throw notFound('Karya tidak ditemukan.');
    await s.db.delete(works).where(eq(works.id, w.id));
    return c.json({ ok: true });
  });

  r.put('/works/:id/reactions/:kind', async (c) => {
    const user = c.get('user');
    const { kind } = reactionParams.parse({ kind: c.req.param('kind') });
    const w = await readable(s, c.req.param('id'), user.id);
    await s.db.insert(workReactions).values({ workId: w.id, userId: user.id, kind }).onConflictDoNothing();
    return c.json({ ok: true });
  });

  r.delete('/works/:id/reactions/:kind', async (c) => {
    const user = c.get('user');
    await s.db.delete(workReactions).where(and(eq(workReactions.workId, c.req.param('id')), eq(workReactions.userId, user.id), eq(workReactions.kind, c.req.param('kind'))));
    return c.json({ ok: true });
  });

  r.get('/works/:id/notes', async (c) => {
    const w = await readable(s, c.req.param('id'), c.get('user').id);
    const rows = await s.db.select().from(workNotes).where(eq(workNotes.workId, w.id)).orderBy(workNotes.createdAt);
    const out: WorkNoteWire[] = rows.map((n) => ({ id: n.id, workId: n.workId, authorId: n.authorId, envelope: n.envelope as WorkNoteWire['envelope'], createdAt: n.createdAt.toISOString() }));
    return c.json(out);
  });

  r.post('/works/:id/notes', async (c) => {
    const user = c.get('user');
    const input = await body(c, workNoteBody);
    const w = await readable(s, c.req.param('id'), user.id);
    await s.db.insert(workNotes).values({ id: input.id, workId: w.id, authorId: user.id, envelope: input.envelope });
    return c.json({ ok: true }, 201);
  });

  r.delete('/works/:id/notes/:noteId', async (c) => {
    const user = c.get('user');
    const [n] = await s.db.select().from(workNotes).where(eq(workNotes.id, c.req.param('noteId')));
    if (!n) throw notFound('Catatan tidak ditemukan.');
    const [w] = await s.db.select().from(works).where(eq(works.id, n.workId));
    if (n.authorId !== user.id && w?.authorId !== user.id) throw forbidden('Bukan catatanmu.');
    await s.db.delete(workNotes).where(eq(workNotes.id, n.id));
    return c.json({ ok: true });
  });

  return r;
}
