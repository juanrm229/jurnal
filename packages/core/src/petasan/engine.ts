/**
 * KUCING PETASAN: permainan kartu "jangan sampai meledak" untuk 2–10 orang,
 * aturan lengkap Exploding Kittens: 56 kartu (dua dek untuk 6–10 orang),
 * Serbu (giliran bertumpuk), Kabur, Minta Dong, Kocok, Terawang, Ogah!
 * (bisa dibalas Ogah! lagi, oleh siapa saja, kapan saja), Siram Air untuk
 * menjinakkan dan menyisipkan kembali petasan di mana saja, serta kombo
 * dua kembar (curi acak), tiga kembar (sebut kartu), dan lima beda (ambil
 * dari buangan).
 *
 * Murni (tanpa I/O): server, tes, dan bot memakai aturan yang persis sama.
 */

// ── Kartu ───────────────────────────────────────────────────────────────────

export type Jenis = 'petasan' | 'siram' | 'serbu' | 'kabur' | 'minta' | 'kocok' | 'terawang' | 'ogah' | 'oren' | 'garong' | 'belang' | 'kampung' | 'anggora';
export interface Card {
  id: number;
  j: Jenis;
}
export interface InfoKartu {
  nama: string;
  jumlah: number;
  doodle: string;
  warna: string;
  efek: string;
  kucing?: boolean;
}

export const KARTU: Record<Jenis, InfoKartu> = {
  petasan: { nama: 'Kucing Petasan', jumlah: 4, doodle: 'kembang-api', warna: '#16161a', efek: 'Kalau mengambil kartu ini, kamu meledak dan keluar, kecuali kamu punya Siram Air.' },
  siram: { nama: 'Siram Air', jumlah: 6, doodle: 'penyiram', warna: '#33a862', efek: 'Jinakkan Kucing Petasan, lalu selipkan kembali petasannya ke tumpukan di posisi mana pun, diam-diam.' },
  serbu: { nama: 'Serbu!', jumlah: 4, doodle: 'petir', warna: '#f08a24', efek: 'Akhiri giliranmu tanpa mengambil kartu. Pemain berikutnya mendapat 2 giliran. Kalau kamu sendiri sedang diserbu, serbuannya bertumpuk: sisa giliranmu + 2.' },
  kabur: { nama: 'Kabur', jumlah: 4, doodle: 'sandal-jepit', warna: '#2f6fd6', efek: 'Akhiri satu giliran tanpa mengambil kartu.' },
  minta: { nama: 'Minta Dong', jumlah: 4, doodle: 'kado', warna: '#3a3a44', efek: 'Pilih satu pemain. Dia harus memberimu satu kartu pilihannya sendiri.' },
  kocok: { nama: 'Kocok', jumlah: 4, doodle: 'gelombang', warna: '#8a5a3b', efek: 'Kocok tumpukan kartu. Berguna kalau kamu tahu petasan ada di atas.' },
  terawang: { nama: 'Terawang', jumlah: 5, doodle: 'bintang-mata', warna: '#d7489b', efek: 'Lihat diam-diam tiga kartu teratas tumpukan.' },
  ogah: { nama: 'Ogah!', jumlah: 5, doodle: 'lingkaran-coret', warna: '#e23b3b', efek: 'Batalkan aksi apa pun selain Kucing Petasan dan Siram Air, kapan saja, bahkan saat bukan giliranmu. Ogah! juga bisa membatalkan Ogah!.' },
  oren: { nama: 'Kucing Oren', jumlah: 4, doodle: 'matahari-kecil', warna: '#f4a72a', efek: 'Kucing biasa. Mainkan dua kembar untuk mencuri, tiga kembar untuk meminta kartu tertentu.', kucing: true },
  garong: { nama: 'Kucing Garong', jumlah: 4, doodle: 'tanda-seru', warna: '#6b7280', efek: 'Kucing biasa. Mainkan dua kembar untuk mencuri, tiga kembar untuk meminta kartu tertentu.', kucing: true },
  belang: { nama: 'Kucing Belang Tiga', jumlah: 4, doodle: 'pelangi-kecil', warna: '#b45309', efek: 'Kucing biasa. Mainkan dua kembar untuk mencuri, tiga kembar untuk meminta kartu tertentu.', kucing: true },
  kampung: { nama: 'Kucing Kampung', jumlah: 4, doodle: 'rumah', warna: '#4d7c0f', efek: 'Kucing biasa. Mainkan dua kembar untuk mencuri, tiga kembar untuk meminta kartu tertentu.', kucing: true },
  anggora: { nama: 'Kucing Anggora', jumlah: 4, doodle: 'awan', warna: '#7c6fd6', efek: 'Kucing biasa. Mainkan dua kembar untuk mencuri, tiga kembar untuk meminta kartu tertentu.', kucing: true },
};
export const JENIS = Object.keys(KARTU) as Jenis[];
export const MAX_PLAYERS = 10;
export const KARTU_AWAL = 4;
export const AMBIL_MS = 25_000;

