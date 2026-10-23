// "Tentang Kita": permainan kartu ngobrol untuk pasangan, PDKT, sahabat,
// rame-rame, atau sendirian. Pertanyaannya sengaja tidak kacangan: mengajak
// berpendapat, saling membuka, dan (di kartu Renung) memikirkan semesta.
//
// Bank kartu ditulis ringkas per kelompok. Satu baris = satu kartu:
//   teks ## isian-kedua || gali lagi 1 || gali lagi 2
// `isian-kedua` dipakai kartu Dilema (sisi A // sisi B) dan Renung (kata
// kunci riset, dipisah koma). id = `${awalan}-${nomor baris}`, jadi kelompok
// hanya boleh DITAMBAH di ujung, jangan disisipi atau diurutkan ulang.

import { TK_PASANGAN } from './tkPasangan';
import { TK_PDKT } from './tkPdkt';
import { TK_RENUNG } from './tkRenung';
import { TK_SAHABAT } from './tkSahabat';
import { TK_SEMUA } from './tkSemua';

export type TkRelation = 'pasangan' | 'pdkt' | 'sahabat' | 'sendiri';
/**
 * tanya = pertanyaan terbuka · cermin = tentang orang di depanmu ·
 * tebak = tebak jawaban orang lain · dilema = dua sisi untuk dibela ·
 * renung = filosofis/semesta, bisa dijawab spontan atau diriset dulu ·
 * liar = tantangan kecil.
 */
export type TkKind = 'tanya' | 'cermin' | 'tebak' | 'dilema' | 'renung' | 'liar';
export type TkLevel = 1 | 2 | 3;

export interface TkCard {
  id: string;
  kind: TkKind;
  level: TkLevel;
  /** Kosong = cocok untuk semua hubungan. */
  rel: TkRelation[];
  text: string;
  /** Pertanyaan lanjutan untuk tombol "gali lagi". */
  deeper: string[];
  /** Dilema: dua sisi yang dibela. */
  sides?: [string, string];
  /** Renung: kata kunci untuk mode riset. */
  research?: string[];
  /** Renung: tema kecil (semesta, kesadaran, …). */
  theme?: string;
}

export interface TkGroup {
  prefix: string;
  kind: TkKind;
  level: TkLevel;
  rel: TkRelation[];
  theme?: string;
  lines: string;
}

export function parseGroup(g: TkGroup): TkCard[] {
  return g.lines
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('//'))
    .map((line, i) => {
      const [head = '', ...deeper] = line.split('||').map((s) => s.trim());
      const [text = '', extra] = head.split('##').map((s) => s.trim());
      const card: TkCard = { id: `${g.prefix}-${i + 1}`, kind: g.kind, level: g.level, rel: g.rel, text, deeper: deeper.filter(Boolean) };
      if (g.theme) card.theme = g.theme;
      if (extra && g.kind === 'dilema') {
        const [a = '', b = ''] = extra.split('//').map((s) => s.trim());
        card.sides = [a, b];
      }
      if (extra && g.kind === 'renung') card.research = extra.split(',').map((s) => s.trim()).filter(Boolean);
      return card;
    });
}

export const TK_CARDS: TkCard[] = [...TK_PASANGAN, ...TK_PDKT, ...TK_SAHABAT, ...TK_SEMUA, ...TK_RENUNG].flatMap(parseGroup);

export const TK_RELATION_LABEL: Record<TkRelation, { name: string; sub: string }> = {
  pasangan: { name: 'pasangan', sub: 'yang sudah saling memilih' },
  pdkt: { name: 'pdkt & baru kenal', sub: 'masih saling meraba' },
  sahabat: { name: 'sahabat & rame-rame', sub: 'dua orang atau satu meja penuh' },
  sendiri: { name: 'sendirian', sub: 'renungan untuk dirimu' },
};

export const TK_KIND_LABEL: Record<TkKind, { name: string; hint: string }> = {
  tanya: { name: 'tanya', hint: 'jawab sejujur yang kamu mampu' },
  cermin: { name: 'cermin', hint: 'tentang orang di depanmu' },
  tebak: { name: 'tebak', hint: 'tebak dulu jawabannya, baru buka' },
  dilema: { name: 'dilema', hint: 'pilih sisi, bela, lalu tukar posisi' },
  renung: { name: 'renung', hint: 'jawab spontan, atau riset dulu' },
  liar: { name: 'kartu liar', hint: 'lakukan, jangan cuma dibaca' },
};

