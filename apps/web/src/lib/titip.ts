/**
 * Klien TITIP SURAT (Ruang Main): panggilan meja, polling, kalimat kejadian
 * dari sudut pandang pemain, bunyi kartu, dan catatan menang di perangkat.
 */
import { surat } from '@sehari/core';
import { callGame, useGameRoom } from './sidik';
import { store } from './storage';

export type View = surat.View;
type Profile = { name: string; avatar: string };
const call = <T>(method: string, path: string, body?: unknown) => callGame<T>('titip', method, path, body);

export const createMeja = (p: Profile) => call<View>('POST', '/rooms', p);
export const joinMeja = (code: string, p: Profile) => call<View>('POST', `/rooms/${code}/join`, p);
export const sendTitip = (code: string, action: surat.Action) => call<View>('POST', `/rooms/${code}/act`, { action });
export const leaveMeja = (code: string) => call('POST', `/rooms/${code}/leave`);
/** Cek apakah kode milik meja Titip Surat (untuk kotak kode di Ruang Main). */
export const adaMeja = (code: string) =>
  call<View>('GET', `/rooms/${code}?tv=1`).then(
    () => true,
    () => false,
  );

/** Polling cepat saat permainan berjalan supaya kartu bot terasa hidup. */
export const useMeja = (code: string, opts: { tv?: boolean } = {}) => useGameRoom<View>('titip', code, { ...opts, ms: (v) => (v?.phase === 'main' ? 600 : 1000) });

export const namaKartu = (v: number) => surat.jenis(v).nama;

/** Kalimat satu kejadian, dari sudut pandang `me` (null = layar TV). */
export function kalimat(e: surat.Ev, v: Pick<View, 'players'>, me: string | null): { teks: string; rahasia?: string } {
  const nm = (id?: string) => (id === me ? 'kamu' : (v.players.find((p) => p.id === id)?.name ?? '…'));
  const Nm = (id?: string) => {
    const s = nm(id);
    return s === 'kamu' ? 'Kamu' : s;
  };
  const k = (x?: number) => (x === undefined ? '' : `${namaKartu(x)} (${x})`);
  const rahasia = me && e.priv?.[me]?.map((l) => `${Nm(l.pid)} memegang ${k(l.v)}.`).join(' ');
  switch (e.t) {
    case 'ronde':
      return { teks: `Ronde ${e.r} dimulai. ${Nm(e.by)} jalan duluan.` };
    case 'buang':
      return { teks: `${Nm(e.by)} membuang ${k(e.v)}.` };
    case 'keluar':
      return { teks: `${Nm(e.by)} tersingkir${e.buka?.length ? `, kartunya ${e.buka.map((b) => k(b.v)).join(' & ')}` : ''}.` };
    case 'pos':
      return { teks: `${Nm(e.by)} mengembalikan ${e.v} kartu ke bawah tumpukan.` };
    case 'main': {
      const by = Nm(e.by);
      const kartu = namaKartu(e.v!);
      if (e.hampa) return { teks: `${by} memainkan ${kartu}, tapi semua terlindung. Tanpa efek.` };
      const t = nm(e.target);
      const teks = {
        0: `${by} memainkan Pengagum Rahasia.`,
        1: `${by} memainkan Teman Kepo: "${t}, kamu pegang ${namaKartu(e.tebak ?? 0)}?" ${e.kena ? 'Tepat!' : 'Meleset.'}`,
        2: `${by} curhat ke ${t} dan melihat kartunya.`,
        3: `${by} menantang ${t} lewat Saingan.`,
        4: `${by} memainkan Sahabat dan terlindung sampai giliran berikutnya.`,
        5: `${by} memainkan Adik Usil ke ${e.target === e.by ? (e.by === me ? 'dirimu sendiri' : 'dirinya sendiri') : t}.`,
        6: `${by} memainkan Tukang Pos dan mengambil dua kartu.`,
        7: `${by} memainkan Ayah dan bertukar kartu dengan ${t}.`,
        8: `${by} memainkan Ibu.`,
        9: `${by} melepas Dia.`,
      }[e.v!]!;
      return { teks, rahasia: rahasia || undefined };
    }
  }
}

// ── Bunyi ────────────────────────────────────────────────────────────────────

let ac: AudioContext | null = null;
function nada(freq: number, dur: number, type: OscillatorType = 'sine', vol = 0.1, at = 0) {
  try {
    const a = (ac ??= new AudioContext());
    const t = a.currentTime + at;
    const o = a.createOscillator();
    const g = a.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(a.destination);
    o.start(t);
    o.stop(t + dur + 0.05);
  } catch {}
}
export const bunyi = {
  /** Kertas kartu diletakkan: dua klik pendek. */
  kartu: () => (nada(900, 0.05, 'triangle', 0.05), nada(620, 0.08, 'triangle', 0.04, 0.04)),
  giliran: () => [660, 880].forEach((f, i) => nada(f, 0.25, 'sine', 0.07, i * 0.12)),
  keluar: () => [392, 311, 233].forEach((f, i) => nada(f, 0.4, 'triangle', 0.06, i * 0.13)),
  perangko: () => [523, 659, 784, 1047].forEach((f, i) => nada(f, 0.45, 'sine', 0.06, i * 0.1)),
  menang: () => [523, 659, 784, 659, 784, 1047].forEach((f, i) => nada(f, 0.5, 'triangle', 0.07, i * 0.14)),
};

// ── Catatan pribadi ──────────────────────────────────────────────────────────

export interface Rekor {
  main: number;
  menang: number;
  perangko: number;
}
export const rekor = {
  get: (): Rekor => store.json<Rekor>('titipRekor') ?? { main: 0, menang: 0, perangko: 0 },
  catat(code: string, rev: number, menang: boolean, perangko: number) {
    const k = `${code}:${rev}`;
    if (store.get('titipTerakhir') === k) return;
    store.set('titipTerakhir', k);
    const r = rekor.get();
    r.main++;
    if (menang) r.menang++;
    r.perangko += perangko;
    store.set('titipRekor', JSON.stringify(r));
  },
};
