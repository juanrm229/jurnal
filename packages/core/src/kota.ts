/**
 * Kota Sehari: satu kota fiksi publik di atas peta ilustrasi. Wilayah berupa
 * poligon di ruang peta 2000×1125; persil dihasilkan secara deterministik di
 * dalam wilayah yang dibuka, jadi tiap persil punya id dan alamat tetap.
 *
 * PENTING: algoritme persil (kotaPlots) adalah bagian dari data. Mengubahnya
 * mengubah id persil yang sudah dipatok. Tambahkan wilayah baru di akhir saja.
 */

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
  streets: string[];
  poly: KotaPoint[];
  /** Posisi label di peta. */
  label: KotaPoint;
}

export const KOTA_LIRIH: KotaRegion[] = [
  { id: 'bantaran', name: 'Bantaran Kali', watak: 'Rumah rapat di tepi selatan kali. Jembatan, perahu tambang, dan kebiasaan menaruh sandal di atas lemari tiap musim hujan.', since: 1930, musim: 1, streets: ['Gg. Sawo', 'Jl. Tepi Kali', 'Gg. Kenari', 'Gg. Perahu', 'Gg. Tambang'], poly: [[478, 616], [620, 614], [900, 618], [1100, 626], [1300, 626], [1305, 660], [1100, 680], [900, 690], [620, 700], [490, 690]], label: [700, 652] },
  { id: 'kampungair', name: 'Kampung Air', watak: 'Rumah panggung di atas teluk kecil, disambung titian kayu. Anak-anak belajar berenang sebelum belajar membaca.', since: 1900, musim: 1, streets: ['Titian Bandeng', 'Titian Teripang', 'Gg. Jala', 'Titian Kerang'], poly: [[500, 702], [620, 702], [900, 692], [955, 722], [905, 800], [700, 812], [522, 792]], label: [700, 760] },
  { id: 'kotatua', name: 'Kota Tua', watak: 'Gang berliku di antara rumah toko tua, di bawah bayangan benteng. Setiap pintu punya nomor lama dan nomor baru.', since: 1850, musim: 1, streets: ['Jl. Pecinan', 'Gg. Lonceng', 'Jl. Benteng', 'Gg. Kapur', 'Jl. Syahbandar', 'Gg. Tembaga'], poly: [[965, 412], [1225, 402], [1300, 470], [1318, 555], [1292, 600], [1000, 612], [962, 500]], label: [1120, 520] },
  { id: 'pusat', name: 'Alun-Alun', watak: 'Gedung putih berpilar, kantor dagang, dan air mancur yang dulu jadi titik nol kota.', since: 1890, musim: null, streets: ['Jl. Gubernuran', 'Jl. Raya Alun-Alun'], poly: [[640, 300], [960, 292], [975, 492], [640, 492]], label: [800, 395] },
  { id: 'telaga', name: 'Taman Telaga', watak: 'Taman kota dengan telaga dan paviliun. Rumah-rumah di tepinya selalu tahu siapa yang sedang patah hati.', since: 1925, musim: null, streets: ['Jl. Telaga', 'Jl. Paviliun'], poly: [[962, 205], [1215, 195], [1225, 400], [966, 410]], label: [1090, 300] },
  { id: 'timur', name: 'Kampung Timur', watak: 'Kampung yang tumbuh mendaki ke timur, di antara kota dan bakau.', since: 1950, musim: null, streets: ['Jl. Mendaki', 'Gg. Bakau'], poly: [[1215, 120], [1400, 60], [1500, 150], [1460, 300], [1400, 420], [1310, 470], [1225, 400]], label: [1340, 260] },
  { id: 'lereng', name: 'Lereng Utara', watak: 'Jalan berkelok di kaki bukit. Kabut pagi, kebun kopi, dan rumah yang jendelanya menghadap seluruh kota.', since: 1965, musim: null, streets: ['Jl. Kelok', 'Gg. Kabut'], poly: [[560, 190], [700, 150], [900, 140], [1000, 100], [1220, 120], [1215, 195], [962, 205], [960, 292], [640, 300], [540, 310]], label: [800, 220] },
  { id: 'rel', name: 'Kampung Rel', watak: 'Rumah di sepanjang rel kereta. Jam dinding di sini tidak pernah dipakai; semua orang hafal jadwal kereta.', since: 1910, musim: null, streets: ['Jl. Stasiun', 'Gg. Lori'], poly: [[0, 180], [200, 190], [360, 220], [560, 190], [540, 310], [640, 300], [640, 492], [400, 512], [200, 492], [0, 470]], label: [300, 380] },
  { id: 'pelabuhan', name: 'Pelabuhan Baru', watak: 'Derek, gudang, dan kontainer. Kota yang tidak pernah tidur, dan orang-orang yang datang dan pergi bersama kapal.', since: 1975, musim: null, streets: ['Jl. Dermaga'], poly: [[905, 692], [1100, 682], [1310, 662], [1320, 700], [1312, 880], [1180, 882], [950, 862], [905, 800], [955, 722]], label: [1110, 780] },
  { id: 'nelayan', name: 'Kampung Nelayan', watak: 'Perahu ditarik ke pasir tiap sore. Ikan asin dijemur di atap, doa dibacakan untuk angin.', since: 1880, musim: null, streets: ['Gg. Layar', 'Gg. Dayung'], poly: [[380, 800], [522, 792], [700, 812], [905, 800], [950, 862], [700, 902], [520, 922], [400, 902]], label: [650, 860] },
  { id: 'sawah', name: 'Sawah Barat', watak: 'Petak sawah dan kali kecil yang berkelok. Rumah-rumah petani berjauhan, tapi kabar tetap cepat sampai.', since: 1800, musim: null, streets: ['Jl. Pematang'], poly: [[0, 480], [200, 492], [400, 512], [470, 600], [490, 690], [500, 702], [522, 792], [380, 800], [400, 902], [250, 1000], [100, 1125], [0, 1125]], label: [190, 720] },
  { id: 'pantai', name: 'Pantai Pasir', watak: 'Pantai panjang tempat orang kota datang untuk lupa sebentar.', since: 1800, musim: null, streets: [], poly: [[250, 1000], [400, 902], [520, 922], [700, 902], [780, 962], [600, 1012], [400, 1062], [262, 1125], [100, 1125]], label: [430, 990] },
  { id: 'benteng', name: 'Benteng Karang', watak: 'Benteng bintang di ujung tanjung. Tempat bersama: siapa pun boleh menulis apa yang terjadi di sini.', since: 1700, musim: null, streets: [], poly: [[1312, 530], [1405, 525], [1412, 612], [1312, 614]], label: [1360, 572] },
  { id: 'bakau', name: 'Delta Bakau', watak: 'Seribu alur air di antara bakau. Hanya tukang perahu yang tahu jalannya.', since: 1800, musim: null, streets: [], poly: [[1400, 420], [1460, 300], [1500, 150], [2000, 120], [2000, 560], [1700, 520], [1450, 500]], label: [1720, 330] },
  { id: 'pulau', name: 'Pulau Suar', watak: 'Pulau kecil dengan mercusuar. Penjaga suar mencatat setiap kapal, dan setiap orang yang tidak kembali.', since: 1890, musim: null, streets: [], poly: [[1530, 640], [1620, 580], [1760, 560], [1880, 610], [1925, 650], [1820, 690], [1700, 712], [1580, 690]], label: [1700, 640] },
  { id: 'bukit', name: 'Bukit Terasering', watak: 'Bukit bertingkat yang menjaga kota dari angin utara.', since: 1800, musim: null, streets: [], poly: [[380, 0], [950, 0], [1000, 100], [900, 140], [700, 150], [560, 190], [400, 150]], label: [680, 70] },
];

