/**
 * KEMBANG API: permainan kooperatif untuk 2–5 orang dengan aturan Hanabi
 * lengkap. Kamu melihat kartu semua orang kecuali kartumu sendiri. Bersama,
 * susun kembang api 1–5 di setiap warna dengan petunjuk yang terbatas.
 *
 * - 50 kartu, 5 warna (1×3, 2×2, 3×2, 4×2, 5×1); tangan 5 kartu (2–3 orang)
 *   atau 4 kartu (4–5 orang); 8 token petunjuk, 3 sumbu.
 * - Giliran: beri petunjuk (warna atau angka, menunjuk SEMUA kartu yang cocok),
 *   buang (token kembali), atau mainkan (salah = sumbu terbakar).
 * - Menyelesaikan satu warna (kartu 5) mengembalikan satu token.
 * - Tumpukan habis: setiap orang mendapat satu giliran terakhir.
 * - Varian warna keenam: biasa (10 kartu), langka (1 kartu tiap angka),
 *   pelangi (tersentuh oleh setiap petunjuk warna).
 *
 * Murni (tanpa I/O): server, tes, dan bot memakai aturan yang persis sama.
 */

export type Warna = 'm' | 'k' | 'h' | 'b' | 'p' | 'x';
export const NAMA_WARNA: Record<Warna, string> = { m: 'merah', k: 'kuning', h: 'hijau', b: 'biru', p: 'putih', x: 'pelangi' };
export const ANGKA = [1, 2, 3, 4, 5] as const;
export const SEBARAN = [3, 2, 2, 2, 1];
export const TOKEN = 8;
export const SUMBU = 3;

export interface Card {
  id: number;
  w: Warna;
  n: number;
}

/** Pengetahuan yang terbuka tentang satu kartu: hasil semua petunjuk. */
export interface Tahu {
  warna: Warna[];
  angka: number[];
  /** Pernah disentuh petunjuk. */
  sentuh: boolean;
  /** Konvensi bot: petunjuk ini menandai kartu untuk dimainkan. */
  tanda: boolean;
}

export interface Opts {
  /** Warna keenam: tidak · biasa (10 kartu) · langka (1 tiap angka) · pelangi (tersentuh semua petunjuk warna). */
  warna6: 'tidak' | 'biasa' | 'langka' | 'pelangi';
  /** Catatan otomatis: kemungkinan warna & angka tiap kartu dari petunjuk. */
  catatan: boolean;
  waktu: number;
}

export const MAX_PLAYERS = 5;
export const tanganUntuk = (n: number) => (n <= 3 ? 5 : 4);
export const warnaMain = (o: Pick<Opts, 'warna6'>): Warna[] => (o.warna6 === 'tidak' ? ['m', 'k', 'h', 'b', 'p'] : ['m', 'k', 'h', 'b', 'p', 'x']);
/** Warna yang bisa dipakai sebagai petunjuk (pelangi tidak bisa disebut). */
export const warnaPetunjuk = (o: Pick<Opts, 'warna6'>): Warna[] => (o.warna6 === 'pelangi' ? ['m', 'k', 'h', 'b', 'p'] : warnaMain(o));
export const jumlahKartu = (o: Pick<Opts, 'warna6'>, w: Warna, n: number) => (w === 'x' && o.warna6 === 'langka' ? 1 : SEBARAN[n - 1]!);
export const skorMaks = (o: Pick<Opts, 'warna6'>) => warnaMain(o).length * 5;

export function fullDeck(o: Pick<Opts, 'warna6'>): Card[] {
  const d: Card[] = [];
  for (const w of warnaMain(o)) for (const n of ANGKA) for (let i = 0; i < jumlahKartu(o, w, n); i++) d.push({ id: d.length, w, n });
  return d;
}

/** Apakah petunjuk warna `w` menyentuh kartu berwarna `c`. */
export const sentuhWarna = (o: Pick<Opts, 'warna6'>, c: Warna, w: Warna) => c === w || (o.warna6 === 'pelangi' && c === 'x');

