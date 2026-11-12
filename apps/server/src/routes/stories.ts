/**
 * Hidup Orang Lain: cerita bersama dalam gelombang. Semua isi terenkripsi
 * end-to-end; server hanya menjaga giliran dan siapa boleh membaca apa:
 *  - adegan dan serah-terima orang lain baru dilepas setelah semua penulis menyegel,
 *  - di mode kejutan adegan penuh ditahan sampai cerita selesai (serah-terima tidak),
 *  - maksud penulis dilepas ke pembaca setelah pembaca itu menulis tafsirnya.
 */
import {
  drawStoryOffers,
  drawStoryRoles,
  STORY_FREE,
  storyBabak,
  storyBody,
  storyBranchBody,
  type StoryDeck,
  storyEditionBody,
  storyFactBody,
  storyFocusBody,
  storyLens,
  storyNoteBody,
  storyPartBody,
  storyPremise,
  storyReadBody,
  storyResolveBody,
  storyVoteBody,
  type StoryPhase,
  type StoryWire,
} from '@sehari/core';
import { z } from 'zod';
import { envelopeSchema } from '@sehari/core';
import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import { Hono } from 'hono';
import { type AppEnv, body, type Services } from '../context';
import { schema } from '../db';
import { pushTo, requireMember } from '../lib/domain';
import { bad, conflict, forbidden, notFound } from '../lib/errors';

const { stories, storyParts, storyNotes, storyFacts, storyReads, circleMembers } = schema;
type StoryRow = typeof stories.$inferSelect;
type PartRow = typeof storyParts.$inferSelect;
type NoteRow = typeof storyNotes.$inferSelect;
type FactRow = typeof storyFacts.$inferSelect;
type ReadRow = typeof storyReads.$inferSelect;

interface Bundle {
  parts: PartRow[];
  notes: NoteRow[];
  facts: FactRow[];
  reads: ReadRow[];
}

function wire(st: StoryRow, b: Bundle, viewer: string): StoryWire {
  const phase = st.phase as StoryPhase;
  const done = phase === 'done';
  // Gelombang yang sudah dibuka: yang sudah lewat, dan gelombang ini begitu masuk ruang baca.
  const opened = (round: number) => round < st.round || phase !== 'write';
  const mineReads = new Set(b.reads.filter((r) => r.readerId === viewer && r.kind === 'tafsir').map((r) => r.partId));
  return {
    id: st.id,
    circleId: st.circleId,
    ownerId: st.ownerId,
    premise: st.premise,
    round: st.round,
    phase,
    members: st.members,
    roles: done ? st.roles : { [viewer]: st.roles[viewer] ?? '' },
    offers: st.offers[viewer] ?? [],
    ready: st.ready,
    rounds: st.rounds,
    deck: st.deck as StoryWire['deck'],
    mode: st.mode as StoryWire['mode'],
    meta: (st.meta as StoryWire['meta']) ?? null,
    palette: st.palette as StoryWire['palette'],
    focus: st.focus as StoryWire['focus'],
    skips: st.skips,
    rolesLog: done ? st.rolesLog : [],
    notes: b.notes.map((n) => ({ id: n.id, partId: n.partId, authorId: n.authorId, reason: n.reason as never, resolution: (n.resolution as never) ?? null, envelope: n.envelope as never })),
    facts: b.facts.map((f) => ({ id: f.id, round: f.round, authorId: f.authorId, envelope: f.envelope as never, state: f.state as never, agrees: f.agrees, defers: f.defers, supersedes: f.supersedes })),
    reads: b.reads
      .filter((r) => done || r.readerId === viewer || r.kind === 'tafsir')
      .map((r) => ({ id: r.id, partId: r.partId, readerId: r.readerId, kind: r.kind as never, envelope: r.envelope as never })),
    edition: (st.edition as StoryWire['edition']) ?? null,
    editionOk: st.editionOk,
    parts: b.parts
      .sort((x, y) => x.round - y.round)
      .map((p) => {
        const own = p.authorId === viewer;
        const open = own || opened(p.round);
        // Mode kejutan: adegan ditahan sampai selesai, kecuali bagian lama yang belum punya amplop serah-terima.
        const scene = own || (open && (done || st.mode !== 'kejutan' || !p.handoff));
        return {
          id: p.id,
          round: p.round,
          authorId: p.authorId,
          envelope: scene ? (p.envelope as never) : null,
          handoff: open ? ((p.handoff as never) ?? null) : null,
          intent: own || done || mineReads.has(p.id) ? ((p.intent as never) ?? null) : null,
          sealed: !!p.sealedAt,
          agrees: p.agrees,
          world: p.world,
          perk: open ? p.perk : false,
          veils: p.veils.length,
          veiledByMe: p.veils.includes(viewer),
        };
      }),
    createdAt: st.createdAt.toISOString(),
    updatedAt: st.updatedAt.toISOString(),
  };
}

