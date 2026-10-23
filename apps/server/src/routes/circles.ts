import {
  acceptInviteBody,
  type AcceptInviteResult,
  aiConsentBody,
  ownPageBody,
  CIRCLE_LIMITS,
  type CircleCalendarDay,
  type CircleKind,
  COPY,
  createCircleBody,
  createInviteBody,
  DEFAULT_CIRCLE_SETTINGS,
  diffDays,
  type InvitePreview,
  isDayKey,
  limitsFor,
  memorialBody,
  MOMENT_TIERS,
  type MomentTier,
  type Nickname,
  nicknameBody,
  putKeysForCircleBody,
  rotateCircleBody,
  updateCircleBody,
} from '@sehari/core';
import { and, eq, gte, inArray, isNotNull, lte } from 'drizzle-orm';
import { Hono } from 'hono';
import { type AppEnv, body, say, type Services } from '../context';
import { schema } from '../db';
import {
  activeCircleIds,
  blockedWith,
  circleSettings,
  circleSummaries,
  effectivePlan,
  getCircle,
  membership,
  pushTo,
  requireMember,
  sealedInCircles,
  userToday,
  isFreeAll,
} from '../lib/domain';
import { ApiError, bad, conflict, forbidden, notFound, paymentRequired } from '../lib/errors';
import { newId, newToken, safeEqual } from '../lib/ids';

const { circles, circleMembers, circleKeys, invites, nicknames, capsules, freezes, dropCircles, users } = schema;

export function maxMembers(kind: CircleKind, tier: string | null): number {
  if (kind === 'moment') return isFreeAll() ? MOMENT_TIERS.besar.maxGuests : (MOMENT_TIERS[(tier ?? 'coba') as MomentTier]?.maxGuests ?? 8);
  return CIRCLE_LIMITS[kind].max;
}