// ── Tipe ────────────────────────────────────────────────────────────────────

export interface Opts {
  /** Serbuan bertumpuk (aturan terbaru). Mati = korban yang menyerbu hanya memberi 2 giliran. */
  tumpuk: boolean;
  /** Detik jendela Ogah! setelah setiap aksi. */
  ogahDetik: number;
  waktu: number;
}

export interface Player {
  id: string;
  name: string;
  avatar: string;
  guest: boolean;
  bot: boolean;
  hand: Card[];
  out: boolean;
  /** Urutan meledak (1 = pertama). */
  ledak: number;
}

export type Phase = 'lobby' | 'main' | 'akhir';
export type Fase = 'main' | 'ogah' | 'minta' | 'jinak';

export type Kombo = 'satu' | 'dua' | 'tiga' | 'lima';
export interface Aksi {
  by: string;
  kartu: Card[];
  kombo: Kombo;
  /** Jenis aksi (untuk satu kartu) atau jenis kombo. */
  j: Jenis;
  target?: string;
  /** Untuk tiga kembar: kartu yang diminta. */
  sebut?: Jenis;
  /** Untuk lima beda: kartu buangan yang diambil. */
  ambil?: number;
  /** Jumlah Ogah! yang dimainkan (ganjil = batal). */
  ogah: string[];
  deadline: number;
}

export interface Ev {
  n: number;
  t: 'mulai' | 'main' | 'ogah' | 'batal' | 'ambil' | 'curi' | 'beri' | 'kocok' | 'terawang' | 'petasan' | 'jinak' | 'ledak' | 'menang' | 'serbu' | 'kabur' | 'kosong' | 'sebut' | 'pungut';
  by?: string;
  ke?: string;
  kartu?: Jenis[];
  jumlah?: number;
  berhasil?: boolean;
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
  deck: Card[];
  buang: Card[];
  giliran: number;
  /** Giliran yang masih harus dijalani pemain sekarang (bertambah karena Serbu!). */
  sisa: number;
  fase: Fase;
  aksi: Aksi | null;
  /** Minta Dong: siapa memberi ke siapa. */
  minta: { dari: string; ke: string } | null;
  /** Pemain yang sedang menjinakkan petasan, dan petasan yang dipegangnya. */
  jinak: string | null;
  pegang: Card | null;
  /** Hasil Terawang (hanya untuk pemiliknya). */
  intip: { pid: string; kartu: Jenis[]; n: number } | null;
  /** Kartu yang baru diterima seseorang (untuk ditampilkan ke penerima saja). */
  dapat: { pid: string; j: Jenis; dari: string; n: number } | null;
  nLedak: number;
  log: Ev[];
  n: number;
  pemenang: string | null;
  botAt: number | null;
  /** Pengetahuan bot: kapan dia tahu petasan di posisi atas. */
  tahu: Record<string, number[]>;
}

