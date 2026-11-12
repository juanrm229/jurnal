/**
 * Studio Naskah: naskah berbasis adegan. Server hanya menjaga siapa boleh
 * membaca dan mengubah apa; isi adegan, kanon, dan judul terenkripsi.
 *  - satu adegan, satu pemilik: hanya penulisnya yang mengubah isi dan status,
 *  - draf hanya terlihat oleh penulisnya; yang lain hanya tahu sedang ditulis,
 *  - susunan (bab dan urutan) dan Kanon adalah milik bersama semua penulis.
 */
import {
  naskahBody,
  naskahCanonBody,
  naskahCanonPatch,
  naskahMetaBody,
  naskahSceneBody,
  naskahScenePatch,
  type NaskahVersionWire,
  type NaskahWire,
} from '@sehari/core';
import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import { Hono } from 'hono';
import { type AppEnv, body, type Services } from '../context';
import { schema } from '../db';
import { pushTo, requireMember } from '../lib/domain';
import { bad, conflict, forbidden, notFound } from '../lib/errors';

const { manuscripts, msScenes, msVersions, msCanon, circleMembers } = schema;
type MsRow = typeof manuscripts.$inferSelect;
type SceneRow = typeof msScenes.$inferSelect;
type CanonRow = typeof msCanon.$inferSelect;

/** Versi terbit disimpan paling banyak sekali per sepuluh menit per adegan. */
const VERSION_GAP_MS = 10 * 60_000;
const MAX_VERSIONS = 30;

function wire(ms: MsRow, scenes: SceneRow[], canon: CanonRow[], viewer: string): NaskahWire {
  return {
    id: ms.id,
    circleId: ms.circleId,
    ownerId: ms.ownerId,
    members: ms.members,
    visibility: ms.visibility as 'privat' | 'kota' | 'arsip',
    meta: ms.meta as never,
    scenes: scenes
      // Pembaca kota (bukan penulis) hanya melihat adegan yang sudah terbit.
      .filter((x) => ms.members.includes(viewer) || x.status === 'terbit')
      .sort((a, b) => a.chapter - b.chapter || a.order - b.order)
      .map((x) => ({
        id: x.id,
        authorId: x.authorId,
        chapter: x.chapter,
        order: x.order,
        status: x.status as 'draf' | 'terbit',
        envelope: x.status === 'terbit' || x.authorId === viewer ? (x.envelope as never) : null,
        version: x.version,
        updatedAt: x.updatedAt.toISOString(),
      })),
    canon: canon.map((x) => ({ id: x.id, kind: x.kind as never, authorId: x.authorId, updatedBy: x.updatedBy, envelope: x.envelope as never, updatedAt: x.updatedAt.toISOString() })),
    createdAt: ms.createdAt.toISOString(),
    updatedAt: ms.updatedAt.toISOString(),
  };
}

