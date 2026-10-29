/**
 * KARTU SATU: permainan kartu cocokkan-warna untuk 2–10 orang. Aturan resmi
 * UNO lengkap (108 kartu, tantangan +4, hukuman lupa "satu!", skor 500),
 * ditambah aturan tongkrongan yang bisa dinyalakan satu per satu: tumpuk
 * +2/+4, pantul, salip, buang kembar, 7-0, tarik sampai dapat, +4 bebas,
 * wajib tutup dengan angka, dan mode cari yang kalah.
 *
 * Murni (tanpa I/O): server, tes, dan bot memakai aturan yang persis sama.
 */

// ── Kartu ───────────────────────────────────────────────────────────────────

export type Warna = 'm' | 'k' | 'h' | 'b';
export type Jenis = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | 'skip' | 'rev' | '+2' | 'wild' | '+4';
export interface Card {
  id: number;
  /** null untuk kartu hitam (ganti warna, +4). */
  w: Warna | null;
  t: Jenis;
}

export const WARNA: Warna[] = ['m', 'k', 'h', 'b'];
export const NAMA_WARNA: Record<Warna, string> = { m: 'merah', k: 'kuning', h: 'hijau', b: 'biru' };
export const NAMA_JENIS: Record<Jenis, string> = { 0: '0', 1: '1', 2: '2', 3: '3', 4: '4', 5: '5', 6: '6', 7: '7', 8: '8', 9: '9', skip: 'Lewati', rev: 'Putar Balik', '+2': '+2', wild: 'Ganti Warna', '+4': '+4' };
export const isAngka = (t: Jenis) => /^\d$/.test(t);
export const isHitam = (c: Card) => c.w === null;
export const poin = (c: Card) => (isAngka(c.t) ? Number(c.t) : c.w === null ? 50 : 20);
export const namaKartu = (c: Card) => (c.w ? `${NAMA_JENIS[c.t]} ${NAMA_WARNA[c.w]}` : NAMA_JENIS[c.t]);

export function fullDeck(): Card[] {
  const d: Card[] = [];
  const add = (w: Warna | null, t: Jenis) => d.push({ id: d.length, w, t });
  for (const w of WARNA) {
    add(w, '0');
    for (const t of ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'skip', 'rev', '+2'] as Jenis[]) (add(w, t), add(w, t));
  }
  for (let i = 0; i < 4; i++) (add(null, 'wild'), add(null, '+4'));
  return d;
}

// ── Aturan ──────────────────────────────────────────────────────────────────

export interface Opts {
  /** Tumpuk kartu tambah: tidak (resmi) · sejenis (+2 di +2, +4 di +4) · campur. */
  tumpuk: 'tidak' | 'sejenis' | 'campur';
  /** Saat ada tumpukan tambah, Putar Balik memantulkan dan Lewati meneruskannya (warna sama). */
  pantul: boolean;
  /** Kartu kembar persis (warna & angka/simbol) boleh dibanting di luar giliran. */
  salip: boolean;
  /** Buang beberapa kartu bernilai sama sekaligus. */
  kembar: boolean;
  /** 7: tukar tangan dengan pemain pilihan. 0: semua tangan berputar mengikuti arah. */
  tujuhNol: boolean;
  /** Tarik terus sampai dapat kartu yang bisa dimainkan. */
  tarikSampai: boolean;
  /** +4 boleh kapan saja tanpa syarat (tanpa tantangan). */
  plus4Bebas: boolean;
  /** Pemain berikutnya boleh menantang +4 yang dimainkan tidak sah (resmi). */
  tantang: boolean;
  /** Kartu terakhir harus kartu angka. */
  tutupAngka: boolean;
  /** skor: kumpulkan poin sampai target (resmi) · sekali: satu ronde · pecundang: main sampai tersisa satu yang kalah. */
  akhir: 'skor' | 'sekali' | 'pecundang';
  target: number;
  /** Detik per giliran; 0 = santai. Kalau habis, bot memainkan giliranmu. */
  waktu: number;
}

