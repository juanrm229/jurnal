/**
 * Siapa boleh menerima ciphertext apa. Aturan kuncinya: kapsul teman baru
 * terbuka setelah kamu menyegel kapsulmu sendiri (memberi dulu, baru menerima).
 * Server menahan ciphertext — bukan sekadar menyembunyikannya di aplikasi.
 */
import type { LockedDrop } from '@sehari/core';
import { and, eq, gte, inArray, isNotNull, lte } from 'drizzle-orm';
import type { Services, UserRow } from '../context';
import { schema } from '../db';
import { blockedWith, circleSettings, type CircleRow, type DropRow, userToday } from './domain';

const { capsules, dropRecipients, dropCircles, drops, circleMembers, circles } = schema;

export interface VisibilityResult {
  visible: DropRow[];
  locked: LockedDrop[];
}

export async function viewerSealed(s: Services, userId: string, days: string[]): Promise<Set<string>> {
  if (!days.length) return new Set();
  const rows = await s.db
    .select({ day: capsules.day })
    .from(capsules)
    .where(and(eq(capsules.userId, userId), inArray(capsules.day, [...new Set(days)]), isNotNull(capsules.sealedAt)));
  return new Set(rows.map((r) => r.day));
}

/** Saring Drop di satu lingkaran untuk satu pembaca. */
export async function filterForCircle(s: Services, viewer: UserRow, circle: CircleRow, rows: DropRow[]): Promise<VisibilityResult> {
  if (!rows.length) return { visible: [], locked: [] };
  const today = userToday(viewer, s.now());
  const settings = circleSettings(circle);
  const blocked = await blockedWith(s, viewer.id);
  const sealed = await viewerSealed(s, viewer.id, rows.map((r) => r.day));
  const recips = await s.db
    .select()
    .from(dropRecipients)
    .where(inArray(dropRecipients.dropId, rows.map((r) => r.id)));

  const visible: DropRow[] = [];
  const locked: LockedDrop[] = [];
  for (const d of rows) {
    if (d.authorId === viewer.id) {
      visible.push(d);
      continue;
    }
    if (blocked.has(d.authorId)) continue;
    const mine = recips.filter((r) => r.dropId === d.id);
    const addressed = mine.some((r) => r.circleId === circle.id || r.userId === viewer.id);
    if (!addressed) continue;
    if (circle.status === 'split') {
      locked.push({ id: d.id, authorId: d.authorId, kind: 'locked', reason: 'split', unlockOn: null });
      continue;
    }
    if (d.unlockOn && d.unlockOn > today) {
      locked.push({ id: d.id, authorId: d.authorId, kind: 'locked', reason: 'time_capsule', unlockOn: d.unlockOn });
      continue;
    }
    // Kapsul waktu yang sudah terbuka dan Kapsul Momen tidak butuh segel.
    const needsSeal = settings.revealMode === 'after_seal' && circle.kind !== 'moment' && d.audience !== 'time_capsule';
    if (needsSeal && !sealed.has(d.day)) {
      locked.push({ id: d.id, authorId: d.authorId, kind: 'locked', reason: 'not_sealed', unlockOn: null });
      continue;
    }
    visible.push(d);
  }
  return { visible, locked };
}

/** Apakah pembaca boleh melihat satu Drop (lewat lingkaran mana pun)? */
export async function canSeeDrop(s: Services, viewer: UserRow, dropId: string): Promise<{ drop: DropRow; circle: CircleRow | null } | null> {
  const [d] = await s.db.select().from(drops).where(eq(drops.id, dropId));
  if (!d) return null;
  if (d.authorId === viewer.id) return { drop: d, circle: null };
  const homes = await s.db
    .select({ c: circles })
    .from(dropCircles)
    .innerJoin(circles, eq(circles.id, dropCircles.circleId))
    .innerJoin(circleMembers, and(eq(circleMembers.circleId, dropCircles.circleId), eq(circleMembers.userId, viewer.id), eq(circleMembers.state, 'active')))
    .where(eq(dropCircles.dropId, d.id));
  for (const { c } of homes) {
    const res = await filterForCircle(s, viewer, c, [d]);
    if (res.visible.length) return { drop: d, circle: c };
  }
  return null;
}

export async function dropsInCircle(s: Services, circleId: string, from: string, to: string): Promise<DropRow[]> {
  const rows = await s.db
    .select({ d: drops })
    .from(dropCircles)
    .innerJoin(drops, eq(drops.id, dropCircles.dropId))
    .where(and(eq(dropCircles.circleId, circleId), gte(dropCircles.day, from), lte(dropCircles.day, to)));
  return rows.map((r) => r.d).sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1));
}
