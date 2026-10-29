/**
 * SAUDAGAR: permainan jual-beli properti untuk 2–8 orang dengan aturan
 * Monopoli resmi lengkap: beli atau lelang, sewa (dobel untuk satu grup,
 * rumah 1–4, hotel), transportasi & utilitas, penjara (bayar, kartu, atau
 * dadu kembar, paling lama 3 kali), kembar 3 kali masuk penjara, kartu
 * Kesempatan & Dana Umum, bangun merata dengan stok 32 rumah & 12 hotel,
 * gadai & tebus (bunga 10%), tukar-menukar, menagih utang, dan bangkrut.
 *
 * Aturan rumahan opsional: jackpot Parkir Bebas, Start dobel, tanpa lelang,
 * batas waktu (yang terkaya menang).
 *
 * Murni (tanpa I/O): server, tes, dan bot memakai aturan yang persis sama.
 */
import { anggotaGrup, GRUP, type Grup, isMilikan, KARTU, type Kartu, type Milikan, PETAK, rp, TRANSPORT, UTILITAS } from './papan';

export * from './papan';

// ── Aturan ──────────────────────────────────────────────────────────────────

export interface Opts {
  modal: number;
  /** Pajak & denda masuk ke tengah; yang berhenti di Parkir Bebas mengambilnya. */
  parkir: boolean;
  /** Berhenti tepat di Mulai: terima dua kali lipat. */
  startDobel: boolean;
  /** Properti yang tidak dibeli dilelang (resmi). */
  lelang: boolean;
  /** Menit; 0 = sampai tersisa satu. Kalau habis, kekayaan terbesar menang. */
  batas: number;
  /** Detik per giliran; 0 = santai. */
  waktu: number;
}
export const RESMI: Omit<Opts, 'waktu'> = { modal: 1500, parkir: false, startDobel: false, lelang: true, batas: 0 };
export const RUMAHAN: Omit<Opts, 'waktu'> = { modal: 1500, parkir: true, startDobel: true, lelang: true, batas: 60 };
export const presetOf = (o: Opts): 'resmi' | 'rumahan' | 'racikan' => {
  const same = (p: Omit<Opts, 'waktu'>) => (Object.keys(p) as (keyof typeof p)[]).every((k) => p[k] === o[k]);
  return same(RESMI) ? 'resmi' : same(RUMAHAN) ? 'rumahan' : 'racikan';
};
export const MAX_PLAYERS = 8;
export const GAJI = 200;
export const DENDA_PENJARA = 50;
export const STOK_RUMAH = 32;
export const STOK_HOTEL = 12;
export const LELANG_MS = 12_000;
export const LELANG_TAMBAH_MS = 7_000;

// ── Tipe ────────────────────────────────────────────────────────────────────

export interface Player {
  id: string;
  name: string;
  avatar: string;
  guest: boolean;
  bot: boolean;
  uang: number;
  pos: number;
  /** -1 = bebas; 0..2 = sudah berapa kali mencoba kembar di penjara. */
  penjara: number;
  /** Kartu bebas penjara yang dipegang (dek asalnya). */
  bebas: ('k' | 'd')[];
  bangkrut: boolean;
  ganda: number;
}

export interface Milik {
  owner: string | null;
  /** 0–4 rumah, 5 = hotel. */
  rumah: number;
  gadai: boolean;
}

export interface Lelang {
  kotak: number;
  tawar: number;
  oleh: string | null;
  keluar: string[];
  deadline: number;
}

export interface Utang {
  dari: string;
  /** null = bank (atau jackpot parkir). */
  ke: string | null;
  jumlah: number;
  alasan: string;
}

export interface Paket {
  uang: number;
  kotak: number[];
  bebas: number;
}
export interface Tawaran {
  id: number;
  dari: string;
  ke: string;
  beri: Paket;
  minta: Paket;
  waktu: number;
}

export type Phase = 'lobby' | 'main' | 'akhir';
export type Fase = 'lempar' | 'beli' | 'lelang' | 'utang' | 'selesai';

export interface Ev {
  n: number;
  t: 'mulai' | 'lempar' | 'gerak' | 'beli' | 'sewa' | 'bayar' | 'terima' | 'kartu' | 'penjara' | 'bebas' | 'lelang' | 'menang-lelang' | 'bangun' | 'jual' | 'gadai' | 'tebus' | 'tukar' | 'bangkrut' | 'parkir' | 'start' | 'selesai' | 'ganda' | 'waktu';
  by?: string;
  ke?: string;
  kotak?: number;
  jumlah?: number;
  dadu?: number[];
  kartu?: number;
  teks?: string;
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
  milik: Milik[];
  rumahBank: number;
  hotelBank: number;
  dekK: number[];
  dekD: number[];
  giliran: number;
  fase: Fase;
  dadu: [number, number] | null;
  /** Kotak yang sedang ditawarkan untuk dibeli. */
  beli: number | null;
  lelang: Lelang | null;
  lelangAntre: number[];
  utang: Utang[];
  /** Fase setelah utang/lelang selesai. */
  setelah: 'lempar' | 'selesai';
  tawaran: Tawaran[];
  nTawar: number;
  pot: number;
  mulaiAt: number;
  log: Ev[];
  n: number;
  pemenang: string | null;
  botAt: number | null;
  /** Kartu yang baru dibuka, untuk ditampilkan semua orang. */
  kartu: { id: number; by: string; n: number } | null;
}

export type Action =
  | { t: 'mulai' }
  | { t: 'bot'; tambah: boolean }
  | { t: 'opsi'; opts: Partial<Opts> }
  | { t: 'preset'; nama: 'resmi' | 'rumahan' }
  | { t: 'lempar' }
  | { t: 'tebusPenjara' }
  | { t: 'kartuBebas' }
  | { t: 'beli' }
  | { t: 'tolak' }
  | { t: 'tawar'; n: number }
  | { t: 'lewatLelang' }
  | { t: 'bangun'; kotak: number }
  | { t: 'jualRumah'; kotak: number }
  | { t: 'gadai'; kotak: number }
  | { t: 'tebus'; kotak: number }
  | { t: 'bayarUtang' }
  | { t: 'bangkrut' }
  | { t: 'akhiri' }
  | { t: 'ajukan'; ke: string; beri: Paket; minta: Paket }
  | { t: 'terimaTawaran'; id: number }
  | { t: 'tolakTawaran'; id: number }
  | { t: 'lagi' };

export class GameError extends Error {}
const fail = (m: string): never => {
  throw new GameError(m);
};

// ── Acak ────────────────────────────────────────────────────────────────────