export function ulasan(skor: number, maks = 25) {
  const r = (skor / maks) * 25;
  if (skor === maks) return 'Legendaris. Semua orang terpana.';
  if (r >= 21) return 'Luar biasa. Akan dikenang lama.';
  if (r >= 16) return 'Bagus sekali. Penonton terkesan.';
  if (r >= 11) return 'Lumayan, tapi penonton cepat lupa.';
  if (r >= 6) return 'Biasa saja. Ada tepuk tangan sopan.';
  return 'Mengerikan. Penonton mencemooh.';
}

// ── Tipe ────────────────────────────────────────────────────────────────────

export interface Player {
  id: string;
  name: string;
  avatar: string;
  guest: boolean;
  bot: boolean;
  /** Indeks 0 = paling baru (kiri). */
  hand: Card[];
  tahu: Record<number, Tahu>;
}

export type Phase = 'lobby' | 'main' | 'akhir';

export interface Ev {
  n: number;
  t: 'mulai' | 'petunjuk' | 'main' | 'gagal' | 'buang' | 'selesai-warna' | 'terakhir' | 'akhir';
  by?: string;
  ke?: string;
  warna?: Warna;
  angka?: number;
  kartu?: Card;
  /** Kartu yang disentuh petunjuk. */
  sentuh?: number[];
  skor?: number;
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
  /** Kartu teratas yang sudah dimainkan per warna (0 = belum). */
  api: Record<Warna, number>;
  buang: Card[];
  token: number;
  sumbu: number;
  giliran: number;
  /** Sisa giliran setelah tumpukan habis; null = belum habis. */
  sisaAkhir: number | null;
  log: Ev[];
  n: number;
  skor: number | null;
  sebab: 'sempurna' | 'sumbu' | 'habis' | null;
  botAt: number | null;
}

export type Action =
  | { t: 'mulai' }
  | { t: 'bot'; tambah: boolean }
  | { t: 'opsi'; opts: Partial<Opts> }
  | { t: 'petunjuk'; ke: string; warna?: Warna; angka?: number }
  | { t: 'mainkan'; kartu: number }
  | { t: 'buang'; kartu: number }
  | { t: 'atur'; urutan: number[] }
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
const fresh = (p: NewPlayer, bot = false): Player => ({ ...p, bot, hand: [], tahu: {} });
const apiKosong = (): Record<Warna, number> => ({ m: 0, k: 0, h: 0, b: 0, p: 0, x: 0 });

export function newGame(code: string, host: NewPlayer, _now: number, seed: number): Game {
  return {
    code,
    host: host.id,
    rev: 1,
    deadline: null,
    phase: 'lobby',
    opts: { warna6: 'tidak', catatan: true, waktu: 0 },
    rng: seed >>> 0,
    players: [fresh(host)],
    deck: [],
    api: apiKosong(),
    buang: [],
    token: TOKEN,
    sumbu: SUMBU,
    giliran: 0,
    sisaAkhir: null,
    log: [],
    n: 0,
    skor: null,
    sebab: null,
    botAt: null,
  };
}

export const BOTS: [string, string][] = [
  ['Mbak Kembang', 'kupu-kupu'],
  ['Pak Petasan', 'burung'],
  ['Dik Lampion', 'kelinci'],
  ['Om Kilat', 'katak'],
];