export function circleRoutes(s: Services) {
  const r = new Hono<AppEnv>();

  r.get('/', async (c) => {
    const user = c.get('user');
    return c.json(await circleSummaries(s, user, await activeCircleIds(s, user.id)));
  });

  r.post('/', async (c) => {
    const input = await body(c, createCircleBody);
    const user = c.get('user');
    if (!user.publicKey) throw bad('no_keys', 'Siapkan kunci dulu sebelum membuat lingkaran.');
    const limits = limitsFor(effectivePlan(user, s.now()));
    const current = await activeCircleIds(s, user.id);
    const nonMoment = current.length
      ? (await s.db.select({ kind: circles.kind }).from(circles).where(inArray(circles.id, current))).filter((x) => x.kind !== 'moment').length
      : 0;
    if (input.kind !== 'moment' && nonMoment >= limits.maxCircles) {
      throw paymentRequired('circle_limit', `Paket gratis berisi ${limits.maxCircles} lingkaran. Plus membuka lingkaran tanpa batas.`);
    }
    if (input.kind === 'moment') {
      if (!input.moment) throw bad('moment_required', 'Kapsul Momen butuh tanggal acara.');
      if (input.moment.endsOn < input.moment.startsOn || diffDays(input.moment.endsOn, input.moment.startsOn) > 30) {
        throw bad('moment_range', 'Rentang acara maksimal 31 hari.');
      }
    }
    const id = newId();
    const today = userToday(user, s.now());
    await s.db.insert(circles).values({
      id,
      kind: input.kind,
      nameEnc: input.nameEnc,
      doodle: input.doodle,
      settings: {
        ...DEFAULT_CIRCLE_SETTINGS,
        // Kapsul Momen terbuka kapan saja: tamu datang dan pergi.
        ...(input.kind === 'moment' ? { revealMode: 'open' as const, nightQuestion: false, seasons: false, oneYearAgo: false } : {}),
        ...input.settings,
      },
      createdBy: user.id,
      createdDay: today,
      momentStartsOn: input.moment?.startsOn,
      momentEndsOn: input.moment?.endsOn,
      // Tier berbayar baru aktif setelah pembayaran; mulai dari 'coba'.
      momentTier: input.kind === 'moment' ? (isFreeAll() ? 'besar' : 'coba') : null,
    });
    await s.db.insert(circleMembers).values({ circleId: id, userId: user.id, role: 'owner', joinedDay: today });
    await s.db.insert(circleKeys).values({ circleId: id, epoch: 1, userId: user.id, wk: input.keyEnvelope, createdBy: user.id });
    const [summary] = await circleSummaries(s, user, [id]);
    return c.json(summary, 201);
  });

  r.get('/:id', async (c) => {
    const user = c.get('user');
    await requireMember(s, c.req.param('id'), user.id);
    const [summary] = await circleSummaries(s, user, [c.req.param('id')]);
    return c.json(summary);
  });

  r.patch('/:id', async (c) => {
    const input = await body(c, updateCircleBody);
    const user = c.get('user');
    const { circle } = await requireMember(s, c.req.param('id'), user.id);
    if (circle.status !== 'active') throw conflict('circle_frozen', 'Lingkaran ini sudah dibekukan.');
    await s.db
      .update(circles)
      .set({
        nameEnc: input.nameEnc ?? circle.nameEnc,
        doodle: input.doodle ?? circle.doodle,
        settings: input.settings ? { ...circleSettings(circle), ...input.settings } : circle.settings,
      })
      .where(eq(circles.id, circle.id));
    const [summary] = await circleSummaries(s, user, [circle.id]);
    return c.json(summary);
  });

  // ── Kunci ─────────────────────────────────────────────────────────────────

  r.get('/:id/keys', async (c) => {
    const user = c.get('user');
    await requireMember(s, c.req.param('id'), user.id);
    const rows = await s.db
      .select()
      .from(circleKeys)
      .where(and(eq(circleKeys.circleId, c.req.param('id')), eq(circleKeys.userId, user.id)));
    return c.json(rows.map((k) => ({ epoch: k.epoch, wk: k.wk })));
  });

  /**
   * Menyimpan bungkus kunci. Anggota baru menyimpan untuk dirinya sendiri
   * (dari bundel undangan); anggota lama boleh menyimpan untuk anggota aktif lain.
   */
  r.put('/:id/keys', async (c) => {
    const input = await body(c, putKeysForCircleBody);
    const user = c.get('user');
    const { circle } = await requireMember(s, c.req.param('id'), user.id);
    const active = await s.db
      .select({ userId: circleMembers.userId })
      .from(circleMembers)
      .where(and(eq(circleMembers.circleId, circle.id), eq(circleMembers.state, 'active')));
    const activeIds = new Set(active.map((a) => a.userId));
    for (const e of input.envelopes) {
      if (!activeIds.has(e.userId)) throw forbidden('Kunci hanya untuk anggota aktif.');
      if (e.epoch > circle.currentEpoch) throw bad('bad_epoch', 'Epoch kunci tidak dikenal.');
    }
    for (const e of input.envelopes) {
      await s.db
        .insert(circleKeys)
        .values({ circleId: circle.id, epoch: e.epoch, userId: e.userId, wk: e.wk, createdBy: user.id })
        .onConflictDoNothing();
    }
    return c.json({ ok: true });
  });

  /** Putar kunci setelah anggota keluar: Drop baru tidak terbaca oleh yang sudah pergi. */
  r.post('/:id/rotate', async (c) => {
    const input = await body(c, rotateCircleBody);
    const user = c.get('user');
    const { circle } = await requireMember(s, c.req.param('id'), user.id);
    if (input.epoch !== circle.currentEpoch + 1) throw conflict('epoch_race', 'Kunci sudah diputar oleh anggota lain.');
    const active = await s.db
      .select({ userId: circleMembers.userId })
      .from(circleMembers)
      .where(and(eq(circleMembers.circleId, circle.id), eq(circleMembers.state, 'active')));
    const covered = new Set(input.envelopes.map((e) => e.userId));
    if (!active.every((a) => covered.has(a.userId)) || input.envelopes.some((e) => !active.find((a) => a.userId === e.userId))) {
      throw bad('rotation_incomplete', 'Kunci baru harus dibungkus untuk semua anggota aktif, dan hanya mereka.');
    }
    const [updated] = await s.db
      .update(circles)
      .set({ currentEpoch: input.epoch, rotationNeeded: false })
      .where(and(eq(circles.id, circle.id), eq(circles.currentEpoch, circle.currentEpoch)))
      .returning();
    if (!updated) throw conflict('epoch_race', 'Kunci sudah diputar oleh anggota lain.');
    await s.db.insert(circleKeys).values(
      input.envelopes.map((e) => ({ circleId: circle.id, epoch: input.epoch, userId: e.userId, wk: e.wk, createdBy: user.id })),
    );
    return c.json({ epoch: input.epoch });
  });

  // ── Undangan ──────────────────────────────────────────────────────────────

  r.post('/:id/invites', async (c) => {
    const input = await body(c, createInviteBody);
    const user = c.get('user');
    const { circle } = await requireMember(s, c.req.param('id'), user.id);
    if (circle.status !== 'active') throw conflict('circle_frozen', 'Lingkaran ini tidak menerima anggota baru.');
    const max = maxMembers(circle.kind as CircleKind, circle.momentTier);
    const token = newToken().slice(0, 22);
    await s.db.insert(invites).values({
      token,
      circleId: circle.id,
      createdBy: user.id,
      bundle: input.bundle,
      proof: input.proof,
      maxUses: circle.kind === 'duo' ? 1 : Math.min(input.maxUses, max),
      expiresAt: new Date(s.now().getTime() + input.expiresInHours * 3_600_000),
    });
    return c.json({ token, url: `${s.cfg.appUrl}/j/${token}` }, 201);
  });

  r.delete('/:id/invites/:token', async (c) => {
    const user = c.get('user');
    await requireMember(s, c.req.param('id'), user.id);
    await s.db
      .update(invites)
      .set({ revokedAt: s.now() })
      .where(and(eq(invites.token, c.req.param('token')), eq(invites.circleId, c.req.param('id'))));
    return c.json({ ok: true });
  });

  // ── Keluar, pisah, kenangan ───────────────────────────────────────────────

  r.post('/:id/leave', async (c) => {
    const user = c.get('user');
    const { circle } = await requireMember(s, c.req.param('id'), user.id);
    const today = userToday(user, s.now());
    await s.db
      .update(circleMembers)
      .set({ state: 'left', leftDay: today })
      .where(and(eq(circleMembers.circleId, circle.id), eq(circleMembers.userId, user.id)));
    const remaining = await s.db
      .select()
      .from(circleMembers)
      .where(and(eq(circleMembers.circleId, circle.id), eq(circleMembers.state, 'active')));
    await s.db
      .update(circles)
      .set({
        rotationNeeded: remaining.length > 0,
        status: circle.kind === 'duo' && circle.status === 'active' ? 'split' : circle.status,
      })
      .where(eq(circles.id, circle.id));
    // Tanpa pemberitahuan dramatis.
    return c.json({ ok: true });
  });

  /** Mode Pisah untuk Duo: arsip dibekukan, masing-masing hanya melihat Drop miliknya. */
  r.post('/:id/split', async (c) => {
    const user = c.get('user');
    const { circle } = await requireMember(s, c.req.param('id'), user.id);
    if (circle.kind !== 'duo') throw bad('not_duo', 'Mode Pisah hanya untuk Duo.');
    await s.db.update(circles).set({ status: 'split' }).where(eq(circles.id, circle.id));
    return c.json({ ok: true });
  });

  /**
   * Mode Kenangan. Di Duo cukup satu konfirmasi dari pasangan; di lingkaran
   * lebih besar butuh dua anggota. Orang yang ditandai bisa membatalkannya.
   */
  r.post('/:id/memorial', async (c) => {
    const input = await body(c, memorialBody);
    const user = c.get('user');
    const { circle } = await requireMember(s, c.req.param('id'), user.id);
    if (input.userId === user.id) throw bad('self', 'Tidak bisa menandai diri sendiri.');
    const target = await membership(s, circle.id, input.userId);
    if (!target || target.state !== 'active') throw notFound('Anggota tidak ditemukan.');
    const votes = [...new Set([...target.memorialVotes, user.id])];
    const needed = circle.kind === 'duo' ? 1 : 2;
    const confirmed = votes.length >= needed;
    await s.db
      .update(circleMembers)
      .set({
        memorialVotes: votes,
        ...(confirmed ? { state: 'remembered', leftDay: userToday(user, s.now()) } : {}),
      })
      .where(and(eq(circleMembers.circleId, circle.id), eq(circleMembers.userId, input.userId)));
    if (confirmed && circle.kind === 'duo') await s.db.update(circles).set({ status: 'memorial' }).where(eq(circles.id, circle.id));
    return c.json({ confirmed, votes: votes.length, needed });
  });

  r.post('/:id/memorial/undo', async (c) => {
    const user = c.get('user');
    const circle = await getCircle(s, c.req.param('id'));
    const me = await membership(s, circle.id, user.id);
    if (!me) throw notFound();
    await s.db
      .update(circleMembers)
      .set({ memorialVotes: [], state: me.state === 'remembered' ? 'active' : me.state, leftDay: me.state === 'remembered' ? null : me.leftDay })
      .where(and(eq(circleMembers.circleId, circle.id), eq(circleMembers.userId, user.id)));
    if (circle.status === 'memorial') await s.db.update(circles).set({ status: 'active' }).where(eq(circles.id, circle.id));
    return c.json({ ok: true });
  });

  /** Kunci arsip jadi kapsul kenangan: disembunyikan dari Kenangan & Wrap sampai dibuka lagi. */
  r.post('/:id/memorial/lock', async (c) => {
    const user = c.get('user');
    const { circle } = await requireMember(s, c.req.param('id'), user.id);
    const locked = c.req.query('locked') !== '0';
    await s.db.update(circles).set({ memorialLocked: locked }).where(eq(circles.id, circle.id));
    return c.json({ locked });
  });

  // ── Julukan & AI ──────────────────────────────────────────────────────────

  r.get('/:id/nicknames', async (c) => {
    const user = c.get('user');
    await requireMember(s, c.req.param('id'), user.id);
    const rows = await s.db.select().from(nicknames).where(eq(nicknames.circleId, c.req.param('id')));
    const out: Nickname[] = rows.map((n) => ({ giverId: n.giverId, targetId: n.targetId, nicknameEnc: n.nicknameEnc }));
    return c.json(out);
  });

  /** Julukan diberi teman, bukan ditebak mesin. */
  r.put('/:id/nicknames/:userId', async (c) => {
    const input = await body(c, nicknameBody);
    const user = c.get('user');
    const { circle } = await requireMember(s, c.req.param('id'), user.id);
    const target = c.req.param('userId');
    if (target === user.id) throw bad('self', 'Julukan diberi oleh teman.');
    if (!(await membership(s, circle.id, target))) throw notFound();
    await s.db
      .insert(nicknames)
      .values({ circleId: circle.id, giverId: user.id, targetId: target, nicknameEnc: input.nicknameEnc })
      .onConflictDoUpdate({ target: [nicknames.circleId, nicknames.giverId, nicknames.targetId], set: { nicknameEnc: input.nicknameEnc, updatedAt: s.now() } });
    return c.json({ ok: true });
  });

  r.put('/:id/ai-consent', async (c) => {
    const input = await body(c, aiConsentBody);
    const user = c.get('user');
    const { circle } = await requireMember(s, c.req.param('id'), user.id);
    await s.db
      .update(circleMembers)
      .set({ aiConsent: input.granted })
      .where(and(eq(circleMembers.circleId, circle.id), eq(circleMembers.userId, user.id)));
    return c.json({ ok: true });
  });

  /** Halaman sendiri: lingkaran ini tidak lagi menerima halaman utamaku, tapi halamannya sendiri. */
  r.put('/:id/own-page', async (c) => {
    const input = await body(c, ownPageBody);
    const user = c.get('user');
    const { circle } = await requireMember(s, c.req.param('id'), user.id);
    await s.db
      .update(circleMembers)
      .set({ ownPage: input.ownPage })
      .where(and(eq(circleMembers.circleId, circle.id), eq(circleMembers.userId, user.id)));
    return c.json({ ok: true, ownPage: input.ownPage });
  });

  // ── Kalender segel (Papan Tahun, Langit, streak) ──────────────────────────

  r.get('/:id/calendar', async (c) => {
    const user = c.get('user');
    const { circle } = await requireMember(s, c.req.param('id'), user.id);
    const from = c.req.query('from') ?? circle.createdDay;
    const to = c.req.query('to') ?? userToday(user, s.now());
    if (!isDayKey(from) || !isDayKey(to)) throw bad('bad_range', 'Rentang tanggal tidak valid.');
    const members = await s.db.select().from(circleMembers).where(eq(circleMembers.circleId, circle.id));
    const ids = members.map((m) => m.userId);
    const [seals, frz, counts] = await Promise.all([
      sealedInCircles(s, [circle.id], ids, { from, to }).then((m) => [...m.get(circle.id)!.entries()].flatMap(([userId, days]) => [...days].map((day) => ({ userId, day })))),
      s.db
        .select({ userId: freezes.userId, day: freezes.day })
        .from(freezes)
        .where(and(inArray(freezes.userId, ids), eq(freezes.kind, 'used'), gte(freezes.day, from), lte(freezes.day, to))),
      s.db
        .select({ day: dropCircles.day })
        .from(dropCircles)
        .where(and(eq(dropCircles.circleId, circle.id), gte(dropCircles.day, from), lte(dropCircles.day, to))),
    ]);
    const map = new Map<string, CircleCalendarDay>();
    const get = (d: string) => map.get(d) ?? map.set(d, { day: d, sealed: [], frozen: [], dropCount: 0 }).get(d)!;
    const inCircle = (userId: string, d: string) => {
      const m = members.find((x) => x.userId === userId);
      return !!m && d >= m.joinedDay && (!m.leftDay || d <= m.leftDay);
    };
    for (const x of seals) if (inCircle(x.userId, x.day)) get(x.day).sealed.push(x.userId);
    for (const x of frz) if (x.day && inCircle(x.userId, x.day)) get(x.day).frozen.push(x.userId);
    for (const x of counts) get(x.day).dropCount++;
    return c.json([...map.values()].sort((a, b) => (a.day < b.day ? -1 : 1)));
  });

  return r;
}

