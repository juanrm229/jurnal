/**
 * Generator peta Kota Sangkala.
 *
 * Menggambar kota ilustrasi (SVG) dari rancangan wilayah di bawah, dengan benih
 * tetap: jalan, ribuan rumah beratap, pohon, sawah, terasering, bakau, laguna
 * rumah panggung, pelabuhan, benteng, dan mercusuar. Rumah di wilayah yang
 * dibuka menjadi persil (alamat) di packages/core/src/kotaData.ts, jadi setiap
 * persil adalah rumah yang benar-benar tergambar.
 *
 *   node scripts/peta/sangkala.mjs        → scripts/peta/out/sangkala.svg + kotaData.ts
 *   node scripts/peta/render.mjs          → apps/web/public/kota/sangkala-*.webp
 *
 * PENTING: mengubah benih, urutan, atau parameter mengubah id persil. Setelah
 * ada warga yang mematok, jangan menjalankan ulang tanpa migrasi id.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const W = 2000;
const H = 1125;

// ── Acak dan derau berbenih ─────────────────────────────────────────────────
function mulberry(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry(1979);
const rr = (a, b) => a + rand() * (b - a);
const pick = (xs) => xs[Math.floor(rand() * xs.length)];
const hash2 = (x, y, s = 7) => {
  let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(s, 2147483647)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
};
const smooth = (t) => t * t * (3 - 2 * t);
function noise(x, y, s = 1) {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = smooth(x - xi);
  const yf = smooth(y - yi);
  const a = hash2(xi, yi, s);
  const b = hash2(xi + 1, yi, s);
  const c = hash2(xi, yi + 1, s);
  const d = hash2(xi + 1, yi + 1, s);
  return a + (b - a) * xf + (c - a) * yf + (a - b - c + d) * xf * yf;
}
const fbm = (x, y, s = 1) => noise(x, y, s) * 0.6 + noise(x * 2.1, y * 2.1, s + 9) * 0.3 + noise(x * 4.3, y * 4.3, s + 21) * 0.1;

// ── Geometri ───────────────────────────────────────────────────────────────
const f1 = (n) => Math.round(n * 10) / 10;
const pts = (ps) => ps.map(([x, y]) => `${f1(x)},${f1(y)}`).join(' ');
function inside([x, y], poly) {
  let ins = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) ins = !ins;
  }
  return ins;
}
function distSeg([px, py], [ax, ay], [bx, by]) {
  const dx = bx - ax;
  const dy = by - ay;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy || 1)));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}
function distLine(p, line) {
  let d = Infinity;
  for (let i = 1; i < line.length; i++) d = Math.min(d, distSeg(p, line[i - 1], line[i]));
  return d;
}
/** Haluskan polyline dengan Chaikin. */
function chaikin(line, n = 3, closed = false) {
  let ps = line;
  for (let k = 0; k < n; k++) {
    const out = closed ? [] : [ps[0]];
    const m = closed ? ps.length : ps.length - 1;
    for (let i = 0; i < m; i++) {
      const a = ps[i];
      const b = ps[(i + 1) % ps.length];
      out.push([a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25], [a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75]);
    }
    if (!closed) out.push(ps.at(-1));
    ps = out;
  }
  return ps;
}
/** Goyangan tangan: geser titik dengan derau kecil. */
const wobble = (line, amp = 2, f = 0.02, s = 3) => line.map(([x, y]) => [x + (noise(x * f, y * f, s) - 0.5) * amp * 2, y + (noise(x * f + 40, y * f + 40, s) - 0.5) * amp * 2]);
const pathD = (line, closed = false) => `M${line.map(([x, y]) => `${f1(x)} ${f1(y)}`).join('L')}${closed ? 'Z' : ''}`;
function bbox(poly) {
  const xs = poly.map((p) => p[0]);
  const ys = poly.map((p) => p[1]);
  return { x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys) };
}
const centroid = (poly) => [poly.reduce((s, p) => s + p[0], 0) / poly.length, poly.reduce((s, p) => s + p[1], 0) / poly.length];
const shrink = (poly, k) => {
  const [cx, cy] = centroid(poly);
  return poly.map(([x, y]) => {
    const d = Math.hypot(x - cx, y - cy) || 1;
    return [x - ((x - cx) / d) * k, y - ((y - cy) / d) * k];
  });
};
/** Pita di sekitar polyline dengan lebar berubah: kembalikan poligon. */
function ribbon(line, width) {
  const L = [];
  const R = [];
  for (let i = 0; i < line.length; i++) {
    const a = line[Math.max(0, i - 1)];
    const b = line[Math.min(line.length - 1, i + 1)];
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const d = Math.hypot(dx, dy) || 1;
    const w = typeof width === 'function' ? width(i / (line.length - 1)) : width;
    const nx = (-dy / d) * w * 0.5;
    const ny = (dx / d) * w * 0.5;
    L.push([line[i][0] + nx, line[i][1] + ny]);
    R.push([line[i][0] - nx, line[i][1] - ny]);
  }
  return [...L, ...R.reverse()];
}

// ── Rancangan kota ─────────────────────────────────────────────────────────
const COAST = chaikin(
  [[0, 1045], [150, 1030], [300, 1002], [450, 975], [600, 940], [690, 905], [770, 884], [860, 874], [935, 864], [1040, 846], [1082, 778], [1080, 748], [1112, 738], [1150, 708], [1195, 694], [1222, 716], [1254, 724], [1290, 700], [1296, 664], [1270, 642], [1306, 604], [1366, 572], [1436, 534], [1505, 522], [1605, 497], [1705, 472], [1855, 452], [2000, 437]],
  2,
);
const LAND = [[0, -5], [2005, -5], ...COAST.slice().reverse()].reverse();
const coastPath0 = `M${COAST.map(([x, y]) => `${Math.round(x)} ${Math.round(y)}`).join('L')}`;
const RIVER_C = chaikin([[392, -12], [404, 60], [430, 130], [482, 200], [542, 266], [612, 326], [692, 386], [772, 431], [852, 476], [926, 531], [986, 591], [1036, 651], [1070, 706], [1094, 746], [1102, 790]], 3);
const RIVER = ribbon(RIVER_C, (t) => 12 + t * t * 40);
const LAGOON = chaikin([[716, 732], [790, 716], [866, 714], [944, 738], [950, 790], [902, 822], [850, 838], [826, 870], [806, 878], [790, 846], [740, 836], [704, 800]], 3, true);
const ISLAND = chaikin([[1530, 760], [1580, 712], [1650, 698], [1712, 716], [1730, 760], [1700, 808], [1630, 826], [1560, 808]], 3, true);
const ISLET = chaikin([[1760, 830], [1790, 812], [1822, 826], [1814, 852], [1778, 856]], 3, true);
const LAKE = chaikin([[1080, 300], [1130, 284], [1182, 300], [1196, 336], [1160, 368], [1104, 372], [1074, 344]], 3, true);

const ROADS = {
  m1: chaikin([[-5, 562], [250, 540], [420, 472], [520, 520], [604, 566], [700, 640], [780, 690], [880, 742], [962, 792]], 2),
  m2: chaikin([[900, 150], [904, 280], [910, 440], [916, 520], [884, 604], [836, 692]], 2),
  m3: chaikin([[560, 150], [700, 278], [800, 290], [1040, 268], [1240, 252], [1420, 304]], 2),
  m4: chaikin([[1040, 440], [1240, 440], [1400, 474], [1470, 512]], 2),
  m5: chaikin([[432, 382], [640, 520], [840, 600], [990, 664], [1060, 700]], 2),
  m6: chaikin([[1180, 560], [1212, 612], [1238, 662]], 2),
  m7: chaikin([[-5, 332], [250, 342], [432, 382]], 2),
  m8: chaikin([[604, 566], [658, 452], [694, 386], [722, 300]], 2),
};
const RAIL = chaikin([[-5, 604], [250, 588], [420, 562], [560, 600], [700, 690], [822, 770], [950, 826]], 3);
const BREAKWATER = chaikin([[1040, 846], [1092, 896], [1170, 912], [1232, 900]], 2);

