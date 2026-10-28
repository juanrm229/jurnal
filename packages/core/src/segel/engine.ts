/**
 * Mesin SEBELUM DISEGEL. Murni (tanpa I/O): server, tes, dan simulator
 * keseimbangan memakai aturan yang sama persis. Aplikasi menjadi moderator:
 * mencatat versi salinan, menyelesaikan urutan efek, memeriksa rantai bukti.
 *
 * Alur: lobi → pembuka → peran → (aksi → runding → segel teori) ×3
 *       → bab 4: cadangan → aksi → runding → segel akhir → putusan → tebak → akhir.
 * Tidak ada eliminasi. Semua bicara dan memberi suara sampai arsip disegel.
 */
import {
  ANCHORS,
  type Anchor,
  applyEdit,
  canEdit,
  type Dim,
  type EditKind,
  type Fact,
  generate,
  indexTitle,
  isHard,
  type Item,
  type Model,
  type Report,
  routeOf,
  sameFact,
  timeOf,
  worlds,
  type World,
} from './kasus';
import { autoScript, jinxed, PROFS, paguFor, pickProfs, type ProfId, revisiFor, scriptOf } from './profesi';
import { TEMA, temaOf } from './tema';

export type Kubu = 'restorasi' | 'revisi';
export type Phase = 'lobby' | 'intro' | 'peran' | 'aksi' | 'runding' | 'segel' | 'pulih' | 'vonis' | 'tebak' | 'end';

export interface Player {
  id: string;
  name: string;
  avatar: string;
  guest: boolean;
  seat: number;
  prof: ProfId | null;
  kubu: Kubu | null;
  ready: boolean;
  lensa: number;
  /** Kemampuan profesi sudah terpakai. */
  used: boolean;
  /** Sisa tinta Revisi. */
  tinta: number;
  biro: number;
}

export interface Edit {
  bab: number;
  by: string;
  kind: EditKind | 'pulih';
  prev: Fact;
  prevBlur: boolean;
}

export type Via = 'bagi' | 'audit' | 'kirim' | 'kurir' | 'karbon' | 'asli' | 'keluaran' | 'alih' | 'cadangan' | 'umpan';

export interface Copy {
  cid: string;
  rid: string;
  f: Fact;
  blur: boolean;
  hist: Edit[];
  /** Cap ASAL TERBUKTI. */
  stamp: boolean;
  via: Via;
  /** Pengirim ('' = tanpa nama). */
  from: string;
  bab: number;
  hidden: boolean;
}

export interface Pub {
  id: string;
  by: string;
  bab: number;
  c: Copy;
  bantah: boolean;
  umpan: boolean;
}

export interface Cert {
  id: string;
  bab: number;
  by: string;
  a: Anchor;
  v: number;
  cite: string[];
  ok: boolean;
}

export interface Note {
  id: string;
  /** id pemain, '*' semua, 'revisi' tim Revisi. */
  to: string;
  bab: number;
  kind: 'hasil' | 'gagal' | 'publik' | 'lensa' | 'kiriman' | 'rahasia';
  text: string;
  cid?: string;
}

export type MainKind = 'terbit' | 'kirim' | 'audit' | 'profesi' | 'bukti' | 'tinta' | 'diam';

export interface Main {
  k: MainKind;
  cid?: string;
  to?: string;
  rid?: string;
  rid2?: string;
  dev?: number;
  r?: number;
  t?: number;
  x?: number;
  pl?: string;
  pls?: string[];
  act?: MainKind;
  a?: Anchor;
  v?: number;
  v2?: number;
  pub?: string;
  pred?: 'versi' | 'terbit' | 'profesi';
  edit?: 'jam' | 'label';
  cite?: string[];
}

export interface Theory {
  p: number;
  r: number;
  t: number;
}

export interface LogItem {
  bab: number;
  by: string;
  text: string;
  secret: boolean;
}

export interface Result {
  winner: Kubu;
  reason: 'benar' | 'salah' | 'buntu' | 'lemah';
  sempurna: boolean;
  caught: string[];
  anchors: Record<Anchor, number | null>;
  chain: Record<Anchor, boolean>;
}

export interface Opts {
  /** Detik runding tiap bab. */
  talk: number;
  tema: string;
  script: string;
  narrator: boolean;
}

export interface Game {
  code: string;
  host: string;
  opts: Opts;
  temaId: string;
  scriptId: string;
  phase: Phase;
  deadline: number | null;
  bab: number;
  coop: boolean;
  players: Player[];
  inPlay: ProfId[];
  model: Model | null;
  reports: Report[];
  copies: Record<string, Copy[]>;
  board: Pub[];
  certs: Cert[];
  notes: Note[];
  acts: Record<string, Main>;
  /** bab → pemain → jenis aksi (untuk kontrak & penagih janji). */
  actLog: Record<string, Record<string, MainKind>>;
  protect: string[];
  contracts: { by: string; bab: number; pred: 'versi' | 'terbit' | 'profesi'; rid?: string; pl?: string }[];
  senja: { by: string; rid: string; f: Fact; blur: boolean; bab: number; restored: boolean }[];
  queue: { bab: number; to: string; notes: Note[]; cids: string[] }[];
  held: { bab: number; by: string; main: Main }[];
  edits: { bab: number; by: string; rid: string; kind: EditKind | 'pulih' }[];
  theory: Record<string, Record<string, Theory>>;
  pullVote: Record<string, string[]>;
  extra: Record<string, string>;
  pulled: string[];
  vote: Record<string, Partial<Theory>>;
  voteRound: number;
  open: Anchor[];
  anchors: Record<Anchor, number | null>;
  tally: Record<Anchor, Record<number, number>>[];
  guess: Record<string, string>;
  /** Lampiran arsip final (segel akhir, gratis). */
  attach: Record<string, string[]>;
  result: Result | null;
  log: LogItem[];
  pagu: number;
  lensaCap: number;
  qn: number;
  rng: number;
  seq: number;
  rev: number;
  createdAt: number;
}

export class GameError extends Error {}
const no = (m: string): never => {
  throw new GameError(m);
};

export const DUR = { intro: 45_000, peran: 35_000, aksi: 100_000, segel: 45_000, pulih: 50_000, vonis: 60_000, tebak: 40_000 };
export const MAX_PLAYERS = 16;
/** Tinta Revisi per orang: Revisi yang sendirian mendapat dua. */
export const tintaFor = (n: number) => (n <= 7 ? 2 : 1);
export const BUKTI_CAP = (bab: number) => (bab <= 1 ? 0 : bab === 2 ? 1 : 3);

// ── Acak yang bisa diulang ──────────────────────────────────────────────────