/** Rute undangan: pratinjau publik (tanpa masuk) dan penerimaan. */
export function inviteRoutes(s: Services, auth: ReturnType<typeof import('./auth').requireAuth>) {
  const r = new Hono<AppEnv>();

  r.get('/:token', async (c) => {
    const [inv] = await s.db.select().from(invites).where(eq(invites.token, c.req.param('token')));
    if (!inv) throw notFound('Undangan tidak ditemukan.');
    const circle = await getCircle(s, inv.circleId);
    const [inviter] = await s.db.select().from(users).where(eq(users.id, inv.createdBy));
    const members = await s.db
      .select()
      .from(circleMembers)
      .where(and(eq(circleMembers.circleId, circle.id), eq(circleMembers.state, 'active')));
    const max = maxMembers(circle.kind as CircleKind, circle.momentTier);
    let reason: InvitePreview['reason'];
    if (inv.revokedAt) reason = 'revoked';
    else if (inv.expiresAt < s.now()) reason = 'expired';
    else if (inv.uses >= inv.maxUses) reason = 'used';
    else if (members.length >= max) reason = 'full';
    else if (circle.status !== 'active') reason = 'ended';
    const preview: InvitePreview = {
      token: inv.token,
      circleId: circle.id,
      kind: circle.kind as CircleKind,
      inviter: { penName: inviter?.penName ?? 'seseorang', doodle: inviter?.doodle ?? 'tunas' },
      memberCount: members.length,
      maxMembers: max,
      expiresAt: inv.expiresAt.toISOString(),
      valid: !reason,
      reason,
      moment: circle.momentStartsOn && circle.momentEndsOn ? { startsOn: circle.momentStartsOn, endsOn: circle.momentEndsOn } : null,
    };
    return c.json(preview);
  });

  r.post('/:token/accept', auth, async (c) => {
    const input = await body(c, acceptInviteBody);
    const user = c.get('user');
    if (!user.publicKey) throw bad('no_keys', 'Siapkan kunci dulu.');
    const [inv] = await s.db.select().from(invites).where(eq(invites.token, c.req.param('token')));
    if (!inv || inv.revokedAt) throw notFound('Undangan tidak ditemukan.');
    if (!safeEqual(inv.proof, input.proof)) throw forbidden('Tautan undangan tidak lengkap.');
    if (inv.expiresAt < s.now()) throw new ApiError(410, 'expired', 'Undangan sudah kedaluwarsa.');
    if (inv.uses >= inv.maxUses) throw new ApiError(410, 'used', 'Undangan sudah dipakai.');
    const circle = await getCircle(s, inv.circleId);
    if (circle.status !== 'active') throw new ApiError(410, 'ended', 'Lingkaran ini tidak menerima anggota baru.');
    const existing = await membership(s, circle.id, user.id);
    if (existing?.state === 'active') {
      const res: AcceptInviteResult = { circleId: circle.id, bundle: inv.bundle };
      return c.json(res);
    }
    const active = await s.db
      .select()
      .from(circleMembers)
      .where(and(eq(circleMembers.circleId, circle.id), eq(circleMembers.state, 'active')));
    if (active.length >= maxMembers(circle.kind as CircleKind, circle.momentTier)) throw conflict('full', 'Lingkaran ini sudah penuh.');
    const blocked = await blockedWith(s, user.id);
    if (active.some((m) => blocked.has(m.userId))) throw forbidden('Undangan ini tidak bisa diterima.');
    if (circle.kind !== 'moment') {
      const limits = limitsFor(effectivePlan(user, s.now()));
      const mine = await activeCircleIds(s, user.id);
      const kinds = mine.length ? await s.db.select({ kind: circles.kind }).from(circles).where(inArray(circles.id, mine)) : [];
      if (kinds.filter((k) => k.kind !== 'moment').length >= limits.maxCircles) {
        throw paymentRequired('circle_limit', `Paket gratis berisi ${limits.maxCircles} lingkaran.`);
      }
    }
    const today = userToday(user, s.now());
    if (existing) {
      await s.db
        .update(circleMembers)
        .set({ state: 'active', leftDay: null, joinedDay: today, joinedAt: s.now(), memorialVotes: [] })
        .where(and(eq(circleMembers.circleId, circle.id), eq(circleMembers.userId, user.id)));
    } else {
      await s.db.insert(circleMembers).values({
        circleId: circle.id,
        userId: user.id,
        role: circle.kind === 'moment' ? 'guest' : 'member',
        joinedDay: today,
      });
    }
    await s.db.update(invites).set({ uses: inv.uses + 1 }).where(eq(invites.token, inv.token));
    await pushTo(
      s,
      active.map((m) => m.userId).filter((id) => id !== user.id),
      { body: say(COPY.notifications.inviteAccepted, user.penName ?? 'Seseorang'), data: { type: 'invite_accepted', circleId: circle.id } },
    );
    const res: AcceptInviteResult = { circleId: circle.id, bundle: inv.bundle };
    return c.json(res);
  });

  return r;
}

