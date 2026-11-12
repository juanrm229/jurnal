/**
 * Kota Sehari: satu kota fiksi publik di atas peta ilustrasi buatan sendiri.
 * Wilayah berupa poligon di ruang peta 2000×1125; persil adalah rumah yang
 * tergambar di peta (data dari scripts/peta/sangkala.mjs), jadi tiap persil
 * punya id, letak, dan alamat tetap.
 */
import { SANGKALA_PERSIL, SANGKALA_WILAYAH } from './kotaData';

export const KOTA_W = 2000;
export const KOTA_H = 1125;
export const KOTA_TAHUN = { min: 1900, max: 2030 } as const;
export const KOTA_MUSIM = 1;
/** Rumah tanpa adegan terbit setelah sekian hari kembali lowong. */
export const KOTA_TERBENGKALAI_HARI = 14;
/** Laporan dari orang berbeda yang menyembunyikan rumah sampai ditinjau. */
export const KOTA_LAPOR_SEMBUNYI = 3;

export type KotaPoint = [number, number];

export interface KotaRegion {
  id: string;
  name: string;
  watak: string;
  /** Tahun wilayah ini mulai dihuni; sebelum itu tampil sebagai lahan kosong di penggeser zaman. */
  since: number;
  /** Musim dibukanya untuk dipatok; null = belum (alam atau tempat bersama). */
  musim: number | null;
  poly: KotaPoint[];
  /** Posisi label di peta. */
  label: KotaPoint;
}

/** Nama kota. Sangkala: kalimat yang menyandikan tahun, untuk kota yang hidup lewat lapisan zaman. */
export const KOTA_NAMA = 'Sangkala';
export const KOTA_ID = 'sangkala';
/** Wilayah Kota Sangkala, dihasilkan oleh scripts/peta/sangkala.mjs bersama gambarnya. */
export const KOTA_WILAYAH: KotaRegion[] = SANGKALA_WILAYAH;

export const kotaRegion = (id: string) => KOTA_WILAYAH.find((r) => r.id === id);

export function kotaInside(p: KotaPoint, poly: KotaPoint[]): boolean {
  let ins = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i]!;
    const [xj, yj] = poly[j]!;
    if (yi > p[1] !== yj > p[1] && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) ins = !ins;
  }
  return ins;
}

export function kotaBBox(poly: KotaPoint[]) {
  const xs = poly.map((p) => p[0]);
  const ys = poly.map((p) => p[1]);
  return { x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys) };
}

export interface KotaPlot {
  id: string;
  region: string;
  x: number;
  y: number;
  address: string;
}

const PLOTS = new Map<string, KotaPlot[]>();
const BY_ID = new Map<string, KotaPlot>();
for (const [id, region, x, y, address] of SANGKALA_PERSIL) {
  const p = { id, region, x, y, address };
  if (!PLOTS.has(region)) PLOTS.set(region, []);
  PLOTS.get(region)!.push(p);
  BY_ID.set(id, p);
}

/** Persil dalam satu wilayah: setiap persil adalah rumah yang tergambar di peta. */
export const kotaPlots = (regionId: string): KotaPlot[] => PLOTS.get(regionId) ?? [];
export const kotaPlot = (id: string): KotaPlot | undefined => BY_ID.get(id);

export const kotaOpen = (r: KotaRegion) => r.musim !== null && r.musim <= KOTA_MUSIM;

/** Dua rentang tahun (inklusif) bertumpuk? */
export const kotaOverlap = (a: { from: number; to: number }, b: { from: number; to: number }) => a.from <= b.to && b.from <= a.to;

/** Rentang yang masih lowong di sebuah persil, dari rentang yang sudah terisi. */
export function kotaFree(taken: { from: number; to: number }[], min: number = KOTA_TAHUN.min, max: number = KOTA_TAHUN.max): { from: number; to: number }[] {
  const s = [...taken].sort((a, b) => a.from - b.from);
  const out: { from: number; to: number }[] = [];
  let cur = min;
  for (const t of s) {
    if (t.from > cur) out.push({ from: cur, to: Math.min(max, t.from - 1) });
    cur = Math.max(cur, t.to + 1);
  }
  if (cur <= max) out.push({ from: cur, to: max });
  return out.filter((x) => x.from <= x.to);
}

/** Nama pena kota: 3–24 huruf, angka, titik, garis bawah, atau tanda hubung. */
export const KOTA_PENA_RE = /^[a-z0-9][a-z0-9._-]{2,23}$/;

