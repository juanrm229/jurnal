/**
 * Kunci rahasia yang tidak diisi di env (SERVER_SECRET, VAPID) dibuat sekali
 * saat server pertama menyala, lalu disimpan di database supaya tetap sama
 * setelah deploy ulang. Memakai tabel `blobs` dengan awalan "secret:".
 */
import { randomBytes } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { type Db, schema } from '../db';
import type { Config } from './config';

async function getOrCreate(db: Db, key: string, make: () => string): Promise<string> {
  const id = `secret:${key}`;
  const [row] = await db.select().from(schema.blobs).where(eq(schema.blobs.key, id));
  if (row) return Buffer.from(row.data).toString('utf8');
  const value = make();
  await db.insert(schema.blobs).values({ key: id, data: Buffer.from(value, 'utf8') }).onConflictDoNothing();
  // Kalau dua instans menyala bersamaan, pakai yang tersimpan lebih dulu.
  const [saved] = await db.select().from(schema.blobs).where(eq(schema.blobs.key, id));
  return Buffer.from(saved!.data).toString('utf8');
}

export async function ensureSecrets(db: Db, cfg: Config): Promise<void> {
  if (!process.env.SERVER_SECRET) cfg.secret = await getOrCreate(db, 'server', () => randomBytes(32).toString('hex'));
  if (!cfg.vapid) {
    const { default: webpush } = await import('web-push');
    const keys = JSON.parse(await getOrCreate(db, 'vapid', () => JSON.stringify(webpush.generateVAPIDKeys()))) as { publicKey: string; privateKey: string };
    const from = /<([^>]+)>/.exec(cfg.email.from)?.[1] ?? cfg.email.from;
    cfg.vapid = { ...keys, subject: process.env.VAPID_SUBJECT ?? `mailto:${from.includes('@') ? from : 'halo@sehari.app'}` };
  }
}