export type Action =
  | { t: 'mulai' }
  | { t: 'bot'; tambah: boolean }
  | { t: 'opsi'; opts: Partial<Opts> }
  | { t: 'main'; kartu: number[]; target?: string; sebut?: Jenis; ambil?: number }
  | { t: 'ogah'; kartu: number }
  | { t: 'ambil' }
  | { t: 'beri'; kartu: number }
  | { t: 'sisip'; posisi: number }
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
function shuffle<T>(g: Game, xs: T[]): T[] {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand(g) * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

/** Dek penuh: satu set untuk 2–5 orang, dua set untuk 6–10 orang. */
export function fullDeck(set = 1): Card[] {
  const d: Card[] = [];
  for (let s = 0; s < set; s++) for (const j of JENIS) for (let i = 0; i < KARTU[j].jumlah; i++) d.push({ id: d.length, j });
  return d;
}

// ── Ruang ───────────────────────────────────────────────────────────────────

type NewPlayer = { id: string; name: string; avatar: string; guest: boolean };
const fresh = (p: NewPlayer, bot = false): Player => ({ ...p, bot, hand: [], out: false, ledak: 0 });

export function newGame(code: string, host: NewPlayer, _now: number, seed: number): Game {
  return {
    code,
    host: host.id,
    rev: 1,
    deadline: null,
    phase: 'lobby',
    opts: { tumpuk: true, ogahDetik: 4, waktu: 0 },
    rng: seed >>> 0,
    players: [fresh(host)],
    deck: [],
    buang: [],
    giliran: 0,
    sisa: 1,
    fase: 'main',
    aksi: null,
    minta: null,
    jinak: null,
    pegang: null,
    intip: null,
    dapat: null,
    nLedak: 0,
    log: [],
    n: 0,
    pemenang: null,
    botAt: null,
    tahu: {},
  };
}

export const BOTS: [string, string][] = [
  ['Mpus', 'kucing'],
  ['Si Oyen', 'kucing'],
  ['Bang Garong', 'kucing'],
  ['Mbok Belang', 'kucing'],
  ['Pak Kumis', 'kucing'],
  ['Neng Meong', 'kucing'],
  ['Mas Kutu', 'kucing'],
  ['Tante Bulu', 'kucing'],
  ['Om Cakar', 'kucing'],
];

export function join(g: Game, p: NewPlayer) {
  const me = g.players.find((x) => x.id === p.id);
  if (me) {
    me.name = p.name;
    me.avatar = p.avatar;
    me.bot = false;
  } else {
    if (g.phase !== 'lobby') fail('Permainan sudah berjalan. Tonton lewat mode TV, atau tunggu permainan berikutnya.');
    if (g.players.length >= MAX_PLAYERS) fail('Meja penuh (10 orang).');
    g.players.push(fresh(p));
  }
  g.rev++;
}

export function leave(g: Game, pid: string) {
  const p = g.players.find((x) => x.id === pid);
  if (!p) return;
  if (g.phase === 'lobby') g.players = g.players.filter((x) => x.id !== pid);
  else p.bot = true;
  const human = g.players.find((x) => !x.bot && !x.out);
  if (g.host === pid && human) g.host = human.id;
  g.rev++;
}

// ── Pembantu ────────────────────────────────────────────────────────────────

const byId = (g: Game, id: string | null | undefined) => g.players.find((p) => p.id === id);
const cur = (g: Game) => g.players[g.giliran]!;
const hidup = (g: Game) => g.players.filter((p) => !p.out);
const push = (g: Game, e: Omit<Ev, 'n'>) => g.log.push({ n: ++g.n, ...e });
const lupakanAtas = (g: Game) => {
  g.tahu = {};
};

/** Bentuk kombo dari kartu yang dimainkan bersamaan, atau null bila tidak sah. */
export function komboOf(cs: Pick<Card, 'j'>[]): Kombo | null {
  if (cs.some((c) => c.j === 'petasan' || c.j === 'siram')) return cs.length === 1 && cs[0]!.j === 'siram' ? null : cs.length === 5 && new Set(cs.map((c) => c.j)).size === 5 ? 'lima' : null;
  if (cs.length === 1) return KARTU[cs[0]!.j].kucing || cs[0]!.j === 'ogah' ? null : 'satu';
  const sama = cs.every((c) => c.j === cs[0]!.j);
  if (cs.length === 2 && sama) return 'dua';
  if (cs.length === 3 && sama) return 'tiga';
  if (cs.length === 5 && new Set(cs.map((c) => c.j)).size === 5) return 'lima';
  return null;
}

function mulaiGiliran(g: Game, now: number) {
  g.fase = 'main';
  const p = cur(g);
  g.deadline = !p.bot && g.opts.waktu ? now + g.opts.waktu * 1000 : null;
  g.botAt = p.bot ? now + 1200 + Math.floor(rand(g) * 900) : null;
}

/** Selesai satu giliran (setelah mengambil kartu atau Kabur). */
function giliranSelesai(g: Game, now: number) {
  g.sisa--;
  if (g.sisa > 0) return mulaiGiliran(g, now);
  keBerikut(g, now, 1);
}

function keBerikut(g: Game, now: number, sisa: number) {
  const n = g.players.length;
  do g.giliran = (g.giliran + 1) % n;
  while (g.players[g.giliran]!.out);
  g.sisa = sisa;
  mulaiGiliran(g, now);
}

function berikutnya(g: Game): Player {
  const n = g.players.length;
  let i = g.giliran;
  do i = (i + 1) % n;
  while (g.players[i]!.out);
  return g.players[i]!;
}

// ── Mulai ───────────────────────────────────────────────────────────────────

function mulai(g: Game, now: number) {
  const n = g.players.length;
  const set = n > 5 ? 2 : 1;
  const semua = fullDeck(set);
  const petasan = semua.filter((c) => c.j === 'petasan');
  // Edisi pesta: kalau petasan kurang (9–10 orang), tambah sampai pemain − 1.
  while (petasan.length < n - 1) petasan.push({ id: semua.length + petasan.length, j: 'petasan' });
  const siram = semua.filter((c) => c.j === 'siram');
  let deck = shuffle(
    g,
    semua.filter((c) => c.j !== 'petasan' && c.j !== 'siram'),
  );
  g.players = shuffle(g, g.players);
  for (const p of g.players) {
    p.hand = [siram.pop()!, ...deck.splice(0, KARTU_AWAL)];
    p.out = false;
    p.ledak = 0;
  }
  // Petasan sebanyak pemain dikurangi satu; Siram Air sisa: berdua hanya 2.
  const sisaSiram = n === 2 ? siram.slice(0, 2) : siram;
  deck = shuffle(g, [...deck, ...petasan.slice(0, n - 1), ...sisaSiram]);
  g.deck = deck;
  g.buang = [];
  g.giliran = 0;
  g.sisa = 1;
  g.aksi = null;
  g.minta = null;
  g.jinak = null;
  g.intip = null;
  g.dapat = null;
  g.nLedak = 0;
  g.tahu = {};
  g.log = [];
  g.n = 0;
  g.pemenang = null;
  g.phase = 'main';
  push(g, { t: 'mulai', by: cur(g).id, jumlah: n - 1 });
  mulaiGiliran(g, now);
}

// ── Main kartu & Ogah! ──────────────────────────────────────────────────────

function mainkan(g: Game, p: Player, ids: number[], target: string | undefined, sebut: Jenis | undefined, ambil: number | undefined, now: number) {
  if (new Set(ids).size !== ids.length || !ids.length) fail('Pilih kartu.');
  const cs = ids.map((id) => p.hand.find((c) => c.id === id) ?? fail('Kartu itu tidak ada di tanganmu.'));
  const kombo = komboOf(cs) ?? fail(cs.length === 1 ? (KARTU[cs[0]!.j].kucing ? 'Kartu kucing dimainkan berpasangan (dua atau tiga kembar).' : `${KARTU[cs[0]!.j].nama} tidak dimainkan begitu saja.`) : 'Kombo tidak sah: dua kembar, tiga kembar, atau lima kartu berbeda.');
  const j = cs[0]!.j;
  const butuhTarget = kombo === 'dua' || kombo === 'tiga' || (kombo === 'satu' && j === 'minta');
  let t: Player | undefined;
  if (butuhTarget) {
    t = byId(g, target);
    if (!t || t === p || t.out) throw new GameError('Pilih pemain lain yang masih bermain.');
    if (!t.hand.length) fail(`${t.name} tidak punya kartu.`);
  }
  if (kombo === 'tiga' && (!sebut || !JENIS.includes(sebut))) fail('Sebut kartu yang kamu minta.');
  if (kombo === 'lima') {
    if (!g.buang.length) fail('Tumpukan buangan masih kosong.');
    if (ambil === undefined || !g.buang.some((c) => c.id === ambil)) fail('Pilih kartu dari buangan.');
  }
  p.hand = p.hand.filter((c) => !ids.includes(c.id));
  g.buang.push(...cs);
  g.aksi = { by: p.id, kartu: cs, kombo, j, target: t?.id, sebut, ambil, ogah: [], deadline: now + g.opts.ogahDetik * 1000 };
  g.fase = 'ogah';
  g.deadline = g.aksi.deadline;
  g.botAt = now + 800 + Math.floor(rand(g) * 900);
  push(g, { t: 'main', by: p.id, ke: t?.id, kartu: cs.map((c) => c.j), jumlah: kombo === 'satu' ? 1 : cs.length });
}

function ogah(g: Game, p: Player, id: number, now: number) {
  const a = g.aksi ?? fail('Tidak ada aksi yang bisa di-Ogah!.');
  if (p.out) fail('Kamu sudah meledak.');
  const c = p.hand.find((x) => x.id === id && x.j === 'ogah') ?? fail('Kamu tidak punya Ogah!.');
  p.hand = p.hand.filter((x) => x !== c);
  g.buang.push(c);
  a.ogah.push(p.id);
  a.deadline = Math.max(a.deadline, now + g.opts.ogahDetik * 1000);
  g.deadline = a.deadline;
  push(g, { t: 'ogah', by: p.id, jumlah: a.ogah.length });
}

/** Jendela Ogah! habis: jalankan aksi bila tidak dibatalkan. */
function selesaikanAksi(g: Game, now: number) {
  const a = g.aksi!;
  g.aksi = null;
  g.fase = 'main';
  const p = byId(g, a.by)!;
  if (a.ogah.length % 2 === 1) {
    push(g, { t: 'batal', by: p.id, kartu: [a.j] });
    return lanjutGiliran(g, now);
  }
  const t = byId(g, a.target);
  switch (a.kombo) {
    case 'dua': {
      if (!t || t.out || !t.hand.length) {
        push(g, { t: 'kosong', by: p.id, ke: t?.id });
        break;
      }
      const c = t.hand.splice(Math.floor(rand(g) * t.hand.length), 1)[0]!;
      p.hand.push(c);
      g.dapat = { pid: p.id, j: c.j, dari: t.id, n: g.n + 1 };
      push(g, { t: 'curi', by: p.id, ke: t.id });
      break;
    }
    case 'tiga': {
      const i = t ? t.hand.findIndex((c) => c.j === a.sebut) : -1;
      push(g, { t: 'sebut', by: p.id, ke: t?.id, kartu: [a.sebut!], berhasil: i >= 0 });
      if (t && i >= 0) {
        const c = t.hand.splice(i, 1)[0]!;
        p.hand.push(c);
        g.dapat = { pid: p.id, j: c.j, dari: t.id, n: g.n };
      }
      break;
    }
    case 'lima': {
      const i = g.buang.findIndex((c) => c.id === a.ambil);
      if (i >= 0) {
        const c = g.buang.splice(i, 1)[0]!;
        p.hand.push(c);
        push(g, { t: 'pungut', by: p.id, kartu: [c.j] });
      }
      break;
    }
    case 'satu':
      switch (a.j) {
        case 'serbu': {
          const sisa = g.opts.tumpuk && g.sisa > 1 ? g.sisa + 2 : 2;
          push(g, { t: 'serbu', by: p.id, ke: berikutnya(g).id, jumlah: sisa });
          return keBerikut(g, now, sisa);
        }
        case 'kabur':
          push(g, { t: 'kabur', by: p.id });
          return giliranSelesai(g, now);
        case 'kocok':
          g.deck = shuffle(g, g.deck);
          lupakanAtas(g);
          push(g, { t: 'kocok', by: p.id });
          break;
        case 'terawang': {
          const atas = g.deck.slice(0, 3).map((c) => c.j);
          g.intip = { pid: p.id, kartu: atas, n: g.n + 1 };
          g.tahu[p.id] = atas.map((j, i) => (j === 'petasan' ? i : -1)).filter((i) => i >= 0);
          push(g, { t: 'terawang', by: p.id });
          break;
        }
        case 'minta':
          if (t && !t.out && t.hand.length) {
            g.minta = { dari: t.id, ke: p.id };
            g.fase = 'minta';
            g.deadline = now + 20_000;
            g.botAt = t.bot ? now + 1200 : null;
            return;
          }
          push(g, { t: 'kosong', by: p.id, ke: t?.id });
          break;
      }
  }
  lanjutGiliran(g, now);
}

function lanjutGiliran(g: Game, now: number) {
  g.fase = 'main';
  const p = cur(g);
  g.deadline = !p.bot && g.opts.waktu ? now + g.opts.waktu * 1000 : null;
  g.botAt = p.bot ? now + 1000 + Math.floor(rand(g) * 800) : null;
}

function beri(g: Game, p: Player, id: number, now: number) {
  const m = g.minta ?? fail('Tidak ada yang meminta kartumu.');
  if (m.dari !== p.id) fail('Bukan kamu yang diminta.');
  const c = p.hand.find((x) => x.id === id) ?? fail('Kartu itu tidak ada di tanganmu.');
  p.hand = p.hand.filter((x) => x !== c);
  const ke = byId(g, m.ke)!;
  ke.hand.push(c);
  g.minta = null;
  g.dapat = { pid: ke.id, j: c.j, dari: p.id, n: g.n + 1 };
  push(g, { t: 'beri', by: p.id, ke: ke.id });
  lanjutGiliran(g, now);
}

// ── Ambil kartu & petasan ───────────────────────────────────────────────────

function ambil(g: Game, p: Player, now: number) {
  const c = g.deck.shift() ?? fail('Tumpukan habis.');
  for (const k of Object.keys(g.tahu)) g.tahu[k] = g.tahu[k]!.map((i) => i - 1).filter((i) => i >= 0);
  g.intip = null;
  if (c.j !== 'petasan') {
    p.hand.push(c);
    push(g, { t: 'ambil', by: p.id });
    g.dapat = { pid: p.id, j: c.j, dari: '', n: g.n };
    return giliranSelesai(g, now);
  }
  push(g, { t: 'petasan', by: p.id });
  const s = p.hand.find((x) => x.j === 'siram');
  if (!s) {
    // Meledak: semua kartunya dibuang, petasan keluar dari permainan.
    p.out = true;
    p.ledak = ++g.nLedak;
    g.buang.push(...p.hand);
    p.hand = [];
    push(g, { t: 'ledak', by: p.id });
    if (hidup(g).length === 1) {
      g.pemenang = hidup(g)[0]!.id;
      g.phase = 'akhir';
      g.deadline = null;
      g.botAt = null;
      push(g, { t: 'menang', by: g.pemenang });
      return;
    }
    return keBerikut(g, now, 1);
  }
  p.hand = p.hand.filter((x) => x !== s);
  g.buang.push(s);
  g.jinak = p.id;
  g.fase = 'jinak';
  g.deadline = now + AMBIL_MS;
  g.botAt = p.bot ? now + 1500 : null;
  g.pegang = c;
  push(g, { t: 'jinak', by: p.id });
}

function sisip(g: Game, p: Player, posisi: number, now: number) {
  if (g.jinak !== p.id) fail('Kamu tidak sedang menjinakkan petasan.');
  if (!Number.isInteger(posisi) || posisi < 0 || posisi > g.deck.length) fail('Posisi tidak sah.');
  g.deck.splice(posisi, 0, g.pegang!);
  g.pegang = null;
  // Hanya penyisip yang tahu letaknya.
  for (const k of Object.keys(g.tahu)) g.tahu[k] = g.tahu[k]!.map((i) => (i >= posisi ? i + 1 : i));
  g.tahu[p.id] = [...(g.tahu[p.id] ?? []), posisi];
  g.jinak = null;
  giliranSelesai(g, now);
}

// ── Aksi ────────────────────────────────────────────────────────────────────

export function act(g: Game, pid: string, a: Action, now: number) {
  const p = byId(g, pid) ?? fail('Kamu belum duduk di meja ini.');
  const host = pid === g.host;
  const lobby = () => (!host || g.phase !== 'lobby') && fail('Hanya tuan rumah, sebelum mulai.');
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
    case 'opsi': {
      lobby();
      const o = a.opts ?? {};
      if (typeof o.tumpuk === 'boolean') g.opts.tumpuk = o.tumpuk;
      if (o.ogahDetik !== undefined && [3, 4, 6].includes(o.ogahDetik)) g.opts.ogahDetik = o.ogahDetik;
      if (o.waktu !== undefined && [0, 20, 40, 60].includes(o.waktu)) g.opts.waktu = o.waktu;
      break;
    }
    case 'mulai':
      if (!host || g.phase !== 'lobby') fail('Hanya tuan rumah yang bisa memulai.');
      if (g.players.length < 2) fail('Butuh minimal 2 pemain. Tambahkan bot kalau sedang sendiri.');
      mulai(g, now);
      break;
    case 'main':
      if (g.phase !== 'main' || cur(g) !== p || g.fase !== 'main') fail('Belum giliranmu.');
      mainkan(g, p, a.kartu ?? [], a.target, a.sebut, a.ambil, now);
      break;
    case 'ogah':
      if (g.phase !== 'main' || g.fase !== 'ogah') fail('Tidak ada aksi yang bisa di-Ogah!.');
      ogah(g, p, a.kartu, now);
      break;
    case 'ambil':
      if (g.phase !== 'main' || cur(g) !== p || g.fase !== 'main') fail('Belum giliranmu.');
      ambil(g, p, now);
      break;
    case 'beri':
      if (g.phase !== 'main' || g.fase !== 'minta') fail('Tidak ada yang meminta kartu.');
      beri(g, p, a.kartu, now);
      break;
    case 'sisip':
      if (g.phase !== 'main' || g.fase !== 'jinak') fail('Tidak ada petasan yang dijinakkan.');
      sisip(g, p, a.posisi, now);
      break;
    case 'lagi':
      if (!host || g.phase !== 'akhir') fail('Hanya tuan rumah.');
      g.phase = 'lobby';
      g.pemenang = null;
      g.log = [];
      g.deadline = null;
      for (const x of g.players) Object.assign(x, { hand: [], out: false, ledak: 0 });
      break;
    default:
      fail('Aksi tidak dikenal.');
  }
  g.rev++;
}