export const ORI: Omit<Opts, 'waktu'> = { tumpuk: 'tidak', pantul: false, salip: false, kembar: false, tujuhNol: false, tarikSampai: false, plus4Bebas: false, tantang: true, tutupAngka: false, akhir: 'skor', target: 500 };
export const TONGKRONGAN: Omit<Opts, 'waktu'> = { tumpuk: 'campur', pantul: true, salip: true, kembar: true, tujuhNol: false, tarikSampai: false, plus4Bebas: true, tantang: false, tutupAngka: true, akhir: 'pecundang', target: 500 };
export const presetOf = (o: Opts): 'ori' | 'tongkrongan' | 'racikan' => {
  const same = (p: Omit<Opts, 'waktu'>) => (Object.keys(p) as (keyof typeof p)[]).every((k) => p[k] === o[k]);
  return same(ORI) ? 'ori' : same(TONGKRONGAN) ? 'tongkrongan' : 'racikan';
};

export const MAX_PLAYERS = 10;
export const KARTU_AWAL = 7;
export const JEDA_MS = 45_000;
export const HUKUM_SATU = 2;

// ── Tipe ────────────────────────────────────────────────────────────────────

export interface Player {
  id: string;
  name: string;
  avatar: string;
  guest: boolean;
  bot: boolean;
  hand: Card[];
  skor: number;
  /** Urutan selesai di ronde ini (mode pecundang); null = masih main. */
  selesai: number | null;
  /** Sudah bilang "satu!". */
  satu: boolean;
  /** Tinggal satu kartu tanpa bilang "satu!": bisa ditangkap. */
  rawan: boolean;
  siap: boolean;
}

export type Phase = 'lobby' | 'main' | 'jeda' | 'akhir';

export interface Ev {
  n: number;
  r: number;
  t: 'ronde' | 'main' | 'tarik' | 'lewat' | 'satu' | 'tangkap' | 'tantang' | 'selesai' | 'kocok' | 'tukar' | 'putar' | 'salip' | 'hukum';
  by?: string;
  kartu?: Card[];
  target?: string;
  jumlah?: number;
  warna?: Warna;
  berhasil?: boolean;
}

export interface Hasil {
  r: number;
  pemenang: string;
  poin: number;
  sisa: { pid: string; poin: number; kartu: number }[];
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
  draw: Card[];
  buang: Card[];
  warna: Warna;
  arah: 1 | -1;
  giliran: number;
  /** Tumpukan tambah yang menunggu (kartu yang harus diambil). */
  tarik: number;
  tarikJenis: '+2' | '+4' | null;
  /** +4 terakhir, untuk tantangan. */
  plus4: { by: string; sah: boolean } | null;
  /** Kartu yang baru diambil dan masih boleh dimainkan giliran ini. */
  ditarik: number | null;
  /** Kartu pembuka Ganti Warna: pemain pertama memilih warna dulu (resmi). */
  awalWarna: boolean;
  ronde: number;
  dealer: number;
  urutan: string[];
  log: Ev[];
  n: number;
  hasil: Hasil | null;
  pemenang: string | null;
  kalah: string | null;
  botAt: number | null;
  rawanAt: number | null;
}

export type Action =
  | { t: 'mulai' }
  | { t: 'bot'; tambah: boolean }
  | { t: 'opsi'; opts: Partial<Opts> }
  | { t: 'preset'; nama: 'ori' | 'tongkrongan' }
  | { t: 'main'; kartu: number[]; warna?: Warna; target?: string }
  | { t: 'tarik' }
  | { t: 'warna'; warna: Warna }
  | { t: 'lewat' }
  | { t: 'tantang' }
  | { t: 'satu' }
  | { t: 'tangkap'; target: string }
  | { t: 'salip'; kartu: number }
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

// ── Ruang ───────────────────────────────────────────────────────────────────

type NewPlayer = { id: string; name: string; avatar: string; guest: boolean };
const fresh = (p: NewPlayer, bot = false): Player => ({ ...p, bot, hand: [], skor: 0, selesai: null, satu: false, rawan: false, siap: false });

export function newGame(code: string, host: NewPlayer, _now: number, seed: number): Game {
  return {
    code,
    host: host.id,
    rev: 1,
    deadline: null,
    phase: 'lobby',
    opts: { ...ORI, waktu: 0 },
    rng: seed >>> 0,
    players: [fresh(host)],
    draw: [],
    buang: [],
    warna: 'm',
    arah: 1,
    giliran: 0,
    tarik: 0,
    tarikJenis: null,
    plus4: null,
    ditarik: null,
    awalWarna: false,
    ronde: 0,
    dealer: 0,
    urutan: [],
    log: [],
    n: 0,
    hasil: null,
    pemenang: null,
    kalah: null,
    botAt: null,
    rawanAt: null,
  };
}

