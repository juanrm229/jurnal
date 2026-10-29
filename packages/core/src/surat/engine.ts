/**
 * TITIP SURAT: permainan kartu deduksi untuk 2–6 orang, aturan lengkap
 * Love Letter edisi 2019 (21 kartu, 10 jenis), bertema surat yang dititipkan
 * lewat orang-orang di sekitar "Dia".
 *
 * Murni (tanpa I/O): server, tes, dan bot memakai aturan yang persis sama.
 * Alur: lobi → (ronde: giliran ambil 1, mainkan 1) → jeda → … → akhir.
 */

// ── Kartu ───────────────────────────────────────────────────────────────────

export interface Jenis {
  v: number;
  nama: string;
  jumlah: number;
  doodle: string;
  /** Teks efek lengkap. */
  efek: string;
  /** Satu baris untuk kartu kecil. */
  singkat: string;
  /** Butuh memilih pemain lain. */
  sasaran: 'lain' | 'siapa' | null;
}

export const JENIS: Jenis[] = [
  { v: 0, nama: 'Pengagum Rahasia', jumlah: 2, doodle: 'bintang-mata', sasaran: null, singkat: 'bonus perangko di akhir ronde', efek: 'Tidak ada efek saat dimainkan. Di akhir ronde, kalau kamu satu-satunya yang masih bertahan dan pernah memainkan atau membuang Pengagum Rahasia, kamu dapat 1 perangko.' },
  { v: 1, nama: 'Teman Kepo', jumlah: 6, doodle: 'tanda-tanya', sasaran: 'lain', singkat: 'tebak kartu orang lain', efek: 'Pilih pemain lain dan sebutkan satu kartu selain Teman Kepo. Kalau tebakanmu benar, dia tersingkir dari ronde.' },
  { v: 2, nama: 'Teman Curhat', jumlah: 2, doodle: 'gelembung-kata', sasaran: 'lain', singkat: 'lihat kartu orang lain', efek: 'Pilih pemain lain dan lihat kartunya diam-diam.' },
  { v: 3, nama: 'Saingan', jumlah: 2, doodle: 'petir-kecil', sasaran: 'lain', singkat: 'adu kartu, yang kecil keluar', efek: 'Pilih pemain lain. Bandingkan kartu kalian diam-diam. Yang nilainya lebih kecil tersingkir. Kalau sama, tidak terjadi apa-apa.' },
  { v: 4, nama: 'Sahabat', jumlah: 2, doodle: 'payung-terbuka', sasaran: null, singkat: 'terlindung sampai giliranmu', efek: 'Sampai giliranmu berikutnya, kartu pemain lain tidak bisa memilihmu.' },
  { v: 5, nama: 'Adik Usil', jumlah: 2, doodle: 'kertas-sobek', sasaran: 'siapa', singkat: 'buang kartu seseorang', efek: 'Pilih satu pemain, boleh dirimu sendiri. Dia membuang kartunya tanpa efek, lalu mengambil kartu baru. Kalau tumpukan habis, dia mengambil kartu yang disisihkan di awal ronde.' },
  { v: 6, nama: 'Tukang Pos', jumlah: 2, doodle: 'amplop', sasaran: null, singkat: 'ambil 2, simpan 1', efek: 'Ambil dua kartu dari tumpukan. Simpan satu dari tiga kartu di tanganmu, lalu kembalikan dua lainnya ke bawah tumpukan dengan urutan pilihanmu.' },
  { v: 7, nama: 'Ayah', jumlah: 1, doodle: 'kunci-rumah', sasaran: 'lain', singkat: 'tukar kartu', efek: 'Pilih pemain lain dan tukar kartu di tangan kalian.' },
  { v: 8, nama: 'Ibu', jumlah: 1, doodle: 'bunga-vas', sasaran: null, singkat: 'wajib dimainkan bila ada Ayah/Adik Usil', efek: 'Tidak ada efek saat dimainkan. Kalau kartu lain di tanganmu Ayah atau Adik Usil, kamu wajib memainkan Ibu.' },
  { v: 9, nama: 'Dia', jumlah: 1, doodle: 'gembok-hati', sasaran: null, singkat: 'kalau terbuang, kamu keluar', efek: 'Kalau kartu ini terbuang karena alasan apa pun, kamu tersingkir dari ronde.' },
];
export const jenis = (v: number) => JENIS[v]!;
export const TOTAL = JENIS.reduce((a, j) => a + j.jumlah, 0);

