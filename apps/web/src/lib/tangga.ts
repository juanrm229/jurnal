/**
 * Klien ULAR TANGGA (Ruang Main): panggilan papan, polling, koordinat kotak,
 * kalimat kejadian, goyang HP untuk melempar dadu, dan catatan menang.
 */
import { tangga } from '@sehari/core';
import { useEffect, useRef } from 'react';
import { callGame, useGameRoom } from './sidik';
import { store } from './storage';

export type View = tangga.View;
type Profile = { name: string; avatar: string };
const call = <T>(method: string, path: string, body?: unknown) => callGame<T>('tangga', method, path, body);

export const createMeja = (p: Profile) => call<View>('POST', '/rooms', p);
export const joinMeja = (code: string, p: Profile) => call<View>('POST', `/rooms/${code}/join`, p);
export const sendTangga = (code: string, action: tangga.Action) => call<View>('POST', `/rooms/${code}/act`, { action });
export const leaveMeja = (code: string) => call('POST', `/rooms/${code}/leave`);
export const useMeja = (code: string, opts: { tv?: boolean } = {}) => useGameRoom<View>('tangga', code, { ...opts, ms: (v) => (v?.phase === 'main' ? 600 : 1000) });

export const PION = ['#e5483c', '#2f6fd6', '#33a862', '#f2b52e', '#8b5cf6', '#ec7a2f'];

/** Pusat kotak `s` (1–100) dalam satuan 0–1000; baris berliku seperti papan asli. */
export function pusat(s: number): [number, number] {
  const row = Math.floor((s - 1) / 10);
  const c = (s - 1) % 10;
  const col = row % 2 === 0 ? c : 9 - c;
  return [col * 100 + 50, (9 - row) * 100 + 50];
}

export function kalimat(e: tangga.Ev, v: Pick<View, 'players'>, me: string | null): string {
  const nm = (id?: string) => (id === me ? 'kamu' : (v.players.find((p) => p.id === id)?.name ?? '…'));
  const Nm = (id?: string) => {
    const s = nm(id);
    return s === 'kamu' ? 'Kamu' : s;
  };
  switch (e.t) {
    case 'mulai':
      return `Permainan dimulai. ${Nm(e.by)} jalan duluan.`;
    case 'lempar':
      return `${Nm(e.by)} melempar ${e.dadu!.join(' & ')}.`;
    case 'gerak': {
      const oleh = e.sebab === 'dorong' ? `${Nm(e.target)} mendorong ${nm(e.by)}` : e.sebab === 'kartu' && e.target ? `${Nm(e.target)} meniup ${nm(e.by)}` : Nm(e.by);
      const lewat = e.lewat === 'ular' ? `, digigit ular, turun ke ${e.ke}` : e.lewat === 'tangga' ? `, naik tangga ke ${e.ke}` : '';
      const tiba = e.lewat ? e.jalur![e.jalur!.length - 2] : e.ke;
      return `${oleh} ${e.sebab === 'dorong' ? 'ke' : 'sampai'} ${tiba}${lewat}.`;
    }
    case 'kartu': {
      const k = tangga.KARTU[e.kartu!];
      const ke = e.target ? ` ke ${nm(e.target)}` : e.kartu === 'gergaji' ? ` (ular di ${e.kotak})` : e.kartu === 'ular' ? ` di kotak ${e.kotak}` : e.kartu === 'emas' ? ` (angka ${e.nilai})` : '';
      return `${Nm(e.by)} memainkan ${k.nama}${ke}.`;
    }
    case 'dapat':
      return `${Nm(e.by)} mendapat kartu${e.by === me ? `: ${tangga.KARTU[e.kartu!].nama}` : ''}.`;
    case 'penawar':
      return `${Nm(e.by)} selamat dari ular berkat Penawar!`;
    case 'musim':
      return e.lewat === 'ular' ? `Musim berganti: ular baru di ${e.kotak} → ${e.nilai}.` : `Musim berganti: tangga baru di ${e.kotak} → ${e.nilai}.`;
    case 'ganda':
      return `Dadu kembar! ${Nm(e.by)} jalan lagi.`;
    case 'menang':
      return `${Nm(e.by)} sampai di 100!`;
  }
}

/** Goyang HP untuk melempar: memanggil `fn` saat guncangan cukup keras. */
export function useGoyang(aktif: boolean, fn: () => void) {
  const f = useRef(fn);
  f.current = fn;
  useEffect(() => {
    if (!aktif) return;
    let last = 0;
    const on = (e: DeviceMotionEvent) => {
      const a = e.accelerationIncludingGravity ?? e.acceleration;
      if (!a) return;
      const g = Math.hypot(a.x ?? 0, a.y ?? 0, a.z ?? 0);
      if (g > 24 && Date.now() - last > 1500) {
        last = Date.now();
        f.current();
      }
    };
    window.addEventListener('devicemotion', on);
    return () => window.removeEventListener('devicemotion', on);
  }, [aktif]);
}

/** iOS meminta izin sensor gerak lewat ketukan. */
export async function izinGoyang(): Promise<boolean> {
  const D = (window as unknown as { DeviceMotionEvent?: { requestPermission?: () => Promise<string> } }).DeviceMotionEvent;
  if (!D) return false;
  if (!D.requestPermission) return true;
  try {
    return (await D.requestPermission()) === 'granted';
  } catch {
    return false;
  }
}

export const rekor = {
  get: () => store.json<{ main: number; menang: number }>('tanggaRekor') ?? { main: 0, menang: 0 },
  catat(code: string, rev: number, menang: boolean) {
    const k = `${code}:${rev}`;
    if (store.get('tanggaTerakhir') === k) return;
    store.set('tanggaTerakhir', k);
    const r = rekor.get();
    r.main++;
    if (menang) r.menang++;
    store.set('tanggaRekor', JSON.stringify(r));
  },
};