export const BOTS: [string, string][] = [
  ['Bang Kopi', 'burung'],
  ['Teh Manis', 'kucing'],
  ['Mas Gorengan', 'landak'],
  ['Mbak Seblak', 'kelinci'],
  ['Pak RT', 'katak'],
  ['Bu Arisan', 'bebek'],
  ['Kang Parkir', 'kepik'],
  ['Neng Boba', 'kupu-kupu'],
  ['Om Ronda', 'siput'],
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
  const human = g.players.find((x) => !x.bot);
  if (g.host === pid && human) g.host = human.id;
  g.rev++;
}

// ── Pembantu ────────────────────────────────────────────────────────────────

const byId = (g: Game, id: string | undefined) => g.players.find((p) => p.id === id);
const cur = (g: Game) => g.players[g.giliran]!;
const aktif = (g: Game) => g.players.filter((p) => p.selesai === null);
const push = (g: Game, e: Omit<Ev, 'n' | 'r'>) => g.log.push({ n: ++g.n, r: g.ronde, ...e });
export const top = (g: Pick<Game, 'buang'>) => g.buang[g.buang.length - 1]!;

/** Pemain aktif berikutnya, `k` langkah mengikuti arah. */
function langkah(g: Game, from: number, k: number): number {
  const n = g.players.length;
  let i = from;
  let s = 0;
  while (s < k) {
    i = (((i + g.arah) % n) + n) % n;
    if (g.players[i]!.selesai === null) s++;
    if (i === from && s === 0) break;
  }
  return i;
}

function ambil(g: Game, p: Player, k: number): Card[] {
  const got: Card[] = [];
  for (let i = 0; i < k; i++) {
    if (!g.draw.length) {
      const atas = g.buang.pop()!;
      if (!g.buang.length) {
        g.buang.push(atas);
        break;
      }
      g.draw = shuffle(g, g.buang);
      g.buang = [atas];
      push(g, { t: 'kocok' });
    }
    got.push(g.draw.pop()!);
  }
  p.hand.push(...got);
  if (p.hand.length > 1) (p.satu = false), (p.rawan = false);
  return got;
}

/** Apakah kartu `c` boleh dimainkan sekarang (sebagai kartu pertama). */
export function bisaMain(g: Pick<Game, 'buang' | 'warna' | 'tarik' | 'tarikJenis' | 'opts'>, hand: Card[], c: Card): boolean {
  const o = g.opts;
  const atas = top(g);
  if (g.tarik > 0) {
    if (c.t === '+4') return o.tumpuk === 'campur' || (o.tumpuk === 'sejenis' && g.tarikJenis === '+4');
    if (c.t === '+2') return o.tumpuk !== 'tidak' && (g.tarikJenis === '+2' || (o.tumpuk === 'campur' && c.w === g.warna));
    if (c.t === 'rev' || c.t === 'skip') return o.pantul && c.w === g.warna;
    return false;
  }
  if (c.t === 'wild') return true;
  if (c.t === '+4') return o.plus4Bebas || o.tantang || !hand.some((x) => x.w === g.warna);
  return c.w === g.warna || c.t === atas.t;
}

/** Kartu di tangan yang boleh dimainkan sekarang. */
export function bisaDimainkan(g: Game, p: Player): number[] {
  if (g.ditarik !== null) {
    const c = p.hand.find((x) => x.id === g.ditarik);
    return c && bisaMain(g, p.hand, c) && !larangTutup(g, p, [c]) ? [c.id] : [];
  }
  return p.hand.filter((c) => bisaMain(g, p.hand, c) && !larangTutup(g, p, [c])).map((c) => c.id);
}

/** Aturan tutup dengan angka: kartu terakhir tidak boleh kartu aksi atau hitam. */
function larangTutup(g: Game, p: Player, cards: Card[]) {
  return g.opts.tutupAngka && p.hand.length === cards.length && cards.some((c) => !isAngka(c.t));
}

// ── Jalannya ronde ──────────────────────────────────────────────────────────