export function join(g: Game, p: NewPlayer) {
  const me = g.players.find((x) => x.id === p.id);
  if (me) {
    me.name = p.name;
    me.avatar = p.avatar;
    me.bot = false;
  } else {
    if (g.phase !== 'lobby') fail('Permainan sudah berjalan. Tonton lewat mode TV, atau tunggu permainan berikutnya.');
    if (g.players.length >= MAX_PLAYERS) fail('Meja penuh (5 orang).');
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
const push = (g: Game, e: Omit<Ev, 'n'>) => g.log.push({ n: ++g.n, ...e });
const tahuBaru = (g: Game): Tahu => ({ warna: [...warnaMain(g.opts)], angka: [1, 2, 3, 4, 5], sentuh: false, tanda: false });
export const skorOf = (api: Record<Warna, number>) => Object.values(api).reduce((a, b) => a + b, 0);
export const bisaDimainkan = (api: Record<Warna, number>, c: Pick<Card, 'w' | 'n'>) => api[c.w] === c.n - 1;

function ambil(g: Game, p: Player) {
  const c = g.deck.shift();
  if (!c) return;
  p.hand.unshift(c);
  p.tahu[c.id] = tahuBaru(g);
  if (!g.deck.length && g.sisaAkhir === null) {
    // Kartu terakhir terambil: setiap orang (termasuk yang mengambilnya) dapat satu giliran lagi.
    g.sisaAkhir = g.players.length + 1;
    push(g, { t: 'terakhir', by: p.id });
  }
}

function mulai(g: Game, now: number) {
  g.players = shuffle(g, g.players);
  g.deck = shuffle(g, fullDeck(g.opts));
  g.api = apiKosong();
  g.buang = [];
  g.token = TOKEN;
  g.sumbu = SUMBU;
  g.sisaAkhir = null;
  g.skor = null;
  g.sebab = null;
  g.log = [];
  g.n = 0;
  const k = tanganUntuk(g.players.length);
  for (const p of g.players) {
    p.hand = [];
    p.tahu = {};
    for (let i = 0; i < k; i++) ambil(g, p);
  }
  g.giliran = 0;
  g.phase = 'main';
  push(g, { t: 'mulai', by: cur(g).id });
  mulaiGiliran(g, now);
}

function mulaiGiliran(g: Game, now: number) {
  const p = cur(g);
  g.deadline = !p.bot && g.opts.waktu ? now + g.opts.waktu * 1000 : null;
  g.botAt = p.bot ? now + 1500 + Math.floor(rand(g) * 1000) : null;
}

function akhiri(g: Game, sebab: Game['sebab']) {
  g.phase = 'akhir';
  g.sebab = sebab;
  g.skor = sebab === 'sumbu' ? 0 : skorOf(g.api);
  g.deadline = null;
  g.botAt = null;
  push(g, { t: 'akhir', skor: g.skor });
}

function selesaiGiliran(g: Game, now: number) {
  if (g.sumbu <= 0) return akhiri(g, 'sumbu');
  if (skorOf(g.api) === skorMaks(g.opts)) return akhiri(g, 'sempurna');
  if (g.sisaAkhir !== null) {
    g.sisaAkhir--;
    if (g.sisaAkhir <= 0) return akhiri(g, 'habis');
  }
  g.giliran = (g.giliran + 1) % g.players.length;
  mulaiGiliran(g, now);
}

function kartuDi(p: Player, id: number) {
  const c = p.hand.find((x) => x.id === id) ?? fail('Kartu itu tidak ada di tanganmu.');
  return c;
}

function lepas(p: Player, c: Card) {
  p.hand = p.hand.filter((x) => x !== c);
  delete p.tahu[c.id];
}

function petunjuk(g: Game, p: Player, keId: string, warna: Warna | undefined, angka: number | undefined) {
  if (g.token <= 0) fail('Token petunjuk habis. Buang kartu untuk mendapatkannya kembali.');
  const t = byId(g, keId);
  if (!t || t === p) fail('Pilih pemain lain.');
  if ((warna === undefined) === (angka === undefined)) fail('Pilih satu: warna atau angka.');
  if (warna !== undefined && !warnaPetunjuk(g.opts).includes(warna)) fail('Warna itu tidak bisa disebut.');
  if (angka !== undefined && !ANGKA.includes(angka as 1)) fail('Angka 1 sampai 5.');
  const kena = t!.hand.filter((c) => (warna ? sentuhWarna(g.opts, c.w, warna) : c.n === angka));
  if (!kena.length) fail('Petunjuk harus menunjuk setidaknya satu kartu.');
  const chop = [...t!.hand].reverse().find((c) => !t!.tahu[c.id]!.sentuh);
  for (const c of t!.hand) {
    const k = t!.tahu[c.id]!;
    const ya = kena.includes(c);
    if (warna) k.warna = k.warna.filter((w) => (ya ? sentuhWarna(g.opts, w, warna) : !sentuhWarna(g.opts, w, warna)));
    else k.angka = k.angka.filter((n) => (ya ? n === angka : n !== angka));
    if (ya) k.sentuh = true;
  }
  // Konvensi bot: kartu tersentuh paling baru yang belum ditandai = "mainkan ini",
  // kecuali petunjuk angka yang jatuh di kartu tertua (chop) = "simpan, jangan dibuang".
  const fokus = kena.find((c) => !t!.tahu[c.id]!.tanda);
  if (fokus && !(angka !== undefined && fokus === chop)) t!.tahu[fokus.id]!.tanda = true;
  g.token--;
  push(g, { t: 'petunjuk', by: p.id, ke: t!.id, warna, angka, sentuh: kena.map((c) => c.id) });
}

function mainkan(g: Game, p: Player, id: number) {
  const c = kartuDi(p, id);
  lepas(p, c);
  if (bisaDimainkan(g.api, c)) {
    g.api[c.w] = c.n;
    push(g, { t: 'main', by: p.id, kartu: c });
    if (c.n === 5) {
      if (g.token < TOKEN) g.token++;
      push(g, { t: 'selesai-warna', by: p.id, warna: c.w });
    }
  } else {
    g.sumbu--;
    g.buang.push(c);
    push(g, { t: 'gagal', by: p.id, kartu: c });
  }
  ambil(g, p);
}

function buang(g: Game, p: Player, id: number) {
  if (g.token >= TOKEN) fail('Token petunjuk masih penuh: tidak boleh membuang.');
  const c = kartuDi(p, id);
  lepas(p, c);
  g.buang.push(c);
  g.token++;
  push(g, { t: 'buang', by: p.id, kartu: c });
  ambil(g, p);
}

// ── Aksi ────────────────────────────────────────────────────────────────────

export function act(g: Game, pid: string, a: Action, now: number) {
  const p = byId(g, pid) ?? fail('Kamu belum duduk di meja ini.');
  const host = pid === g.host;
  const lobby = () => (!host || g.phase !== 'lobby') && fail('Hanya tuan rumah, sebelum mulai.');
  const giliran = () => (g.phase !== 'main' || cur(g) !== p) && fail('Belum giliranmu.');
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
      if (o.warna6 && ['tidak', 'biasa', 'langka', 'pelangi'].includes(o.warna6)) g.opts.warna6 = o.warna6;
      if (typeof o.catatan === 'boolean') g.opts.catatan = o.catatan;
      if (o.waktu !== undefined && [0, 30, 60, 90].includes(o.waktu)) g.opts.waktu = o.waktu;
      break;
    }
    case 'mulai':
      if (!host || g.phase !== 'lobby') fail('Hanya tuan rumah yang bisa memulai.');
      if (g.players.length < 2) fail('Butuh minimal 2 pemain. Tambahkan bot kalau sedang sendiri.');
      mulai(g, now);
      break;
    case 'petunjuk':
      giliran();
      petunjuk(g, p, a.ke, a.warna, a.angka);
      selesaiGiliran(g, now);
      break;
    case 'mainkan':
      giliran();
      mainkan(g, p, a.kartu);
      selesaiGiliran(g, now);
      break;
    case 'buang':
      giliran();
      buang(g, p, a.kartu);
      selesaiGiliran(g, now);
      break;
    case 'atur': {
      if (g.phase !== 'main') fail('Permainan tidak berjalan.');
      const u = a.urutan ?? [];
      if (u.length !== p.hand.length || !p.hand.every((c) => u.includes(c.id))) fail('Urutan tidak sah.');
      p.hand = u.map((id) => p.hand.find((c) => c.id === id)!);
      break;
    }
    case 'lagi':
      if (!host || g.phase !== 'akhir') fail('Hanya tuan rumah.');
      g.phase = 'lobby';
      g.log = [];
      g.skor = null;
      g.sebab = null;
      g.deadline = null;
      for (const x of g.players) Object.assign(x, { hand: [], tahu: {} });
      break;
    default:
      fail('Aksi tidak dikenal.');
  }
  g.rev++;
}

