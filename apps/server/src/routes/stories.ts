/**
 * Hidup Orang Lain: cerita bersama dalam tiga putaran. Isi bagian terenkripsi
 * end-to-end; server hanya menjaga giliran: bagian orang lain baru dilepas
 * setelah semua penulis di putaran itu menyegel.
 */
import { drawStoryRoles, STORY_ROUNDS, storyBody, storyPartBody, storyPremise, type StoryPhase, type StoryWire } from '@sehari/core';
import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import { Hono } from 'hono';
import { type AppEnv, body, type Services } from '../context';
import { schema } from '../db';
import { requireMember } from '../lib/domain';
import { bad, conflict, forbidden, notFound } from '../lib/errors';

const { stories, storyParts, circleMembers } = schema;
type StoryRow = typeof stories.$inferSelect;
type PartRow = typeof storyParts.$inferSelect;

function wire(st: StoryRow, parts: PartRow[], viewer: string): StoryWire {
  const phase = st.phase as StoryPhase;
  // Putaran yang sudah dibuka: yang sudah lewat, dan putaran ini begitu masuk ruang baca.
  const opened = (round: number) => round < st.round || phase !== 'write';
  return {
    id: st.id,
    circleId: st.circleId,
    ownerId: st.ownerId,
    premise: st.premise,
    round: st.round,
    phase,
    members: st.members,
    roles: phase === 'done' ? st.roles : { [viewer]: st.roles[viewer] ?? '' },
    ready: st.ready,
    parts: parts
      .filter((p) => p.storyId === st.id)
      .sort((a, b) => a.round - b.round)
      .map((p) => ({
        id: p.id,
        round: p.round,
        authorId: p.authorId,
        envelope: p.authorId === viewer || opened(p.round) ? (p.envelope as never) : null,
        sealed: !!p.sealedAt,
        agrees: p.agrees,
      })),
    createdAt: st.createdAt.toISOString(),
    updatedAt: st.updatedAt.toISOString(),
  };
}