/** Wilayah: data inti peta. `kind` menentukan cara menggambar isinya. */
const REGIONS = [
  { id: 'lorongsumbu', name: 'Lorong Sumbu', kind: 'kampung', since: 1931, musim: 1, cell: 24, angle: 33, warp: 6,
    watak: 'Kampung tepi Kali Sirah. Dulu tiap rumah menjual sumbu lampu; kini lampu-lampu itu yang menandai siapa masih terjaga.',
    streets: ['Gg. Sumbu Lilin', 'Gg. Minyak Tanah', 'Lorong Tepian', 'Gg. Sampan', 'Gg. Kemiri'],
    poly: [[468, 302], [590, 362], [710, 442], [840, 512], [936, 588], [990, 650], [900, 690], [780, 622], [640, 540], [520, 452], [430, 382]], label: [700, 520] },
  { id: 'tiangseribu', name: 'Kampung Tiang Seribu', kind: 'panggung', since: 1902, musim: 1,
    watak: 'Rumah panggung di atas laguna, berdiri di atas seribu tiang ulin. Anak-anak belajar berenang sebelum belajar membaca.',
    streets: ['Titian Bandeng', 'Titian Teripang', 'Titian Kerapu', 'Titian Pari'],
    poly: [[706, 704], [870, 700], [962, 726], [962, 806], [858, 846], [780, 852], [700, 812]], label: [834, 780] },
  { id: 'tujuhlonceng', name: 'Gang Tujuh Lonceng', kind: 'kotalama', since: 1858, musim: 1, cell: 17, angle: 8, warp: 4,
    watak: 'Kota tua berliku di bawah tujuh menara lonceng. Setiap pintu punya nomor lama dan nomor baru, dan orang-orang tua hanya hafal yang lama.',
    streets: ['Gg. Lonceng Satu', 'Gg. Kapur', 'Jl. Syahbandar', 'Gg. Tembaga', 'Gg. Kuntilanak', 'Jl. Juru Tulis'],
    poly: [[950, 470], [1080, 442], [1236, 432], [1268, 558], [1186, 640], [1086, 642], [996, 566]], label: [1120, 540] },
  { id: 'padanggubernur', name: 'Padang Gubernur', kind: 'kolonial', since: 1889, musim: null, cell: 58, angle: 2, warp: 1,
    watak: 'Gedung putih berpilar di sekeliling padang rumput. Jam di menara balai kota sengaja dibiarkan terlambat tujuh menit.',
    streets: ['Jl. Gubernuran'], poly: [[782, 282], [1022, 262], [1040, 424], [930, 440], [802, 442]], label: [912, 352] },
  { id: 'telagamangu', name: 'Telaga Mangu', kind: 'taman', since: 1925, musim: null, cell: 22, angle: 0, warp: 3,
    watak: 'Telaga tempat orang kota datang untuk melamun. Rumah-rumah di tepinya selalu tahu siapa yang sedang patah hati.',
    streets: ['Jl. Telaga'], poly: [[1040, 254], [1220, 242], [1240, 402], [1052, 422]], label: [1140, 400] },
  { id: 'pasarsenja', name: 'Pasar Senja', kind: 'pasar', since: 1912, musim: null, cell: 26, angle: -6, warp: 3,
    watak: 'Pasar yang baru ramai saat matahari turun. Harga ditawar dengan lagu, dan utang dicatat di tiang.',
    streets: ['Jl. Lapak'], poly: [[1222, 244], [1380, 244], [1424, 330], [1404, 462], [1242, 432], [1242, 400]], label: [1320, 350] },
  { id: 'lerengkabut', name: 'Lereng Kabut', kind: 'lereng', since: 1966, musim: null,
    watak: 'Jalan berkelok di kaki Bukit Seribu Undak. Kabut pagi turun seperti tamu yang tidak pernah mengetuk.',
    streets: ['Jl. Kelok'], poly: [[702, 210], [900, 156], [1100, 172], [1356, 160], [1384, 240], [1222, 244], [1040, 254], [782, 282], [700, 282]], label: [1040, 210] },
  { id: 'kampungpeluit', name: 'Kampung Peluit', kind: 'kampung', since: 1909, musim: null, cell: 23, angle: -12, warp: 5,
    watak: 'Rumah-rumah di sepanjang rel. Tak ada yang memakai jam dinding; semua hafal peluit kereta.',
    streets: ['Gg. Lori'], poly: [[252, 482], [470, 424], [560, 482], [640, 560], [700, 700], [560, 700], [400, 640], [262, 602]], label: [470, 560] },
  { id: 'dermagabesi', name: 'Dermaga Besi', kind: 'pelabuhan', since: 1974, musim: null,
    watak: 'Derek, gudang, dan kontainer. Orang datang dan pergi bersama kapal, dan sebagian lupa pamit.',
    streets: [], poly: [[962, 806], [990, 700], [1062, 722], [1082, 776], [1042, 846], [934, 862]], label: [1010, 790] },
  { id: 'tanjungjala', name: 'Tanjung Jala', kind: 'nelayan', since: 1881, musim: null, cell: 30, angle: 18, warp: 6,
    watak: 'Perahu ditarik ke pasir tiap sore. Ikan asin dijemur di atap, doa dibacakan untuk angin.',
    streets: [], poly: [[520, 762], [700, 722], [700, 812], [776, 860], [690, 900], [600, 925], [520, 905]], label: [610, 840] },
  { id: 'sawah', name: 'Sawah Seribu Petak', kind: 'sawah', since: 1800, musim: null,
    watak: 'Petak sawah yang tak pernah selesai dihitung. Kali kecil berkelok di antaranya, membawa kabar lebih cepat dari sepeda pos.',
    streets: [], poly: [[-5, 300], [432, 300], [432, 382], [262, 482], [262, 602], [400, 640], [520, 762], [520, 905], [300, 990], [-5, 1030]], label: [190, 700] },
  { id: 'pasirpengantin', name: 'Pasir Pengantin', kind: 'pantai', since: 1800, musim: null,
    watak: 'Pantai tempat orang kota menikah diam-diam, dan pulang dengan pasir di sepatu.', streets: [],
    poly: [[-5, 1030], [300, 990], [600, 925], [690, 900], [600, 950], [300, 1010], [-5, 1050]], label: [330, 985] },
  { id: 'bentenglimasudut', name: 'Benteng Lima Sudut', kind: 'benteng', since: 1702, musim: null,
    watak: 'Benteng bintang di ujung tanjung. Tempat bersama: siapa pun boleh menulis apa yang terjadi di sini.', streets: [],
    poly: [[1196, 646], [1252, 630], [1294, 668], [1260, 718], [1204, 712]], label: [1248, 676] },
  { id: 'rawakelana', name: 'Rawa Kelana', kind: 'bakau', since: 1800, musim: null,
    watak: 'Seribu alur air di antara bakau. Hanya tukang perahu yang tahu jalan pulangnya.', streets: [],
    poly: [[1384, 160], [2005, 120], [2005, 440], [1705, 472], [1505, 522], [1424, 462], [1424, 330]], label: [1720, 330] },
  { id: 'bukitseribuundak', name: 'Bukit Seribu Undak', kind: 'undak', since: 1800, musim: null,
    watak: 'Bukit bertingkat yang menjaga kota dari angin utara. Tiap undaknya ditanam oleh keluarga yang berbeda.', streets: [],
    poly: [[560, -5], [1460, -5], [1356, 160], [1100, 172], [900, 156], [702, 210], [560, 130]], label: [1000, 70] },
  { id: 'hutanpamali', name: 'Hutan Pamali', kind: 'hutan', since: 1800, musim: null,
    watak: 'Hutan yang tidak boleh dimasuki setelah magrib. Tidak ada yang ingat siapa yang melarang.', streets: [],
    poly: [[-5, -5], [560, -5], [560, 130], [468, 302], [432, 300], [-5, 300]], label: [230, 150] },
  { id: 'nusapelita', name: 'Nusa Pelita', kind: 'pulau', since: 1891, musim: null,
    watak: 'Pulau kecil dengan mercusuar. Penjaga suar mencatat setiap kapal, dan setiap orang yang tidak kembali.', streets: [],
    poly: ISLAND.map((p) => [Math.round(p[0]), Math.round(p[1])]), label: [1630, 760] },
];

// ── Lapisan gambar ─────────────────────────────────────────────────────────
const L = { land: [], fields: [], water: [], terr: [], roads: [], shadow: [], bld: [], trees: [], top: [], text: [], island: [] };
const C = {
  ink: '#2b2350',
  line: '#5b4a3a',
  paper: '#f2e9d2',
  land: '#c9d8a0',
  sea: '#2c7da0',
  sea2: '#1f5f86',
  shallow: '#6fb6c4',
  river: '#4a98b3',
  sand: '#ecd7a3',
  street: '#fbf4e2',
  roofs: ['#c4573e', '#cf6a48', '#b5472f', '#d8805a', '#bf5f43', '#a94a35', '#d06d52'],
  white: ['#f4efe4', '#efe8da', '#f7f2e8'],
  grey: ['#8a909a', '#9aa0a8', '#7d848f'],
  green: ['#6f9d55', '#5f8f4a', '#86b067', '#4f7f3f', '#7aa65c'],
  field: ['#b9d37c', '#a6c868', '#c9dc8e', '#9cbf5a', '#d3e2a0', '#b0cd70'],
};

