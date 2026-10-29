/**
 * ULAR TANGGA: papan 100 kotak untuk 2–6 orang. Mode Klasik (satu dadu,
 * papan klasik) dan mode Jenius: dua dadu (satu untuk jalan, satu untuk
 * mendorong lawan), kartu aksi, musim yang memunculkan ular/tangga baru,
 * dan harus pas di 100 (lebih = memantul).
 *
 * Murni (tanpa I/O): server, tes, dan bot memakai aturan yang persis sama.
 */

// ── Papan ───────────────────────────────────────────────────────────────────

export interface Papan {
  /** [kepala, ekor] */
  ular: [number, number][];
  /** [kaki, puncak] */
  tangga: [number, number][];
  /** Kotak yang memberi kartu aksi. */
  kotakKartu: number[];
  /** Kepala ular yang sudah dipotong gergaji. */
  putus: number[];
}

/** Papan klasik (tata letak ular tangga lama yang terkenal). */
export const KLASIK: Papan = {
  tangga: [[1, 38], [4, 14], [9, 31], [21, 42], [28, 84], [36, 44], [51, 67], [71, 91], [80, 100]],
  ular: [[16, 6], [47, 26], [49, 11], [56, 53], [62, 19], [64, 60], [87, 24], [93, 73], [95, 75], [98, 78]],
  kotakKartu: [],
  putus: [],
};

/** Semua ujung (kepala, ekor, kaki, puncak) & kotak kartu: tidak boleh ditumpuk. */
export function terpakai(p: Papan): Set<number> {
  const s = new Set<number>([100]);
  for (const [a, b] of [...p.ular, ...p.tangga]) (s.add(a), s.add(b));
  for (const k of p.kotakKartu) s.add(k);
  return s;
}

// ── Kartu ───────────────────────────────────────────────────────────────────

export type KartuId = 'penawar' | 'emas' | 'ketiga' | 'tukar' | 'gergaji' | 'ular' | 'angin' | 'lompat' | 'perisai';
export interface KartuInfo {
  id: KartuId;
  nama: string;
  doodle: string;
  jumlah: number;
  efek: string;
  /** Apa yang perlu dipilih saat memainkan. */
  pilih: 'lawan' | 'nilai' | 'ular' | 'kotak' | null;
}
export const KARTU: Record<KartuId, KartuInfo> = {
  penawar: { id: 'penawar', nama: 'Penawar', doodle: 'cangkir', jumlah: 4, pilih: null, efek: 'Otomatis: gigitan ular berikutnya tidak berlaku. Kartu ini habis setelah menyelamatkanmu.' },
  emas: { id: 'emas', nama: 'Dadu Emas', doodle: 'bintang', jumlah: 3, pilih: 'nilai', efek: 'Sebelum melempar: tentukan sendiri angka salah satu dadumu.' },
  ketiga: { id: 'ketiga', nama: 'Dadu Ketiga', doodle: 'dadu', jumlah: 3, pilih: null, efek: 'Lempar tiga dadu: satu untuk jalan, satu untuk mendorong, satu dibuang.' },
  tukar: { id: 'tukar', nama: 'Tukar Tempat', doodle: 'panah-lengkung', jumlah: 2, pilih: 'lawan', efek: 'Bertukar posisi dengan lawan yang berjarak paling jauh 15 kotak.' },
  gergaji: { id: 'gergaji', nama: 'Gergaji', doodle: 'silang', jumlah: 3, pilih: 'ular', efek: 'Potong satu ular. Ular itu mati sampai permainan selesai.' },
  ular: { id: 'ular', nama: 'Ular Peliharaan', doodle: 'gelombang', jumlah: 3, pilih: 'kotak', efek: 'Pasang ular baru (turun 10 kotak) di kotak kosong mana pun antara 11 dan 99.' },
  angin: { id: 'angin', nama: 'Angin Balik', doodle: 'angin', jumlah: 3, pilih: 'lawan', efek: 'Tiup satu lawan mundur 4 kotak. Kalau mendarat di ular atau tangga, berlaku.' },
  lompat: { id: 'lompat', nama: 'Lompat', doodle: 'sepeda', jumlah: 3, pilih: null, efek: 'Maju 4 kotak sekarang, lalu tetap melempar dadu.' },
  perisai: { id: 'perisai', nama: 'Perisai', doodle: 'payung-terbuka', jumlah: 3, pilih: null, efek: 'Sampai giliranmu berikutnya, kamu tidak bisa didorong, ditiup, atau ditukar.' },
};
export const MAX_KARTU = 3;
/** Dorong hanya ke lawan yang dekat dari kotakmu yang baru. */
export const JARAK_DORONG = 10;
export const JARAK_TUKAR = 15;

