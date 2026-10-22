import { requestCodeBody, verifyCodeBody, DEFAULT_USER_SETTINGS, type AuthResult } from '@sehari/core';
import { eq } from 'drizzle-orm';
import { Hono, type MiddlewareHandler } from 'hono';
import { type AppEnv, body, type Services } from '../context';
import { schema } from '../db';
import { toMeUser } from '../lib/domain';
import { ApiError, bad, unauthorized } from '../lib/errors';
import { hmacHex, newId, newToken, safeEqual, sha256Hex, sixDigitCode } from '../lib/ids';
import { rateLimit } from '../lib/rate';

const { users, authCodes, sessions } = schema;

export function requireAuth(s: Services): MiddlewareHandler<AppEnv> {
  return async (c, next) => {
    const header = c.req.header('authorization') ?? '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : c.req.query('token');
    if (!token) throw unauthorized();
    const [row] = await s.db
      .select({ session: sessions, user: users })
      .from(sessions)
      .innerJoin(users, eq(users.id, sessions.userId))
      .where(eq(sessions.tokenHash, sha256Hex(token)));
    if (!row || row.user.deletedAt) throw unauthorized('Sesi berakhir. Masuk lagi, ya.');
    c.set('user', row.user);
    c.set('session', row.session);
    const now = s.now();
    if (now.getTime() - row.session.lastUsedAt.getTime() > 60 * 60 * 1000) {
      await s.db.update(sessions).set({ lastUsedAt: now }).where(eq(sessions.id, row.session.id));
    }
    await next();
  };
}

export function authRoutes(s: Services) {
  const r = new Hono<AppEnv>();

  r.post('/request-code', async (c) => {
    const { email } = await body(c, requestCodeBody);
    const normalized = email.trim().toLowerCase();
    await rateLimit(s, `code:${normalized}`, 5, 15 * 60);
    await rateLimit(s, `code-ip:${c.req.header('x-forwarded-for') ?? 'local'}`, 30, 15 * 60);
    const code = sixDigitCode();
    const now = s.now();
    await s.db
      .insert(authCodes)
      .values({ email: normalized, codeHash: hmacHex(s.cfg.secret, `${normalized}:${code}`), expiresAt: new Date(now.getTime() + 10 * 60_000), attempts: 0 })
      .onConflictDoUpdate({
        target: authCodes.email,
        set: { codeHash: hmacHex(s.cfg.secret, `${normalized}:${code}`), expiresAt: new Date(now.getTime() + 10 * 60_000), attempts: 0, createdAt: now },
      });
    await s.mailer.send(
      normalized,
      `Kode masuk Sehari: ${code}`,
      `Halo,\n\nIni kode masukmu: ${code}\nBerlaku 10 menit. Kalau kamu tidak meminta kode ini, abaikan saja email ini.\n\n— Sehari`,
    );
    return c.json({ ok: true, ...(s.cfg.devAuth ? { devCode: code } : {}) });
  });

  r.post('/verify', async (c) => {
    const input = await body(c, verifyCodeBody);
    const email = input.email.trim().toLowerCase();
    const [row] = await s.db.select().from(authCodes).where(eq(authCodes.email, email));
    const now = s.now();
    if (!row || row.expiresAt < now) throw bad('code_expired', 'Kodenya sudah kedaluwarsa. Minta kode baru, ya.');
    if (row.attempts >= 5) throw new ApiError(429, 'too_many_attempts', 'Terlalu banyak percobaan. Minta kode baru.');
    if (!safeEqual(row.codeHash, hmacHex(s.cfg.secret, `${email}:${input.code}`))) {
      await s.db.update(authCodes).set({ attempts: row.attempts + 1 }).where(eq(authCodes.email, email));
      throw bad('code_wrong', 'Kodenya belum cocok.');
    }
    await s.db.delete(authCodes).where(eq(authCodes.email, email));

    let [user] = await s.db.select().from(users).where(eq(users.email, email));
    let isNew = false;
    if (user?.deletedAt) throw new ApiError(410, 'account_deleted', 'Akun ini sudah dihapus.');
    if (!user) {
      isNew = true;
      [user] = await s.db.insert(users).values({ id: newId(), email, settings: DEFAULT_USER_SETTINGS }).returning();
    }
    const token = newToken();
    await s.db.insert(sessions).values({
      id: newId(),
      userId: user!.id,
      tokenHash: sha256Hex(token),
      deviceName: input.deviceName,
      platform: input.platform,
    });
    const result: AuthResult = { token, user: toMeUser(user!, now), hasKeys: !!user!.publicKey, isNew };
    return c.json(result);
  });

  r.post('/logout', requireAuth(s), async (c) => {
    await s.db.delete(sessions).where(eq(sessions.id, c.get('session').id));
    return c.json({ ok: true });
  });

  return r;
}
