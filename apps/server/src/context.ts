import type { Context } from 'hono';
import type { z } from 'zod';
import type { Db } from './db';
import type { schema } from './db';
import type { Config } from './lib/config';
import { bad } from './lib/errors';
import type { Mailer } from './lib/email';
import type { PaymentProvider } from './lib/payments';
import type { Pusher } from './lib/push';
import type { BlobStore } from './lib/storage';

export interface Services {
  db: Db;
  cfg: Config;
  blobs: BlobStore;
  mailer: Mailer;
  pusher: Pusher;
  payments: PaymentProvider;
  /** Bisa diganti di pengujian untuk "memajukan waktu". */
  now: () => Date;
}

export type UserRow = typeof schema.users.$inferSelect;
export type SessionRow = typeof schema.sessions.$inferSelect;

export interface AppEnv {
  Variables: {
    user: UserRow;
    session: SessionRow;
  };
}

export type Ctx = Context<AppEnv>;

export async function body<S extends z.ZodType>(c: Ctx, schema: S): Promise<z.infer<S>> {
  let raw: unknown;
  try {
    raw = await c.req.json();
  } catch {
    throw bad('invalid_json', 'Isi permintaan tidak bisa dibaca.');
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    throw bad('invalid_body', parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; '));
  }
  return parsed.data;
}

export function iso(d: Date | null | undefined): string | null {
  return d ? d.toISOString() : null;
}

/** Terjemahkan nilai COPY yang bisa berupa string atau fungsi. */
export function say<A extends unknown[]>(v: string | ((...a: A) => string), ...args: A): string {
  return typeof v === 'function' ? v(...args) : v;
}