function mulaiRonde(g: Game, now: number) {
  g.ronde++;
  g.phase = 'main';
  g.hasil = null;
  g.urutan = [];
  g.arah = 1;
  g.tarik = 0;
  g.tarikJenis = null;
  g.plus4 = null;
  g.ditarik = null;
  g.rawanAt = null;
  for (const p of g.players) Object.assign(p, { hand: [], selesai: null, satu: false, rawan: false, siap: false });
  g.draw = shuffle(g, fullDeck());
  g.buang = [];
  const n = g.players.length;
  g.dealer = (g.ronde - 1) % n;
  for (let k = 0; k < KARTU_AWAL; k++) for (let i = 1; i <= n; i++) g.players[(g.dealer + i) % n]!.hand.push(g.draw.pop()!);
  // Kartu pembuka: +4 dikembalikan dan dikocok ulang (aturan resmi).
  let first = g.draw.pop()!;
  while (first.t === '+4') {
    g.draw.unshift(first);
    g.draw = shuffle(g, g.draw);
    first = g.draw.pop()!;
  }
  g.buang.push(first);
  g.giliran = g.dealer;
  push(g, { t: 'ronde', by: g.players[(g.dealer + 1) % n]!.id, kartu: [first] });
  g.awalWarna = false;
  if (first.t === 'wild') {
    // Resmi: pemain di kiri pembagi memilih warna, lalu bermain seperti biasa.
    g.warna = 'm';
    g.giliran = langkah(g, g.dealer, 1);
    g.awalWarna = true;
  } else {
    g.warna = first.w!;
    if (first.t === 'rev') {
      g.arah = -1;
      g.giliran = n === 2 ? (g.dealer + 1) % n : g.dealer;
    } else if (first.t === 'skip') g.giliran = langkah(g, g.dealer, 2);
    else {
      g.giliran = langkah(g, g.dealer, 1);
      if (first.t === '+2') {
        // Resmi: pemain pertama mengambil 2 dan kehilangan giliran.
        const p = cur(g);
        ambil(g, p, 2);
        push(g, { t: 'tarik', by: p.id, jumlah: 2 });
        g.giliran = langkah(g, g.giliran, 1);
      }
    }
  }
  mulaiGiliran(g, now);
}

function mulaiGiliran(g: Game, now: number) {
  const p = cur(g);
  g.ditarik = null;
  g.deadline = !p.bot && g.opts.waktu ? now + g.opts.waktu * 1000 : null;
  g.botAt = p.bot ? now + 1100 + Math.floor(rand(g) * 900) : null;
}

/** Akhiri giliran: majukan `k` langkah. */
function lanjut(g: Game, k: number, now: number) {
  g.giliran = langkah(g, g.giliran, k);
  mulaiGiliran(g, now);
}

/** Kerentanan "satu!" berakhir saat pemain lain mulai bertindak. */
function tutupRawan(g: Game, actor: string) {
  for (const p of g.players) if (p.rawan && p.id !== actor) p.rawan = false;
  g.rawanAt = null;
}

