/**
 * Klien SIDIK: identitas (akun Sehari atau tamu), polling ruang dengan jam
 * server, dan kemampuan HP: narator suara, getar, layar tetap menyala, bunyi.
 */
import type { sidik } from '@sehari/core';
import { useEffect, useRef, useState } from 'react';
import { API_URL, ApiError, currentToken } from './api';
import { store } from './storage';

export type View = sidik.View;

export function guestToken(): string {
  let t = store.get('sidikGuest');
  if (!t) {
    const a = new Uint8Array(18);
    crypto.getRandomValues(a);
    t = Array.from(a, (b) => b.toString(16).padStart(2, '0')).join('');
    store.set('sidikGuest', t);
  }
  return t;
}

export const profile = {
  get: () => store.json<{ name: string; avatar: string }>('sidikProfile'),
  set: (p: { name: string; avatar: string }) => store.set('sidikProfile', JSON.stringify(p)),
};

/** Panggilan ke ruang permainan bersama (/v1/<base>). Identitas tamu dipakai bersama. */
export async function callGame<T>(base: 'sidik', method: string, path: string, body?: unknown): Promise<T> {
  const tok = currentToken();
  const res = await fetch(`${API_URL}/v1/${base}${path}`, {
    method,
    headers: { 'x-sidik-guest': guestToken(), ...(tok ? { authorization: `Bearer ${tok}` } : {}), ...(body ? { 'content-type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  }).catch(() => {
    throw new ApiError(0, 'offline', 'Tidak tersambung. Coba lagi.');
  });
  const j = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(res.status, j?.error?.code ?? 'error', j?.error?.message ?? 'Gagal.');
  return j as T;
}
const call = <T>(method: string, path: string, body?: unknown) => callGame<T>('sidik', method, path, body);

export const createRoom = (p: { name: string; avatar: string }) => call<View>('POST', '/rooms', p);
export const joinRoom = (code: string, p: { name: string; avatar: string }) => call<View>('POST', `/rooms/${code}/join`, p);
export const sendAct = (code: string, action: sidik.Action) => call<View>('POST', `/rooms/${code}/act`, { action });
export const leaveRoom = (code: string) => call('POST', `/rooms/${code}/leave`);

/** Polling ruang. `serverNow()` memberi jam server agar hitung mundur sama di semua HP. */
export function useRoom(code: string, opts: { tv?: boolean } = {}) {
  return useGameRoom<View>('sidik', code, opts);
}

export function useGameRoom<V extends { rev: number; now: number }>(base: 'sidik', code: string, opts: { tv?: boolean; ms?: (v: V | null) => number } = {}) {
  type View = V;
  const call = <T,>(method: string, path: string) => callGame<T>(base, method, path);
  const [view, setView] = useState<View | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const skew = useRef(0);
  const rev = useRef(0);
  const viewRef = useRef<View | null>(null);
  useEffect(() => {
    let alive = true;
    let t: ReturnType<typeof setTimeout>;
    const poll = async () => {
      try {
        const t0 = Date.now();
        const v = await call<View | { same: true; now: number; deadline: number | null }>('GET', `/rooms/${code}?rev=${rev.current}${opts.tv ? '&tv=1' : ''}`);
        const t1 = Date.now();
        skew.current = v.now - (t0 + t1) / 2;
        if (!alive) return;
        if (!('same' in v)) {
          rev.current = v.rev;
          viewRef.current = v;
          setView(v);
        }
        setErr(null);
      } catch (e) {
        if (alive) setErr((e as Error).message);
      }
      if (alive) t = setTimeout(poll, document.hidden ? 3000 : (opts.ms?.(viewRef.current) ?? 900));
    };
    void poll();
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [code]);
  const apply = (v: View) => {
    rev.current = v.rev;
    viewRef.current = v;
    setView(v);
  };
  return { view, err, apply, serverNow: () => Date.now() + skew.current };
}

/** Sisa detik menuju tenggat fase, diperbarui 4× per detik. */
export function useCountdown(deadline: number | null | undefined, serverNow: () => number) {
  const [, tick] = useState(0);
  useEffect(() => {
    const i = setInterval(() => tick((n) => n + 1), 250);
    return () => clearInterval(i);
  }, []);
  return deadline ? Math.max(0, Math.ceil((deadline - serverNow()) / 1000)) : null;
}

// ── Kemampuan HP ────────────────────────────────────────────────────────────

export const vibrate = (p: number | number[]) => {
  try {
    navigator.vibrate?.(p);
  } catch {}
};

/** Narator: suara bawaan perangkat, bahasa Indonesia. */
export function speak(text: string, on = true) {
  if (!on || typeof speechSynthesis === 'undefined') return;
  try {
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'id-ID';
    u.rate = 0.96;
    u.pitch = 0.9;
    const v = speechSynthesis.getVoices().find((x) => x.lang.startsWith('id'));
    if (v) u.voice = v;
    speechSynthesis.speak(u);
  } catch {}
}
export const hush = () => {
  try {
    speechSynthesis.cancel();
  } catch {}
};

/** Layar tetap menyala selama permainan. */
export function useWakeLock(on: boolean) {
  useEffect(() => {
    if (!on) return;
    let lock: { release: () => Promise<void> } | null = null;
    const get = () =>
      (navigator as Navigator & { wakeLock?: { request: (t: 'screen') => Promise<{ release: () => Promise<void> }> } }).wakeLock
        ?.request('screen')
        .then((l) => (lock = l))
        .catch(() => {});
    void get();
    const vis = () => document.visibilityState === 'visible' && void get();
    document.addEventListener('visibilitychange', vis);
    return () => {
      document.removeEventListener('visibilitychange', vis);
      void lock?.release().catch(() => {});
    };
  }, [on]);
}

let ac: AudioContext | null = null;
const ctx = () => (ac ??= new AudioContext());
function tone(freq: number, dur: number, type: OscillatorType = 'sine', vol = 0.12, slide?: number) {
  try {
    const a = ctx();
    const t = a.currentTime;
    const o = a.createOscillator();
    const g = a.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(a.destination);
    o.start(t);
    o.stop(t + dur + 0.02);
  } catch {}
}
/** Bunyi-bunyi kecil: malam, pagi, detak, cap, terungkap. */
export const sfx = {
  night: () => (tone(110, 1.6, 'sine', 0.14, 70), setTimeout(() => tone(82, 1.8, 'triangle', 0.08, 55), 300)),
  dawn: () => [523, 659, 784].forEach((f, i) => setTimeout(() => tone(f, 0.5, 'sine', 0.07), i * 140)),
  tick: () => tone(1400, 0.05, 'square', 0.04),
  heart: () => (tone(70, 0.18, 'sine', 0.3), setTimeout(() => tone(60, 0.22, 'sine', 0.24), 220)),
  stamp: () => (tone(160, 0.18, 'square', 0.12, 60), tone(90, 0.3, 'sine', 0.2)),
  reveal: () => [196, 247, 294, 392].forEach((f, i) => setTimeout(() => tone(f, 0.7, 'triangle', 0.08), i * 110)),
  fail: () => [330, 262, 196].forEach((f, i) => setTimeout(() => tone(f, 0.6, 'sawtooth', 0.05), i * 180)),
};

/** Statistik pribadi di perangkat: untuk pangkat detektif. */
export interface Stats {
  games: number;
  wins: number;
  asEvil: number;
  evilWins: number;
  roles: Record<string, number>;
}
export const stats = {
  get: (): Stats => store.json<Stats>('sidikStats') ?? { games: 0, wins: 0, asEvil: 0, evilWins: 0, roles: {} },
  add(role: string, team: string, won: boolean) {
    const s = stats.get();
    s.games++;
    if (won) s.wins++;
    if (team === 'jahat') {
      s.asEvil++;
      if (won) s.evilWins++;
    }
    s.roles[role] = (s.roles[role] ?? 0) + 1;
    store.set('sidikStats', JSON.stringify(s));
  },
};
export const RANKS: [number, string, string][] = [
  [0, 'Detektif Magang', 'tunas'],
  [3, 'Penyidik Muda', 'ui-cari'],
  [8, 'Inspektur', 'kacamata'],
  [15, 'Komisaris', 'stempel'],
  [25, 'Legenda Sidik', 'bintang'],
];
export const rankOf = (wins: number) => [...RANKS].reverse().find(([m]) => wins >= m)!;
