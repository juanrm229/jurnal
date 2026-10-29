/**
 * Klien KUCING PETASAN (Ruang Main): panggilan meja, polling cepat (jendela
 * Ogah! hanya beberapa detik), kalimat kejadian, bunyi ledakan, dan rekor.
 */
import { petasan } from '@sehari/core';
import { callGame, useGameRoom } from './sidik';
import { store } from './storage';

export type View = petasan.View;
type Profile = { name: string; avatar: string };
const call = <T>(method: string, path: string, body?: unknown) => callGame<T>('petasan', method, path, body);

export const createMeja = (p: Profile) => call<View>('POST', '/rooms', p);
export const joinMeja = (code: string, p: Profile) => call<View>('POST', `/rooms/${code}/join`, p);
export const sendPetasan = (code: string, action: petasan.Action) => call<View>('POST', `/rooms/${code}/act`, { action });
export const leaveMeja = (code: string) => call('POST', `/rooms/${code}/leave`);
export const useMeja = (code: string, opts: { tv?: boolean } = {}) => useGameRoom<View>('petasan', code, { ...opts, ms: (v) => (v?.phase === 'main' ? (v.fase === 'ogah' ? 350 : 550) : 1000) });

export const nama = (j: petasan.Jenis) => petasan.KARTU[j].nama;

export function kalimat(e: petasan.Ev, v: Pick<View, 'players'>, me: string | null): string {
  const nm = (id?: string) => (id === me ? 'kamu' : (v.players.find((p) => p.id === id)?.name ?? '…'));
  const Nm = (id?: string) => {
    const s = nm(id);
    return s === 'kamu' ? 'Kamu' : s;
  };
  const ks = (e.kartu ?? []).map(nama);
  switch (e.t) {
    case 'mulai':
      return `Permainan dimulai. Ada ${e.jumlah} Kucing Petasan di tumpukan. ${Nm(e.by)} jalan duluan.`;
    case 'main':
      return e.jumlah === 1 ? `${Nm(e.by)} memainkan ${ks[0]}${e.ke ? ` ke ${nm(e.ke)}` : ''}.` : e.jumlah === 5 ? `${Nm(e.by)} memainkan lima kartu berbeda untuk memungut buangan.` : `${Nm(e.by)} memainkan ${e.jumlah} ${ks[0]} ke ${nm(e.ke)}.`;
    case 'ogah':
      return `${Nm(e.by)}: "OGAH!"${(e.jumlah ?? 0) > 1 ? ` (${e.jumlah}×)` : ''}`;
    case 'batal':
      return `${ks[0]} dari ${nm(e.by)} batal.`;
    case 'ambil':
      return `${Nm(e.by)} mengambil kartu. Aman.`;
    case 'curi':
      return `${Nm(e.by)} mencuri satu kartu dari ${nm(e.ke)}.`;
    case 'beri':
      return `${Nm(e.by)} memberi satu kartu ke ${nm(e.ke)}.`;
    case 'kocok':
      return `${Nm(e.by)} mengocok tumpukan.`;
    case 'terawang':
      return `${Nm(e.by)} menerawang tiga kartu teratas.`;
    case 'petasan':
      return `${Nm(e.by)} mengambil KUCING PETASAN!`;
    case 'jinak':
      return `${Nm(e.by)} menyiram petasannya dan menyelipkannya kembali… di suatu tempat.`;
    case 'ledak':
      return `DUAR! ${Nm(e.by)} meledak.`;
    case 'menang':
      return `${Nm(e.by)} satu-satunya yang selamat!`;
    case 'serbu':
      return `${Nm(e.by)} menyerbu! ${Nm(e.ke)} harus jalan ${e.jumlah} giliran.`;
    case 'kabur':
      return `${Nm(e.by)} kabur tanpa mengambil kartu.`;
    case 'kosong':
      return `${Nm(e.ke)} tidak punya kartu untuk diambil.`;
    case 'sebut':
      return `${Nm(e.by)} meminta ${ks[0]} dari ${nm(e.ke)}: ${e.berhasil ? 'dapat!' : 'tidak punya.'}`;
    case 'pungut':
      return `${Nm(e.by)} memungut ${ks[0]} dari buangan.`;
  }
}

let ac: AudioContext | null = null;
/** Ledakan: semburan derau yang meredam, ditambah dentum rendah. */
export function bunyiLedak() {
  try {
    const a = (ac ??= new AudioContext());
    const n = a.sampleRate * 1.2;
    const buf = a.createBuffer(1, n, a.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 3);
    const src = a.createBufferSource();
    src.buffer = buf;
    const f = a.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 900;
    const g = a.createGain();
    g.gain.value = 0.5;
    src.connect(f).connect(g).connect(a.destination);
    src.start();
    const o = a.createOscillator();
    const og = a.createGain();
    o.frequency.setValueAtTime(90, a.currentTime);
    o.frequency.exponentialRampToValueAtTime(30, a.currentTime + 0.6);
    og.gain.setValueAtTime(0.4, a.currentTime);
    og.gain.exponentialRampToValueAtTime(0.001, a.currentTime + 0.7);
    o.connect(og).connect(a.destination);
    o.start();
    o.stop(a.currentTime + 0.75);
  } catch {}
}
/** Sumbu terbakar: desis pendek. */
export function bunyiSumbu() {
  try {
    const a = (ac ??= new AudioContext());
    const n = a.sampleRate * 0.5;
    const buf = a.createBuffer(1, n, a.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * 0.25;
    const src = a.createBufferSource();
    src.buffer = buf;
    const f = a.createBiquadFilter();
    f.type = 'highpass';
    f.frequency.value = 3000;
    src.connect(f).connect(a.destination);
    src.start();
  } catch {}
}

export const rekor = {
  get: () => store.json<{ main: number; selamat: number }>('petasanRekor') ?? { main: 0, selamat: 0 },
  catat(code: string, rev: number, selamat: boolean) {
    const k = `${code}:${rev}`;
    if (store.get('petasanTerakhir') === k) return;
    store.set('petasanTerakhir', k);
    const r = rekor.get();
    r.main++;
    if (selamat) r.selamat++;
    store.set('petasanRekor', JSON.stringify(r));
  },
};