// ── Waktu & bot ─────────────────────────────────────────────────────────────

export function tick(g: Game, now: number): boolean {
  if (g.phase !== 'main') return false;
  if (g.fase === 'ogah') {
    const a = g.aksi!;
    if (now >= a.deadline) {
      selesaikanAksi(g, now);
      g.rev++;
      return true;
    }
    if (g.botAt !== null && now >= g.botAt) {
      g.botAt = now + 900 + Math.floor(rand(g) * 700);
      if (botOgah(g, now)) return (g.rev++, true);
    }
    return false;
  }
  const pelaku = g.fase === 'minta' ? byId(g, g.minta!.dari)! : g.fase === 'jinak' ? byId(g, g.jinak)! : cur(g);
  if (pelaku.bot && g.botAt === null) {
    g.botAt = now + 1000;
    return false;
  }
  const botDue = pelaku.bot && g.botAt !== null && now >= g.botAt;
  const late = g.deadline !== null && now >= g.deadline && (!pelaku.bot || g.fase !== 'main');
  if (!botDue && !late) return false;
  if (g.fase === 'minta') botBeri(g, pelaku, now);
  else if (g.fase === 'jinak') sisip(g, pelaku, botPosisi(g, pelaku), now);
  else if (pelaku.bot) botGiliran(g, pelaku, now);
  else ambil(g, pelaku, now);
  g.rev++;
  return true;
}