/** Perangko yang dibutuhkan untuk menang (aturan 2019). */
export const targetFor = (n: number) => ({ 2: 6, 3: 5, 4: 4 } as Record<number, number>)[n] ?? 3;
export const MAX_PLAYERS = 6;
export const JEDA_MS = 45_000;

// ── Tipe ────────────────────────────────────────────────────────────────────

export interface Card {
  id: number;
  v: number;
}

export interface Player {
  id: string;
  name: string;
  avatar: string;
  guest: boolean;
  bot: boolean;
  perangko: number;
  hand: Card[];
  /** Kartu yang dimainkan atau dibuang, berurutan. Terbuka untuk semua. */
  buang: Card[];
  out: boolean;
  aman: boolean;
  siap: boolean;
}

export type Phase = 'lobby' | 'main' | 'jeda' | 'akhir';

export interface Opts {
  /** Catatan otomatis: kartu yang belum terlihat & yang kamu ketahui. */
  pelacak: boolean;
  /** Detik per giliran; 0 = tanpa batas. Kalau habis, bot memainkan giliranmu. */
  waktu: number;
}

export interface Lihat {
  pid: string;
  v: number;
}

export interface Ev {
  n: number;
  r: number;
  t: 'ronde' | 'main' | 'buang' | 'keluar' | 'pos';
  by?: string;
  v?: number;
  target?: string;
  tebak?: number;
  kena?: boolean;
  /** Kartu dimainkan tanpa efek (semua lawan terlindung). */
  hampa?: boolean;
  /** Kartu yang dibuka untuk semua. */
  buka?: Lihat[];
  /** Hanya untuk pemain tertentu (dipangkas di viewFor). */
  priv?: Record<string, Lihat[]>;
}

export interface Hasil {
  r: number;
  pemenang: string[];
  spy: string | null;
  alasan: 'sisa' | 'habis';
  tangan: Lihat[];
  sisih: number | null;
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
  sisih: Card | null;
  terbuka: Card[];
  giliran: number;
  ronde: number;
  mulai: number;
  pending: string | null;
  /** Yang diketahui tiap pemain tentang kartu pemain lain (dipakai bot & catatan). */
  ingat: Record<string, Record<string, number>>;
  log: Ev[];
  n: number;
  hasil: Hasil | null;
  pemenang: string | null;
  botAt: number | null;
  /** Giliran manusia yang dimainkan bot karena waktu habis. */
  telat: string[];
}

export type Action =
  | { t: 'mulai' }
  | { t: 'bot'; tambah: boolean }
  | { t: 'opsi'; pelacak?: boolean; waktu?: number }
  | { t: 'main'; kartu: number; target?: string; tebak?: number }
  | { t: 'pos'; simpan: number; bawah: number[] }
  | { t: 'siap' }
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

export function fullDeck(): Card[] {
  const d: Card[] = [];
  for (const j of JENIS) for (let i = 0; i < j.jumlah; i++) d.push({ id: d.length, v: j.v });
  return d;
}

// ── Ruang ───────────────────────────────────────────────────────────────────

type NewPlayer = { id: string; name: string; avatar: string; guest: boolean };
const fresh = (p: NewPlayer, bot = false): Player => ({ ...p, bot, perangko: 0, hand: [], buang: [], out: false, aman: false, siap: false });

export function newGame(code: string, host: NewPlayer, _now: number, seed: number): Game {
  return {
    code,
    host: host.id,
    rev: 1,
    deadline: null,
    phase: 'lobby',
    opts: { pelacak: true, waktu: 0 },
    rng: seed >>> 0,
    players: [fresh(host)],
    deck: [],
    sisih: null,
    terbuka: [],
    giliran: 0,
    ronde: 0,
    mulai: 0,
    pending: null,
    ingat: {},
    log: [],
    n: 0,
    hasil: null,
    pemenang: null,
    botAt: null,
    telat: [],
  };
}

export const BOTS: [string, string][] = [
  ['Pak Pos', 'burung'],
  ['Bu Warung', 'kucing'],
  ['Mas Ojek', 'landak'],
  ['Neng Kos', 'kelinci'],
  ['Om Satpam', 'katak'],
];