export function naskahRoutes(s: Services) {
  const r = new Hono<AppEnv>();

  const load = async (ids: string[]) => {
    if (!ids.length) return { scenes: [] as SceneRow[], canon: [] as CanonRow[] };
    const [scenes, canon] = await Promise.all([s.db.select().from(msScenes).where(inArray(msScenes.msId, ids)), s.db.select().from(msCanon).where(inArray(msCanon.msId, ids))]);
    return { scenes, canon };
  };
  const send = async (ms: MsRow, viewer: string) => {
    const b = await load([ms.id]);
    return wire(ms, b.scenes, b.canon, viewer);
  };
  const mine = async (id: string, userId: string): Promise<MsRow> => {
    const [ms] = await s.db.select().from(manuscripts).where(eq(manuscripts.id, id));
    if (!ms || !ms.members.includes(userId)) throw notFound('Naskah tidak ditemukan.');
    return ms;
  };
  /** Naskah rumah di Kota boleh dibaca siapa pun yang masuk; naskah privat hanya penulisnya. */
  const readable = async (id: string, userId: string): Promise<MsRow> => {
    const [ms] = await s.db.select().from(manuscripts).where(eq(manuscripts.id, id));
    if (!ms || (!ms.members.includes(userId) && ms.visibility !== 'kota')) throw notFound('Naskah tidak ditemukan.');
    return ms;
  };
  /** Rumah kota menyimpan isi terbuka; naskah privat wajib terenkripsi. */
  const envFor = (ms: MsRow, env: unknown) => {
    const plain = !!env && typeof env === 'object' && 'plain' in env;
    if (plain !== (ms.visibility !== 'privat')) throw bad('envelope', ms.visibility !== 'privat' ? 'Rumah di Kota ditulis terbuka untuk dibaca warga.' : 'Naskah privat harus terenkripsi.');
    return env;
  };
  const touch = async (ms: MsRow) => {
    const [next] = await s.db.update(manuscripts).set({ updatedAt: s.now() }).where(eq(manuscripts.id, ms.id)).returning();
    return next!;
  };
  /** Kabar tanpa isi: tidak pernah memuat teks naskah. */
  const kabar = (ms: MsRow, except: string, text: string) =>
    pushTo(s, ms.members.filter((m) => m !== except), { body: text, data: { type: 'naskah', msId: ms.id } }).catch(() => {});
  const snapshot = async (scene: SceneRow, envelope: unknown, now: Date) => {
    const [last] = await s.db.select().from(msVersions).where(eq(msVersions.sceneId, scene.id)).orderBy(desc(msVersions.version)).limit(1);
    if (last && now.getTime() - last.createdAt.getTime() < VERSION_GAP_MS) {
      await s.db.update(msVersions).set({ envelope }).where(eq(msVersions.id, last.id));
      return last.version;
    }
    const version = (last?.version ?? 0) + 1;
    await s.db.insert(msVersions).values({ id: `${scene.id}.v${version}`, sceneId: scene.id, version, envelope, createdAt: now });
    const old = await s.db.select({ id: msVersions.id }).from(msVersions).where(eq(msVersions.sceneId, scene.id)).orderBy(desc(msVersions.version)).offset(MAX_VERSIONS);
    if (old.length) await s.db.delete(msVersions).where(inArray(msVersions.id, old.map((x) => x.id)));
    return version;
  };

  r.get('/naskah', async (c) => {
    const user = c.get('user');
    const rows = await s.db
      .select()
      .from(manuscripts)
      .where(sql`${manuscripts.members} @> ${JSON.stringify([user.id])}::jsonb`)
      .orderBy(desc(manuscripts.updatedAt))
      .limit(60);
    const b = await load(rows.map((x) => x.id));
    return c.json(rows.map((ms) => wire(ms, b.scenes.filter((x) => x.msId === ms.id), b.canon.filter((x) => x.msId === ms.id), user.id)));
  });

  r.post('/naskah', async (c) => {
    const user = c.get('user');
    const input = await body(c, naskahBody);
    const members = [...new Set([user.id, ...input.members])];
    if (input.circleId) {
      await requireMember(s, input.circleId, user.id);
      const active = await s.db
        .select({ userId: circleMembers.userId })
        .from(circleMembers)
        .where(and(eq(circleMembers.circleId, input.circleId), eq(circleMembers.state, 'active')));
      const ok = new Set(active.map((m) => m.userId));
      if (!members.every((m) => ok.has(m))) throw forbidden('Semua penulis harus anggota aktif lingkaran itu.');
    } else if (members.length > 1) throw bad('members', 'Naskah bersama butuh lingkaran.');
    const [dup] = await s.db.select({ id: manuscripts.id }).from(manuscripts).where(eq(manuscripts.id, input.id));
    if (dup) throw conflict('exists', 'Naskah itu sudah ada.');
    const now = s.now();
    const [ms] = await s.db.insert(manuscripts).values({ id: input.id, circleId: input.circleId, ownerId: user.id, members, meta: input.meta, createdAt: now, updatedAt: now }).returning();
    void kabar(ms!, user.id, `${user.penName ?? 'Seseorang'} mengajakmu menulis naskah bersama.`);
    return c.json(await send(ms!, user.id), 201);
  });

  r.get('/naskah/:id', async (c) => c.json(await send(await readable(c.req.param('id'), c.get('user').id), c.get('user').id)));

  r.put('/naskah/:id/meta', async (c) => {
    const user = c.get('user');
    const { meta } = await body(c, naskahMetaBody);
    const ms = await mine(c.req.param('id'), user.id);
    envFor(ms, meta);
    const [next] = await s.db.update(manuscripts).set({ meta, updatedAt: s.now() }).where(eq(manuscripts.id, ms.id)).returning();
    return c.json(await send(next!, user.id));
  });

  r.delete('/naskah/:id', async (c) => {
    const user = c.get('user');
    const ms = await mine(c.req.param('id'), user.id);
    if (ms.ownerId !== user.id) throw forbidden('Hanya pembuka naskah yang bisa menghapusnya.');
    await s.db.delete(manuscripts).where(eq(manuscripts.id, ms.id));
    return c.json({ ok: true });
  });

  // ── Adegan ──

  r.post('/naskah/:id/scenes', async (c) => {
    const user = c.get('user');
    const input = await body(c, naskahSceneBody);
    const ms = await mine(c.req.param('id'), user.id);
    envFor(ms, input.envelope);
    const [n] = await s.db.select({ n: sql<number>`count(*)::int` }).from(msScenes).where(eq(msScenes.msId, ms.id));
    if ((n?.n ?? 0) >= 2000) throw bad('full', 'Naskah ini sudah terlalu panjang.');
    const now = s.now();
    const [row] = await s.db
      .insert(msScenes)
      .values({ id: input.id, msId: ms.id, authorId: user.id, chapter: input.chapter, order: input.order, status: input.status, envelope: input.envelope, createdAt: now, updatedAt: now })
      .onConflictDoNothing()
      .returning();
    if (row && input.status === 'terbit') {
      const version = await snapshot(row, input.envelope, now);
      await s.db.update(msScenes).set({ version }).where(eq(msScenes.id, row.id));
      void kabar(ms, user.id, `${user.penName ?? 'Seseorang'} menerbitkan adegan baru.`);
    }
    return c.json(await send(await touch(ms), user.id), 201);
  });

  /** Isi dan status hanya oleh penulisnya; bab dan urutan oleh siapa pun di naskah. */
  r.put('/naskah/:id/scenes/:sid', async (c) => {
    const user = c.get('user');
    const input = await body(c, naskahScenePatch);
    const ms = await mine(c.req.param('id'), user.id);
    if (input.envelope) envFor(ms, input.envelope);
    const [sc] = await s.db.select().from(msScenes).where(and(eq(msScenes.id, c.req.param('sid')), eq(msScenes.msId, ms.id)));
    if (!sc || (sc.status === 'draf' && sc.authorId !== user.id)) throw notFound('Adegan tidak ditemukan.');
    if ((input.envelope || input.status) && sc.authorId !== user.id) throw forbidden('Adegan ini milik penulis lain. Beri saran lewat catatan.');
    const now = s.now();
    const status = input.status ?? sc.status;
    const envelope = input.envelope ?? sc.envelope;
    let version = sc.version;
    if (status === 'terbit' && (input.envelope || sc.status !== 'terbit')) version = await snapshot(sc, envelope, now);
    await s.db
      .update(msScenes)
      .set({ chapter: input.chapter ?? sc.chapter, order: input.order ?? sc.order, status, envelope, version, ...(input.envelope || input.status ? { updatedAt: now } : {}) })
      .where(eq(msScenes.id, sc.id));
    if (status === 'terbit' && sc.status !== 'terbit') void kabar(ms, user.id, `${user.penName ?? 'Seseorang'} menerbitkan adegan baru.`);
    return c.json(await send(await touch(ms), user.id));
  });

  r.delete('/naskah/:id/scenes/:sid', async (c) => {
    const user = c.get('user');
    const ms = await mine(c.req.param('id'), user.id);
    const [sc] = await s.db.select().from(msScenes).where(and(eq(msScenes.id, c.req.param('sid')), eq(msScenes.msId, ms.id)));
    if (!sc) throw notFound('Adegan tidak ditemukan.');
    if (sc.authorId !== user.id) throw forbidden('Hanya penulisnya yang bisa menghapus adegan ini.');
    await s.db.delete(msScenes).where(eq(msScenes.id, sc.id));
    return c.json(await send(await touch(ms), user.id));
  });

  /** Riwayat versi adegan terbit (dan draf sendiri). */
  r.get('/naskah/:id/scenes/:sid/versions', async (c) => {
    const user = c.get('user');
    const ms = await readable(c.req.param('id'), user.id);
    const [sc] = await s.db.select().from(msScenes).where(and(eq(msScenes.id, c.req.param('sid')), eq(msScenes.msId, ms.id)));
    if (!sc || (sc.status === 'draf' && sc.authorId !== user.id)) throw notFound('Adegan tidak ditemukan.');
    const rows = await s.db.select().from(msVersions).where(eq(msVersions.sceneId, sc.id)).orderBy(desc(msVersions.version));
    return c.json(rows.map((x): NaskahVersionWire => ({ id: x.id, sceneId: x.sceneId, version: x.version, envelope: x.envelope as never, createdAt: x.createdAt.toISOString() })));
  });

  // ── Kanon (milik bersama) ──

  r.post('/naskah/:id/canon', async (c) => {
    const user = c.get('user');
    const input = await body(c, naskahCanonBody);
    const ms = await mine(c.req.param('id'), user.id);
    envFor(ms, input.envelope);
    const [n] = await s.db.select({ n: sql<number>`count(*)::int` }).from(msCanon).where(eq(msCanon.msId, ms.id));
    if ((n?.n ?? 0) >= 1000) throw bad('full', 'Kanon naskah ini sudah penuh.');
    const now = s.now();
    await s.db.insert(msCanon).values({ id: input.id, msId: ms.id, kind: input.kind, authorId: user.id, updatedBy: user.id, envelope: input.envelope, createdAt: now, updatedAt: now }).onConflictDoNothing();
    return c.json(await send(await touch(ms), user.id), 201);
  });

  r.put('/naskah/:id/canon/:cid', async (c) => {
    const user = c.get('user');
    const { envelope } = await body(c, naskahCanonPatch);
    const ms = await mine(c.req.param('id'), user.id);
    envFor(ms, envelope);
    const [e] = await s.db.select().from(msCanon).where(and(eq(msCanon.id, c.req.param('cid')), eq(msCanon.msId, ms.id)));
    if (!e) throw notFound('Entri kanon tidak ditemukan.');
    await s.db.update(msCanon).set({ envelope, updatedBy: user.id, updatedAt: s.now() }).where(eq(msCanon.id, e.id));
    return c.json(await send(await touch(ms), user.id));
  });

  r.delete('/naskah/:id/canon/:cid', async (c) => {
    const user = c.get('user');
    const ms = await mine(c.req.param('id'), user.id);
    const [e] = await s.db.select().from(msCanon).where(and(eq(msCanon.id, c.req.param('cid')), eq(msCanon.msId, ms.id)));
    if (!e) throw notFound('Entri kanon tidak ditemukan.');
    if (e.authorId !== user.id && ms.ownerId !== user.id) throw forbidden('Entri ini dibuat penulis lain.');
    await s.db.delete(msCanon).where(eq(msCanon.id, e.id));
    return c.json(await send(await touch(ms), user.id));
  });

  return r;
}