// Indeks ruang sederhana untuk menghindari tumpang tindih.
const GRID = 12;
const occ = new Map();
const key = (x, y) => `${Math.floor(x / GRID)},${Math.floor(y / GRID)}`;
function free(x, y, r) {
  for (let i = -1; i <= 1; i++)
    for (let j = -1; j <= 1; j++) {
      const b = occ.get(`${Math.floor(x / GRID) + i},${Math.floor(y / GRID) + j}`);
      if (b) for (const o of b) if (Math.hypot(o[0] - x, o[1] - y) < r + o[2]) return false;
    }
  return true;
}
function mark(x, y, r) {
  const k = key(x, y);
  if (!occ.has(k)) occ.set(k, []);
  occ.get(k).push([x, y, r]);
}
const ROAD_W = { m1: 8, m2: 9, m3: 8, m4: 7, m5: 7, m6: 6, m7: 7, m8: 7 };
function onWater(p, pad = 3) {
  if (!inside(p, LAND)) return !(inside(p, ISLAND) || inside(p, ISLET));
  if (inside(p, RIVER) || distLine(p, RIVER_C) < 8 + pad) return true;
  if (inside(p, LAGOON)) return true;
  if (inside(p, LAKE)) return true;
  return false;
}
function onRoad(p, pad = 3) {
  for (const [k, line] of Object.entries(ROADS)) if (distLine(p, line) < ROAD_W[k] / 2 + pad) return true;
  if (distLine(p, RAIL) < 4 + pad) return true;
  return false;
}

// Rumah: persegi berputar dengan atap pelana.
const plots = [];
const FEAT = { houses: [], trees: [] };
function house(x, y, w, d, ang, opts = {}) {
  const roof = opts.roof ?? pick(C.roofs);
  const r = Math.hypot(w, d) / 2;
  mark(x, y, r * 0.8);
  const ridge = w >= d ? `M${f1(-w / 2 + 1)} 0H${f1(w / 2 - 1)}` : `M0 ${f1(-d / 2 + 1)}V${f1(d / 2 - 1)}`;
  L.shadow.push(`<rect x="${f1(x - w / 2 + 1.2)}" y="${f1(y - d / 2 + 1.4)}" width="${f1(w)}" height="${f1(d)}" transform="rotate(${f1(ang)} ${f1(x + 1.2)} ${f1(y + 1.4)})"/>`);
  L.bld.push(
    `<g transform="translate(${f1(x)} ${f1(y)}) rotate(${f1(ang)})"><rect x="${f1(-w / 2)}" y="${f1(-d / 2)}" width="${f1(w)}" height="${f1(d)}" fill="${roof}"/><path d="${ridge}" class="rg"/>${opts.extra ?? ''}</g>`,
  );
  const kind = opts.kind ?? (w >= 18 || d >= 18 ? 'gudang' : w < 5.2 && d < 5.2 ? 'lapak' : ['#f4efe4', '#efe8da', '#f7f2e8'].includes(roof) ? 'putih' : 'rumah');
  FEAT.houses.push([f1(x), f1(y), f1(w), f1(d), f1(ang), roof, kind]);
  if (opts.plot) plots.push({ region: opts.plot.region, block: opts.plot.block, x: f1(x), y: f1(y) });
}
function tree(x, y, r, tone) {
  mark(x, y, r * 0.7);
  const g = tone ?? pick(C.green);
  FEAT.trees.push([f1(x), f1(y), f1(r), g]);
}
function scatterTrees(poly, n, rmin, rmax, opts = {}) {
  const b = bbox(poly);
  for (let i = 0; i < n; i++) {
    const p = [rr(b.x0, b.x1), rr(b.y0, b.y1)];
    if (!inside(p, poly) || onWater(p, 1) || (opts.roads !== false && onRoad(p, 1))) continue;
    if (opts.dens && fbm(p[0] * 0.01, p[1] * 0.01, 5) < opts.dens) continue;
    const r = rr(rmin, rmax);
    if (free(p[0], p[1], r * 0.75)) tree(p[0], p[1], r, opts.tone);
  }
}

/** Blok jalan organik: kisi berputar yang dibengkokkan derau, dipotong ke wilayah. */
function blocks(R) {
  const b = bbox(R.poly);
  const [cx, cy] = centroid(R.poly);
  const a = (R.angle * Math.PI) / 180;
  const ca = Math.cos(a);
  const sa = Math.sin(a);
  const span = Math.hypot(b.x1 - b.x0, b.y1 - b.y0) / 2 + R.cell * 2;
  const n = Math.ceil(span / R.cell);
  const warp = (u, v) => {
    const x = cx + u * ca - v * sa;
    const y = cy + u * sa + v * ca;
    return [x + (fbm(x * 0.012, y * 0.012, 11) - 0.5) * R.warp * 4, y + (fbm(x * 0.012 + 70, y * 0.012 + 70, 12) - 0.5) * R.warp * 4];
  };
  const out = [];
  for (let i = -n; i < n; i++)
    for (let j = -n; j < n; j++) {
      // Blok memanjang: setiap baris kedua digabung dua sel, supaya gang tidak seragam.
      const wide = hash2(i, j, R.cell) > 0.62 ? 2 : 1;
      if (wide === 2 && hash2(i - 1, j, R.cell) > 0.62) continue;
      const u0 = i * R.cell;
      const v0 = j * R.cell * 0.78;
      const q = [warp(u0, v0), warp(u0 + R.cell * wide, v0), warp(u0 + R.cell * wide, v0 + R.cell * 0.78), warp(u0, v0 + R.cell * 0.78)];
      const c = centroid(q);
      if (!inside(c, R.poly)) continue;
      out.push(q);
    }
  return out;
}

/** Rumah berjajar di tepi blok menghadap jalan, halaman dan pohon di tengahnya. */
function fillBlock(q, R, bi, o) {
  const inner = shrink(q, o.street ?? 2.6);
  L.land.push(`<polygon points="${pts(inner)}" fill="${o.ground ?? '#e3d6b4'}" stroke="#a89670" stroke-opacity=".35" stroke-width=".5"/>`);
  for (let e = 0; e < 4; e++) {
    const A = inner[e];
    const B = inner[(e + 1) % 4];
    const len = Math.hypot(B[0] - A[0], B[1] - A[1]);
    const ang = (Math.atan2(B[1] - A[1], B[0] - A[0]) * 180) / Math.PI;
    const nx = -(B[1] - A[1]) / len;
    const ny = (B[0] - A[0]) / len;
    const [cx, cy] = centroid(inner);
    const sgn = (cx - A[0]) * nx + (cy - A[1]) * ny > 0 ? 1 : -1;
    let t = rr(1.5, 4);
    while (t < len - 4) {
      const w = rr(o.w[0], o.w[1]);
      const d = rr(o.d[0], o.d[1]);
      const px = A[0] + ((B[0] - A[0]) * (t + w / 2)) / len + nx * sgn * (d / 2 + 0.4);
      const py = A[1] + ((B[1] - A[1]) * (t + w / 2)) / len + ny * sgn * (d / 2 + 0.4);
      t += w + rr(0.4, o.gap ?? 2.2);
      if (!inside([px, py], R.poly) || onWater([px, py], 1.5) || onRoad([px, py], 1.2) || !free(px, py, Math.min(w, d) * 0.45)) continue;
      if (hash2(Math.round(px), Math.round(py), 3) < (o.skip ?? 0.06)) continue;
      house(px, py, w, d, ang, { roof: o.roof?.(), plot: R.musim ? { region: R.id, block: bi } : null });
    }
  }
  const [cx, cy] = centroid(inner);
  if (!onWater([cx, cy]) && free(cx, cy, 3)) tree(cx, cy, rr(2.6, 4.4));
}

