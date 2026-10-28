/**
 * Mesin SEUMUR: menyusun satu kehidupan bersama, tanpa bicara.
 *
 * Alur: lobi → pembuka → (fokus → main) × ronde → jeda renung → bab berikutnya
 *       … → akhir. Satu kehidupan terdiri dari empat bab: Pagi, Siang, Sore,
 * Malam. Setiap ronde semua orang memegang kartu momen tanpa tahu usianya,
 * lalu meletakkannya ke garis hidup sesuai urutan usia. Kartu yang lebih muda
 * yang masih tertahan saat kartu lain diletakkan memadamkan satu lilin.
 */
import { BAB, MOMEN, type Momen, momenOf } from './momen';

export type Phase = 'lobby' | 'mulai' | 'fokus' | 'main' | 'jeda' | 'akhir';
export type Renung = 'sudah' | 'belum' | 'tidak';

export interface Player {
  id: string;
  name: string;
  avatar: string;
  guest: boolean;
  seat: number;
  tangan: string[];
  ready: boolean;
  /** Menahan jempol untuk fokus bersama. */
  fokus: boolean;
  /** Menahan tombol Napas Dalam. */
  napas: boolean;
  renung: Renung | null;
}

export interface Letak {
  id: string;
  by: string;
  terlambat: boolean;
  urut: number;
  bab: number;
}

export interface Kejadian {
  n: number;
  jenis: 'letak' | 'padam' | 'napas' | 'ronde' | 'bab' | 'akhir';
  by?: string;
  kartu?: string;
  terlambat?: string[];
}

export interface Opts {
  narasi: boolean;
  suara: boolean;
}

export interface Game {
  code: string;
  host: string;
  opts: Opts;
  phase: Phase;
  deadline: number | null;
  bab: number;
  ronde: number;
  lilin: number;
  lilinMax: number;
  napas: number;
  players: Player[];
  garis: Letak[];
  dipakai: string[];
  terbuka: string[];
  kejadian: Kejadian | null;
  sorotan: string | null;
  kehidupan: number;
  selesai: 'utuh' | 'berhenti' | null;
  berhentiUsia: number | null;
  rng: number;
  seq: number;
  rev: number;
  createdAt: number;
}

export class GameError extends Error {}
const no = (m: string): never => {
  throw new GameError(m);
};

export const MAX_PLAYERS = 10;
export const DUR = { mulai: 90_000, jeda: 150_000 };

/** Kartu per orang di setiap ronde sebuah bab. */
export const rondeFor = (n: number) => (n <= 2 ? [1, 2, 3, 4] : n <= 4 ? [1, 2, 3] : [1, 1, 2]);
export const lilinFor = (n: number) => 3 + Math.ceil(n / 2);
/** Selisih usia yang masih dianggap "sezaman" per bab: hidup tidak setepat angka. */
export const toleransiFor = (bab: number, n = 2) => ([1, 2, 2, 3][bab] ?? 2) + (n >= 9 ? 2 : n >= 4 ? 1 : 0);
export const NAPAS_MAX = 3;

