import {
  addDays,
  allowedReactions,
  type CircleDay,
  type CircleKind,
  COPY,
  createDropBody,
  updateDropBody,
  diffDays,
  footnoteBody,
  footnotePrintBody,
  giftFreezeBody,
  isDayKey,
  limitsFor,
  milestoneReachedOn,
  monthKey,
  type MyDay,
  reactionParams,
  sameDayPreviousYears,
  sealableDays,
  sealBody,
  type SealResult,
  useFreezeBody,
} from '@sehari/core';
import { and, eq, gte, inArray, isNotNull, isNull, lte, sql } from 'drizzle-orm';
import { Hono } from 'hono';
import type { z } from 'zod';
import { type AppEnv, body, say, type Services, type UserRow } from '../context';
import { schema } from '../db';
import {
  activeCircleIds,
  blockedWith,
  circleSettings,
  circleSummaries,
  effectivePlan,
  freezeState,
  getCircle,
  hydrateDrops,
  membership,
  pushTo,
  requireMember,
  sealedInCircles,
  userToday,
} from '../lib/domain';
import { ApiError, bad, conflict, forbidden, notFound, paymentRequired } from '../lib/errors';
import { newId } from '../lib/ids';
import { canSeeDrop, dropsInCircle, filterForCircle } from '../lib/visibility';
import { canSeeMeetMedia } from './meets';

const { drops, dropRecipients, dropCircles, capsules, circleSeals, circles, circleMembers, reactions, footnotes, media, freezes, letters, visits, users } = schema;

type DropInput = z.infer<typeof createDropBody>;

const LATE_KINDS = new Set(['blackout', 'prologue', 'epilogue']);

/** Lingkaran yang halamannya hari itu sudah tersegel oleh orang ini (lewat circle_seals). */
async function sealedPages(s: Services, userId: string, day: string): Promise<Set<string>> {
  const rows = await s.db.select({ c: circleSeals.circleId }).from(circleSeals).where(and(eq(circleSeals.userId, userId), eq(circleSeals.day, day)));
  return new Set(rows.map((r) => r.c));
}

/** Apakah halaman tempat Drop ini berada sudah tersegel? */
async function pageLocked(s: Services, userId: string, day: string, pageCircleId: string | null | undefined): Promise<boolean> {
  if (pageCircleId) return (await sealedPages(s, userId, day)).has(pageCircleId);
  const [cap] = await s.db.select().from(capsules).where(and(eq(capsules.userId, userId), eq(capsules.day, day)));
  return !!cap?.sealedAt;
}