// ── Ketuk: hubungan antar-rumah ─────────────────────────────────────────────

/** "X adalah [jenis] dari Y". `balik` adalah jenis yang sama dilihat dari Y. */
export const KOTA_HUBUNGAN = {
  anak: { label: 'anak', balik: 'orangtua' },
  orangtua: { label: 'orang tua', balik: 'anak' },
  saudara: { label: 'saudara', balik: 'saudara' },
  pasangan: { label: 'pasangan', balik: 'pasangan' },
  keturunan: { label: 'keturunan', balik: 'leluhur' },
  leluhur: { label: 'leluhur', balik: 'keturunan' },
  tetangga: { label: 'tetangga', balik: 'tetangga' },
  teman: { label: 'teman lama', balik: 'teman' },
  musuh: { label: 'musuh', balik: 'musuh' },
  cinta: { label: 'cinta lama', balik: 'cinta' },
} as const;
export type KotaHubungan = keyof typeof KOTA_HUBUNGAN;
export const KOTA_HUBUNGAN_IDS = Object.keys(KOTA_HUBUNGAN) as KotaHubungan[];

/** Riwayat hidup singkat seorang tokoh untuk diperiksa: tahun lahir/wafat dan rentang rumahnya. */
export interface KotaJiwa {
  name: string;
  born?: number;
  died?: number;
  from: number;
  to: number;
}

export interface KotaCek {
  ok: boolean;
  /** Belum bisa diperiksa (tahun lahir kosong); tidak menghalangi. */
  warn?: boolean;
  text: string;
}

/** Periksa apakah hubungan masuk akal menurut waktu. Kegagalan (ok=false) menghalangi ketukan. */
export function kotaCekHubungan(type: KotaHubungan, a: KotaJiwa, b: KotaJiwa): KotaCek[] {
  const out: KotaCek[] = [];
  const alive = (x: KotaJiwa) => ({ s: x.born ?? x.from, e: x.died ?? Math.max(x.to, (x.born ?? x.from) + 60) });
  if (a.born === undefined || b.born === undefined) out.push({ ok: true, warn: true, text: `Tahun lahir ${a.born === undefined ? a.name : b.name} belum diisi, jadi usia belum bisa diperiksa.` });
  const older = (p: KotaJiwa, c: KotaJiwa, gap: number, what: string) => {
    if (p.born === undefined || c.born === undefined) return;
    const d = c.born - p.born;
    out.push(d >= gap ? { ok: true, text: `${p.name} ${d} tahun lebih tua dari ${c.name}.` } : { ok: false, text: `${what} perlu setidaknya ${gap} tahun lebih tua; selisihnya ${d} tahun.` });
    if (gap < 30 && p.died !== undefined && p.died < c.born - 1) out.push({ ok: false, text: `${p.name} wafat ${p.died}, sebelum ${c.name} lahir (${c.born}).` });
  };
  if (type === 'anak') older(b, a, 15, `${b.name} sebagai orang tua`);
  else if (type === 'orangtua') older(a, b, 15, `${a.name} sebagai orang tua`);
  else if (type === 'keturunan') older(b, a, 30, `${b.name} sebagai leluhur`);
  else if (type === 'leluhur') older(a, b, 30, `${a.name} sebagai leluhur`);
  else if (type === 'saudara') {
    if (a.born !== undefined && b.born !== undefined) {
      const d = Math.abs(a.born - b.born);
      out.push(d <= 25 ? { ok: true, text: `Selisih usia ${d} tahun.` } : { ok: false, text: `Selisih usia ${d} tahun terlalu jauh untuk saudara kandung.` });
    }
  } else {
    const x = alive(a);
    const y = alive(b);
    const meet = Math.max(x.s, y.s) <= Math.min(x.e, y.e);
    out.push(meet ? { ok: true, text: `Hidup mereka bersinggungan sekitar ${Math.max(x.s, y.s)}–${Math.min(x.e, y.e)}.` } : { ok: false, text: `${a.name} dan ${b.name} tidak pernah hidup di masa yang sama.` });
    if (type === 'tetangga') out.push(kotaOverlap(a, b) ? { ok: true, text: 'Rumah mereka berdiri di zaman yang sama.' } : { ok: false, text: 'Rumah mereka tidak berdiri di zaman yang sama.' });
  }
  return out;
}

/** Kuota musim: satu rumah utama, dan beberapa rumah leluhur di zaman lebih awal. */
export const KOTA_KUOTA = { rumah: 1, leluhur: 2 } as const;
