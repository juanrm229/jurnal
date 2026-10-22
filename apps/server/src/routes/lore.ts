/**
 * Kitab lingkaran (bab, adegan, jilid) dan papan permainan kooperatif
 * (ekspedisi, token, langit, kamus, motif, dadu kenangan).
 */
import {
  addDays,
  type ChapterWire,
  claimTokenBody,
  constellationBody,
  type ConstellationWire,
  dictionaryBody,
  type DictionaryWire,
  type DiceRoll,
  EXPEDITIONS,
  type ExpeditionWire,
  GENRES,
  genreVoteBody,
  isFullMoonNight,
  isIdulFitri,
  isoWeek,
  ceremonyOpen,
  monthKey,
  monthsSince,
  monthRange,
  motifBody,
  type MotifWire,
  penHolderFor,
  proposalBody,
  sceneBody,
  type SceneWire,
  startExpeditionBody,
  type TokenWire,
  toHijri,
  tzOffsetMinutes,
  type VolumeWire,
  voteBody,
  weekRange,
} from '@sehari/core';
import { and, asc, eq, gte, isNotNull, lte, sql } from 'drizzle-orm';
import { Hono } from 'hono';
import { type AppEnv, body, type Services } from '../context';
import { schema } from '../db';
import { circleSummaries, type CircleRow, requireMember, userToday } from '../lib/domain';
import { bad, conflict, forbidden, notFound, paymentRequired } from '../lib/errors';
import { newId, randomUnit } from '../lib/ids';

const {
  chapters, chapterProposals, chapterVotes, scenes, volumes, genreVotes, expeditions, tokens, constellations,
  dictionary, motifs, diceRolls, circleMembers, capsules, dropCircles, drops, letters,
} = schema;

async function activeMembers(s: Services, circleId: string) {
  return s.db
    .select()
    .from(circleMembers)
    .where(and(eq(circleMembers.circleId, circleId), eq(circleMembers.state, 'active')))
    .orderBy(asc(circleMembers.joinedAt));
}


async function closeChapterIfReady(s: Services, circleId: string, month: string, force = false) {
  const [ch] = await s.db.select().from(chapters).where(and(eq(chapters.circleId, circleId), eq(chapters.month, month)));
  if (ch?.closedAt) return;
  const props = await s.db.select().from(chapterProposals).where(and(eq(chapterProposals.circleId, circleId), eq(chapterProposals.month, month)));
  if (!props.length) return;
  const votes = await s.db.select().from(chapterVotes).where(and(eq(chapterVotes.circleId, circleId), eq(chapterVotes.month, month)));
  const members = await activeMembers(s, circleId);
  if (!force && votes.length < members.length) return;
  const tally = props
    .map((p) => ({ p, n: votes.filter((v) => v.proposalId === p.id).length }))
    .sort((a, b) => b.n - a.n || (a.p.createdAt < b.p.createdAt ? -1 : 1));
  const winner = tally[0]!.p;
  await s.db
    .insert(chapters)
    .values({ circleId, month, titleEnc: winner.titleEnc, winningProposalId: winner.id, closedAt: s.now() })
    .onConflictDoUpdate({ target: [chapters.circleId, chapters.month], set: { titleEnc: winner.titleEnc, winningProposalId: winner.id, closedAt: s.now() } });
}

