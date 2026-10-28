/**
 * Mesin SIDIK: permainan detektif bersama. Murni (tanpa I/O) supaya server,
 * tes, dan simulator keseimbangan memakai aturan yang persis sama.
 *
 * Alur: lobi → pembuka → peran → (malam → pagi → diskusi → coret → putusan) ×3
 *       → tuduhan → [perburuan forensik] → akhir.
 * Tidak ada pemain yang tersingkir: semua main sampai akhir.
 */
import { EVENTS, NAMES, STORIES, type Story } from './stories';

// ── Peran ───────────────────────────────────────────────────────────────────

export type RoleId = 'detektif' | 'forensik' | 'saksi' | 'peretas' | 'pengawal' | 'psikolog' | 'magang' | 'penyusup' | 'kakitangan' | 'peniru' | 'wartawan';
export type Team = 'baik' | 'jahat' | 'netral';

export interface RoleInfo {
  id: RoleId;
  name: string;
  team: Team;
  emoji: string;
  /** Doodle Sehari untuk peran ini. */
  doodle: string;
  /** Satu kalimat dalam cerita. */
  tagline: string;
  /** Apa yang bisa dilakukan. */
  power: string;
  goal: string;
}

export const ROLES: Record<RoleId, RoleInfo> = {
  detektif: { id: 'detektif', doodle: 'ui-cari', name: 'Detektif', team: 'baik', emoji: '🕵️', tagline: 'Matamu tajam, catatanmu rapi.', power: 'Tiap malam selidiki satu tempat dan dapatkan satu petunjuk.', goal: 'Tuduh pelaku yang benar tanpa pernah mencoretnya.' },
  forensik: { id: 'forensik', doodle: 'kacamata', name: 'Ahli Forensik', team: 'baik', emoji: '🔬', tagline: 'Kamu sudah tahu pelakunya dari hasil lab.', power: 'Kamu tahu pelakunya. Tiap malam terbitkan satu Laporan Forensik yang pasti benar.', goal: 'Bimbing tim tanpa ketahuan. Kalau penyusup menebakmu di akhir, tim kalah.' },
  saksi: { id: 'saksi', doodle: 'bintang-mata', name: 'Saksi Mata', team: 'baik', emoji: '👁️', tagline: 'Malam itu kamu melihat sesuatu…', power: 'Di awal kamu tahu dua tersangka: salah satunya pelaku.', goal: 'Bantu tim menemukan pelaku.' },
  peretas: { id: 'peretas', doodle: 'laptop', name: 'Peretas', team: 'baik', emoji: '💻', tagline: 'Tidak ada data yang aman darimu.', power: 'Tiap malam periksa satu orang: apakah petunjuknya malam itu dipalsukan?', goal: 'Bongkar petunjuk palsu.' },
  pengawal: { id: 'pengawal', doodle: 'payung-terbuka', name: 'Pengawal', team: 'baik', emoji: '🛡️', tagline: 'Kamu menjaga yang lain dalam diam.', power: 'Tiap malam lindungi satu orang: petunjuknya tidak bisa dipalsukan.', goal: 'Lindungi kebenaran.' },
  psikolog: { id: 'psikolog', doodle: 'gelembung-kata', name: 'Psikolog', team: 'baik', emoji: '🧠', tagline: 'Kamu membaca orang seperti membaca buku.', power: 'Sekali dalam permainan, pilih dua orang: kamu tahu mereka satu tim atau beda tim.', goal: 'Temukan siapa yang berbohong.' },
  magang: { id: 'magang', doodle: 'tunas', name: 'Detektif Magang', team: 'baik', emoji: '🐣', tagline: 'Semangat besar, pengalaman kecil.', power: 'Tiap malam dapat dua petunjuk, tapi salah satunya keliru, dan kamu tidak tahu yang mana.', goal: 'Bantu tim menemukan pelaku.' },
  penyusup: { id: 'penyusup', doodle: 'pena', name: 'Penyusup', team: 'jahat', emoji: '🐍', tagline: 'Kamu bekerja untuk pelaku.', power: 'Kamu tahu pelakunya. Tiap malam palsukan petunjuk satu orang.', goal: 'Buat tim mencoret pelaku, atau menuduh orang yang salah. Kalau tim benar, tebak siapa Ahli Forensik.' },
  kakitangan: { id: 'kakitangan', doodle: 'penyiram', name: 'Kaki Tangan', team: 'jahat', emoji: '🦊', tagline: 'Tanganmu bersih, tempatnya juga.', power: 'Kamu tahu pelakunya. Tiap malam bersihkan satu tempat: siapa pun yang menyelidiki di sana pulang tanpa petunjuk.', goal: 'Bantu pelaku lolos.' },
  peniru: { id: 'peniru', doodle: 'stempel', name: 'Peniru', team: 'jahat', emoji: '🎭', tagline: 'Tanda tanganmu sempurna.', power: 'Kamu tahu pelakunya. Dua kali dalam permainan, terbitkan Laporan Forensik palsu yang tampak asli.', goal: 'Bantu pelaku lolos.' },
  wartawan: { id: 'wartawan', doodle: 'kamera', name: 'Wartawan', team: 'netral', emoji: '📰', tagline: 'Kamu tidak peduli siapa menang; kamu butuh berita.', power: 'Selidiki seperti detektif. Di akhir, tebak diam-diam siapa Penyusup.', goal: 'Menang sendiri bila tebakanmu tentang Penyusup benar.' },
};

