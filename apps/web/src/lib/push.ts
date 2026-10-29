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

const kirimToken = (sub: PushSubscription) => api.post('/me/push-token', { token: `webpush:${JSON.stringify(sub.toJSON())}`, platform: 'web' });

/**
 * Nyalakan notifikasi. Dipanggil langsung dari ketukan: izin diminta PALING
 * DULU, sebelum menunggu jaringan apa pun. Safari iOS hanya memunculkan
 * dialog izin selama "ketukan" masih segar; setelah await fetch, izinnya
 * gagal diam-diam.
 */
export async function subscribePush(): Promise<void> {
  if (!supported()) throw new Error('Peramban ini belum mendukung notifikasi. Di iPhone: pasang Sehari ke layar utama dulu, lalu buka dari ikonnya.');
  const perm = Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission();
  if (perm !== 'granted') throw new Error(perm === 'denied' ? 'Notifikasi diblokir. Izinkan di Pengaturan HP → Sehari → Notifikasi.' : 'Izin notifikasi belum diberikan.');
  const { vapidPublicKey } = await publicConfig();
  if (!vapidPublicKey) throw new Error('Server belum menyalakan notifikasi.');
  const reg = (await navigator.serviceWorker.getRegistration()) ?? (await navigator.serviceWorker.register('/sw.js'));
  await navigator.serviceWorker.ready;
  const key = b64urlToBytes(vapidPublicKey);
  let sub = await reg.pushManager.getSubscription();
  // Langganan lama dengan kunci server berbeda tidak akan pernah menerima apa-apa: ganti.
  const lama = sub?.options.applicationServerKey;
  if (sub && lama && new Uint8Array(lama).join() !== key.join()) {
    await sub.unsubscribe().catch(() => {});
    sub = null;
  }
  sub ??= await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key });
  await kirimToken(sub);
}

/** Kirim notifikasi uji ke perangkat ini. */
export async function testPush(): Promise<void> {
  const r = await api.post<{ ok: boolean; alasan?: string }>('/me/push-test', {});
  if (!r.ok) throw new Error(r.alasan ?? 'Notifikasi uji gagal dikirim.');
}

/** Perangkat yang sudah berlangganan: kirim ulang token setiap aplikasi dibuka (sesi baru, langganan berganti). */
export async function refreshPushToken() {
  if (!supported() || Notification.permission !== 'granted') return;
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  if (sub) await kirimToken(sub).catch(() => {});
}

/** Hapus titik merah di ikon aplikasi saat aplikasi dibuka. */
export function bersihkanLencana() {
  try {
    (navigator as Navigator & { clearAppBadge?: () => Promise<void> }).clearAppBadge?.().catch(() => {});
  } catch {}
}
