/**
 * Notifikasi: push dari server (kabar ringan, tanpa isi jurnal) dan pengingat
 * lokal — Segel Saat Senja di kota masing-masing & kartu pagi.
 */
import { addDays, COPY, getCity, sunsetUtc, todayIn, zonedTimeToUtc } from '@sehari/core';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { api } from './api';
import { useSession } from './session';

if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }),
  });
}

function route(data: Record<string, unknown> | undefined) {
  if (!data) return;
  const t = data.type;
  if ((t === 'partner_sealed' || t === 'capsules_open') && data.circleId && data.day) router.push(`/l/${data.circleId}/hari/${data.day}`);
  else if (t === 'letter' || t === 'time_capsule') router.push('/surat');
  else if (t === 'wrap' && data.scope) router.push('/kenangan');
  else if (t === 'chapter') router.push('/lingkaran');
  else if (t === 'sunset') router.push('/segel');
  else if (t === 'morning') router.push('/hari-ini');
}

async function registerPush() {
  const perm = await Notifications.getPermissionsAsync();
  let granted = perm.granted;
  if (!granted && perm.canAskAgain) granted = (await Notifications.requestPermissionsAsync()).granted;
  if (!granted) return;
  const projectId = (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)?.eas?.projectId ?? Constants.easConfig?.projectId;
  try {
    const token = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
    await api.post('/me/push-token', { token: token.data, platform: Platform.OS === 'ios' ? 'ios' : 'android' });
  } catch {
    // Expo Go tanpa projectId: notifikasi lokal tetap berjalan.
  }
}

/** Jadwalkan ulang pengingat 7 hari ke depan setiap aplikasi dibuka. */
async function scheduleLocal(opts: { tz: string; cityId: string | null; sunsetSeal: boolean; sealHour: number; morningCard: boolean }) {
  await Notifications.cancelAllScheduledNotificationsAsync();
  const city = getCity(opts.cityId);
  const today = todayIn(opts.tz);
  const now = Date.now();
  for (let i = 0; i < 7; i++) {
    const day = addDays(today, i);
    let sealAt: Date | null = null;
    if (opts.sunsetSeal && city) sealAt = sunsetUtc(day, city.lat, city.lon);
    if (!sealAt) sealAt = zonedTimeToUtc(day, opts.sealHour, 0, opts.tz);
    if (sealAt.getTime() > now) {
      await Notifications.scheduleNotificationAsync({
        content: { body: opts.sunsetSeal && city ? COPY.notifications.sunsetReminder(city.name) : COPY.seal.ctaSub, data: { type: 'sunset' } },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: sealAt },
      });
    }
    if (opts.morningCard) {
      const morning = zonedTimeToUtc(day, 7, 30, opts.tz);
      if (morning.getTime() > now) {
        await Notifications.scheduleNotificationAsync({
          content: { body: COPY.notifications.morningCard, data: { type: 'morning' } },
          trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: morning },
        });
      }
    }
  }
}

export function NotificationsBridge() {
  const { status, me } = useSession();
  const s = me?.user.settings;
  useEffect(() => {
    if (Platform.OS === 'web' || status !== 'ready' || !me || !s) return;
    void registerPush();
    void scheduleLocal({ tz: me.user.tz, cityId: me.user.cityId, sunsetSeal: s.sunsetSeal, sealHour: s.sealHour, morningCard: s.morningCard }).catch(() => {});
  }, [status, me?.user.tz, me?.user.cityId, s?.sunsetSeal, s?.sealHour, s?.morningCard]);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    const sub = Notifications.addNotificationResponseReceivedListener((r) => route(r.notification.request.content.data as Record<string, unknown>));
    return () => sub.remove();
  }, []);
  return null;
}