// ── Bot ─────────────────────────────────────────────────────────────────────

export function tick(g: Game, now: number): boolean {
  if (g.phase !== 'main') return false;
  const p = cur(g);
  if (p.bot && g.botAt === null) {
    g.botAt = now + 1200;
    return false;
  }
  const botDue = p.bot && g.botAt !== null && now >= g.botAt;
  const late = !p.bot && g.deadline !== null && now >= g.deadline;
  if (!botDue && !late) return false;
  const a = langkahBot(g, p);
  act(g, p.id, a, now);
  return true;
}

/** Jumlah salinan kartu (w, n) yang masih bisa muncul (belum dibuang). */
function sisaSalinan(g: Game, w: Warna, n: number) {
  return jumlahKartu(g.opts, w, n) - g.buang.filter((c) => c.w === w && c.n === n).length;
}
/** Kartu sudah tidak berguna: angkanya sudah dimainkan, atau warnanya mustahil dilanjutkan. */
function sampah(g: Game, c: Pick<Card, 'w' | 'n'>) {
  if (g.api[c.w] >= c.n) return true;
  for (let n = g.api[c.w] + 1; n < c.n; n++) if (sisaSalinan(g, c.w, n) <= 0) return true;
  return false;
}
/** Kartu kritis: salinan terakhir yang masih dibutuhkan. */
const kritis = (g: Game, c: Card) => !sampah(g, c) && sisaSalinan(g, c.w, c.n) === 1;