/** Alas wilayah dengan tepi organik (bukan garis penggaris). */
function base(R, fill) {
  L.land.push(`<path d="${pathD(wobble(chaikin(R.poly, 3, true), 5, 0.03, 13), true)}" fill="${fill}"/>`);
}
function drawRegion(R) {
  if (['kampung', 'kotalama', 'kolonial', 'pasar', 'nelayan'].includes(R.kind)) base(R, R.kind === 'kotalama' ? '#efe3c3' : '#f1e8cc');
  if (R.kind === 'kampung' || R.kind === 'kotalama') {
    const bs = blocks(R);
    bs.forEach((q, i) =>
      fillBlock(q, R, i, R.kind === 'kotalama' ? { w: [4.5, 7.5], d: [5, 7.5], gap: 0.9, street: 2.6, skip: 0.02, ground: '#d6c9a0' } : { w: [5.5, 9], d: [5.5, 8], gap: 2.2, street: 3.4, ground: '#bfcf8e' }),
    );
    scatterTrees(R.poly, R.kind === 'kotalama' ? 200 : 900, 2.2, 4.2);
    if (R.kind === 'kotalama') bells(R);
  } else if (R.kind === 'kolonial') colonial(R);
  else if (R.kind === 'taman') park(R);
  else if (R.kind === 'pasar') market(R);
  else if (R.kind === 'lereng') slope(R);
  else if (R.kind === 'panggung') stilts(R);
  else if (R.kind === 'pelabuhan') port(R);
  else if (R.kind === 'nelayan') fishers(R);
  else if (R.kind === 'sawah') paddy(R);
  else if (R.kind === 'pantai') beach(R);
  else if (R.kind === 'benteng') fort(R);
  else if (R.kind === 'bakau') mangrove(R);
  else if (R.kind === 'undak') terraces(R);
  else if (R.kind === 'hutan') (base(R, '#4d7a3a'), scatterTrees(R.poly, 9000, 4, 8.5, { roads: false, tone: undefined }));
  else if (R.kind === 'pulau') island(R);
}

