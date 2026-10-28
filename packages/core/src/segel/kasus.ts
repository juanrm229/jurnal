/**
 * Mesin kasus SEBELUM DISEGEL: model kejadian, bukti terstruktur, pemecah
 * dunia, dan pembangkit kasus prosedural.
 *
 * Kejadian = satu dunia (pelaku p, jalur r, waktu t). Setiap bukti adalah
 * fakta terstruktur yang membatasi dunia mana yang mungkin. Salinan bukti
 * bisa disunting (jam digeser, label diganti, waktu dikaburkan), sehingga
 * pemain harus membedakan isi salinan, asal sumber, dan fakta yang terbukti.
 */
import type { Tema } from './tema';

export interface Dim {
  /** Jumlah tersangka. */
  K: number;
  /** Jumlah jalur. */
  R: number;
  /** Jumlah slot waktu (selang 7 menit). */
  T: number;
}
export interface World {
  p: number;
  r: number;
  t: number;
}
export type Anchor = 'p' | 'r' | 't';
export const ANCHORS: Anchor[] = ['p', 'r', 't'];

export type Fact =
  /** Rekaman utuh: x berada di tempat lain pada slot t. */
  | { k: 'alibi'; x: number; t: number; at: number }
  /** Sensor pintu. once: hanya satu bukaan malam itu (jalur r ⇒ waktu t). */
  | { k: 'door'; r: number; t: number; once: boolean }
  /** Jalur r tidak bisa dilalui pada slot-slot ts. */
  | { k: 'locks'; r: number; ts: number[]; why: number }
  /** Kamera dev merekam benda pada jam kamera d. r: jalur bila tertulis jelas; folder: label ekspor (bisa menyesatkan). */
  | { k: 'sight'; dev: number; d: number; r: number | null; folder: number | null; kas: boolean }
  /** Survei dudukan kamera. */
  | { k: 'mount'; dev: number; r: number }
  /** Selisih jam kamera: KAS = jam kamera + off. */
  | { k: 'calib'; dev: number; off: number }
  /** Benda sudah di tujuan pada slot t (kejadian ≤ t). */
  | { k: 'found'; t: number }
  /** x hanya punya akses ke jalur rs. */
  | { k: 'keys'; x: number; rs: number[] }
  /** x tidak membawa barang lewat r. */
  | { k: 'jejak'; x: number; r: number }
  /** Kamera lorong r menyala pada slot t dan tidak merekam benda. */
  | { k: 'blank'; r: number; t: number }
  /** Kesaksian manusia. Hanya dipakai pembuktian bila garis pandangnya terbukti. */
  | { k: 'witness'; w: number; x: number | null; r: number | null; t: number | null; hearsay: boolean }
  | { k: 'vantage'; w: number; ok: boolean }
  | { k: 'trace'; x: number; r: number }
  | { k: 'motive'; x: number }
  | { k: 'roster' }
  | { k: 'debunk'; w: number; w2: number }
  /** Kabar umpan (tanpa sumber). */
  | { k: 'rumor'; x: number; r: number; t: number };

export interface Model {
  dim: Dim;
  w: World;
  decoy: World;
  /** Kamera: 0 = kamera jam liar (off ≠ 0), 1 = kamera cadangan (KAS). */
  devs: { r: number; off: number }[];
  place: number[][];
  pass: boolean[][];
  keys: boolean[][];
  camOn: boolean[][];
  wits: { saw: boolean; x: number | null; r: number | null; t: number | null }[];
  /** Apakah serat pada jejak benar-benar unik. */
  fiberUnique: boolean;
}

export interface Report {
  id: string;
  ch: number;
  /** Indeks kursi pemegang (urutan pemain). -1 = tidak dibagikan. */
  holder: number;
  f: Fact;
  /** Kunci independensi sumber: dua laporan dengan src sama dihitung satu. */
  src: string;
  /** Hanya server: bukti yang menyesatkan atau tidak bisa diandalkan. */
  herring?: boolean;
  /** Keluaran profesi (tidak bisa disunting). */
  out?: boolean;
  umpan?: boolean;
}