export function storyRoutes(s: Services) {
  const r = new Hono<AppEnv>();

  const load = async (ids: string[]): Promise<Bundle> => {
    if (!ids.length) return { parts: [], notes: [], facts: [], reads: [] };
    const [parts, notes, facts, reads] = await Promise.all([
      s.db.select().from(storyParts).where(inArray(storyParts.storyId, ids)),
      s.db.select().from(storyNotes).where(inArray(storyNotes.storyId, ids)),
      s.db.select().from(storyFacts).where(inArray(storyFacts.storyId, ids)),
      s.db.select().from(storyReads).where(inArray(storyReads.storyId, ids)),
    ]);
    return { parts, notes, facts, reads };
  };
  const pick = (b: Bundle, id: string): Bundle => ({ parts: b.parts.filter((x) => x.storyId === id), notes: b.notes.filter((x) => x.storyId === id), facts: b.facts.filter((x) => x.storyId === id), reads: b.reads.filter((x) => x.storyId === id) });
  const send = async (st: StoryRow, userId: string) => wire(st, await load([st.id]), userId);
  const mine = async (id: string, userId: string): Promise<StoryRow> => {
    const [st] = await s.db.select().from(stories).where(eq(stories.id, id));
    if (!st || !st.members.includes(userId)) throw notFound('Cerita tidak ditemukan.');
    return st;
  };
  const partIn = async (st: StoryRow, partId: string) => {
    const [p] = await s.db.select().from(storyParts).where(and(eq(storyParts.id, partId), eq(storyParts.storyId, st.id)));
    if (!p) throw notFound('Bagian tidak ditemukan.');
    return p;
  };
  const isOpen = (st: StoryRow, round: number) => round < st.round || st.phase !== 'write';
  /** Kabar tanpa isi: tidak pernah memuat teks cerita. */
  const kabar = (st: StoryRow, except: string, text: string, to?: string[]) =>
    pushTo(s, (to ?? st.members).filter((m) => m !== except), { body: text, data: { type: 'story', storyId: st.id } }).catch(() => {});
  const sealedAuthors = async (tx: Pick<Services['db'], 'select'>, st: StoryRow) =>
    (
      await tx
        .select({ authorId: storyParts.authorId })
        .from(storyParts)
        .where(and(eq(storyParts.storyId, st.id), eq(storyParts.round, st.round), eq(storyParts.world, 'a'), sql`${storyParts.sealedAt} is not null`))
    ).map((p) => p.authorId);
  /** Dari ruang baca ke gelombang berikutnya, atau selesai. Babak baru membagikan kartu baru. */
  const advance = (st: StoryRow) => {
    if (st.round >= st.rounds) return { phase: 'done', ready: st.members };
    const next = st.round + 1;
    const newBabak = st.rounds > 3 && storyBabak(st.rounds, next) !== storyBabak(st.rounds, st.round);
    if (!newBabak) return { phase: 'write', round: next, ready: [], skips: [] };
    const pickMode = Object.keys(st.offers).length > 0;
    const offers = pickMode ? drawStoryOffers(st.members, st.deck as StoryDeck) : {};
    const roles = pickMode ? Object.fromEntries(Object.entries(offers).map(([m, o]) => [m, o[0]!])) : drawStoryRoles(st.members, st.deck as StoryDeck);
    return { phase: 'write', round: next, ready: [], skips: [], rolesLog: [...st.rolesLog, st.roles], roles, offers };
  };

  r.get('/stories', async (c) => {
    const user = c.get('user');
    const rows = await s.db
      .select()
      .from(stories)
      .where(sql`${stories.members} @> ${JSON.stringify([user.id])}::jsonb`)
      .orderBy(desc(stories.updatedAt))
      .limit(100);
    const b = await load(rows.map((x) => x.id));
    return c.json(rows.map((st) => wire(st, pick(b, st.id), user.id)));
  });

  r.post('/stories', async (c) => {
    const user = c.get('user');
    const input = await body(c, storyBody);
    if (input.premise === STORY_FREE ? !input.meta : !storyPremise(input.premise)) throw bad('premise', 'Premis tidak dikenal.');
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
    const offers = input.pick ? drawStoryOffers(members, input.deck) : {};
    const roles = input.pick ? Object.fromEntries(Object.entries(offers).map(([m, o]) => [m, o[0]!])) : drawStoryRoles(members, input.deck);
    const [st] = await s.db
      .insert(stories)
      .values({ id: input.id, circleId: input.circleId, ownerId: user.id, premise: input.premise, members, roles, offers, rounds: input.rounds, deck: input.deck, mode: input.mode, meta: input.meta ?? null, palette: input.palette ? [input.palette] : [] })
      .returning();
    void kabar(st!, user.id, `${user.penName ?? 'Seseorang'} membuka cerita baru dan membagikan kartu untukmu.`);
    return c.json(wire(st!, await load([]), user.id), 201);
  });

  r.get('/stories/:id', async (c) => c.json(await send(await mine(c.req.param('id'), c.get('user').id), c.get('user').id)));

  /** Pilih satu dari dua kartu yang ditawarkan, selama bagianmu di gelombang ini belum disegel. */
  r.post('/stories/:id/role', async (c) => {
    const user = c.get('user');
    const { roleId } = await body(c, z.object({ roleId: z.string().max(4) }));
    const st = await mine(c.req.param('id'), user.id);
    if (!(st.offers[user.id] ?? []).includes(roleId)) throw bad('role', 'Kartu itu tidak ditawarkan kepadamu.');
    if (st.phase !== 'write' || (await sealedAuthors(s.db, st)).includes(user.id)) throw conflict('sealed', 'Kartu dipilih sebelum bagianmu disegel.');
    const [next] = await s.db.update(stories).set({ roles: { ...st.roles, [user.id]: roleId }, updatedAt: new Date() }).where(eq(stories.id, st.id)).returning();
    return c.json(await send(next!, user.id));
  });

  /** Tambah satu amplop palet tanpa nama pengirim. */
  r.post('/stories/:id/palette', async (c) => {
    const user = c.get('user');
    const { envelope } = await body(c, z.object({ envelope: envelopeSchema }));
    const st = await mine(c.req.param('id'), user.id);
    if (st.palette.length >= 20) throw bad('full', 'Palet sudah penuh.');
    const [next] = await s.db.update(stories).set({ palette: [...st.palette, envelope], updatedAt: new Date() }).where(eq(stories.id, st.id)).returning();
    return c.json(await send(next!, user.id));
  });

  /** Lensa memilih fokus gelombang ini: satu benda, pertanyaan, atau tokoh. */
  r.put('/stories/:id/focus', async (c) => {
    const user = c.get('user');
    const input = await body(c, storyFocusBody);
    const st = await mine(c.req.param('id'), user.id);
    if (storyLens(st.members, input.round) !== user.id) throw forbidden('Fokus dipilih oleh Lensa gelombang ini.');
    if (st.phase !== 'write' || input.round !== st.round) throw conflict('closed', 'Fokus hanya bisa diubah selama gelombang ditulis.');
    const [next] = await s.db.update(stories).set({ focus: { ...st.focus, [String(input.round)]: input.envelope }, updatedAt: new Date() }).where(eq(stories.id, st.id)).returning();
    void kabar(next!, user.id, 'Lensa sudah memilih fokus gelombang ini.');
    return c.json(await send(next!, user.id));
  });

  /** Simpan atau segel bagianku di gelombang yang sedang ditulis. Segel terakhir membuka ruang baca. */
  r.put('/stories/:id/parts', async (c) => {
    const user = c.get('user');
    const input = await body(c, storyPartBody);
    const out = await s.db.transaction(async (tx) => {
      const [st] = await tx.select().from(stories).where(eq(stories.id, c.req.param('id'))).for('update');
      if (!st || !st.members.includes(user.id)) throw notFound('Cerita tidak ditemukan.');
      if (st.phase !== 'write' || input.round !== st.round) throw conflict('closed', 'Gelombang itu sudah dibuka. Perubahan tidak lagi bisa disimpan di sini.');
      const now = new Date();
      const set = { envelope: input.envelope, handoff: input.handoff ?? null, intent: input.intent ?? null, perk: input.perk, sealedAt: input.seal ? now : null, updatedAt: now };
      await tx
        .insert(storyParts)
        .values({ id: `${st.id}.${st.round}.${user.id}`, storyId: st.id, round: st.round, authorId: user.id, ...set })
        .onConflictDoUpdate({ target: [storyParts.storyId, storyParts.round, storyParts.authorId, storyParts.world], set });
      const sealed = await sealedAuthors(tx, st);
      const all = st.members.every((m) => sealed.includes(m));
      const [next] = await tx
        .update(stories)
        .set(all ? { phase: 'read', ready: [], skips: [], updatedAt: now } : { skips: input.seal ? st.skips : st.skips.filter((x) => x !== user.id), updatedAt: now })
        .where(eq(stories.id, st.id))
        .returning();
      return { next: next!, all, n: sealed.length };
    });
    if (out.all) void kabar(out.next, '', 'Semua bagian sudah disegel. Lipatannya siap dibuka.');
    else if (input.seal) void kabar(out.next, user.id, `Satu bagian siap: ${out.n} dari ${out.next.members.length}.`);
    return c.json(await send(out.next, user.id));
  });

  /** Lewati penulis yang belum menyegel: semua yang sudah menyegel (minimal dua) harus setuju. */
  r.post('/stories/:id/skip', async (c) => {
    const user = c.get('user');
    const out = await s.db.transaction(async (tx) => {
      const [st] = await tx.select().from(stories).where(eq(stories.id, c.req.param('id'))).for('update');
      if (!st || !st.members.includes(user.id)) throw notFound('Cerita tidak ditemukan.');
      if (st.phase !== 'write') throw conflict('phase', 'Tidak ada yang perlu dilewati.');
      const sealed = await sealedAuthors(tx, st);
      if (!sealed.includes(user.id)) throw bad('unsealed', 'Segel bagianmu dulu sebelum mengusulkan lanjut.');
      const skips = [...new Set([...st.skips, user.id])].filter((x) => sealed.includes(x));
      const go = sealed.length >= 2 && sealed.every((x) => skips.includes(x));
      const [next] = await tx.update(stories).set(go ? { phase: 'read', ready: [], skips: [], updatedAt: new Date() } : { skips, updatedAt: new Date() }).where(eq(stories.id, st.id)).returning();
      return { next: next!, go };
    });
    if (out.go) void kabar(out.next, '', 'Gelombang dilanjutkan tanpa bagian yang belum disegel. Lipatannya siap dibuka.');
    return c.json(await send(out.next, user.id));
  });

  /** Siap lanjut dari ruang baca. Yang wajib: penulis yang menyegel di gelombang ini. */
  r.post('/stories/:id/ready', async (c) => {
    const user = c.get('user');
    const out = await s.db.transaction(async (tx) => {
      const [st] = await tx.select().from(stories).where(eq(stories.id, c.req.param('id'))).for('update');
      if (!st || !st.members.includes(user.id)) throw notFound('Cerita tidak ditemukan.');
      if (st.phase !== 'read') throw conflict('phase', 'Belum waktunya lanjut.');
      const ready = [...new Set([...st.ready, user.id])];
      const wrote = await sealedAuthors(tx, st);
      const all = wrote.every((m) => ready.includes(m));
      const [next] = await tx.update(stories).set({ ...(all ? advance(st) : { ready }), updatedAt: new Date() }).where(eq(stories.id, st.id)).returning();
      return { next: next!, all };
    });
    if (out.all) void kabar(out.next, '', out.next.phase === 'done' ? 'Cerita kalian selesai. Buka pengungkapannya.' : `Gelombang ${out.next.round} dibuka. Kartumu sudah menunggu.`);
    return c.json(await send(out.next, user.id));
  });

  /** Handshake: usulkan satu kalimat fakta (atau revisi atas fakta lain). */
  r.post('/stories/:id/facts', async (c) => {
    const user = c.get('user');
    const input = await body(c, storyFactBody);
    const st = await mine(c.req.param('id'), user.id);
    if (st.phase === 'write' && input.round >= st.round) throw conflict('closed', 'Fakta diusulkan setelah gelombangnya dibuka.');
    if (input.supersedes) {
      const [old] = await s.db.select().from(storyFacts).where(and(eq(storyFacts.id, input.supersedes), eq(storyFacts.storyId, st.id)));
      if (!old) throw notFound('Fakta yang direvisi tidak ditemukan.');
    }
    const solo = st.members.length === 1;
    await s.db
      .insert(storyFacts)
      .values({ id: input.id, storyId: st.id, round: input.round, authorId: user.id, envelope: input.envelope, supersedes: input.supersedes, agrees: [user.id], state: solo ? 'sah' : 'usul' })
      .onConflictDoNothing();
    if (solo && input.supersedes) await s.db.update(storyFacts).set({ state: 'diganti' }).where(eq(storyFacts.id, input.supersedes));
    void kabar(st, user.id, input.supersedes ? 'Ada revisi fakta yang menunggu persetujuanmu.' : 'Ada fakta baru yang menunggu persetujuanmu.');
    return c.json(await send(st, user.id), 201);
  });

  /** Setuju, tunda, atau (pengusul) batalkan. Sah ketika semua penulis lain setuju pada versi ini. */
  r.put('/stories/:id/facts/:fid', async (c) => {
    const user = c.get('user');
    const { vote } = await body(c, storyVoteBody);
    const st = await mine(c.req.param('id'), user.id);
    const [f] = await s.db.select().from(storyFacts).where(and(eq(storyFacts.id, c.req.param('fid')), eq(storyFacts.storyId, st.id)));
    if (!f) throw notFound('Fakta tidak ditemukan.');
    if (f.state === 'sah' || f.state === 'diganti') throw conflict('settled', 'Fakta ini sudah diputuskan. Usulkan revisi untuk mengubahnya.');
    if (vote === 'batal') {
      if (f.authorId !== user.id) throw forbidden('Hanya pengusul yang bisa menarik usulannya.');
      await s.db.delete(storyFacts).where(eq(storyFacts.id, f.id));
      return c.json(await send(st, user.id));
    }
    const agrees = vote === 'setuju' ? [...new Set([...f.agrees, user.id])] : f.agrees.filter((x) => x !== user.id);
    const defers = vote === 'tunda' ? [...new Set([...f.defers, user.id])] : f.defers.filter((x) => x !== user.id);
    const sah = st.members.every((m) => agrees.includes(m));
    await s.db.update(storyFacts).set({ agrees, defers, state: sah ? 'sah' : defers.length ? 'tunda' : 'usul' }).where(eq(storyFacts.id, f.id));
    if (sah && f.supersedes) await s.db.update(storyFacts).set({ state: 'diganti' }).where(eq(storyFacts.id, f.supersedes));
    if (sah) void kabar(st, user.id, 'Satu fakta disepakati semua penulis.');
    return c.json(await send(st, user.id));
  });

  /** Tafsir pembaca atau tebakan role, untuk bagian orang lain yang sudah dibuka. */
  r.post('/stories/:id/parts/:partId/reads', async (c) => {
    const user = c.get('user');
    const input = await body(c, storyReadBody);
    const st = await mine(c.req.param('id'), user.id);
    const p = await partIn(st, c.req.param('partId'));
    if (p.authorId === user.id) throw bad('own', 'Tafsir ditulis oleh pembaca lain.');
    if (!isOpen(st, p.round)) throw conflict('closed', 'Bagian itu belum dibuka.');
    await s.db
      .insert(storyReads)
      .values({ id: input.id, storyId: st.id, partId: p.id, readerId: user.id, kind: input.kind, envelope: input.envelope })
      .onConflictDoUpdate({ target: [storyReads.partId, storyReads.readerId, storyReads.kind], set: { envelope: input.envelope } });
    if (input.kind === 'tafsir') void kabar(st, user.id, 'Seseorang menulis apa yang ia tangkap dari bagianmu.', [p.authorId]);
    return c.json(await send(st, user.id), 201);
  });

  /** Tirai: minta, tanpa nama, agar sebuah adegan dibuat terjadi di luar layar. */
  r.post('/stories/:id/parts/:partId/veil', async (c) => {
    const user = c.get('user');
    const st = await mine(c.req.param('id'), user.id);
    const p = await partIn(st, c.req.param('partId'));
    if (p.authorId === user.id || !isOpen(st, p.round)) throw bad('veil', 'Tirai hanya untuk bagian orang lain yang sudah dibuka.');
    const veils = p.veils.includes(user.id) ? p.veils.filter((x) => x !== user.id) : [...p.veils, user.id];
    await s.db.update(storyParts).set({ veils }).where(eq(storyParts.id, p.id));
    if (veils.length > p.veils.length) void kabar(st, user.id, 'Seseorang meminta satu adegan di bagianmu dibuat terjadi di luar layar.', [p.authorId]);
    return c.json(await send(st, user.id));
  });

  /** Sanggahan: tandai satu bagian dengan alasan fakta, pengetahuan tokoh, atau sebab-akibat. */
  r.post('/stories/:id/parts/:partId/notes', async (c) => {
    const user = c.get('user');
    const st = await mine(c.req.param('id'), user.id);
    const input = await body(c, storyNoteBody);
    const p = await partIn(st, c.req.param('partId'));
    if (!isOpen(st, p.round)) throw conflict('closed', 'Bagian itu belum dibuka.');
    await s.db.insert(storyNotes).values({ id: input.id, storyId: st.id, partId: p.id, authorId: user.id, reason: input.reason, envelope: input.envelope }).onConflictDoNothing();
    if (p.authorId !== user.id) void kabar(st, user.id, 'Ada sanggahan untuk bagianmu. Kamu yang memutuskan jalan keluarnya.', [p.authorId]);
    return c.json(await send(st, user.id), 201);
  });

  /** Penulis bagian memilih jalan keluar sanggahan. */
  r.put('/stories/:id/notes/:nid', async (c) => {
    const user = c.get('user');
    const { resolution } = await body(c, storyResolveBody);
    const st = await mine(c.req.param('id'), user.id);
    const [n] = await s.db.select().from(storyNotes).where(and(eq(storyNotes.id, c.req.param('nid')), eq(storyNotes.storyId, st.id)));
    if (!n) throw notFound('Sanggahan tidak ditemukan.');
    const p = await partIn(st, n.partId);
    if (p.authorId !== user.id) throw forbidden('Jalan keluar dipilih penulis bagian itu.');
    await s.db.update(storyNotes).set({ resolution }).where(eq(storyNotes.id, n.id));
    void kabar(st, user.id, 'Sanggahanmu mendapat jalan keluar.', [n.authorId]);
    return c.json(await send(st, user.id));
  });

  /** Jalan lain: setelah cerita selesai, tulis versi lain untuk satu gelombang. */
  r.put('/stories/:id/branch', async (c) => {
    const user = c.get('user');
    const st = await mine(c.req.param('id'), user.id);
    const input = await body(c, storyBranchBody);
    if (st.phase !== 'done') throw conflict('phase', 'Jalan lain ditulis setelah cerita selesai.');
    if (input.round > st.rounds) throw bad('round', 'Gelombang itu tidak ada.');
    const now = new Date();
    await s.db
      .insert(storyParts)
      .values({ id: `${st.id}.${input.round}.${user.id}.b`, storyId: st.id, round: input.round, authorId: user.id, envelope: input.envelope, sealedAt: now, world: 'b', updatedAt: now })
      .onConflictDoUpdate({ target: [storyParts.storyId, storyParts.round, storyParts.authorId, storyParts.world], set: { envelope: input.envelope, updatedAt: now } });
    void kabar(st, user.id, `${user.penName ?? 'Seseorang'} menulis jalan lain untuk cerita kalian.`);
    return c.json(await send(st, user.id));
  });

  /** Edisi: urutan baca, ending, dan templat. Setiap perubahan meminta persetujuan ulang. */
  r.put('/stories/:id/edition', async (c) => {
    const user = c.get('user');
    const input = await body(c, storyEditionBody);
    const st = await mine(c.req.param('id'), user.id);
    if (st.phase !== 'done') throw conflict('phase', 'Edisi disusun setelah cerita selesai.');
    const [next] = await s.db.update(stories).set({ edition: input, editionOk: [user.id], updatedAt: new Date() }).where(eq(stories.id, st.id)).returning();
    void kabar(next!, user.id, 'Ada susunan edisi baru yang menunggu persetujuanmu.');
    return c.json(await send(next!, user.id));
  });

  r.post('/stories/:id/edition/approve', async (c) => {
    const user = c.get('user');
    const st = await mine(c.req.param('id'), user.id);
    if (!st.edition) throw conflict('none', 'Belum ada edisi yang diusulkan.');
    const editionOk = [...new Set([...st.editionOk, user.id])];
    const [next] = await s.db.update(stories).set({ editionOk, updatedAt: new Date() }).where(eq(stories.id, st.id)).returning();
    if (st.members.every((m) => editionOk.includes(m))) void kabar(next!, '', 'Edisi kalian sudah disahkan semua penulis.');
    return c.json(await send(next!, user.id));
  });

  r.delete('/stories/:id', async (c) => {
    const st = await mine(c.req.param('id'), c.get('user').id);
    if (st.ownerId !== c.get('user').id) throw forbidden('Hanya pembuka cerita yang bisa menghapusnya.');
    await s.db.delete(stories).where(eq(stories.id, st.id));
    return c.json({ ok: true });
  });

  return r;
}