function bells(R) {
  const spots = [[1010, 520], [1060, 470], [1130, 455], [1200, 470], [1230, 540], [1150, 600], [1070, 600]];
  for (const [x, y] of spots) {
    L.top.push(`<g transform="translate(${x} ${y})"><rect x="-3.4" y="-3.4" width="6.8" height="6.8" fill="#f5f0e4" stroke="${C.line}" stroke-width=".5"/><path d="M-3.4 -3.4L0 -8L3.4 -3.4Z" fill="#7d8796" stroke="${C.line}" stroke-width=".5"/><circle cy="-.6" r="1.3" fill="#c9a24a"/></g>`);
    mark(x, y, 6);
  }
}
function colonial(R) {
  const bs = blocks(R);
  const [cx, cy] = [912, 360];
  L.land.push(`<rect x="${cx - 42}" y="${cy - 30}" width="84" height="60" rx="6" fill="#a9c97f"/><path d="M${cx - 42} ${cy}H${cx + 42}M${cx} ${cy - 30}V${cy + 30}M${cx - 30} ${cy - 22}L${cx + 30} ${cy + 22}M${cx + 30} ${cy - 22}L${cx - 30} ${cy + 22}" stroke="${C.street}" stroke-width="2.4"/><circle cx="${cx}" cy="${cy}" r="8" fill="${C.street}"/><circle cx="${cx}" cy="${cy}" r="5" fill="#6fb6c4" stroke="${C.line}" stroke-width=".6"/>`);
  mark(cx, cy, 44);
  for (let i = 0; i < 40; i++) {
    const a = (i / 40) * Math.PI * 2;
    tree(cx + Math.cos(a) * 46, cy + Math.sin(a) * 34, 3.2, '#5f8f4a');
  }
  bs.forEach((q, i) => fillBlock(q, R, i, { w: [10, 18], d: [8, 12], gap: 4, street: 4, skip: 0.15, ground: '#d9d0b4', roof: () => pick(['#f4efe4', '#efe8da', '#8a909a', '#c4573e']) }));
  scatterTrees(R.poly, 500, 2.6, 4);
  // Balai kota dengan menara jam.
  house(912, 300, 34, 14, 0, { roof: '#f4efe4', extra: `<rect x="-3" y="-11" width="6" height="8" fill="#e4dccb" stroke="${C.line}" stroke-width=".5"/><circle cy="-7" r="1.8" fill="#fff" stroke="${C.line}" stroke-width=".4"/>` });
}
function park(R) {
  L.land.push(`<polygon points="${pts(shrink(R.poly, 6))}" fill="#b5d48b"/>`);
  L.water.push(`<path d="${pathD(LAKE, true)}" fill="${C.shallow}" stroke="${C.line}" stroke-width=".8"/><path d="${pathD(shrink(LAKE, 5), true)}" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width=".6"/>`);
  for (const r of [70, 92]) L.roads.push(`<ellipse cx="1136" cy="330" rx="${r}" ry="${r * 0.7}" fill="none" stroke="${C.street}" stroke-width="2.4"/>`);
  L.top.push(`<g transform="translate(1086 282)"><circle r="6" fill="#f5f0e4" stroke="${C.line}" stroke-width=".6"/><path d="M-7 0L0 -7L7 0" fill="#c4573e" stroke="${C.line}" stroke-width=".5"/></g>`);
  mark(1086, 282, 8);
  scatterTrees(R.poly, 1600, 2.6, 5, { roads: false });
  const bs = blocks(R).filter((q) => distLine(centroid(q), [[1050, 254], [1220, 242], [1240, 402], [1052, 422], [1050, 254]]) < 18);
  bs.forEach((q, i) => fillBlock(q, R, i, { w: [6, 9], d: [6, 8], gap: 3, ground: '#cfdba8' }));
}
function market(R) {
  const bs = blocks(R);
  bs.forEach((q, i) => {
    if (i % 5 === 2) {
      const [x, y] = centroid(q);
      if (!onRoad([x, y], 2)) {
        house(x, y, R.cell * 0.9, R.cell * 0.5, R.angle, { roof: '#7d848f', extra: `<path d="M${-R.cell * 0.45} -1H${R.cell * 0.45}M${-R.cell * 0.45} 2H${R.cell * 0.45}" stroke="#5b616b" stroke-width=".5"/>` });
        return;
      }
    }
    fillBlock(q, R, i, { w: [3, 5], d: [3, 4.5], gap: 0.8, street: 2.2, ground: '#dccfae', roof: () => pick(['#d9534f', '#f0ad4e', '#5bc0de', '#e8e2d0', '#c4573e', '#8fbf5a']) });
  });
}
function slope(R) {
  const lanes = [
    chaikin([[712, 270], [760, 236], [820, 250], [880, 214], [940, 232], [1000, 200], [1060, 226], [1120, 196], [1190, 220], [1260, 190], [1340, 214]], 3),
    chaikin([[780, 276], [850, 262], [930, 270], [1000, 246], [1080, 252], [1150, 236], [1230, 238], [1300, 226], [1376, 236]], 3),
    chaikin([[900, 170], [930, 200], [960, 180], [1000, 214], [1040, 196]], 3),
    chaikin([[1100, 176], [1140, 200], [1200, 186], [1250, 206], [1320, 176], [1370, 196]], 3),
    chaikin([[720, 240], [770, 214], [830, 222], [880, 196]], 3),
  ];
  for (const ln of lanes) {
    L.roads.push(`<path d="${pathD(ln)}" class="r-in"/><path d="${pathD(ln)}" class="r-out" stroke-width="3.2"/>`);
    for (let i = 1; i < ln.length; i += 1) {
      const [a, b] = [ln[i - 1], ln[i]];
      const ang = (Math.atan2(b[1] - a[1], b[0] - a[0]) * 180) / Math.PI;
      for (const s of [-1, 1]) {
        const nx = -(b[1] - a[1]);
        const ny = b[0] - a[0];
        const d = Math.hypot(nx, ny) || 1;
        const p = [a[0] + (nx / d) * 7 * s, a[1] + (ny / d) * 7 * s];
        if (hash2(Math.round(p[0]), Math.round(p[1]), 9) < 0.8 && inside(p, R.poly) && !onRoad(p, 1) && free(p[0], p[1], 4)) house(p[0], p[1], rr(5.5, 8), rr(5, 7), ang);
      }
    }
  }
  scatterTrees(R.poly, 2600, 2.6, 5);
}
function stilts(R) {
  // Titian dari darat ke tengah laguna, rumah panggung di kiri-kanannya.
  const piers = [
    [[724, 740], [790, 772]], [[790, 722], [812, 790]], [[862, 718], [852, 796]], [[934, 744], [884, 800]], [[946, 786], [880, 816]], [[712, 798], [784, 806]], [[800, 846], [826, 818]],
  ];
  piers.forEach(([a, b], bi) => {
    L.top.push(`<path d="M${a[0]} ${a[1]}L${b[0]} ${b[1]}" stroke="#8a6a43" stroke-width="2.2" stroke-linecap="round"/><path d="M${a[0]} ${a[1]}L${b[0]} ${b[1]}" stroke="#c9a46a" stroke-width="1.2" stroke-dasharray="1 1.2"/>`);
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const ang = (Math.atan2(b[1] - a[1], b[0] - a[0]) * 180) / Math.PI;
    const nx = -(b[1] - a[1]) / len;
    const ny = (b[0] - a[0]) / len;
    for (let t = 6; t < len - 2; t += 7.5)
      for (const s of [-1, 1]) {
        const x = a[0] + ((b[0] - a[0]) * t) / len + nx * 5.5 * s;
        const y = a[1] + ((b[1] - a[1]) * t) / len + ny * 5.5 * s;
        if (!inside([x, y], LAGOON) || !free(x, y, 3.2)) continue;
        L.water.push(`<g fill="#5a4630"><circle cx="${f1(x - 2.4)}" cy="${f1(y + 3.6)}" r=".55"/><circle cx="${f1(x + 2.4)}" cy="${f1(y + 3.6)}" r=".55"/></g>`);
        house(x, y, rr(5.5, 7), rr(5, 6.5), ang, { roof: pick(['#c4573e', '#b5472f', '#7d848f', '#d8805a']), plot: { region: R.id, block: bi } });
      }
  });
  for (let i = 0; i < 9; i++) boat(rr(730, 930), rr(740, 830), rr(0, 180), 0.8, LAGOON);
}
function boat(x, y, a, s = 1, within) {
  if (within && !inside([x, y], within)) return;
  L.top.push(`<g transform="translate(${f1(x)} ${f1(y)}) rotate(${f1(a)}) scale(${s})"><path d="M-6 0Q0 3.5 6 0L4.5 -1.6H-4.5Z" fill="${pick(['#e8e2d0', '#c4573e', '#2b5d7a', '#d8a24a'])}" stroke="${C.line}" stroke-width=".5"/></g>`);
}
function port(R) {
  L.land.push(`<polygon points="${pts(R.poly)}" fill="#d8d2c4"/>`);
  const ware = [[986, 730, 30, 13], [1022, 740, 26, 12], [1000, 760, 34, 12], [1040, 770, 22, 14]];
  for (const [x, y, w, d] of ware) house(x, y, w, d, 12, { roof: pick(C.grey), extra: `<path d="M${-w / 2} -2H${w / 2}M${-w / 2} 2H${w / 2}" stroke="#646a73" stroke-width=".4"/>` });
  for (let i = 0; i < 70; i++) {
    const x = rr(960, 1050);
    const y = rr(788, 840);
    if (!inside([x, y], R.poly) || !free(x, y, 1.6)) continue;
    mark(x, y, 1.6);
    L.top.push(`<rect x="${f1(x)}" y="${f1(y)}" width="5.2" height="2.2" fill="${pick(['#d9534f', '#3f7fbf', '#e0a33a', '#3d9970', '#e8e2d0', '#8e44ad'])}" stroke="${C.line}" stroke-width=".3" transform="rotate(12 ${f1(x)} ${f1(y)})"/>`);
  }
  for (const [x, y] of [[1052, 812], [1066, 790], [1020, 846]])
    L.top.push(`<g transform="translate(${x} ${y})" stroke="#d6a22a" stroke-width="1.4" fill="none"><path d="M0 0V-14L10 -12"/><path d="M-3 0H3"/><path d="M8 -12V-6" stroke-width=".6"/></g>`);
  ship(1110, 840, 18);
  ship(1150, 870, 24);
}
function ship(x, y, a) {
  L.top.push(`<g transform="translate(${x} ${y}) rotate(${a})"><path d="M-18 -4H14L19 0L14 4H-18Z" fill="#2b4a6b" stroke="${C.line}" stroke-width=".6"/><rect x="-14" y="-2.6" width="22" height="5.2" fill="#c9a24a"/><rect x="-14" y="-2.6" width="5" height="5.2" fill="#d9534f"/><rect x="-7" y="-2.6" width="5" height="5.2" fill="#3f7fbf"/><rect x="10" y="-2" width="4" height="4" fill="#f4efe4"/></g>`);
}
function fishers(R) {
  const bs = blocks(R);
  bs.forEach((q, i) => fillBlock(q, R, i, { w: [5, 8], d: [5, 7], gap: 4, street: 3.2, skip: 0.25, ground: '#e6dbb8' }));
  scatterTrees(R.poly, 500, 2.4, 4.4, { tone: '#6f9d55' });
  for (let i = 0; i < 16; i++) boat(rr(560, 760), rr(880, 930), rr(-30, 30), 0.9);
}
function paddy(R) {
  const b = bbox(R.poly);
  const cell = 42;
  for (let x = b.x0 - cell; x < b.x1 + cell; x += cell * 0.9)
    for (let y = b.y0 - cell; y < b.y1 + cell; y += cell * 0.62) {
      const q = [[x, y], [x + cell, y + 8], [x + cell - 6, y + cell * 0.62 + 6], [x - 6, y + cell * 0.62]].map(([px, py]) => [px + (fbm(px * 0.01, py * 0.01, 4) - 0.5) * 20, py + (fbm(px * 0.01 + 9, py * 0.01, 4) - 0.5) * 16]);
      const c = centroid(q);
      if (!inside(c, R.poly) || onWater(c, 2)) continue;
      const inner = shrink(q, 1.3);
      const tone = pick(C.field);
      L.fields.push(`<polygon points="${pts(inner)}" fill="${tone}" stroke="#8aa055" stroke-width=".5"/>`);
      const a = Math.atan2(q[1][1] - q[0][1], q[1][0] - q[0][0]);
      const rows = [];
      for (let k = 3; k < 30; k += 3.2) rows.push(`M${f1(inner[0][0] + Math.sin(a) * -k)} ${f1(inner[0][1] + Math.cos(a) * k)}l${f1(Math.cos(a) * 40)} ${f1(Math.sin(a) * 40)}`);
      L.fields.push(`<path d="${rows.join('')}" stroke="#7e9a4a" stroke-opacity=".35" stroke-width=".5" clip-path="url(#sawahclip)"/>`);
    }
  // Kampung-kampung kecil di sepanjang jalan.
  for (const line of [ROADS.m1, ROADS.m7]) {
    for (let i = 2; i < line.length; i += 1) {
      const [a, b2] = [line[i - 1], line[i]];
      if (hash2(i, line.length, 5) < 0.55) continue;
      for (let k = 0; k < 6; k++) {
        const p = [a[0] + rr(-18, 18), a[1] + rr(-16, 16)];
        if (!inside(p, R.poly) || onRoad(p, 2) || onWater(p, 2) || !free(p[0], p[1], 4)) continue;
        house(p[0], p[1], rr(5, 8), rr(5, 7), (Math.atan2(b2[1] - a[1], b2[0] - a[0]) * 180) / Math.PI);
      }
    }
  }
  scatterTrees(R.poly, 1600, 2.5, 4.5, { dens: 0.52 });
  // Kali kecil berkelok di tengah sawah.
  const creek = chaikin([[60, 300], [90, 420], [160, 470], [130, 560], [200, 640], [180, 760], [250, 860], [230, 990]], 3);
  L.water.push(`<path d="${pathD(wobble(creek, 3))}" fill="none" stroke="${C.line}" stroke-opacity=".5" stroke-width="5.6" stroke-linecap="round"/><path d="${pathD(wobble(creek, 3))}" fill="none" stroke="${C.river}" stroke-width="4.2" stroke-linecap="round"/>`);
}
function beach(R) {
  L.land.push(`<polygon points="${pts(R.poly)}" fill="${C.sand}"/>`);
  for (let i = 0; i < 140; i++) {
    const p = [rr(0, 690), rr(900, 1050)];
    if (inside(p, R.poly) && free(p[0], p[1], 3)) tree(p[0], p[1], rr(2, 3.4), '#7aa65c');
  }
}
function fort(R) {
  const [cx, cy] = [1246, 674];
  const star = [];
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const r = i % 2 ? 22 : 40;
    star.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
  L.top.push(`<polygon points="${pts(star)}" fill="#cfc6ae" stroke="${C.line}" stroke-width="1.2"/><polygon points="${pts(shrink(star, 6))}" fill="#9fc27a" stroke="#b9ae92" stroke-width="1.4"/>`);
  for (const [x, y, w, d] of [[1240, 668, 16, 8], [1256, 684, 10, 7]]) L.top.push(`<rect x="${x - w / 2}" y="${y - d / 2}" width="${w}" height="${d}" fill="#c4573e" stroke="${C.line}" stroke-width=".5"/>`);
  mark(cx, cy, 42);
}
function mangrove(R) {
  L.land.push(`<path d="${pathD(wobble(chaikin(R.poly, 3, true), 14, 0.02, 17), true)}" fill="#5f8f45"/>`);
  // Alur bakau: dari muara di pantai, berkelok dan bercabang ke darat; makin ke muara makin lebar.
  const mouths = [1440, 1530, 1610, 1700, 1790, 1880, 1960];
  const mr = mulberry(311);
  const grow = (p, ang, w, depth) => {
    const line = [p];
    for (let i = 0; i < 26; i++) {
      ang += (fbm(p[0] * 0.02, p[1] * 0.02, 40 + depth) - 0.5) * 0.9;
      p = [p[0] + Math.cos(ang) * 9, p[1] + Math.sin(ang) * 9];
      if (!inside(p, R.poly) || p[1] < 150) break;
      line.push(p);
      if (depth < 2 && mr() < 0.12) grow(p, ang + (mr() < 0.5 ? -0.7 : 0.7), w * 0.6, depth + 1);
    }
    const sm2 = chaikin(line, 2);
    L.water.push(`<path d="${pathD(ribbon(sm2, (t) => w * (1 - t * 0.75)), true)}" fill="${C.river}" stroke="#3f6b3a" stroke-opacity=".5" stroke-width=".6"/>`);
  };
  for (const x of mouths) {
    let y = 0;
    for (const c of COAST) if (Math.abs(c[0] - x) < 30) y = c[1];
    if (!y) continue;
    L.land.push(`<ellipse cx="${x + 10}" cy="${y - 4}" rx="${22 + mr() * 18}" ry="${7 + mr() * 5}" fill="${C.sand}" transform="rotate(-12 ${x} ${y})"/>`);
    grow([x, y + 4], -Math.PI / 2 + (mr() - 0.5) * 0.5, 9 + mr() * 6, 0);
  }
  // Jaga urutan acak lama (penempatan persil di wilayah lain bergantung padanya).
  for (let k = 0; k < 14; k++) {
    let p = [rr(1430, 1990), rr(140, 300)];
    const line = [p];
    for (let i = 0; i < 30; i++) {
      const ang = Math.PI / 2 + (fbm(p[0] * 0.012, p[1] * 0.012, 30 + k) - 0.5) * 3.4;
      p = [p[0] + Math.cos(ang) * 12, p[1] + Math.sin(ang) * 12];
      line.push(p);
      if (!inside(p, LAND)) break;
    }
    rr(3, 7);
    for (let j = 4; j < line.length; j += 6) (rr(-40, 40), rr(10, 40));
  }
  scatterTrees(R.poly, 6000, 3, 6, { roads: false, tone: undefined });
}
function terraces(R) {
  const [cx, cy] = [1000, 70];
  for (let k = 0; k < 22; k++) {
    const r = 230 - k * 9.5;
    const ring = [];
    for (let i = 0; i <= 80; i++) {
      const a = (i / 80) * Math.PI * 2;
      const rad = r * (1 + (fbm(Math.cos(a) * 2 + k * 0.05, Math.sin(a) * 2, 40) - 0.5) * 0.35);
      ring.push([cx + Math.cos(a) * rad * 1.5, cy + Math.sin(a) * rad * 0.8]);
    }
    L.terr.push(`<path d="${pathD(ring, true)}" fill="${k % 2 ? '#9cc06a' : '#b3d07e'}" stroke="#6f8f4a" stroke-width=".7"/>`);
  }
  scatterTrees(R.poly, 2200, 3.5, 7, { roads: false, dens: 0.46 });
}
function island(R) {
  L.island.push(`<path d="${pathD(ISLAND, true)}" fill="#d9c79a" stroke="${C.line}" stroke-width="1"/><path d="${pathD(wobble(shrink(ISLAND, 7), 3), true)}" fill="#8db86a"/>`);
  L.island.push(`<path d="${pathD(ISLET, true)}" fill="#d9c79a" stroke="${C.line}" stroke-width=".8"/><path d="${pathD(shrink(ISLET, 4), true)}" fill="#8db86a"/>`);
  scatterTrees(shrink(ISLAND, 8), 500, 3, 5.5, { roads: false });
  scatterTrees(shrink(ISLET, 4), 60, 2.5, 4, { roads: false });
  L.top.push(`<g transform="translate(1660 726)"><rect x="-3.6" y="-16" width="7.2" height="18" fill="#f7f2e8" stroke="${C.line}" stroke-width=".6"/><rect x="-3.6" y="-10" width="7.2" height="3" fill="#c4573e"/><rect x="-4.6" y="-19" width="9.2" height="3.4" fill="#c4573e" stroke="${C.line}" stroke-width=".5"/><circle cy="-21" r="2.2" fill="#f7d774"/><path d="M0 -21L-60 -40M0 -21L-60 -2" stroke="#f7d774" stroke-opacity=".35" stroke-width="2.4"/></g>`);
  L.top.push(`<path d="M1530 772L1500 790" stroke="#8a6a43" stroke-width="2.2"/>`);
}