export interface Item {
  f: Fact;
  blur?: boolean;
}

export function dimFor(n: number): Dim {
  if (n <= 7) return { K: 4, R: 3, T: 3 };
  if (n <= 11) return { K: 5, R: 3, T: 4 };
  return { K: 6, R: 4, T: 4 };
}

/** Bukti per kursi per bab: meja kecil butuh lebih banyak bahan. */
export const perSeat = (n: number) => (n <= 2 ? 3 : n <= 4 ? 2 : 1);

// ── Pemecah dunia ───────────────────────────────────────────────────────────

export type Pred = (w: World) => boolean;

/**
 * Batasan dari sekumpulan bukti (dibaca apa adanya). Kesaksian hanya dipakai
 * bila garis pandang saksinya terbukti (atau witness: 'all').
 */
export function constraints(items: Item[], opt: { witness?: 'vantage' | 'all' } = {}): Pred[] {
  const mounts = new Map<number, number>();
  const calibs = new Map<number, number>();
  const seen = new Set<number>();
  for (const { f } of items) {
    if (f.k === 'mount') mounts.set(f.dev, f.r);
    if (f.k === 'calib') calibs.set(f.dev, f.off);
    if (f.k === 'vantage' && f.ok) seen.add(f.w);
  }
  const out: Pred[] = [];
  for (const { f, blur } of items) {
    switch (f.k) {
      case 'alibi':
        out.push((w) => !(w.p === f.x && w.t === f.t));
        break;
      case 'door':
        if (f.once && !blur) out.push((w) => w.r !== f.r || w.t === f.t);
        break;
      case 'locks':
        if (!blur) out.push((w) => !(w.r === f.r && f.ts.includes(w.t)));
        break;
      case 'sight': {
        const r = f.r ?? mounts.get(f.dev);
        const off = f.kas ? 0 : calibs.get(f.dev);
        if (r !== undefined) out.push((w) => w.r === r);
        if (off !== undefined && !blur) out.push((w) => w.t === f.d + off);
        break;
      }
      case 'found':
        if (!blur) out.push((w) => w.t <= f.t);
        break;
      case 'keys':
        out.push((w) => w.p !== f.x || f.rs.includes(w.r));
        break;
      case 'jejak':
        out.push((w) => !(w.p === f.x && w.r === f.r));
        break;
      case 'blank':
        if (!blur) out.push((w) => !(w.r === f.r && w.t === f.t));
        break;
      case 'witness':
        if (opt.witness === 'all' || seen.has(f.w)) {
          out.push((w) => (f.x === null || w.p === f.x) && (f.r === null || w.r === f.r) && (f.t === null || blur || w.t === f.t));
        }
        break;
      case 'rumor':
        if (opt.witness === 'all') out.push((w) => w.p === f.x && w.r === f.r && w.t === f.t);
        break;
      default:
    }
  }
  return out;
}

export function allWorlds(d: Dim): World[] {
  const ws: World[] = [];
  for (let p = 0; p < d.K; p++) for (let r = 0; r < d.R; r++) for (let t = 0; t < d.T; t++) ws.push({ p, r, t });
  return ws;
}

export function worlds(d: Dim, items: Item[], opt: { witness?: 'vantage' | 'all' } = {}): World[] {
  const cs = constraints(items, opt);
  return allWorlds(d).filter((w) => cs.every((c) => c(w)));
}

/** Nilai jangkar yang masih mungkin. */
export function possible(ws: World[], a: Anchor): number[] {
  return [...new Set(ws.map((w) => w[a]))].sort((x, y) => x - y);
}

