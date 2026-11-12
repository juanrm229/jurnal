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
  KOTA_TOKOH_MAKS,
  naskahCanonPatch,
  naskahMetaBody,
  naskahSceneBody,
  naskahScenePatch,
  naskahWorkBody,
  naskahWorkPatch,
  type NaskahVersionWire,
  type NaskahWire,
} from '@sehari/core';
import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import { Hono } from 'hono';
import { type AppEnv, body, type Services } from '../context';
import { schema } from '../db';
import { pushTo, requireMember } from '../lib/domain';
import { bad, conflict, forbidden, notFound } from '../lib/errors';
import { tokohku } from '../lib/kotaTokoh';

const { manuscripts, msScenes, msVersions, msCanon, msWorks, circleMembers, cityClaims, cityHolds } = schema;
type WorkRow = typeof msWorks.$inferSelect;
type MsRow = typeof manuscripts.$inferSelect;
type SceneRow = typeof msScenes.$inferSelect;
type CanonRow = typeof msCanon.$inferSelect;

/** Versi terbit disimpan paling banyak sekali per sepuluh menit per adegan. */
const VERSION_GAP_MS = 10 * 60_000;
const MAX_VERSIONS = 30;

function wire(ms: MsRow, scenes: SceneRow[], canon: CanonRow[], viewer: string, works: WorkRow[] = []): NaskahWire {
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
        workId: x.workId ?? null,
        chapter: x.chapter,
        order: x.order,
        status: x.status as 'draf' | 'terbit',
        envelope: x.status === 'terbit' || x.authorId === viewer ? (x.envelope as never) : null,
        version: x.version,
        updatedAt: x.updatedAt.toISOString(),
      })),
    works: works.sort((a, b) => a.order - b.order).map((x) => ({ id: x.id, authorId: x.authorId, bentuk: x.bentuk as never, envelope: x.envelope as never, order: x.order, createdAt: x.createdAt.toISOString() })),
    canon: canon.map((x) => ({ id: x.id, kind: x.kind as never, authorId: x.authorId, updatedBy: x.updatedBy, envelope: x.envelope as never, updatedAt: x.updatedAt.toISOString() })),
    createdAt: ms.createdAt.toISOString(),
    updatedAt: ms.updatedAt.toISOString(),
  };
}