// ── Susun ───────────────────────────────────────────────────────────────────
const order = ['hutanpamali', 'bukitseribuundak', 'rawakelana', 'sawah', 'pasirpengantin', 'lerengkabut', 'padanggubernur', 'telagamangu', 'pasarsenja', 'kampungpeluit', 'tujuhlonceng', 'lorongsumbu', 'tiangseribu', 'dermagabesi', 'tanjungjala', 'bentenglimasudut', 'nusapelita'];
// Jalan utama dulu ditandai supaya rumah tidak menutupinya.
for (const [k, line] of Object.entries(ROADS)) {
  L.roads.push(`<path d="${pathD(line)}" class="r-in" stroke-width="${ROAD_W[k] + 1.6}"/><path d="${pathD(line)}" class="r-out" stroke-width="${ROAD_W[k]}"/>`);
}
L.roads.push(`<path d="${pathD(RAIL)}" stroke="#4a3f36" stroke-width="3.2" fill="none"/><path d="${pathD(RAIL)}" stroke="#e8dcc0" stroke-width="1.6" stroke-dasharray="1.2 2" fill="none"/>`);
for (const id of order) drawRegion(REGIONS.find((r) => r.id === id));
// Hutan menutup seluruh utara, termasuk sudut timur laut.
L.land.push(`<path d="${pathD(wobble(chaikin([[1380, -5], [2005, -5], [2005, 150], [1384, 172]], 3, true), 10), true)}" fill="#4d7a3a"/><path d="${pathD(wobble(chaikin([[-5, -5], [2005, -5], [2005, 50], [-5, 50]], 2, true), 6), true)}" fill="#4d7a3a"/>`);
scatterTrees([[1384, -5], [2005, -5], [2005, 140], [1384, 168]], 5000, 4, 8.5, { roads: false });
scatterTrees([[-5, -5], [2005, -5], [2005, 60], [-5, 60]], 3000, 4, 8, { roads: false });
// Pedesaan di sela wilayah: rumpun pohon dan rumah-rumah kecil yang berjauhan.
const inAny = (p) => REGIONS.some((r) => inside(p, r.poly));
for (let i = 0; i < 26000; i++) {
  const p = [rr(0, W), rr(0, H)];
  if (inAny(p) || onWater(p, 2) || onRoad(p, 2)) continue;
  const d = fbm(p[0] * 0.008, p[1] * 0.008, 61);
  if (d > 0.5 && free(p[0], p[1], 3.4)) tree(p[0], p[1], rr(2.6, 5.4));
  else if (d < 0.32 && hash2(Math.round(p[0]), Math.round(p[1]), 77) < 0.04 && free(p[0], p[1], 5)) house(p[0], p[1], rr(5, 8), rr(5, 7), rr(-20, 20));
}

// Kebun berbaris di padang kosong: pohon buah dalam petak-petak kecil.
{
  const kr = mulberry(512);
  const inAny2 = (p) => REGIONS.some((r) => inside(p, r.poly));
  for (let i = 0; i < 70; i++) {
    const cx = kr() * W;
    const cy = 120 + kr() * 900;
    if (inAny2([cx, cy]) || onWater([cx, cy], 20) || onRoad([cx, cy], 20)) continue;
    const a = kr() * Math.PI;
    for (let u = -3; u <= 3; u++)
      for (let v = -2; v <= 2; v++) {
        const x = cx + Math.cos(a) * u * 7 - Math.sin(a) * v * 7;
        const y = cy + Math.sin(a) * u * 7 + Math.cos(a) * v * 7;
        if (!inAny2([x, y]) && !onWater([x, y], 2) && !onRoad([x, y], 2) && free(x, y, 2.6)) tree(x, y, 2.6 + kr() * 0.6, kr() < 0.5 ? '#7aa65c' : '#6f9d55');
      }
  }
}

