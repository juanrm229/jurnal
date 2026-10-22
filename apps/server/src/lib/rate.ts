import { eq, sql } from 'drizzle-orm';
import type { Services } from '../context';
import { schema } from '../db';
import { ApiError } from './errors';

/** Batas sederhana berbasis tabel (bertahan saat restart, cukup untuk endpoint sensitif). */
export async function rateLimit(s: Services, key: string, max: number, windowSec: number): Promise<void> {
  const now = s.now();
  const resetAt = new Date(now.getTime() + windowSec * 1000);
  const [row] = await s.db
    .insert(schema.rateLimits)
    .values({ key, count: 1, resetAt })
    .onConflictDoUpdate({
      target: schema.rateLimits.key,
      set: {
        count: sql`case when ${schema.rateLimits.resetAt} < ${now.toISOString()}::timestamptz then 1 else ${schema.rateLimits.count} + 1 end`,
        resetAt: sql`case when ${schema.rateLimits.resetAt} < ${now.toISOString()}::timestamptz then ${resetAt.toISOString()}::timestamptz else ${schema.rateLimits.resetAt} end`,
      },
    })
    .returning();
  if (row && row.count > max) throw new ApiError(429, 'rate_limited', 'Pelan-pelan dulu, coba lagi sebentar lagi.');
}

export async function clearRate(s: Services, key: string) {
  await s.db.delete(schema.rateLimits).where(eq(schema.rateLimits.key, key));
}
