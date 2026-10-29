/**
 * Klien KEMBANG API (Ruang Main): panggilan meja, polling, warna kartu,
 * kalimat kejadian, bunyi letupan, dan rekor skor tertinggi.
 */
import { hanabi } from '@sehari/core';
import { callGame, useGameRoom } from './sidik';
import { store } from './storage';

export type View = hanabi.View;
type Profile = { name: string; avatar: string };
const call = <T>(method: string, path: string, body?: unknown) => callGame<T>('kembang', method, path, body);

export const createMeja = (p: Profile) => call<View>('POST', '/rooms', p);
export const joinMeja = (code: string, p: Profile) => call<View>('POST', `/rooms/${code}/join`, p);
export const sendKembang = (code: string, action: hanabi.Action) => call<View>('POST', `/rooms/${code}/act`, { action });
export const leaveMeja = (code: string) => call('POST', `/rooms/${code}/leave`);
export const useMeja = (code: string, opts: { tv?: boolean } = {}) => useGameRoom<View>('kembang', code, { ...opts, ms: (v) => (v?.phase === 'main' ? 700 : 1000) });

export const HEX: Record<hanabi.Warna, string> = { m: '#e5483c', k: '#f2b52e', h: '#33a862', b: '#2f6fd6', p: '#a3a3ad', x: '#8b5cf6' };

export function kalimat(e: hanabi.Ev, v: Pick<View, 'players'>, me: string | null): string {
  const nm = (id?: string) => (id === me ? 'kamu' : (v.players.find((p) => p.id === id)?.name ?? '…'));
  const Nm = (id?: string) => {
    const s = nm(id);
    return s === 'kamu' ? 'Kamu' : s;
  };
  const k = (c?: hanabi.Card) => (c ? `${hanabi.NAMA_WARNA[c.w]} ${c.n}` : '');
  switch (e.t) {
    case 'mulai':
      return `Pertunjukan dimulai. ${Nm(e.by)} jalan duluan.`;
    case 'petunjuk':
      return `${Nm(e.by)} memberi petunjuk ke ${nm(e.ke)}: ${e.warna ? `"${hanabi.NAMA_WARNA[e.warna]}"` : `"${e.angka}"`} (${e.sentuh?.length} kartu).`;
    case 'main':
      return `${Nm(e.by)} menyalakan ${k(e.kartu)}!`;
    case 'gagal':
      return `${Nm(e.by)} salah memainkan ${k(e.kartu)}. Sumbu terbakar!`;
    case 'buang':
      return `${Nm(e.by)} membuang ${k(e.kartu)}.`;
    case 'selesai-warna':
      return `Kembang api ${hanabi.NAMA_WARNA[e.warna!]} lengkap! Satu token kembali.`;
    case 'terakhir':
      return 'Kartu terakhir sudah diambil. Setiap orang tinggal satu giliran!';
    case 'akhir':
      return `Pertunjukan selesai. Skor ${e.skor}.`;
  }
}

let ac: AudioContext | null = null;
/** Letupan kembang api: desis naik lalu ledakan kecil. */
export function bunyiLetup(nada = 1) {
  try {
    const a = (ac ??= new AudioContext());
    const t = a.currentTime;
    const o = a.createOscillator();
    const g = a.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(300 * nada, t);
    o.frequency.exponentialRampToValueAtTime(1400 * nada, t + 0.35);
    g.gain.setValueAtTime(0.05, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
    o.connect(g).connect(a.destination);
    o.start(t);
    o.stop(t + 0.42);
    const n = a.sampleRate * 0.5;
    const buf = a.createBuffer(1, n, a.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 2) * 0.5;
    const src = a.createBufferSource();
    src.buffer = buf;
    const f = a.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = 1800;
    src.connect(f).connect(a.destination);
    src.start(t + 0.38);
  } catch {}
}

export const rekor = {
  get: () => store.json<{ main: number; terbaik: number }>('kembangRekor') ?? { main: 0, terbaik: 0 },
  catat(code: string, rev: number, skor: number) {
    const k = `${code}:${rev}`;
    if (store.get('kembangTerakhir') === k) return;
    store.set('kembangTerakhir', k);
    const r = rekor.get();
    r.main++;
    r.terbaik = Math.max(r.terbaik, skor);
    store.set('kembangRekor', JSON.stringify(r));
  },
};