/** Kemungkinan identitas kartu menurut pemegangnya (petunjuk + kartu yang terlihat). */
function kemungkinan(g: Game, p: Player, c: Card): { w: Warna; n: number }[] {
  const k = p.tahu[c.id]!;
  const terlihat = new Map<string, number>();
  const tambah = (x: Card) => terlihat.set(`${x.w}${x.n}`, (terlihat.get(`${x.w}${x.n}`) ?? 0) + 1);
  for (const x of g.buang) tambah(x);
  for (const q of g.players) if (q !== p) q.hand.forEach(tambah);
  for (const w of warnaMain(g.opts)) for (let n = 1; n <= g.api[w]; n++) terlihat.set(`${w}${n}`, (terlihat.get(`${w}${n}`) ?? 0) + 1);
  const out: { w: Warna; n: number }[] = [];
  for (const w of k.warna) for (const n of k.angka) if (jumlahKartu(g.opts, w, n) - (terlihat.get(`${w}${n}`) ?? 0) > 0) out.push({ w, n });
  return out.length ? out : k.warna.flatMap((w) => k.angka.map((n) => ({ w, n })));
}

function langkahBot(g: Game, p: Player): Action {
  const hand = p.hand;
  // 1. Mainkan kartu yang pasti bisa dimainkan, atau yang ditandai dan mungkin bisa.
  for (const c of hand) {
    const ks = kemungkinan(g, p, c);
    if (ks.every((x) => bisaDimainkan(g.api, x))) return { t: 'mainkan', kartu: c.id };
  }
  // Kartu bertanda dimainkan bila cukup mungkin; makin sedikit sumbu, makin hati-hati.
  const ambang = g.sumbu >= 3 ? 0.25 : g.sumbu === 2 ? 0.5 : 1;
  for (const c of hand) {
    const k = p.tahu[c.id]!;
    const ks = kemungkinan(g, p, c);
    const peluang = ks.filter((x) => bisaDimainkan(g.api, x)).length / ks.length;
    if (k.tanda && peluang > 0 && peluang >= ambang) return { t: 'mainkan', kartu: c.id };
  }
  const lain = [...g.players.slice(g.giliran + 1), ...g.players.slice(0, g.giliran)];
  if (g.token > 0) {
    // 2. Selamatkan kartu kritis di ujung tangan pemain berikutnya.
    const nx = lain[0]!;
    const chop = [...nx.hand].reverse().find((c) => !nx.tahu[c.id]!.sentuh);
    const bakalBuang = g.token < TOKEN && !nx.hand.some((c) => nx.tahu[c.id]!.tanda);
    if (chop && bakalBuang && (kritis(g, chop) || (chop.n === 2 && g.api[chop.w] < 2 && g.token > 2)) && !bisaDimainkan(g.api, chop)) return { t: 'petunjuk', ke: nx.id, angka: chop.n };
    // 3. Petunjuk "mainkan": kartu yang bisa dimainkan jadi fokus (tersentuh paling baru).
    for (const q of lain) {
      for (const c of q.hand) {
        const k = q.tahu[c.id]!;
        if (!bisaDimainkan(g.api, c) || k.tanda) continue;
        const sudahDitunggu = g.players.some((r) => r.hand.some((x) => x !== c && x.w === c.w && x.n === c.n && r.tahu[x.id]!.tanda));
        if (sudahDitunggu) continue;
        const pilihan: { warna?: Warna; angka?: number }[] = [{ angka: c.n }, ...warnaPetunjuk(g.opts).filter((w) => sentuhWarna(g.opts, c.w, w)).map((w) => ({ warna: w }))];
        for (const pl of pilihan) {
          const kena = q.hand.filter((x) => (pl.warna ? sentuhWarna(g.opts, x.w, pl.warna) : x.n === pl.angka));
          const fokus = kena.find((x) => !q.tahu[x.id]!.tanda);
          if (fokus === c) return { t: 'petunjuk', ke: q.id, ...pl };
        }
      }
    }
  }
  // 4. Buang kartu yang pasti sampah, lalu kartu paling tua yang belum tersentuh.
  if (g.token < TOKEN) {
    const sampahku = hand.find((c) => kemungkinan(g, p, c).every((x) => sampah(g, x)));
    if (sampahku) return { t: 'buang', kartu: sampahku.id };
    const chop = [...hand].reverse().find((c) => !p.tahu[c.id]!.sentuh) ?? hand[hand.length - 1]!;
    return { t: 'buang', kartu: chop.id };
  }
  // 5. Token penuh: beri petunjuk apa saja yang aman (angka pada kartu tertua pemain berikutnya).
  for (const q of lain) {
    const c = q.hand[q.hand.length - 1];
    if (c) return { t: 'petunjuk', ke: q.id, angka: c.n };
  }
  return { t: 'mainkan', kartu: hand[0]!.id };
}