export const TK_LEVEL_LABEL: Record<TkLevel, string> = {
  1: 'permukaan yang jujur',
  2: 'ke dalam',
  3: 'ke inti',
};

export interface TkDeckOptions {
  rel: TkRelation;
  levels: TkLevel[];
  kinds: TkKind[];
  /** `naik` = level 1 dulu lalu makin dalam; `acak` = campur. */
  order: 'naik' | 'acak';
  /** Jumlah kartu; 0 = semua yang cocok. */
  size: number;
}

/** Kartu yang cocok untuk hubungan tertentu. Sendirian tidak memakai kartu yang butuh orang lain. */
export function tkPool(rel: TkRelation, cards: TkCard[] = TK_CARDS): TkCard[] {
  return cards.filter((c) => {
    if (rel === 'sendiri') return c.rel.length === 0 && (c.kind === 'tanya' || c.kind === 'renung' || c.kind === 'dilema');
    return c.rel.length === 0 || c.rel.includes(rel);
  });
}

/** Acak berbasis benih, supaya dua HP dengan benih yang sama mendapat urutan yang sama. */
export function tkRandom(seed: string): () => number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  let a = h >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(xs: T[], rand: () => number): T[] {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

/** Hindari dua kartu sejenis berturut-turut (kecuali `tanya`), supaya ritmenya hidup. */
function spread(cards: TkCard[]): TkCard[] {
  const a = [...cards];
  for (let i = 1; i < a.length; i++) {
    if (a[i]!.kind === a[i - 1]!.kind && a[i]!.kind !== 'tanya') {
      const j = a.findIndex((c, k) => k > i && c.kind !== a[i - 1]!.kind && c.level === a[i]!.level);
      if (j > 0) [a[i], a[j]] = [a[j]!, a[i]!];
    }
  }
  return a;
}

/** Batas porsi per jenis, supaya Renung dan kartu liar tidak menenggelamkan obrolan. */
const SHARE: Partial<Record<TkKind, number>> = { renung: 0.25, liar: 0.1, dilema: 0.15, tebak: 0.15 };

function pick(cards: TkCard[], n: number, kinds: TkKind[]): TkCard[] {
  if (n >= cards.length) return cards;
  const capped = kinds.length > 1;
  const count = new Map<TkKind, number>();
  const out: TkCard[] = [];
  const rest: TkCard[] = [];
  for (const c of cards) {
    const cap = capped && SHARE[c.kind] ? Math.max(1, Math.round(n * SHARE[c.kind]!)) : Infinity;
    if (out.length < n && (count.get(c.kind) ?? 0) < cap) {
      out.push(c);
      count.set(c.kind, (count.get(c.kind) ?? 0) + 1);
    } else rest.push(c);
  }
  // Kalau jenis lain kurang (mis. filter sempit), isi sisanya tanpa batas.
  return out.length < n ? [...out, ...rest.slice(0, n - out.length)] : out;
}

export function buildTkDeck(opts: TkDeckOptions, seed: string, cards: TkCard[] = TK_CARDS): TkCard[] {
  const rand = tkRandom(seed);
  const pool = tkPool(opts.rel, cards).filter((c) => opts.levels.includes(c.level) && opts.kinds.includes(c.kind));
  const all = shuffle(pool, rand);
  const total = opts.size > 0 ? Math.min(opts.size, all.length) : all.length;
  if (opts.order === 'acak') return spread(pick(all, total, opts.kinds));
  // Naik pelan-pelan: bagi jatah kartu rata per level, lalu urutkan dari level 1.
  const levels = [...opts.levels].sort();
  const by = levels.map((lv) => all.filter((c) => c.level === lv));
  const quota = by.map(() => 0);
  let left = total;
  while (left > 0) {
    let moved = false;
    for (let i = 0; i < by.length && left > 0; i++) {
      if (quota[i]! < by[i]!.length) {
        quota[i]!++;
        left--;
        moved = true;
      }
    }
    if (!moved) break;
  }
  return spread(by.flatMap((cs, i) => pick(cs, quota[i]!, opts.kinds)));
}