// Laut: garis kedalaman, beting karang, dan perahu layar.
{
  const lr = mulberry(901);
  for (const [w, o] of [[230, 0.1], [330, 0.07]]) L.top.unshift(`<path d="${coastPath0}" fill="none" stroke="#ffffff" stroke-opacity="${o}" stroke-width="1" stroke-dasharray="2 6" transform="translate(0 ${w / 4})"/>`);
  const reef = (x, y, rx, ry, a) => L.top.unshift(`<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="#7fd0d2" fill-opacity=".45" filter="url(#lembut)" transform="rotate(${a} ${x} ${y})"/><ellipse cx="${x}" cy="${y}" rx="${rx * 0.5}" ry="${ry * 0.45}" fill="#b9ecdf" fill-opacity=".45" filter="url(#lembut)" transform="rotate(${a} ${x} ${y})"/>`);
  reef(560, 1070, 90, 26, -6);
  reef(1820, 700, 70, 22, 18);
  reef(1450, 830, 50, 16, -20);
  for (const [x, y] of [[548, 1066], [574, 1074], [590, 1062], [1812, 694], [1834, 708], [1446, 826]]) L.top.push(`<circle cx="${x}" cy="${y}" r="${1.6 + lr() * 1.6}" fill="#8a8170" stroke="#5b4a3a" stroke-width=".4"/>`);
  const sail = (x, y, a) => L.top.push(`<g transform="translate(${x} ${y}) rotate(${a})"><path d="M-14 1Q-24 0 -32 1" stroke="#ffffff" stroke-opacity=".5" stroke-width=".8" fill="none"/><path d="M-5 0Q0 2.6 6 0L4.6 -1.4H-4Z" fill="#f4efe4" stroke="${C.line}" stroke-width=".4"/><path d="M0 -1V-10L6 -2Z" fill="#ffffff" stroke="${C.line}" stroke-width=".4"/></g>`);
  sail(1330, 980, -8);
  sail(860, 1060, 6);
  sail(1880, 990, -14);
  sail(1500, 640, 10);
  for (let i = 0; i < 16; i++) {
    const x = 700 + lr() * 1200;
    const y = 900 + lr() * 200;
    if (!inside([x, y], LAND)) boat(x, y, lr() * 40 - 20, 0.9);
  }
}

// Bangunan penanda di wilayah yang belum dibuka (digambar di atas, tidak mengubah persil).
const tegak = (x, y, body) => L.top.push(`<g transform="translate(${x} ${y})"><ellipse cx="3" cy="4" rx="13" ry="9" fill="#2a1e14" fill-opacity=".22"/>${body}</g>`);
tegak(430, 548, `<rect x="-9" y="-9" width="18" height="18" fill="#f3efe4" stroke="${C.line}" stroke-width=".6"/><circle r="6.4" fill="url(#kubah)" stroke="${C.line}" stroke-width=".5"/><circle cy="-6.6" r=".9" fill="#d9b44a"/><rect x="10" y="-13" width="3.2" height="16" fill="#f3efe4" stroke="${C.line}" stroke-width=".5"/><circle cx="11.6" cy="-13.5" r="1.8" fill="url(#kubah)"/>`);
tegak(992, 404, `<path d="M-4 -12H4V-4H12V4H4V14H-4V4H-12V-4H-4Z" fill="#9aa0a8" stroke="${C.line}" stroke-width=".6"/><path d="M0 -12V14M-12 0H12" stroke="#ffffff" stroke-opacity=".35" stroke-width=".8"/><rect x="-2" y="-18" width="4" height="7" fill="#efe8da" stroke="${C.line}" stroke-width=".5"/>`);
tegak(1298, 300, `<rect x="-11" y="-8" width="22" height="16" fill="#e8d9b4" stroke="${C.line}" stroke-width=".6"/><path d="M-14 -5Q0 -12 14 -5L12 -1Q0 -6 -12 -1Z" fill="#c23b22" stroke="${C.line}" stroke-width=".5"/><path d="M-14 4Q0 -2 14 4L12 8Q0 3 -12 8Z" fill="#c23b22" stroke="${C.line}" stroke-width=".5"/><circle cx="-16" cy="2" r="1.6" fill="#f2c14e"/><circle cx="16" cy="2" r="1.6" fill="#f2c14e"/>`);
tegak(566, 588, `<rect x="-22" y="-5" width="44" height="10" fill="#b88a5a" stroke="${C.line}" stroke-width=".6"/><path d="M-22 0H22" stroke="#7a5a3a" stroke-width=".8"/><rect x="-26" y="7" width="52" height="3" fill="#d9d2c4" stroke="${C.line}" stroke-width=".4"/><rect x="-3" y="-9" width="6" height="5" fill="#efe8da" stroke="${C.line}" stroke-width=".4"/>`);
tegak(1182, 226, `<path d="M-18 -10H18V10H10V-2H-10V10H-18Z" fill="#c9a26a" stroke="${C.line}" stroke-width=".6"/><rect x="-10" y="12" width="20" height="10" fill="#b8d48a" stroke="#f3efe4" stroke-width=".8"/><circle cy="17" r="2" fill="none" stroke="#f3efe4" stroke-width=".5"/>`);
// Kilau matahari di laut.
const glint = mulberry(77);
for (let i = 0; i < 260; i++) {
  const x = 1100 + glint() * 900;
  const y = 600 + glint() * 520;
  if (inside([x, y], LAND) || inside([x, y], ISLAND)) continue;
  L.top.push(`<path d="M${f1(x)} ${f1(y)}h${f1(2 + glint() * 5)}" stroke="#ffffff" stroke-opacity="${f1(0.25 + glint() * 0.4)}" stroke-width=".7" stroke-linecap="round"/>`);
}

// Air: laut, kali, laguna.
const SEA = `<rect width="${W}" height="${H}" fill="url(#laut)"/>`;
const coastPath = pathD(COAST);
const riverPath = pathD(RIVER, true);
const lagoonPath = pathD(LAGOON, true);
const waves = [];
for (let i = 0; i < 900; i++) {
  const x = rr(0, W);
  const y = rr(400, H);
  if (inside([x, y], LAND) || inside([x, y], ISLAND)) continue;
  const s = rr(4, 9);
  waves.push(`M${f1(x)} ${f1(y)}q${f1(s / 2)} ${f1(-s / 3)} ${f1(s)} 0t${f1(s)} 0`);
}
// Jembatan tepat di titik potong jalan utama dengan garis tengah kali.
function cross(a, b, c, d) {
  const den = (b[0] - a[0]) * (d[1] - c[1]) - (b[1] - a[1]) * (d[0] - c[0]);
  if (!den) return null;
  const t = ((c[0] - a[0]) * (d[1] - c[1]) - (c[1] - a[1]) * (d[0] - c[0])) / den;
  const u = ((c[0] - a[0]) * (b[1] - a[1]) - (c[1] - a[1]) * (b[0] - a[0])) / den;
  return t >= 0 && t <= 1 && u >= 0 && u <= 1 ? { p: [a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])], u } : null;
}
const bridges = [];
for (const [k, line] of Object.entries(ROADS))
  for (let i = 1; i < line.length; i++)
    for (let j = 1; j < RIVER_C.length; j++) {
      const x = cross(line[i - 1], line[i], RIVER_C[j - 1], RIVER_C[j]);
      if (!x) continue;
      const t = (j - 1 + x.u) / (RIVER_C.length - 1);
      const span = 12 + t * t * 40 + 14;
      const ang = (Math.atan2(line[i][1] - line[i - 1][1], line[i][0] - line[i - 1][0]) * 180) / Math.PI;
      const w = ROAD_W[k] + 3;
      bridges.push(`<g transform="translate(${f1(x.p[0])} ${f1(x.p[1])}) rotate(${f1(ang)})"><rect x="${f1(-span / 2 + 1.5)}" y="${f1(-w / 2 + 1.5)}" width="${f1(span)}" height="${f1(w)}" fill="#1c3a4a" fill-opacity=".35"/><rect x="${f1(-span / 2)}" y="${f1(-w / 2)}" width="${f1(span)}" height="${f1(w)}" fill="${C.street}" stroke="${C.line}" stroke-width=".9"/><path d="M${f1(-span / 2)} ${f1(-w / 2 + 1)}H${f1(span / 2)}M${f1(-span / 2)} ${f1(w / 2 - 1)}H${f1(span / 2)}" stroke="${C.line}" stroke-width=".5"/></g>`);
    }