/** Validasi & simpan satu Drop. Dipakai oleh POST /drops dan saat menyegel. */
export async function createDrop(s: Services, user: UserRow, input: DropInput, opts: { sealing?: boolean; replace?: boolean } = {}) {
  const now = s.now();
  const today = userToday(user, now);
  const allowedDays = sealableDays(user.tz, now);
  if (!allowedDays.includes(input.day)) throw bad('day_closed', 'Hari itu sudah lewat. Drop hanya untuk hari ini.');

  if (!opts.sealing && !LATE_KINDS.has(input.kind) && (await pageLocked(s, user.id, input.day, input.pageCircleId))) {
    throw conflict('sealed', 'Halaman ini sudah disegel. Sampai jumpa besok.');
  }

  const [exists] = await s.db.select({ id: drops.id }).from(drops).where(eq(drops.id, input.id));
  if (exists && !opts.replace) return input.id; // idempoten: kiriman ulang dari antrean offline

  const plan = effectivePlan(user, now);
  const limits = limitsFor(plan);
  if (input.kind === 'video' && limits.videoSeconds === 0) throw paymentRequired('video_plus', 'Video tersedia di Plus.');
  if (input.kind === 'voice' && (input.mediaSeconds ?? 0) > limits.voiceSeconds + 1) {
    throw paymentRequired('voice_limit', `Voice note maksimal ${limits.voiceSeconds} detik.`);
  }
  if (input.kind === 'video' && (input.mediaSeconds ?? 0) > limits.videoSeconds + 1) {
    throw paymentRequired('video_limit', `Video maksimal ${limits.videoSeconds} detik.`);
  }
  if (input.mediaIds.length > limits.photosPerDrop) throw paymentRequired('photo_limit', `Maksimal ${limits.photosPerDrop} foto per Drop.`);

  // Audiens
  const circleIds = [...new Set(input.circleIds)];
  if (input.pageCircleId) {
    // Halaman terpisah hanya untuk lingkarannya sendiri.
    const m = await membership(s, input.pageCircleId, user.id);
    if (!m || m.state !== 'active') throw forbidden('Kamu bukan anggota lingkaran ini.');
    if (circleIds.some((c) => c !== input.pageCircleId)) throw bad('page_scope', 'Halaman ini hanya untuk satu lingkaran.');
  } else if (circleIds.length && !LATE_KINDS.has(input.kind)) {
    // Halaman utama tidak boleh sampai ke lingkaran yang punya halaman sendiri,
    // atau yang halamannya hari ini sudah tersegel terpisah.
    const own = await s.db.select().from(circleMembers).where(and(eq(circleMembers.userId, user.id), inArray(circleMembers.circleId, circleIds)));
    const sealedSep = opts.sealing ? new Set<string>() : await sealedPages(s, user.id, input.day);
    if (own.some((m) => m.ownPage) || circleIds.some((c) => sealedSep.has(c))) {
      throw conflict('own_page', 'Lingkaran itu punya halaman sendiri hari ini. Muat ulang halaman, ya.');
    }
  }
  const recips = input.envelope.recipients;
  if (!recips.some((r) => r.t === 'user' && r.userId === user.id)) {
    throw bad('self_copy', 'Drop harus selalu bisa dibuka oleh penulisnya sendiri.');
  }
  if (input.audience === 'self' && (circleIds.length || recips.some((r) => r.t === 'circle' || r.userId !== user.id))) {
    throw bad('self_only', 'Drop "hanya aku" tidak boleh punya penerima lain.');
  }
  if ((input.audience === 'circle' || input.audience === 'person') && circleIds.length === 0) {
    throw bad('no_circle', 'Pilih lingkaran tujuan.');
  }
  if (input.audience === 'person') {
    if (circleIds.length !== 1 || !input.personId) throw bad('person', 'Pilih satu orang di satu lingkaran.');
    if (recips.some((r) => r.t === 'circle')) throw bad('person', 'Drop untuk satu orang tidak dibungkus untuk lingkaran.');
    if (!recips.some((r) => r.t === 'user' && r.userId === input.personId)) throw bad('person', 'Penerima belum dibungkus.');
  }
  if (input.audience === 'time_capsule') {
    if (!input.unlockOn || input.unlockOn <= today) throw bad('unlock', 'Kapsul waktu butuh tanggal buka di masa depan.');
    if (diffDays(input.unlockOn, today) > limits.timeCapsuleYears * 366) {
      throw paymentRequired('capsule_years', `Paket ini membuka kapsul waktu hingga ${limits.timeCapsuleYears} tahun.`);
    }
  } else if (input.unlockOn) throw bad('unlock', 'Tanggal buka hanya untuk kapsul waktu.');

  const circleRows = circleIds.length ? await s.db.select().from(circles).where(inArray(circles.id, circleIds)) : [];
  for (const cid of circleIds) {
    const c = circleRows.find((x) => x.id === cid);
    const m = c ? await membership(s, cid, user.id) : undefined;
    if (!c || !m || m.state !== 'active') throw forbidden('Kamu bukan anggota lingkaran tujuan.');
    if (c.status !== 'active') throw conflict('circle_frozen', 'Lingkaran ini sudah dibekukan.');
    if (c.kind === 'moment' && c.momentStartsOn && c.momentEndsOn) {
      if (input.day < c.momentStartsOn || input.day > addDays(c.momentEndsOn, 3)) throw conflict('moment_closed', 'Kapsul Momen ini belum dibuka atau sudah ditutup.');
    }
    if (input.audience === 'circle' || (input.audience === 'time_capsule' && recips.some((r) => r.t === 'circle'))) {
      const wrap = recips.find((r) => r.t === 'circle' && r.circleId === cid);
      if (input.audience === 'circle' && !wrap) throw bad('missing_wrap', 'Kunci belum dibungkus untuk lingkaran ini.');
      if (wrap && wrap.t === 'circle' && wrap.epoch !== c.currentEpoch) {
        throw conflict('epoch_stale', 'Kunci lingkaran sudah diperbarui. Muat ulang, lalu coba lagi.');
      }
    }
    if (input.personId) {
      const pm = await membership(s, cid, input.personId);
      if (!pm || pm.state !== 'active') throw bad('person', 'Orang itu bukan anggota lingkaran ini.');
    }
  }
  for (const r of recips) {
    if (r.t === 'circle' && !circleIds.includes(r.circleId)) throw bad('stray_wrap', 'Penerima lingkaran tidak sesuai.');
  }

  if (input.mediaIds.length) {
    const owned = await s.db.select({ id: media.id }).from(media).where(and(inArray(media.id, input.mediaIds), eq(media.ownerId, user.id)));
    if (owned.length !== new Set(input.mediaIds).size) throw forbidden('Media tidak ditemukan.');
  }

  if (opts.replace) {
    // Edit sebelum segel: perbarui di tempat supaya reaksi & catatan kaki tetap ada.
    await s.db
      .update(drops)
      .set({ audience: input.audience, personId: input.personId ?? null, unlockOn: input.unlockOn ?? null, ciphertext: input.envelope.ciphertext, mediaIds: input.mediaIds })
      .where(eq(drops.id, input.id));
    await s.db.delete(dropRecipients).where(eq(dropRecipients.dropId, input.id));
    await s.db.delete(dropCircles).where(eq(dropCircles.dropId, input.id));
  } else
  await s.db.insert(drops).values({
    id: input.id,
    authorId: user.id,
    day: input.day,
    kind: input.kind,
    audience: input.audience,
    pageCircleId: input.pageCircleId ?? null,
    personId: input.personId,
    unlockOn: input.unlockOn,
    ciphertext: input.envelope.ciphertext,
    meta: input.meta,
    mediaIds: input.mediaIds,
  });
  await s.db.insert(dropRecipients).values(
    recips.map((r, seq) => ({
      dropId: input.id,
      seq,
      circleId: r.t === 'circle' ? r.circleId : null,
      userId: r.t === 'user' ? r.userId : null,
      epoch: r.t === 'circle' ? r.epoch : null,
      wk: r.wk,
    })),
  );
  if (circleIds.length) {
    await s.db.insert(dropCircles).values(circleIds.map((circleId) => ({ dropId: input.id, circleId, day: input.day, authorId: user.id })));
  }
  await s.db.insert(capsules).values({ userId: user.id, day: input.day, tz: user.tz }).onConflictDoNothing();
  return input.id;
}