function mainkan(g: Game, p: Player, ids: number[], warna: Warna | undefined, target: string | undefined, now: number, salip = false) {
  if (!ids.length) fail('Pilih kartu.');
  const cards = ids.map((id) => p.hand.find((c) => c.id === id) ?? fail('Kartu itu tidak ada di tanganmu.'));
  if (new Set(ids).size !== ids.length) fail('Kartu ganda.');
  const first = cards[0]!;
  if (g.awalWarna) fail('Pilih warna pembuka dulu.');
  if (g.ditarik !== null && (cards.length !== 1 || first.id !== g.ditarik)) fail('Kamu hanya boleh memainkan kartu yang baru diambil.');
  if (!salip && !bisaMain(g, p.hand, first)) fail('Kartu itu tidak cocok.');
  if (cards.length > 1) {
    if (!g.opts.kembar) fail('Buang kembar tidak aktif di meja ini.');
    if (cards.some((c) => c.t !== first.t || isHitam(c))) fail('Kartu kembar harus bernilai sama dan bukan kartu hitam.');
  }
  if (larangTutup(g, p, cards)) fail('Aturan meja: kartu terakhir harus kartu angka.');
  const last = cards[cards.length - 1]!;
  if (isHitam(last) && (!warna || !WARNA.includes(warna))) fail('Pilih warna.');
  const tukar = g.opts.tujuhNol && last.t === '7' && p.hand.length > cards.length;
  if (tukar && (!target || target === p.id || !byId(g, target) || byId(g, target)!.selesai !== null)) fail('Pilih pemain untuk bertukar kartu.');

  // Sah tidaknya +4 dicatat sebelum kartu meninggalkan tangan.
  const sah = first.t !== '+4' || !p.hand.some((c) => c.w === g.warna && !ids.includes(c.id));
  tutupRawan(g, p.id);
  p.hand = p.hand.filter((c) => !ids.includes(c.id));
  g.buang.push(...cards);
  g.ditarik = null;
  g.warna = isHitam(last) ? warna! : last.w!;
  push(g, { t: salip ? 'salip' : 'main', by: p.id, kartu: cards, warna: isHitam(last) ? warna : undefined });
  if (p.hand.length === 1 && !p.satu) {
    p.rawan = true;
    g.rawanAt = now;
  }
  if (p.hand.length === 0) p.satu = false;

  const k = cards.length;
  const ada2 = aktif(g).length === 2;
  let maju = 1;
  switch (last.t) {
    case 'skip':
      maju = g.tarik > 0 ? 1 : 1 + k;
      break;
    case 'rev':
      if (k % 2) g.arah = (g.arah * -1) as 1 | -1;
      if (ada2 && g.tarik === 0) maju = 0;
      else if (ada2 && g.tarik > 0) maju = 1;
      break;
    case '+2':
      g.tarik += 2 * k;
      g.tarikJenis = '+2';
      g.plus4 = null;
      break;
    case '+4':
      g.tarik += 4;
      g.tarikJenis = '+4';
      g.plus4 = { by: p.id, sah };
      break;
    case '7':
      if (tukar) {
        const t = byId(g, target)!;
        [p.hand, t.hand] = [t.hand, p.hand];
        for (const x of [p, t]) (x.satu = false), (x.rawan = false);
        push(g, { t: 'tukar', by: p.id, target: t.id });
      }
      break;
    case '0':
      if (g.opts.tujuhNol && p.hand.length) {
        const ps = aktif(g);
        const hands = ps.map((x) => x.hand);
        ps.forEach((x, i) => (x.hand = hands[(((i - g.arah) % ps.length) + ps.length) % ps.length]!));
        for (const x of ps) (x.satu = false), (x.rawan = false);
        push(g, { t: 'putar' });
      }
      break;
  }
  if (p.hand.length === 0) return selesai(g, p, now, maju);
  if (maju === 0) return mulaiGiliran(g, now);
  lanjut(g, maju, now);
}

/** Pemain menghabiskan kartu: urutan selesai (pecundang) atau ronde berakhir dan dihitung. */
function selesai(g: Game, p: Player, now: number, maju: number) {
  g.urutan.push(p.id);
  p.selesai = g.urutan.length;
  p.rawan = false;
  push(g, { t: 'selesai', by: p.id, jumlah: p.selesai });
  if (g.opts.akhir === 'pecundang') {
    const sisa = aktif(g);
    if (sisa.length > 1) {
      // Giliran berlanjut ke pemain aktif berikutnya; tumpukan tambah tetap berlaku.
      g.giliran = g.players.indexOf(p);
      return lanjut(g, Math.max(1, maju), now);
    }
    const kalah = sisa[0]!;
    g.urutan.push(kalah.id);
    kalah.selesai = g.urutan.length;
    g.pemenang = g.urutan[0]!;
    g.kalah = kalah.id;
    g.phase = 'akhir';
    g.deadline = null;
    g.botAt = null;
    return;
  }
  // Resmi: kartu terakhir +2/+4 tetap diambil pemain berikutnya sebelum dihitung.
  if (g.tarik > 0) {
    const v = g.players[langkah(g, g.players.indexOf(p), 1)]!;
    ambil(g, v, g.tarik);
    push(g, { t: 'tarik', by: v.id, jumlah: g.tarik });
    g.tarik = 0;
  }
  const sisa = g.players.filter((x) => x !== p).map((x) => ({ pid: x.id, poin: x.hand.reduce((a, c) => a + poin(c), 0), kartu: x.hand.length }));
  const total = sisa.reduce((a, s) => a + s.poin, 0);
  p.skor += total;
  g.hasil = { r: g.ronde, pemenang: p.id, poin: total, sisa };
  g.botAt = null;
  g.deadline = null;
  if (g.opts.akhir === 'sekali' || p.skor >= g.opts.target) {
    g.pemenang = p.id;
    g.phase = 'akhir';
  } else {
    g.phase = 'jeda';
    g.deadline = now + JEDA_MS;
    for (const x of g.players) x.siap = x.bot;
  }
}

