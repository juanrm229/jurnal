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
    out.push(d >= gap ? { ok: true, text: `${p.name} ${d} tahun lebih tua dari ${c.name}.` } : { ok: false, text: d < 0 ? `${what} perlu setidaknya ${gap} tahun lebih tua, padahal ${p.name} justru ${-d} tahun lebih muda dari ${c.name}.` : `${what} perlu setidaknya ${gap} tahun lebih tua; selisihnya baru ${d} tahun.` });
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

// ── Almanak: peristiwa kota ─────────────────────────────────────────────────

export interface KotaPeristiwa {
  id: string;
  title: string;
  year: number;
  month?: number;
  /** Tahun berakhir untuk peristiwa yang berlangsung lama. */
  toYear?: number;
  /** Wilayah yang mengalaminya; kosong = seluruh kota. */
  regions: string[];
  body: string;
}

/** Almanak awal: jangkar sejarah Sangkala, kanon sejak kota dibuka. */
export const KOTA_ALMANAK_AWAL: KotaPeristiwa[] = [
  { id: 'awal.benteng', title: 'Benteng Lima Sudut berdiri di ujung tanjung', year: 1702, regions: ['bentenglimasudut'], body: 'Batu karang dipotong dan diangkut dengan perahu selama tujuh musim. Sejak itu tanjung ini punya nama, dan kota punya alasan untuk tumbuh di belakangnya.' },
  { id: 'awal.lonceng', title: 'Lonceng ketujuh dipasang di Gang Tujuh Lonceng', year: 1858, month: 4, regions: ['tujuhlonceng'], body: 'Enam lonceng pertama dipesan dari seberang; yang ketujuh dicor di gang ini sendiri, dari perabot tembaga yang disumbangkan warga. Bunyinya sedikit sumbang, dan karena itu paling dicintai.' },
  { id: 'awal.suar', title: 'Mercusuar Nusa Pelita menyala pertama kali', year: 1891, month: 9, regions: ['nusapelita'], body: 'Penjaga suar pertama mencatat di bukunya: malam ini tidak ada kapal yang tersesat. Catatan itu masih dibacakan tiap tahun.' },
  { id: 'awal.kereta', title: 'Kereta pertama tiba di Kampung Peluit', year: 1909, month: 8, regions: ['kampungpeluit', 'sawah'], body: 'Seluruh kampung keluar rumah mendengar peluitnya. Sejak hari itu, tak ada lagi yang memakai jam dinding di sepanjang rel.' },
  { id: 'awal.pasar', title: 'Pasar Senja dibuka', year: 1912, regions: ['pasarsenja'], body: 'Pedagang dari sawah dan pelabuhan sepakat berdagang setelah matahari turun, supaya siangnya tetap bisa bekerja. Harga mulai ditawar dengan lagu.' },
  { id: 'awal.telaga', title: 'Telaga Mangu digali', year: 1925, regions: ['telagamangu', 'padanggubernur'], body: 'Rawa kecil di belakang balai kota dikeruk jadi telaga. Paviliunnya dibangun belakangan, dari kayu kapal yang karam.' },
  { id: 'awal.sumbu', title: 'Kampung sumbu berdiri di tepi Kali Sirah', year: 1931, regions: ['lorongsumbu'], body: 'Keluarga-keluarga pembuat sumbu lampu menetap di tepian. Tiap rumah menggantung contoh sumbunya di jendela, dan gangnya mulai bercahaya tiap malam.' },
  { id: 'awal.kebakaran', title: 'Pasar Senja terbakar semalaman', year: 1965, month: 7, regions: ['pasarsenja', 'tujuhlonceng'], body: 'Api bermula dari lapak minyak dan menjalar ke atap-atap tenda. Lonceng ketujuh dibunyikan sampai pagi. Pasar dibangun ulang dalam empat puluh hari.' },
  { id: 'awal.dermaga', title: 'Dermaga Besi dibuka', year: 1974, regions: ['dermagabesi', 'tanjungjala', 'tiangseribu'], body: 'Derek pertama didirikan di muara. Para nelayan Tanjung Jala menyaksikan kapal-kapal besar masuk, dan bertanya-tanya ke mana ikan-ikan akan pergi.' },
  { id: 'awal.banjir', title: 'Banjir besar Kali Sirah', year: 1979, month: 2, regions: ['lorongsumbu', 'tiangseribu', 'tujuhlonceng'], body: 'Air naik selama tiga hari. Lorong Sumbu terendam sampai dada; rumah-rumah panggung Tiang Seribu menjadi tempat mengungsi. Di Gang Tujuh Lonceng, lonceng dibunyikan untuk menghitung yang masih hilang.' },
  { id: 'awal.gelap', title: 'Kota gelap tiga malam', year: 1998, month: 5, regions: [], body: 'Listrik padam di seluruh kota. Warga Lorong Sumbu kembali menyalakan sumbu-sumbu lama, dan untuk tiga malam kota kembali seperti dulu.' },
  { id: 'awal.kabut', title: 'Kabut tujuh hari di Lereng Kabut', year: 2003, month: 1, regions: ['lerengkabut', 'bukitseribuundak'], body: 'Kabut turun dan tidak naik lagi selama tujuh hari. Orang-orang saling memanggil nama supaya tidak tersesat di jalan sendiri.' },
];