/** Apakah bukti memaksa satu nilai untuk jangkar ini? */
export function entails(d: Dim, items: Item[], a: Anchor, v: number): boolean {
  const ws = worlds(d, items);
  return ws.length > 0 && ws.every((w) => w[a] === v);
}

/** Bandingkan fakta (salinan vs sumber). */
export const sameFact = (a: Fact, b: Fact) => JSON.stringify(a) === JSON.stringify(b);

// ── Suntingan ───────────────────────────────────────────────────────────────

export type EditKind = 'jam' | 'label' | 'kabur';

export function timeOf(f: Fact): number | null {
  switch (f.k) {
    case 'door':
    case 'found':
    case 'blank':
      return f.t;
    case 'sight':
      return f.d;
    case 'locks':
      return f.ts[0] ?? null;
    default:
      return null;
  }
}
export function routeOf(f: Fact): number | null {
  switch (f.k) {
    case 'door':
    case 'locks':
    case 'blank':
      return f.r;
    case 'sight':
      return f.r ?? f.folder;
    default:
      return null;
  }
}
export const canEdit = (f: Fact, k: EditKind) => (k === 'label' ? routeOf(f) !== null : timeOf(f) !== null);

/** Terapkan suntingan pada salinan fakta. v = slot/jalur baru. */
export function applyEdit(f: Fact, k: EditKind, v: number, d: Dim): Fact | null {
  if (k === 'kabur') return null;
  if (k === 'jam') {
    if (v < 0 || v >= d.T) return null;
    switch (f.k) {
      case 'door':
      case 'found':
      case 'blank':
        return f.t === v ? null : { ...f, t: v };
      case 'sight':
        return f.d === v ? null : { ...f, d: v };
      case 'locks': {
        const dv = v - (f.ts[0] ?? 0);
        const ts = f.ts.map((t) => t + dv);
        return dv === 0 || ts.some((t) => t < 0 || t >= d.T) ? null : { ...f, ts };
      }
      default:
        return null;
    }
  }
  if (v < 0 || v >= d.R) return null;
  switch (f.k) {
    case 'door':
    case 'locks':
    case 'blank':
      return f.r === v ? null : { ...f, r: v };
    case 'sight':
      if (f.r !== null) return f.r === v ? null : { ...f, r: v };
      return f.folder === v ? null : { ...f, folder: v };
    default:
      return null;
  }
}

// ── Teks ────────────────────────────────────────────────────────────────────

export const hhmm = (m: number) => {
  const x = ((m % 1440) + 1440) % 1440;
  return `${String(Math.floor(x / 60)).padStart(2, '0')}.${String(x % 60).padStart(2, '0')}`;
};
export const slotTime = (tm: Tema, t: number) => hhmm(tm.base + 7 * t);
const span = (tm: Tema, t: number) => `${hhmm(tm.base + 7 * t - 2)}–${hhmm(tm.base + 7 * t + 2)}`;
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const list = (xs: string[]) => (xs.length <= 1 ? (xs[0] ?? '') : `${xs.slice(0, -1).join(', ')} dan ${xs[xs.length - 1]}`);

export interface Rendered {
  judul: string;
  isi: string;
  doodle: string;
  /** Jenis sumber untuk ikon kecil. */
  jenis: 'alat' | 'dokumen' | 'saksi' | 'benda' | 'kabar';
}

