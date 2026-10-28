/**
 * Ruang permainan bersama: server jadi wasit.
 * Keadaan permainan (termasuk rahasia) hanya ada di sini; tiap pemain
 * menerima tampilan miliknya sendiri. Boleh dimainkan tanpa akun Sehari:
 * tamu dikenali dari token acak di perangkatnya.
 */
import { createHash, randomBytes } from 'node:crypto';
import { eq, lt } from 'drizzle-orm';
import { Hono } from 'hono';
import { z } from 'zod';
import { type AppEnv, body, type Services } from '../context';
import { schema } from '../db';
import { bad, notFound, unauthorized } from '../lib/errors';

const { sessions, users } = schema;
const sha = (x: string) => createHash('sha256').update(x).digest('hex');

const profileBody = z.object({ name: z.string().trim().min(1).max(24), avatar: z.string().max(40_000).default('tunas') });
const actBody = z.object({ action: z.any() });

interface Base {
  code: string;
  rev: number;
  deadline: number | null;
}
type NewPlayer = { id: string; name: string; avatar: string; guest: boolean };

/** Mesin permainan murni dari @sehari/core. */
export interface Engine<G extends Base, A> {
  newGame(code: string, host: NewPlayer, now: number, seed: number): G;
  join(g: G, p: NewPlayer): void;
  leave(g: G, pid: string): void;
  act(g: G, pid: string, a: A, now: number): void;
  tick(g: G, now: number): boolean;
  viewFor(g: G, pid: string | null, now: number): unknown;
  GameError: new (...a: never[]) => Error;
}

type RoomTable = typeof schema.sidikRooms;

async function who(s: Services, c: { req: { header: (k: string) => string | undefined } }): Promise<{ id: string; guest: boolean } | null> {
  const h = c.req.header('authorization') ?? '';
  if (h.startsWith('Bearer ')) {
    const [row] = await s.db.select({ user: users }).from(sessions).innerJoin(users, eq(users.id, sessions.userId)).where(eq(sessions.tokenHash, sha(h.slice(7))));
    if (row && !row.user.deletedAt) return { id: row.user.id, guest: false };
  }
  const g = c.req.header('x-sidik-guest');
  if (g && g.length >= 16 && g.length <= 80) return { id: `g${sha(`sidik:${g}`).slice(0, 18)}`, guest: true };
  return null;
}

const ALPHA = 'ABCDEFGHJKMNPQRSTUVWXYZ';
const newCode = () => Array.from(randomBytes(4), (b) => ALPHA[b % ALPHA.length]).join('');

export function roomRoutes<G extends Base, A>(s: Services, engine: Engine<G, A>, table: RoomTable, tag: string) {
  const r = new Hono<AppEnv>();
  /** Keadaan ruang di memori (satu server), disalin ke database untuk jaga-jaga. */
  const cache = new Map<string, G>();
  const locks = new Map<string, Promise<unknown>>();
  async function withLock<T>(code: string, fn: () => Promise<T>): Promise<T> {
    const prev = locks.get(code) ?? Promise.resolve();
    const run = prev.then(fn, fn);
    locks.set(code, run.catch(() => {}));
    return run;
  }

  async function load(code: string): Promise<G> {
    const k = code.toUpperCase();
    const hit = cache.get(k);
    if (hit) return hit;
    const [row] = await s.db.select().from(table).where(eq(table.code, k));
    if (!row) throw notFound('Kode ruangan tidak ditemukan.');
    const g = row.state as G;
    cache.set(k, g);
    return g;
  }
  async function save(g: G) {
    cache.set(g.code, g);
    await s.db
      .insert(table)
      .values({ code: g.code, state: g, updatedAt: s.now() })
      .onConflictDoUpdate({ target: table.code, set: { state: g, updatedAt: s.now() } });
  }
  const now = () => s.now().getTime();
  const guard = <T>(fn: () => T): T => {
    try {
      return fn();
    } catch (e) {
      if (e instanceof engine.GameError) throw bad(tag, e.message);
      throw e;
    }
  };

  r.post('/rooms', async (c) => {
    const me = (await who(s, c)) ?? (() => { throw unauthorized('Masuk dulu, atau pakai nama tamu.'); })();
    const p = await body(c, profileBody);
    // Ruang lama (lebih dari sehari) dibersihkan.
    await s.db.delete(table).where(lt(table.updatedAt, new Date(now() - 86_400_000)));
    let code = newCode();
    for (let i = 0; i < 5 && (cache.has(code) || (await s.db.select({ c: table.code }).from(table).where(eq(table.code, code))).length); i++) code = newCode();
    const g = engine.newGame(code, { id: me.id, name: p.name, avatar: p.avatar, guest: me.guest }, now(), randomBytes(4).readUInt32LE(0));
    await save(g);
    return c.json(engine.viewFor(g, me.id, now()), 201);
  });

  r.post('/rooms/:code/join', async (c) => {
    const me = (await who(s, c)) ?? (() => { throw unauthorized('Isi nama dulu.'); })();
    const p = await body(c, profileBody);
    return withLock(c.req.param('code').toUpperCase(), async () => {
      const g = await load(c.req.param('code'));
      guard(() => engine.join(g, { id: me.id, name: p.name, avatar: p.avatar, guest: me.guest }));
      await save(g);
      return c.json(engine.viewFor(g, me.id, now()));
    });
  });

  r.get('/rooms/:code', async (c) => {
    const me = await who(s, c);
    const code = c.req.param('code').toUpperCase();
    return withLock(code, async () => {
      const g = await load(code);
      if (engine.tick(g, now())) await save(g);
      // Klien mengirim rev terakhirnya; kalau tidak ada yang berubah, jawab singkat.
      if (Number(c.req.query('rev')) === g.rev) return c.json({ same: true, rev: g.rev, now: now(), deadline: g.deadline });
      return c.json(engine.viewFor(g, c.req.query('tv') ? null : (me?.id ?? null), now()));
    });
  });

  r.post('/rooms/:code/act', async (c) => {
    const me = (await who(s, c)) ?? (() => { throw unauthorized(); })();
    const { action } = await body(c, actBody);
    const code = c.req.param('code').toUpperCase();
    return withLock(code, async () => {
      const g = await load(code);
      guard(() => engine.act(g, me.id, action as A, now()));
      await save(g);
      return c.json(engine.viewFor(g, me.id, now()));
    });
  });

  r.post('/rooms/:code/leave', async (c) => {
    const me = (await who(s, c)) ?? (() => { throw unauthorized(); })();
    const code = c.req.param('code').toUpperCase();
    return withLock(code, async () => {
      const g = await load(code);
      engine.leave(g, me.id);
      await save(g);
      return c.json({ ok: true });
    });
  });

  return r;
}