/** Peristiwa yang sedang berlangsung pada tahun tertentu. */
export const kotaPeristiwaPada = <T extends KotaPeristiwa>(events: T[], year: number) => events.filter((e) => e.year <= year && year <= (e.toYear ?? e.year));

/**
 * "Dari kota" untuk Kacamata Tokoh: peristiwa yang terjadi sebelum atau pada
 * tahun adegan. Dialami bila wilayah rumahnya terdampak; peristiwa seluruh kota
 * dialami semua; peristiwa wilayah lain hanya didengar.
 */
export function kotaDariKota<T extends KotaPeristiwa>(events: T[], regionId: string, year: number) {
  const past = events.filter((e) => e.year <= year).sort((a, b) => b.year - a.year);
  return {
    mengalami: past.filter((e) => !e.regions.length || e.regions.includes(regionId)),
    mendengar: past.filter((e) => e.regions.length && !e.regions.includes(regionId)),
  };
}

/** Persetujuan warga lain yang dibutuhkan agar usulan peristiwa menjadi kanon. */
export const KOTA_SETUJU_KANON = 2;

// ── Buku Warga Kota: figuran kota bersama ───────────────────────────────────

/** Figuran kota: sosok publik yang boleh dijumpai siapa pun; fakta besarnya diubah lewat persetujuan warga. */
export interface KotaFigur {
  id: string;
  name: string;
  julukan?: string;
  /** Wilayah tempat ia biasa ditemui. */
  region: string;
  tempat: string;
  ciri: string;
  born?: number;
  died?: number;
  /** Hal yang tak boleh diubah satu rumah sendirian. */
  tetap: string[];
}

export const KOTA_WARGA_AWAL: KotaFigur[] = [
  { id: 'warga.tembang', name: 'Mbah Tembang', julukan: 'pengemis yang selalu bernyanyi', region: 'pasarsenja', tempat: 'tangga timur Pasar Senja', ciri: 'Kaki kirinya pincang. Menyanyikan lagu yang tak pernah didengar orang lain, dan berhenti setiap kali lonceng ketujuh berbunyi.', born: 1911, died: 1984, tetap: ['Tidak pernah mau menerima uang kertas, hanya koin.', 'Tak seorang pun tahu nama aslinya.'] },
  { id: 'warga.rasid', name: 'Pak Rasid', julukan: 'penjaga suar', region: 'nusapelita', tempat: 'mercusuar Nusa Pelita', ciri: 'Mencatat setiap kapal yang lewat di buku besar bersampul hijau. Turun ke kota sebulan sekali untuk membeli minyak dan tembakau.', born: 1902, died: 1970, tetap: ['Buku besarnya tidak pernah boleh dibaca orang lain.'] },
  { id: 'warga.lebai', name: 'Wak Lebai', julukan: 'tukang perahu tambang', region: 'lorongsumbu', tempat: 'tambatan perahu di ujung Gg. Sampan', ciri: 'Menyeberangkan orang di Kali Sirah dengan perahu kayu bercat biru. Hafal kedalaman kali di setiap musim.', born: 1920, died: 1996, tetap: ['Tarifnya selalu sebutir telur, atau doa bila penumpangnya tak punya.'] },
  { id: 'warga.hanafi', name: 'dr. Hanafi', julukan: 'dokter Lorong Sumbu', region: 'lorongsumbu', tempat: 'rumah praktik di Gg. Kemiri', ciri: 'Datang dengan sepeda dan tas kulit cokelat. Menulis resep dengan tinta hijau.', born: 1925, died: 2008, tetap: ['Tidak pernah menagih pasien yang datang malam hari.'] },
  { id: 'warga.malian', name: 'Ma Lian', julukan: 'penarik lonceng ketujuh', region: 'tujuhlonceng', tempat: 'menara lonceng ketujuh', ciri: 'Perempuan bertubuh kecil dengan lengan sekuat pelaut. Menghitung waktu dengan tali, bukan jam.', born: 1930, died: 2015, tetap: ['Hanya ia yang boleh membunyikan lonceng ketujuh selama ia hidup.'] },
  { id: 'warga.jamil', name: 'Bang Jamil', julukan: 'tukang pos bersepeda merah', region: 'lorongsumbu', tempat: 'di mana saja, terutama gang-gang sempit', ciri: 'Sepedanya merah, bel sepedanya dua kali pendek satu kali panjang. Selalu tahu kabar sebelum suratnya sampai.', born: 1948, tetap: ['Hafal semua alamat di kota tanpa melihat sampul surat.'] },
  { id: 'warga.soebandi', name: 'Pak Soebandi', julukan: 'masinis kereta pertama', region: 'kampungpeluit', tempat: 'lokomotif dan stasiun Kampung Peluit', ciri: 'Topi masinisnya selalu miring ke kiri. Menyimpan sapu tangan istrinya di saku dada.', born: 1885, died: 1962, tetap: ['Membunyikan peluit tiga kali setiap melewati makam istrinya.'] },
  { id: 'warga.nyaisumbu', name: 'Nyai Sumbu', julukan: 'penjual sumbu tertua', region: 'lorongsumbu', tempat: 'beranda rumah di mulut Lorong Tepian', ciri: 'Memintal sumbu dari kapas sambil bercerita. Semua anak di Lorong Sumbu pernah dimarahi dan diberi permen olehnya.', born: 1899, died: 1979, tetap: ['Sumbu buatannya tidak pernah padam lebih dulu dari pemiliknya.'] },
  { id: 'warga.ahong', name: 'Koh Ahong', julukan: 'kepala Pasar Senja', region: 'pasarsenja', tempat: 'lapak timbangan di tengah pasar', ciri: 'Memegang timbangan tembaga yang dipercaya semua pedagang. Bicara pelan, tak pernah menawar.', born: 1932, died: 2011, tetap: ['Timbangannya dianggap paling jujur di kota; tidak ada yang berani menggugatnya.'] },
  { id: 'warga.sarinah', name: 'Bu Sarinah', julukan: 'bidan Tiang Seribu', region: 'tiangseribu', tempat: 'rumah panggung paling ujung di Titian Pari', ciri: 'Mendayung sendiri ke rumah-rumah panggung, siang atau malam. Tangannya selalu berbau minyak kayu putih.', born: 1940, died: 2020, tetap: ['Menuliskan nama setiap bayi yang ditolongnya di dinding rumahnya.'] },
];