export const teamOf = (r: RoleId | null | undefined): Team => (r ? ROLES[r].team : 'baik');

// ── Tipe permainan ──────────────────────────────────────────────────────────

export type Phase = 'lobby' | 'intro' | 'role' | 'night' | 'dawn' | 'day' | 'vote' | 'verdict' | 'accuse' | 'hunt' | 'end';

export interface Fact {
  c: number;
  v: number;
  neg: boolean;
}

export interface Suspect {
  id: number;
  name: string;
  job: string;
  quirk: string;
  attrs: number[];
  /** 0 = masih dicurigai; selain itu ronde saat dicoret. */
  out: number;
}

/** Semua informasi yang mengalir: petunjuk, laporan, hasil kemampuan. */
export interface Intel {
  id: string;
  /** Penerima: id pemain, '*' untuk semua, 'jahat' untuk tim penyusup. */
  to: string;
  round: number;
  kind: 'selidik' | 'kosong' | 'forensik' | 'magang' | 'saksi' | 'audit' | 'psikolog' | 'cctv' | 'surat' | 'event' | 'gagal' | 'info' | 'bukti';
  /** Untuk bukti yang ditunjukkan: siapa yang menunjukkan, dan petunjuk aslinya. */
  by?: string;
  src?: string;
  text: string;
  fact?: Fact;
  /** Hanya diketahui server; dibuka di siaran ulang. */
  truth?: boolean;
  place?: number;
}

export interface Player {
  id: string;
  name: string;
  avatar: string;
  guest: boolean;
  role: RoleId | null;
  ready: boolean;
}

export interface NightAct {
  place: number;
  target?: string;
  target2?: string;
  pick?: number;
}

export interface LogItem {
  round: number;
  kind: 'tamper' | 'blocked' | 'shadow' | 'burn' | 'shield' | 'audit' | 'forge' | 'publish' | 'psy' | 'event';
  by?: string;
  target?: string;
  target2?: string;
  place?: number;
  note?: string;
}

export interface Result {
  winner: Team;
  reason: 'benar' | 'tercoret' | 'salahtangkap' | 'dibungkam' | 'terbongkar' | 'fitnah' | 'buntu';
  accused?: number;
  hunted?: string;
  /** Wartawan yang tebakannya benar. */
  scoops: string[];
}

export interface Opts {
  /** Detik diskusi tiap hari. */
  talk: number;
  story: string;
  narrator: boolean;
}

export interface Game {
  code: string;
  host: string;
  opts: Opts;
  storyId: string;
  phase: Phase;
  deadline: number | null;
  round: number;
  rounds: number;
  ketua: number;
  players: Player[];
  suspects: Suspect[];
  culprit: number;
  quotas: number[];
  intel: Intel[];
  acts: Record<string, NightAct>;
  /** Pilihan untuk forensik / peniru malam ini (fakta). */
  offers: Record<string, Fact[]>;
  votes: Record<string, number[]>;
  tally: Record<number, number>;
  accuse: Record<string, number>;
  /** Mode paranoia: tuduhan pengkhianat ('' = "tidak ada"). */
  traitorGuess: Record<string, string>;
  scoopGuess: Record<string, string>;
  hunt: string | null;
  event: { id: (typeof EVENTS)[number]['id']; round: number; place?: number } | null;
  uses: Record<string, { forge: number; psy: number }>;
  whispers: { from: string; to: string; text: string; round: number }[];
  log: LogItem[];
  result: Result | null;
  /** Mode paranoia tanpa pengkhianat: "bayangan" aplikasi yang memalsukan. */
  shadow: boolean;
  rng: number;
  seq: number;
  /** Naik setiap ada perubahan; klien memakai ini untuk tahu ada yang baru. */
  rev: number;
  createdAt: number;
}

export const DUR = { intro: 40_000, role: 25_000, night: 45_000, dawn: 25_000, vote: 50_000, verdict: 10_000, accuse: 60_000, hunt: 45_000 };
export const MAX_PLAYERS = 20;

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
const nid = (g: Game) => `i${(g.seq++).toString(36)}`;

export const storyOf = (g: Pick<Game, 'storyId'>): Story => STORIES.find((s) => s.id === g.storyId) ?? STORIES[0]!;
export const holds = (f: Fact, s: Pick<Suspect, 'attrs'>) => (s.attrs[f.c] === f.v) !== f.neg;
export const factText = (st: Story, f: Fact) => `pelaku ${f.neg ? 'tidak ' : ''}${st.cats[f.c]!.traits[f.v]!.phrase}`;

// ── Keseimbangan ────────────────────────────────────────────────────────────

/** Jumlah tersangka per jumlah pemain. */
export function suspectsFor(n: number): number {
  if (n <= 3) return 10;
  if (n <= 4) return 12;
  if (n <= 5) return 16;
  if (n <= 8) return 14;
  if (n <= 11) return 16;
  return 18;
}

/** Kuota coretan tiap ronde, sampai tersisa 3 untuk tuduhan akhir. */
export function quotasFor(s: number): number[] {
  const total = s - 3;
  const a = Math.ceil(total / 3);
  const b = Math.ceil((total - a) / 2);
  return [a, b, total - a - b];
}