function tarikGiliran(g: Game, p: Player, now: number) {
  if (g.awalWarna) fail('Pilih warna pembuka dulu.');
  if (g.ditarik !== null) fail('Kamu sudah mengambil kartu. Mainkan atau lewati.');
  tutupRawan(g, p.id);
  if (g.tarik > 0) {
    const n = g.tarik;
    ambil(g, p, n);
    push(g, { t: 'tarik', by: p.id, jumlah: n });
    g.tarik = 0;
    g.tarikJenis = null;
    g.plus4 = null;
    return lanjut(g, 1, now);
  }
  const got: Card[] = [];
  do {
    const c = ambil(g, p, 1);
    if (!c.length) break;
    got.push(c[0]!);
  } while (g.opts.tarikSampai && !bisaMain(g, p.hand, got[got.length - 1]!));
  push(g, { t: 'tarik', by: p.id, jumlah: got.length });
  const last = got[got.length - 1];
  if (last && bisaMain(g, p.hand, last) && !larangTutup(g, p, [last])) {
    g.ditarik = last.id;
    return;
  }
  lanjut(g, 1, now);
}

// ── Aksi ────────────────────────────────────────────────────────────────────

const OPT_KEYS: (keyof Opts)[] = ['tumpuk', 'pantul', 'salip', 'kembar', 'tujuhNol', 'tarikSampai', 'plus4Bebas', 'tantang', 'tutupAngka', 'akhir', 'target', 'waktu'];

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
    case 'preset':
      lobby();
      g.opts = { ...(a.nama === 'ori' ? ORI : TONGKRONGAN), waktu: g.opts.waktu };
      break;
    case 'opsi': {
      lobby();
      const o = a.opts ?? {};
      for (const k of OPT_KEYS) {
        const v = o[k];
        if (v === undefined) continue;
        if (k === 'tumpuk' && !['tidak', 'sejenis', 'campur'].includes(v as string)) fail('Pilihan tumpuk tidak dikenal.');
        else if (k === 'akhir' && !['skor', 'sekali', 'pecundang'].includes(v as string)) fail('Pilihan akhir tidak dikenal.');
        else if (k === 'target' && ![100, 200, 300, 500].includes(v as number)) fail('Target 100, 200, 300, atau 500.');
        else if (k === 'waktu' && ![0, 15, 30, 60].includes(v as number)) fail('Waktu 0, 15, 30, atau 60 detik.');
        else if (!['tumpuk', 'akhir', 'target', 'waktu'].includes(k) && typeof v !== 'boolean') fail('Pilihan tidak sah.');
        (g.opts as unknown as Record<string, unknown>)[k] = v;
      }
      break;
    }
    case 'mulai':
      if (!host || g.phase !== 'lobby') fail('Hanya tuan rumah yang bisa memulai.');
      if (g.players.length < 2) fail('Butuh minimal 2 pemain. Tambahkan bot kalau sedang sendiri.');
      g.players = shuffle(g, g.players);
      for (const x of g.players) x.skor = 0;
      g.ronde = 0;
      g.log = [];
      g.n = 0;
      g.pemenang = null;
      g.kalah = null;
      mulaiRonde(g, now);
      break;
    case 'main':
      if (g.phase !== 'main' || cur(g) !== p) fail('Belum giliranmu.');
      mainkan(g, p, a.kartu ?? [], a.warna, a.target, now);
      break;
    case 'tarik':
      if (g.phase !== 'main' || cur(g) !== p) fail('Belum giliranmu.');
      tarikGiliran(g, p, now);
      break;
    case 'warna':
      if (g.phase !== 'main' || cur(g) !== p || !g.awalWarna) fail('Bukan saatnya memilih warna.');
      if (!WARNA.includes(a.warna)) fail('Warna tidak dikenal.');
      g.warna = a.warna;
      g.awalWarna = false;
      push(g, { t: 'main', by: p.id, warna: a.warna, kartu: [] });
      break;
    case 'lewat':
      if (g.phase !== 'main' || cur(g) !== p || g.ditarik === null) fail('Ambil kartu dulu.');
      push(g, { t: 'lewat', by: p.id });
      lanjut(g, 1, now);
      break;
    case 'tantang': {
      if (g.phase !== 'main' || cur(g) !== p || !bisaTantang(g)) fail('Tidak ada +4 yang bisa ditantang.');
      const pelaku = byId(g, g.plus4!.by)!;
      tutupRawan(g, p.id);
      const salah = !g.plus4!.sah;
      push(g, { t: 'tantang', by: p.id, target: pelaku.id, berhasil: salah });
      g.tarik = 0;
      g.tarikJenis = null;
      g.plus4 = null;
      if (salah) {
        // Pelaku terbukti curang: dia yang mengambil 4, penantang lanjut bermain.
        ambil(g, pelaku, 4);
        push(g, { t: 'tarik', by: pelaku.id, jumlah: 4 });
        mulaiGiliran(g, now);
      } else {
        ambil(g, p, 6);
        push(g, { t: 'tarik', by: p.id, jumlah: 6 });
        lanjut(g, 1, now);
      }
      break;
    }
    case 'satu':
      if (g.phase !== 'main' || p.selesai !== null || p.hand.length > 2) fail('"Satu!" diucapkan saat kartumu tinggal dua atau satu.');
      p.satu = true;
      p.rawan = false;
      push(g, { t: 'satu', by: p.id });
      break;
    case 'tangkap': {
      const t = byId(g, a.target);
      if (g.phase !== 'main' || !t || t === p || !t.rawan || t.hand.length !== 1) throw new GameError('Terlambat, atau dia sudah bilang "satu!".');
      t.rawan = false;
      ambil(g, t, HUKUM_SATU);
      push(g, { t: 'tangkap', by: p.id, target: t.id, jumlah: HUKUM_SATU });
      break;
    }
    case 'salip': {
      if (g.phase !== 'main' || !g.opts.salip || p.selesai !== null) fail('Salip tidak aktif.');
      if (g.tarik > 0 || g.ditarik !== null || g.awalWarna) fail('Tidak bisa menyalip sekarang.');
      const c = p.hand.find((x) => x.id === a.kartu) ?? fail('Kartu itu tidak ada di tanganmu.');
      const atas = top(g);
      if (isHitam(c) || c.w !== atas.w || c.t !== atas.t) fail('Salip hanya dengan kartu yang persis sama.');
      g.giliran = g.players.indexOf(p);
      mainkan(g, p, [c.id], undefined, undefined, now, true);
      break;
    }
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
      g.kalah = null;
      g.log = [];
      for (const x of g.players) Object.assign(x, { skor: 0, hand: [], selesai: null, satu: false, rawan: false, siap: false });
      break;
    default:
      fail('Aksi tidak dikenal.');
  }
  g.rev++;
}