function rand(g: Game): number {
  let t = (g.rng = (g.rng + 0x6d2b79f5) >>> 0);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const d6 = (g: Game) => 1 + Math.floor(rand(g) * 6);
function shuffle<T>(g: Game, xs: T[]): T[] {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand(g) * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

// ── Ruang ───────────────────────────────────────────────────────────────────

type NewPlayer = { id: string; name: string; avatar: string; guest: boolean };
const fresh = (p: NewPlayer, bot = false): Player => ({ ...p, bot, uang: 0, pos: 0, penjara: -1, bebas: [], bangkrut: false, ganda: 0 });
const milikKosong = (): Milik[] => PETAK.map(() => ({ owner: null, rumah: 0, gadai: false }));

export function newGame(code: string, host: NewPlayer, now: number, seed: number): Game {
  return {
    code,
    host: host.id,
    rev: 1,
    deadline: null,
    phase: 'lobby',
    opts: { ...RESMI, waktu: 0 },
    rng: seed >>> 0,
    players: [fresh(host)],
    milik: milikKosong(),
    rumahBank: STOK_RUMAH,
    hotelBank: STOK_HOTEL,
    dekK: [],
    dekD: [],
    giliran: 0,
    fase: 'lempar',
    dadu: null,
    beli: null,
    lelang: null,
    lelangAntre: [],
    utang: [],
    setelah: 'selesai',
    tawaran: [],
    nTawar: 0,
    pot: 0,
    mulaiAt: now,
    log: [],
    n: 0,
    pemenang: null,
    botAt: null,
    kartu: null,
  };
}

export const BOTS: [string, string][] = [
  ['Juragan Kopi', 'burung'],
  ['Bu Haji', 'kucing'],
  ['Koh Ahong', 'landak'],
  ['Mbak Olshop', 'kelinci'],
  ['Pak Camat', 'katak'],
  ['Tante Sosialita', 'kupu-kupu'],
  ['Mas Startup', 'lebah'],
];

export function join(g: Game, p: NewPlayer) {
  const me = g.players.find((x) => x.id === p.id);
  if (me) {
    me.name = p.name;
    me.avatar = p.avatar;
    me.bot = false;
  } else {
    if (g.phase !== 'lobby') fail('Permainan sudah berjalan. Tonton lewat mode TV, atau tunggu permainan berikutnya.');
    if (g.players.length >= MAX_PLAYERS) fail('Meja penuh (8 orang).');
    g.players.push(fresh(p));
  }
  g.rev++;
}

export function leave(g: Game, pid: string) {
  const p = g.players.find((x) => x.id === pid);
  if (!p) return;
  if (g.phase === 'lobby') g.players = g.players.filter((x) => x.id !== pid);
  else p.bot = true;
  const human = g.players.find((x) => !x.bot && !x.bangkrut);
  if (g.host === pid && human) g.host = human.id;
  g.rev++;
}

// ── Pembantu ────────────────────────────────────────────────────────────────

const byId = (g: Game, id: string | null | undefined) => g.players.find((p) => p.id === id);
const cur = (g: Game) => g.players[g.giliran]!;
const aktif = (g: Game) => g.players.filter((p) => !p.bangkrut);
const push = (g: Game, e: Omit<Ev, 'n'>) => g.log.push({ n: ++g.n, ...e });
const petakMilik = (i: number) => {
  const p = PETAK[i]!;
  return isMilikan(p) ? p : fail('Petak itu tidak bisa dimiliki.');
};

/** Pemilik punya semua kota di grup ini. */
export function satuGrup(milik: Milik[], grup: Grup, owner: string) {
  return anggotaGrup(grup).every((i) => milik[i]!.owner === owner);
}

/** Sewa yang harus dibayar saat berhenti di petak `i`. */
export function sewa(milik: Milik[], i: number, dadu: number, kali = 1, utilKali?: number): number {
  const p = PETAK[i]!;
  const m = milik[i]!;
  if (!isMilikan(p) || !m.owner || m.gadai) return 0;
  if (p.jenis === 'kota') {
    if (m.rumah > 0) return p.sewa[m.rumah]! * kali;
    return p.sewa[0]! * (satuGrup(milik, p.grup, m.owner) ? 2 : 1) * kali;
  }
  if (p.jenis === 'transport') {
    const n = TRANSPORT.filter((t) => milik[t]!.owner === m.owner).length;
    return 25 * 2 ** (n - 1) * kali;
  }
  const n = UTILITAS.filter((t) => milik[t]!.owner === m.owner).length;
  return dadu * (utilKali ?? (n === 2 ? 10 : 4));
}

/** Kekayaan bersih: uang + harga properti (gadai separuh) + biaya bangunan. */
export function kekayaan(g: Pick<Game, 'milik'>, p: Pick<Player, 'id' | 'uang'>) {
  let n = p.uang;
  g.milik.forEach((m, i) => {
    if (m.owner !== p.id) return;
    const pt = PETAK[i] as Milikan;
    n += m.gadai ? pt.harga / 2 : pt.harga;
    if (pt.jenis === 'kota') n += m.rumah * pt.bangun;
  });
  return n;
}

/** Uang yang masih bisa dikumpulkan: jual semua bangunan (separuh) dan gadai semua properti. */
export function bisaDikumpulkan(g: Pick<Game, 'milik'>, p: Pick<Player, 'id' | 'uang'>) {
  let n = p.uang;
  g.milik.forEach((m, i) => {
    if (m.owner !== p.id) return;
    const pt = PETAK[i] as Milikan;
    if (pt.jenis === 'kota') n += (m.rumah * pt.bangun) / 2;
    if (!m.gadai) n += pt.harga / 2;
  });
  return n;
}
export const nilaiTebus = (harga: number) => Math.ceil((harga * 11) / 20);

// ── Mulai & giliran ─────────────────────────────────────────────────────────

function mulai(g: Game, now: number) {
  g.players = shuffle(g, g.players);
  for (const p of g.players) Object.assign(p, { uang: g.opts.modal, pos: 0, penjara: -1, bebas: [], bangkrut: false, ganda: 0 });
  g.milik = milikKosong();
  g.rumahBank = STOK_RUMAH;
  g.hotelBank = STOK_HOTEL;
  g.dekK = shuffle(g, KARTU.filter((k) => k.dek === 'k').map((k) => k.id));
  g.dekD = shuffle(g, KARTU.filter((k) => k.dek === 'd').map((k) => k.id));
  g.giliran = 0;
  g.lelang = null;
  g.lelangAntre = [];
  g.utang = [];
  g.tawaran = [];
  g.pot = 0;
  g.mulaiAt = now;
  g.log = [];
  g.n = 0;
  g.pemenang = null;
  g.kartu = null;
  g.phase = 'main';
  push(g, { t: 'mulai', by: cur(g).id });
  mulaiGiliran(g, now);
}

function mulaiGiliran(g: Game, now: number) {
  const p = cur(g);
  g.fase = 'lempar';
  g.dadu = null;
  g.beli = null;
  g.setelah = 'selesai';
  jadwal(g, p, now);
}

/** Tenggat & jadwal bot untuk pemain yang sedang harus bertindak. */
function jadwal(g: Game, p: Player, now: number, ms?: number) {
  g.deadline = !p.bot && g.opts.waktu ? now + g.opts.waktu * 1000 : null;
  g.botAt = p.bot ? now + (ms ?? 900 + Math.floor(rand(g) * 700)) : null;
}

function akhiriGiliran(g: Game, now: number) {
  cur(g).ganda = 0;
  if (cekAkhir(g, now)) return;
  const n = g.players.length;
  do g.giliran = (g.giliran + 1) % n;
  while (g.players[g.giliran]!.bangkrut);
  mulaiGiliran(g, now);
}

function cekAkhir(g: Game, now: number): boolean {
  const sisa = aktif(g);
  const habis = g.opts.batas > 0 && now >= g.mulaiAt + g.opts.batas * 60_000;
  if (sisa.length > 1 && !habis) return false;
  const w = [...sisa].sort((a, b) => kekayaan(g, b) - kekayaan(g, a))[0]!;
  g.pemenang = w.id;
  g.phase = 'akhir';
  g.deadline = null;
  g.botAt = null;
  if (habis && sisa.length > 1) push(g, { t: 'waktu', by: w.id, jumlah: kekayaan(g, w) });
  push(g, { t: 'selesai', by: w.id });
  return true;
}

// ── Uang ────────────────────────────────────────────────────────────────────

function terima(g: Game, p: Player, n: number) {
  p.uang += n;
}
/** Tambahkan utang ke antrean; diselesaikan oleh prosesUtang. */
function utang(g: Game, dari: Player, ke: Player | null, jumlah: number, alasan: string) {
  if (jumlah <= 0) return;
  g.utang.push({ dari: dari.id, ke: ke?.id ?? null, jumlah, alasan });
}

/** Bayar utang yang bisa dibayar. Mengembalikan true bila antrean kosong. */
function prosesUtang(g: Game, now: number): boolean {
  while (g.utang.length) {
    const u = g.utang[0]!;
    const p = byId(g, u.dari)!;
    const ke = byId(g, u.ke);
    if (p.bangkrut || (ke && ke.bangkrut)) {
      g.utang.shift();
      continue;
    }
    if (p.uang < u.jumlah) {
      g.fase = 'utang';
      jadwal(g, p, now, 1200);
      if (!p.bot && !g.opts.waktu) g.deadline = null;
      return false;
    }
    p.uang -= u.jumlah;
    if (ke) ke.uang += u.jumlah;
    else if (g.opts.parkir && u.alasan !== 'sewa' && u.alasan !== 'beli') g.pot += u.jumlah;
    push(g, { t: ke ? 'sewa' : 'bayar', by: p.id, ke: ke?.id, jumlah: u.jumlah, teks: u.alasan });
    g.utang.shift();
  }
  return true;
}

/** Lanjutkan alur setelah sesuatu selesai (utang lunas, lelang usai, beli diputuskan). */
function lanjut(g: Game, now: number) {
  if (g.phase !== 'main') return;
  if (!prosesUtang(g, now)) return;
  if (g.lelangAntre.length) return mulaiLelang(g, g.lelangAntre.shift()!, now);
  if (cur(g).bangkrut) return akhiriGiliran(g, now);
  g.fase = g.setelah;
  g.beli = null;
  jadwal(g, cur(g), now);
}

// ── Gerak ───────────────────────────────────────────────────────────────────

function pindah(g: Game, p: Player, ke: number, gaji = true) {
  const lewatStart = ke < p.pos || (ke === 0 && p.pos !== 0);
  p.pos = ke;
  if (gaji && lewatStart) {
    const n = g.opts.startDobel && ke === 0 ? GAJI * 2 : GAJI;
    terima(g, p, n);
    push(g, { t: 'start', by: p.id, jumlah: n });
  }
  push(g, { t: 'gerak', by: p.id, kotak: ke });
}

function kePenjara(g: Game, p: Player) {
  p.pos = 10;
  p.penjara = 0;
  p.ganda = 0;
  g.setelah = 'selesai';
  push(g, { t: 'penjara', by: p.id });
}

/** Berhenti di petak: beli, sewa, pajak, kartu, penjara, parkir. */
function injak(g: Game, p: Player, now: number, kali = 1, utilKali?: number) {
  const pt = PETAK[p.pos]!;
  switch (pt.jenis) {
    case 'kota':
    case 'transport':
    case 'utilitas': {
      const m = g.milik[p.pos]!;
      if (!m.owner) {
        g.beli = p.pos;
        g.fase = 'beli';
        jadwal(g, p, now);
        return;
      }
      if (m.owner === p.id || m.gadai) break;
      const dadu = utilKali ? d6(g) + d6(g) : (g.dadu?.[0] ?? 0) + (g.dadu?.[1] ?? 0);
      utang(g, p, byId(g, m.owner)!, sewa(g.milik, p.pos, dadu, kali, utilKali), 'sewa');
      break;
    }
    case 'pajak':
      utang(g, p, null, pt.jumlah, pt.nama);
      break;
    case 'kesempatan':
    case 'dana':
      return ambilKartu(g, p, pt.jenis === 'kesempatan' ? 'k' : 'd', now);
    case 'kepenjara':
      kePenjara(g, p);
      break;
    case 'parkir':
      if (g.opts.parkir && g.pot > 0) {
        push(g, { t: 'parkir', by: p.id, jumlah: g.pot });
        terima(g, p, g.pot);
        g.pot = 0;
      }
      break;
  }
  lanjut(g, now);
}

function ambilKartu(g: Game, p: Player, dek: 'k' | 'd', now: number) {
  const tumpuk = dek === 'k' ? g.dekK : g.dekD;
  const id = tumpuk.shift()!;
  const k = KARTU[id]!;
  g.kartu = { id, by: p.id, n: g.n + 1 };
  push(g, { t: 'kartu', by: p.id, kartu: id });
  // Kartu bebas penjara disimpan pemain; kartu lain kembali ke bawah tumpukan.
  if (k.aksi.t === 'bebas') p.bebas.push(dek);
  else tumpuk.push(id);
  jalankanKartu(g, p, k, now);
}

function jalankanKartu(g: Game, p: Player, k: Kartu, now: number) {
  const a = k.aksi;
  switch (a.t) {
    case 'maju':
      pindah(g, p, a.ke);
      return injak(g, p, now);
    case 'terdekat': {
      const daftar = a.jenis === 'transport' ? TRANSPORT : UTILITAS;
      const ke = daftar.find((i) => i > p.pos) ?? daftar[0]!;
      pindah(g, p, ke);
      return a.jenis === 'transport' ? injak(g, p, now, 2) : injak(g, p, now, 1, 10);
    }
    case 'mundur':
      pindah(g, p, (p.pos - a.n + 40) % 40, false);
      return injak(g, p, now);
    case 'penjara':
      kePenjara(g, p);
      break;
    case 'bebas':
      break;
    case 'terima':
      terima(g, p, a.n);
      break;
    case 'bayar':
      utang(g, p, null, a.n, 'kartu');
      break;
    case 'perbaikan': {
      let n = 0;
      g.milik.forEach((m) => {
        if (m.owner === p.id) n += m.rumah === 5 ? a.hotel : m.rumah * a.rumah;
      });
      utang(g, p, null, n, 'perbaikan');
      break;
    }
    case 'bayarSemua':
      for (const x of aktif(g)) if (x !== p) utang(g, p, x, a.n, 'kartu');
      break;
    case 'terimaSemua':
      for (const x of aktif(g)) if (x !== p) utang(g, x, p, a.n, 'kartu');
      break;
  }
  lanjut(g, now);
}

function lempar(g: Game, p: Player, now: number) {
  const d: [number, number] = [d6(g), d6(g)];
  g.dadu = d;
  g.kartu = null;
  const kembar = d[0] === d[1];
  push(g, { t: 'lempar', by: p.id, dadu: d });
  if (p.penjara >= 0) {
    if (kembar) {
      p.penjara = -1;
      push(g, { t: 'bebas', by: p.id, teks: 'kembar' });
      g.setelah = 'selesai';
      pindah(g, p, (p.pos + d[0] + d[1]) % 40);
      return injak(g, p, now);
    }
    p.penjara++;
    if (p.penjara >= 3) {
      // Percobaan ketiga gagal: wajib bayar denda, lalu jalan sesuai dadu.
      p.penjara = -1;
      // Denda dibayar sebelum berjalan (kalau uangnya kurang, ditagih sebagai utang).
      if (p.uang >= DENDA_PENJARA) {
        p.uang -= DENDA_PENJARA;
        if (g.opts.parkir) g.pot += DENDA_PENJARA;
      } else utang(g, p, null, DENDA_PENJARA, 'denda penjara');
      push(g, { t: 'bebas', by: p.id, teks: 'denda' });
      g.setelah = 'selesai';
      pindah(g, p, (p.pos + d[0] + d[1]) % 40);
      return injak(g, p, now);
    }
    g.fase = 'selesai';
    return jadwal(g, p, now);
  }
  if (kembar) {
    p.ganda++;
    if (p.ganda >= 3) {
      push(g, { t: 'ganda', by: p.id, jumlah: 3 });
      kePenjara(g, p);
      g.fase = 'selesai';
      return jadwal(g, p, now);
    }
  }
  g.setelah = kembar ? 'lempar' : 'selesai';
  pindah(g, p, (p.pos + d[0] + d[1]) % 40);
  injak(g, p, now);
}

// ── Lelang ──────────────────────────────────────────────────────────────────

function mulaiLelang(g: Game, kotak: number, now: number) {
  g.fase = 'lelang';
  g.lelang = { kotak, tawar: 0, oleh: null, keluar: [], deadline: now + LELANG_MS };
  g.deadline = g.lelang.deadline;
  g.botAt = now + 1500;
  push(g, { t: 'lelang', kotak });
}

function selesaiLelang(g: Game, now: number) {
  const l = g.lelang!;
  g.lelang = null;
  const w = byId(g, l.oleh);
  if (w && !w.bangkrut && w.uang >= l.tawar) {
    w.uang -= l.tawar;
    g.milik[l.kotak] = { owner: w.id, rumah: 0, gadai: false };
    push(g, { t: 'menang-lelang', by: w.id, kotak: l.kotak, jumlah: l.tawar });
  } else push(g, { t: 'menang-lelang', kotak: l.kotak, jumlah: 0 });
  lanjut(g, now);
}

function cekLelang(g: Game, now: number): boolean {
  const l = g.lelang;
  if (!l) return false;
  const ikut = aktif(g).filter((p) => !l.keluar.includes(p.id));
  const habis = now >= l.deadline || ikut.length === 0 || (ikut.length === 1 && l.oleh === ikut[0]!.id);
  if (habis) selesaiLelang(g, now);
  return habis;
}

// ── Bangunan & gadai ────────────────────────────────────────────────────────

function kotaMilik(g: Game, p: Player, i: number) {
  const pt = PETAK[i];
  if (!pt || pt.jenis !== 'kota') fail('Hanya kota yang bisa dibangun.');
  if (g.milik[i]!.owner !== p.id) fail('Itu bukan milikmu.');
  return pt as Extract<typeof pt, { jenis: 'kota' }>;
}

export function bisaBangun(g: Pick<Game, 'milik' | 'rumahBank' | 'hotelBank'>, pid: string, i: number): string | null {
  const pt = PETAK[i];
  if (!pt || pt.jenis !== 'kota') return 'Hanya kota.';
  const m = g.milik[i]!;
  if (m.owner !== pid) return 'Bukan milikmu.';
  const grup = anggotaGrup(pt.grup);
  if (!satuGrup(g.milik, pt.grup, pid)) return 'Kuasai semua kota di grup ini dulu.';
  if (grup.some((x) => g.milik[x]!.gadai)) return 'Ada kota tergadai di grup ini.';
  if (m.rumah >= 5) return 'Sudah hotel.';
  if (m.rumah > Math.min(...grup.map((x) => g.milik[x]!.rumah))) return 'Bangun merata: kota lain di grup ini dulu.';
  if (m.rumah === 4 ? g.hotelBank < 1 : g.rumahBank < 1) return m.rumah === 4 ? 'Stok hotel di bank habis.' : 'Stok rumah di bank habis.';
  return null;
}

function bangun(g: Game, p: Player, i: number) {
  const pt = kotaMilik(g, p, i);
  const alasan = bisaBangun(g, p.id, i);
  if (alasan) fail(alasan);
  if (p.uang < pt.bangun) fail(`Butuh ${rp(pt.bangun)}.`);
  const m = g.milik[i]!;
  p.uang -= pt.bangun;
  if (m.rumah === 4) ((g.rumahBank += 4), (g.hotelBank -= 1));
  else g.rumahBank -= 1;
  m.rumah++;
  push(g, { t: 'bangun', by: p.id, kotak: i, jumlah: m.rumah });
}

function jualRumah(g: Game, p: Player, i: number) {
  const pt = kotaMilik(g, p, i);
  const m = g.milik[i]!;
  if (m.rumah === 0) fail('Tidak ada bangunan.');
  if (m.rumah < Math.max(...anggotaGrup(pt.grup).map((x) => g.milik[x]!.rumah))) fail('Jual merata: kota lain di grup ini dulu.');
  if (m.rumah === 5) {
    if (g.rumahBank >= 4) {
      g.rumahBank -= 4;
      g.hotelBank += 1;
      m.rumah = 4;
      p.uang += pt.bangun / 2;
    } else {
      // Stok rumah tidak cukup untuk memecah hotel: hotel dijual habis.
      g.hotelBank += 1;
      m.rumah = 0;
      p.uang += (pt.bangun * 5) / 2;
    }
  } else {
    g.rumahBank += 1;
    m.rumah--;
    p.uang += pt.bangun / 2;
  }
  push(g, { t: 'jual', by: p.id, kotak: i, jumlah: m.rumah });
}

function gadai(g: Game, p: Player, i: number) {
  const pt = petakMilik(i);
  const m = g.milik[i]!;
  if (m.owner !== p.id) fail('Itu bukan milikmu.');
  if (m.gadai) fail('Sudah digadai.');
  if (pt.jenis === 'kota' && anggotaGrup(pt.grup).some((x) => g.milik[x]!.rumah > 0)) fail('Jual dulu semua bangunan di grup ini.');
  m.gadai = true;
  p.uang += pt.harga / 2;
  push(g, { t: 'gadai', by: p.id, kotak: i, jumlah: pt.harga / 2 });
}

function tebus(g: Game, p: Player, i: number) {
  const pt = petakMilik(i);
  const m = g.milik[i]!;
  if (m.owner !== p.id || !m.gadai) fail('Tidak ada yang perlu ditebus.');
  const n = nilaiTebus(pt.harga);
  if (p.uang < n) fail(`Butuh ${rp(n)}.`);
  p.uang -= n;
  m.gadai = false;
  push(g, { t: 'tebus', by: p.id, kotak: i, jumlah: n });
}

// ── Bangkrut ────────────────────────────────────────────────────────────────

function bangkrut(g: Game, p: Player, now: number) {
  const u = g.utang[0];
  const ke = u && u.dari === p.id ? byId(g, u.ke) : undefined;
  // Bangunan dijual ke bank (separuh harga) dulu.
  g.milik.forEach((m, i) => {
    if (m.owner !== p.id || m.rumah === 0) return;
    const pt = PETAK[i] as Extract<Milikan, { jenis: 'kota' }>;
    p.uang += (m.rumah * pt.bangun) / 2;
    if (m.rumah === 5) g.hotelBank++;
    else g.rumahBank += m.rumah;
    m.rumah = 0;
  });
  const dariBangkrut = g.milik.map((m, i) => (m.owner === p.id ? i : -1)).filter((i) => i >= 0);
  if (ke) {
    ke.uang += p.uang;
    g.milik.forEach((m) => {
      if (m.owner !== p.id) return;
      m.owner = ke.id;
    });
    // Penerima properti tergadai membayar bunga 10% ke bank (sebisanya).
    g.milik.forEach((m, i) => {
      if (m.owner === ke.id && m.gadai && dariBangkrut.includes(i)) ke.uang -= Math.min(ke.uang, Math.ceil((PETAK[i] as Milikan).harga / 20));
    });
    ke.bebas.push(...p.bebas);
  } else {
    const kotak: number[] = [];
    g.milik.forEach((m, i) => {
      if (m.owner !== p.id) return;
      g.milik[i] = { owner: null, rumah: 0, gadai: false };
      kotak.push(i);
    });
    if (g.opts.lelang) g.lelangAntre.push(...kotak);
    for (const d of p.bebas) (d === 'k' ? g.dekK : g.dekD).push(KARTU.find((k) => k.dek === d && k.aksi.t === 'bebas')!.id);
  }
  p.uang = 0;
  p.bebas = [];
  p.bangkrut = true;
  g.utang = g.utang.filter((x) => x.dari !== p.id && x.ke !== p.id);
  g.tawaran = g.tawaran.filter((t) => t.dari !== p.id && t.ke !== p.id);
  push(g, { t: 'bangkrut', by: p.id, ke: ke?.id });
  if (cekAkhir(g, now)) return;
  if (cur(g) === p) {
    g.setelah = 'selesai';
    if (!prosesUtang(g, now)) return;
    if (g.lelangAntre.length) return mulaiLelang(g, g.lelangAntre.shift()!, now);
    return akhiriGiliran(g, now);
  }
  lanjut(g, now);
}

// ── Tukar ───────────────────────────────────────────────────────────────────

function cekPaket(g: Game, p: Player, k: Paket) {
  if (!Number.isInteger(k.uang) || k.uang < 0) fail('Jumlah uang tidak sah.');
  if (k.uang > p.uang) fail(`${p.name} tidak punya uang sebanyak itu.`);
  if (!Number.isInteger(k.bebas) || k.bebas < 0 || k.bebas > p.bebas.length) fail('Kartu bebas penjara tidak cukup.');
  for (const i of k.kotak) {
    const pt = petakMilik(i);
    if (g.milik[i]!.owner !== p.id) fail(`${pt.nama} bukan milik ${p.name}.`);
    if (pt.jenis === 'kota' && anggotaGrup(pt.grup).some((x) => g.milik[x]!.rumah > 0)) fail(`Jual dulu bangunan di grup ${pt.nama}.`);
  }
}

function serahkan(g: Game, dari: Player, ke: Player, k: Paket) {
  dari.uang -= k.uang;
  ke.uang += k.uang;
  for (const i of k.kotak) {
    g.milik[i]!.owner = ke.id;
    // Properti tergadai: penerima membayar bunga 10% ke bank.
    if (g.milik[i]!.gadai) ke.uang -= Math.ceil((PETAK[i] as Milikan).harga / 20);
  }
  for (let j = 0; j < k.bebas; j++) ke.bebas.push(dari.bebas.pop()!);
}

const bungaPaket = (g: Game, k: Paket) => k.kotak.reduce((a, i) => a + (g.milik[i]!.gadai ? Math.ceil((PETAK[i] as Milikan).harga / 20) : 0), 0);

function terimaTawaran(g: Game, p: Player, id: number) {
  const t = g.tawaran.find((x) => x.id === id) ?? fail('Tawaran sudah tidak berlaku.');
  if (t.ke !== p.id) fail('Tawaran ini bukan untukmu.');
  const dari = byId(g, t.dari)!;
  cekPaket(g, dari, t.beri);
  cekPaket(g, p, t.minta);
  if (p.uang - t.minta.uang + t.beri.uang < bungaPaket(g, t.beri)) fail('Uangmu tidak cukup untuk bunga gadai properti yang diterima.');
  if (dari.uang - t.beri.uang + t.minta.uang < bungaPaket(g, t.minta)) fail(`Uang ${dari.name} tidak cukup untuk bunga gadai.`);
  serahkan(g, dari, p, t.beri);
  serahkan(g, p, dari, t.minta);
  g.tawaran = g.tawaran.filter((x) => x.id !== id);
  push(g, { t: 'tukar', by: dari.id, ke: p.id });
}

// ── Aksi ────────────────────────────────────────────────────────────────────

export function act(g: Game, pid: string, a: Action, now: number) {
  const p = byId(g, pid) ?? fail('Kamu belum duduk di meja ini.');
  const host = pid === g.host;
  const lobby = () => (!host || g.phase !== 'lobby') && fail('Hanya tuan rumah, sebelum mulai.');
  const main = () => (g.phase !== 'main' || p.bangkrut) && fail('Permainan tidak sedang berjalan.');
  const giliran = (...fs: Fase[]) => {
    main();
    if (cur(g) !== p || !fs.includes(g.fase)) fail('Belum giliranmu.');
  };
  const kelola = () => {
    main();
    if (g.fase === 'lelang') fail('Tunggu lelang selesai.');
  };
  switch (a.t) {
    case 'bot': {
      lobby();
      if (a.tambah) {
        if (g.players.length >= MAX_PLAYERS) fail('Meja penuh.');
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
      g.opts = { ...(a.nama === 'resmi' ? RESMI : RUMAHAN), waktu: g.opts.waktu };
      break;
    case 'opsi': {
      lobby();
      const o = a.opts ?? {};
      for (const k of ['parkir', 'startDobel', 'lelang'] as const) if (typeof o[k] === 'boolean') g.opts[k] = o[k]!;
      if (o.modal !== undefined && [1000, 1500, 2000].includes(o.modal)) g.opts.modal = o.modal;
      if (o.batas !== undefined && [0, 30, 45, 60, 90].includes(o.batas)) g.opts.batas = o.batas;
      if (o.waktu !== undefined && [0, 30, 60, 90].includes(o.waktu)) g.opts.waktu = o.waktu;
      break;
    }
    case 'mulai':
      if (!host || g.phase !== 'lobby') fail('Hanya tuan rumah yang bisa memulai.');
      if (g.players.length < 2) fail('Butuh minimal 2 pemain. Tambahkan bot kalau sedang sendiri.');
      mulai(g, now);
      break;
    case 'lempar':
      giliran('lempar');
      lempar(g, p, now);
      break;
    case 'tebusPenjara':
      giliran('lempar');
      if (p.penjara < 0) fail('Kamu tidak di penjara.');
      if (p.uang < DENDA_PENJARA) fail(`Butuh ${rp(DENDA_PENJARA)}.`);
      p.uang -= DENDA_PENJARA;
      if (g.opts.parkir) g.pot += DENDA_PENJARA;
      p.penjara = -1;
      push(g, { t: 'bebas', by: p.id, teks: 'bayar', jumlah: DENDA_PENJARA });
      break;
    case 'kartuBebas': {
      giliran('lempar');
      if (p.penjara < 0) fail('Kamu tidak di penjara.');
      const d = p.bebas.pop() ?? fail('Kamu tidak punya kartu bebas penjara.');
      (d === 'k' ? g.dekK : g.dekD).push(KARTU.find((k) => k.dek === d && k.aksi.t === 'bebas')!.id);
      p.penjara = -1;
      push(g, { t: 'bebas', by: p.id, teks: 'kartu' });
      break;
    }
    case 'beli': {
      giliran('beli');
      const pt = petakMilik(g.beli!);
      if (p.uang < pt.harga) fail(`Uangmu kurang. Gadai atau jual sesuatu dulu, atau lelang.`);
      p.uang -= pt.harga;
      g.milik[g.beli!] = { owner: p.id, rumah: 0, gadai: false };
      push(g, { t: 'beli', by: p.id, kotak: g.beli!, jumlah: pt.harga });
      lanjut(g, now);
      break;
    }
    case 'tolak':
      giliran('beli');
      if (g.opts.lelang) mulaiLelang(g, g.beli!, now);
      else lanjut(g, now);
      break;
    case 'tawar': {
      main();
      const l = g.lelang ?? fail('Tidak ada lelang.');
      if (l.keluar.includes(p.id)) fail('Kamu sudah mundur dari lelang ini.');
      if (!Number.isInteger(a.n) || a.n <= l.tawar) fail('Tawaran harus lebih tinggi.');
      if (a.n > p.uang) fail('Uangmu tidak cukup.');
      l.tawar = a.n;
      l.oleh = p.id;
      l.deadline = Math.max(l.deadline, now + LELANG_TAMBAH_MS);
      g.deadline = l.deadline;
      cekLelang(g, now);
      break;
    }
    case 'lewatLelang': {
      main();
      const l = g.lelang ?? fail('Tidak ada lelang.');
      if (l.oleh === p.id) fail('Kamu penawar tertinggi.');
      if (!l.keluar.includes(p.id)) l.keluar.push(p.id);
      cekLelang(g, now);
      break;
    }
    case 'bangun':
      kelola();
      bangun(g, p, a.kotak);
      break;
    case 'jualRumah':
      kelola();
      jualRumah(g, p, a.kotak);
      if (g.fase === 'utang' && g.utang[0]?.dari === p.id) lanjut(g, now);
      break;
    case 'gadai':
      kelola();
      gadai(g, p, a.kotak);
      if (g.fase === 'utang' && g.utang[0]?.dari === p.id) lanjut(g, now);
      break;
    case 'tebus':
      kelola();
      tebus(g, p, a.kotak);
      break;
    case 'bayarUtang':
      main();
      if (g.fase !== 'utang' || g.utang[0]?.dari !== p.id) fail('Tidak ada tagihan untukmu.');
      if (p.uang < g.utang[0]!.jumlah) fail('Uangmu masih kurang. Gadai atau jual bangunan dulu.');
      lanjut(g, now);
      break;
    case 'bangkrut':
      main();
      if (g.fase !== 'utang' || g.utang[0]?.dari !== p.id) fail('Kamu hanya bisa menyatakan bangkrut saat tidak sanggup membayar.');
      if (p.uang >= g.utang[0]!.jumlah) fail('Uangmu cukup untuk membayar.');
      bangkrut(g, p, now);
      break;
    case 'akhiri':
      giliran('selesai', 'lempar');
      if (g.fase === 'lempar') fail(g.dadu ? 'Dadumu kembar: lempar lagi.' : 'Lempar dadu dulu.');
      akhiriGiliran(g, now);
      break;
    case 'ajukan': {
      kelola();
      const ke = byId(g, a.ke);
      if (!ke || ke === p || ke.bangkrut) throw new GameError('Pilih pemain lain.');
      const beri = { uang: a.beri?.uang ?? 0, kotak: [...new Set(a.beri?.kotak ?? [])], bebas: a.beri?.bebas ?? 0 };
      const minta = { uang: a.minta?.uang ?? 0, kotak: [...new Set(a.minta?.kotak ?? [])], bebas: a.minta?.bebas ?? 0 };
      if (!beri.uang && !beri.kotak.length && !beri.bebas && !minta.uang && !minta.kotak.length && !minta.bebas) fail('Tawaran kosong.');
      cekPaket(g, p, beri);
      cekPaket(g, ke, minta);
      g.tawaran = g.tawaran.filter((t) => !(t.dari === p.id && t.ke === ke.id));
      g.tawaran.push({ id: ++g.nTawar, dari: p.id, ke: ke.id, beri, minta, waktu: now });
      break;
    }
    case 'terimaTawaran':
      kelola();
      terimaTawaran(g, p, a.id);
      break;
    case 'tolakTawaran': {
      main();
      const t = g.tawaran.find((x) => x.id === a.id) ?? fail('Tawaran sudah tidak berlaku.');
      if (t.ke !== p.id && t.dari !== p.id) fail('Bukan tawaranmu.');
      g.tawaran = g.tawaran.filter((x) => x.id !== a.id);
      break;
    }
    case 'lagi':
      if (!host || g.phase !== 'akhir') fail('Hanya tuan rumah.');
      g.phase = 'lobby';
      g.pemenang = null;
      g.log = [];
      g.deadline = null;
      g.milik = milikKosong();
      for (const x of g.players) Object.assign(x, { uang: 0, pos: 0, penjara: -1, bebas: [], bangkrut: false, ganda: 0 });
      break;
    default:
      fail('Aksi tidak dikenal.');
  }
  g.rev++;
}

// ── Waktu & bot ─────────────────────────────────────────────────────────────

export function tick(g: Game, now: number): boolean {
  if (g.phase !== 'main') return false;
  let ubah = false;
  if (g.lelang) {
    if (cekLelang(g, now)) return (g.rev++, true);
    if (g.botAt !== null && now >= g.botAt) {
      ubah = botLelang(g, now);
      g.botAt = now + 900 + Math.floor(rand(g) * 1200);
      if (ubah) g.rev++;
    }
    return ubah;
  }
  // Bot menjawab tawaran yang ditujukan kepadanya setelah "berpikir" sebentar.
  for (const t of [...g.tawaran]) {
    const b = byId(g, t.ke);
    if (!b?.bot || now < t.waktu + 1800) continue;
    ubah = true;
    if (nilaiTawaran(g, b, t) > 0) {
      try {
        terimaTawaran(g, b, t.id);
        continue;
      } catch {
        /* tidak sah lagi: ditolak */
      }
    }
    g.tawaran = g.tawaran.filter((x) => x.id !== t.id);
    push(g, { t: 'tukar', by: t.dari, ke: b.id, teks: 'ditolak' });
  }
  const pelaku = g.fase === 'utang' ? byId(g, g.utang[0]?.dari)! : cur(g);
  if (pelaku.bot && g.botAt === null) g.botAt = now + 1000;
  const botDue = pelaku.bot && g.botAt !== null && now >= g.botAt;
  const late = !pelaku.bot && g.deadline !== null && now >= g.deadline;
  if (botDue || late) {
    botBertindak(g, pelaku, now);
    ubah = true;
  }
  if (ubah) g.rev++;
  return ubah;
}

/** Nilai sebuah petak bagi pemain: lebih tinggi bila melengkapi grup atau mencegah lawan melengkapinya. */
function nilai(g: Game, p: Player, i: number) {
  const pt = PETAK[i] as Milikan;
  let v = pt.harga;
  if (pt.jenis === 'kota') {
    const anggota = anggotaGrup(pt.grup).filter((x) => x !== i);
    const punya = anggota.filter((x) => g.milik[x]!.owner === p.id).length;
    if (punya === anggota.length) v *= 1.9;
    else if (punya > 0) v *= 1.35;
    const lawan = anggota.map((x) => g.milik[x]!.owner).filter((o) => o && o !== p.id);
    if (lawan.length === anggota.length && new Set(lawan).size === 1) v *= 1.5;
  } else if (pt.jenis === 'transport') v *= 1 + 0.25 * TRANSPORT.filter((x) => g.milik[x]!.owner === p.id).length;
  return v;
}

function nilaiPaket(g: Game, p: Player, k: Paket) {
  return k.uang + k.kotak.reduce((a, i) => a + nilai(g, p, i) * (g.milik[i]!.gadai ? 0.55 : 1), 0) + k.bebas * 30;
}

/** Positif = bot untung menerima. Bot berhati-hati: butuh untung jelas. */
function nilaiTawaran(g: Game, b: Player, t: Tawaran) {
  const dapat = nilaiPaket(g, b, t.beri);
  // Yang diberikan dinilai dari sudut pandang lawan juga, supaya bot tidak memberi grup lengkap.
  const dari = byId(g, t.dari)!;
  const beri = Math.max(nilaiPaket(g, b, t.minta), nilaiPaket(g, dari, t.minta) * 0.9);
  return dapat - beri * 1.15 - 10;
}

const cadangan = (g: Game) => (g.milik.some((m) => m.rumah > 0) ? 250 : 120);

function botLelang(g: Game, now: number): boolean {
  const l = g.lelang!;
  const calon = shuffle(
    g,
    aktif(g).filter((p) => p.bot && !l.keluar.includes(p.id) && l.oleh !== p.id),
  );
  for (const b of calon) {
    const maks = Math.min(b.uang - cadangan(g) / 2, nilai(g, b, l.kotak) * (0.75 + rand(g) * 0.3));
    const naik = l.tawar < 50 ? 10 : 20;
    if (l.tawar + naik <= maks) {
      act(g, b.id, { t: 'tawar', n: l.tawar + naik }, now);
      g.rev--;
      return true;
    }
    l.keluar.push(b.id);
    cekLelang(g, now);
    return true;
  }
  return false;
}

/** Bot mengumpulkan uang: jual bangunan dari grup termahal, lalu gadai yang paling murah dan bukan grup lengkap. */
function botKumpulkan(g: Game, b: Player, perlu: number) {
  let guard = 0;
  while (b.uang < perlu && guard++ < 80) {
    const bangunan = g.milik
      .map((m, i) => ({ m, i }))
      .filter(({ m }) => m.owner === b.id && m.rumah > 0)
      .sort((x, y) => (PETAK[y.i] as Milikan).harga - (PETAK[x.i] as Milikan).harga || y.m.rumah - x.m.rumah);
    let ok = false;
    for (const { i } of bangunan) {
      try {
        jualRumah(g, b, i);
        ok = true;
        break;
      } catch {
        /* coba yang lain */
      }
    }
    if (ok) continue;
    const gadaian = g.milik
      .map((m, i) => ({ m, i }))
      .filter(({ m }) => m.owner === b.id && !m.gadai)
      .sort((x, y) => nilai(g, b, x.i) - nilai(g, b, y.i));
    for (const { i } of gadaian) {
      try {
        gadai(g, b, i);
        ok = true;
        break;
      } catch {
        /* coba yang lain */
      }
    }
    if (!ok) break;
  }
}

/**
 * Bot mengajukan tawaran untuk melengkapi grup: tukar silang bila lawan juga
 * kekurangan satu kota yang dipegang bot, atau beli dengan uang.
 */
function botTawar(g: Game, b: Player, now: number) {
  if (g.tawaran.some((t) => t.dari === b.id) || rand(g) > 0.45) return;
  for (const grup of shuffle(g, GRUP)) {
    const ang = anggotaGrup(grup);
    const kurang = ang.filter((i) => g.milik[i]!.owner !== b.id);
    if (!kurang.length || kurang.length === ang.length) continue;
    const pemilik = new Set(kurang.map((i) => g.milik[i]!.owner));
    if (pemilik.size !== 1 || pemilik.has(null)) continue;
    const x = byId(g, [...pemilik][0])!;
    if (x.bangkrut || ang.some((i) => g.milik[i]!.rumah > 0)) continue;
    // Kota milik bot yang dibutuhkan x untuk melengkapi grupnya sendiri.
    const silang = g.milik
      .map((m, i) => i)
      .filter((i) => {
        const pt = PETAK[i]!;
        if (pt.jenis !== 'kota' || g.milik[i]!.owner !== b.id || pt.grup === grup) return false;
        const a2 = anggotaGrup(pt.grup);
        return a2.every((j) => j === i || g.milik[j]!.owner === x.id) && a2.every((j) => g.milik[j]!.rumah === 0);
      });
    const beri: Paket = { uang: 0, kotak: silang.slice(0, 1), bebas: 0 };
    if (!silang.length) {
      const harga = Math.ceil(kurang.reduce((a, i) => a + nilai(g, x, i), 0) * (1.25 + rand(g) * 0.4));
      if (b.uang - harga < cadangan(g)) continue;
      beri.uang = Math.round(harga / 10) * 10;
    }
    try {
      act(g, b.id, { t: 'ajukan', ke: x.id, beri, minta: { uang: 0, kotak: kurang, bebas: 0 } }, now);
      g.rev--;
    } catch {
      /* tidak sah: lewati */
    }
    return;
  }
}

/** Bot membangun dan menebus kalau uangnya longgar. */
function botKelola(g: Game, b: Player) {
  let guard = 0;
  while (guard++ < 30) {
    const sisa = b.uang - cadangan(g) - 150;
    const tebusan = g.milik.map((m, i) => ({ m, i })).find(({ m, i }) => m.owner === b.id && m.gadai && nilaiTebus((PETAK[i] as Milikan).harga) < sisa);
    if (tebusan) {
      tebus(g, b, tebusan.i);
      continue;
    }
    const calon = g.milik
      .map((_, i) => i)
      .filter((i) => !bisaBangun(g, b.id, i) && (PETAK[i] as Extract<Milikan, { jenis: 'kota' }>).bangun < b.uang - cadangan(g))
      .sort((x, y) => g.milik[x]!.rumah - g.milik[y]!.rumah || (PETAK[y] as Milikan).harga - (PETAK[x] as Milikan).harga);
    if (!calon.length) break;
    bangun(g, b, calon[0]!);
  }
}

function botBertindak(g: Game, b: Player, now: number) {
  switch (g.fase) {
    case 'utang': {
      const u = g.utang[0]!;
      botKumpulkan(g, b, u.jumlah);
      if (b.uang >= u.jumlah) lanjut(g, now);
      else if (b.bot) bangkrut(g, b, now);
      else {
        // Waktu pemain habis dan tetap tidak sanggup: dinyatakan bangkrut.
        bangkrut(g, b, now);
      }
      return;
    }
    case 'lempar':
      if (b.bot) (botKelola(g, b), botTawar(g, b, now));
      if (b.penjara >= 0) {
        const awal = g.milik.filter((m, i) => isMilikan(PETAK[i]!) && !m.owner).length > 10;
        if (b.bebas.length && awal) return act(g, b.id, { t: 'kartuBebas' }, now), void g.rev--;
        if (awal && b.uang >= DENDA_PENJARA + 150) return act(g, b.id, { t: 'tebusPenjara' }, now), void g.rev--;
      }
      return lempar(g, b, now);
    case 'beli': {
      const pt = PETAK[g.beli!] as Milikan;
      const v = nilai(g, b, g.beli!);
      if (b.uang >= pt.harga && (b.uang - pt.harga >= cadangan(g) || v > pt.harga * 1.3)) return act(g, b.id, { t: 'beli' }, now), void g.rev--;
      return act(g, b.id, { t: 'tolak' }, now), void g.rev--;
    }
    case 'selesai':
      if (b.bot) botKelola(g, b);
      return akhiriGiliran(g, now);
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
  preset: 'resmi' | 'rumahan' | 'racikan';
  giliran: string | null;
  fase: Fase;
  dadu: [number, number] | null;
  beli: number | null;
  lelang: Lelang | null;
  utang: Utang | null;
  milik: Milik[];
  rumahBank: number;
  hotelBank: number;
  pot: number;
  mulaiAt: number;
  players: { id: string; name: string; avatar: string; bot: boolean; uang: number; pos: number; penjara: number; bebas: number; bangkrut: boolean; kekayaan: number }[];
  tawaran: Tawaran[];
  kartu: { id: number; by: string; n: number } | null;
  log: Ev[];
  pemenang: string | null;
  me: { id: string } | null;
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
    giliran: g.phase === 'main' ? cur(g).id : null,
    fase: g.fase,
    dadu: g.dadu,
    beli: g.beli,
    lelang: g.lelang,
    utang: g.fase === 'utang' ? (g.utang[0] ?? null) : null,
    milik: g.milik,
    rumahBank: g.rumahBank,
    hotelBank: g.hotelBank,
    pot: g.pot,
    mulaiAt: g.mulaiAt,
    // Di Monopoli, uang & properti semua orang terbuka.
    players: g.players.map((p) => ({ id: p.id, name: p.name, avatar: p.avatar, bot: p.bot, uang: p.uang, pos: p.pos, penjara: p.penjara, bebas: p.bebas.length, bangkrut: p.bangkrut, kekayaan: kekayaan(g, p) })),
    tawaran: g.tawaran.filter((t) => !me || t.dari === me.id || t.ke === me.id),
    kartu: g.kartu,
    log: g.log.slice(-50),
    pemenang: g.pemenang,
    me: me ? { id: me.id } : null,
  };
}