// ── Aturan ──────────────────────────────────────────────────────────────────

export interface Opts {
  /** Dua dadu: satu untuk jalan, satu untuk mendorong lawan. Mati = satu dadu (klasik). */
  dorong: boolean;
  kartu: boolean;
  /** Tiap 3 ronde muncul ular atau tangga baru (diumumkan satu ronde sebelumnya). */
  musim: boolean;
  /** Melewati 100: pantul (mundur sisa langkah) · pas (tidak bergerak) · bebas (langsung menang). */
  akhir: 'pantul' | 'pas' | 'bebas';
  papan: 'acak' | 'klasik';
  waktu: number;
}
export const KLASIK_OPTS: Omit<Opts, 'waktu'> = { dorong: false, kartu: false, musim: false, akhir: 'pantul', papan: 'klasik' };
export const JENIUS_OPTS: Omit<Opts, 'waktu'> = { dorong: true, kartu: true, musim: true, akhir: 'pantul', papan: 'acak' };
export const presetOf = (o: Opts): 'klasik' | 'jenius' | 'racikan' => {
  const same = (p: Omit<Opts, 'waktu'>) => (Object.keys(p) as (keyof typeof p)[]).every((k) => p[k] === o[k]);
  return same(KLASIK_OPTS) ? 'klasik' : same(JENIUS_OPTS) ? 'jenius' : 'racikan';
};
export const MAX_PLAYERS = 6;
export const SIKLUS_MUSIM = 3;

// ── Tipe ────────────────────────────────────────────────────────────────────

export interface Player {
  id: string;
  name: string;
  avatar: string;
  guest: boolean;
  bot: boolean;
  pos: number;
  kartu: KartuId[];
  perisai: boolean;
  /** Sudah didorong sejak giliran terakhirnya: tidak bisa didorong lagi. */
  didorong: boolean;
}

export type Phase = 'lobby' | 'main' | 'akhir';
export type Fase = 'lempar' | 'pilih';

export interface Ev {
  n: number;
  r: number;
  t: 'mulai' | 'lempar' | 'gerak' | 'kartu' | 'dapat' | 'penawar' | 'musim' | 'menang' | 'ganda';
  by?: string;
  target?: string;
  dadu?: number[];
  dari?: number;
  ke?: number;
  /** Kotak yang dilewati, untuk animasi (termasuk pantulan & luncuran). */
  jalur?: number[];
  lewat?: 'ular' | 'tangga' | null;
  sebab?: 'dadu' | 'dorong' | 'kartu';
  kartu?: KartuId;
  kotak?: number;
  nilai?: number;
}

export interface Musim {
  ronde: number;
  jenis: 'ular' | 'tangga';
  a: number;
  b: number;
}

export interface Game {
  code: string;
  host: string;
  rev: number;
  deadline: number | null;
  phase: Phase;
  opts: Opts;
  rng: number;
  players: Player[];
  papan: Papan;
  dek: KartuId[];
  giliran: number;
  fase: Fase;
  dadu: number[] | null;
  /** Nilai dari Dadu Emas untuk lemparan berikutnya. */
  emas: number | null;
  ketiga: boolean;
  kartuDipakai: boolean;
  ganda: number;
  ronde: number;
  musim: Musim | null;
  log: Ev[];
  n: number;
  pemenang: string | null;
  botAt: number | null;
}

export type Action =
  | { t: 'mulai' }
  | { t: 'bot'; tambah: boolean }
  | { t: 'opsi'; opts: Partial<Opts> }
  | { t: 'preset'; nama: 'klasik' | 'jenius' }
  | { t: 'kartu'; kartu: KartuId; target?: string; nilai?: number; kotak?: number }
  | { t: 'lempar' }
  | { t: 'jalan'; pakai: number; dorong?: number; target?: string }
  | { t: 'lagi' };

export class GameError extends Error {}
const fail = (m: string): never => {
  throw new GameError(m);
};

// ── Acak ────────────────────────────────────────────────────────────────────