export function loreRoutes(s: Services) {
  const r = new Hono<AppEnv>();

  // ── Bab ───────────────────────────────────────────────────────────────────

  r.get('/:id/chapters', async (c) => {
    const user = c.get('user');
    const { circle } = await requireMember(s, c.req.param('id'), user.id);
    const [chs, props, votes] = await Promise.all([
      s.db.select().from(chapters).where(eq(chapters.circleId, circle.id)),
      s.db.select().from(chapterProposals).where(eq(chapterProposals.circleId, circle.id)),
      s.db.select().from(chapterVotes).where(eq(chapterVotes.circleId, circle.id)),
    ]);
    const months = new Set([...monthsSince(circle.createdDay, userToday(user, s.now())), ...chs.map((x) => x.month), ...props.map((x) => x.month)]);
    const out: ChapterWire[] = [...months].sort().map((month) => {
      const ch = chs.find((x) => x.month === month);
      return {
        month,
        titleEnc: ch?.titleEnc ?? null,
        closedAt: ch?.closedAt?.toISOString() ?? null,
        proposals: props
          .filter((p) => p.month === month)
          .map((p) => ({ id: p.id, userId: p.userId, titleEnc: p.titleEnc, votes: votes.filter((v) => v.month === month && v.proposalId === p.id).map((v) => v.userId) })),
      };
    });
    return c.json(out);
  });

  r.post('/:id/chapters/:month/proposals', async (c) => {
    const input = await body(c, proposalBody);
    const user = c.get('user');
    const { circle } = await requireMember(s, c.req.param('id'), user.id);
    const month = c.req.param('month');
    if (!ceremonyOpen(month, userToday(user, s.now()))) throw conflict('ceremony_closed', 'Upacara Tutup Bab dibuka di akhir bulan.');
    const [ch] = await s.db.select().from(chapters).where(and(eq(chapters.circleId, circle.id), eq(chapters.month, month)));
    if (ch?.closedAt) throw conflict('chapter_closed', 'Bab ini sudah diberi judul.');
    const mine = await s.db
      .select()
      .from(chapterProposals)
      .where(and(eq(chapterProposals.circleId, circle.id), eq(chapterProposals.month, month), eq(chapterProposals.userId, user.id)));
    if (mine.length >= 3) throw conflict('too_many', 'Maksimal tiga usulan per orang.');
    const id = newId();
    await s.db.insert(chapterProposals).values({ id, circleId: circle.id, month, userId: user.id, titleEnc: input.titleEnc });
    return c.json({ id }, 201);
  });

  r.post('/:id/chapters/:month/votes', async (c) => {
    const input = await body(c, voteBody);
    const user = c.get('user');
    const { circle } = await requireMember(s, c.req.param('id'), user.id);
    const month = c.req.param('month');
    const [p] = await s.db.select().from(chapterProposals).where(and(eq(chapterProposals.id, input.proposalId), eq(chapterProposals.circleId, circle.id)));
    if (!p || p.month !== month) throw notFound('Usulan tidak ditemukan.');
    await s.db
      .insert(chapterVotes)
      .values({ circleId: circle.id, month, userId: user.id, proposalId: p.id })
      .onConflictDoUpdate({ target: [chapterVotes.circleId, chapterVotes.month, chapterVotes.userId], set: { proposalId: p.id } });
    await closeChapterIfReady(s, circle.id, month);
    return c.json({ ok: true });
  });

  r.post('/:id/chapters/:month/close', async (c) => {
    const user = c.get('user');
    const { circle } = await requireMember(s, c.req.param('id'), user.id);
    await closeChapterIfReady(s, circle.id, c.req.param('month'), true);
    return c.json({ ok: true });
  });

  // ── Adegan (Pemegang Pena) ────────────────────────────────────────────────

  r.get('/:id/scenes', async (c) => {
    const user = c.get('user');
    const { circle } = await requireMember(s, c.req.param('id'), user.id);
    const members = await activeMembers(s, circle.id);
    const rows = await s.db.select().from(scenes).where(eq(scenes.circleId, circle.id));
    const week = isoWeek(userToday(user, s.now()));
    const holder = penHolderFor(members.map((m) => m.userId), week, circle.id)!;
    const out: SceneWire[] = rows.map((x) => ({ week: x.week, penHolderId: x.penHolderId, titleEnc: x.titleEnc, cardId: x.cardId }));
    if (!out.some((x) => x.week === week)) out.push({ week, penHolderId: holder, titleEnc: null, cardId: null });
    return c.json(out.sort((a, b) => (a.week < b.week ? -1 : 1)));
  });

  r.put('/:id/scenes/:week', async (c) => {
    const input = await body(c, sceneBody);
    const user = c.get('user');
    const { circle } = await requireMember(s, c.req.param('id'), user.id);
    const week = c.req.param('week');
    const members = await activeMembers(s, circle.id);
    const [existing] = await s.db.select().from(scenes).where(and(eq(scenes.circleId, circle.id), eq(scenes.week, week)));
    const holder = existing?.penHolderId ?? penHolderFor(members.map((m) => m.userId), week, circle.id);
    if (holder !== user.id) throw forbidden('Minggu ini pena dipegang anggota lain.');
    weekRange(week); // validasi format
    await s.db
      .insert(scenes)
      .values({ circleId: circle.id, week, penHolderId: holder, titleEnc: input.titleEnc ?? null, cardId: input.cardId ?? null })
      .onConflictDoUpdate({
        target: [scenes.circleId, scenes.week],
        set: { titleEnc: input.titleEnc ?? existing?.titleEnc ?? null, cardId: input.cardId ?? existing?.cardId ?? null },
      });
    return c.json({ ok: true });
  });

  // ── Jilid & Genre ─────────────────────────────────────────────────────────

  r.get('/:id/volumes', async (c) => {
    const user = c.get('user');
    const { circle } = await requireMember(s, c.req.param('id'), user.id);
    const [vols, votes] = await Promise.all([
      s.db.select().from(volumes).where(eq(volumes.circleId, circle.id)),
      s.db.select().from(genreVotes).where(eq(genreVotes.circleId, circle.id)),
    ]);
    const first = Number(circle.createdDay.slice(0, 4));
    const last = Number(userToday(user, s.now()).slice(0, 4));
    const out: VolumeWire[] = [];
    for (let y = first; y <= last; y++) {
      const v = vols.find((x) => x.year === y);
      out.push({
        year: y,
        genreId: v?.genreId ?? null,
        coverDoodle: v?.coverDoodle ?? null,
        genreVotes: votes.filter((x) => x.year === y).map((x) => ({ userId: x.userId, genreId: x.genreId })),
      });
    }
    return c.json(out);
  });

  /** Genre dipilih bersama; yang terbanyak menjadi genre jilid. */
  r.put('/:id/volumes/:year/genre', async (c) => {
    const input = await body(c, genreVoteBody);
    const user = c.get('user');
    const { circle } = await requireMember(s, c.req.param('id'), user.id);
    const year = Number(c.req.param('year'));
    if (!GENRES.some((g) => g.id === input.genreId)) throw bad('genre', 'Genre tidak dikenal.');
    await s.db
      .insert(genreVotes)
      .values({ circleId: circle.id, year, userId: user.id, genreId: input.genreId })
      .onConflictDoUpdate({ target: [genreVotes.circleId, genreVotes.year, genreVotes.userId], set: { genreId: input.genreId } });
    const votes = await s.db.select().from(genreVotes).where(and(eq(genreVotes.circleId, circle.id), eq(genreVotes.year, year)));
    const tally = new Map<string, number>();
    for (const v of votes) tally.set(v.genreId, (tally.get(v.genreId) ?? 0) + 1);
    const top = [...tally.entries()].sort((a, b) => b[1] - a[1])[0]![0];
    const genre = GENRES.find((g) => g.id === top)!;
    await s.db
      .insert(volumes)
      .values({ circleId: circle.id, year, genreId: top, coverDoodle: genre.cover.doodle })
      .onConflictDoUpdate({ target: [volumes.circleId, volumes.year], set: { genreId: top, coverDoodle: genre.cover.doodle } });
    return c.json({ genreId: top });
  });

  // ── Ekspedisi ─────────────────────────────────────────────────────────────

  async function expeditionWire(circle: CircleRow, e: typeof expeditions.$inferSelect): Promise<ExpeditionWire> {
    const rows = await s.db
      .select({ authorId: drops.authorId, meta: drops.meta })
      .from(dropCircles)
      .innerJoin(drops, eq(drops.id, dropCircles.dropId))
      .where(and(eq(dropCircles.circleId, circle.id), gte(dropCircles.day, e.startDay), lte(dropCircles.day, e.endDay)));
    const progress: Record<number, string[]> = {};
    for (const x of rows) {
      if (x.meta?.expeditionId !== e.id || !x.meta.expeditionDay) continue;
      const list = (progress[x.meta.expeditionDay] ??= []);
      if (!list.includes(x.authorId)) list.push(x.authorId);
    }
    return {
      id: e.id,
      code: e.code,
      startDay: e.startDay,
      endDay: e.endDay,
      startedBy: e.startedBy,
      completedAt: e.completedAt?.toISOString() ?? null,
      progress,
    };
  }

  r.get('/:id/expeditions', async (c) => {
    const user = c.get('user');
    const { circle } = await requireMember(s, c.req.param('id'), user.id);
    const rows = await s.db.select().from(expeditions).where(eq(expeditions.circleId, circle.id));
    const members = await activeMembers(s, circle.id);
    const out: ExpeditionWire[] = [];
    for (const e of rows) {
      const w = await expeditionWire(circle, e);
      // Selesai bersama: tiap hari diisi minimal separuh anggota.
      if (!e.completedAt) {
        const need = Math.max(1, Math.ceil(members.length / 2));
        const done = [1, 2, 3, 4, 5, 6, 7].every((d) => (w.progress[d]?.length ?? 0) >= need);
        if (done) {
          const now = s.now();
          await s.db.update(expeditions).set({ completedAt: now }).where(eq(expeditions.id, e.id));
          w.completedAt = now.toISOString();
          const participants = new Set(Object.values(w.progress).flat());
          for (const uid of participants) {
            await s.db.insert(tokens).values({ id: newId(), circleId: circle.id, userId: uid, code: 'kompas', day: e.endDay }).onConflictDoNothing();
          }
        }
      }
      out.push(w);
    }
    return c.json(out.sort((a, b) => (a.startDay < b.startDay ? 1 : -1)));
  });

  r.post('/:id/expeditions', async (c) => {
    const input = await body(c, startExpeditionBody);
    const user = c.get('user');
    const { circle } = await requireMember(s, c.req.param('id'), user.id);
    if (!EXPEDITIONS.some((e) => e.id === input.code)) throw bad('expedition', 'Ekspedisi tidak dikenal.');
    const today = userToday(user, s.now());
    if (input.startDay < today || input.startDay > addDays(today, 14)) throw bad('start', 'Mulai hari ini atau dalam dua minggu ke depan.');
    const endDay = addDays(input.startDay, 6);
    const running = await s.db.select().from(expeditions).where(eq(expeditions.circleId, circle.id));
    if (running.some((e) => !e.completedAt && e.endDay >= input.startDay && e.startDay <= endDay)) {
      throw conflict('expedition_running', 'Masih ada ekspedisi yang berjalan.');
    }
    const id = newId();
    await s.db.insert(expeditions).values({ id, circleId: circle.id, code: input.code, startDay: input.startDay, endDay, startedBy: user.id });
    return c.json({ id }, 201);
  });

  // ── Token Kenangan (Lemari Benda) ─────────────────────────────────────────

  r.get('/:id/tokens', async (c) => {
    const user = c.get('user');
    const { circle } = await requireMember(s, c.req.param('id'), user.id);
    const rows = await s.db.select().from(tokens).where(eq(tokens.circleId, circle.id));
    const out: TokenWire[] = rows.map((t) => ({ id: t.id, code: t.code, userId: t.userId, day: t.day, awardedAt: t.awardedAt.toISOString() }));
    return c.json(out);
  });

  r.post('/:id/tokens', async (c) => {
    const input = await body(c, claimTokenBody);
    const user = c.get('user');
    const { circle } = await requireMember(s, c.req.param('id'), user.id);
    const sealedRows = await s.db
      .select({ day: capsules.day })
      .from(capsules)
      .where(and(eq(capsules.userId, user.id), isNotNull(capsules.sealedAt)));
    const sealed = new Set(sealedRows.map((x) => x.day));
    if (!sealed.has(input.day) && input.code !== 'kompas' && input.code !== 'perangko') throw conflict('not_sealed', 'Token didapat dari hari yang tersegel.');
    // Kunci hanya sekali: hari pertama yang tersegel bersama.
    if (input.code === 'kunci') {
      const [had] = await s.db.select().from(tokens).where(and(eq(tokens.circleId, circle.id), eq(tokens.userId, user.id), eq(tokens.code, 'kunci')));
      if (had) return c.json({ awarded: false });
    }
    const ok = await validateToken(s, circle, user.id, input.code, input.day, sealed);
    if (!ok) throw forbidden('Belum memenuhi syarat token ini.');
    const id = newId();
    const inserted = await s.db
      .insert(tokens)
      .values({ id, circleId: circle.id, userId: user.id, code: input.code, day: input.day, dropId: input.dropId })
      .onConflictDoNothing()
      .returning();
    return c.json({ awarded: inserted.length > 0 }, inserted.length ? 201 : 200);
  });

  // ── Langit Lingkaran ──────────────────────────────────────────────────────

  r.get('/:id/constellations', async (c) => {
    const user = c.get('user');
    const { circle } = await requireMember(s, c.req.param('id'), user.id);
    const rows = await s.db.select().from(constellations).where(eq(constellations.circleId, circle.id));
    const out: ConstellationWire[] = rows.map((x) => ({ id: x.id, nameEnc: x.nameEnc, days: x.days, createdBy: x.createdBy, createdAt: x.createdAt.toISOString() }));
    return c.json(out);
  });

  r.post('/:id/constellations', async (c) => {
    const input = await body(c, constellationBody);
    const user = c.get('user');
    const { circle } = await requireMember(s, c.req.param('id'), user.id);
    const id = newId();
    await s.db.insert(constellations).values({ id, circleId: circle.id, nameEnc: input.nameEnc, days: [...new Set(input.days)].sort(), createdBy: user.id });
    return c.json({ id }, 201);
  });

  r.delete('/:id/constellations/:cid', async (c) => {
    const user = c.get('user');
    const { circle } = await requireMember(s, c.req.param('id'), user.id);
    await s.db.delete(constellations).where(and(eq(constellations.id, c.req.param('cid')), eq(constellations.circleId, circle.id)));
    return c.json({ ok: true });
  });

  // ── Kamus Lingkaran (Plus) ────────────────────────────────────────────────

  async function requirePlusCircle(circleId: string, userId: string) {
    const { circle } = await requireMember(s, circleId, userId);
    const user = await s.db.select().from(schema.users).where(eq(schema.users.id, userId));
    const [summary] = await circleSummaries(s, user[0]!, [circle.id]);
    if (!summary?.plusUnlocked) throw paymentRequired('plus_circle', 'Kamus Lingkaran terbuka bila salah satu anggota memakai Plus.');
    return circle;
  }

  r.get('/:id/dictionary', async (c) => {
    const user = c.get('user');
    const { circle } = await requireMember(s, c.req.param('id'), user.id);
    const rows = await s.db.select().from(dictionary).where(eq(dictionary.circleId, circle.id));
    const out: DictionaryWire[] = rows.map((x) => ({ id: x.id, termEnc: x.termEnc, meaningEnc: x.meaningEnc, addedBy: x.addedBy, createdAt: x.createdAt.toISOString() }));
    return c.json(out);
  });

  r.post('/:id/dictionary', async (c) => {
    const input = await body(c, dictionaryBody);
    const user = c.get('user');
    const circle = await requirePlusCircle(c.req.param('id'), user.id);
    const id = newId();
    await s.db.insert(dictionary).values({ id, circleId: circle.id, termEnc: input.termEnc, meaningEnc: input.meaningEnc, addedBy: user.id });
    return c.json({ id }, 201);
  });

  r.delete('/:id/dictionary/:did', async (c) => {
    const user = c.get('user');
    const { circle } = await requireMember(s, c.req.param('id'), user.id);
    await s.db.delete(dictionary).where(and(eq(dictionary.id, c.req.param('did')), eq(dictionary.circleId, circle.id), eq(dictionary.addedBy, user.id)));
    return c.json({ ok: true });
  });

  // ── Motif ─────────────────────────────────────────────────────────────────

  r.get('/:id/motifs', async (c) => {
    const user = c.get('user');
    const { circle } = await requireMember(s, c.req.param('id'), user.id);
    const rows = await s.db.select().from(motifs).where(eq(motifs.circleId, circle.id));
    const out: MotifWire[] = rows.map((x) => ({ id: x.id, year: x.year, termEnc: x.termEnc, addedBy: x.addedBy }));
    return c.json(out);
  });

  r.post('/:id/motifs', async (c) => {
    const input = await body(c, motifBody);
    const user = c.get('user');
    const { circle } = await requireMember(s, c.req.param('id'), user.id);
    const id = newId();
    await s.db.insert(motifs).values({ id, circleId: circle.id, year: input.year, termEnc: input.termEnc, addedBy: user.id });
    return c.json({ id }, 201);
  });

  r.delete('/:id/motifs/:mid', async (c) => {
    const user = c.get('user');
    const { circle } = await requireMember(s, c.req.param('id'), user.id);
    await s.db.delete(motifs).where(and(eq(motifs.id, c.req.param('mid')), eq(motifs.circleId, circle.id)));
    return c.json({ ok: true });
  });

  // ── Dadu Kenangan ─────────────────────────────────────────────────────────

  r.get('/:id/dice', async (c) => {
    const user = c.get('user');
    const { circle } = await requireMember(s, c.req.param('id'), user.id);
    const week = isoWeek(userToday(user, s.now()));
    const [roll] = await s.db.select().from(diceRolls).where(and(eq(diceRolls.circleId, circle.id), eq(diceRolls.week, week)));
    const out: DiceRoll | null = roll ? { week, day: roll.day, rolledBy: roll.rolledBy, rolledAt: roll.rolledAt.toISOString() } : null;
    return c.json(out);
  });

  /** Sekali seminggu: buka satu hari acak dari masa lalu lingkaran. */
  r.post('/:id/dice', async (c) => {
    const user = c.get('user');
    const { circle } = await requireMember(s, c.req.param('id'), user.id);
    const today = userToday(user, s.now());
    const week = isoWeek(today);
    const [roll] = await s.db.select().from(diceRolls).where(and(eq(diceRolls.circleId, circle.id), eq(diceRolls.week, week)));
    if (roll) return c.json({ week, day: roll.day, rolledBy: roll.rolledBy, rolledAt: roll.rolledAt.toISOString() } satisfies DiceRoll);
    const days = await s.db
      .selectDistinct({ day: dropCircles.day })
      .from(dropCircles)
      .where(and(eq(dropCircles.circleId, circle.id), lte(dropCircles.day, addDays(today, -7))));
    const day = days.length ? days[Math.floor(randomUnit() * days.length)]!.day : null;
    const now = s.now();
    await s.db.insert(diceRolls).values({ circleId: circle.id, week, day, rolledBy: user.id, rolledAt: now }).onConflictDoNothing();
    return c.json({ week, day, rolledBy: user.id, rolledAt: now.toISOString() } satisfies DiceRoll);
  });

  return r;
}