export function render(tm: Tema, f: Fact, blur = false, dim: Dim = { K: 4, R: 3, T: 3 }): Rendered {
  const T = dim.T;
  const X = (x: number | null) => (x === null ? 'seseorang' : (tm.tokoh[x]?.name ?? '?'));
  const J = (r: number) => tm.jalur[r] ?? '?';
  const time = (t: number) => (blur ? `antara ${slotTime(tm, 0)}–${slotTime(tm, T - 1)}` : `pukul ${slotTime(tm, t)}`);
  switch (f.k) {
    case 'alibi':
      return { jenis: 'alat', doodle: 'kamera', judul: `Alibi ${X(f.x)}`, isi: `Rekaman utuh ${span(tm, f.t)} memperlihatkan ${X(f.x)} di ${tm.tempat[f.at] ?? 'tempat lain'} sepanjang interval. Ia tidak meninggalkan area itu. Jam acuan KAS.` };
    case 'door':
      return {
        jenis: 'alat',
        doodle: 'kunci',
        judul: `Sensor ${J(f.r)}`,
        isi: `${cap(J(f.r))} terbuka ${time(f.t)} lalu tertutup 18 detik kemudian.${f.once ? ' Malam itu sensor hanya mencatat satu bukaan.' : ' Sensor juga mencatat bukaan lain malam itu.'} Sensor tidak melihat siapa yang lewat. Jam acuan KAS.`,
      };
    case 'locks':
      return {
        jenis: 'dokumen',
        doodle: 'ui-gembok',
        judul: `Catatan ${J(f.r)}`,
        isi: `${cap(J(f.r))} tidak bisa dilalui ${blur ? 'pada sebagian malam itu' : list(f.ts.map((t) => span(tm, t)))} karena ${tm.tutup[f.why % tm.tutup.length]}. Jam acuan KAS.`,
      };
    case 'sight': {
      const C = tm.kamera[f.dev] ?? 'kamera';
      if (f.kas) {
        return {
          jenis: 'alat',
          doodle: 'kamera',
          judul: `Rekaman ${C}`,
          isi: `${cap(time(f.d))}, ${tm.obj} terlihat melintasi ${f.r !== null ? J(f.r) : 'sebuah pintu'}, dibawa satu orang. Wajah tidak dapat dikenali. ${C} memakai jam acuan KAS.`,
        };
      }
      return {
        jenis: 'alat',
        doodle: 'kamera',
        judul: `Cuplikan ${C}`,
        isi: `Timestamp pada cuplikan: ${blur ? `antara ${slotTime(tm, 0)}–${slotTime(tm, T - 1)}` : slotTime(tm, f.d)}. Seseorang membawa ${tm.obj} melewati ${f.r !== null ? J(f.r) : 'sebuah pintu'}; wajah tertutup.${f.folder !== null ? ` Label folder ekspor: ${J(f.folder).toUpperCase()}.` : ''} Bidikan terlalu sempit untuk mengenali posisi kamera. Jam ${C} belum dicocokkan dengan KAS.`,
      };
    }
    case 'mount':
      return { jenis: 'dokumen', doodle: 'peta', judul: `Dudukan ${tm.kamera[f.dev]}`, isi: `Survei pemasangan: ${tm.kamera[f.dev]} menghadap ${J(f.r)}. Posisinya tidak berubah malam itu. Label folder hanyalah nama ekspor, bukan lokasi kamera.` };
    case 'calib': {
      const C = tm.kamera[f.dev];
      const m = Math.abs(f.off) * 7;
      return {
        jenis: 'dokumen',
        doodle: 'jam-dinding',
        judul: `Register jam ${C}`,
        isi: f.off === 0 ? `Jam ${C} tepat sesuai KAS.` : `Jam ${C} ${f.off > 0 ? 'terlambat' : 'lebih cepat'} ${m} menit dari KAS. Untuk rekaman asli ${C}: waktu KAS = timestamp ${f.off > 0 ? '+' : '−'} ${m} menit.`,
      };
    }
    case 'found':
      return { jenis: 'alat', doodle: 'bingkai-polaroid', judul: `Foto ${tm.tujuan}`, isi: `Foto otomatis ${tm.tujuan} ${blur ? 'malam itu' : `pukul ${hhmm(tm.base + 7 * f.t + 2)}`}: ${tm.obj} sudah ada di sana, masih utuh. Wajah orang yang meletakkannya tidak terekam.` };
    case 'keys':
      return { jenis: 'dokumen', doodle: 'kunci-rumah', judul: `Daftar kunci ${X(f.x)}`, isi: `${X(f.x)} hanya memegang akses ke ${list(f.rs.map(J))}.` };
    case 'jejak':
      return { jenis: 'benda', doodle: 'sandal-jepit', judul: `Jejak ${X(f.x)}`, isi: `Pola langkah ${X(f.x)} tidak cocok dengan ${J(f.r)}: ia tidak membawa barang lewat sana malam itu.` };
    case 'blank':
      return { jenis: 'alat', doodle: 'lingkaran-coret', judul: `Lorong ${J(f.r)}`, isi: `Kamera lorong ${J(f.r)} menyala ${blur ? 'sebagian malam' : span(tm, f.t)} dan tidak merekam ${tm.obj} lewat.` };
    case 'witness': {
      const W = tm.saksi[f.w] ?? 'saksi';
      const what = `${X(f.x)} membawa ${tm.obj}${f.r !== null ? ` lewat ${J(f.r)}` : ''}${f.t !== null ? ` sekitar ${blur ? 'malam itu' : slotTime(tm, f.t)}` : ''}`;
      return f.hearsay
        ? { jenis: 'kabar', doodle: 'gelembung-kata', judul: `Pesan ${W}`, isi: `“Yang aku tahu, ${what}. Kabarnya sudah beredar dari tadi.” Pesan ini tidak menyebut ${W} melihatnya sendiri.` }
        : { jenis: 'saksi', doodle: 'bintang-mata', judul: `Pernyataan ${W}`, isi: `“Aku lihat ${what}. Aku yakin itu yang kalian cari.”` };
    }
    case 'vantage': {
      const W = tm.saksi[f.w] ?? 'saksi';
      return { jenis: 'dokumen', doodle: 'kacamata', judul: `Garis pandang ${W}`, isi: f.ok ? `${W} memang berdiri di titik yang menghadap jalur yang ia sebut, dengan cahaya cukup. Kesaksiannya bisa dipakai sebagai sumber.` : `Dari tempat ${W} berdiri, jalur yang ia sebut tidak terlihat. Kesaksiannya tidak bisa menjadi sumber.` };
    }
    case 'trace':
      return { jenis: 'benda', doodle: 'klip-kertas', judul: `Serat di ${J(f.r)}`, isi: `Serat ${tm.bahan} tersangkut di kait dekat ${J(f.r)}; mirip tas milik ${X(f.x)}. Tampilan serupa belum membuktikan pemiliknya.` };
    case 'motive': {
      const t = tm.tokoh[f.x];
      return { jenis: 'kabar', doodle: 'hati-patah', judul: `Desas-desus soal ${X(f.x)}`, isi: `Orang-orang bilang ${X(f.x)} (${t?.job}) gelisah sepanjang malam. Kabar ini menjelaskan perasaan, bukan kejadian.` };
    }
    case 'roster':
      return { jenis: 'dokumen', doodle: 'buku', judul: 'Daftar tersangka', isi: `Yang punya akses ke ${tm.asal}: ${list(tm.tokoh.slice(0, dim.K).map((t) => `${t.name} (${t.job})`))}. Semua pernah memakai tas kain operasional; warna tas tidak mengidentifikasi pemakainya.` };
    case 'debunk': {
      const W = tm.saksi[f.w];
      return { jenis: 'dokumen', doodle: 'kertas-sobek', judul: `Asal kabar ${W}`, isi: `Wawancara lanjutan: ${W} mengaku tidak membaca label benda yang ia lihat; ia menyimpulkan dari ucapan yang ia dengar. ${tm.saksi[f.w2]} hanya mengulang kabar dari ${W}.` };
    }
    case 'rumor':
      return { jenis: 'kabar', doodle: 'tanda-tanya', judul: 'Kabar tanpa nama', isi: `Secarik kertas di meja: “${X(f.x)} kelihatan membawa ${tm.obj} lewat ${J(f.r)} sekitar ${slotTime(tm, f.t)}.” Tidak ada nama pengirim.` };
  }
}