/** Peluang petunjuk berupa "tidak …" (lebih lemah). Makin ramai, makin lemah. */
export function negChance(n: number): number {
  if (n <= 3) return 0.45;
  if (n <= 6) return 0.6;
  if (n <= 10) return 0.7;
  return 0.7;
}

/** Petunjuk per orang tiap malam: grup kecil butuh lebih banyak bahan. */
export const cluesFor = (n: number) => (n <= 3 ? 2 : 1);

/** Komposisi peran. 2–3 orang: mode paranoia (mungkin ada pengkhianat, mungkin tidak). */
export function rolesFor(n: number, r: () => number): { roles: RoleId[]; shadow: boolean } {
  if (n <= 3) {
    const traitor = r() < (n === 2 ? 0.5 : 0.6);
    const roles: RoleId[] = n === 2 ? ['detektif', 'detektif'] : ['detektif', 'detektif', 'detektif'];
    if (traitor) roles[0] = 'penyusup';
    return { roles, shadow: !traitor };
  }
  const e = n <= 5 ? 1 : n <= 7 ? 2 : n <= 11 ? 3 : n <= 14 ? 4 : 5;
  const evil: RoleId[] = (['penyusup', 'kakitangan', 'peniru', 'kakitangan', 'kakitangan'] as RoleId[]).slice(0, e);
  const unlock: [RoleId, number][] = [
    ['peretas', 4],
    ['saksi', 4],
    ['forensik', 6],
    ['pengawal', 8],
    ['psikolog', 8],
    ['magang', 9],
    ['wartawan', 10],
  ];
  const good = n - e;
  const specials = unlock.filter(([, m]) => n >= m).map(([id]) => id).slice(0, good - 1);
  const roles = [...evil, ...specials, ...Array<RoleId>(good - specials.length).fill('detektif')];
  return { roles, shadow: false };
}

// ── Membuat permainan ───────────────────────────────────────────────────────

export function newGame(code: string, host: Omit<Player, 'role' | 'ready'>, now: number, seed: number): Game {
  return {
    code,
    host: host.id,
    opts: { talk: 150, story: 'acak', narrator: true },
    storyId: STORIES[0]!.id,
    phase: 'lobby',
    deadline: null,
    round: 0,
    rounds: 3,
    ketua: 0,
    players: [{ ...host, role: null, ready: false }],
    suspects: [],
    culprit: 0,
    quotas: [],
    intel: [],
    acts: {},
    offers: {},
    votes: {},
    tally: {},
    accuse: {},
    traitorGuess: {},
    scoopGuess: {},
    hunt: null,
    event: null,
    uses: {},
    whispers: [],
    log: [],
    result: null,
    shadow: false,
    rng: seed >>> 0,
    seq: 0,
    rev: 1,
    createdAt: now,
  };
}

export class GameError extends Error {}
const fail = (m: string): never => {
  throw new GameError(m);
};

export function join(g: Game, p: Omit<Player, 'role' | 'ready'>) {
  const me = g.players.find((x) => x.id === p.id);
  if (me) {
    me.name = p.name;
    me.avatar = p.avatar;
  } else {
    if (g.phase !== 'lobby') fail('Permainan sudah dimulai. Tunggu kasus berikutnya, ya.');
    if (g.players.length >= MAX_PLAYERS) fail('Ruangan penuh (20 orang).');
    g.players.push({ ...p, role: null, ready: false });
  }
  g.rev++;
}

export function leave(g: Game, pid: string) {
  if (g.phase !== 'lobby') return;
  g.players = g.players.filter((p) => p.id !== pid);
  if (g.host === pid && g.players[0]) g.host = g.players[0].id;
  g.rev++;
}

function makeSuspects(g: Game, st: Story, count: number): Suspect[] {
  const seen = new Set<string>();
  const names = shuffle(g, NAMES);
  const roles = shuffle(g, st.roles);
  const out: Suspect[] = [];
  while (out.length < count) {
    const attrs = st.cats.map(() => Math.floor(rand(g) * 3));
    const key = attrs.join('');
    if (seen.has(key)) continue;
    seen.add(key);
    const i = out.length;
    const role = roles[i % roles.length]!;
    out.push({ id: i, name: names[i % names.length]!, job: role.job, quirk: role.quirk, attrs, out: 0 });
  }
  return out;
}

export function start(g: Game, by: string, now: number) {
  if (by !== g.host) fail('Hanya tuan rumah yang bisa memulai.');
  if (g.phase !== 'lobby' && g.phase !== 'end') fail('Permainan sedang berjalan.');
  const n = g.players.length;
  if (n < 2) fail('Butuh minimal 2 orang.');
  // Main lagi: bersihkan sisa permainan sebelumnya, pemain tetap.
  Object.assign(g, { intel: [], acts: {}, offers: {}, votes: {}, tally: {}, accuse: {}, traitorGuess: {}, scoopGuess: {}, hunt: null, whispers: [], log: [], result: null, uses: {} });
  g.storyId = g.opts.story !== 'acak' && STORIES.some((s) => s.id === g.opts.story) ? g.opts.story : pick(g, STORIES).id;
  const st = storyOf(g);
  const { roles, shadow } = rolesFor(n, () => rand(g));
  shuffle(g, roles).forEach((r, i) => {
    g.players[i]!.role = r;
    g.players[i]!.ready = false;
  });
  g.shadow = shadow;
  g.suspects = makeSuspects(g, st, suspectsFor(n));
  g.culprit = Math.floor(rand(g) * g.suspects.length);
  g.quotas = quotasFor(g.suspects.length);
  g.round = 0;
  g.ketua = Math.floor(rand(g) * n);
  g.event = { id: pick(g, EVENTS).id, round: 2 };
  for (const p of g.players) g.uses[p.id] = { forge: p.role === 'peniru' ? 2 : 0, psy: p.role === 'psikolog' ? 1 : 0 };
  // Saksi: dua wajah, salah satunya pelaku.
  for (const p of g.players.filter((x) => x.role === 'saksi')) {
    const other = pick(g, g.suspects.filter((s) => s.id !== g.culprit));
    const pair = shuffle(g, [g.culprit, other.id]);
    g.intel.push({ id: nid(g), to: p.id, round: 0, kind: 'saksi', text: `Malam itu kamu melihat ${g.suspects[pair[0]!]!.name} atau ${g.suspects[pair[1]!]!.name} di dekat TKP. Satu di antara mereka pelakunya.` });
  }
  setPhase(g, 'intro', now + DUR.intro);
}