/** Bot memainkan Ogah! saat dirinya jadi sasaran, atau saat aksinya sendiri dibatalkan. */
function botOgah(g: Game, now: number): boolean {
  const a = g.aksi!;
  const batal = a.ogah.length % 2 === 1;
  for (const b of shuffle(g, hidup(g).filter((x) => x.bot && x.hand.some((c) => c.j === 'ogah')))) {
    const kena = !batal && (a.target === b.id || (a.j === 'serbu' && a.kombo === 'satu' && berikutnya(g) === b));
    const milikku = batal && a.by === b.id;
    if ((kena && rand(g) < 0.65) || (milikku && rand(g) < 0.5)) {
      ogah(g, b, b.hand.find((c) => c.j === 'ogah')!.id, now);
      return true;
    }
  }
  return false;
}

function botBeri(g: Game, b: Player, now: number) {
  const nilai = (j: Jenis) => (j === 'siram' ? 100 : j === 'ogah' ? 40 : j === 'serbu' || j === 'kabur' ? 30 : j === 'terawang' || j === 'kocok' ? 20 : 5);
  const c = [...b.hand].sort((x, y) => nilai(x.j) - nilai(y.j))[0]!;
  beri(g, b, c.id, now);
}

/** Bot menaruh petasan: sering di paling atas untuk pemain berikutnya, kadang acak. */
function botPosisi(g: Game, b: Player) {
  if (!b.bot) return Math.floor(rand(g) * (g.deck.length + 1));
  return rand(g) < 0.55 ? 0 : Math.floor(rand(g) * Math.min(g.deck.length + 1, 6));
}