// ── Pembangkit kasus ────────────────────────────────────────────────────────

type Rnd = () => number;
const pickR = <T>(r: Rnd, xs: T[]): T => xs[Math.floor(r() * xs.length)]!;
function shuf<T>(r: Rnd, xs: T[]): T[] {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}
const other = (r: Rnd, n: number, not: number) => {
  const v = Math.floor(r() * (n - 1));
  return v >= not ? v + 1 : v;
};

/** Fakta yang bisa dipakai pemecah (bukan kesaksian, kabar, atau hiasan). */
export const isHard = (f: Fact) => !['witness', 'rumor', 'trace', 'motive', 'roster', 'debunk'].includes(f.k);

interface Cand {
  f: Fact;
  ch: number;
  /** Makin tinggi makin wajib ikut. */
  pri: number;
  src?: string;
  herring?: boolean;
}

function makeModel(r: Rnd, d: Dim): Model {
  const w: World = { p: Math.floor(r() * d.K), r: Math.floor(r() * d.R), t: Math.floor(r() * d.T) };
  const decoy: World = { p: other(r, d.K, w.p), r: other(r, d.R, w.r), t: other(r, d.T, w.t) };
  const place = Array.from({ length: d.K }, () => Array.from({ length: d.T }, () => Math.floor(r() * 8)));
  place[w.p]![w.t] = -1;
  const pass = Array.from({ length: d.R }, (_, R) => Array.from({ length: d.T }, (_, T) => (R === w.r && T === w.t) || r() > (T === w.t ? 0.75 : 0.3)));
  const keys = Array.from({ length: d.K }, (_, x) => Array.from({ length: d.R }, (_, R) => (x === w.p && R === w.r) || r() < 0.6));
  const camOn = Array.from({ length: d.R }, (_, R) => Array.from({ length: d.T }, (_, T) => !(R === w.r && T === w.t) && r() < 0.65));
  const wits: Model['wits'] = [
    { saw: false, x: decoy.p, r: decoy.r, t: decoy.t },
    { saw: false, x: decoy.p, r: decoy.r, t: decoy.t },
    { saw: true, x: null, r: w.r, t: w.t },
    { saw: false, x: other(r, d.K, w.p), r: other(r, d.R, w.r), t: null },
  ];
  return { dim: d, w, decoy, devs: [{ r: w.r, off: w.t - decoy.t }, { r: w.r, off: 0 }], place, pass, keys, camOn, wits, fiberUnique: false };
}