function rand(g: Game): number {
  let t = (g.rng = (g.rng + 0x6d2b79f5) >>> 0);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const pick = <T>(g: Game, xs: T[]): T => xs[Math.floor(rand(g) * xs.length)]!;
function shuffle<T>(g: Game, xs: T[]): T[] {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand(g) * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}
const nid = (g: Game, p = 'n') => `${p}${(g.seq++).toString(36)}`;

export const temaOfGame = (g: Pick<Game, 'temaId'>) => temaOf(g.temaId);
export const dimOf = (g: Game): Dim => g.model!.dim;

// ── Pembuatan & lobi ────────────────────────────────────────────────────────

type NewPlayer = Pick<Player, 'id' | 'name' | 'avatar' | 'guest'>;
const fresh = (p: NewPlayer, seat: number): Player => ({ ...p, seat, prof: null, kubu: null, ready: false, lensa: 1, used: false, tinta: 0, biro: 0 });

export function newGame(code: string, host: NewPlayer, now: number, seed: number): Game {
  return {
    code,
    host: host.id,
    opts: { talk: 240, tema: 'acak', script: 'auto', narrator: true },
    temaId: TEMA[0]!.id,
    scriptId: 'salah_alamat',
    phase: 'lobby',
    deadline: null,
    bab: 0,
    coop: false,
    players: [fresh(host, 0)],
    inPlay: [],
    model: null,
    reports: [],
    copies: {},
    board: [],
    certs: [],
    notes: [],
    acts: {},
    actLog: {},
    protect: [],
    contracts: [],
    senja: [],
    queue: [],
    held: [],
    edits: [],
    theory: {},
    pullVote: {},
    extra: {},
    pulled: [],
    vote: {},
    voteRound: 0,
    open: [],
    anchors: { p: null, r: null, t: null },
    tally: [],
    guess: {},
    attach: {},
    result: null,
    log: [],
    pagu: 2,
    lensaCap: 2,
    qn: 0,
    rng: seed >>> 0,
    seq: 0,
    rev: 1,
    createdAt: now,
  };
}

const bump = (g: Game) => {
  g.rev++;
};

export function join(g: Game, p: NewPlayer) {
  const ex = g.players.find((x) => x.id === p.id);
  if (ex) {
    ex.name = p.name;
    ex.avatar = p.avatar;
    bump(g);
    return;
  }
  if (g.phase !== 'lobby') no('Permainan sudah berjalan.');
  if (g.players.length >= MAX_PLAYERS) no(`Meja penuh (maksimal ${MAX_PLAYERS}).`);
  if (g.players.some((x) => x.name.toLowerCase() === p.name.toLowerCase())) no('Nama itu sudah dipakai di meja ini.');
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

const byId = (g: Game, id: string) => g.players.find((p) => p.id === id);
const P = (g: Game, id: string) => byId(g, id) ?? no('Pemain tidak ditemukan.');
const nameOf = (g: Game, id: string) => byId(g, id)?.name ?? '—';

export function start(g: Game, by: string, now: number) {
  if (by !== g.host) no('Hanya tuan rumah yang bisa membuka arsip.');
  if (g.phase !== 'lobby') no('Sudah dimulai.');
  const n = g.players.length;
  if (n < 2) no('Butuh minimal dua orang.');
  g.coop = n <= 4;
  const script = g.opts.script === 'auto' ? autoScript(n) : scriptOf(g.opts.script);
  if (n < script.min || n > script.max) no(`Script ${script.nama} untuk ${script.min}–${script.max} orang.`);
  g.scriptId = script.id;
  g.temaId = g.opts.tema === 'acak' ? pick(g, TEMA).id : temaOf(g.opts.tema).id;
  g.players = shuffle(g, g.players);
  g.players.forEach((p, i) => (p.seat = i));
  const rev = revisiFor(n);
  const revSeats = shuffle(g, g.players.map((p) => p.seat)).slice(0, rev);
  const profs = pickProfs(n, script, () => rand(g));
  g.inPlay = profs;
  const biros = n >= 11 ? (n <= 12 ? 3 : 4) : 1;
  g.players.forEach((p, i) => {
    p.prof = profs[i]!;
    p.kubu = revSeats.includes(p.seat) ? 'revisi' : 'restorasi';
    p.tinta = p.kubu === 'revisi' ? tintaFor(n) : 0;
    p.lensa = p.prof === 'pemutus_seri' ? 2 : 1;
    p.used = false;
    p.ready = false;
    p.biro = i % biros;
  });
  g.pagu = paguFor(n);
  g.lensaCap = jinxed(profs, 'pengasah_lensa', 'notaris') ? 3 : 2;
  const k = generate(n, revSeats, () => rand(g));
  g.model = k.model;
  g.reports = k.reports;
  g.copies = Object.fromEntries(g.players.map((p) => [p.id, [] as Copy[]]));
  for (const r of g.reports) {
    const p = g.players[r.holder]!;
    give(g, p.id, r.id, r.f, false, 'bagi', '', false, r.ch > 1).bab = r.ch;
  }
  g.bab = 0;
  setPhase(g, 'intro', now + DUR.intro);
}

function setPhase(g: Game, ph: Phase, deadline: number | null) {
  g.phase = ph;
  g.deadline = deadline;
  for (const p of g.players) p.ready = false;
  bump(g);
}

// ── Pembantu salinan ────────────────────────────────────────────────────────

const rep = (g: Game, rid: string) => g.reports.find((r) => r.id === rid);
const holderOf = (g: Game, rid: string) => {
  const r = rep(g, rid);
  return r && r.holder >= 0 ? g.players[r.holder] : undefined;
};
const holderCopy = (g: Game, rid: string) => {
  const h = holderOf(g, rid);
  return h ? g.copies[h.id]?.find((c) => c.rid === rid && c.via === 'bagi') : undefined;
};
export const originTrue = (g: Game, c: Pick<Copy, 'rid' | 'f' | 'blur'>) => {
  const r = rep(g, c.rid);
  return !!r && !r.umpan && !c.blur && sameFact(c.f, r.f);
};

function give(g: Game, to: string, rid: string, f: Fact, blur: boolean, via: Via, from: string, stamp: boolean, hidden = false): Copy {
  const c: Copy = { cid: nid(g, 'c'), rid, f: structuredClone(f), blur, hist: [], stamp, via, from, bab: g.bab, hidden };
  (g.copies[to] ??= []).push(c);
  return c;
}
const findCopy = (g: Game, pid: string, cid: string) => g.copies[pid]?.find((c) => c.cid === cid && !c.hidden);

function activeEdits(g: Game): number {
  return g.reports.filter((r) => {
    const c = holderCopy(g, r.id);
    return c && !r.out && !r.umpan && !originTrue(g, c);
  }).length;
}

function note(g: Game, to: string, kind: Note['kind'], text: string, cid?: string): Note {
  const n: Note = { id: nid(g), to, bab: g.bab, kind, text, cid };
  g.notes.push(n);
  return n;
}
const log = (g: Game, by: string, text: string, secret = true) => g.log.push({ bab: g.bab, by, text, secret });

function addLensa(g: Game, p: Player, k: number) {
  const before = p.lensa;
  p.lensa = Math.min(g.lensaCap, p.lensa + k);
  return p.lensa - before;
}

// ── Aksi ────────────────────────────────────────────────────────────────────

export type Action =
  | { t: 'ready' }
  | { t: 'opts'; talk?: number; tema?: string; script?: string; narrator?: boolean }
  | { t: 'start' }
  | { t: 'aksi'; main: Main }
  | { t: 'batal' }
  | { t: 'lensa'; to: string }
  | { t: 'terbit'; cid: string }
  | { t: 'kirim'; cid: string; to: string }
  | { t: 'teori'; v: Theory }
  | { t: 'tarik'; rids: string[]; extra?: string }
  | { t: 'vonis'; v: Partial<Theory> }
  | { t: 'tebak'; pid: string }
  | { t: 'lampir'; cids: string[] };

const visibleRids = (g: Game) => g.reports.filter((r) => !r.out && !r.umpan && r.ch <= Math.min(3, g.bab)).map((r) => r.id);
const inRange = (v: unknown, n: number): v is number => Number.isInteger(v) && (v as number) >= 0 && (v as number) < n;

/** Periksa aksi utama sebelum dikunci. Pesan ditujukan ke pemain. */
export function validateMain(g: Game, p: Player, m: Main) {
  const d = dimOf(g);
  const vis = visibleRids(g);
  const pubRids = g.board.map((b) => b.c.rid);
  const rid = (x?: string, opts: { pub?: boolean } = {}) => {
    if (!x) no('Pilih laporan.');
    if (vis.includes(x!) || (opts.pub && pubRids.includes(x!))) return rep(g, x!)!;
    return no('Laporan itu belum ada di indeks.');
  };
  const other = (x?: string) => {
    if (!x || x === p.id || !byId(g, x)) no('Pilih pemain lain.');
    return byId(g, x!)!;
  };
  switch (m.k) {
    case 'diam':
      return;
    case 'terbit':
      if (g.coop) no('Di mode kooperatif, menerbitkan gratis.');
      if (!m.cid || !findCopy(g, p.id, m.cid)) no('Pilih salinan milikmu.');
      return;
    case 'kirim':
      if (g.coop) no('Di mode kooperatif, mengirim gratis.');
      if (!m.cid || !findCopy(g, p.id, m.cid)) no('Pilih salinan milikmu.');
      other(m.to);
      return;
    case 'audit':
      rid(m.rid, { pub: true });
      if (p.lensa < 1) no('Butuh 1 Lensa.');
      return;
    case 'bukti': {
      if (!m.a || !ANCHORS.includes(m.a) || !inRange(m.v, m.a === 'p' ? d.K : m.a === 'r' ? d.R : d.T)) no('Pilih klaim.');
      if (p.lensa < 2) no('Butuh 2 Lensa (boleh minta teman memberi).');
      if (g.certs.length >= BUKTI_CAP(g.bab)) no(g.bab <= 1 ? 'Pembuktian fakta baru dibuka di bab 2.' : 'Pagu pembuktian bab ini sudah habis.');
      const cite = [...new Set(m.cite ?? [])];
      if (cite.length < 2) no('Rujuk minimal dua terbitan di papan.');
      const pubs = cite.map((id) => g.board.find((b) => b.id === id) ?? no('Terbitan tidak ditemukan.'));
      const srcs = new Set(pubs.map((b) => rep(g, b.c.rid)?.src));
      if (srcs.size < 2) no('Butuh dua sumber independen (dua salinan satu sumber dihitung satu).');
      return;
    }
    case 'tinta': {
      if (p.kubu !== 'revisi' || p.tinta < 1) no('Tinta Revisi sudah habis.');
      const r = rid(m.rid);
      if (r.out) no('Keluaran profesi tidak bisa disunting.');
      if (m.edit !== 'jam' && m.edit !== 'label') no('Pilih jenis suntingan.');
      if (!canEdit(r.f, m.edit!)) no('Laporan itu tidak punya kolom tersebut.');
      if (m.edit === 'jam' && m.v !== -1 && m.v !== 1) no('Pilih maju atau mundur.');
      if (m.edit === 'label' && !inRange(m.r, d.R)) no('Pilih label baru.');
      return;
    }
    case 'profesi':
      break;
  }
  if (!p.prof || p.used) no('Kemampuan profesimu sudah terpakai.');
  const pr = PROFS[p.prof!];
  if (pr.bab && !pr.bab.includes(g.bab)) no(`${pr.nama} hanya bisa dipakai di bab ${pr.bab.join('/')}.`);
  const isTime = (r: Report) => timeOf(r.f) !== null;
  const isWit = (r: Report) => r.f.k === 'witness';
  switch (pr.sasaran) {
    case 'alat':
      if (!inRange(m.dev, 2)) no('Pilih kamera.');
      return;
    case 'laporan':
      rid(m.rid);
      return;
    case 'laporan-waktu':
      if (!isTime(rid(m.rid))) no('Pilih laporan yang memuat waktu.');
      return;
    case 'dua-laporan-waktu':
      if (!isTime(rid(m.rid)) || !isTime(rid(m.rid2)) || m.rid === m.rid2) no('Pilih dua laporan berwaktu yang berbeda.');
      return;
    case 'kesaksian':
      if (!isWit(rid(m.rid, { pub: true }))) {
        if (!rep(g, m.rid!)?.umpan) no('Pilih kesaksian.');
      }
      return;
    case 'dua-kesaksian': {
      const a = rid(m.rid, { pub: true });
      const b = rid(m.rid2, { pub: true });
      if (m.rid === m.rid2 || ![a, b].every((r) => isWit(r) || r.umpan)) no('Pilih dua kesaksian/kabar.');
      return;
    }
    case 'rekaman':
      if (rid(m.rid).f.k !== 'sight') no('Pilih rekaman kamera.');
      return;
    case 'jejak-benda':
      if (rid(m.rid).f.k !== 'trace') no('Pilih jejak benda.');
      return;
    case 'laporan-baru': {
      const r = rid(m.rid);
      if (r.ch !== g.bab) no('Pilih laporan baru bab ini.');
      return;
    }
    case 'jalur':
      if (!inRange(m.r, d.R)) no('Pilih jalur.');
      return;
    case 'jalur-slot':
      if (!inRange(m.r, d.R) || !inRange(m.t, d.T)) no('Pilih jalur dan waktu.');
      return;
    case 'tersangka':
      if (!inRange(m.x, d.K)) no('Pilih tersangka.');
      return;
    case 'pemain':
      other(m.pl);
      return;
    case 'pemain-aksi':
      other(m.pl);
      if (!m.act || !['terbit', 'kirim', 'audit', 'profesi', 'bukti', 'diam'].includes(m.act)) no('Pilih aksi yang ia akui.');
      return;
    case 'dua-nilai': {
      if (!m.a || !ANCHORS.includes(m.a)) no('Pilih jangkar.');
      if (m.a === 'p' && jinxed(g.inPlay, 'kartografer', 'pembaca_kekosongan')) no('Jinx: Kartografer tidak boleh memilih pelaku di meja ini.');
      const n = m.a === 'p' ? d.K : m.a === 'r' ? d.R : d.T;
      if (!inRange(m.v, n) || !inRange(m.v2, n) || m.v === m.v2) no('Pilih dua nilai berbeda.');
      return;
    }
    case 'prediksi':
      if (m.pred === 'versi') rid(m.rid);
      else if (m.pred === 'terbit' || m.pred === 'profesi') other(m.pl);
      else no('Pilih prediksi.');
      return;
    case 'terbitan':
      if (!m.pub || !g.board.some((b) => b.id === m.pub)) no('Pilih terbitan di papan.');
      return;
    case 'kurir': {
      if (!m.cid || !findCopy(g, p.id, m.cid)) no('Pilih salinan milikmu.');
      const pls = [...new Set(m.pls ?? [])].filter((x) => x !== p.id && byId(g, x));
      if (!pls.length || pls.length > 3) no('Pilih 1–3 penerima.');
      return;
    }
    case 'geser': {
      const r = rid(m.rid);
      if (r.out || !canEdit(r.f, 'jam')) no('Pilih salinan berwaktu.');
      if (m.v !== -1 && m.v !== 1) no('Pilih maju atau mundur.');
      return;
    }
    case 'label': {
      const r = rid(m.rid);
      if (r.out || !canEdit(r.f, 'label')) no('Pilih salinan yang memuat jalur.');
      if (!inRange(m.r, d.R)) no('Pilih label baru.');
      return;
    }
    case 'kabur': {
      const r = rid(m.rid);
      if (r.out || !canEdit(r.f, 'jam')) no('Pilih salinan berwaktu.');
      return;
    }
    case 'umpan':
      if (!inRange(m.x, d.K) || !inRange(m.r, d.R) || !inRange(m.t, d.T)) no('Susun isi kabarnya.');
      return;
    case 'tanpa':
      return;
    case 'pasif':
      no('Profesimu bekerja otomatis.');
  }
}

export function act(g: Game, pid: string, a: Action, now: number) {
  const p = P(g, pid);
  switch (a.t) {
    case 'opts': {
      if (pid !== g.host || g.phase !== 'lobby') no('Hanya tuan rumah, sebelum mulai.');
      if (a.talk !== undefined) g.opts.talk = Math.max(60, Math.min(600, Math.round(a.talk)));
      if (a.tema !== undefined) g.opts.tema = a.tema === 'acak' || TEMA.some((t) => t.id === a.tema) ? a.tema : 'acak';
      if (a.script !== undefined) g.opts.script = a.script === 'auto' ? 'auto' : scriptOf(a.script).id;
      if (a.narrator !== undefined) g.opts.narrator = !!a.narrator;
      bump(g);
      return;
    }
    case 'start':
      return start(g, pid, now);
    case 'ready':
      if (!['intro', 'peran', 'runding'].includes(g.phase)) no('Belum saatnya.');
      p.ready = true;
      bump(g);
      return tick(g, now);
    case 'aksi':
      if (g.phase !== 'aksi') no('Bukan fase aksi.');
      validateMain(g, p, a.main);
      g.acts[pid] = structuredClone(a.main);
      bump(g);
      return tick(g, now);
    case 'batal':
      if (g.phase !== 'aksi') no('Bukan fase aksi.');
      delete g.acts[pid];
      bump(g);
      return;
    case 'lensa': {
      if (!['aksi', 'runding', 'segel'].includes(g.phase)) no('Lensa hanya bisa diberikan selama bab berjalan.');
      const to = P(g, a.to);
      if (to.id === pid) no('Pilih pemain lain.');
      if (p.lensa < 1) no('Lensamu habis.');
      if (to.lensa >= g.lensaCap) no(`${to.name} sudah memegang Lensa penuh.`);
      p.lensa--;
      to.lensa++;
      note(g, to.id, 'lensa', `${p.name} memberimu 1 Lensa.`);
      bump(g);
      return;
    }
    case 'terbit':
    case 'kirim': {
      if (!g.coop) no('Gunakan aksi utama.');
      if (!['aksi', 'runding', 'segel'].includes(g.phase)) no('Tunggu bab berjalan.');
      const c = findCopy(g, pid, a.cid) ?? no('Salinan tidak ditemukan.');
      if (a.t === 'terbit') publish(g, pid, c);
      else {
        const to = P(g, a.to);
        give(g, to.id, c.rid, c.f, c.blur, 'kirim', pid, c.stamp);
        note(g, to.id, 'kiriman', `${p.name} mengirim salinan ${c.rid}.`);
      }
      bump(g);
      return;
    }
    case 'teori': {
      if (g.phase !== 'segel') no('Bukan saatnya menyegel teori.');
      const d = dimOf(g);
      const v = a.v ?? ({} as Theory);
      if (!inRange(v.p, d.K) || !inRange(v.r, d.R) || !inRange(v.t, d.T)) no('Lengkapi tiga jangkar.');
      (g.theory[String(g.bab)] ??= {})[pid] = { p: v.p, r: v.r, t: v.t };
      bump(g);
      return tick(g, now);
    }
    case 'tarik': {
      if (g.phase !== 'pulih') no('Bukan saatnya memilih cadangan.');
      const vis = visibleRids(g);
      const rids = [...new Set(a.rids)].filter((r) => vis.includes(r)).slice(0, 2);
      g.pullVote[pid] = rids;
      if (a.extra && p.prof === 'saksi_terakhir' && !p.used && vis.includes(a.extra)) g.extra[pid] = a.extra;
      bump(g);
      return tick(g, now);
    }
    case 'vonis': {
      if (g.phase !== 'vonis') no('Bukan saatnya memutus.');
      const d = dimOf(g);
      const v: Partial<Theory> = {};
      for (const k of g.open) {
        const x = a.v?.[k];
        if (!inRange(x, k === 'p' ? d.K : k === 'r' ? d.R : d.T)) no('Pilih semua jangkar yang masih terbuka.');
        v[k] = x;
      }
      g.vote[pid] = v;
      bump(g);
      return tick(g, now);
    }
    case 'lampir': {
      if (g.phase !== 'segel' || g.bab !== 4) no('Lampiran hanya saat segel akhir.');
      const own = new Set((g.copies[pid] ?? []).filter((c) => !c.hidden).map((c) => c.cid));
      g.attach[pid] = [...new Set(a.cids)].filter((c) => own.has(c));
      bump(g);
      return;
    }
    case 'tebak':
      if (g.phase !== 'tebak') no('Bukan saatnya menebak.');
      if (a.pid !== '' && (!byId(g, a.pid) || a.pid === pid)) no('Pilih pemain lain.');
      g.guess[pid] = a.pid;
      bump(g);
      return tick(g, now);
  }
}

function publish(g: Game, by: string, c: Copy, umpan = false): Pub {
  const pub: Pub = { id: `P${String(g.board.length + 1).padStart(2, '0')}`, by, bab: g.bab, c: { ...structuredClone(c), cid: nid(g, 'c'), hist: [] }, bantah: false, umpan: false };
  pub.c.hist = structuredClone(c.hist);
  g.board.push(pub);
  if (!umpan) {
    (g.actLog[`t${g.bab}`] ??= {})[by] = 'terbit';
    log(g, by, `${nameOf(g, by)} menerbitkan ${c.rid}${c.stamp ? ' (bercap)' : ''} → ${pub.id}.`, false);
  }
  return pub;
}

// ── Waktu & fase ────────────────────────────────────────────────────────────

function allDone(g: Game): boolean {
  const ps = g.players;
  switch (g.phase) {
    case 'intro':
    case 'peran':
    case 'runding':
      return ps.every((p) => p.ready);
    case 'aksi':
      return ps.every((p) => g.acts[p.id]);
    case 'segel':
      return ps.every((p) => g.theory[String(g.bab)]?.[p.id]);
    case 'pulih':
      return ps.every((p) => g.pullVote[p.id]);
    case 'vonis':
      return ps.every((p) => g.vote[p.id]);
    case 'tebak':
      return ps.every((p) => g.guess[p.id] !== undefined);
    default:
      return false;
  }
}

export function tick(g: Game, now: number): boolean {
  if (g.phase === 'lobby' || g.phase === 'end') return false;
  if ((g.deadline !== null && now >= g.deadline) || allDone(g)) {
    advance(g, now);
    return true;
  }
  return false;
}

const talkMs = (g: Game) => (g.bab === 1 ? Math.round(g.opts.talk * 0.75) : g.opts.talk) * 1000;
const aksiMs = (g: Game) => DUR.aksi + (g.coop ? 30_000 : 0);

function advance(g: Game, now: number) {
  switch (g.phase) {
    case 'intro':
      return setPhase(g, 'peran', now + DUR.peran);
    case 'peran':
      g.bab = 1;
      return setPhase(g, 'aksi', now + aksiMs(g));
    case 'aksi':
      resolveAksi(g);
      return setPhase(g, 'runding', now + talkMs(g));
    case 'runding':
      return setPhase(g, 'segel', now + DUR.segel);
    case 'segel':
      if (g.bab < 3) {
        g.bab++;
        g.acts = {};
        return setPhase(g, 'aksi', now + aksiMs(g));
      }
      if (g.bab === 3) {
        g.bab = 4;
        g.acts = {};
        return setPhase(g, 'pulih', now + DUR.pulih);
      }
      attachAll(g);
      g.open = [...ANCHORS];
      g.voteRound = 1;
      g.vote = {};
      return setPhase(g, 'vonis', now + DUR.vonis);
    case 'pulih':
      resolvePulih(g);
      return setPhase(g, 'aksi', now + aksiMs(g));
    case 'vonis':
      return resolveVonis(g, now);
    case 'tebak':
      finish(g);
      return setPhase(g, 'end', null);
    default:
  }
}

// ── Penyelesaian satu bab ───────────────────────────────────────────────────

interface Ctx {
  muffled: Set<string>;
  redirected: Map<string, string>;
  /** Hasil untuk pemain (ditunda bila dibisingkan). */
  out: (p: Player, kind: Note['kind'], text: string, c?: Copy) => void;
  editsNow: { by: string; rid: string; kind: EditKind | 'pulih' }[];
}

function resolveAksi(g: Game) {
  const bab = g.bab;
  const d = dimOf(g);
  const tm = temaOfGame(g);
  const T = (t: number) => `${String(Math.floor((tm.base + 7 * t) / 60) % 24).padStart(2, '0')}.${String((tm.base + 7 * t) % 60).padStart(2, '0')}`;
  for (const p of g.players) g.acts[p.id] ??= { k: 'diam' };
  const order = [...g.players].sort((a, b) => a.seat - b.seat);
  const A = (p: Player) => g.acts[p.id]!;
  const useProf = (p: Player, id: ProfId) => A(p).k === 'profesi' && p.prof === id && !p.used;
  const logk = (g.actLog[`t${bab}`] ??= {});
  for (const p of order) logk[p.id] ??= A(p).k;

  // 0. Kiriman & hasil yang tertunda dari bab lalu.
  for (const q of g.queue.filter((q) => q.bab === bab)) {
    for (const cid of q.cids) {
      const c = g.copies[q.to]?.find((x) => x.cid === cid);
      if (c) c.hidden = false;
    }
    for (const n of q.notes) g.notes.push({ ...n, bab });
  }
  g.queue = g.queue.filter((q) => q.bab !== bab);

  const ctx: Ctx = {
    muffled: new Set(),
    redirected: new Map(),
    editsNow: [],
    out: (p, kind, text, c) => {
      if (ctx.muffled.has(p.id)) {
        if (c) c.hidden = true;
        g.queue.push({ bab: bab + 1, to: p.id, notes: [{ id: nid(g), to: p.id, bab, kind, text: `(tertunda dari bab ${bab}) ${text}`, cid: c?.cid }], cids: c ? [c.cid] : [] });
      } else note(g, p.id, kind, text, c?.cid);
    },
  };
  const outFact = (p: Player, f: Fact, text: string) => {
    const id = `Q${String(++g.qn).padStart(2, '0')}`;
    g.reports.push({ id, ch: bab, holder: p.seat, f, src: `out:${id}`, out: true });
    const c = give(g, p.id, id, f, false, 'keluaran', '', true);
    ctx.out(p, 'hasil', text, c);
  };
  const done = (p: Player) => {
    p.used = true;
  };

  // 1. Perlindungan, potret, kontrak.
  for (const p of order) {
    const m = A(p);
    if (useProf(p, 'penjaga_segel')) {
      if (rep(g, m.rid!)?.umpan) {
        ctx.out(p, 'hasil', `${m.rid} adalah umpan; tidak ada yang perlu dilindungi.`);
      } else {
        g.protect.push(m.rid!);
        ctx.out(p, 'hasil', `Semua salinan ${m.rid} kini terlindungi dari suntingan.`);
      }
      done(p);
      log(g, p.id, `${p.name} (Penjaga Segel) melindungi ${m.rid}.`);
    }
    if (useProf(p, 'pencetak_karbon')) {
      const c = holderCopy(g, m.rid!);
      if (c) {
        const k = give(g, p.id, c.rid, c.f, c.blur, 'karbon', '', false);
        ctx.out(p, 'hasil', `Karbon ${c.rid} dari tangan ${nameOf(g, holderOf(g, c.rid)!.id)} tersimpan.`, k);
        done(p);
        log(g, p.id, `${p.name} (Pencetak Karbon) membekukan salinan ${m.rid}.`);
      }
    }
    if (useProf(p, 'penerima_senja')) {
      const c = holderCopy(g, m.rid!);
      if (c) {
        g.senja.push({ by: p.id, rid: c.rid, f: structuredClone(c.f), blur: c.blur, bab: bab + 1, restored: false });
        ctx.out(p, 'hasil', `Potret ${c.rid} disimpan. Bab depan kamu tahu apakah ia berubah.`);
        done(p);
      }
    }
    if (useProf(p, 'notaris')) {
      g.contracts.push({ by: p.id, bab: bab + 1, pred: m.pred!, rid: m.rid, pl: m.pl });
      const what = m.pred === 'versi' ? `${m.rid} mendapat versi baru` : m.pred === 'terbit' ? `${nameOf(g, m.pl!)} menerbitkan sesuatu` : `${nameOf(g, m.pl!)} memakai profesinya`;
      ctx.out(p, 'hasil', `Kontrak disegel: “di bab ${bab + 1}, ${what}”.`);
      note(g, '*', 'publik', `Notaris menyegel sebuah kontrak untuk bab ${bab + 1}.`);
      done(p);
    }
  }

  // 2. Pengalihan & kebisingan.
  for (const p of order) {
    const m = A(p);
    if (useProf(p, 'pengalih_kurir')) {
      ctx.redirected.set(m.pl!, p.id);
      done(p);
      log(g, p.id, `${p.name} (Pengalih Kurir) mengalihkan kiriman ${nameOf(g, m.pl!)}.`);
    }
  }
  for (const p of order) {
    const m = A(p);
    if (useProf(p, 'pembawa_kebisingan')) {
      const t = P(g, m.pl!);
      const blocked = (jinxed(g.inPlay, 'pembawa_kebisingan', 'penyetel_jam') && t.prof === 'penyetel_jam' && useProf(t, 'penyetel_jam')) || (jinxed(g.inPlay, 'pembawa_kebisingan', 'pengalih_kurir') && ctx.redirected.has(t.id));
      if (blocked) ctx.out(p, 'gagal', `Kebisinganmu tidak menembus ${t.name} (jinx). Kemampuanmu masih utuh.`);
      else {
        ctx.muffled.add(t.id);
        done(p);
        ctx.out(p, 'hasil', `Hasil kerja ${t.name} bab ini akan terlambat.`);
        log(g, p.id, `${p.name} (Pembawa Kebisingan) menunda hasil ${t.name}.`);
      }
    }
  }

  // 3. Pemeriksaan, audit, pemulihan.
  for (const p of order) {
    const m = A(p);
    if (m.k === 'audit') {
      if (p.lensa < 1) {
        ctx.out(p, 'gagal', 'Audit batal: Lensamu sudah habis.');
        continue;
      }
      p.lensa--;
      const r = rep(g, m.rid!)!;
      if (r.umpan) {
        const pub = g.board.find((b) => b.c.rid === r.id);
        if (pub && !pub.umpan) {
          pub.umpan = true;
          addLensa(g, p, 2);
          note(g, '*', 'publik', `${pub.id} dibongkar: kabar itu tidak punya sumber. Umpan!`);
          ctx.out(p, 'hasil', `${r.id} tidak punya sumber sama sekali. Kamu membongkar umpan (+Lensa kembali, +1).`);
        } else ctx.out(p, 'hasil', `${r.id} tidak punya sumber.`);
      } else {
        const c = give(g, p.id, r.id, r.f, false, 'audit', '', true);
        ctx.out(p, 'hasil', `Salinan sumber ${r.id} bercap ASAL TERBUKTI.`, c);
      }
      log(g, p.id, `${p.name} mengaudit asal ${m.rid}.`);
      continue;
    }
    if (m.k !== 'profesi' || p.used) continue;
    const id = p.prof!;
    const r = m.rid ? rep(g, m.rid) : undefined;
    switch (id) {
      case 'penyetel_jam': {
        const dev = m.dev!;
        let extra = '';
        if (jinxed(g.inPlay, 'penyetel_jam', 'penggeser_jam')) {
          const shifted = g.reports.some((x) => x.f.k === 'sight' && x.f.dev === dev && (() => {
            const c = holderCopy(g, x.id);
            return c && c.f.k === 'sight' && x.f.k === 'sight' && c.f.d !== x.f.d;
          })());
          extra = shifted ? ' Jinx: ada salinan dari kamera ini yang sedang tergeser.' : ' Jinx: tidak ada salinan dari kamera ini yang tergeser.';
        }
        outFact(p, { k: 'calib', dev, off: g.model!.devs[dev]!.off }, `Register jam ${tm.kamera[dev]} keluar.${extra}`);
        done(p);
        log(g, p.id, `${p.name} (Penyetel Jam) mengukur jam ${tm.kamera[dev]}.`);
        break;
      }
      case 'penjaga_detik': {
        const kas = (x: Report) => (x.f.k === 'sight' ? x.f.d + (x.f.kas ? 0 : g.model!.devs[x.f.dev]!.off) : timeOf(x.f)!);
        const a = kas(r!);
        const b = kas(rep(g, m.rid2!)!);
        ctx.out(p, 'hasil', `Menurut sumber aslinya, ${m.rid} terjadi ${a < b ? 'lebih dulu dari' : a > b ? 'sesudah' : 'bersamaan dengan'} ${m.rid2} (jam KAS).`);
        done(p);
        break;
      }
      case 'pemetik_menit': {
        const c = holderCopy(g, r!.id)!;
        const shifted = timeOf(c.f) !== timeOf(r!.f);
        ctx.out(p, 'hasil', `Waktu pada salinan ${r!.id} milik ${nameOf(g, holderOf(g, r!.id)!.id)}: ${c.blur ? 'dikaburkan' : shifted ? 'pernah digeser' : 'direkam langsung'}.`);
        done(p);
        break;
      }
      case 'pemotong_adegan': {
        const all = [...Object.values(g.copies).flat(), ...g.board.map((b) => b.c)].filter((c) => c.rid === r!.id && !c.hidden);
        const vers = new Set(all.map((c) => JSON.stringify([c.f, c.blur])));
        ctx.out(p, 'hasil', `Ada ${vers.size} versi berbeda dari ${r!.id} yang beredar di meja.`);
        done(p);
        break;
      }
      case 'penghitung_langkah': {
        const ts = g.model!.pass[m.r!]!.map((ok, t) => (ok ? -1 : t)).filter((t) => t >= 0);
        if (ts.length) outFact(p, { k: 'locks', r: m.r!, ts, why: 0 }, `Catatan resmi ${tm.jalur[m.r!]} keluar.`);
        else ctx.out(p, 'hasil', `${tm.jalur[m.r!]} bisa dilalui sepanjang malam.`);
        done(p);
        break;
      }
      case 'pemeriksa_serat':
        ctx.out(p, 'hasil', g.model!.fiberUnique ? `Serat di ${r!.id} unik.` : `Serat di ${r!.id} bahan umum: dipakai semua tas operasional. Tidak menunjuk pemilik.`);
        done(p);
        break;
      case 'pembaca_label': {
        if (r!.f.k !== 'sight') break;
        const dev = r!.f.dev;
        let extra = '';
        if (jinxed(g.inPlay, 'pengganti_label', 'pembaca_label')) {
          const c = holderCopy(g, r!.id);
          if (c && routeOf(c.f) !== routeOf(r!.f)) extra = ' Jinx: label salinan itu pernah diganti.';
        }
        outFact(p, { k: 'mount', dev, r: g.model!.devs[dev]!.r }, `Survei dudukan ${tm.kamera[dev]} keluar.${extra}`);
        done(p);
        break;
      }
      case 'penerawang_tinta': {
        const c = holderCopy(g, r!.id)!;
        if (originTrue(g, c)) ctx.out(p, 'hasil', `Salinan ${r!.id} bersih: tak ada coretan.`);
        else {
          const bits: string[] = [];
          if (c.blur || timeOf(c.f) !== timeOf(r!.f)) bits.push(`waktu aslinya ${T(timeOf(r!.f)!)}`);
          if (routeOf(c.f) !== routeOf(r!.f)) bits.push(`jalur aslinya ${tm.jalur[routeOf(r!.f)!]}`);
          ctx.out(p, 'hasil', `Salinan ${r!.id} pernah diubah: ${bits.join(', ')}.`);
        }
        done(p);
        break;
      }
      case 'pencatat_jejak': {
        const w = g.model!.w;
        const routes = Array.from({ length: d.R }, (_, i) => i).filter((R) => m.x !== w.p || R !== w.r);
        outFact(p, { k: 'jejak', x: m.x!, r: pick(g, routes) }, `Catatan jejak ${tm.tokoh[m.x!]?.name} keluar.`);
        done(p);
        break;
      }
      case 'juru_peta': {
        const rs = g.model!.keys[m.x!]!.map((k, R) => (k ? R : -1)).filter((R) => R >= 0);
        outFact(p, { k: 'keys', x: m.x!, rs }, `Daftar kunci ${tm.tokoh[m.x!]?.name} keluar.`);
        done(p);
        break;
      }
      case 'penghubung_cerita': {
        const a = rep(g, m.rid!)!;
        const b = rep(g, m.rid2!)!;
        const same = a.src === b.src && !a.umpan;
        ctx.out(p, 'hasil', same ? `${a.id} dan ${b.id} berasal dari pengamat awal yang sama: satu sumber.` : `${a.id} dan ${b.id} tidak berasal dari pengamat yang sama.`);
        done(p);
        break;
      }
      case 'penguji_sudut': {
        if (r!.umpan) {
          ctx.out(p, 'hasil', `${r!.id} bukan kesaksian, melainkan umpan.`);
          done(p);
          break;
        }
        if (r!.f.k !== 'witness') break;
        const w = r!.f.w;
        outFact(p, { k: 'vantage', w, ok: g.model!.wits[w]!.saw && !r!.f.hearsay }, `Catatan garis pandang ${tm.saksi[w]} keluar.`);
        done(p);
        break;
      }
      case 'penjaga_atribusi': {
        const t = P(g, m.pl!);
        const ok = (g.copies[t.id] ?? []).filter((c) => !c.hidden).every((c) => originTrue(g, c) || rep(g, c.rid)?.umpan);
        ctx.out(p, 'hasil', ok ? `Semua salinan yang dipegang ${t.name} sesuai sumber.` : `Ada salinan di tangan ${t.name} yang tidak sesuai sumber.`);
        done(p);
        break;
      }
      case 'pembaca_kekosongan': {
        const on = g.model!.camOn[m.r!]![m.t!]!;
        if (on) outFact(p, { k: 'blank', r: m.r!, t: m.t! }, `Kamera lorong ${tm.jalur[m.r!]} menyala dan kosong pada ${T(m.t!)}.`);
        else ctx.out(p, 'hasil', `Tidak cukup data: kamera lorong ${tm.jalur[m.r!]} mati sekitar ${T(m.t!)}.`);
        done(p);
        break;
      }
      case 'kartografer': {
        const w = g.model!.w;
        const hit = w[m.a!] === m.v || w[m.a!] === m.v2;
        ctx.out(p, 'hasil', hit ? 'Setidaknya satu dari dua nilai itu benar.' : 'Keduanya salah.');
        done(p);
        break;
      }
      case 'pemulih': {
        const c = holderCopy(g, r!.id);
        const last = c?.hist[c.hist.length - 1];
        if (!c || !last) {
          ctx.out(p, 'gagal', `${r!.id} tidak punya versi lain. Kemampuanmu masih utuh.`);
          break;
        }
        c.f = last.prev;
        c.blur = last.prevBlur;
        c.hist.push({ bab, by: p.id, kind: 'pulih', prev: c.f, prevBlur: c.blur });
        ctx.editsNow.push({ by: p.id, rid: r!.id, kind: 'pulih' });
        g.edits.push({ bab, by: p.id, rid: r!.id, kind: 'pulih' });
        for (const s of g.senja) if (s.rid === r!.id && s.bab === bab + 1) s.restored = true;
        ctx.out(p, 'hasil', `Salinan ${r!.id} dikembalikan satu versi.`);
        done(p);
        log(g, p.id, `${p.name} (Pemulih) memulihkan ${r!.id}.`);
        break;
      }
      default:
    }
  }

  // 4. Suntingan.
  const tryEdit = (p: Player, rid: string, kind: EditKind, v: number): string | null => {
    if (g.protect.includes(rid)) return 'laporan itu dilindungi';
    if (ctx.editsNow.some((e) => e.rid === rid && e.kind !== 'pulih')) return 'salinan itu sudah disunting orang lain bab ini';
    const r = rep(g, rid)!;
    const c = holderCopy(g, rid);
    if (!c || c.stamp || r.out || r.umpan) return 'salinan itu tidak bisa disunting';
    if (originTrue(g, c) && activeEdits(g) >= g.pagu) return `pagu gangguan meja (${g.pagu}) penuh`;
    let nf: Fact | null = c.f;
    if (kind === 'kabur') {
      if (c.blur || timeOf(c.f) === null) return 'tidak ada waktu untuk dikaburkan';
    } else {
      nf = applyEdit(c.f, kind, v, d);
      if (!nf) return 'nilai itu tidak berlaku';
    }
    c.hist.push({ bab, by: p.id, kind, prev: structuredClone(c.f), prevBlur: c.blur });
    if (kind === 'kabur') c.blur = true;
    else c.f = nf!;
    ctx.editsNow.push({ by: p.id, rid, kind });
    g.edits.push({ bab, by: p.id, rid, kind });
    return null;
  };
  for (const p of order) {
    const m = A(p);
    let kind: EditKind | null = null;
    let v = 0;
    const isTinta = m.k === 'tinta' && p.kubu === 'revisi' && p.tinta > 0;
    if (isTinta) {
      kind = m.edit!;
      v = m.edit === 'jam' ? (timeOf(holderCopy(g, m.rid!)?.f ?? rep(g, m.rid!)!.f) ?? 0) + (m.v === -1 ? -1 : 1) : m.r!;
    } else if (useProf(p, 'penggeser_jam')) {
      kind = 'jam';
      v = (timeOf(holderCopy(g, m.rid!)?.f ?? rep(g, m.rid!)!.f) ?? 0) + (m.v === -1 ? -1 : 1);
    } else if (useProf(p, 'pengganti_label')) {
      kind = 'label';
      v = m.r!;
    } else if (useProf(p, 'pengabur_rentang')) kind = 'kabur';
    if (!kind) continue;
    const err = tryEdit(p, m.rid!, kind, v);
    if (err) ctx.out(p, 'gagal', `Suntingan gagal: ${err}. ${isTinta ? 'Tintamu' : 'Kemampuanmu'} masih utuh.`);
    else {
      if (isTinta) p.tinta--;
      else done(p);
      ctx.out(p, 'hasil', `Salinan ${m.rid} di tangan ${nameOf(g, holderOf(g, m.rid!)!.id)} kini versi barumu.`);
      log(g, p.id, `${p.name} ${isTinta ? '(tinta Revisi)' : `(${PROFS[p.prof!].nama})`} ${kind === 'jam' ? 'menggeser jam' : kind === 'label' ? 'mengganti label' : 'mengaburkan waktu'} ${m.rid}.`);
    }
  }
  if (g.coop && bab <= 3) for (let i = 0; i < (bab > 1 && g.players.length >= 3 ? 2 : 1); i++) gangguan(g, ctx);

  // 5. Terbit, kirim, kurir, umpan, pembuktian, kiriman tertahan.
  for (const h of g.held.filter((h) => h.bab === bab)) {
    const by = byId(g, h.by);
    if (!by) continue;
    const c = g.copies[by.id]?.find((x) => x.cid === h.main.cid);
    if (!c) continue;
    if (h.main.k === 'terbit') {
      const pub = publish(g, by.id, c);
      note(g, '*', 'publik', `${by.name} menerbitkan ${pub.c.rid} (tertunda dari bab lalu) → ${pub.id}.`);
    } else if (h.main.to) {
      const k = give(g, h.main.to, c.rid, c.f, c.blur, 'kirim', by.id, c.stamp);
      note(g, h.main.to, 'kiriman', `${by.name} mengirim salinan ${c.rid} (tertunda dari bab lalu).`, k.cid);
    }
  }
  g.held = g.held.filter((h) => h.bab !== bab);
  for (const p of order) {
    const m = A(p);
    if (m.k === 'terbit' || m.k === 'kirim') {
      const c = findCopy(g, p.id, m.cid!);
      if (!c) continue;
      const al = ctx.redirected.get(p.id);
      if (al) {
        const by = P(g, al);
        const k = give(g, by.id, c.rid, c.f, c.blur, 'alih', p.id, c.stamp);
        note(g, by.id, 'hasil', `Kamu mencegat ${m.k === 'terbit' ? 'terbitan' : 'kiriman'} ${p.name}: salinan ${c.rid}.`, k.cid);
        g.held.push({ bab: bab + 1, by: p.id, main: m });
        note(g, p.id, 'gagal', `${m.k === 'terbit' ? 'Terbitanmu' : 'Kirimanmu'} tertahan di jalan; baru sampai bab depan.`);
        if (m.k === 'terbit') (g.actLog[`t${bab}`] ??= {})[p.id] = 'terbit';
        continue;
      }
      if (m.k === 'terbit') {
        const pub = publish(g, p.id, c);
        note(g, '*', 'publik', `${p.name} menerbitkan ${c.rid} → ${pub.id}.`);
      } else {
        const k = give(g, m.to!, c.rid, c.f, c.blur, 'kirim', p.id, c.stamp);
        note(g, m.to!, 'kiriman', `${p.name} mengirim salinan ${c.rid}.`, k.cid);
        log(g, p.id, `${p.name} mengirim ${c.rid} ke ${nameOf(g, m.to!)}.`);
      }
    }
    if (useProf(p, 'kurir')) {
      const c = findCopy(g, p.id, m.cid!);
      if (!c) continue;
      const pls = [...new Set(m.pls ?? [])].filter((x) => x !== p.id).slice(0, 3);
      const al = ctx.redirected.get(p.id);
      if (al) {
        const k = give(g, al, c.rid, c.f, c.blur, 'alih', p.id, c.stamp);
        note(g, al, 'hasil', `Kamu mencegat kiriman Kurir: salinan ${c.rid}.`, k.cid);
      }
      for (const to of pls) {
        const k = give(g, to, c.rid, c.f, c.blur, 'kurir', '', c.stamp);
        note(g, to, 'kiriman', `Kurir tanpa nama menitipkan salinan ${c.rid}.`, k.cid);
      }
      ctx.out(p, 'hasil', `Salinan ${c.rid} terkirim ke ${pls.map((x) => nameOf(g, x)).join(', ')}.`);
      done(p);
      log(g, p.id, `${p.name} (Kurir) mengirim ${c.rid} ke ${pls.map((x) => nameOf(g, x)).join(', ')}.`);
    }
    if (useProf(p, 'penanam_umpan')) {
      const id = `U${g.reports.filter((r) => r.umpan).length + 1}`;
      const f: Fact = { k: 'rumor', x: m.x!, r: m.r!, t: m.t! };
      g.reports.push({ id, ch: bab, holder: -1, f, src: `umpan:${id}`, umpan: true, herring: true });
      const c: Copy = { cid: nid(g, 'c'), rid: id, f, blur: false, hist: [], stamp: false, via: 'umpan', from: '', bab, hidden: false };
      const pub = publish(g, '', c, true);
      note(g, '*', 'publik', `Kabar tanpa nama muncul di papan → ${pub.id}.`);
      ctx.out(p, 'hasil', `Umpanmu terpasang sebagai ${pub.id}.`);
      done(p);
      log(g, p.id, `${p.name} (Penanam Umpan) memasang kabar palsu ${pub.id}.`);
    }
    if (useProf(p, 'penyanggah')) {
      const pub = g.board.find((b) => b.id === m.pub)!;
      const bad = pub.c.blur || !originTrue(g, pub.c) || rep(g, pub.c.rid)?.umpan;
      if (bad) {
        pub.bantah = true;
        const isU = !!rep(g, pub.c.rid)?.umpan;
        if (isU) pub.umpan = true;
        addLensa(g, p, isU && jinxed(g.inPlay, 'penyanggah', 'penanam_umpan') ? 2 : 1);
        note(g, '*', 'publik', `${pub.id} DIBANTAH: isinya tidak sesuai sumber${isU ? ' (umpan)' : ''}.`);
        ctx.out(p, 'hasil', `Bantahanmu sah. +Lensa.`);
      } else ctx.out(p, 'hasil', `${pub.id} sesuai sumbernya. Hanya kamu yang tahu.`);
      done(p);
      log(g, p.id, `${p.name} (Penyanggah) menantang ${pub.id}.`);
    }
    if (useProf(p, 'pengasah_lensa')) {
      const t = P(g, m.pl!);
      addLensa(g, p, 1);
      addLensa(g, t, 1);
      note(g, t.id, 'lensa', 'Seseorang mengasah Lensa untukmu: +1 Lensa.');
      ctx.out(p, 'hasil', `Kamu dan ${t.name} masing-masing +1 Lensa.`);
      done(p);
    }
    if (m.k === 'bukti') resolveBukti(g, p, m);
  }

  // 6. Kontrak, potret senja, penagih janji, hitungan suntingan.
  for (const k of g.contracts.filter((k) => k.bab === bab)) {
    const by = byId(g, k.by);
    if (!by) continue;
    const t = g.actLog[`t${bab}`] ?? {};
    const ok =
      k.pred === 'versi'
        ? ctx.editsNow.some((e) => e.rid === k.rid)
        : k.pred === 'terbit'
          ? t[k.pl!] === 'terbit' || (jinxed(g.inPlay, 'notaris', 'pengalih_kurir') && ctx.redirected.has(k.pl!) && t[k.pl!] === 'terbit')
          : g.acts[k.pl!]?.k === 'profesi';
    if (ok) addLensa(g, by, 1);
    note(g, by.id, 'hasil', ok ? 'Kontrakmu terpenuhi: +1 Lensa.' : 'Kontrakmu tidak terpenuhi.');
    note(g, '*', 'publik', `Kontrak Notaris ${ok ? 'terpenuhi' : 'gagal'}.`);
  }
  for (const s of g.senja.filter((s) => s.bab === bab)) {
    const by = byId(g, s.by);
    const c = holderCopy(g, s.rid);
    if (!by || !c) continue;
    const changed = !sameFact(c.f, s.f) || c.blur !== s.blur;
    const both = jinxed(g.inPlay, 'penerima_senja', 'pemulih') && s.restored;
    note(g, by.id, 'hasil', both ? `${s.rid} sempat berubah lalu dipulihkan.` : changed ? `${s.rid} berubah sejak kamu memotretnya.` : `${s.rid} tidak berubah sejak kamu memotretnya.`);
  }
  for (const p of order) {
    const m = A(p);
    if (useProf(p, 'penagih_janji')) {
      const t = P(g, m.pl!);
      const did = (g.actLog[`t${bab}`] ?? {})[t.id] === m.act;
      ctx.out(p, 'hasil', `${t.name} ${did ? 'memang' : 'tidak'} melakukan aksi “${m.act}” bab ini.`);
      done(p);
    }
    if (useProf(p, 'penjaga_giliran')) {
      const hide = jinxed(g.inPlay, 'penjaga_giliran', 'pengabur_rentang');
      const es = ctx.editsNow.filter((e) => e.kind !== 'pulih' && !(hide && e.kind === 'kabur'));
      const kinds = [...new Set(es.map((e) => (e.kind === 'jam' ? 'geser jam' : e.kind === 'label' ? 'ganti label' : 'kaburkan')))];
      ctx.out(p, 'hasil', es.length ? `Bab ini terjadi ${es.length} suntingan (${kinds.join(', ')}).` : 'Bab ini tidak ada suntingan yang berhasil.');
      done(p);
    }
    if (useProf(p, 'pembaca_arsip')) {
      ctx.out(p, 'hasil', `Saat ini ada ${activeEdits(g)} laporan yang salinannya tidak sesuai sumber.`);
      done(p);
    }
    if (useProf(p, 'saksi_tinta')) {
      const t = P(g, m.pl!);
      const hide = jinxed(g.inPlay, 'saksi_tinta', 'pengabur_rentang');
      const ever = g.edits.some((e) => e.by === t.id && e.kind !== 'pulih' && !(hide && e.kind === 'kabur'));
      ctx.out(p, 'hasil', `${t.name} ${ever ? 'pernah' : 'belum pernah'} berhasil menyunting salinan.`);
      done(p);
    }
  }

  // 7. Bagikan laporan baru bab ini.
  for (const r of g.reports.filter((r) => r.ch === bab && !r.out && !r.umpan && bab > 1)) {
    const c = holderCopy(g, r.id);
    if (c) c.hidden = false;
  }
  for (const p of order) {
    const m = A(p);
    if (useProf(p, 'penyimpan_asli')) {
      const r = rep(g, m.rid!)!;
      const c = give(g, p.id, r.id, r.f, false, 'asli', '', true);
      ctx.out(p, 'hasil', `Salinan sumber ${r.id} tiba di tanganmu, bercap asal.`, c);
      done(p);
    }
  }
  if (bab > 1 && bab <= 3) note(g, '*', 'publik', `Berkas bab ${bab} dibagikan ke pemegangnya.`);
}

export interface EditOption {
  rid: string;
  kind: 'jam' | 'label';
  v: number;
  /** 2: menyesatkan tanpa kontradiksi, 1: membuat kontradiksi, 0: tidak berpengaruh. */
  score: number;
}

/**
 * Semua suntingan yang mungkin pada salinan pemegang, dinilai dari dampaknya
 * terhadap gabungan seluruh salinan pemegang saat ini. Dipakai gangguan arsip
 * (mode kooperatif) dan bot simulasi.
 */
export function editOptions(g: Game, opts: { maxCh?: number; step?: boolean } = {}): EditOption[] {
  const d = dimOf(g);
  const w = g.model!.w;
  const maxCh = opts.maxCh ?? Math.min(3, g.bab);
  const base = g.reports.filter((r) => !r.out && !r.umpan && isHard(r.f));
  const cur = new Map(base.map((r) => {
    const c = holderCopy(g, r.id);
    return [r.id, { f: c?.f ?? r.f, blur: c?.blur ?? false }] as const;
  }));
  const out: EditOption[] = [];
  for (const r of base) {
    if (r.ch > maxCh || g.protect.includes(r.id)) continue;
    const c = holderCopy(g, r.id);
    if (!c || c.stamp || !originTrue(g, c)) continue;
    const tries: { kind: 'jam' | 'label'; v: number }[] = [];
    const t0 = timeOf(c.f);
    if (t0 !== null) for (const dv of [-1, 1]) tries.push({ kind: 'jam', v: t0 + dv });
    const r0 = routeOf(c.f);
    if (r0 !== null && !opts.step) for (let R = 0; R < d.R; R++) if (R !== r0) tries.push({ kind: 'label', v: R });
    for (const t of tries) {
      const nf = applyEdit(c.f, t.kind, t.v, d);
      if (!nf) continue;
      const items = [...cur.entries()].map(([id, x]) => (id === r.id ? { f: nf, blur: x.blur } : x));
      const ws = worlds(d, items);
      const score = ws.length === 0 ? 1 : ws.some((x) => x.p === w.p && x.r === w.r && x.t === w.t) ? 0 : 2;
      out.push({ rid: r.id, kind: t.kind, v: t.v, score });
    }
  }
  return out;
}

/** Gangguan arsip (mode kooperatif): satu suntingan licik tiap bab 1–3. */
function gangguan(g: Game, ctx: Ctx) {
  if (activeEdits(g) >= g.pagu) return;
  const opts = shuffle(g, editOptions(g)).sort((a, b) => b.score - a.score);
  const o = opts[0];
  if (!o) return;
  const c = holderCopy(g, o.rid)!;
  const nf = applyEdit(c.f, o.kind, o.v, dimOf(g))!;
  c.hist.push({ bab: g.bab, by: 'gangguan', kind: o.kind, prev: structuredClone(c.f), prevBlur: c.blur });
  c.f = nf;
  ctx.editsNow.push({ by: 'gangguan', rid: o.rid, kind: o.kind });
  g.edits.push({ bab: g.bab, by: 'gangguan', rid: o.rid, kind: o.kind });
  log(g, 'gangguan', `Gangguan arsip ${o.kind === 'jam' ? 'menggeser jam' : 'mengganti label'} ${o.rid}.`);
  note(g, '*', 'publik', 'Arsip berderit: satu salinan di meja berubah diam-diam bab ini.');
}

/** Bukti publik yang sah: terbitan yang isinya sama dengan sumber, ditambah sertifikat. */
export function chainItems(g: Game, pubs: Pub[] = g.board): Item[] {
  return pubs.filter((b) => !b.umpan && originTrue(g, b.c)).map((b) => ({ f: b.c.f, blur: b.c.blur }));
}
function certWorlds(g: Game, items: Item[]): World[] {
  const ok = g.certs.filter((c) => c.ok);
  return worlds(dimOf(g), items).filter((w) => ok.every((c) => w[c.a] === c.v));
}

function resolveBukti(g: Game, p: Player, m: Main) {
  if (p.lensa < 2 || g.certs.length >= BUKTI_CAP(g.bab)) {
    note(g, p.id, 'gagal', 'Permohonan pembuktian batal (Lensa kurang atau pagu habis).');
    return;
  }
  p.lensa -= 2;
  const pubs = (m.cite ?? []).map((id) => g.board.find((b) => b.id === id)).filter((b): b is Pub => !!b);
  const valid = pubs.every((b) => !b.umpan && originTrue(g, b.c));
  const ws = valid ? certWorlds(g, chainItems(g, pubs)) : [];
  const ok = valid && ws.length > 0 && ws.every((w) => w[m.a!] === m.v);
  const tm = temaOfGame(g);
  const val = m.a === 'p' ? tm.tokoh[m.v!]?.name : m.a === 'r' ? tm.jalur[m.v!] : `${String(Math.floor((tm.base + 7 * m.v!) / 60) % 24).padStart(2, '0')}.${String((tm.base + 7 * m.v!) % 60).padStart(2, '0')}`;
  const label = `${m.a === 'p' ? 'pelaku' : m.a === 'r' ? 'jalur' : 'waktu'} = ${val}`;
  const cert: Cert = { id: `F${g.certs.length + 1}`, bab: g.bab, by: p.id, a: m.a!, v: m.v!, cite: pubs.map((b) => b.id), ok };
  if (ok) {
    g.certs.push(cert);
    for (const b of pubs) b.c.stamp = true;
    note(g, '*', 'publik', `FAKTA TERBUKTI ${cert.id}: ${label} (rantai ${cert.cite.join(', ')}). Diajukan ${p.name}.`);
  } else {
    note(g, '*', 'publik', `Permohonan ${p.name} [${label}] ditolak: rantai ${pubs.map((b) => b.id).join(', ')} tidak membuktikannya.`);
  }
  g.log.push({ bab: g.bab, by: p.id, text: `${p.name} mengajukan pembuktian ${label}: ${ok ? 'diterima' : 'ditolak'}.`, secret: false });
}

function resolvePulih(g: Game) {
  const count: Record<string, number> = {};
  for (const rids of Object.values(g.pullVote)) for (const r of rids) count[r] = (count[r] ?? 0) + 1;
  const top = Object.entries(count)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 2)
    .map(([r]) => r);
  for (const [pid, rid] of Object.entries(g.extra)) {
    const p = byId(g, pid);
    if (!p || p.used) continue;
    p.used = true;
    if (!top.includes(rid)) top.push(rid);
    log(g, pid, `${p.name} (Saksi Terakhir) menambah ${rid} ke cadangan.`, false);
  }
  g.pulled = top;
  for (const rid of top) {
    const r = rep(g, rid);
    if (!r) continue;
    const c: Copy = { cid: nid(g, 'c'), rid, f: structuredClone(r.f), blur: false, hist: [], stamp: true, via: 'cadangan', from: '', bab: g.bab, hidden: false };
    const pub = publish(g, '', c, true);
    note(g, '*', 'publik', `Cadangan ${rid} ditarik dari arsip pusat → ${pub.id} (ASAL TERBUKTI).`);
  }
  if (!top.length) note(g, '*', 'publik', 'Tidak ada cadangan yang ditarik.');
}

/** Lampiran segel akhir masuk ke papan sebagai bagian arsip. */
function attachAll(g: Game) {
  for (const p of g.players) {
    const cids = g.attach[p.id] ?? [];
    const done = new Set<string>();
    for (const cid of cids) {
      const c = findCopy(g, p.id, cid);
      if (!c) continue;
      const key = JSON.stringify([c.rid, c.f, c.blur, c.stamp]);
      if (done.has(key) || g.board.some((b) => JSON.stringify([b.c.rid, b.c.f, b.c.blur, b.c.stamp]) === key)) continue;
      done.add(key);
      publish(g, p.id, c, true);
    }
    if (done.size) note(g, '*', 'publik', `${p.name} melampirkan ${done.size} berkas ke arsip final.`);
  }
}

function resolveVonis(g: Game, now: number) {
  const n = g.players.length;
  const need = Math.floor(n / 2) + 1;
  const tally = {} as Record<Anchor, Record<number, number>>;
  for (const a of g.open) {
    const c: Record<number, number> = {};
    for (const v of Object.values(g.vote)) if (v[a] !== undefined) c[v[a]!] = (c[v[a]!] ?? 0) + 1;
    tally[a] = c;
    const win = Object.entries(c).find(([, k]) => k >= need);
    if (win) g.anchors[a] = Number(win[0]);
  }
  g.tally.push(tally);
  g.open = g.open.filter((a) => g.anchors[a] === null);
  const tie = g.players.some((p) => p.prof === 'pemutus_seri');
  if (g.open.length && (g.voteRound === 1 || (g.voteRound === 2 && tie))) {
    if (g.voteRound === 2) note(g, '*', 'publik', 'Pemutus Seri memaksa satu pemungutan lagi.');
    g.voteRound++;
    g.vote = {};
    note(g, '*', 'publik', `Belum ada mayoritas untuk ${g.open.map((a) => (a === 'p' ? 'pelaku' : a === 'r' ? 'jalur' : 'waktu')).join(', ')}. Satu debat singkat, lalu pilih lagi.`);
    return setPhase(g, 'vonis', now + DUR.vonis);
  }
  g.open = [];
  if (g.coop) {
    finish(g);
    return setPhase(g, 'end', null);
  }
  return setPhase(g, 'tebak', now + DUR.tebak);
}

function finish(g: Game) {
  const w = g.model!.w;
  const items = chainItems(g);
  const ws = certWorlds(g, items);
  const chain = {} as Record<Anchor, boolean>;
  for (const a of ANCHORS) chain[a] = ws.length > 0 && ws.every((x) => x[a] === w[a]);
  const anchors = { ...g.anchors };
  let reason: Result['reason'] = 'benar';
  if (ANCHORS.some((a) => anchors[a] === null)) reason = 'buntu';
  else if (ANCHORS.some((a) => anchors[a] !== w[a])) reason = 'salah';
  else if (ANCHORS.some((a) => !chain[a])) reason = 'lemah';
  const winner: Kubu = reason === 'benar' ? 'restorasi' : 'revisi';
  const rest = g.players.filter((p) => p.kubu === 'restorasi');
  const caught = g.players
    .filter((p) => p.kubu === 'revisi')
    .filter((p) => rest.filter((r) => g.guess[r.id] === p.id).length >= Math.ceil(rest.length / 2))
    .map((p) => p.id);
  const revs = g.players.filter((p) => p.kubu === 'revisi');
  const sempurna = revs.length > 0 && (winner === 'restorasi' ? caught.length === revs.length : caught.length === 0);
  g.result = { winner, reason, sempurna, caught, anchors, chain };
}

// ── Tampilan per pemain ─────────────────────────────────────────────────────

export interface CopyView {
  cid: string;
  rid: string;
  f: Fact;
  blur: boolean;
  stamp: boolean;
  via: Via;
  from: string;
  bab: number;
  hist?: Edit[];
}
export interface PubView {
  id: string;
  by: string;
  bab: number;
  c: CopyView;
  bantah: boolean;
  umpan: boolean;
}

const cv = (c: Copy, full: boolean): CopyView => ({ cid: c.cid, rid: c.rid, f: c.f, blur: c.blur, stamp: c.stamp, via: c.via, from: c.from, bab: c.bab, ...(full ? { hist: c.hist } : {}) });

export function viewFor(g: Game, pid: string | null, now: number) {
  const me = pid ? byId(g, pid) : undefined;
  const end = g.phase === 'end';
  const started = g.model !== null;
  const tm = temaOfGame(g);
  const script = g.opts.script === 'auto' && g.phase === 'lobby' ? autoScript(Math.max(2, g.players.length)) : scriptOf(g.scriptId);
  const rev = me?.kubu === 'revisi';
  const theories: Record<string, Record<string, Theory>> = {};
  for (const [b, t] of Object.entries(g.theory)) {
    const closed = Number(b) < g.bab || (Number(b) === g.bab && g.phase !== 'segel') || end;
    theories[b] = closed ? t : me && t[me.id] ? { [me.id]: t[me.id]! } : {};
  }
  const visCh = g.phase === 'lobby' || g.phase === 'intro' || g.phase === 'peran' ? 0 : Math.min(3, g.bab);
  return {
    code: g.code,
    phase: g.phase,
    deadline: g.deadline,
    now,
    rev: g.rev,
    bab: g.bab,
    host: g.host,
    me: me?.id ?? null,
    opts: g.opts,
    coop: g.coop,
    tema: started || g.opts.tema !== 'acak' ? (started ? g.temaId : g.opts.tema) : null,
    script: { id: script.id, auto: g.opts.script === 'auto' },
    dim: g.model?.dim ?? null,
    pagu: g.pagu,
    lensaCap: g.lensaCap,
    players: g.players.map((p) => ({
      id: p.id,
      name: p.name,
      avatar: p.avatar,
      ready: p.ready,
      seat: p.seat,
      biro: p.biro,
      lensa: started ? p.lensa : 0,
      done: g.phase === 'aksi' ? !!g.acts[p.id] : g.phase === 'segel' ? !!g.theory[String(g.bab)]?.[p.id] : g.phase === 'pulih' ? !!g.pullVote[p.id] : g.phase === 'vonis' ? !!g.vote[p.id] : g.phase === 'tebak' ? g.guess[p.id] !== undefined : p.ready,
      ...(end || (rev && p.kubu === 'revisi') ? { kubu: p.kubu } : {}),
      ...(end ? { prof: p.prof, used: p.used } : {}),
    })),
    index: g.reports
      .filter((r) => !r.out && !r.umpan && r.ch <= visCh)
      .map((r) => ({ id: r.id, ch: r.ch, holder: g.players[r.holder]?.id ?? null, title: indexTitleOf(g, r), kind: r.f.k })),
    board: g.board.map((b) => ({ id: b.id, by: b.by, bab: b.bab, c: cv(b.c, end), bantah: b.bantah, umpan: b.umpan })),
    certs: g.certs,
    theories,
    notes: g.notes.filter((n) => n.to === '*' || (me && n.to === me.id) || (rev && n.to === 'revisi')).slice(-120),
    pulled: g.pulled,
    vonis: { round: g.voteRound, open: g.open, anchors: g.anchors, tally: g.tally },
    mine: me
      ? {
          prof: me.prof,
          kubu: me.kubu,
          lensa: me.lensa,
          used: me.used,
          tinta: me.tinta,
          copies: (g.copies[me.id] ?? []).filter((c) => !c.hidden).map((c) => cv(c, end)),
          main: g.acts[me.id] ?? null,
          theory: g.theory[String(g.bab)]?.[me.id] ?? null,
          pull: g.pullVote[me.id] ?? null,
          vote: g.vote[me.id] ?? null,
          guess: g.guess[me.id] ?? null,
          attach: g.attach[me.id] ?? null,
          revisi: rev && g.model ? { w: g.model.w, decoy: g.model.decoy, herrings: g.reports.filter((r) => r.herring && !r.umpan).map((r) => r.id), off: g.model.devs[0]!.off } : null,
        }
      : null,
    inPlayCount: g.inPlay.length,
    result: end ? g.result : null,
    reveal: end
      ? {
          w: g.model!.w,
          decoy: g.model!.decoy,
          devs: g.model!.devs,
          log: g.log,
          edits: g.edits,
          reports: g.reports.map((r) => ({ id: r.id, ch: r.ch, holder: g.players[r.holder]?.id ?? null, f: r.f, herring: !!r.herring, out: !!r.out, umpan: !!r.umpan })),
          holderCopies: Object.fromEntries(g.reports.filter((r) => !r.out && !r.umpan).map((r) => [r.id, holderCopy(g, r.id) ? cv(holderCopy(g, r.id)!, true) : null])),
          inPlay: g.inPlay,
        }
      : null,
    tema_judul: tm.judul,
  };
}
export type View = ReturnType<typeof viewFor>;

const indexTitleOf = (g: Game, r: Report) => indexTitle(temaOfGame(g), r.f, dimOf(g));