export function join(g: Game, p: NewPlayer) {
  const me = g.players.find((x) => x.id === p.id);
  if (me) {
    me.name = p.name;
    me.avatar = p.avatar;
    me.bot = false;
  } else {
    if (g.phase !== 'lobby') fail('Permainan sudah berjalan. Tonton lewat mode TV, atau tunggu permainan berikutnya.');
    if (g.players.length >= MAX_PLAYERS) fail('Meja penuh (6 orang).');
    g.players.push(fresh(p));
  }
  g.rev++;
}

/** Keluar: di lobi kursinya dilepas; di tengah permainan, bot mengambil alih. */
export function leave(g: Game, pid: string) {
  const p = g.players.find((x) => x.id === pid);
  if (!p) return;
  if (g.phase === 'lobby') g.players = g.players.filter((x) => x.id !== pid);
  else p.bot = true;
  const human = g.players.find((x) => !x.bot);
  if (g.host === pid && human) g.host = human.id;
  g.rev++;
}

// ── Jalannya ronde ──────────────────────────────────────────────────────────

const alive = (g: Game) => g.players.filter((p) => !p.out);
const cur = (g: Game) => g.players[g.giliran]!;
const byId = (g: Game, id: string | undefined) => g.players.find((p) => p.id === id);
const push = (g: Game, e: Omit<Ev, 'n' | 'r'>) => g.log.push({ n: ++g.n, r: g.ronde, ...e });

function mulaiRonde(g: Game, now: number) {
  g.ronde++;
  g.phase = 'main';
  g.hasil = null;
  g.pending = null;
  g.ingat = {};
  for (const p of g.players) Object.assign(p, { hand: [], buang: [], out: false, aman: false, siap: false });
  g.deck = shuffle(g, fullDeck());
  g.sisih = g.deck.shift()!;
  g.terbuka = g.players.length === 2 ? g.deck.splice(0, 3) : [];
  const n = g.players.length;
  for (let i = 0; i < n; i++) g.players[(g.mulai + i) % n]!.hand.push(g.deck.shift()!);
  g.giliran = g.mulai;
  push(g, { t: 'ronde', by: cur(g).id });
  mulaiGiliran(g, now);
}

function mulaiGiliran(g: Game, now: number) {
  const p = cur(g);
  p.aman = false;
  p.hand.push(g.deck.shift()!);
  g.deadline = !p.bot && g.opts.waktu ? now + g.opts.waktu * 1000 : null;
  g.botAt = p.bot ? now + 1400 + Math.floor(rand(g) * 1000) : null;
}

function lupakan(g: Game, pid: string) {
  for (const k of Object.keys(g.ingat)) delete g.ingat[k]![pid];
}
function ingat(g: Game, siapa: string, pid: string, v: number) {
  (g.ingat[siapa] ??= {})[pid] = v;
}
/** Kartu bernilai v dibuang pemain: pengetahuan lama tentang tangannya tak berlaku lagi. */
function dibuang(g: Game, pid: string, v: number) {
  for (const k of Object.keys(g.ingat)) if (g.ingat[k]![pid] === v) delete g.ingat[k]![pid];
}

function singkirkan(g: Game, p: Player) {
  p.out = true;
  const buka = p.hand.map((c) => ({ pid: p.id, v: c.v }));
  p.buang.push(...p.hand);
  p.hand = [];
  lupakan(g, p.id);
  push(g, { t: 'keluar', by: p.id, buka });
}

export const mustIbu = (hand: Card[]) => hand.some((c) => c.v === 8) && hand.some((c) => c.v === 5 || c.v === 7);
/** Pemain yang bisa dipilih kartu `v` oleh `p`. */
export function sasaranFor(g: { players: { id: string; out: boolean; aman: boolean }[] }, pid: string, v: number): string[] {
  const s = jenis(v).sasaran;
  if (!s) return [];
  const lain = g.players.filter((x) => !x.out && !x.aman && x.id !== pid).map((x) => x.id);
  return s === 'siapa' ? [...lain, pid] : lain;
}