function candidates(r: Rnd, m: Model): Cand[] {
  const { dim: d, w, decoy } = m;
  const c: Cand[] = [];
  const add = (f: Fact, ch: number, pri: number, extra: Partial<Cand> = {}) => c.push({ f, ch, pri, ...extra });
  // Bab 1: kabar pertama — memikat ke arah umpan.
  add({ k: 'sight', dev: 0, d: decoy.t, r: null, folder: decoy.r, kas: false }, 1, 10);
  add({ k: 'door', r: w.r, t: w.t, once: true }, 1, 9);
  add({ k: 'witness', w: 0, ...m.wits[0]!, hearsay: false } as Fact, 1, 8, { src: 'saksi:0', herring: true });
  add({ k: 'witness', w: 1, ...m.wits[1]!, hearsay: true } as Fact, 1, 7, { src: 'saksi:0', herring: true });
  add({ k: 'trace', x: decoy.p, r: decoy.r }, 1, 5, { herring: true });
  add({ k: 'roster' }, 1, 4);
  add({ k: 'motive', x: decoy.p }, 1, 3);
  for (let x = 0; x < d.K; x++) if (x !== decoy.p) add({ k: 'motive', x }, 1, 1);
  add({ k: 'witness', w: 2, ...m.wits[2]!, hearsay: false } as Fact, 1, 2, { src: 'saksi:2' });
  add({ k: 'witness', w: 3, ...m.wits[3]!, hearsay: false } as Fact, 1, 1, { src: 'saksi:3', herring: true });
  // Bab 2: jam, alibi, denah.
  for (let x = 0; x < d.K; x++) if (x !== w.p) add({ k: 'alibi', x, t: w.t, at: m.place[x]![w.t]! }, 2, 9);
  add({ k: 'found', t: Math.min(d.T - 1, w.t + (r() < 0.5 ? 0 : 1)) }, 2, 6);
  for (let x = 0; x < d.K; x++) for (let t = 0; t < d.T; t++) if (t !== w.t) add({ k: 'alibi', x, t, at: m.place[x]![t]! }, 2, 1);
  for (let R = 0; R < d.R; R++) if (R !== w.r) add({ k: 'door', r: R, t: Math.floor(r() * d.T), once: r() < 0.5 }, 2, 1);
  // Bab 3: sumber cadangan, dudukan, catatan pintu.
  add({ k: 'sight', dev: 1, d: w.t, r: w.r, folder: null, kas: true }, 3, 9);
  add({ k: 'mount', dev: 0, r: w.r }, 3, 7);
  if (r() < 0.4) add({ k: 'calib', dev: 0, off: m.devs[0]!.off }, 3, 5);
  for (let R = 0; R < d.R; R++) {
    const ts = m.pass[R]!.map((p, t) => (p ? -1 : t)).filter((t) => t >= 0);
    if (ts.length) add({ k: 'locks', r: R, ts, why: Math.floor(r() * 3) }, 3, R !== w.r && ts.includes(w.t) ? 8 : 2);
  }
  add({ k: 'debunk', w: 0, w2: 1 }, 3, 4);
  add({ k: 'motive', x: w.p }, 3, 3);
  for (let x = 0; x < d.K; x++) {
    const rs = m.keys[x]!.map((k, R) => (k ? R : -1)).filter((R) => R >= 0);
    if (rs.length < d.R) add({ k: 'keys', x, rs }, 3, 2);
  }
  for (let R = 0; R < d.R; R++) for (let t = 0; t < d.T; t++) if (m.camOn[R]![t]) add({ k: 'blank', r: R, t }, 3, 1);
  return c;
}