export const kotaRegion = (id: string) => KOTA_LIRIH.find((r) => r.id === id);

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

/** Hash bilangan bulat kecil yang stabil (untuk geseran persil). */
function h32(n: number) {
  let x = n | 0;
  x = Math.imul(x ^ (x >>> 16), 0x45d9f3b);
  x = Math.imul(x ^ (x >>> 16), 0x45d9f3b);
  return ((x ^ (x >>> 16)) >>> 0) / 4294967295;
}

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];

export interface KotaPlot {
  id: string;
  region: string;
  x: number;
  y: number;
  address: string;
}

const STEP = 15;
const cache = new Map<string, KotaPlot[]>();

/** Persil dalam satu wilayah: kisi bergeser, baris demi baris; tiap baris satu jalan. */
export function kotaPlots(regionId: string): KotaPlot[] {
  const hit = cache.get(regionId);
  if (hit) return hit;
  const r = kotaRegion(regionId);
  if (!r || !r.streets.length) return [];
  const b = kotaBBox(r.poly);
  const out: KotaPlot[] = [];
  let row = 0;
  for (let y = b.y0 + STEP / 2; y < b.y1; y += STEP, row++) {
    let no = 0;
    for (let x = b.x0 + STEP / 2 + (row % 2 ? STEP / 2 : 0); x < b.x1; x += STEP) {
      const k = out.length + row * 1000;
      const p: KotaPoint = [Math.round(x + (h32(k * 7 + 1) - 0.5) * 6), Math.round(y + (h32(k * 13 + 5) - 0.5) * 6)];
      if (!kotaInside(p, r.poly)) continue;
      no++;
      const street = r.streets[row % r.streets.length]!;
      const gang = ROMAN[Math.floor(row / r.streets.length) % ROMAN.length]!;
      out.push({ id: `${r.id}.${out.length + 1}`, region: r.id, x: p[0], y: p[1], address: `${street} ${gang} No. ${no * 2 - (row % 2 ? 0 : 1)}` });
    }
  }
  cache.set(regionId, out);
  return out;
}

export function kotaPlot(id: string): KotaPlot | undefined {
  const region = id.split('.')[0]!;
  return kotaPlots(region).find((p) => p.id === id);
}

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