export const bisaTantang = (g: Pick<Game, 'opts' | 'plus4' | 'tarik' | 'tarikJenis'>) => g.opts.tantang && !g.opts.plus4Bebas && !!g.plus4 && g.tarik === 4 && g.tarikJenis === '+4';

// ── Waktu & bot ─────────────────────────────────────────────────────────────

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
  // Bot menangkap yang lupa bilang "satu!" (tidak selalu sigap).
  const rawan = g.players.find((p) => p.rawan);
  const pemburu = g.players.filter((p) => p.bot && p !== rawan && p.selesai === null);
  if (rawan && g.rawanAt !== null && now >= g.rawanAt + 900 && pemburu.length) {
    g.rawanAt = null;
    if (rand(g) < 0.55) {
      const b = pemburu[Math.floor(rand(g) * pemburu.length)]!;
      act(g, b.id, { t: 'tangkap', target: rawan.id }, now);
      return true;
    }
  }
  const p = cur(g);
  if (p.bot && g.botAt === null) {
    g.botAt = now + 1000;
    return false;
  }
  const botDue = p.bot && g.botAt !== null && now >= g.botAt;
  const late = !p.bot && g.deadline !== null && now >= g.deadline;
  if (!botDue && !late) return false;
  botGiliran(g, p, now);
  g.rev++;
  return true;
}

function warnaTerbanyak(g: Game, hand: Card[]): Warna {
  const n: Record<Warna, number> = { m: 0, k: 0, h: 0, b: 0 };
  for (const c of hand) if (c.w) n[c.w] += 1 + poin(c) / 100;
  const best = WARNA.reduce((a, w) => (n[w] > n[a] ? w : a), WARNA[Math.floor(rand(g) * 4)]!);
  return best;
}