export function naskahRoutes(s: Services) {
  const r = new Hono<AppEnv>();

  const load = async (ids: string[]) => {
    if (!ids.length) return { scenes: [] as SceneRow[], canon: [] as CanonRow[], works: [] as WorkRow[] };
    const [scenes, canon, works] = await Promise.all([
      s.db.select().from(msScenes).where(inArray(msScenes.msId, ids)),
      s.db.select().from(msCanon).where(inArray(msCanon.msId, ids)),
      s.db.select().from(msWorks).where(inArray(msWorks.msId, ids)),
    ]);
    return { scenes, canon, works };
  };
  const send = async (ms: MsRow, viewer: string) => {
    const b = await load([ms.id]);
    return wire(ms, b.scenes, b.canon, viewer, b.works);
  };
  /** Karya harus milik naskah yang sama. */
  const workIn = async (ms: MsRow, workId: string | null | undefined) => {
    if (!workId) return null;
    const [w] = await s.db.select({ id: msWorks.id }).from(msWorks).where(and(eq(msWorks.id, workId), eq(msWorks.msId, ms.id)));
    if (!w) throw bad('work', 'Karya itu tidak ada di naskah ini.');
    return w.id;
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
  /**
   * Penulis yang memegang figuran di rumah kota orang lain: kembalikan tokoh yang
   * dipegangnya. null = tanpa batasan (pemilik rumah, atau naskah bukan rumah kota).
   */
  const held = async (ms: MsRow, userId: string): Promise<Set<string> | null> => {
    if (ms.visibility !== 'kota' || ms.ownerId === userId) return null;
    const rows = await s.db
      .select({ tokohId: cityHolds.tokohId })
      .from(cityHolds)
      .innerJoin(cityClaims, eq(cityClaims.id, cityHolds.claimId))
      .where(and(eq(cityClaims.msId, ms.id), eq(cityHolds.requesterId, userId), eq(cityHolds.state, 'pegang')));
    return new Set(rows.map((x) => x.tokohId));
  };
  const povOk = async (ms: MsRow, userId: string, env: unknown) => {
    const h = await held(ms, userId);
    if (!h) return;
    const pov = (env as { plain?: { pov?: string } }).plain?.pov;
    if (!pov || !h.has(pov)) throw forbidden('Di rumah ini kamu hanya menulis dari sudut pandang tokoh yang kamu pegang.');
  };
  const ownerOnlyKota = (ms: MsRow, userId: string) => {
    if (ms.visibility === 'kota' && ms.ownerId !== userId) throw forbidden('Rak karya rumah ini diatur oleh pemiliknya.');
  };
  type TokohPlain = { name?: string; aliases?: string[]; peran?: string; born?: number; died?: number; asal?: { claimId: string; tokohId: string } };
  const tokohPlain = (env: unknown) => (env && typeof env === 'object' && 'plain' in env ? ((env as { plain?: TokohPlain }).plain ?? null) : null);
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
    return c.json(rows.map((ms) => wire(ms, b.scenes.filter((x) => x.msId === ms.id), b.canon.filter((x) => x.msId === ms.id), user.id, b.works.filter((x) => x.msId === ms.id))));
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
    await povOk(ms, user.id, input.envelope);
    const [n] = await s.db.select({ n: sql<number>`count(*)::int` }).from(msScenes).where(eq(msScenes.msId, ms.id));
    if ((n?.n ?? 0) >= 2000) throw bad('full', 'Naskah ini sudah terlalu panjang.');
    const now = s.now();
    const [row] = await s.db
      .insert(msScenes)
      .values({ id: input.id, msId: ms.id, authorId: user.id, workId: await workIn(ms, input.workId), chapter: input.chapter, order: input.order, status: input.status, envelope: input.envelope, createdAt: now, updatedAt: now })
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
    if (input.envelope) (envFor(ms, input.envelope), await povOk(ms, user.id, input.envelope));
    const [sc] = await s.db.select().from(msScenes).where(and(eq(msScenes.id, c.req.param('sid')), eq(msScenes.msId, ms.id)));
    if (!sc || (sc.status === 'draf' && sc.authorId !== user.id)) throw notFound('Adegan tidak ditemukan.');
    if ((input.envelope || input.status || input.workId !== undefined) && sc.authorId !== user.id) throw forbidden('Adegan ini milik penulis lain. Beri saran lewat catatan.');
    const workId = input.workId === undefined ? sc.workId : await workIn(ms, input.workId);
    const now = s.now();
    const status = input.status ?? sc.status;
    const envelope = input.envelope ?? sc.envelope;
    let version = sc.version;
    if (status === 'terbit' && (input.envelope || sc.status !== 'terbit')) version = await snapshot(sc, envelope, now);
    await s.db
      .update(msScenes)
      .set({ workId, chapter: input.chapter ?? sc.chapter, order: input.order ?? sc.order, status, envelope, version, ...(input.envelope || input.status ? { updatedAt: now } : {}) })
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

  // ── Rak karya ──

  r.post('/naskah/:id/works', async (c) => {
    const user = c.get('user');
    const input = await body(c, naskahWorkBody);
    const ms = await mine(c.req.param('id'), user.id);
    ownerOnlyKota(ms, user.id);
    envFor(ms, input.envelope);
    const [n] = await s.db.select({ n: sql<number>`count(*)::int` }).from(msWorks).where(eq(msWorks.msId, ms.id));
    if ((n?.n ?? 0) >= 60) throw bad('full', 'Rak karya naskah ini sudah penuh.');
    const now = s.now();
    await s.db.insert(msWorks).values({ id: input.id, msId: ms.id, authorId: user.id, bentuk: input.bentuk, envelope: input.envelope, order: input.order, createdAt: now, updatedAt: now }).onConflictDoNothing();
    return c.json(await send(await touch(ms), user.id), 201);
  });

  /** Judul, sinopsis, judul bab: oleh pembuat karya atau pembuka naskah. */
  r.put('/naskah/:id/works/:wid', async (c) => {
    const user = c.get('user');
    const input = await body(c, naskahWorkPatch);
    const ms = await mine(c.req.param('id'), user.id);
    ownerOnlyKota(ms, user.id);
    const [w] = await s.db.select().from(msWorks).where(and(eq(msWorks.id, c.req.param('wid')), eq(msWorks.msId, ms.id)));
    if (!w) throw notFound('Karya tidak ditemukan.');
    if (input.envelope && w.authorId !== user.id && ms.ownerId !== user.id) throw forbidden('Karya ini dibuat penulis lain.');
    if (input.envelope) envFor(ms, input.envelope);
    await s.db.update(msWorks).set({ ...(input.envelope ? { envelope: input.envelope } : {}), ...(input.order !== undefined ? { order: input.order } : {}), updatedAt: s.now() }).where(eq(msWorks.id, w.id));
    return c.json(await send(await touch(ms), user.id));
  });

  /** Hapus karya: adegannya tetap ada, kembali jadi kisah lepas. */
  r.delete('/naskah/:id/works/:wid', async (c) => {
    const user = c.get('user');
    const ms = await mine(c.req.param('id'), user.id);
    const [w] = await s.db.select().from(msWorks).where(and(eq(msWorks.id, c.req.param('wid')), eq(msWorks.msId, ms.id)));
    if (!w) throw notFound('Karya tidak ditemukan.');
    if (w.authorId !== user.id && ms.ownerId !== user.id) throw forbidden('Karya ini dibuat penulis lain.');
    await s.db.update(msScenes).set({ workId: null }).where(eq(msScenes.workId, w.id));
    await s.db.delete(msWorks).where(eq(msWorks.id, w.id));
    return c.json(await send(await touch(ms), user.id));
  });

  // ── Kanon (milik bersama) ──

  r.post('/naskah/:id/canon', async (c) => {
    const user = c.get('user');
    const input = await body(c, naskahCanonBody);
    const ms = await mine(c.req.param('id'), user.id);
    envFor(ms, input.envelope);
    const [n] = await s.db.select({ n: sql<number>`count(*)::int` }).from(msCanon).where(eq(msCanon.msId, ms.id));
    if ((n?.n ?? 0) >= 1000) throw bad('full', 'Kanon naskah ini sudah penuh.');
    // Kota: tokoh dibuat pemilik rumah, dalam batas tokoh per warga; pindahan hanya lewat patok.
    if (ms.visibility === 'kota' && input.kind === 'tokoh') {
      const p = tokohPlain(input.envelope);
      if (p?.asal) throw bad('asal', 'Tokoh pindahan dibawa lewat patok rumah, bukan dibuat di Kanon.');
      if (ms.ownerId !== user.id) throw forbidden('Tokoh rumah ini dibuat oleh pemiliknya.');
      if (p?.peran !== 'figuran' && (await tokohku(s, user.id)).length >= KOTA_TOKOH_MAKS) throw conflict('tokoh', `Kamu sudah memakai ${KOTA_TOKOH_MAKS} tokoh di kota. Jadikan figuran rumah, atau pindahkan tokohmu ke rumah ini lewat patok.`);
    }
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
    const h = await held(ms, user.id);
    if (h && e.authorId !== user.id && !h.has(e.id)) throw forbidden('Kanon rumah ini diubah pemiliknya; kamu hanya mengubah tokoh yang kamu pegang.');
    let env: unknown = envelope;
    if (ms.visibility === 'kota' && e.kind === 'tokoh') {
      const lama = tokohPlain(e.envelope);
      const baru = tokohPlain(envelope);
      if (JSON.stringify(lama?.asal ?? null) !== JSON.stringify(baru?.asal ?? null)) throw bad('asal', 'Asal tokoh pindahan tidak bisa diubah.');
      if ((lama?.peran ?? 'utama') !== (baru?.peran ?? 'utama')) {
        if (h) throw forbidden('Peran tokoh diatur pemilik rumah.');
        if (!baru?.asal && baru?.peran !== 'figuran' && (await tokohku(s, user.id)).length >= KOTA_TOKOH_MAKS) throw conflict('tokoh', `Kamu sudah memakai ${KOTA_TOKOH_MAKS} tokoh di kota; tokoh ini tetap figuran.`);
      }
      if (baru?.asal) {
        // Pindahan: nama dan masa hidup selalu mengikuti tokoh aslinya.
        const [asli] = await s.db.select().from(msCanon).where(eq(msCanon.id, baru.asal.tokohId));
        const a = asli && tokohPlain(asli.envelope);
        if (a) env = { plain: { ...baru, name: a.name, aliases: a.aliases ?? [], born: a.born, died: a.died } };
      } else if (baru) {
        const salinan = await s.db.select().from(msCanon).where(sql`${msCanon.envelope}->'plain'->'asal'->>'tokohId' = ${e.id}`);
        for (const x of salinan) {
          const p = tokohPlain(x.envelope);
          if (p) await s.db.update(msCanon).set({ envelope: { plain: { ...p, name: baru.name, aliases: baru.aliases ?? [], born: baru.born, died: baru.died } }, updatedAt: s.now() }).where(eq(msCanon.id, x.id));
        }
      }
    }
    await s.db.update(msCanon).set({ envelope: env, updatedBy: user.id, updatedAt: s.now() }).where(eq(msCanon.id, e.id));
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