function setPhase(g: Game, ph: Phase, deadline: number | null) {
  g.phase = ph;
  g.deadline = deadline;
  for (const p of g.players) p.ready = false;
  g.rev++;
}

const alive = (g: Game) => g.suspects.filter((s) => s.out === 0);
const evilPlayers = (g: Game) => g.players.filter((p) => teamOf(p.role) === 'jahat');

// ── Fakta ───────────────────────────────────────────────────────────────────

/** Fakta benar tentang pelaku pada kategori c yang mencoret ≥1 tersangka tersisa. */
function trueFact(g: Game, c: number, negP: number): Fact {
  const cul = g.suspects[g.culprit]!;
  const left = alive(g).filter((s) => s.id !== cul.id);
  for (let i = 0; i < 12; i++) {
    const neg = rand(g) < negP;
    const v = neg ? pick(g, [0, 1, 2].filter((x) => x !== cul.attrs[c])) : cul.attrs[c]!;
    const f = { c, v, neg };
    if (left.some((s) => !holds(f, s))) return f;
  }
  return { c, v: cul.attrs[c]!, neg: false };
}

/** Fakta palsu yang tampak masuk akal: benar untuk seorang tersangka lain, salah untuk pelaku. */
function falseFact(g: Game, c: number | null, negP: number): Fact {
  const cul = g.suspects[g.culprit]!;
  const cats = c === null ? [0, 1, 2, 3] : [c, 0, 1, 2, 3];
  const decoys = shuffle(g, alive(g).filter((s) => s.id !== cul.id));
  for (const cc of cats)
    for (const d of decoys) {
      if (d.attrs[cc] === cul.attrs[cc]) continue;
      const neg = rand(g) < negP;
      return neg ? { c: cc, v: cul.attrs[cc]!, neg: true } : { c: cc, v: d.attrs[cc]!, neg: false };
    }
  const cc = c ?? 0;
  return { c: cc, v: cul.attrs[cc]!, neg: true };
}

function clueText(st: Story, place: number | null, f: Fact, g: Game) {
  const src = place === null ? 'Sumber tak dikenal' : pick(g, st.places[place]!.sources);
  return `${src}: ${factText(st, f)}.`;
}

// ── Aksi pemain ─────────────────────────────────────────────────────────────

export type Action =
  | { t: 'ready' }
  | { t: 'opts'; opts: Partial<Opts> }
  | { t: 'start' }
  | { t: 'night'; place: number; target?: string; target2?: string; pick?: number }
  | { t: 'vote'; ids: number[] }
  | { t: 'accuse'; id: number; scoop?: string; traitor?: string }
  | { t: 'show'; id: string }
  | { t: 'hunt'; target: string }
  | { t: 'whisper'; to: string; text: string };