// ── Tampilan ────────────────────────────────────────────────────────────────

export interface KartuTampil {
  id: number;
  /** Untukmu sendiri: null (tidak terlihat). */
  w: Warna | null;
  n: number | null;
  tahu: Tahu;
}

export interface View {
  code: string;
  rev: number;
  now: number;
  deadline: number | null;
  phase: Phase;
  host: string;
  opts: Opts;
  giliran: string | null;
  api: Record<Warna, number>;
  buang: Card[];
  deck: number;
  token: number;
  sumbu: number;
  sisaAkhir: number | null;
  players: { id: string; name: string; avatar: string; bot: boolean; hand: KartuTampil[] }[];
  log: Ev[];
  skor: number | null;
  sebab: Game['sebab'];
  me: { id: string } | null;
}

export function viewFor(g: Game, pid: string | null, now: number): View {
  const me = pid ? byId(g, pid) : undefined;
  const sembunyi = !g.opts.catatan;
  return {
    code: g.code,
    rev: g.rev,
    now,
    deadline: g.deadline,
    phase: g.phase,
    host: g.host,
    opts: g.opts,
    giliran: g.phase === 'main' ? cur(g).id : null,
    api: g.api,
    buang: g.buang,
    deck: g.deck.length,
    token: g.token,
    sumbu: g.sumbu,
    sisaAkhir: g.sisaAkhir,
    // Kartumu sendiri tersembunyi; kartu orang lain terlihat. Di akhir permainan semua terbuka.
    players: g.players.map((p) => ({
      id: p.id,
      name: p.name,
      avatar: p.avatar,
      bot: p.bot,
      hand: p.hand.map((c) => {
        const t = p.tahu[c.id]!;
        const lihat = p !== me || g.phase === 'akhir';
        // Tanpa catatan otomatis: pemain harus mengingat sendiri petunjuk yang diterimanya.
        return { id: c.id, w: lihat ? c.w : null, n: lihat ? c.n : null, tahu: sembunyi ? { warna: [], angka: [], sentuh: false, tanda: false } : t };
      }),
    })),
    log: g.log.slice(-60),
    skor: g.skor,
    sebab: g.sebab,
    me: me ? { id: me.id } : null,
  };
}
