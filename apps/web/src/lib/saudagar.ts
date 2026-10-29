/**
 * Klien SAUDAGAR (Ruang Main): panggilan meja, polling, kalimat kejadian,
 * letak petak di papan, warna pemain, dan catatan menang di perangkat.
 */
import { saudagar } from '@sehari/core';
import { callGame, useGameRoom } from './sidik';
import { store } from './storage';

export type View = saudagar.View;
type Profile = { name: string; avatar: string };
const call = <T>(method: string, path: string, body?: unknown) => callGame<T>('saudagar', method, path, body);

export const createMeja = (p: Profile) => call<View>('POST', '/rooms', p);
export const joinMeja = (code: string, p: Profile) => call<View>('POST', `/rooms/${code}/join`, p);
export const sendSaudagar = (code: string, action: saudagar.Action) => call<View>('POST', `/rooms/${code}/act`, { action });
export const leaveMeja = (code: string) => call('POST', `/rooms/${code}/leave`);
export const useMeja = (code: string, opts: { tv?: boolean } = {}) => useGameRoom<View>('saudagar', code, { ...opts, ms: (v) => (v?.phase === 'main' ? (v.fase === 'lelang' ? 400 : 650) : 1000) });

export const WARNA_PEMAIN = ['#e5483c', '#2f6fd6', '#33a862', '#f2b52e', '#8b5cf6', '#ec7a2f', '#0e9aa7', '#c2417a'];
export const rp = saudagar.rp;

/** Letak petak `i` pada grid 11×11 (baris, kolom), dimulai dari pojok kanan bawah. */
export function letak(i: number): [number, number] {
  if (i <= 10) return [11, 11 - i];
  if (i < 20) return [11 - (i - 10), 1];
  if (i <= 30) return [1, 1 + (i - 20)];
  return [1 + (i - 30), 11];
}
/** Sisi papan petak `i`: menentukan letak strip warna. */
export const sisi = (i: number) => (i < 10 ? 'bawah' : i < 20 ? 'kiri' : i < 30 ? 'atas' : 'kanan');

export function kalimat(e: saudagar.Ev, v: Pick<View, 'players'>, me: string | null): string {
  const nm = (id?: string) => (id === me ? 'kamu' : (v.players.find((p) => p.id === id)?.name ?? '…'));
  const Nm = (id?: string) => {
    const s = nm(id);
    return s === 'kamu' ? 'Kamu' : s;
  };
  const pt = (i?: number) => (i === undefined ? '' : saudagar.PETAK[i]!.nama);
  switch (e.t) {
    case 'mulai':
      return `Permainan dimulai. ${Nm(e.by)} jalan duluan.`;
    case 'lempar':
      return `${Nm(e.by)} melempar ${e.dadu!.join(' & ')}${e.dadu![0] === e.dadu![1] ? ' (kembar!)' : ''}.`;
    case 'gerak':
      return `${Nm(e.by)} tiba di ${pt(e.kotak)}.`;
    case 'beli':
      return `${Nm(e.by)} membeli ${pt(e.kotak)} seharga ${rp(e.jumlah!)}.`;
    case 'sewa':
      return e.teks === 'sewa' ? `${Nm(e.by)} membayar sewa ${rp(e.jumlah!)} ke ${nm(e.ke)}.` : `${Nm(e.by)} membayar ${rp(e.jumlah!)} ke ${nm(e.ke)}.`;
    case 'bayar':
      return `${Nm(e.by)} membayar ${e.teks} ${rp(e.jumlah!)}.`;
    case 'terima':
      return `${Nm(e.by)} menerima ${rp(e.jumlah!)}.`;
    case 'kartu': {
      const k = saudagar.KARTU[e.kartu!]!;
      return `${Nm(e.by)} membuka ${k.dek === 'k' ? 'Kesempatan' : 'Dana Umum'}: "${k.teks}"`;
    }
    case 'penjara':
      return `${Nm(e.by)} masuk penjara!`;
    case 'bebas':
      return e.teks === 'kembar' ? `${Nm(e.by)} bebas dari penjara dengan dadu kembar.` : e.teks === 'kartu' ? `${Nm(e.by)} bebas dengan kartu bebas penjara.` : `${Nm(e.by)} membayar denda dan bebas dari penjara.`;
    case 'lelang':
      return `${pt(e.kotak)} dilelang!`;
    case 'menang-lelang':
      return e.by ? `${Nm(e.by)} memenangi lelang ${pt(e.kotak)} seharga ${rp(e.jumlah!)}.` : `Tidak ada yang menawar ${pt(e.kotak)}.`;
    case 'bangun':
      return `${Nm(e.by)} membangun ${e.jumlah === 5 ? 'hotel' : `rumah ke-${e.jumlah}`} di ${pt(e.kotak)}.`;
    case 'jual':
      return `${Nm(e.by)} menjual bangunan di ${pt(e.kotak)}.`;
    case 'gadai':
      return `${Nm(e.by)} menggadaikan ${pt(e.kotak)}.`;
    case 'tebus':
      return `${Nm(e.by)} menebus ${pt(e.kotak)}.`;
    case 'tukar':
      return e.teks === 'ditolak' ? `${Nm(e.ke)} menolak tawaran ${nm(e.by)}.` : `${Nm(e.by)} dan ${nm(e.ke)} sepakat bertukar.`;
    case 'bangkrut':
      return `${Nm(e.by)} bangkrut${e.ke ? `; semua asetnya jatuh ke ${nm(e.ke)}` : ''}.`;
    case 'parkir':
      return `${Nm(e.by)} mendapat jackpot Parkir Bebas ${rp(e.jumlah!)}!`;
    case 'start':
      return `${Nm(e.by)} melewati Mulai: +${rp(e.jumlah!)}.`;
    case 'ganda':
      return `${Nm(e.by)} kembar tiga kali berturut-turut: langsung ke penjara!`;
    case 'waktu':
      return `Waktu habis! Kekayaan terbesar: ${nm(e.by)} (${rp(e.jumlah!)}).`;
    case 'selesai':
      return `${Nm(e.by)} menjadi saudagar terkaya!`;
  }
}

export const rekor = {
  get: () => store.json<{ main: number; menang: number }>('saudagarRekor') ?? { main: 0, menang: 0 },
  catat(code: string, rev: number, menang: boolean) {
    const k = `${code}:${rev}`;
    if (store.get('saudagarTerakhir') === k) return;
    store.set('saudagarTerakhir', k);
    const r = rekor.get();
    r.main++;
    if (menang) r.menang++;
    store.set('saudagarRekor', JSON.stringify(r));
  },
};
