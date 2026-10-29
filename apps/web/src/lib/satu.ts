/**
 * Klien KARTU SATU (Ruang Main): panggilan meja, polling, kalimat kejadian,
 * daftar aturan untuk lobi, dan catatan menang di perangkat.
 */
import { satu } from '@sehari/core';
import { callGame, useGameRoom } from './sidik';
import { store } from './storage';

export type View = satu.View;
type Profile = { name: string; avatar: string };
const call = <T>(method: string, path: string, body?: unknown) => callGame<T>('satu', method, path, body);

export const createMeja = (p: Profile) => call<View>('POST', '/rooms', p);
export const joinMeja = (code: string, p: Profile) => call<View>('POST', `/rooms/${code}/join`, p);
export const sendSatu = (code: string, action: satu.Action) => call<View>('POST', `/rooms/${code}/act`, { action });
export const leaveMeja = (code: string) => call('POST', `/rooms/${code}/leave`);
export const useMeja = (code: string, opts: { tv?: boolean } = {}) => useGameRoom<View>('satu', code, { ...opts, ms: (v) => (v?.phase === 'main' ? 500 : 1000) });

export const WARNA_HEX: Record<satu.Warna, string> = { m: '#e5483c', k: '#f2b52e', h: '#33a862', b: '#2f6fd6' };

/** Kalimat satu kejadian dari sudut pandang `me`. */
export function kalimat(e: satu.Ev, v: Pick<View, 'players'>, me: string | null): string {
  const nm = (id?: string) => (id === me ? 'kamu' : (v.players.find((p) => p.id === id)?.name ?? '…'));
  const Nm = (id?: string) => {
    const s = nm(id);
    return s === 'kamu' ? 'Kamu' : s;
  };
  const kartu = (cs?: satu.Card[]) => (cs ?? []).map(satu.namaKartu).join(' + ');
  const w = e.warna ? `, warna jadi ${satu.NAMA_WARNA[e.warna]}` : '';
  switch (e.t) {
    case 'ronde':
      return `Ronde ${e.r}. Kartu pembuka: ${kartu(e.kartu)}.`;
    case 'main':
      return e.kartu?.length ? `${Nm(e.by)} memainkan ${kartu(e.kartu)}${w}.` : `${Nm(e.by)} memilih warna ${satu.NAMA_WARNA[e.warna!]}.`;
    case 'salip':
      return `${Nm(e.by)} MENYALIP dengan ${kartu(e.kartu)}!`;
    case 'tarik':
      return `${Nm(e.by)} mengambil ${e.jumlah} kartu.`;
    case 'lewat':
      return `${Nm(e.by)} melewati giliran.`;
    case 'satu':
      return `${Nm(e.by)}: "SATU!"`;
    case 'tangkap':
      return `${Nm(e.by)} menangkap ${nm(e.target)} lupa bilang "satu!" (+${e.jumlah}).`;
    case 'tantang':
      return `${Nm(e.by)} menantang +4 dari ${nm(e.target)}: ${e.berhasil ? 'terbukti curang!' : 'ternyata sah.'}`;
    case 'selesai':
      return `${Nm(e.by)} habis kartunya${e.jumlah && e.jumlah > 1 ? ` (urutan ${e.jumlah})` : ''}!`;
    case 'kocok':
      return 'Tumpukan habis. Kartu buangan dikocok ulang.';
    case 'tukar':
      return `${Nm(e.by)} menukar tangan dengan ${nm(e.target)}.`;
    case 'putar':
      return 'Semua tangan berputar!';
    case 'hukum':
      return `${Nm(e.by)} kena hukuman.`;
  }
}

/** Daftar aturan untuk lobi & lembar aturan. */
export const ATURAN: { k: keyof satu.Opts; nama: string; ket: string }[] = [
  { k: 'pantul', nama: 'Pantul', ket: 'Saat ada tumpukan tambah, Putar Balik berwarna sama memantulkannya, Lewati meneruskannya.' },
  { k: 'salip', nama: 'Salip', ket: 'Punya kartu persis sama dengan kartu teratas? Banting kapan saja, giliran pindah ke kamu.' },
  { k: 'kembar', nama: 'Buang kembar', ket: 'Mainkan beberapa kartu bernilai sama sekaligus (warna boleh beda).' },
  { k: 'tujuhNol', nama: '7-0', ket: '7: tukar tangan dengan pemain pilihan. 0: semua tangan berputar.' },
  { k: 'tarikSampai', nama: 'Tarik sampai dapat', ket: 'Ambil kartu terus sampai dapat yang bisa dimainkan.' },
  { k: 'plus4Bebas', nama: '+4 bebas', ket: '+4 boleh kapan saja, tanpa syarat dan tanpa tantangan.' },
  { k: 'tantang', nama: 'Tantang +4', ket: 'Resmi: +4 hanya sah kalau tidak punya warna yang sedang berlaku. Pemain berikutnya boleh menantang.' },
  { k: 'tutupAngka', nama: 'Tutup dengan angka', ket: 'Kartu terakhir tidak boleh kartu aksi atau kartu hitam.' },
];
export const TUMPUK: Record<satu.Opts['tumpuk'], string> = { tidak: 'tidak boleh (resmi)', sejenis: '+2 di +2, +4 di +4', campur: 'campur (+4 di +2, +2 di +4 warna sama)' };
export const AKHIR: Record<satu.Opts['akhir'], string> = { skor: 'kumpulkan poin (resmi)', sekali: 'satu ronde', pecundang: 'cari yang kalah' };

export interface Rekor {
  main: number;
  menang: number;
  kalah: number;
}
export const rekor = {
  get: (): Rekor => store.json<Rekor>('satuRekor') ?? { main: 0, menang: 0, kalah: 0 },
  catat(code: string, rev: number, menang: boolean, kalah: boolean) {
    const k = `${code}:${rev}`;
    if (store.get('satuTerakhir') === k) return;
    store.set('satuTerakhir', k);
    const r = rekor.get();
    r.main++;
    if (menang) r.menang++;
    if (kalah) r.kalah++;
    store.set('satuRekor', JSON.stringify(r));
  },
};