function mainkan(g: Game, p: Player, cardId: number, targetId: string | undefined, tebak: number | undefined, now: number) {
  const card = p.hand.find((c) => c.id === cardId) ?? fail('Kartu itu tidak ada di tanganmu.');
  if (mustIbu(p.hand) && card.v !== 8) fail('Ibu wajib dimainkan bila kartu lainmu Ayah atau Adik Usil.');
  const pilihan = sasaranFor(g, p.id, card.v);
  const hampa = jenis(card.v).sasaran === 'lain' && pilihan.length === 0;
  let t: Player | undefined;
  if (jenis(card.v).sasaran && !hampa) {
    if (!targetId || !pilihan.includes(targetId)) fail('Pilih pemain yang bisa dituju.');
    t = byId(g, targetId)!;
  }
  if (card.v === 1 && !hampa && (tebak === undefined || !Number.isInteger(tebak) || tebak < 0 || tebak > 9 || tebak === 1)) fail('Sebutkan satu kartu selain Teman Kepo.');

  p.hand = p.hand.filter((c) => c !== card);
  p.buang.push(card);
  dibuang(g, p.id, card.v);
  const ev: Omit<Ev, 'n' | 'r'> = { t: 'main', by: p.id, v: card.v, target: t?.id, hampa: hampa || undefined };

  switch (card.v) {
    case 1:
      if (t) {
        ev.tebak = tebak;
        ev.kena = t.hand[0]!.v === tebak;
        push(g, ev);
        if (ev.kena) singkirkan(g, t);
        return selesaiGiliran(g, now);
      }
      break;
    case 2:
      if (t) {
        ev.priv = { [p.id]: [{ pid: t.id, v: t.hand[0]!.v }] };
        ingat(g, p.id, t.id, t.hand[0]!.v);
      }
      break;
    case 3:
      if (t) {
        const a = p.hand[0]!.v;
        const b = t.hand[0]!.v;
        ev.priv = { [p.id]: [{ pid: t.id, v: b }], [t.id]: [{ pid: p.id, v: a }] };
        push(g, ev);
        if (a < b) singkirkan(g, p);
        else if (b < a) singkirkan(g, t);
        else (ingat(g, p.id, t.id, b), ingat(g, t.id, p.id, a));
        return selesaiGiliran(g, now);
      }
      break;
    case 4:
      p.aman = true;
      break;
    case 5: {
      const x = t!;
      const c = x.hand.shift()!;
      x.buang.push(c);
      lupakan(g, x.id);
      push(g, ev);
      push(g, { t: 'buang', by: x.id, v: c.v, buka: [{ pid: x.id, v: c.v }] });
      if (c.v === 9) singkirkan(g, x);
      else {
        let baru = g.deck.shift();
        if (!baru && g.sisih) ((baru = g.sisih), (g.sisih = null));
        if (baru) x.hand.push(baru);
      }
      return selesaiGiliran(g, now);
    }
    case 6: {
      const ambil = g.deck.splice(0, 2);
      push(g, ev);
      if (!ambil.length) return selesaiGiliran(g, now);
      p.hand.push(...ambil);
      lupakan(g, p.id);
      g.pending = p.id;
      if (p.bot) g.botAt = now + 900;
      return;
    }
    case 7:
      if (t) {
        const mine = p.hand[0]!;
        const theirs = t.hand[0]!;
        p.hand = [theirs];
        t.hand = [mine];
        for (const k of Object.keys(g.ingat)) {
          const m = g.ingat[k]!;
          const a = m[p.id];
          const b = m[t.id];
          delete m[p.id];
          delete m[t.id];
          if (b !== undefined) m[p.id] = b;
          if (a !== undefined) m[t.id] = a;
        }
        ingat(g, p.id, t.id, mine.v);
        ingat(g, t.id, p.id, theirs.v);
        ev.priv = { [p.id]: [{ pid: t.id, v: mine.v }], [t.id]: [{ pid: p.id, v: theirs.v }] };
      }
      break;
    case 9:
      push(g, ev);
      singkirkan(g, p);
      return selesaiGiliran(g, now);
  }
  push(g, ev);
  selesaiGiliran(g, now);
}

function kembalikan(g: Game, p: Player, simpan: number, bawah: number[]) {
  const keep = p.hand.find((c) => c.id === simpan) ?? fail('Pilih satu kartu untuk disimpan.');
  const rest = p.hand.filter((c) => c !== keep);
  if (bawah.length !== rest.length || !rest.every((c) => bawah.includes(c.id))) fail('Urutkan kartu yang dikembalikan.');
  p.hand = [keep];
  g.deck.push(...bawah.map((id) => rest.find((c) => c.id === id)!));
  g.pending = null;
  push(g, { t: 'pos', by: p.id, v: rest.length });
}