function rand(g: Game): number {
  let t = (g.rng = (g.rng + 0x6d2b79f5) >>> 0);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
function shuffle<T>(g: Game, xs: readonly T[]): T[] {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand(g) * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

type NewPlayer = Pick<Player, 'id' | 'name' | 'avatar' | 'guest'>;
const fresh = (p: NewPlayer, seat: number): Player => ({ ...p, seat, tangan: [], ready: false, fokus: false, napas: false, renung: null });

export function newGame(code: string, host: NewPlayer, now: number, seed: number): Game {
  return {
    code,
    host: host.id,
    opts: { narasi: true, suara: true },
    phase: 'lobby',
    deadline: null,
    bab: 0,
    ronde: 0,
    lilin: 0,
    lilinMax: 0,
    napas: 0,
    players: [fresh(host, 0)],
    garis: [],
    dipakai: [],
    terbuka: [],
    kejadian: null,
    sorotan: null,
    kehidupan: 0,
    selesai: null,
    berhentiUsia: null,
    rng: seed >>> 0,
    seq: 0,
    rev: 1,
    createdAt: now,
  };
}

const bump = (g: Game) => void g.rev++;
const byId = (g: Game, id: string) => g.players.find((p) => p.id === id);
const P = (g: Game, id: string) => byId(g, id) ?? no('Pemain tidak ditemukan.');
const usia = (id: string) => momenOf(id)?.usia ?? 0;

export function join(g: Game, p: NewPlayer) {
  const ex = byId(g, p.id);
  if (ex) {
    ex.name = p.name;
    ex.avatar = p.avatar;
    return bump(g);
  }
  if (g.phase !== 'lobby') no('Kehidupan ini sudah dimulai.');
  if (g.players.length >= MAX_PLAYERS) no(`Meja penuh (maksimal ${MAX_PLAYERS}).`);
  if (g.players.some((x) => x.name.toLowerCase() === p.name.toLowerCase())) no('Nama itu sudah dipakai.');
  g.players.push(fresh(p, g.players.length));
  bump(g);
}

export function leave(g: Game, pid: string) {
  if (g.phase !== 'lobby') return;
  g.players = g.players.filter((p) => p.id !== pid);
  g.players.forEach((p, i) => (p.seat = i));
  if (g.host === pid && g.players[0]) g.host = g.players[0].id;
  bump(g);
}

function setPhase(g: Game, ph: Phase, deadline: number | null) {
  g.phase = ph;
  g.deadline = deadline;
  for (const p of g.players) {
    p.ready = false;
    p.fokus = false;
    p.napas = false;
  }
  bump(g);
}

const event = (g: Game, e: Omit<Kejadian, 'n'>) => {
  g.kejadian = { n: ++g.seq, ...e };
};

function mulaiKehidupan(g: Game) {
  const n = g.players.length;
  g.bab = 0;
  g.ronde = 0;
  g.lilinMax = lilinFor(n);
  g.lilin = g.lilinMax;
  g.napas = 1;
  g.garis = [];
  g.terbuka = [];
  g.sorotan = null;
  g.selesai = null;
  g.berhentiUsia = null;
  g.kehidupan++;
  for (const p of g.players) {
    p.tangan = [];
    p.renung = null;
  }
}

export function start(g: Game, by: string, now: number) {
  if (by !== g.host) no('Hanya tuan rumah yang bisa memulai.');
  if (g.phase !== 'lobby') no('Sudah dimulai.');
  if (g.players.length < 2) no('Butuh minimal dua orang. Untuk sendiri, mainkan Seumur Harian.');
  mulaiKehidupan(g);
  setPhase(g, 'mulai', now + DUR.mulai);
}

/** Bagikan kartu ronde ini dari rentang usia bab. */
function deal(g: Game) {
  const b = BAB[g.bab]!;
  const k = rondeFor(g.players.length)[g.ronde]!;
  let pool = MOMEN.filter((m) => m.usia >= b.dari && m.usia <= b.sampai && !g.dipakai.includes(m.id) && !g.garis.some((x) => x.id === m.id));
  if (pool.length < k * g.players.length) {
    g.dipakai = g.dipakai.filter((id) => g.garis.some((x) => x.id === id));
    pool = MOMEN.filter((m) => m.usia >= b.dari && m.usia <= b.sampai && !g.garis.some((x) => x.id === m.id));
  }
  const deck = shuffle(g, pool);
  for (const p of g.players) {
    p.tangan = deck.splice(0, k).map((m) => m.id);
    g.dipakai.push(...p.tangan);
  }
  g.terbuka = [];
  event(g, { jenis: 'ronde' });
}

// ── Aksi ────────────────────────────────────────────────────────────────────

export type Action =
  | { t: 'opts'; narasi?: boolean; suara?: boolean }
  | { t: 'start' }
  | { t: 'ready' }
  | { t: 'fokus'; tahan: boolean }
  | { t: 'napas'; tahan: boolean }
  | { t: 'letak'; kartu: string }
  | { t: 'renung'; jawab: Renung }
  | { t: 'ulang' }
  | { t: 'keluarkan'; pid: string };

export function act(g: Game, pid: string, a: Action, now: number) {
  const p = P(g, pid);
  switch (a.t) {
    case 'opts':
      if (pid !== g.host) no('Hanya tuan rumah.');
      if (a.narasi !== undefined) g.opts.narasi = !!a.narasi;
      if (a.suara !== undefined) g.opts.suara = !!a.suara;
      return bump(g);
    case 'start':
      return start(g, pid, now);
    case 'ready':
      if (g.phase !== 'mulai' && g.phase !== 'jeda') no('Belum saatnya.');
      p.ready = true;
      bump(g);
      return void tick(g, now);
    case 'fokus':
      if (g.phase !== 'fokus') no('Belum saatnya fokus.');
      p.fokus = !!a.tahan;
      bump(g);
      if (g.players.every((x) => x.fokus)) {
        deal(g);
        setPhase(g, 'main', null);
      }
      return;
    case 'napas': {
      if (g.phase !== 'main') no('Napas Dalam hanya saat bermain.');
      if (g.napas < 1) no('Napas Dalam sudah habis.');
      p.napas = !!a.tahan;
      bump(g);
      const holders = g.players.filter((x) => x.tangan.length);
      if (holders.length && holders.every((x) => x.napas)) {
        g.napas--;
        g.terbuka = holders.map((x) => [...x.tangan].sort((m1, m2) => usia(m1) - usia(m2))[0]!);
        for (const x of g.players) x.napas = false;
        event(g, { jenis: 'napas' });
      }
      return;
    }
    case 'letak':
      return letak(g, p, a.kartu, now);
    case 'renung':
      if (g.phase !== 'jeda') no('Belum saatnya merenung.');
      if (!['sudah', 'belum', 'tidak'].includes(a.jawab)) no('Pilihan tidak dikenal.');
      p.renung = a.jawab;
      return bump(g);
    case 'ulang':
      if (pid !== g.host) no('Hanya tuan rumah.');
      if (g.phase !== 'akhir') no('Kehidupan ini belum selesai.');
      mulaiKehidupan(g);
      return setPhase(g, 'fokus', null);
    case 'keluarkan': {
      if (pid !== g.host) no('Hanya tuan rumah.');
      if (a.pid === g.host) no('Tuan rumah tidak bisa dikeluarkan.');
      const t = P(g, a.pid);
      g.players = g.players.filter((x) => x.id !== t.id);
      g.players.forEach((x, i) => (x.seat = i));
      bump(g);
      if (g.phase === 'main' && g.players.every((x) => !x.tangan.length)) selesaiRonde(g, now);
      return void tick(g, now);
    }
  }
}

function letak(g: Game, p: Player, kartu: string, now: number) {
  if (g.phase !== 'main') no('Belum saatnya meletakkan.');
  if (!p.tangan.includes(kartu)) no('Kartu itu tidak ada di tanganmu.');
  const u = usia(kartu);
  p.tangan = p.tangan.filter((x) => x !== kartu);
  // Kartu yang lebih muda masih tertahan di tangan siapa pun?
  const telat: { id: string; by: string }[] = [];
  const tol = toleransiFor(g.bab, g.players.length);
  for (const x of g.players) {
    for (const id of x.tangan) if (usia(id) < u - tol) telat.push({ id, by: x.id });
    x.tangan = x.tangan.filter((id) => usia(id) >= u - tol);
  }
  for (const t of telat.sort((a, b) => usia(a.id) - usia(b.id))) g.garis.push({ id: t.id, by: t.by, terlambat: true, urut: ++g.seq, bab: g.bab });
  g.garis.push({ id: kartu, by: p.id, terlambat: false, urut: ++g.seq, bab: g.bab });
  g.terbuka = g.terbuka.filter((id) => id !== kartu && !telat.some((t) => t.id === id));
  if (telat.length) {
    g.lilin--;
    event(g, { jenis: 'padam', by: p.id, kartu, terlambat: telat.map((t) => t.id) });
    if (g.lilin <= 0) {
      g.selesai = 'berhenti';
      g.berhentiUsia = u;
      for (const x of g.players) x.tangan = [];
      event(g, { jenis: 'akhir', kartu });
      return setPhase(g, 'akhir', null);
    }
  } else event(g, { jenis: 'letak', by: p.id, kartu });
  bump(g);
  if (g.players.every((x) => !x.tangan.length)) selesaiRonde(g, now);
}

function selesaiRonde(g: Game, now: number) {
  const rounds = rondeFor(g.players.length);
  if (g.ronde + 1 < rounds.length) {
    g.ronde++;
    return setPhase(g, 'fokus', null);
  }
  // Bab selesai: sorot satu momen dari bab ini untuk direnungkan.
  const dariBab = g.garis.filter((x) => x.bab === g.bab);
  const pilih = shuffle(g, dariBab.filter((x) => !x.terlambat).length ? dariBab.filter((x) => !x.terlambat) : dariBab)[0];
  g.sorotan = pilih?.id ?? null;
  for (const x of g.players) x.renung = null;
  event(g, { jenis: 'bab' });
  setPhase(g, 'jeda', now + DUR.jeda);
}

function lanjutBab(g: Game) {
  if (g.bab >= BAB.length - 1) {
    g.selesai = 'utuh';
    event(g, { jenis: 'akhir' });
    return setPhase(g, 'akhir', null);
  }
  g.bab++;
  g.ronde = 0;
  g.lilin = Math.min(g.lilinMax, g.lilin + 1);
  g.napas = Math.min(NAPAS_MAX, g.napas + 1);
  g.sorotan = null;
  setPhase(g, 'fokus', null);
}

export function tick(g: Game, now: number): boolean {
  const all = g.players.every((p) => p.ready);
  const late = g.deadline !== null && now >= g.deadline;
  if (g.phase === 'mulai' && (all || late)) {
    setPhase(g, 'fokus', null);
    return true;
  }
  if (g.phase === 'jeda' && (all || late)) {
    lanjutBab(g);
    return true;
  }
  return false;
}

// ── Tampilan ────────────────────────────────────────────────────────────────

const kartuView = (id: string) => {
  const m = momenOf(id) as Momen;
  return { id, teks: m.teks, doodle: m.doodle, tema: m.tema };
};

export function viewFor(g: Game, pid: string | null, now: number) {
  const me = pid ? byId(g, pid) : undefined;
  const sorot = g.sorotan ? momenOf(g.sorotan) : null;
  const answered = g.players.filter((p) => p.renung);
  const allAnswered = answered.length === g.players.length;
  return {
    code: g.code,
    phase: g.phase,
    deadline: g.deadline,
    now,
    rev: g.rev,
    host: g.host,
    me: me?.id ?? null,
    opts: g.opts,
    bab: g.bab,
    babInfo: BAB[g.bab]!,
    ronde: g.ronde,
    rondeTotal: rondeFor(g.players.length).length,
    lilin: g.lilin,
    lilinMax: g.lilinMax,
    napas: g.napas,
    kehidupan: g.kehidupan,
    selesai: g.selesai,
    berhentiUsia: g.berhentiUsia,
    players: g.players.map((p) => ({ id: p.id, name: p.name, avatar: p.avatar, ready: p.ready, fokus: p.fokus, napas: p.napas, kartu: p.tangan.length, renung: !!p.renung })),
    garis: [...g.garis]
      .sort((a, b) => usia(a.id) - usia(b.id) || a.urut - b.urut)
      .map((x) => ({ ...kartuView(x.id), usia: usia(x.id), by: x.by, terlambat: x.terlambat, urut: x.urut, bab: x.bab })),
    terbuka: g.terbuka.map((id) => ({ ...kartuView(id), by: g.players.find((p) => p.tangan.includes(id))?.id ?? '' })),
    kejadian: g.kejadian,
    sorotan: sorot
      ? {
          ...kartuView(sorot.id),
          usia: sorot.usia,
          by: g.garis.find((x) => x.id === sorot.id)?.by ?? '',
          hitung: allAnswered || g.phase !== 'jeda' ? { sudah: answered.filter((p) => p.renung === 'sudah').length, belum: answered.filter((p) => p.renung === 'belum').length, tidak: answered.filter((p) => p.renung === 'tidak').length } : null,
        }
      : null,
    mine: me ? { tangan: me.tangan.map(kartuView), renung: me.renung, fokus: me.fokus, napas: me.napas } : null,
  };
}
export type View = ReturnType<typeof viewFor>;