export function storyRoutes(s: Services) {
  const r = new Hono<AppEnv>();

  const mine = async (id: string, userId: string): Promise<StoryRow> => {
    const [st] = await s.db.select().from(stories).where(eq(stories.id, id));
    if (!st || !st.members.includes(userId)) throw notFound('Cerita tidak ditemukan.');
    return st;
  };
  const send = async (st: StoryRow, userId: string) => wire(st, await s.db.select().from(storyParts).where(eq(storyParts.storyId, st.id)), userId);

  r.get('/stories', async (c) => {
    const user = c.get('user');
    const rows = await s.db
      .select()
      .from(stories)
      .where(sql`${stories.members} @> ${JSON.stringify([user.id])}::jsonb`)
      .orderBy(desc(stories.updatedAt))
      .limit(100);
    if (!rows.length) return c.json([]);
    const parts = await s.db.select().from(storyParts).where(inArray(storyParts.storyId, rows.map((x) => x.id)));
    return c.json(rows.map((st) => wire(st, parts, user.id)));
  });

  r.post('/stories', async (c) => {
    const user = c.get('user');
    const input = await body(c, storyBody);
    if (!storyPremise(input.premise)) throw bad('premise', 'Premis tidak dikenal.');
    const members = [...new Set([user.id, ...input.members])];
    if (members.length > 5) throw bad('members', 'Paling banyak lima penulis.');
    if (input.circleId) {
      await requireMember(s, input.circleId, user.id);
      const active = await s.db
        .select({ userId: circleMembers.userId })
        .from(circleMembers)
        .where(and(eq(circleMembers.circleId, input.circleId), eq(circleMembers.state, 'active')));
      const ok = new Set(active.map((m) => m.userId));
      if (!members.every((m) => ok.has(m))) throw forbidden('Semua penulis harus anggota aktif lingkaran itu.');
    } else if (members.length > 1) throw bad('members', 'Cerita bersama butuh lingkaran.');
    const [dup] = await s.db.select().from(stories).where(eq(stories.id, input.id));
    if (dup) throw conflict('exists', 'Cerita itu sudah ada.');
    const [st] = await s.db
      .insert(stories)
      .values({ id: input.id, circleId: input.circleId, ownerId: user.id, premise: input.premise, members, roles: drawStoryRoles(members) })
      .returning();
    return c.json(wire(st!, [], user.id), 201);
  });

  r.get('/stories/:id', async (c) => c.json(await send(await mine(c.req.param('id'), c.get('user').id), c.get('user').id)));

  /** Simpan atau segel bagianku di putaran yang sedang ditulis. Segel terakhir membuka ruang baca. */
  r.put('/stories/:id/parts', async (c) => {
    const user = c.get('user');
    const input = await body(c, storyPartBody);
    const out = await s.db.transaction(async (tx) => {
      const [st] = await tx.select().from(stories).where(eq(stories.id, c.req.param('id'))).for('update');
      if (!st || !st.members.includes(user.id)) throw notFound('Cerita tidak ditemukan.');
      if (st.phase !== 'write' || input.round !== st.round) throw conflict('closed', 'Putaran itu sudah dibuka. Perubahan tidak lagi bisa disimpan di sini.');
      const now = new Date();
      await tx
        .insert(storyParts)
        .values({ id: `${st.id}.${st.round}.${user.id}`, storyId: st.id, round: st.round, authorId: user.id, envelope: input.envelope, sealedAt: input.seal ? now : null, updatedAt: now })
        .onConflictDoUpdate({ target: [storyParts.storyId, storyParts.round, storyParts.authorId], set: { envelope: input.envelope, sealedAt: input.seal ? now : null, updatedAt: now } });
      const sealed = await tx
        .select({ authorId: storyParts.authorId })
        .from(storyParts)
        .where(and(eq(storyParts.storyId, st.id), eq(storyParts.round, st.round), sql`${storyParts.sealedAt} is not null`));
      const all = st.members.every((m) => sealed.some((p) => p.authorId === m));
      const [next] = await tx
        .update(stories)
        .set(all ? { phase: 'read', ready: [], updatedAt: now } : { updatedAt: now })
        .where(eq(stories.id, st.id))
        .returning();
      return next!;
    });
    return c.json(await send(out, user.id));
  });

  /** Handshake satu ketukan: sepakati (atau batalkan) jejak sebuah bagian di ruang baca. */
  r.put('/stories/:id/parts/:partId/agree', async (c) => {
    const user = c.get('user');
    const st = await mine(c.req.param('id'), user.id);
    const [p] = await s.db.select().from(storyParts).where(and(eq(storyParts.id, c.req.param('partId')), eq(storyParts.storyId, st.id)));
    if (!p) throw notFound('Bagian tidak ditemukan.');
    if (st.phase !== 'read' || p.round !== st.round) throw conflict('closed', 'Jejak hanya bisa disepakati di ruang baca putaran ini.');
    if (p.authorId === user.id) throw bad('own', 'Jejakmu sendiri disepakati orang lain.');
    const agrees = p.agrees.includes(user.id) ? p.agrees.filter((x) => x !== user.id) : [...p.agrees, user.id];
    await s.db.update(storyParts).set({ agrees }).where(eq(storyParts.id, p.id));
    return c.json(await send(st, user.id));
  });

  /** Siap lanjut dari ruang baca. Saat semua siap: putaran berikutnya, atau cerita selesai. */
  r.post('/stories/:id/ready', async (c) => {
    const user = c.get('user');
    const out = await s.db.transaction(async (tx) => {
      const [st] = await tx.select().from(stories).where(eq(stories.id, c.req.param('id'))).for('update');
      if (!st || !st.members.includes(user.id)) throw notFound('Cerita tidak ditemukan.');
      if (st.phase !== 'read') throw conflict('phase', 'Belum waktunya lanjut.');
      const ready = [...new Set([...st.ready, user.id])];
      const all = st.members.every((m) => ready.includes(m));
      const set = !all ? { ready } : st.round >= STORY_ROUNDS ? { ready, phase: 'done' } : { ready: [], phase: 'write', round: st.round + 1 };
      const [next] = await tx.update(stories).set({ ...set, updatedAt: new Date() }).where(eq(stories.id, st.id)).returning();
      return next!;
    });
    return c.json(await send(out, user.id));
  });

  r.delete('/stories/:id', async (c) => {
    const st = await mine(c.req.param('id'), c.get('user').id);
    if (st.ownerId !== c.get('user').id) throw forbidden('Hanya pembuka cerita yang bisa menghapusnya.');
    await s.db.delete(stories).where(eq(stories.id, st.id));
    return c.json({ ok: true });
  });

  return r;
}