function selesaiGiliran(g: Game, now: number) {
  const hidup = alive(g);
  if (hidup.length <= 1 || g.deck.length === 0) return akhirRonde(g, now);
  const n = g.players.length;
  do g.giliran = (g.giliran + 1) % n;
  while (cur(g).out);
  mulaiGiliran(g, now);
}

function akhirRonde(g: Game, now: number) {
  const hidup = alive(g);
  let pemenang: Player[];
  if (hidup.length === 1) pemenang = hidup;
  else {
    const top = Math.max(...hidup.map((p) => p.hand[0]?.v ?? -1));
    pemenang = hidup.filter((p) => (p.hand[0]?.v ?? -1) === top);
  }
  const spies = hidup.filter((p) => p.buang.some((c) => c.v === 0));
  const spy = spies.length === 1 ? spies[0]! : null;
  for (const p of pemenang) p.perangko++;
  if (spy) spy.perangko++;
  g.hasil = {
    r: g.ronde,
    pemenang: pemenang.map((p) => p.id),
    spy: spy?.id ?? null,
    alasan: hidup.length === 1 ? 'sisa' : 'habis',
    tangan: hidup.flatMap((p) => p.hand.map((c) => ({ pid: p.id, v: c.v }))),
    sisih: g.sisih?.v ?? null,
  };
  g.pending = null;
  g.botAt = null;
  g.mulai = g.players.indexOf(pemenang[Math.floor(rand(g) * pemenang.length)]!);
  // Menang bila satu orang memimpin dan sudah mencapai target; seri di puncak = ronde tambahan.
  const target = targetFor(g.players.length);
  const max = Math.max(...g.players.map((p) => p.perangko));
  const puncak = g.players.filter((p) => p.perangko === max);
  if (max >= target && puncak.length === 1) {
    g.phase = 'akhir';
    g.pemenang = puncak[0]!.id;
    g.deadline = null;
  } else {
    g.phase = 'jeda';
    g.deadline = now + JEDA_MS;
    for (const p of g.players) p.siap = p.bot;
  }
}

// ── Aksi ────────────────────────────────────────────────────────────────────