async function validateToken(s: Services, circle: CircleRow, userId: string, code: string, day: string, sealed: Set<string>): Promise<boolean> {
  const mmdd = day.slice(5);
  switch (code) {
    case 'kunci': {
      // Hari pertama yang tersegel bersama: anggota lain juga menyegel hari itu.
      const others = await s.db
        .select()
        .from(capsules)
        .innerJoin(circleMembers, and(eq(circleMembers.userId, capsules.userId), eq(circleMembers.circleId, circle.id)))
        .where(and(eq(capsules.day, day), isNotNull(capsules.sealedAt), sql`${capsules.userId} <> ${userId}`));
      return others.length > 0;
    }
    case 'bendera':
      return mmdd === '08-17';
    case 'kembang_api':
      return mmdd === '12-31' || mmdd === '01-01';
    case 'ketupat':
      return isIdulFitri(day);
    case 'bulan':
      return isFullMoonNight(day, tzOffsetMinutes('Asia/Jakarta'));
    case 'pita':
      return mmdd === circle.createdDay.slice(5) && day > circle.createdDay;
    case 'lentera': {
      let n = 0;
      for (const d of sealed) if (toHijri(d).month === 9 && Math.abs(Number(d.slice(0, 4)) - Number(day.slice(0, 4))) <= 1) n++;
      return n >= 30 || (toHijri(day).month === 10 && n >= 29);
    }
    case 'perangko': {
      const rows = await s.db
        .select()
        .from(letters)
        .where(and(eq(letters.circleId, circle.id), eq(letters.kind, 'lost'), isNotNull(letters.deliveredAt)));
      return rows.some((l) => l.fromUserId === userId || l.toUserId === userId || !l.toUserId);
    }
    case 'kompas': {
      const rows = await s.db.select().from(expeditions).where(and(eq(expeditions.circleId, circle.id), isNotNull(expeditions.completedAt)));
      return rows.length > 0;
    }
    case 'cangkir': {
      // Tujuh pagi berturut-turut dengan Drop sebelum jam sembilan — dihitung di
      // perangkat (jam ada di dalam payload). Server cukup memastikan 7 hari tersegel.
      for (let i = 0; i < 7; i++) if (!sealed.has(addDays(day, -i))) return false;
      return true;
    }
    default:
      // payung, tiket, kerang, lilin, daun_kering: syaratnya ada di isi terenkripsi,
      // jadi perangkat yang memutuskan. Server hanya memastikan hari itu tersegel.
      return true;
  }
}

export async function closeChapterIfReadyForce(s: Services, circleId: string, month: string) {
  await closeChapterIfReady(s, circleId, month, true);
}
