/**
 * Penjadwal tiap menit: mengantar surat, membuka kapsul waktu, mengabari Wrap,
 * mengingatkan Upacara Tutup Bab, menutup Kapsul Momen, dan bersih-bersih.
 * Pengingat senja & kartu pagi dijadwalkan di perangkat (notifikasi lokal).
 */
import { addDays, COPY, isoWeek, localParts, monthKey, monthRange, prevMonth, weekday } from '@sehari/core';
import { and, eq, isNotNull, isNull, lt, lte } from 'drizzle-orm';
import { say, type Services } from '../context';
import { schema } from '../db';
import { pushTo, userToday } from '../lib/domain';
import { closeChapterIfReadyForce } from '../routes/lore';
import { deliverDueLetters } from '../routes/letters';
import { cleanupPulseDedupe } from '../routes/community';

async function once(s: Services, key: string): Promise<boolean> {
  const rows = await s.db.insert(schema.notificationLog).values({ key }).onConflictDoNothing().returning();
  return rows.length > 0;
}
import { remindMeets } from '../routes/meets';

export async function runJobs(s: Services): Promise<void> {
  const now = s.now();
  await deliverDueLetters(s);
  await remindMeets(s);

  // Kapsul waktu yang terbuka hari ini.
  const capsules = await s.db
    .select({ d: schema.drops, r: schema.dropRecipients })
    .from(schema.drops)
    .innerJoin(schema.dropRecipients, eq(schema.dropRecipients.dropId, schema.drops.id))
    .where(and(isNotNull(schema.drops.unlockOn), lte(schema.drops.unlockOn, now.toISOString().slice(0, 10))));
  for (const { d, r } of capsules) {
    if (!(await once(s, `tc:${d.id}:${r.circleId ?? r.userId}`))) continue;
    let targets: string[] = [];
    if (r.userId) targets = [r.userId];
    else if (r.circleId) {
      const ms = await s.db
        .select()
        .from(schema.circleMembers)
        .where(and(eq(schema.circleMembers.circleId, r.circleId), eq(schema.circleMembers.state, 'active')));
      targets = ms.map((m) => m.userId);
    }
    await pushTo(s, targets, { body: say(COPY.notifications.timeCapsuleOpened), data: { type: 'time_capsule', dropId: d.id } }, 'notifyLetters');
  }

  // Kabar Wrap & upacara bab, menurut jam lokal tiap pengguna.
  const users = await s.db.select().from(schema.users).where(isNull(schema.users.deletedAt));
  for (const u of users) {
    const p = localParts(u.tz, now);
    const today = userToday(u, now);
    if (weekday(today) === 0 && p.hour >= 19 && (await once(s, `wrap-w:${u.id}:${isoWeek(today)}`))) {
      await pushTo(s, [u.id], { body: say(COPY.notifications.weeklyWrapReady), data: { type: 'wrap', scope: 'week', period: isoWeek(today) } }, 'notifyWraps');
    }
    const { end } = monthRange(monthKey(today));
    if (today === end && p.hour >= 19 && (await once(s, `bab:${u.id}:${monthKey(today)}`))) {
      await pushTo(s, [u.id], { body: say(COPY.notifications.chapterCeremony), data: { type: 'chapter', month: monthKey(today) } }, 'notifyWraps');
    }
    if (p.day === 1 && p.hour >= 9 && (await once(s, `wrap-m:${u.id}:${monthKey(today)}`))) {
      await pushTo(s, [u.id], { body: 'Bulan Kita sudah siap dibuka.', data: { type: 'wrap', scope: 'month', period: prevMonth(monthKey(today)) } }, 'notifyWraps');
    }
  }

  // Bab yang upacaranya sudah lewat ditutup dengan suara terbanyak.
  const today = now.toISOString().slice(0, 10);
  const openProposals = await s.db.selectDistinct({ circleId: schema.chapterProposals.circleId, month: schema.chapterProposals.month }).from(schema.chapterProposals);
  for (const x of openProposals) {
    if (today > addDays(monthRange(x.month).end, 7)) await closeChapterIfReadyForce(s, x.circleId, x.month);
  }

  // Kapsul Momen selesai tiga hari setelah acara.
  const moments = await s.db.select().from(schema.circles).where(and(eq(schema.circles.kind, 'moment'), eq(schema.circles.status, 'active')));
  for (const m of moments) {
    if (m.momentEndsOn && addDays(m.momentEndsOn, 3) < today) {
      await s.db.update(schema.circles).set({ status: 'ended' }).where(eq(schema.circles.id, m.id));
    }
  }

  // Bersih-bersih.
  await cleanupPulseDedupe(s, addDays(today, -2));
  await s.db.delete(schema.authCodes).where(lt(schema.authCodes.expiresAt, now));
  await s.db.delete(schema.deviceLinks).where(lt(schema.deviceLinks.expiresAt, new Date(now.getTime() - 3600_000)));
}

export function startScheduler(s: Services): () => void {
  let running = false;
  const tick = async () => {
    if (running) return;
    running = true;
    try {
      await runJobs(s);
    } catch (e) {
      console.error('penjadwal gagal', e);
    } finally {
      running = false;
    }
  };
  const t = setInterval(tick, 60_000);
  void tick();
  return () => clearInterval(t);
}