export function act(g: Game, pid: string, a: Action, now: number) {
  const me = g.players.find((p) => p.id === pid) ?? fail('Kamu bukan pemain di ruangan ini.');
  const others = (id?: string) => !!id && id !== pid && g.players.some((p) => p.id === id);
  switch (a.t) {
    case 'opts':
      if (pid !== g.host || g.phase !== 'lobby') fail('Hanya tuan rumah di lobi.');
      g.opts = { ...g.opts, ...a.opts, talk: Math.min(600, Math.max(45, a.opts.talk ?? g.opts.talk)) };
      break;
    case 'start':
      start(g, pid, now);
      return;
    case 'ready':
      me.ready = true;
      break;
    case 'night': {
      if (g.phase !== 'night') fail('Bukan malam.');
      if (!(a.place >= 0 && a.place < 4)) fail('Pilih tempat.');
      const r = me.role;
      const x: NightAct = { place: a.place };
      if ((r === 'penyusup' || r === 'pengawal' || r === 'peretas') && others(a.target)) x.target = a.target;
      if (r === 'psikolog' && (g.uses[pid]?.psy ?? 0) > 0 && others(a.target) && others(a.target2) && a.target !== a.target2) {
        x.target = a.target;
        x.target2 = a.target2;
      }
      if (r === 'kakitangan' && a.pick !== undefined && a.pick >= 0 && a.pick < 4) x.pick = a.pick;
      if ((r === 'forensik' || (r === 'peniru' && (g.uses[pid]?.forge ?? 0) > 0)) && a.pick !== undefined && a.pick >= 0 && a.pick < (g.offers[pid]?.length ?? 0)) x.pick = a.pick;
      g.acts[pid] = x;
      break;
    }
    case 'vote': {
      if (g.phase !== 'vote') fail('Bukan waktunya mencoret.');
      const q = g.quotas[g.round - 1] ?? 0;
      const ids = [...new Set(a.ids)].filter((id) => g.suspects[id]?.out === 0).slice(0, q);
      g.votes[pid] = ids;
      break;
    }
    case 'accuse':
      if (g.phase !== 'accuse') fail('Bukan waktunya menuduh.');
      if (g.suspects[a.id]?.out !== 0) fail('Tersangka itu sudah dicoret.');
      g.accuse[pid] = a.id;
      if (me.role === 'wartawan' && a.scoop && others(a.scoop)) g.scoopGuess[pid] = a.scoop;
      if (g.players.length <= 3 && a.traitor !== undefined) g.traitorGuess[pid] = a.traitor === '' || others(a.traitor) ? a.traitor : '';
      break;
    case 'show': {
      // Tunjukkan bukti: kartu petunjuk tampil di semua HP, apa adanya (yang
      // dipalsukan pun tetap palsu, karena pemiliknya tidak tahu).
      if (!['dawn', 'day', 'vote'].includes(g.phase)) fail('Bukti hanya bisa ditunjukkan di siang hari.');
      const it = g.intel.find((i) => i.id === a.id && i.to === pid && ['selidik', 'magang', 'cctv', 'kosong', 'audit', 'psikolog', 'saksi'].includes(i.kind));
      if (!it) fail('Itu bukan petunjukmu.');
      if (g.intel.some((i) => i.kind === 'bukti' && i.src === it!.id)) fail('Sudah ditunjukkan.');
      g.intel.push({ ...it!, id: nid(g), to: '*', kind: 'bukti', by: pid, src: it!.id, round: g.round });
      break;
    }
    case 'hunt':
      if (g.phase !== 'hunt' || me.role !== 'penyusup') fail('Hanya penyusup yang berburu.');
      if (!others(a.target)) fail('Pilih seseorang.');
      g.hunt = a.target;
      break;
    case 'whisper': {
      if (!['dawn', 'day'].includes(g.phase)) fail('Bisikan hanya di siang hari.');
      if (g.whispers.some((w) => w.from === pid && w.round === g.round)) fail('Satu bisikan per hari.');
      if (!others(a.to)) fail('Pilih seseorang.');
      g.whispers.push({ from: pid, to: a.to, text: a.text.slice(0, 140), round: g.round });
      break;
    }
  }
  g.rev++;
  tick(g, now);
}

// ── Pergantian fase ─────────────────────────────────────────────────────────

function allDone(g: Game): boolean {
  const ps = g.players;
  switch (g.phase) {
    case 'intro':
    case 'role':
    case 'dawn':
    case 'day':
      return ps.every((p) => p.ready);
    case 'night':
      return ps.every((p) => g.acts[p.id]);
    case 'vote':
      return ps.every((p) => g.votes[p.id]);
    case 'accuse':
      return ps.every((p) => g.accuse[p.id] !== undefined);
    case 'hunt':
      return g.hunt !== null;
    default:
      return false;
  }
}

/** Majukan fase bila tenggat lewat atau semua sudah siap. Dipanggil setiap ada permintaan. */
export function tick(g: Game, now: number): boolean {
  let moved = false;
  for (let guard = 0; guard < 6; guard++) {
    if (g.phase === 'lobby' || g.phase === 'end') break;
    const due = g.deadline !== null && now >= g.deadline;
    if (!due && !allDone(g)) break;
    advance(g, now);
    moved = true;
  }
  return moved;
}

function talkMs(g: Game) {
  const base = g.opts.talk * 1000;
  return g.event?.id === 'badai' && g.event.round === g.round ? Math.round(base * 0.6) : base;
}

function advance(g: Game, now: number) {
  switch (g.phase) {
    case 'intro':
      return setPhase(g, 'role', now + DUR.role);
    case 'role':
      g.round = 1;
      return startNight(g, now);
    case 'night':
      resolveNight(g);
      return setPhase(g, 'dawn', now + DUR.dawn);
    case 'dawn':
      return setPhase(g, 'day', now + talkMs(g));
    case 'day':
      g.votes = {};
      return setPhase(g, 'vote', now + DUR.vote);
    case 'vote':
      resolveVote(g);
      if (g.result) return setPhase(g, 'end', null);
      return setPhase(g, 'verdict', now + DUR.verdict);
    case 'verdict':
      if (g.round < g.rounds) {
        g.round++;
        g.ketua = (g.ketua + 1) % g.players.length;
        return startNight(g, now);
      }
      g.accuse = {};
      return setPhase(g, 'accuse', now + DUR.accuse);
    case 'accuse':
      resolveAccuse(g, now);
      if ((g.phase as Phase) === 'hunt') return;
      return setPhase(g, 'end', null);
    case 'hunt':
      resolveHunt(g);
      return setPhase(g, 'end', null);
  }
}