const keyOf = (f: Fact) => JSON.stringify(f);

export interface Kasus {
  model: Model;
  reports: Report[];
}

/**
 * Bangun kasus untuk n kursi. revisi = indeks kursi kubu Revisi (boleh kosong).
 * Syarat: semua fakta sah menunjuk tepat dunia aktual; bab 1–2 belum cukup;
 * bukti di tangan Restorasi saja sudah cukup; kehilangan satu bukti apa pun
 * masih menyisakan jalan.
 */
export function generate(n: number, revisi: number[], r: Rnd): Kasus {
  const d = dimFor(n);
  const ps = perSeat(n);
  const slots = n * ps;
  let best: Kasus | null = null;
  for (let attempt = 0; attempt < 400; attempt++) {
    const m = makeModel(r, d);
    const cand = candidates(r, m);
    const seen = new Set<string>();
    const chosen: Cand[][] = [[], [], []];
    let carry: Cand[] = [];
    for (let ch = 1; ch <= 3; ch++) {
      const pool = [...carry, ...shuf(r, cand.filter((c) => c.ch === ch))].sort((a, b) => b.pri - a.pri);
      carry = [];
      for (const c of pool) {
        const k = keyOf(c.f);
        if (seen.has(k)) continue;
        if (chosen[ch - 1]!.length < slots) {
          seen.add(k);
          chosen[ch - 1]!.push(c);
        } else if (c.pri >= 5 && ch < 3) carry.push(c);
      }
    }
    // Isi kekurangan dengan alibi/kabar acak yang benar.
    for (let ch = 1; ch <= 3; ch++) {
      const extra = shuf(r, cand.filter((c) => !seen.has(keyOf(c.f))));
      while (chosen[ch - 1]!.length < slots && extra.length) {
        const c = extra.shift()!;
        if (ch === 1 && isHard(c.f) && c.f.k !== 'door') continue;
        seen.add(keyOf(c.f));
        chosen[ch - 1]!.push(c);
      }
    }
    if (chosen.some((x) => x.length < slots)) continue;
    const flat = chosen.flatMap((cs, i) => cs.map((c) => ({ ...c, ch: i + 1 })));
    const hard = flat.filter((c) => isHard(c.f));
    const all = worlds(d, hard);
    if (all.length !== 1) continue;
    const upTo2 = worlds(d, hard.filter((c) => c.ch <= 2)).length;
    const ch1 = worlds(d, hard.filter((c) => c.ch === 1)).length;
    if (upTo2 < 2 || ch1 < Math.min(8, d.K * d.R * d.T)) continue;
    // Redundansi: hilang satu bukti mana pun tetap ada jalan (sampai tiga bila meja kecil).
    let fragile = 0;
    for (let i = 0; i < hard.length; i++) if (worlds(d, hard.filter((_, j) => j !== i)).length !== 1) fragile++;
    if (fragile > (n <= 5 ? 3 : 2) + Math.floor(attempt / 150)) continue;
    // Bagi ke kursi; bukti di tangan Restorasi saja harus cukup.
    for (let deal = 0; deal < 60; deal++) {
      const reports: Report[] = [];
      let idx = 1;
      for (let ch = 1; ch <= 3; ch++) {
        const seats = shuf(r, Array.from({ length: slots }, (_, i) => i % n));
        shuf(r, chosen[ch - 1]!).forEach((c, i) => {
          reports.push({ id: `E${String(idx++).padStart(2, '0')}`, ch, holder: seats[i]!, f: c.f, src: c.src ?? `s${idx}`, herring: c.herring });
        });
      }
      reports.sort((a, b) => a.ch - b.ch || a.holder - b.holder);
      reports.forEach((x, i) => (x.id = `E${String(i + 1).padStart(2, '0')}`));
      const good = reports.filter((x) => !revisi.includes(x.holder) && isHard(x.f));
      const ok = worlds(d, good).length === 1;
      if (ok) return { model: m, reports };
      if (!best) best = { model: m, reports };
    }
  }
  if (best) return best;
  throw new Error('kasus gagal dibangun');
}