async function myDay(s: Services, user: UserRow, day: string): Promise<MyDay> {
  const [cap] = await s.db.select().from(capsules).where(and(eq(capsules.userId, user.id), eq(capsules.day, day)));
  const rows = await s.db.select().from(drops).where(and(eq(drops.authorId, user.id), eq(drops.day, day)));
  const [frz] = await s.db.select().from(freezes).where(and(eq(freezes.userId, user.id), eq(freezes.kind, 'used'), eq(freezes.day, day)));
  const circleIds = await activeCircleIds(s, user.id);
  const sealedBy = await sealedInCircles(s, circleIds, [user.id], { from: day, to: day });
  return {
    day,
    sealedAt: cap?.sealedAt?.toISOString() ?? null,
    sealable: !cap?.sealedAt && sealableDays(user.tz, s.now()).includes(day),
    sealedCircles: circleIds.filter((c) => sealedBy.get(c)!.get(user.id)!.has(day)),
    drops: await hydrateDrops(s, rows.sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1)), user.id),
    frozen: !!frz,
  };
}

export function dayRoutes(s: Services) {
  const r = new Hono<AppEnv>();

  r.post('/drops', async (c) => {
    const input = await body(c, createDropBody);
    const id = await createDrop(s, c.get('user'), input);
    return c.json({ id }, 201);
  });

  r.put('/drops/:id', async (c) => {
    const patch = await body(c, updateDropBody);
    const user = c.get('user');
    const [d] = await s.db.select().from(drops).where(and(eq(drops.id, c.req.param('id')), eq(drops.authorId, user.id)));
    if (!d) throw notFound();
    if (await pageLocked(s, user.id, d.day, d.pageCircleId)) throw conflict('sealed', 'Halaman yang sudah tersegel tidak bisa diubah.');
    const circlesOf = await s.db.select().from(dropCircles).where(eq(dropCircles.dropId, d.id));
    await createDrop(
      s,
      user,
      createDropBody.parse({
        id: d.id,
        day: d.day,
        kind: d.kind,
        audience: patch.audience ?? d.audience,
        circleIds: patch.circleIds ?? circlesOf.map((x) => x.circleId),
        pageCircleId: d.pageCircleId ?? undefined,
        personId: patch.audience ? patch.personId : (d.personId ?? undefined),
        unlockOn: patch.audience ? patch.unlockOn : (d.unlockOn ?? undefined),
        envelope: patch.envelope,
        mediaIds: patch.mediaIds ?? d.mediaIds,
        meta: d.meta,
      }),
      { replace: true },
    );
    return c.json({ id: d.id });
  });

  r.delete('/drops/:id', async (c) => {
    const user = c.get('user');
    const [d] = await s.db.select().from(drops).where(and(eq(drops.id, c.req.param('id')), eq(drops.authorId, user.id)));
    if (!d) throw notFound();
    if (await pageLocked(s, user.id, d.day, d.pageCircleId)) throw conflict('sealed', 'Drop yang sudah tersegel tidak bisa dihapus.');
    await s.db.delete(drops).where(eq(drops.id, d.id));
    return c.json({ ok: true });
  });

  r.get('/days/:day', async (c) => {
    const day = c.req.param('day');
    if (!isDayKey(day)) throw bad('bad_day', 'Tanggal tidak valid.');
    return c.json(await myDay(s, c.get('user'), day));
  });

  /**
   * Segel halaman: kapsul teman terbuka setelah kapsulmu sendiri tersegel.
   * Tanpa circleId = halaman utama (menjangkau semua lingkaran yang tidak punya
   * halaman sendiri); dengan circleId = halaman terpisah untuk lingkaran itu.
   */
  r.post('/days/:day/seal', async (c) => {
    const input = await body(c, sealBody);
    const user = c.get('user');
    const day = c.req.param('day');
    const now = s.now();
    if (!sealableDays(user.tz, now).includes(day)) throw bad('day_closed', 'Hari itu sudah tidak bisa disegel.');
    const target = input.circleId ?? null;
    if (input.lastLine) {
      if (input.lastLine.day !== day || input.lastLine.kind !== 'last_line') throw bad('last_line', 'Kalimat Terakhir tidak sesuai.');
      if ((input.lastLine.pageCircleId ?? null) !== target) throw bad('last_line', 'Kalimat Terakhir untuk halaman lain.');
    }
    const pageDrops = async () =>
      ((await s.db
        .select({ n: sql<number>`count(*)::int` })
        .from(drops)
        .where(and(eq(drops.authorId, user.id), eq(drops.day, day), target ? eq(drops.pageCircleId, target) : isNull(drops.pageCircleId)))) as [{ n: number }])[0].n;

    let covered: string[];
    let wasSealed: boolean;
    let sealedAt: Date;
    const mine = await s.db.select().from(circleMembers).where(and(eq(circleMembers.userId, user.id), eq(circleMembers.state, 'active')));
    const already = await sealedPages(s, user.id, day);
    if (target) {
      if (!mine.some((m) => m.circleId === target)) throw forbidden('Kamu bukan anggota lingkaran ini.');
      wasSealed = already.has(target);
      if (!wasSealed) {
        if (input.lastLine) await createDrop(s, user, input.lastLine, { sealing: true });
        if ((await pageDrops()) === 0) throw bad('empty', 'Jatuhkan satu hal dulu. Satu warna juga cukup.');
        await s.db.insert(capsules).values({ userId: user.id, day, tz: input.tz }).onConflictDoNothing();
        await s.db.insert(circleSeals).values({ userId: user.id, day, circleId: target, sealedAt: now }).onConflictDoNothing();
      }
      covered = [target];
      const [row] = await s.db.select().from(circleSeals).where(and(eq(circleSeals.userId, user.id), eq(circleSeals.day, day), eq(circleSeals.circleId, target)));
      sealedAt = row?.sealedAt ?? now;
    } else {
      const [cap] = await s.db.select().from(capsules).where(and(eq(capsules.userId, user.id), eq(capsules.day, day)));
      wasSealed = !!cap?.sealedAt;
      // Halaman utama menjangkau lingkaran tanpa halaman sendiri yang belum tersegel terpisah.
      const reach = mine.filter((m) => !m.ownPage && (!already.has(m.circleId) || wasSealed)).map((m) => m.circleId);
      if (!wasSealed) {
        if (input.lastLine) await createDrop(s, user, input.lastLine, { sealing: true });
        if ((await pageDrops()) === 0) throw bad('empty', 'Jatuhkan satu hal dulu. Satu warna juga cukup.');
        await s.db
          .insert(capsules)
          .values({ userId: user.id, day, tz: input.tz, sealedAt: now, scoped: true })
          .onConflictDoUpdate({ target: [capsules.userId, capsules.day], set: { sealedAt: now, tz: input.tz, scoped: true } });
        const fresh = reach.filter((cid) => !already.has(cid));
        if (fresh.length) await s.db.insert(circleSeals).values(fresh.map((circleId) => ({ userId: user.id, day, circleId, sealedAt: now }))).onConflictDoNothing();
      }
      covered = cap?.scoped === false && wasSealed ? mine.map((m) => m.circleId) : reach;
      sealedAt = cap?.sealedAt ?? now;
    }

    const summaries = await circleSummaries(s, user, covered);
    const result: SealResult = { day, sealedAt: sealedAt.toISOString(), circles: [] };
    for (const sum of summaries) {
      if (sum.status !== 'active') continue;
      const active = sum.members.filter((m) => m.state === 'active');
      const allSealed = active.every((m) => sum.todaySealed[m.userId] || m.userId === user.id);
      const milestone = sum.streak.today.counts ? milestoneReachedOn(sum.streak.current) : undefined;
      result.circles.push({ circleId: sum.id, allSealed, streak: sum.streak, milestone: milestone?.code });
      if (wasSealed) continue;
      const others = active.filter((m) => m.userId !== user.id).map((m) => m.userId);
      if (allSealed) {
        await pushTo(s, others, { body: say(COPY.notifications.capsulesOpen), data: { type: 'capsules_open', circleId: sum.id, day } }, 'notifyPartnerSealed');
      } else {
        const waiting = others.filter((id) => !sum.todaySealed[id]);
        await pushTo(
          s,
          waiting,
          { body: say(COPY.notifications.partnerSealed, user.penName ?? 'Seseorang'), data: { type: 'partner_sealed', circleId: sum.id, day } },
          'notifyPartnerSealed',
        );
      }
    }
    return c.json(result);
  });

  r.get('/me/days', async (c) => {
    const user = c.get('user');
    const from = c.req.query('from') ?? `${userToday(user, s.now()).slice(0, 4)}-01-01`;
    const to = c.req.query('to') ?? userToday(user, s.now());
    if (!isDayKey(from) || !isDayKey(to)) throw bad('bad_range', 'Rentang tidak valid.');
    const caps = await s.db
      .select()
      .from(capsules)
      .where(and(eq(capsules.userId, user.id), gte(capsules.day, from), lte(capsules.day, to)));
    const counts = await s.db
      .select({ day: drops.day, n: sql<number>`count(*)::int` })
      .from(drops)
      .where(and(eq(drops.authorId, user.id), gte(drops.day, from), lte(drops.day, to)))
      .groupBy(drops.day);
    const frz = await s.db
      .select({ day: freezes.day })
      .from(freezes)
      .where(and(eq(freezes.userId, user.id), eq(freezes.kind, 'used'), gte(freezes.day, from), lte(freezes.day, to)));
    // Hari yang hanya halaman terpisahnya disegel tetap terhitung tersegel.
    const pageSeals = await s.db
      .select({ day: circleSeals.day, at: circleSeals.sealedAt })
      .from(circleSeals)
      .where(and(eq(circleSeals.userId, user.id), gte(circleSeals.day, from), lte(circleSeals.day, to)));
    return c.json(
      caps
        .map((x) => ({
          day: x.day,
          sealedAt: (x.sealedAt ?? pageSeals.find((p) => p.day === x.day)?.at)?.toISOString() ?? null,
          dropCount: counts.find((k) => k.day === x.day)?.n ?? 0,
          frozen: frz.some((f) => f.day === x.day),
        }))
        .concat(frz.filter((f) => f.day && !caps.some((x) => x.day === f.day)).map((f) => ({ day: f.day!, sealedAt: null, dropCount: 0, frozen: true })))
        .sort((a, b) => (a.day < b.day ? -1 : 1)),
    );
  });

  r.get('/me/drops', async (c) => {
    const user = c.get('user');
    const from = c.req.query('from');
    const to = c.req.query('to');
    if (!from || !to || !isDayKey(from) || !isDayKey(to) || diffDays(to, from) > 400) throw bad('bad_range', 'Rentang maksimal 400 hari.');
    const rows = await s.db
      .select()
      .from(drops)
      .where(and(eq(drops.authorId, user.id), gte(drops.day, from), lte(drops.day, to)));
    return c.json(await hydrateDrops(s, rows.sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1)), user.id));
  });

  /** Drop untuk satu orang & kapsul waktu yang ditujukan langsung kepadaku. */
  r.get('/me/inbox', async (c) => {
    const user = c.get('user');
    const rows = await s.db
      .select({ d: drops })
      .from(dropRecipients)
      .innerJoin(drops, eq(drops.id, dropRecipients.dropId))
      .where(and(eq(dropRecipients.userId, user.id), sql`${drops.authorId} <> ${user.id}`));
    const today = userToday(user, s.now());
    const blocked = await blockedWith(s, user.id);
    const visible = rows.map((x) => x.d).filter((d) => !blocked.has(d.authorId) && (!d.unlockOn || d.unlockOn <= today));
    const lockedCapsules = rows
      .map((x) => x.d)
      .filter((d) => d.unlockOn && d.unlockOn > today)
      .map((d) => ({ id: d.id, authorId: d.authorId, kind: 'locked' as const, reason: 'time_capsule' as const, unlockOn: d.unlockOn }));
    return c.json({ drops: await hydrateDrops(s, visible, user.id), locked: lockedCapsules });
  });

  // ── Hari di lingkaran ─────────────────────────────────────────────────────

  r.get('/circles/:id/days/:day', async (c) => {
    const user = c.get('user');
    const day = c.req.param('day');
    if (!isDayKey(day)) throw bad('bad_day', 'Tanggal tidak valid.');
    const { circle } = await requireMember(s, c.req.param('id'), user.id);
    const members = await s.db.select().from(circleMembers).where(eq(circleMembers.circleId, circle.id));
    const ids = members.filter((m) => day >= m.joinedDay && (!m.leftDay || day <= m.leftDay)).map((m) => m.userId);
    const sealedBy = (await sealedInCircles(s, [circle.id], ids, { from: day, to: day })).get(circle.id)!;
    const caps = ids.filter((id) => sealedBy.get(id)?.has(day)).map((userId) => ({ userId }));
    const frz = ids.length
      ? await s.db.select().from(freezes).where(and(inArray(freezes.userId, ids), eq(freezes.kind, 'used'), eq(freezes.day, day)))
      : [];
    const rows = await dropsInCircle(s, circle.id, day, day);
    const { visible, locked } = await filterForCircle(s, user, circle, rows);
    const [visit] = await s.db.select().from(visits).where(and(eq(visits.circleId, circle.id), eq(visits.day, day)));
    const out: CircleDay = {
      circleId: circle.id,
      day,
      iSealed: caps.some((x) => x.userId === user.id),
      members: ids.map((id) => ({
        userId: id,
        sealed: caps.some((x) => x.userId === id),
        frozen: frz.some((x) => x.userId === id),
        dropCount: rows.filter((d) => d.authorId === id).length,
      })),
      drops: await hydrateDrops(s, visible, user.id, { hidden: await blockedWith(s, user.id) }),
      locked,
      lastVisitedOn: visit?.lastVisitedOn ?? null,
    };
    return c.json(out);
  });

  /** Semua Drop yang terlihat di rentang tertentu — bahan Wrap & arsip. */
  r.get('/circles/:id/drops', async (c) => {
    const user = c.get('user');
    const { circle } = await requireMember(s, c.req.param('id'), user.id);
    const from = c.req.query('from');
    const to = c.req.query('to');
    if (!from || !to || !isDayKey(from) || !isDayKey(to) || diffDays(to, from) > 400) throw bad('bad_range', 'Rentang maksimal 400 hari.');
    const rows = await dropsInCircle(s, circle.id, from, to);
    const { visible, locked } = await filterForCircle(s, user, circle, rows);
    return c.json({ drops: await hydrateDrops(s, visible, user.id, { hidden: await blockedWith(s, user.id) }), locked });
  });

  /** "Halaman yang Menguning": kunjungan menghidupkan warna halaman lagi. */
  r.post('/circles/:id/days/:day/visit', async (c) => {
    const user = c.get('user');
    const { circle } = await requireMember(s, c.req.param('id'), user.id);
    const today = userToday(user, s.now());
    await s.db
      .insert(visits)
      .values({ circleId: circle.id, day: c.req.param('day'), lastVisitedOn: today })
      .onConflictDoUpdate({ target: [visits.circleId, visits.day], set: { lastVisitedOn: today } });
    return c.json({ ok: true });
  });

  /** Setahun Lalu, Kita… — kapsul dari tanggal yang sama di tahun-tahun sebelumnya. */
  r.get('/memories/on-this-day', async (c) => {
    const user = c.get('user');
    const day = c.req.query('day') ?? userToday(user, s.now());
    if (!isDayKey(day)) throw bad('bad_day', 'Tanggal tidak valid.');
    const past = sameDayPreviousYears(day, 10);
    const out: { circleId: string | null; day: string; yearsAgo: number; drops: Awaited<ReturnType<typeof hydrateDrops>> }[] = [];
    const circleIds = await activeCircleIds(s, user.id);
    const circleRows = circleIds.length ? await s.db.select().from(circles).where(inArray(circles.id, circleIds)) : [];
    for (const circle of circleRows) {
      const st = circleSettings(circle);
      if (!st.oneYearAgo || circle.status !== 'active' || circle.memorialLocked) continue;
      for (const [i, d] of past.entries()) {
        const rows = await dropsInCircle(s, circle.id, d, d);
        const { visible } = await filterForCircle(s, user, circle, rows);
        if (visible.length) out.push({ circleId: circle.id, day: d, yearsAgo: i + 1, drops: await hydrateDrops(s, visible, user.id) });
      }
    }
    const own = await s.db.select().from(drops).where(and(eq(drops.authorId, user.id), inArray(drops.day, past), eq(drops.audience, 'self')));
    for (const [i, d] of past.entries()) {
      const mine = own.filter((x) => x.day === d);
      if (mine.length) out.push({ circleId: null, day: d, yearsAgo: i + 1, drops: await hydrateDrops(s, mine, user.id) });
    }
    return c.json(out);
  });

  // ── Reaksi & catatan kaki ─────────────────────────────────────────────────

  r.put('/drops/:id/reactions/:kind', async (c) => {
    const user = c.get('user');
    const parsed = reactionParams.safeParse({ kind: c.req.param('kind') });
    if (!parsed.success) throw bad('bad_reaction', 'Reaksi tidak dikenal.');
    const seen = await canSeeDrop(s, user, c.req.param('id'));
    if (!seen) throw notFound();
    if (seen.drop.authorId === user.id) throw bad('own', 'Reaksi untuk Drop orang lain.');
    if (!allowedReactions(seen.drop.kind as never).includes(parsed.data.kind)) {
      throw bad('reaction_not_allowed', 'Di Ruang Hening hanya bisa menyalakan lilin.');
    }
    await s.db.insert(reactions).values({ dropId: seen.drop.id, userId: user.id, kind: parsed.data.kind }).onConflictDoNothing();
    return c.json({ ok: true });
  });

  r.delete('/drops/:id/reactions/:kind', async (c) => {
    await s.db
      .delete(reactions)
      .where(and(eq(reactions.dropId, c.req.param('id')), eq(reactions.userId, c.get('user').id), eq(reactions.kind, c.req.param('kind'))));
    return c.json({ ok: true });
  });

  /** Catatan kaki: coretan pensil di pinggir buku pinjaman. */
  r.post('/drops/:id/footnotes', async (c) => {
    const input = await body(c, footnoteBody);
    const user = c.get('user');
    const seen = await canSeeDrop(s, user, c.req.param('id'));
    if (!seen) throw notFound();
    if (seen.drop.kind === 'silent') throw bad('silent', 'Ruang Hening tidak menerima komentar — hanya lilin.');
    if (seen.drop.audience === 'self') throw forbidden();
    await s.db.insert(footnotes).values({
      id: input.id,
      dropId: seen.drop.id,
      authorId: user.id,
      ciphertext: input.envelope.ciphertext,
      recipients: input.envelope.recipients,
    });
    if (seen.drop.authorId !== user.id) {
      await s.db
        .insert(visits)
        .values({ circleId: seen.circle!.id, day: seen.drop.day, lastVisitedOn: userToday(user, s.now()) })
        .onConflictDoUpdate({ target: [visits.circleId, visits.day], set: { lastVisitedOn: userToday(user, s.now()) } });
    }
    return c.json({ id: input.id }, 201);
  });

  r.patch('/footnotes/:id', async (c) => {
    const input = await body(c, footnotePrintBody);
    const user = c.get('user');
    const [fn] = await s.db.select().from(footnotes).where(eq(footnotes.id, c.req.param('id')));
    if (!fn) throw notFound();
    const [d] = await s.db.select().from(drops).where(eq(drops.id, fn.dropId));
    // Pemilik kapsul yang memutuskan catatan itu ikut tercetak atau tidak.
    if (d?.authorId !== user.id) throw forbidden('Hanya pemilik kapsul yang memutuskan.');
    await s.db.update(footnotes).set({ includeInPrint: input.includeInPrint }).where(eq(footnotes.id, fn.id));
    return c.json({ ok: true });
  });

  r.delete('/footnotes/:id', async (c) => {
    const user = c.get('user');
    const [fn] = await s.db.select().from(footnotes).where(eq(footnotes.id, c.req.param('id')));
    if (!fn) throw notFound();
    const [d] = await s.db.select().from(drops).where(eq(drops.id, fn.dropId));
    if (fn.authorId !== user.id && d?.authorId !== user.id) throw forbidden();
    await s.db.delete(footnotes).where(eq(footnotes.id, fn.id));
    return c.json({ ok: true });
  });

  // ── Media terenkripsi ─────────────────────────────────────────────────────

  r.post('/media', async (c) => {
    const user = c.get('user');
    const buf = new Uint8Array(await c.req.arrayBuffer());
    if (buf.length === 0) throw bad('empty', 'Berkas kosong.');
    const max = limitsFor(effectivePlan(user, s.now())).videoSeconds > 0 ? 60 : 15;
    if (buf.length > max * 1024 * 1024) throw new ApiError(413, 'too_large', `Berkas maksimal ${max} MB.`);
    const id = newId();
    const key = `media/${user.id}/${id}`;
    await s.blobs.put(key, buf);
    await s.db.insert(media).values({ id, ownerId: user.id, storageKey: key, size: buf.length });
    return c.json({ id }, 201);
  });

  r.get('/media/:id', async (c) => {
    const user = c.get('user');
    const [m] = await s.db.select().from(media).where(eq(media.id, c.req.param('id')));
    if (!m) throw notFound();
    if (m.ownerId !== user.id && !(await canSeeMedia(s, user, m.id))) throw notFound();
    const data = await s.blobs.get(m.storageKey);
    if (!data) throw notFound();
    return new Response(data as unknown as BodyInit, {
      headers: { 'content-type': 'application/octet-stream', 'cache-control': 'private, max-age=31536000, immutable' },
    });
  });

  // ── Pembeku streak ────────────────────────────────────────────────────────

  r.get('/freezes', async (c) => c.json(await freezeState(s, c.get('user'))));

  r.post('/freezes/use', async (c) => {
    const input = await body(c, useFreezeBody);
    const user = c.get('user');
    const today = userToday(user, s.now());
    const age = diffDays(today, input.day);
    if (age < 0 || age > 2) throw bad('freeze_window', 'Pembeku hanya untuk hari ini atau dua hari terakhir.');
    const [cap] = await s.db.select().from(capsules).where(and(eq(capsules.userId, user.id), eq(capsules.day, input.day)));
    if (cap?.sealedAt) throw conflict('already_sealed', 'Hari itu sudah tersegel.');
    const [already] = await s.db.select().from(freezes).where(and(eq(freezes.userId, user.id), eq(freezes.kind, 'used'), eq(freezes.day, input.day)));
    if (already) return c.json(await freezeState(s, user));
    const st = await freezeState(s, user);
    if (st.left <= 0) throw conflict('no_freeze', 'Pembeku bulan ini sudah habis. Apinya tetap hangat, kok.');
    await s.db.insert(freezes).values({ id: newId(), userId: user.id, month: monthKey(today), kind: 'used', day: input.day });
    return c.json(await freezeState(s, user));
  });

  /** Hadiahkan pembeku ke anggota lingkaran yang sedang sibuk atau sakit. */
  r.post('/freezes/gift', async (c) => {
    const input = await body(c, giftFreezeBody);
    const user = c.get('user');
    if (input.toUserId === user.id) throw bad('self', 'Hadiah untuk orang lain.');
    const mine = new Set(await activeCircleIds(s, user.id));
    const theirs = await activeCircleIds(s, input.toUserId);
    if (!theirs.some((x) => mine.has(x))) throw forbidden('Hanya untuk orang di lingkaranmu.');
    const st = await freezeState(s, user);
    if (st.left <= 0) throw conflict('no_freeze', 'Pembekumu bulan ini sudah habis.');
    const [them] = await s.db.select().from(users).where(eq(users.id, input.toUserId));
    if (!them) throw notFound();
    const theirMonth = monthKey(userToday(them, s.now()));
    await s.db.insert(freezes).values([
      { id: newId(), userId: user.id, month: st.month, kind: 'gift_sent', otherUserId: them.id, note: input.note },
      { id: newId(), userId: them.id, month: theirMonth, kind: 'gift_received', otherUserId: user.id, note: input.note },
    ]);
    await pushTo(s, [them.id], { body: say(COPY.streak.freezeGift, user.penName ?? 'Seseorang'), data: { type: 'freeze_gift' } });
    return c.json(await freezeState(s, user));
  });

  return r;
}

async function canSeeMedia(s: Services, user: UserRow, mediaId: string): Promise<boolean> {
  const holders = await s.db
    .select({ id: drops.id })
    .from(drops)
    .where(sql`${drops.mediaIds} @> ${JSON.stringify([mediaId])}::jsonb`);
  for (const h of holders) if (await canSeeDrop(s, user, h.id)) return true;
  if (await canSeeMeetMedia(s, user.id, mediaId)) return true;
  const letterHolders = await s.db
    .select()
    .from(letters)
    .where(sql`${letters.mediaIds} @> ${JSON.stringify([mediaId])}::jsonb`);
  for (const l of letterHolders) {
    if (!l.deliveredAt) continue;
    if (l.toUserId === user.id) return true;
    if (!l.toUserId && l.circleId && (await membership(s, l.circleId, user.id))?.state === 'active') return true;
  }
  return false;
}