function startNight(g: Game, now: number) {
  g.acts = {};
  g.offers = {};
  const negP = negChance(g.players.length);
  for (const p of g.players) {
    if (p.role === 'forensik') g.offers[p.id] = [0, 1, 2].map(() => trueFact(g, Math.floor(rand(g) * 4), Math.max(negP, 0.75)));
    if (p.role === 'peniru' && (g.uses[p.id]?.forge ?? 0) > 0) g.offers[p.id] = [0, 1, 2].map(() => falseFact(g, null, Math.max(negP, 0.75)));
  }
  if (g.event?.id === 'padam' && g.event.round === g.round) g.event.place = Math.floor(rand(g) * 4);
  setPhase(g, 'night', now + DUR.night);
}

function resolveNight(g: Game) {
  const st = storyOf(g);
  const r = g.round;
  const n = g.players.length;
  const negP = negChance(n);
  const acts = (p: Player) => g.acts[p.id] ?? { place: Math.floor(rand(g) * 4) };

  const burned = new Set<number>();
  for (const p of g.players.filter((x) => x.role === 'kakitangan')) {
    const pl = acts(p).pick;
    if (pl !== undefined) {
      burned.add(pl);
      g.log.push({ round: r, kind: 'burn', by: p.id, place: pl });
    }
  }
  if (g.event?.id === 'padam' && g.event.round === r && g.event.place !== undefined) burned.add(g.event.place);

  const shielded = new Set<string>();
  for (const p of g.players.filter((x) => x.role === 'pengawal')) {
    const t = acts(p).target;
    if (t) {
      shielded.add(t);
      g.log.push({ round: r, kind: 'shield', by: p.id, target: t });
    }
  }

  const tampered = new Map<string, string>();
  for (const p of g.players.filter((x) => x.role === 'penyusup')) {
    const t = acts(p).target;
    if (!t) continue;
    if (shielded.has(t)) {
      g.log.push({ round: r, kind: 'blocked', by: p.id, target: t });
      g.intel.push({ id: nid(g), to: p.id, round: r, kind: 'gagal', text: 'Usahamu malam ini gagal: seseorang menjaga orang itu.' });
    } else tampered.set(t, p.id);
  }
  // Bayangan aplikasi di mode paranoia tanpa pengkhianat.
  if (g.shadow && rand(g) < 0.4) {
    const t = pick(g, g.players).id;
    if (!shielded.has(t)) {
      tampered.set(t, 'bayangan');
      g.log.push({ round: r, kind: 'shadow', target: t });
    }
  }

  const clueOf = new Map<string, Intel | null>();
  for (const p of g.players) {
    const a = acts(p);
    const place = a.place;
    if (burned.has(place)) {
      const why = g.event?.id === 'padam' && g.event.place === place ? 'Listrik padam di sana. Gelap total.' : 'Tempat itu sudah dibersihkan seseorang. Tidak ada jejak tersisa.';
      const it: Intel = { id: nid(g), to: p.id, round: r, kind: 'kosong', text: `${st.places[place]!.emoji} ${st.places[place]!.name}: ${why}`, place };
      g.intel.push(it);
      clueOf.set(p.id, null);
      continue;
    }
    const cat = st.places[place]!.cat;
    const fake = tampered.has(p.id) && teamOf(p.role) !== 'jahat';
    const f = fake ? falseFact(g, cat, negP) : trueFact(g, cat, negP);
    if (fake) g.log.push({ round: r, kind: tampered.get(p.id) === 'bayangan' ? 'shadow' : 'tamper', by: tampered.get(p.id), target: p.id, place });
    const it: Intel = { id: nid(g), to: p.id, round: r, kind: 'selidik', text: clueText(st, place, f, g), fact: f, truth: !fake, place };
    g.intel.push(it);
    clueOf.set(p.id, it);
    // Petunjuk tambahan di grup kecil: dari kategori lain, selalu asli.
    if (p.role !== 'magang')
      for (let k = 1; k < cluesFor(n); k++) {
        const c2 = (cat + k) % 4;
        const f2 = trueFact(g, c2, negP);
        const pl2 = st.places.findIndex((x) => x.cat === c2);
        g.intel.push({ id: nid(g), to: p.id, round: r, kind: 'selidik', text: clueText(st, pl2 >= 0 ? pl2 : place, f2, g), fact: f2, truth: true, place: pl2 >= 0 ? pl2 : place });
      }
    if (p.role === 'magang') {
      const f2 = falseFact(g, cat, negP);
      const pair = shuffle(g, [it, { id: nid(g), to: p.id, round: r, kind: 'magang' as const, text: clueText(st, place, f2, g), fact: f2, truth: false, place }]);
      it.kind = 'magang';
      g.intel.splice(g.intel.indexOf(it), 1, ...pair);
    }
  }

  for (const p of g.players.filter((x) => x.role === 'peretas')) {
    const t = acts(p).target;
    if (!t) continue;
    const c = clueOf.get(t);
    const name = g.players.find((x) => x.id === t)?.name ?? 'dia';
    const res = c === undefined || c === null ? `${name} tidak mendapat petunjuk malam ini.` : c.truth ? `Petunjuk ${name} malam ini ASLI.` : `Petunjuk ${name} malam ini DIPALSUKAN!`;
    g.intel.push({ id: nid(g), to: p.id, round: r, kind: 'audit', text: res });
    g.log.push({ round: r, kind: 'audit', by: p.id, target: t, note: res });
  }

  const reports: Intel[] = [];
  for (const p of g.players.filter((x) => x.role === 'forensik')) {
    const f = g.offers[p.id]?.[acts(p).pick ?? 0];
    if (!f) continue;
    reports.push({ id: nid(g), to: '*', round: r, kind: 'forensik', text: `📢 Laporan Forensik: ${factText(st, f)}.`, fact: f, truth: true });
    g.log.push({ round: r, kind: 'publish', by: p.id });
  }
  for (const p of g.players.filter((x) => x.role === 'peniru')) {
    const k = acts(p).pick;
    const f = k === undefined ? undefined : g.offers[p.id]?.[k];
    if (!f) continue;
    g.uses[p.id]!.forge--;
    reports.push({ id: nid(g), to: '*', round: r, kind: 'forensik', text: `📢 Laporan Forensik: ${factText(st, f)}.`, fact: f, truth: false });
    g.log.push({ round: r, kind: 'forge', by: p.id });
  }
  g.intel.push(...shuffle(g, reports));

  for (const p of g.players.filter((x) => x.role === 'psikolog')) {
    const a = acts(p);
    if (!a.target || !a.target2 || (g.uses[p.id]?.psy ?? 0) <= 0) continue;
    g.uses[p.id]!.psy--;
    const t1 = g.players.find((x) => x.id === a.target)!;
    const t2 = g.players.find((x) => x.id === a.target2)!;
    const side = (pl: Player) => (teamOf(pl.role) === 'jahat' ? 'jahat' : 'baik');
    const same = side(t1) === side(t2);
    const text = `${t1.name} dan ${t2.name}: ${same ? 'SATU TIM' : 'BEDA TIM'}.`;
    g.intel.push({ id: nid(g), to: p.id, round: r, kind: 'psikolog', text });
    g.log.push({ round: r, kind: 'psy', by: p.id, target: t1.id, target2: t2.id, note: text });
  }

  const ev = g.event;
  if (ev && ev.round === r) {
    const info = EVENTS.find((e) => e.id === ev.id)!;
    g.intel.push({ id: nid(g), to: '*', round: r, kind: 'event', text: `⚡ ${info.title}. ${info.text}` });
    g.log.push({ round: r, kind: 'event', note: info.title });
    if (ev.id === 'saksi') {
      const f = trueFact(g, Math.floor(rand(g) * 4), negP);
      g.intel.push({ id: nid(g), to: '*', round: r, kind: 'surat', text: `🗣️ Saksi baru: ${factText(st, f)}.`, fact: f, truth: true });
    }
    if (ev.id === 'suratkaleng') {
      const real = rand(g) < 0.5;
      const f = real ? trueFact(g, Math.floor(rand(g) * 4), negP) : falseFact(g, null, negP);
      g.intel.push({ id: nid(g), to: '*', round: r, kind: 'surat', text: `✉️ Surat kaleng: ${factText(st, f)}.`, fact: f, truth: real });
    }
    if (ev.id === 'cctv') {
      const k = g.players[g.ketua]!;
      const f = trueFact(g, Math.floor(rand(g) * 4), 0);
      g.intel.push({ id: nid(g), to: k.id, round: r, kind: 'cctv', text: `📹 Rekaman CCTV (hanya kamu yang melihat): ${factText(st, f)}.`, fact: f, truth: true });
    }
  }
}

