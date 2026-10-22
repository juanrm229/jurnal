/**
 * Paket dan produk. Uang datang dari langganan, benda fisik dari kenangan,
 * dan acara — tidak pernah dari iklan berbasis isi jurnal.
 */
import type { MomentTier } from './domain';

export type PlanCode = 'free' | 'plus' | 'plus_duo';

export interface PlanLimits {
  maxCircles: number;
  voiceSeconds: number;
  videoSeconds: number;
  /** Kapsul waktu & surat masa depan paling jauh (tahun). */
  timeCapsuleYears: number;
  freezesPerMonth: number;
  /** Fitur lingkaran yang terbuka bila minimal satu anggota Plus. */
  lore: boolean;
  dictionary: boolean;
  themes: boolean;
  ostExport: boolean;
  premiumFilm: boolean;
  photosPerDrop: number;
}

export const PLAN_LIMITS: Record<PlanCode, PlanLimits> = {
  free: {
    maxCircles: 2,
    voiceSeconds: 60,
    videoSeconds: 0,
    timeCapsuleYears: 1,
    freezesPerMonth: 2,
    lore: false,
    dictionary: false,
    themes: false,
    ostExport: false,
    premiumFilm: false,
    photosPerDrop: 4,
  },
  plus: {
    maxCircles: 50,
    voiceSeconds: 300,
    videoSeconds: 30,
    timeCapsuleYears: 25,
    freezesPerMonth: 4,
    lore: true,
    dictionary: true,
    themes: true,
    ostExport: true,
    premiumFilm: true,
    photosPerDrop: 10,
  },
  plus_duo: {
    maxCircles: 50,
    voiceSeconds: 300,
    videoSeconds: 30,
    timeCapsuleYears: 25,
    freezesPerMonth: 4,
    lore: true,
    dictionary: true,
    themes: true,
    ostExport: true,
    premiumFilm: true,
    photosPerDrop: 10,
  },
};

export function limitsFor(plan: PlanCode): PlanLimits {
  return PLAN_LIMITS[plan];
}

export type ProductCode =
  | 'plus_monthly'
  | 'plus_yearly'
  | 'plus_duo_monthly'
  | 'plus_duo_yearly'
  | 'gift_plus_yearly'
  | 'gift_plus_duo_yearly'
  | 'book_softcover'
  | 'book_hardcover'
  | `moment_${Exclude<MomentTier, 'coba'>}`
  | `deck_${string}`;

export interface Product {
  code: ProductCode;
  name: string;
  description: string;
  priceIdr: number;
  kind: 'subscription' | 'gift' | 'book' | 'moment' | 'deck';
  /** Lama langganan (hari) untuk subscription & gift. */
  days?: number;
  plan?: PlanCode;
}

export const PRODUCTS: Product[] = [
  { code: 'plus_monthly', name: 'Plus · bulanan', description: 'Lingkaran tanpa batas, voice note lebih panjang, Lore & Kamus Lingkaran.', priceIdr: 29_000, kind: 'subscription', days: 31, plan: 'plus' },
  { code: 'plus_yearly', name: 'Plus · tahunan', description: 'Hemat hampir 30%. Satu tahun penuh hari-hari yang tersimpan.', priceIdr: 249_000, kind: 'subscription', days: 366, plan: 'plus' },
  { code: 'plus_duo_monthly', name: 'Plus Duo · bulanan', description: 'Satu langganan untuk berdua.', priceIdr: 39_000, kind: 'subscription', days: 31, plan: 'plus_duo' },
  { code: 'plus_duo_yearly', name: 'Plus Duo · tahunan', description: 'Hadiah hari jadi yang dipakai setiap hari.', priceIdr: 349_000, kind: 'subscription', days: 366, plan: 'plus_duo' },
  { code: 'gift_plus_yearly', name: 'Hadiah Plus · setahun', description: 'Kode hadiah untuk seseorang yang kamu pilih.', priceIdr: 249_000, kind: 'gift', days: 366, plan: 'plus' },
  { code: 'gift_plus_duo_yearly', name: 'Hadiah Plus Duo · setahun', description: 'Untuk dua orang yang ingin menyimpan hari bersama.', priceIdr: 349_000, kind: 'gift', days: 366, plan: 'plus_duo' },
  { code: 'book_softcover', name: 'Buku Tahunan · sampul lunak', description: '“Tahun Kita” dicetak, dikirim sebelum akhir tahun.', priceIdr: 249_000, kind: 'book' },
  { code: 'book_hardcover', name: 'Buku Tahunan · hardcover', description: 'Sampul keras, kertas tebal, pita pembatas.', priceIdr: 449_000, kind: 'book' },
  { code: 'moment_kecil', name: 'Kapsul Momen · kecil', description: 'Hingga 50 tamu, Wrap acara, QR untuk tamu.', priceIdr: 299_000, kind: 'moment' },
  { code: 'moment_sedang', name: 'Kapsul Momen · sedang', description: 'Hingga 150 tamu.', priceIdr: 599_000, kind: 'moment' },
  { code: 'moment_besar', name: 'Kapsul Momen · besar', description: 'Hingga 400 tamu.', priceIdr: 999_000, kind: 'moment' },
];

export function getProduct(code: string): Product | undefined {
  return PRODUCTS.find((p) => p.code === code);
}

export function formatIdr(n: number): string {
  return 'Rp' + Math.round(n).toLocaleString('id-ID').replace(/,/g, '.');
}