function rand(g: Pick<Game, 'rng'>): number {
  let t = (g.rng = (g.rng + 0x6d2b79f5) >>> 0);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const ri = (g: Pick<Game, 'rng'>, a: number, b: number) => a + Math.floor(rand(g) * (b - a + 1));
function shuffle<T>(g: Pick<Game, 'rng'>, xs: T[]): T[] {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand(g) * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

/** Papan acak yang adil: 9 ular, 8 tangga, ujung tidak bertumpuk, total naik ≈ total turun. */
export function papanAcak(g: Pick<Game, 'rng'>, kartu: boolean): Papan {
  for (let coba = 0; coba < 400; coba++) {
    const p: Papan = { ular: [], tangga: [], kotakKartu: [], putus: [] };
    const pakai = new Set<number>([1, 100]);
    const baris = (x: number) => Math.floor((x - 1) / 10);
    // Ujung harus beda baris: tidak ada tangga atau ular yang mendatar.
    const ambil = (a: number, b: number) => !pakai.has(a) && !pakai.has(b) && baris(a) !== baris(b) && (pakai.add(a), pakai.add(b), true);
    let gagal = 0;
    // Ular jahat di ujung atas supaya akhir tetap menegangkan.
    for (const [lo, hi, dmin, dmax] of [[90, 99, 15, 40], [80, 97, 10, 35], [62, 88, 12, 40], [62, 88, 10, 30], [40, 70, 10, 30], [40, 70, 8, 25], [24, 55, 8, 20], [16, 45, 6, 15], [18, 60, 15, 30]] as const) {
      let ok = false;
      for (let i = 0; i < 40 && !ok; i++) {
        const h = ri(g, lo, hi);
        const t = h - ri(g, dmin, dmax);
        if (t >= 2) ok = ambil(h, t) && !!p.ular.push([h, t]);
      }
      if (!ok) gagal++;
    }
    for (const [lo, hi, dmin, dmax] of [[2, 12, 10, 30], [8, 25, 10, 25], [15, 35, 15, 40], [28, 50, 10, 25], [35, 60, 15, 35], [50, 70, 10, 20], [60, 80, 8, 15], [70, 85, 5, 12]] as const) {
      let ok = false;
      for (let i = 0; i < 40 && !ok; i++) {
        const b = ri(g, lo, hi);
        const t = b + ri(g, dmin, dmax);
        if (t <= 96) ok = ambil(b, t) && !!p.tangga.push([b, t]);
      }
      if (!ok) gagal++;
    }
    if (gagal) continue;
    const naik = p.tangga.reduce((a, [b, t]) => a + t - b, 0);
    const turun = p.ular.reduce((a, [h, t]) => a + h - t, 0);
    if (Math.abs(naik - turun) > 40) continue;
    if (kartu) {
      const bebas = shuffle(g, Array.from({ length: 96 }, (_, i) => i + 3).filter((x) => !pakai.has(x)));
      // Satu kotak kartu di tiap sepuluhan 10–89.
      for (let d = 1; d <= 8; d++) {
        const k = bebas.find((x) => x >= d * 10 && x < d * 10 + 10);
        if (k) (p.kotakKartu.push(k), pakai.add(k));
      }
    }
    return p;
  }
  return { ...KLASIK, kotakKartu: [], putus: [] };
}

// ── Gerak (murni, juga dipakai untuk pratinjau di klien) ────────────────────

export interface Hasil {
  ke: number;
  jalur: number[];
  lewat: 'ular' | 'tangga' | null;
  penawar: boolean;
}

/** Hasil bergerak `n` langkah (negatif = mundur) dari `pos`, termasuk pantul, ular, tangga. */
export function hitung(papan: Papan, akhir: Opts['akhir'], pos: number, n: number, penawar: boolean): Hasil {
  const jalur: number[] = [];
  let x = pos;
  let arah = Math.sign(n);
  let sisa = Math.abs(n);
  if (n > 0 && akhir === 'pas' && pos + n > 100) return { ke: pos, jalur: [], lewat: null, penawar: false };
  while (sisa-- > 0) {
    if (arah > 0 && x === 100) arah = akhir === 'bebas' ? 0 : -1;
    if (arah === 0) break;
    x += arah;
    if (x < 1) x = 1;
    jalur.push(x);
  }
  let lewat: Hasil['lewat'] = null;
  let dipakai = false;
  const ular = papan.ular.find(([h]) => h === x && !papan.putus.includes(h));
  const tangga = papan.tangga.find(([b]) => b === x);
  if (ular) {
    if (penawar) dipakai = true;
    else ((lewat = 'ular'), (x = ular[1]), jalur.push(x));
  } else if (tangga) ((lewat = 'tangga'), (x = tangga[1]), jalur.push(x));
  return { ke: x, jalur, lewat, penawar: dipakai };
}

// ── Ruang ───────────────────────────────────────────────────────────────────

type NewPlayer = { id: string; name: string; avatar: string; guest: boolean };
const fresh = (p: NewPlayer, bot = false): Player => ({ ...p, bot, pos: 0, kartu: [], perisai: false, didorong: false });

export function newGame(code: string, host: NewPlayer, _now: number, seed: number): Game {
  return {
    code,
    host: host.id,
    rev: 1,
    deadline: null,
    phase: 'lobby',
    opts: { ...JENIUS_OPTS, waktu: 0 },
    rng: seed >>> 0,
    players: [fresh(host)],
    papan: { ...KLASIK, kotakKartu: [], putus: [] },
    dek: [],
    giliran: 0,
    fase: 'lempar',
    dadu: null,
    emas: null,
    ketiga: false,
    kartuDipakai: false,
    ganda: 0,
    ronde: 1,
    musim: null,
    log: [],
    n: 0,
    pemenang: null,
    botAt: null,
  };
}

export const BOTS: [string, string][] = [
  ['Pak Lurah', 'burung'],
  ['Bu Kantin', 'kucing'],
  ['Mas Satpam', 'landak'],
  ['Mbak Kasir', 'kelinci'],
  ['Om Tukang', 'katak'],
];

export function join(g: Game, p: NewPlayer) {
  const me = g.players.find((x) => x.id === p.id);
  if (me) {
    me.name = p.name;
    me.avatar = p.avatar;
    me.bot = false;
  } else {
    if (g.phase !== 'lobby') fail('Permainan sudah berjalan. Tonton lewat mode TV, atau tunggu permainan berikutnya.');
    if (g.players.length >= MAX_PLAYERS) fail('Papan penuh (6 orang).');
    g.players.push(fresh(p));
  }
  g.rev++;
}

export function leave(g: Game, pid: string) {
  const p = g.players.find((x) => x.id === pid);
  if (!p) return;
  if (g.phase === 'lobby') g.players = g.players.filter((x) => x.id !== pid);
  else p.bot = true;
  const human = g.players.find((x) => !x.bot);
  if (g.host === pid && human) g.host = human.id;
  g.rev++;
}

// ── Jalannya permainan ──────────────────────────────────────────────────────

const byId = (g: Game, id: string | undefined) => g.players.find((p) => p.id === id);
const cur = (g: Game) => g.players[g.giliran]!;
const push = (g: Game, e: Omit<Ev, 'n' | 'r'>) => g.log.push({ n: ++g.n, r: g.ronde, ...e });

function mulaiGiliran(g: Game, now: number) {
  const p = cur(g);
  p.perisai = false;
  p.didorong = false;
  g.fase = 'lempar';
  g.dadu = null;
  g.emas = null;
  g.ketiga = false;
  g.kartuDipakai = false;
  g.deadline = !p.bot && g.opts.waktu ? now + g.opts.waktu * 1000 : null;
  g.botAt = p.bot ? now + 1200 + Math.floor(rand(g) * 800) : null;
}

/** Gerakkan pemain dan catat; mengembalikan true bila dia menang. */
function gerak(g: Game, p: Player, n: number, sebab: Ev['sebab'], by: string): boolean {
  if (!n) return false;
  const h = hitung(g.papan, g.opts.akhir, p.pos, n, p.kartu.includes('penawar'));
  const dari = p.pos;
  p.pos = h.ke;
  push(g, { t: 'gerak', by: p.id, target: by !== p.id ? by : undefined, dari, ke: h.ke, jalur: h.jalur, lewat: h.lewat, sebab });
  if (h.penawar) {
    p.kartu.splice(p.kartu.indexOf('penawar'), 1);
    push(g, { t: 'penawar', by: p.id, kotak: h.ke });
  }
  if (p.pos === 100) return true;
  if (g.opts.kartu && g.papan.kotakKartu.includes(p.pos) && p.kartu.length < MAX_KARTU) {
    if (!g.dek.length) g.dek = buatDek(g);
    const k = g.dek.pop()!;
    p.kartu.push(k);
    push(g, { t: 'dapat', by: p.id, kartu: k, kotak: p.pos });
  }
  return false;
}

function buatDek(g: Game): KartuId[] {
  const d: KartuId[] = [];
  for (const k of Object.values(KARTU)) for (let i = 0; i < k.jumlah; i++) d.push(k.id);
  // Kartu yang sedang dipegang tidak ada di dek.
  for (const p of g.players) for (const k of p.kartu) d.splice(d.indexOf(k), 1);
  return shuffle(g, d);
}

function menang(g: Game, p: Player) {
  g.pemenang = p.id;
  g.phase = 'akhir';
  g.deadline = null;
  g.botAt = null;
  push(g, { t: 'menang', by: p.id });
}

function selesaiGiliran(g: Game, now: number, ganda: boolean) {
  if (ganda && g.ganda < 2) {
    g.ganda++;
    push(g, { t: 'ganda', by: cur(g).id });
    return mulaiGiliran(g, now);
  }
  g.ganda = 0;
  g.giliran = (g.giliran + 1) % g.players.length;
  if (g.giliran === 0) {
    g.ronde++;
    terapkanMusim(g);
  }
  mulaiGiliran(g, now);
}

/** Musim: setiap SIKLUS_MUSIM ronde muncul ular atau tangga baru, diumumkan lebih dulu. */
function terapkanMusim(g: Game) {
  if (!g.opts.musim) return;
  if (g.musim && g.ronde >= g.musim.ronde) {
    const m = g.musim;
    if (!terpakai(g.papan).has(m.a) && !terpakai(g.papan).has(m.b)) (m.jenis === 'ular' ? g.papan.ular : g.papan.tangga).push([m.a, m.b]);
    push(g, { t: 'musim', kotak: m.a, nilai: m.b, lewat: m.jenis });
    g.musim = null;
  }
  if (!g.musim) g.musim = rencanaMusim(g, g.ronde + SIKLUS_MUSIM);
}

function rencanaMusim(g: Game, ronde: number): Musim | null {
  const n = g.log.filter((e) => e.t === 'musim').length;
  const jenis = n % 2 ? 'tangga' : 'ular';
  const pakai = terpakai(g.papan);
  const posisi = new Set(g.players.map((p) => p.pos));
  for (let i = 0; i < 60; i++) {
    const [a, b] = jenis === 'ular' ? ((h) => [h, h - ri(g, 8, 25)])(ri(g, 45, 97)) : ((k) => [k, k + ri(g, 8, 22)])(ri(g, 5, 70));
    if (b < 2 || b > 96 || pakai.has(a) || pakai.has(b) || posisi.has(a) || Math.floor((a - 1) / 10) === Math.floor((b - 1) / 10)) continue;
    return { ronde, jenis, a, b };
  }
  return null;
}

function mulai(g: Game, now: number) {
  g.players = shuffle(g, g.players);
  for (const p of g.players) Object.assign(p, { pos: 0, kartu: [], perisai: false, didorong: false });
  g.papan = g.opts.papan === 'klasik' ? { ...KLASIK, ular: [...KLASIK.ular], tangga: [...KLASIK.tangga], kotakKartu: [], putus: [] } : papanAcak(g, g.opts.kartu);
  if (g.opts.kartu && g.opts.papan === 'klasik') {
    const bebas = shuffle(g, Array.from({ length: 86 }, (_, i) => i + 10).filter((x) => !terpakai(g.papan).has(x)));
    g.papan.kotakKartu = bebas.slice(0, 8).sort((a, b) => a - b);
  }
  g.dek = g.opts.kartu ? buatDek(g) : [];
  g.ronde = 1;
  g.ganda = 0;
  g.giliran = 0;
  g.log = [];
  g.n = 0;
  g.pemenang = null;
  g.phase = 'main';
  g.musim = g.opts.musim ? rencanaMusim(g, 1 + SIKLUS_MUSIM) : null;
  push(g, { t: 'mulai', by: cur(g).id });
  mulaiGiliran(g, now);
}

// ── Kartu ───────────────────────────────────────────────────────────────────

function mainKartu(g: Game, p: Player, a: Extract<Action, { t: 'kartu' }>, now: number): boolean {
  if (!g.opts.kartu) fail('Kartu aksi tidak aktif.');
  if (g.fase !== 'lempar') fail('Kartu dimainkan sebelum melempar dadu.');
  if (g.kartuDipakai) fail('Satu kartu per giliran.');
  if (!p.kartu.includes(a.kartu)) fail('Kartu itu tidak ada di tanganmu.');
  const t = byId(g, a.target);
  const lawanSah = (x: Player | undefined): x is Player => !!x && x !== p && !x.perisai && x.pos > 0 && x.pos < 100;
  switch (a.kartu) {
    case 'penawar':
      fail('Penawar bekerja otomatis saat kamu tergigit.');
      break;
    case 'emas':
      if (!Number.isInteger(a.nilai) || a.nilai! < 1 || a.nilai! > 6) fail('Pilih angka 1 sampai 6.');
      g.emas = a.nilai!;
      break;
    case 'ketiga':
      if (!g.opts.dorong) fail('Dadu Ketiga butuh aturan dua dadu.');
      g.ketiga = true;
      break;
    case 'tukar':
      if (!lawanSah(t)) throw new GameError('Pilih lawan yang tidak berperisai dan masih di papan.');
      if (Math.abs(t.pos - p.pos) > JARAK_TUKAR) fail(`Tukar hanya dengan lawan dalam ${JARAK_TUKAR} kotak.`);
      [p.pos, t.pos] = [t.pos, p.pos];
      break;
    case 'gergaji': {
      const u = g.papan.ular.find(([h]) => h === a.kotak && !g.papan.putus.includes(h)) ?? fail('Pilih kepala ular yang masih hidup.');
      g.papan.putus.push(u[0]);
      break;
    }
    case 'ular': {
      const k = a.kotak ?? -1;
      const pakai = terpakai(g.papan);
      if (!Number.isInteger(k) || k < 11 || k > 99 || pakai.has(k) || g.players.some((x) => x.pos === k)) fail('Pilih kotak kosong antara 11 dan 99.');
      const ekor = [10, 9, 11, 8, 12].map((d) => k - d).find((e) => e >= 1 && !pakai.has(e)) ?? fail('Tidak ada tempat untuk ekornya.');
      g.papan.ular.push([k, ekor]);
      break;
    }
    case 'angin':
      if (!lawanSah(t)) fail('Pilih lawan yang tidak berperisai dan masih di papan.');
      break;
    case 'lompat':
      break;
    case 'perisai':
      p.perisai = true;
      break;
  }
  p.kartu.splice(p.kartu.indexOf(a.kartu), 1);
  g.kartuDipakai = true;
  push(g, { t: 'kartu', by: p.id, kartu: a.kartu, target: t?.id, kotak: a.kotak, nilai: a.nilai });
  if (a.kartu === 'angin') gerak(g, t!, -4, 'kartu', p.id);
  if (a.kartu === 'lompat' && gerak(g, p, 4, 'kartu', p.id)) return (menang(g, p), true);
  return false;
}

// ── Aksi ────────────────────────────────────────────────────────────────────

export function act(g: Game, pid: string, a: Action, now: number) {
  const p = byId(g, pid) ?? fail('Kamu belum duduk di papan ini.');
  const host = pid === g.host;
  const lobby = () => (!host || g.phase !== 'lobby') && fail('Hanya tuan rumah, sebelum mulai.');
  switch (a.t) {
    case 'bot': {
      lobby();
      if (a.tambah) {
        if (g.players.length >= MAX_PLAYERS) fail('Papan penuh.');
        const used = new Set(g.players.map((x) => x.name));
        const [name, avatar] = BOTS.find(([nm]) => !used.has(nm)) ?? fail('Bot habis.');
        g.players.push(fresh({ id: `bot:${name}`, name, avatar, guest: true }, true));
      } else {
        const last = [...g.players].reverse().find((x) => x.bot);
        if (last) g.players = g.players.filter((x) => x !== last);
      }
      break;
    }
    case 'preset':
      lobby();
      g.opts = { ...(a.nama === 'klasik' ? KLASIK_OPTS : JENIUS_OPTS), waktu: g.opts.waktu };
      break;
    case 'opsi': {
      lobby();
      const o = a.opts ?? {};
      for (const k of ['dorong', 'kartu', 'musim'] as const) if (typeof o[k] === 'boolean') g.opts[k] = o[k]!;
      if (o.akhir && ['pantul', 'pas', 'bebas'].includes(o.akhir)) g.opts.akhir = o.akhir;
      if (o.papan && ['acak', 'klasik'].includes(o.papan)) g.opts.papan = o.papan;
      if (typeof o.waktu === 'number' && [0, 20, 40, 60].includes(o.waktu)) g.opts.waktu = o.waktu;
      break;
    }
    case 'mulai':
      if (!host || g.phase !== 'lobby') fail('Hanya tuan rumah yang bisa memulai.');
      if (g.players.length < 2) fail('Butuh minimal 2 pemain. Tambahkan bot kalau sedang sendiri.');
      mulai(g, now);
      break;
    case 'kartu':
      if (g.phase !== 'main' || cur(g) !== p) fail('Belum giliranmu.');
      mainKartu(g, p, a, now);
      break;
    case 'lempar': {
      if (g.phase !== 'main' || cur(g) !== p || g.fase !== 'lempar') fail('Belum giliranmu.');
      const n = !g.opts.dorong ? 1 : g.ketiga ? 3 : 2;
      g.dadu = Array.from({ length: n }, () => ri(g, 1, 6));
      if (g.emas) g.dadu[0] = g.emas;
      g.fase = 'pilih';
      push(g, { t: 'lempar', by: p.id, dadu: [...g.dadu] });
      break;
    }
    case 'jalan':
      if (g.phase !== 'main' || cur(g) !== p || g.fase !== 'pilih') fail('Lempar dadu dulu.');
      jalan(g, p, a.pakai, a.dorong, a.target, now);
      break;
    case 'lagi':
      if (!host || g.phase !== 'akhir') fail('Hanya tuan rumah.');
      g.phase = 'lobby';
      g.pemenang = null;
      g.log = [];
      g.deadline = null;
      for (const x of g.players) Object.assign(x, { pos: 0, kartu: [], perisai: false, didorong: false });
      break;
    default:
      fail('Aksi tidak dikenal.');
  }
  g.rev++;
}

/** Bisakah `t` ditiup/ditukar oleh pemain lain sekarang. */
export const bisaDidorong = (t: Pick<Player, 'perisai' | 'pos'>) => !t.perisai && t.pos > 0 && t.pos < 100;
/** Bisakah `t` didorong dari kotak `dari`: dekat, belum didorong ronde ini, tanpa perisai. */
export const bisaDorong = (t: Pick<Player, 'perisai' | 'pos' | 'didorong'>, dari: number) => bisaDidorong(t) && !t.didorong && Math.abs(t.pos - dari) <= JARAK_DORONG;

function jalan(g: Game, p: Player, pakai: number, dorong: number | undefined, target: string | undefined, now: number) {
  const d = g.dadu!;
  if (!Number.isInteger(pakai) || pakai < 0 || pakai >= d.length) fail('Pilih dadu untuk jalan.');
  let t: Player | undefined;
  if (target !== undefined && g.opts.dorong) {
    t = byId(g, target);
    const tujuan = hitung(g.papan, g.opts.akhir, p.pos, d[pakai]!, p.kartu.includes('penawar')).ke;
    if (!t || t === p || !bisaDorong(t, tujuan)) fail(`Lawan itu tidak bisa didorong (harus dalam ${JARAK_DORONG} kotak dari tempatmu mendarat, sekali per ronde).`);
    if (dorong === undefined || dorong === pakai || dorong < 0 || dorong >= d.length) fail('Pilih dadu lain untuk mendorong.');
  }
  const ganda = d.length === 2 ? d[0] === d[1] : d.length === 1 && d[0] === 6;
  if (gerak(g, p, d[pakai]!, 'dadu', p.id)) return menang(g, p);
  if (t && dorong !== undefined) {
    t.didorong = true;
    if (gerak(g, t, d[dorong]!, 'dorong', p.id)) return menang(g, t);
  }
  selesaiGiliran(g, now, ganda);
}

// ── Waktu & bot ─────────────────────────────────────────────────────────────

export function tick(g: Game, now: number): boolean {
  if (g.phase !== 'main') return false;
  const p = cur(g);
  if (p.bot && g.botAt === null) {
    g.botAt = now + 1000;
    return false;
  }
  const botDue = p.bot && g.botAt !== null && now >= g.botAt;
  const late = !p.bot && g.deadline !== null && now >= g.deadline;
  if (!botDue && !late) return false;
  if (g.fase === 'lempar') {
    if (p.bot && !g.kartuDipakai) botKartu(g, p, now);
    if (g.phase !== 'main') return (g.rev++, true);
    act(g, p.id, { t: 'lempar' }, now);
    // Bot "berpikir" sebentar setelah melihat dadu, supaya terasa hidup.
    if (p.bot) {
      g.botAt = now + 1300;
      return true;
    }
  }
  const m = pilihTerbaik(g, p);
  act(g, p.id, { t: 'jalan', ...m }, now);
  return true;
}

/** Nilai satu kemungkinan langkah: majunya aku dikurangi majunya lawan yang didorong. */
export function pilihTerbaik(g: Game, p: Player): { pakai: number; dorong?: number; target?: string } {
  const d = g.dadu!;
  let best = { s: -Infinity, m: { pakai: 0 } as { pakai: number; dorong?: number; target?: string } };
  for (let i = 0; i < d.length; i++) {
    const aku = hitung(g.papan, g.opts.akhir, p.pos, d[i]!, p.kartu.includes('penawar'));
    const base = aku.ke === 100 ? 1000 : aku.ke - p.pos + (aku.lewat === 'ular' ? -3 : 0) + (g.papan.kotakKartu.includes(aku.ke) ? 2 : 0);
    const cand: { s: number; m: { pakai: number; dorong?: number; target?: string } }[] = [{ s: base, m: { pakai: i } }];
    if (g.opts.dorong && aku.ke !== 100)
      for (let j = 0; j < d.length; j++) {
        if (j === i) continue;
        for (const x of g.players.filter((y) => y !== p && bisaDorong(y, aku.ke))) {
          const h = hitung(g.papan, g.opts.akhir, x.pos, d[j]!, x.kartu.includes('penawar'));
          if (h.ke === 100) continue;
          const w = x.pos >= aku.ke ? 1.3 : 0.7;
          cand.push({ s: base - (h.ke - x.pos) * w, m: { pakai: i, dorong: j, target: x.id } });
        }
      }
    for (const c of cand) {
      const s = c.s + rand(g) * 0.2;
      if (s > best.s) best = { s, m: c.m };
    }
  }
  return best.m;
}

function botKartu(g: Game, p: Player, now: number) {
  if (!g.opts.kartu || !p.kartu.length) return;
  const lawan = g.players.filter((x) => x !== p && bisaDidorong(x));
  const pemimpin = [...lawan].sort((a, b) => b.pos - a.pos)[0];
  const akhir = g.opts.akhir;
  const coba = (a: Extract<Action, { t: 'kartu' }>) => {
    try {
      act(g, p.id, a, now);
      g.rev--;
      return true;
    } catch {
      return false;
    }
  };
  for (const k of p.kartu) {
    if (k === 'gergaji') {
      const u = g.papan.ular.filter(([h]) => !g.papan.putus.includes(h) && h > p.pos && h <= p.pos + 12).sort((a, b) => b[0] - b[1] - (a[0] - a[1]))[0];
      if (u && coba({ t: 'kartu', kartu: k, kotak: u[0] })) return;
    }
    if (k === 'tukar') {
      const t = lawan.filter((x) => x.pos - p.pos >= 6 && x.pos - p.pos <= JARAK_TUKAR).sort((a, b) => b.pos - a.pos)[0];
      if (t && coba({ t: 'kartu', kartu: k, target: t.id })) return;
    }
    if (k === 'angin' && pemimpin && pemimpin.pos > p.pos && coba({ t: 'kartu', kartu: k, target: pemimpin.id })) return;
    if (k === 'ular' && pemimpin && pemimpin.pos > p.pos) {
      const pakai = terpakai(g.papan);
      const kotak = [3, 4, 5, 2, 6, 1].map((d) => pemimpin.pos + d).find((x) => x >= 11 && x <= 99 && !pakai.has(x) && !g.players.some((y) => y.pos === x));
      if (kotak && coba({ t: 'kartu', kartu: k, kotak })) return;
    }
    if (k === 'emas') {
      const best = [1, 2, 3, 4, 5, 6].map((v) => ({ v, h: hitung(g.papan, akhir, p.pos, v, p.kartu.includes('penawar')) })).sort((a, b) => b.h.ke - a.h.ke)[0]!;
      if ((best.h.ke === 100 || best.h.lewat === 'tangga') && coba({ t: 'kartu', kartu: k, nilai: best.v })) return;
    }
    if (k === 'lompat') {
      const h = hitung(g.papan, akhir, p.pos, 4, p.kartu.includes('penawar'));
      if (h.ke > p.pos + 3 && coba({ t: 'kartu', kartu: k })) return;
    }
    if (k === 'ketiga' && p.pos >= 85 && coba({ t: 'kartu', kartu: k })) return;
    if (k === 'perisai' && p.pos >= 80 && coba({ t: 'kartu', kartu: k })) return;
  }
}

// ── Tampilan ────────────────────────────────────────────────────────────────

export interface View {
  code: string;
  rev: number;
  now: number;
  deadline: number | null;
  phase: Phase;
  host: string;
  opts: Opts;
  preset: 'klasik' | 'jenius' | 'racikan';
  papan: Papan;
  giliran: string | null;
  fase: Fase;
  dadu: number[] | null;
  emas: number | null;
  ketiga: boolean;
  kartuDipakai: boolean;
  ronde: number;
  musim: Musim | null;
  players: { id: string; name: string; avatar: string; bot: boolean; pos: number; kartu: number; penawar: boolean; perisai: boolean; didorong: boolean }[];
  log: Ev[];
  pemenang: string | null;
  me: { id: string; kartu: KartuId[] } | null;
}

export function viewFor(g: Game, pid: string | null, now: number): View {
  const me = pid ? byId(g, pid) : undefined;
  return {
    code: g.code,
    rev: g.rev,
    now,
    deadline: g.deadline,
    phase: g.phase,
    host: g.host,
    opts: g.opts,
    preset: presetOf(g.opts),
    papan: g.papan,
    giliran: g.phase === 'main' ? cur(g).id : null,
    fase: g.fase,
    dadu: g.dadu,
    emas: g.emas,
    ketiga: g.ketiga,
    kartuDipakai: g.kartuDipakai,
    ronde: g.ronde,
    musim: g.musim,
    // Jumlah kartu lawan terlihat, isinya rahasia; Penawar terlihat (seperti kartu di depan pemain).
    players: g.players.map((p) => ({ id: p.id, name: p.name, avatar: p.avatar, bot: p.bot, pos: p.pos, kartu: p.kartu.length, penawar: p.kartu.includes('penawar'), perisai: p.perisai, didorong: p.didorong })),
    log: g.log.slice(-40),
    pemenang: g.pemenang,
    me: me ? { id: me.id, kartu: me.kartu } : null,
  };
}
