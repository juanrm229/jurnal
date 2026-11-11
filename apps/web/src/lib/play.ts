/**
 * Berapa lama hari ini dihabiskan di Ruang Main. Hanya dicatat di perangkat,
 * supaya Si Benih bisa cemburu dengan data yang akurat.
 */
import { store } from './storage';

const KEY = 'playToday';
const today = () => new Date().toDateString();
const isPlay = (path: string) => path.startsWith('/main') || path.startsWith('/sidik');

let since: number | null = null;

function flush() {
  if (since === null) return;
  const cur = store.json<{ d: string; ms: number }>(KEY);
  const ms = (cur && cur.d === today() ? cur.ms : 0) + Math.min(Date.now() - since, 3 * 3600_000);
  store.set(KEY, JSON.stringify({ d: today(), ms }));
  since = null;
}

export function trackPlay(path: string) {
  flush();
  if (isPlay(path) && document.visibilityState === 'visible') since = Date.now();
}

export function playedMinutesToday(): number {
  const cur = store.json<{ d: string; ms: number }>(KEY);
  return cur && cur.d === today() ? Math.round(cur.ms / 60_000) : 0;
}
