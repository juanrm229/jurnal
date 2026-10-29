import {
  COPY,
  deviceLinkApproveBody,
  deviceLinkCreateBody,
  type DeviceLinkState,
  type ExportBundle,
  type KeyBackupResponse,
  limitsFor,
  type Me,
  MIN_AGE,
  pushTokenBody,
  putKeysBody,
  type SessionInfo,
  updateMeBody,
  type PublicUser,
} from '@sehari/core';
import { and, eq, inArray } from 'drizzle-orm';
import { Hono } from 'hono';
import { type AppEnv, body, type Services } from '../context';
import { schema } from '../db';
import {
  activeCircleIds,
  circleSummaries,
  effectivePlan,
  freezeState,
  getUser,
  hydrateDrops,
  ownedDecks,
  toMeUser,
  userSettings,
} from '../lib/domain';
import { bad, conflict, forbidden, notFound } from '../lib/errors';
import { newId } from '../lib/ids';
import { lettersFor } from './letters';
import { ordersFor } from './billing';

const { users, sessions, deviceLinks, circleMembers, circles, drops, media } = schema;

export async function buildMe(s: Services, userId: string): Promise<Me> {
  const user = await getUser(s, userId);
  const now = s.now();
  const limits = limitsFor(effectivePlan(user, now));
  const f = await freezeState(s, user);
  return {
    user: toMeUser(user, now),
    ownedDecks: await ownedDecks(s, user.id),
    freezes: { perMonth: f.perMonth, used: f.used, received: f.received, gifted: f.gifted, left: f.left },
    limits: {
      maxCircles: limits.maxCircles,
      voiceSeconds: limits.voiceSeconds,
      videoSeconds: limits.videoSeconds,
      timeCapsuleYears: limits.timeCapsuleYears,
    },
  };
}