/** Teks satu kalimat dunia (untuk epilog dan Revisi). */
export function worldText(tm: Tema, w: World): string {
  return `${tm.tokoh[w.p]?.name} membawa ${tm.obj} lewat ${tm.jalur[w.r]} pukul ${slotTime(tm, w.t)}`;
}

/** Judul indeks: tidak memuat kolom yang bisa disunting, supaya suntingan tidak bocor. */
export function indexTitle(tm: Tema, f: Fact, dim: Dim): string {
  switch (f.k) {
    case 'door':
      return 'Sensor pintu';
    case 'locks':
      return 'Catatan pemeliharaan';
    case 'blank':
      return 'Kamera lorong';
    case 'rumor':
      return 'Kabar tanpa nama';
    default:
      return render(tm, f, false, dim).judul;
  }
}

export const anchorValues = (tm: Tema, d: Dim, a: Anchor): string[] =>
  a === 'p' ? tm.tokoh.slice(0, d.K).map((t) => t.name) : a === 'r' ? tm.jalur.slice(0, d.R) : Array.from({ length: d.T }, (_, t) => slotTime(tm, t));
export const ANCHOR_NAME: Record<Anchor, string> = { p: 'pelaku', r: 'jalur', t: 'waktu' };

export { pickR as pickRand };