export function act(g: Game, pid: string, a: Action, now: number) {
  const p = byId(g, pid) ?? fail('Kamu belum duduk di meja ini.');
  const host = pid === g.host;
  switch (a.t) {
    case 'bot': {
      if (!host || g.phase !== 'lobby') fail('Hanya tuan rumah, sebelum mulai.');
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
    case 'opsi':
      if (!host || g.phase !== 'lobby') fail('Hanya tuan rumah, sebelum mulai.');
      if (typeof a.pelacak === 'boolean') g.opts.pelacak = a.pelacak;
      if (typeof a.waktu === 'number' && [0, 30, 60, 90].includes(a.waktu)) g.opts.waktu = a.waktu;
      break;
    case 'mulai':
      if (!host || g.phase !== 'lobby') fail('Hanya tuan rumah yang bisa memulai.');
      if (g.players.length < 2) fail('Butuh minimal 2 pemain. Tambahkan bot kalau sedang sendiri.');
      g.players = shuffle(g, g.players);
      for (const x of g.players) x.perangko = 0;
      g.ronde = 0;
      g.log = [];
      g.n = 0;
      g.pemenang = null;
      g.telat = [];
      g.mulai = 0;
      mulaiRonde(g, now);
      break;
    case 'main':
      if (g.phase !== 'main' || cur(g) !== p || g.pending) fail('Belum giliranmu.');
      mainkan(g, p, a.kartu, a.target, a.tebak, now);
      break;
    case 'pos':
      if (g.pending !== pid) fail('Tidak ada kartu untuk dikembalikan.');
      kembalikan(g, p, a.simpan, a.bawah ?? []);
      selesaiGiliran(g, now);
      break;
    case 'siap':
      if (g.phase !== 'jeda') return;
      p.siap = true;
      if (g.players.every((x) => x.siap)) mulaiRonde(g, now);
      break;
    case 'lagi':
      if (!host || g.phase !== 'akhir') fail('Hanya tuan rumah.');
      g.phase = 'lobby';
      g.deadline = null;
      g.hasil = null;
      g.pemenang = null;
      g.log = [];
      g.telat = [];
      for (const x of g.players) Object.assign(x, { perangko: 0, hand: [], buang: [], out: false, aman: false, siap: false });
      break;
    default:
      fail('Aksi tidak dikenal.');
  }
  g.rev++;
}

/** Bot bermain, giliran yang kehabisan waktu dimainkan otomatis, dan jeda berakhir. */
export function tick(g: Game, now: number): boolean {
  if (g.phase === 'jeda') {
    if ((g.deadline && now >= g.deadline) || g.players.every((p) => p.siap)) {
      mulaiRonde(g, now);
      g.rev++;
      return true;
    }
    return false;
  }
  if (g.phase !== 'main') return false;
  const p = g.pending ? byId(g, g.pending)! : cur(g);
  // Kursi yang baru diambil alih bot (pemain keluar) mulai bermain sebentar lagi.
  if (p.bot && g.botAt === null) {
    g.botAt = now + 1200;
    return false;
  }
  const botDue = p.bot && g.botAt !== null && now >= g.botAt;
  const late = !p.bot && g.deadline !== null && now >= g.deadline;
  if (!botDue && !late) return false;
  if (late) g.telat.push(p.id);
  if (g.pending) {
    const { simpan, bawah } = botPos(g, p);
    kembalikan(g, p, simpan, bawah);
    selesaiGiliran(g, now);
  } else {
    const m = botMain(g, p);
    mainkan(g, p, m.kartu, m.target, m.tebak, now);
    if (g.pending === p.id) {
      const { simpan, bawah } = botPos(g, p);
      kembalikan(g, p, simpan, bawah);
      selesaiGiliran(g, now);
    }
  }
  g.rev++;
  return true;
}

// ── Bot ─────────────────────────────────────────────────────────────────────

/** Kartu yang belum terlihat oleh `p`: semua dikurangi yang terbuang, terbuka, dan di tangannya. */
export function belumTerlihat(g: Pick<Game, 'players' | 'terbuka'>, hand: Card[]): number[] {
  const n = JENIS.map((j) => j.jumlah);
  for (const x of g.players) for (const c of x.buang) n[c.v]!--;
  for (const c of g.terbuka) n[c.v]!--;
  for (const c of hand) n[c.v]!--;
  return n.map((x) => Math.max(0, x));
}

function botMain(g: Game, p: Player): { kartu: number; target?: string; tebak?: number } {
  const hand = p.hand;
  if (mustIbu(hand)) return { kartu: hand.find((c) => c.v === 8)!.id };
  const tahu = g.ingat[p.id] ?? {};
  const dist = belumTerlihat(g, hand);
  const total = dist.reduce((a, b) => a + b, 0) || 1;
  const leader = (ids: string[]) => [...ids].sort((a, b) => byId(g, b)!.perangko - byId(g, a)!.perangko)[0];
  const exp = dist.reduce((a, c, v) => a + c * v, 0) / total;
  let best = { s: -Infinity, m: { kartu: hand[0]!.id } as { kartu: number; target?: string; tebak?: number } };
  for (const c of hand) {
    if (c.v === 9) continue;
    const other = hand.find((x) => x !== c)!;
    const tgt = sasaranFor(g, p.id, c.v);
    const lain = tgt.filter((id) => id !== p.id);
    let s = 0;
    let m: { kartu: number; target?: string; tebak?: number } = { kartu: c.id };
    switch (c.v) {
      case 0:
        s = 1.6;
        break;
      case 1: {
        if (!lain.length) {
          s = 0.5;
          break;
        }
        const known = lain.find((id) => tahu[id] !== undefined && tahu[id] !== 1);
        if (known) {
          s = 10;
          m = { kartu: c.id, target: known, tebak: tahu[known] };
        } else {
          let gv = 0;
          for (let v = 0; v <= 9; v++) if (v !== 1 && dist[v]! > dist[gv]!) gv = v;
          if (gv === 1) gv = 0;
          s = 1 + (dist[gv]! / total) * 8;
          m = { kartu: c.id, target: leader(lain), tebak: gv };
        }
        break;
      }
      case 2: {
        const unk = lain.filter((id) => tahu[id] === undefined);
        s = unk.length ? 2.4 : 0.6;
        m = { kartu: c.id, target: leader(unk.length ? unk : lain) };
        break;
      }
      case 3: {
        if (!lain.length) {
          s = 0.4;
          break;
        }
        let bs = -Infinity;
        for (const id of lain) {
          const k = tahu[id];
          let x: number;
          if (k !== undefined) x = k < other.v ? 9 : k > other.v ? -8 : 0.5;
          else {
            let win = 0;
            let lose = 0;
            dist.forEach((cnt, v) => (v < other.v ? (win += cnt) : v > other.v ? (lose += cnt) : 0));
            x = 2 + ((win - lose) / total) * 6;
          }
          if (x > bs) ((bs = x), (m = { kartu: c.id, target: id }));
        }
        s = bs;
        break;
      }
      case 4:
        s = 3 + (other.v === 9 ? 2 : 0);
        break;
      case 5: {
        const dia = lain.find((id) => tahu[id] === 9);
        if (dia) ((s = 11), (m = { kartu: c.id, target: dia }));
        else if (lain.length) ((s = 2.4), (m = { kartu: c.id, target: leader(lain) }));
        else ((s = other.v === 9 ? -100 : other.v <= 3 ? 1.5 : -1), (m = { kartu: c.id, target: p.id }));
        break;
      }
      case 6:
        s = 2.4 + (g.deck.length >= 2 ? 0.6 : 0);
        break;
      case 7: {
        if (!lain.length || other.v === 9) {
          s = other.v === 9 ? -5 : 0.4;
          break;
        }
        const known = lain.filter((id) => tahu[id] !== undefined).sort((a, b) => tahu[b]! - tahu[a]!)[0];
        if (known) s = 1 + (tahu[known]! - other.v) * 0.7;
        else s = 1 + (exp - other.v) * 0.4;
        m = { kartu: c.id, target: known ?? leader(lain) };
        break;
      }
      case 8:
        s = 1;
        break;
    }
    s += other.v * 0.25 + rand(g) * 0.3;
    if (s > best.s) best = { s, m };
  }
  // Pengaman: kalau langkah terpilih butuh sasaran tapi tak ada, mainkan saja tanpa sasaran.
  const c = hand.find((x) => x.id === best.m.kartu)!;
  const tg = sasaranFor(g, p.id, c.v);
  if (jenis(c.v).sasaran && tg.length && !tg.includes(best.m.target ?? '')) best.m.target = tg.includes(p.id) && tg.length === 1 ? p.id : (tg.find((x) => x !== p.id) ?? tg[0]);
  if (c.v === 1 && best.m.tebak === undefined) best.m.tebak = 0;
  return best.m;
}

function botPos(g: Game, p: Player) {
  const keep = [...p.hand].sort((a, b) => b.v - a.v)[0]!;
  return { simpan: keep.id, bawah: p.hand.filter((c) => c !== keep).map((c) => c.id) };
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
  ronde: number;
  target: number;
  giliran: string | null;
  pending: string | null;
  deck: number;
  terbuka: number[];
  players: { id: string; name: string; avatar: string; bot: boolean; perangko: number; kartu: number; buang: number[]; out: boolean; aman: boolean; siap: boolean }[];
  log: Ev[];
  hasil: Hasil | null;
  pemenang: string | null;
  me: { id: string; hand: Card[]; tahu: Lihat[]; sisa: number[] } | null;
}

export function viewFor(g: Game, pid: string | null, now: number): View {
  const me = pid ? byId(g, pid) : undefined;
  const tahu = me && g.opts.pelacak ? Object.entries(g.ingat[me.id] ?? {}).map(([id, v]) => ({ pid: id, v })) : [];
  return {
    code: g.code,
    rev: g.rev,
    now,
    deadline: g.deadline,
    phase: g.phase,
    host: g.host,
    opts: g.opts,
    ronde: g.ronde,
    target: targetFor(g.players.length),
    giliran: g.phase === 'main' ? cur(g).id : null,
    pending: g.pending,
    deck: g.deck.length,
    terbuka: g.terbuka.map((c) => c.v),
    players: g.players.map((p) => ({ id: p.id, name: p.name, avatar: p.avatar, bot: p.bot, perangko: p.perangko, kartu: p.hand.length, buang: p.buang.map((c) => c.v), out: p.out, aman: p.aman, siap: p.siap })),
    log: g.log.slice(-60).map(({ priv, ...e }) => (me && priv?.[me.id] ? { ...e, priv: { [me.id]: priv[me.id]! } } : e)),
    hasil: g.hasil,
    pemenang: g.pemenang,
    me: me ? { id: me.id, hand: me.hand, tahu, sisa: g.opts.pelacak ? belumTerlihat(g, me.hand) : [] } : null,
  };
}
