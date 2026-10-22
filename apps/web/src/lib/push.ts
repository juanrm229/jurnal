/** Notifikasi web push: berlangganan lewat service worker, token dikirim ke server. */
import type { PublicConfig } from '@sehari/core';
import { api } from './api';

let cfg: Promise<PublicConfig> | null = null;
export const publicConfig = () => (cfg ??= api.get<PublicConfig>('/config'));

const supported = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

export async function pushState(): Promise<'on' | 'off' | 'unsupported' | 'denied'> {
  if (!supported()) return 'unsupported';
  if (Notification.permission === 'denied') return 'denied';
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  return sub ? 'on' : 'off';
}

function b64urlToBytes(s: string): Uint8Array<ArrayBuffer> {
  const pad = '='.repeat((4 - (s.length % 4)) % 4);
  const raw = atob((s + pad).replace(/-/g, '+').replace(/_/g, '/'));
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export async function subscribePush(): Promise<void> {
  if (!supported()) throw new Error('Peramban ini belum mendukung notifikasi.');
  const { vapidPublicKey } = await publicConfig();
  if (!vapidPublicKey) throw new Error('Server belum menyalakan notifikasi (VAPID belum diatur).');
  const perm = await Notification.requestPermission();
  if (perm !== 'granted') throw new Error('Izin notifikasi tidak diberikan.');
  const reg = (await navigator.serviceWorker.getRegistration()) ?? (await navigator.serviceWorker.register('/sw.js'));
  await navigator.serviceWorker.ready;
  const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64urlToBytes(vapidPublicKey) }));
  await api.post('/me/push-token', { token: `webpush:${JSON.stringify(sub.toJSON())}` });
}

/** Perangkat yang sudah berlangganan: kirim ulang token setelah masuk (sesi baru). */
export async function refreshPushToken() {
  if (!supported() || Notification.permission !== 'granted') return;
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  if (sub) await api.post('/me/push-token', { token: `webpush:${JSON.stringify(sub.toJSON())}` }).catch(() => {});
}