function botGiliran(g: Game, b: Player, now: number) {
  const punya = (j: Jenis) => b.hand.find((c) => c.j === j);
  const petasanSisa = g.deck.filter((c) => c.j === 'petasan').length;
  const risiko = g.deck.length ? petasanSisa / g.deck.length : 1;
  const atasPetasan = (g.tahu[b.id] ?? []).includes(0);
  const siram = !!punya('siram');
  const lawan = hidup(g).filter((x) => x !== b && x.hand.length);
  const coba = (ids: number[], extra: Partial<Extract<Action, { t: 'main' }>> = {}) => {
    try {
      mainkan(g, b, ids, extra.target, extra.sebut, extra.ambil, now);
      return true;
    } catch {
      return false;
    }
  };
  // Petasan di atas: hindari dengan Serbu, Kabur, atau Kocok.
  if (atasPetasan || (!siram && risiko > 0.3)) {
    for (const j of ['serbu', 'kabur', 'kocok'] as Jenis[]) {
      const c = punya(j);
      if (c && coba([c.id])) return;
    }
  }
  const terawang = punya('terawang');
  if (terawang && !(g.tahu[b.id] ?? []).length && risiko > 0.12 && rand(g) < 0.6 && coba([terawang.id])) return;
  // Curi dengan pasangan kucing.
  if (lawan.length && rand(g) < 0.6) {
    const t = [...lawan].sort((x, y) => y.hand.length - x.hand.length)[0]!;
    for (const j of JENIS.filter((x) => KARTU[x].kucing)) {
      const cs = b.hand.filter((c) => c.j === j);
      if (cs.length >= 3 && coba(cs.slice(0, 3).map((c) => c.id), { target: t.id, sebut: 'siram' })) return;
      if (cs.length >= 2 && coba(cs.slice(0, 2).map((c) => c.id), { target: t.id })) return;
    }
  }
  const minta = punya('minta');
  if (minta && lawan.length && rand(g) < 0.5) {
    const t = [...lawan].sort((x, y) => y.hand.length - x.hand.length)[0]!;
    if (coba([minta.id], { target: t.id })) return;
  }
  ambil(g, b, now);
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
  giliran: string | null;
  sisa: number;
  fase: Fase;
  aksi: Omit<Aksi, 'kartu'> & { kartu: Jenis[] } | null;
  minta: { dari: string; ke: string } | null;
  jinak: string | null;
  deck: number;
  petasan: number;
  buang: Card[];
  players: { id: string; name: string; avatar: string; bot: boolean; kartu: number; out: boolean; ledak: number }[];
  log: Ev[];
  pemenang: string | null;
  me: { id: string; hand: Card[]; intip: { kartu: Jenis[]; n: number } | null; dapat: { j: Jenis; dari: string; n: number } | null; tahu: number[] } | null;
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
    giliran: g.phase === 'main' ? cur(g).id : null,
    sisa: g.sisa,
    fase: g.fase,
    aksi: g.aksi ? { ...g.aksi, kartu: g.aksi.kartu.map((c) => c.j) } : null,
    minta: g.minta,
    jinak: g.jinak,
    deck: g.deck.length,
    petasan: g.deck.filter((c) => c.j === 'petasan').length,
    buang: g.buang,
    players: g.players.map((p) => ({ id: p.id, name: p.name, avatar: p.avatar, bot: p.bot, kartu: p.hand.length, out: p.out, ledak: p.ledak })),
    log: g.log.slice(-40),
    pemenang: g.pemenang,
    me: me
      ? {
          id: me.id,
          hand: me.hand,
          intip: g.intip?.pid === me.id ? { kartu: g.intip.kartu, n: g.intip.n } : null,
          dapat: g.dapat?.pid === me.id ? { j: g.dapat.j, dari: g.dapat.dari, n: g.dapat.n } : null,
          tahu: g.tahu[me.id] ?? [],
        }
      : null,
  };
}