// Jembatan rel.
for (let i = 1; i < RAIL.length; i++)
  for (let j = 1; j < RIVER_C.length; j++) {
    const x = cross(RAIL[i - 1], RAIL[i], RIVER_C[j - 1], RIVER_C[j]);
    if (x) bridges.push(`<circle cx="${f1(x.p[0])}" cy="${f1(x.p[1])}" r="2" fill="#4a3f36"/>`);
  }

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W * 2}" height="${H * 2}">
<defs>
  <radialGradient id="laut" cx="62%" cy="95%" r="80%"><stop offset="0" stop-color="${C.sea2}"/><stop offset=".7" stop-color="${C.sea}"/><stop offset="1" stop-color="#3a8fae"/></radialGradient>
  <filter id="kertas" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="4"/><feColorMatrix values="0 0 0 0 .35  0 0 0 0 .28  0 0 0 0 .18  0 0 0 .09 0"/></filter>
  <filter id="cat" filterUnits="userSpaceOnUse" x="-50" y="-50" width="${W + 100}" height="${H + 100}"><feTurbulence type="fractalNoise" baseFrequency=".035" numOctaves="3" seed="7" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="5"/></filter>
  <pattern id="rumput" width="14" height="14" patternUnits="userSpaceOnUse"><circle cx="3" cy="4" r=".7" fill="#7e9d55" fill-opacity=".35"/><circle cx="10" cy="9" r=".6" fill="#e9f0c8" fill-opacity=".4"/><path d="M6 12l1 -2l1 2" stroke="#6f8f4a" stroke-opacity=".3" stroke-width=".4" fill="none"/></pattern>
  <clipPath id="sawahclip"><polygon points="${pts(REGIONS.find((r) => r.id === 'sawah').poly)}"/></clipPath>
  <clipPath id="darat"><path d="${pathD(LAND, true)}"/></clipPath>
</defs>
<style>
  .rg{stroke:#00000033;stroke-width:.5;fill:none}
  .ts{fill:#2d4a22;fill-opacity:.28}
  .th{fill:#ffffff;fill-opacity:.16}
  .r-in{fill:none;stroke:#b7a582;stroke-linecap:round;stroke-linejoin:round}
  .r-out{fill:none;stroke:${C.street};stroke-linecap:round;stroke-linejoin:round}
  #bayang rect{fill:#3a2a1a;fill-opacity:.22}
  #bangunan g rect{stroke:${C.line};stroke-width:.45}
  text{font-family:'Fraunces','Georgia',serif;font-style:italic;fill:#e7f3f6}
</style>
${SEA}
<path d="${waves.join('')}" fill="none" stroke="#bfe3ec" stroke-opacity=".35" stroke-width=".7"/>
<path d="${coastPath}" fill="none" stroke="#4f9fbb" stroke-width="150" stroke-opacity=".22" stroke-linecap="round" filter="url(#cat)"/>
<path d="${coastPath}" fill="none" stroke="#5fadc4" stroke-width="80" stroke-opacity=".25" stroke-linecap="round" filter="url(#cat)"/>
<path d="${coastPath}" fill="none" stroke="${C.shallow}" stroke-width="34" stroke-opacity=".55" stroke-linecap="round" filter="url(#cat)"/>
<path d="${coastPath}" fill="none" stroke="#a9dde3" stroke-width="12" stroke-opacity=".6" stroke-linecap="round"/>
<path d="${pathD(ISLAND, true)}" fill="none" stroke="#5fadc4" stroke-width="70" stroke-opacity=".25" filter="url(#cat)"/>
<path d="${pathD(ISLAND, true)}" fill="none" stroke="${C.shallow}" stroke-width="26" stroke-opacity=".55"/>
<g id="darat">
  <path d="${pathD(LAND, true)}" fill="${C.land}" stroke="${C.line}" stroke-width="1.4"/>
  <path d="${pathD(LAND, true)}" fill="url(#rumput)"/>
  <g clip-path="url(#darat)">${L.fields.join('')}${L.land.join('')}${L.terr.join('')}</g>
</g>
<g id="pulau">${L.island.join('')}</g>
<g id="air">
  <path d="${riverPath}" fill="${C.river}" stroke="${C.line}" stroke-width="1.2"/>
  <path d="${pathD(RIVER_C)}" fill="none" stroke="#bfe3ec" stroke-opacity=".45" stroke-width="1" stroke-dasharray="6 9"/>
  <path d="${lagoonPath}" fill="${C.shallow}" stroke="${C.line}" stroke-width="1"/>
  ${L.water.join('')}
</g>
<g id="jalan">${L.roads.join('')}</g>
<path d="${pathD(BREAKWATER)}" fill="none" stroke="#9a9488" stroke-width="7" stroke-linecap="round"/><path d="${pathD(BREAKWATER)}" fill="none" stroke="#c9c3b6" stroke-width="4" stroke-linecap="round" stroke-dasharray="2 1.5"/>
${bridges.join('')}
</svg>`;

const OUT = join(HERE, 'out');
mkdirSync(OUT, { recursive: true });
const top = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W * 2}" height="${H * 2}">
<defs>
  <radialGradient id="kubah" cx="35%" cy="30%" r="75%"><stop offset="0" stop-color="#e9f3e2"/><stop offset=".55" stop-color="#4f9a6a"/><stop offset="1" stop-color="#2c6a46"/></radialGradient>
  <filter id="kertas" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="4"/><feColorMatrix values="0 0 0 0 .35  0 0 0 0 .28  0 0 0 0 .18  0 0 0 .08 0"/></filter>
  <filter id="lembut" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="6"/></filter>
  <radialGradient id="sudut" cx="50%" cy="50%" r="75%"><stop offset=".62" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#1a1408" stop-opacity=".28"/></radialGradient>
</defs>
<style>text{font-family:'Fraunces','Georgia',serif;font-style:italic;fill:#e7f3f6}</style>
<g id="atas">${L.top.join('')}</g>
<text x="1420" y="1000" font-size="26" letter-spacing="6">Teluk Kelambu</text>
<text x="1640" y="900" font-size="12" letter-spacing="3">Selat Pelita</text>
<text x="520" y="248" font-size="10" letter-spacing="2" style="fill:#1f4e6a" transform="rotate(42 520 248)">Kali Sirah</text>
<rect width="${W}" height="${H}" filter="url(#kertas)"/>
<rect width="${W}" height="${H}" fill="url(#sudut)"/>
</svg>`;
writeFileSync(join(OUT, 'tanah.svg'), svg);
writeFileSync(join(OUT, 'atas.svg'), top);
writeFileSync(join(OUT, 'fitur.json'), JSON.stringify({ ...FEAT, land: pathD(LAND, true), island: `${pathD(ISLAND, true)} ${pathD(ISLET, true)}` }));

// ── Persil: rumah di wilayah yang dibuka, dengan alamat per blok ─────────────
function roman(n) {
  const t = [[10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']];
  let s = '';
  for (const [v, r] of t) while (n >= v) (s += r), (n -= v);
  return s;
}
const data = [];
for (const R of REGIONS.filter((r) => r.musim)) {
  const mine = plots.filter((p) => p.region === R.id);
  const blocksSeen = [...new Set(mine.map((p) => p.block))];
  let n = 0;
  for (const b of blocksSeen) {
    const street = R.streets[blocksSeen.indexOf(b) % R.streets.length];
    const gang = roman(Math.floor(blocksSeen.indexOf(b) / R.streets.length) + 1);
    let no = 0;
    for (const p of mine.filter((x) => x.block === b)) data.push([`${R.id}.${++n}`, R.id, p.x, p.y, `${street} ${gang} No. ${++no}`]);
  }
}
const regionsTs = REGIONS.map((r) => ({ id: r.id, name: r.name, watak: r.watak, since: r.since, musim: r.musim, poly: r.poly.map(([x, y]) => [Math.round(x), Math.round(y)]), label: r.label }));
const ts = `/* Dihasilkan oleh scripts/peta/sangkala.mjs. Jangan diubah dengan tangan. */
import type { KotaPoint } from './kota';

export interface KotaRegionData {
  id: string;
  name: string;
  watak: string;
  since: number;
  musim: number | null;
  poly: KotaPoint[];
  label: KotaPoint;
}

export const SANGKALA_WILAYAH: KotaRegionData[] = ${JSON.stringify(regionsTs)};

/** [id, wilayah, x, y, alamat] — setiap persil adalah rumah yang tergambar di peta. */
export const SANGKALA_PERSIL: [string, string, number, number, string][] = ${JSON.stringify(data)};
`;
writeFileSync(join(HERE, '../../packages/core/src/kotaData.ts'), ts);
const per = Object.fromEntries(REGIONS.filter((r) => r.musim).map((r) => [r.id, data.filter((d) => d[1] === r.id).length]));
console.log('rumah digambar:', FEAT.houses.length, 'pohon:', FEAT.trees.length, 'persil:', data.length, per, 'svg', Math.round(svg.length / 1024), 'KB');