/** Perubahan besar figuran yang sudah disepakati, diterapkan berurutan di atas lembar awalnya. */
export interface KotaUbah {
  kind: 'fakta' | 'wafat' | 'pindah';
  text: string;
  year?: number;
  region?: string;
}
export function kotaFigurKini(f: KotaFigur, ubah: KotaUbah[]): KotaFigur {
  let x = { ...f, tetap: [...f.tetap] };
  for (const u of ubah) {
    if (u.kind === 'wafat' && u.year) x = { ...x, died: u.year };
    else if (u.kind === 'pindah' && u.region) x = { ...x, region: u.region, tempat: u.text || x.tempat };
    else if (u.kind === 'fakta') x = { ...x, tetap: [...x.tetap, u.text] };
  }
  return x;
}

// ── Penjaga konsistensi ─────────────────────────────────────────────────────

/** Satu nama di kota: tokoh rumah (warga/figuran rumah) atau figuran kota. */
export interface KotaNama {
  name: string;
  kind: 'warga' | 'figuran' | 'figur';
  claimId?: string;
  household?: string;
  tokohId?: string;
  figurId?: string;
  sapa?: 'tertutup' | 'disapa';
  born?: number;
  died?: number;
  julukan?: string;
}

export interface KotaCekNama {
  kind: 'rumah-lain' | 'figur-waktu' | 'figur-jumpa';
  term: string;
  at: number;
  end: number;
  ref: KotaNama;
}

/**
 * Periksa teks adegan sebuah rumah terhadap nama-nama kota:
 *  - tokoh rumah lain yang tidak tertaut dan tidak "boleh disapa" → ketuk dulu atau desas-desus,
 *  - figuran kota di luar masa hidupnya → peringatan waktu,
 *  - figuran kota yang disebut tapi belum dicatat sebagai perjumpaan → saran mencatat.
 */
export function kotaCekTeks(text: string, nama: KotaNama[], o: { claimId: string; linked: string[]; desas: string[]; jumpa: string[]; year: number | null }): KotaCekNama[] {
  const out: KotaCekNama[] = [];
  const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const find = (term: string) => {
    const re = new RegExp(`(^|[^\\p{L}\\p{N}])(${esc(term)})(?=(?:nya|ku|mu|lah|kah|pun)?(?:$|[^\\p{L}\\p{N}]))`, 'giu');
    return [...text.matchAll(re)].map((m) => ({ at: (m.index ?? 0) + m[1]!.length, end: (m.index ?? 0) + m[1]!.length + m[2]!.length }));
  };
  for (const n of nama) {
    if (n.name.trim().length < 3) continue;
    if (n.kind !== 'figur') {
      if (n.claimId === o.claimId || n.sapa === 'disapa' || (n.tokohId && o.linked.includes(n.tokohId)) || o.desas.some((d) => d.toLowerCase() === n.name.toLowerCase())) continue;
      for (const r of find(n.name)) out.push({ kind: 'rumah-lain', term: n.name, ...r, ref: n });
      continue;
    }
    const hits = [...find(n.name), ...(n.julukan ? find(n.julukan) : [])];
    if (!hits.length) continue;
    const r = hits[0]!;
    if (o.year && ((n.born && o.year < n.born) || (n.died && o.year > n.died))) out.push({ kind: 'figur-waktu', term: n.name, ...r, ref: n });
    else if (!o.jumpa.includes(n.figurId!)) out.push({ kind: 'figur-jumpa', term: n.name, ...r, ref: n });
  }
  return out.sort((a, b) => a.at - b.at);
}