function botGiliran(g: Game, p: Player, now: number) {
  if (g.awalWarna) {
    g.warna = warnaTerbanyak(g, p.hand);
    g.awalWarna = false;
    push(g, { t: 'main', by: p.id, warna: g.warna, kartu: [] });
  }
  if (bisaTantang(g) && rand(g) < 0.22) return act(g, p.id, { t: 'tantang' }, now);
  const ids = bisaDimainkan(g, p);
  if (!ids.length) {
    if (g.ditarik !== null) return lewat(g, p, now);
    tarikGiliran(g, p, now);
    if (g.ditarik !== null && cur(g) === p) return botGiliran(g, p, now);
    return;
  }
  const next = g.players[langkah(g, g.giliran, 1)]!;
  const cards = ids.map((id) => p.hand.find((c) => c.id === id)!);
  const skor = (c: Card) => {
    let s = poin(c) / 10;
    if (g.tarik > 0) s += c.t === '+2' ? 6 : c.t === '+4' ? 4 : 5;
    if (isHitam(c)) s -= p.hand.length > 3 ? 6 : 0;
    if (['+2', 'skip', 'rev'].includes(c.t) && next.hand.length <= 2) s += 5;
    if (c.w && c.w === warnaTerbanyak(g, p.hand)) s += 1.5;
    return s + rand(g) * 0.5;
  };
  const pilih = cards.sort((a, b) => skor(b) - skor(a))[0]!;
  let main = [pilih.id];
  if (g.opts.kembar && !isHitam(pilih) && g.ditarik === null) {
    const kembar = p.hand.filter((c) => c.id !== pilih.id && c.t === pilih.t && !isHitam(c));
    const semua = [pilih, ...kembar];
    if (!larangTutup(g, p, semua)) main = semua.map((c) => c.id);
  }
  if (p.hand.length - main.length === 1 && rand(g) < 0.85) {
    p.satu = true;
    push(g, { t: 'satu', by: p.id });
  }
  const sisa = p.hand.filter((c) => !main.includes(c.id));
  const target = g.opts.tujuhNol && pilih.t === '7' ? aktif(g).filter((x) => x !== p).sort((a, b) => a.hand.length - b.hand.length)[0]?.id : undefined;
  mainkan(g, p, main, isHitam(pilih) ? warnaTerbanyak(g, sisa) : undefined, target, now);
}

function lewat(g: Game, p: Player, now: number) {
  push(g, { t: 'lewat', by: p.id });
  lanjut(g, 1, now);
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
  preset: 'ori' | 'tongkrongan' | 'racikan';
  ronde: number;
  giliran: string | null;
  arah: 1 | -1;
  atas: Card | null;
  warna: Warna;
  awalWarna: boolean;
  tarik: number;
  tarikJenis: '+2' | '+4' | null;
  tantang: boolean;
  ditarik: number | null;
  draw: number;
  players: { id: string; name: string; avatar: string; bot: boolean; kartu: number; skor: number; selesai: number | null; satu: boolean; rawan: boolean; siap: boolean }[];
  log: Ev[];
  hasil: Hasil | null;
  pemenang: string | null;
  kalah: string | null;
  urutan: string[];
  me: { id: string; hand: Card[]; bisa: number[]; salip: number[] } | null;
}

export function viewFor(g: Game, pid: string | null, now: number): View {
  const me = pid ? byId(g, pid) : undefined;
  const main = g.phase === 'main';
  const atas = g.buang.length ? top(g) : null;
  let bisa: number[] = [];
  let salip: number[] = [];
  if (me && main && me.selesai === null) {
    if (cur(g) === me && !g.awalWarna) bisa = bisaDimainkan(g, me);
    else if (g.opts.salip && g.tarik === 0 && g.ditarik === null && !g.awalWarna && atas && !isHitam(atas)) salip = me.hand.filter((c) => c.w === atas.w && c.t === atas.t && !larangTutup(g, me, [c])).map((c) => c.id);
  }
  return {
    code: g.code,
    rev: g.rev,
    now,
    deadline: g.deadline,
    phase: g.phase,
    host: g.host,
    opts: g.opts,
    preset: presetOf(g.opts),
    ronde: g.ronde,
    giliran: main ? cur(g).id : null,
    arah: g.arah,
    atas,
    warna: g.warna,
    awalWarna: main && g.awalWarna,
    tarik: g.tarik,
    tarikJenis: g.tarikJenis,
    tantang: main && bisaTantang(g),
    ditarik: g.ditarik,
    draw: g.draw.length,
    players: g.players.map((p) => ({ id: p.id, name: p.name, avatar: p.avatar, bot: p.bot, kartu: p.hand.length, skor: p.skor, selesai: p.selesai, satu: p.satu, rawan: p.rawan, siap: p.siap })),
    log: g.log.slice(-50),
    hasil: g.hasil,
    pemenang: g.pemenang,
    kalah: g.kalah,
    urutan: g.urutan,
    me: me ? { id: me.id, hand: me.hand, bisa, salip } : null,
  };
}