function resolveVote(g: Game) {
  const q = g.quotas[g.round - 1] ?? 0;
  const count = new Map<number, number>();
  for (const ids of Object.values(g.votes)) for (const id of ids) count.set(id, (count.get(id) ?? 0) + 1);
  g.tally = Object.fromEntries(count);
  const ketuaVotes = new Set(g.votes[g.players[g.ketua]?.id ?? ''] ?? []);
  // Hanya tersangka yang dicoret lebih dari separuh pemain yang benar-benar dicoret.
  const need = Math.floor(g.players.length / 2) + 1;
  const order = shuffle(g, alive(g))
    .filter((s) => (count.get(s.id) ?? 0) >= need)
    .sort((a, b) => (count.get(b.id) ?? 0) - (count.get(a.id) ?? 0) || Number(ketuaVotes.has(b.id)) - Number(ketuaVotes.has(a.id)));
  for (const s of order.slice(0, q)) s.out = g.round;
  if (g.suspects[g.culprit]!.out) g.result = { winner: 'jahat', reason: 'tercoret', scoops: [] };
}

function resolveAccuse(g: Game, now: number) {
  const count = new Map<number, number>();
  for (const id of Object.values(g.accuse)) count.set(id, (count.get(id) ?? 0) + 1);
  const left = alive(g);
  const best = Math.max(0, ...left.map((s) => count.get(s.id) ?? 0));
  const tied = left.filter((s) => (count.get(s.id) ?? 0) === best);
  const kv = g.accuse[g.players[g.ketua]?.id ?? ''];
  const chosen = tied.find((s) => s.id === kv) ?? pick(g, tied);
  const penyusup = g.players.filter((p) => p.role === 'penyusup').map((p) => p.id);
  const scoops = Object.entries(g.scoopGuess)
    .filter(([, t]) => penyusup.includes(t))
    .map(([w]) => w);
  // Mode paranoia (2–3 orang): membongkar pengkhianat juga kemenangan; memfitnah rekan adalah kekalahan.
  if (g.players.length <= 3) {
    const goods = g.players.filter((p) => teamOf(p.role) !== 'jahat');
    const traitor = g.players.find((p) => p.role === 'penyusup')?.id ?? '';
    const guesses = goods.map((p) => g.traitorGuess[p.id] ?? '');
    const right = guesses.filter((x) => x === traitor).length;
    const wrongAccuse = guesses.filter((x) => x !== '' && x !== traitor).length;
    if (traitor && right * 2 > goods.length) {
      g.result = { winner: 'baik', reason: 'terbongkar', accused: chosen.id, scoops };
      return;
    }
    if (wrongAccuse * 2 > goods.length || (wrongAccuse > 0 && goods.length === 1)) {
      g.result = { winner: 'jahat', reason: 'fitnah', accused: chosen.id, scoops };
      return;
    }
  }
  if (chosen.id !== g.culprit) {
    g.result = { winner: 'jahat', reason: 'salahtangkap', accused: chosen.id, scoops };
    return;
  }
  const hasForensik = g.players.some((p) => p.role === 'forensik');
  if (hasForensik && penyusup.length) {
    g.result = { winner: 'baik', reason: 'benar', accused: chosen.id, scoops };
    g.hunt = null;
    setPhase(g, 'hunt', now + DUR.hunt);
    return;
  }
  g.result = { winner: 'baik', reason: 'benar', accused: chosen.id, scoops };
}