export function meRoutes(s: Services) {
  const r = new Hono<AppEnv>();

  r.get('/', async (c) => c.json(await buildMe(s, c.get('user').id)));

  r.patch('/', async (c) => {
    const input = await body(c, updateMeBody);
    const user = c.get('user');
    if (input.birthYear !== undefined) {
      const age = s.now().getUTCFullYear() - input.birthYear;
      if (age < MIN_AGE) throw forbidden(`Sehari untuk usia ${MIN_AGE} tahun ke atas.`);
    }
    if (input.tz) {
      try {
        new Intl.DateTimeFormat('en', { timeZone: input.tz });
      } catch {
        throw bad('invalid_tz', 'Zona waktu tidak dikenal.');
      }
    }
    await s.db
      .update(users)
      .set({
        penName: input.penName ?? user.penName,
        doodle: input.doodle ?? user.doodle,
        birthYear: input.birthYear ?? user.birthYear,
        birthday: input.birthday === undefined ? user.birthday : input.birthday,
        tz: input.tz ?? user.tz,
        cityId: input.cityId === undefined ? user.cityId : input.cityId,
        homeCityId: input.homeCityId === undefined ? user.homeCityId : input.homeCityId,
        settings: input.settings ? { ...userSettings(user), ...input.settings } : user.settings,
      })
      .where(eq(users.id, user.id));
    return c.json(await buildMe(s, user.id));
  });

  /** Kunci identitas pertama kali. Mengganti kunci akan memutus akses ke arsip lama, jadi dilarang. */
  r.put('/keys', async (c) => {
    const input = await body(c, putKeysBody);
    const user = c.get('user');
    if (user.publicKey && user.publicKey !== input.publicKey) {
      throw conflict('keys_exist', 'Akun ini sudah punya kunci. Pulihkan dengan kode pemulihan.');
    }
    await s.db.update(users).set({ publicKey: input.publicKey, keyBackup: input.keyBackup }).where(eq(users.id, user.id));
    return c.json({ ok: true });
  });

  /** Cadangan kunci terenkripsi — hanya bisa dibuka dengan kode pemulihan di perangkat. */
  r.get('/key-backup', async (c) => {
    const user = c.get('user');
    if (!user.publicKey || !user.keyBackup) throw notFound('Belum ada cadangan kunci.');
    const res: KeyBackupResponse = { publicKey: user.publicKey, keyBackup: user.keyBackup as KeyBackupResponse['keyBackup'] };
    return c.json(res);
  });

  // Foto profil sendiri (opsional, pengganti doodle). Kecil & tidak dienkripsi:
  // hanya terlihat lewat alamat acak oleh orang yang melihat profilmu.
  r.post('/avatar', async (c) => {
    const user = c.get('user');
    const type = c.req.header('content-type') ?? '';
    if (!/^image\/(jpeg|png|webp)$/.test(type)) throw bad('avatar_type', 'Foto profil harus JPG, PNG, atau WebP.');
    const data = new Uint8Array(await c.req.arrayBuffer());
    if (data.byteLength > 300_000) throw bad('avatar_size', 'Foto profil terlalu besar (maks 300 KB).');
    const id = newId().slice(0, 16);
    await s.blobs.put(`avatar/${id}`, data);
    if (user.doodle.startsWith('foto:')) await s.blobs.delete(`avatar/${user.doodle.slice(5)}`).catch(() => {});
    await s.db.update(schema.users).set({ doodle: `foto:${id}` }).where(eq(schema.users.id, user.id));
    return c.json(await buildMe(s, user.id));
  });

  r.post('/push-token', async (c) => {
    const input = await body(c, pushTokenBody);
    await s.db.update(sessions).set({ pushToken: input.token }).where(eq(sessions.id, c.get('session').id));
    return c.json({ ok: true });
  });

  /** Notifikasi uji ke perangkat ini saja: memastikan rantai langganan → server → HP benar-benar jalan. */
  r.post('/push-test', async (c) => {
    const [row] = await s.db.select({ token: sessions.pushToken }).from(sessions).where(eq(sessions.id, c.get('session').id));
    if (!row?.token) return c.json({ ok: false, alasan: 'Perangkat ini belum terdaftar untuk notifikasi.' });
    const mati = await s.pusher.send([{ to: row.token, title: 'Sehari', body: COPY.notifications.pushTest, data: { type: 'test' } }]);
    if (mati?.length) {
      await s.db.update(sessions).set({ pushToken: null }).where(eq(sessions.id, c.get('session').id));
      return c.json({ ok: false, alasan: 'Langganan di perangkat ini sudah kedaluwarsa. Nyalakan ulang notifikasi.' });
    }
    return c.json({ ok: true });
  });

  r.get('/sessions', async (c) => {
    const rows = await s.db.select().from(sessions).where(eq(sessions.userId, c.get('user').id));
    const out: SessionInfo[] = rows.map((x) => ({
      id: x.id,
      deviceName: x.deviceName,
      platform: x.platform,
      createdAt: x.createdAt.toISOString(),
      lastUsedAt: x.lastUsedAt.toISOString(),
      current: x.id === c.get('session').id,
    }));
    return c.json(out);
  });

  r.delete('/sessions/:id', async (c) => {
    await s.db.delete(sessions).where(and(eq(sessions.id, c.req.param('id')), eq(sessions.userId, c.get('user').id)));
    return c.json({ ok: true });
  });

  // ── Menautkan perangkat baru lewat QR ─────────────────────────────────────
  // Perangkat baru (sudah masuk lewat email) membuat kunci efemeral & menampilkan
  // QR. Perangkat lama memindai, membungkus kunci identitas untuk kunci efemeral
  // itu, lalu mengirimnya. Server hanya meneruskan ciphertext.

  r.post('/device-links', async (c) => {
    const input = await body(c, deviceLinkCreateBody);
    const id = newId();
    await s.db.insert(deviceLinks).values({
      id,
      userId: c.get('user').id,
      ephemeralPublicKey: input.ephemeralPublicKey,
      deviceName: c.get('session').deviceName,
      expiresAt: new Date(s.now().getTime() + 10 * 60_000),
    });
    return c.json({ id });
  });

  r.get('/device-links/:id', async (c) => {
    const [row] = await s.db
      .select()
      .from(deviceLinks)
      .where(and(eq(deviceLinks.id, c.req.param('id')), eq(deviceLinks.userId, c.get('user').id)));
    if (!row) throw notFound();
    const state: DeviceLinkState = {
      id: row.id,
      status: row.payload ? 'approved' : row.expiresAt < s.now() ? 'expired' : 'waiting',
      ephemeralPublicKey: row.ephemeralPublicKey,
      payload: row.payload ?? undefined,
      deviceName: row.deviceName,
    };
    if (row.payload) await s.db.delete(deviceLinks).where(eq(deviceLinks.id, row.id));
    return c.json(state);
  });

  r.post('/device-links/:id/approve', async (c) => {
    const input = await body(c, deviceLinkApproveBody);
    const [row] = await s.db
      .select()
      .from(deviceLinks)
      .where(and(eq(deviceLinks.id, c.req.param('id')), eq(deviceLinks.userId, c.get('user').id)));
    if (!row || row.expiresAt < s.now()) throw notFound('Kode tautan sudah kedaluwarsa.');
    await s.db.update(deviceLinks).set({ payload: input.payload, approvedAt: s.now() }).where(eq(deviceLinks.id, row.id));
    return c.json({ ok: true });
  });

  // ── Hak atas data (UU PDP): ekspor & hapus ────────────────────────────────

  r.get('/export', async (c) => {
    const user = c.get('user');
    const circleIds = await activeCircleIds(s, user.id);
    const mine = await s.db.select().from(drops).where(eq(drops.authorId, user.id));
    const bundle: ExportBundle = {
      exportedAt: s.now().toISOString(),
      user: toMeUser(user, s.now()),
      circles: await circleSummaries(s, user, circleIds),
      drops: await hydrateDrops(s, mine, user.id),
      letters: await lettersFor(s, user, 'all'),
      orders: await ordersFor(s, user.id),
    };
    return c.json(bundle);
  });

  r.delete('/', async (c) => {
    const user = c.get('user');
    const confirm = c.req.query('confirm');
    if (confirm !== 'HAPUS') throw bad('confirm_required', 'Ketik HAPUS untuk mengonfirmasi.');
    // Keluar dari semua lingkaran (anggota tersisa diminta memutar kunci).
    const memberships = await s.db.select().from(circleMembers).where(eq(circleMembers.userId, user.id));
    const circleIds = memberships.map((m) => m.circleId);
    if (circleIds.length) {
      await s.db.update(circles).set({ rotationNeeded: true }).where(inArray(circles.id, circleIds));
    }
    const mediaRows = await s.db.select().from(media).where(eq(media.ownerId, user.id));
    for (const m of mediaRows) await s.blobs.delete(m.storageKey);
    // Cascade menghapus Drop, kapsul, sesi, reaksi, keanggotaan, dst.
    await s.db.delete(users).where(eq(users.id, user.id));
    return c.json({ ok: true });
  });

  return r;
}

export function userRoutes(s: Services) {
  const r = new Hono<AppEnv>();
  /** Profil publik minimal: hanya untuk orang yang berbagi lingkaran denganmu. */
  r.get('/:id', async (c) => {
    const target = await getUser(s, c.req.param('id'));
    const mine = new Set(await activeCircleIds(s, c.get('user').id));
    const theirs = await activeCircleIds(s, target.id);
    if (target.id !== c.get('user').id && !theirs.some((x) => mine.has(x))) throw notFound();
    const out: PublicUser = { id: target.id, penName: target.penName ?? 'tanpa nama', doodle: target.doodle, publicKey: target.publicKey ?? '' };
    return c.json(out);
  });
  return r;
}