function resolveHunt(g: Game) {
  const target = g.hunt ?? pick(g, g.players.filter((p) => teamOf(p.role) !== 'jahat')).id;
  const hit = g.players.find((p) => p.id === target)?.role === 'forensik';
  g.result = { ...(g.result ?? { scoops: [] }), winner: hit ? 'jahat' : 'baik', reason: hit ? 'dibungkam' : 'benar', hunted: target } as Result;
}

// ── Tampilan per pemain ─────────────────────────────────────────────────────

export interface View {
  code: string;
  rev: number;
  phase: Phase;
  deadline: number | null;
  now: number;
  round: number;
  rounds: number;
  host: string;
  ketua: string | null;
  opts: Opts;
  story: Story;
  players: { id: string; name: string; avatar: string; guest: boolean; ready: boolean; acted: boolean; role: RoleId | null; team: Team | null }[];
  me: {
    id: string;
    role: RoleId | null;
    /** Pelaku (hanya untuk yang memang tahu). */
    culprit: number | null;
    allies: string[];
    offers: string[];
    uses: { forge: number; psy: number };
    act: NightAct | null;
    votes: number[];
    accuse: number | null;
    whispered: boolean;
  } | null;
  suspects: Suspect[];
  quota: number;
  tally: Record<number, number>;
  intel: Intel[];
  whispers: { from: string; to: string; text: string; round: number }[];
  event: Game['event'];
  result: Result | null;
  culprit: number | null;
  log: LogItem[];
  shadow: boolean | null;
}

export function viewFor(g: Game, pid: string | null, now: number): View {
  const me = g.players.find((p) => p.id === pid) ?? null;
  const end = g.phase === 'end';
  const evilMe = me && teamOf(me.role) === 'jahat';
  const knows = end || !!evilMe || me?.role === 'forensik';
  const st = storyOf(g);
  const actedFlag = (p: Player) =>
    g.phase === 'night' ? !!g.acts[p.id] : g.phase === 'vote' ? !!g.votes[p.id] : g.phase === 'accuse' ? g.accuse[p.id] !== undefined : p.ready;
  return {
    code: g.code,
    rev: g.rev,
    phase: g.phase,
    deadline: g.deadline,
    now,
    round: g.round,
    rounds: g.rounds,
    host: g.host,
    ketua: g.players[g.ketua]?.id ?? null,
    opts: g.opts,
    story: st,
    players: g.players.map((p) => {
      const visible = end || p.id === pid || (evilMe && teamOf(p.role) === 'jahat');
      return { id: p.id, name: p.name, avatar: p.avatar, guest: p.guest, ready: p.ready, acted: actedFlag(p), role: visible ? p.role : null, team: visible ? teamOf(p.role) : null };
    }),
    me: me
      ? {
          id: me.id,
          role: g.phase === 'lobby' ? null : me.role,
          culprit: knows && g.phase !== 'lobby' ? g.culprit : null,
          allies: evilMe ? evilPlayers(g).map((p) => p.id).filter((id) => id !== me.id) : [],
          offers: g.phase === 'night' ? (g.offers[me.id] ?? []).map((f) => factText(st, f)) : [],
          uses: g.uses[me.id] ?? { forge: 0, psy: 0 },
          act: g.acts[me.id] ?? null,
          votes: g.votes[me.id] ?? [],
          accuse: g.accuse[me.id] ?? null,
          whispered: g.whispers.some((w) => w.from === me.id && w.round === g.round),
        }
      : null,
    suspects: g.phase === 'lobby' ? [] : g.suspects,
    quota: g.quotas[g.round - 1] ?? 0,
    tally: ['verdict', 'night', 'dawn', 'day', 'accuse', 'hunt', 'end'].includes(g.phase) ? g.tally : {},
    intel: g.intel
      .filter((i) => end || i.to === '*' || i.to === pid || (i.to === 'jahat' && evilMe))
      .map((i) => (end ? i : { ...i, truth: undefined })),
    whispers: g.whispers.filter((w) => w.from === pid || w.to === pid || end),
    event: g.event && (end || g.round >= g.event.round) ? g.event : null,
    result: end ? g.result : null,
    culprit: end ? g.culprit : null,
    log: end ? g.log : [],
    shadow: end ? g.shadow : null,
  };
}
