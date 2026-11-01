/**
 * Bagian Wrapped yang membuatnya terasa milik tiap orang: kartu "kamu minggu
 * ini", penghargaan lucu untuk setiap anggota, permainan tebak siapa, fakta
 * lucu, dan saran kecil untuk minggu depan.
 */
import { MOODS } from './content/chapterTitles';
import type { MoodCode } from './domain';
import { hashString } from './rituals';
import { contentWords, excerpt, tokenize } from './text';
import { type DayKey, dayName, formatClock } from './time';
import type { WrapDrop, WrapScope } from './wrap';

export interface YouScene {
  type: 'you';
  userId: string;
  persona: string;
  blurb: string;
  stats: { value: number; label: string }[];
  topWord?: string;
  favDay?: string;
  funFact?: string;
}

export interface AwardsScene {
  type: 'awards';
  items: { userId: string; title: string; reason: string; doodle: string }[];
}

export interface GuessScene {
  type: 'guess';
  rounds: { text: string; answerId: string; options: string[] }[];
}

export type NextAction = 'write' | 'letter' | 'kamus' | 'circle' | 'snap' | 'day';

export interface NextScene {
  type: 'next';
  items: { doodle: string; text: string; cta: string; action: NextAction; day?: DayKey }[];
}

const THIS: Record<WrapScope, string> = { week: 'minggu ini', month: 'bulan ini', year: 'tahun ini', moment: 'di acara ini' };
const WARM = new Set(['hug', 'here', 'me_too', 'candle']);
const LONGING = /\b(kangen|rindu|kangenn+|rinduu+)\b/i;

const words = (d: WrapDrop) => (d.payload.text ? tokenize(d.payload.text).length : 0);
const isText = (d: WrapDrop) => !!d.payload.text?.trim() && d.kind !== 'auto' && d.kind !== 'sticker';
const cap = (s: string) => (s ? s[0]!.toUpperCase() + s.slice(1) : s);

function timeAdj(h: number): string {
  if (h >= 4 && h < 6) return 'Subuh';
  if (h >= 6 && h < 11) return 'Pagi Hari';
  if (h >= 11 && h < 15) return 'Siang Bolong';
  if (h >= 15 && h < 18) return 'Senja';
  if (h >= 18 && h < 22) return 'Malam';
  return 'Tengah Malam';
}

function topMood(ds: WrapDrop[]): MoodCode | undefined {
  const m = new Map<MoodCode, number>();
  for (const d of ds) if (d.payload.mood) m.set(d.payload.mood, (m.get(d.payload.mood) ?? 0) + 1);
  return [...m.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
}

/** Kartu pribadi untuk pembaca. */
export function youScene(scope: WrapScope, viewerId: string, drops: WrapDrop[], sealedDays: number): YouScene {
  const mine = drops.filter((d) => d.authorId === viewerId);
  const thisP = THIS[scope];
  if (!mine.length) {
    return {
      type: 'you',
      userId: viewerId,
      persona: 'Si Pendengar Setia',
      blurb: `Kamu belum menitipkan apa-apa ${thisP}. Tapi kamu membaca, dan kamu ada di sini. Itu juga dihitung.`,
      stats: sealedDays ? [{ value: sealedDays, label: 'hari kamu segel' }] : [],
    };
  }
  const hours = Array.from({ length: 24 }, () => 0);
  for (const d of mine) hours[Math.max(0, Math.min(23, d.payload.hour))]!++;
  const peak = hours.indexOf(Math.max(...hours));
  const photos = mine.filter((d) => d.kind === 'photo').length;
  const songs = mine.filter((d) => d.payload.song).length;
  const texts = mine.filter(isText);
  const wordCount = texts.reduce((a, d) => a + words(d), 0);
  const noun =
    photos > texts.length && photos >= songs ? 'Fotografer' : songs > texts.length ? 'DJ' : wordCount / Math.max(1, texts.length) > 35 ? 'Pencerita' : texts.length ? 'Penulis' : 'Pembaca Cuaca';
  const mood = topMood(mine);
  const persona = `${noun} ${timeAdj(peak)}${mood ? ` yang ${cap(MOODS[mood].label)}` : ''}`;

  const wc = new Map<string, number>();
  for (const d of texts) for (const w of contentWords(d.payload.text!)) wc.set(w, (wc.get(w) ?? 0) + 1);
  const topWord = [...wc.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0];
  const byDay = new Map<string, number>();
  for (const d of mine) byDay.set(dayName(d.day), (byDay.get(dayName(d.day)) ?? 0) + 1);
  const favDay = scope === 'moment' ? undefined : [...byDay.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  const share = Math.round((mine.length / Math.max(1, drops.length)) * 100);

  const stats = [{ value: mine.length, label: 'hal kecil darimu' }];
  if (wordCount) stats.push({ value: wordCount, label: 'kata kamu tulis' });
  if (sealedDays) stats.push({ value: sealedDays, label: 'hari kamu segel' });
  if (drops.length > mine.length) stats.push({ value: share, label: '% isi lingkaran darimu' });

  const minutes = Math.max(1, Math.round(wordCount / 180));
  const funFact =
    wordCount >= 60
      ? `Kalau semua tulisanmu dibaca keras-keras, butuh sekitar ${minutes} menit. Cukup untuk menyeduh teh dan menunggunya hangat.`
      : photos >= 2
        ? `Kalau ${photos} fotomu dicetak jadi polaroid dan ditumpuk, tingginya kira-kira ${(photos * 0.9).toFixed(1).replace('.', ',')} mm. Kecil, tapi isinya banyak.`
        : songs
          ? `Lagu-lagumu ${thisP} kira-kira ${songs * 4} menit musik. Satu perjalanan pulang yang pas.`
          : mine.length >= 3 && drops.length > mine.length
            ? `${share}% isi lingkaran ${thisP} datang darimu. Tanpamu, halamannya jauh lebih sepi.`
            : undefined;

  return {
    type: 'you',
    userId: viewerId,
    persona,
    blurb: `${cap(thisP)}, kamu paling sering muncul sekitar jam ${formatClock(peak, 0)}${mood ? ` dengan hati yang ${MOODS[mood].label}` : ''}.`,
    stats,
    topWord,
    favDay,
    funFact,
  };
}

/** Penghargaan lucu: setiap anggota dapat satu, tidak ada yang dobel. */
export function awardsScene(people: { userId: string }[], drops: WrapDrop[], seals: Record<string, DayKey[]>): AwardsScene | null {
  if (people.length < 2) return null;
  type Cand = { title: string; doodle: string; score: (id: string) => number; reason: (n: number) => string; min?: number };
  const mine = (id: string) => drops.filter((d) => d.authorId === id);
  const given = (id: string) => drops.reduce((a, d) => a + d.reactions.filter((r) => r.userId === id && r.userId !== d.authorId && WARM.has(r.kind)).length, 0);
  const got = (id: string) => mine(id).reduce((a, d) => a + d.reactions.filter((r) => r.userId !== id && WARM.has(r.kind)).length, 0);
  const cands: Cand[] = [
    { title: 'Paling Sering Bilang Kangen', doodle: 'hati-dua', score: (id) => mine(id).filter((d) => LONGING.test(d.payload.text ?? '')).length, reason: (n) => `${n} kali menulis “kangen” atau “rindu”` },
    { title: 'Si Kalong', doodle: 'bulan', score: (id) => mine(id).filter((d) => d.payload.hour >= 22 || d.payload.hour < 4).length, reason: (n) => `${n} kali menulis lewat jam sepuluh malam`, min: 2 },
    { title: 'Ayam Jago', doodle: 'matahari', score: (id) => mine(id).filter((d) => d.payload.hour >= 4 && d.payload.hour < 8).length, reason: (n) => `${n} kali menulis sebelum jam delapan pagi`, min: 2 },
    { title: 'Tukang Peluk', doodle: 'pelukan', score: given, reason: (n) => `mengirim ${n} pelukan` },
    { title: 'Paling Dipeluk', doodle: 'hati-kecil', score: got, reason: (n) => `tulisannya dipeluk ${n} kali` },
    { title: 'Fotografer Kos', doodle: 'kamera', score: (id) => mine(id).filter((d) => d.kind === 'photo').length, reason: (n) => `${n} foto hari biasa` },
    { title: 'DJ Lingkaran', doodle: 'kaset', score: (id) => mine(id).filter((d) => d.payload.song).length, reason: (n) => `${n} lagu diputar untuk semua` },
    { title: 'Penulis Novel', doodle: 'pena', score: (id) => Math.max(0, ...mine(id).map(words)), reason: (n) => `satu tulisan sepanjang ${n} kata`, min: 25 },
    { title: 'Si Paling Konsisten', doodle: 'ui-api', score: (id) => (seals[id] ?? []).length, reason: (n) => `menyegel ${n} hari`, min: 2 },
    { title: 'Paling Rajin', doodle: 'tunas', score: (id) => mine(id).length, reason: (n) => `${n} hal kecil dititipkan` },
    {
      title: 'Si Hemat Kata',
      doodle: 'ui-kata',
      score: (id) => {
        const t = mine(id).filter(isText);
        return t.length >= 2 ? Math.max(0, 12 - Math.round(t.reduce((a, d) => a + words(d), 0) / t.length)) : 0;
      },
      reason: () => 'sedikit kata, banyak makna',
    },
  ];
  // Calon: penghargaan yang dimenangi seseorang dengan jelas (nilai tertinggi, tidak seri).
  const wins: { userId: string; c: Cand; n: number; margin: number }[] = [];
  for (const c of cands) {
    const vals = people.map((p) => ({ id: p.userId, n: c.score(p.userId) })).sort((a, b) => b.n - a.n);
    const top = vals[0]!;
    if (top.n <= 0 || top.n < (c.min ?? 1) || vals[1]?.n === top.n) continue;
    wins.push({ userId: top.id, c, n: top.n, margin: top.n - (vals[1]?.n ?? 0) });
  }
  const items: AwardsScene['items'] = [];
  const taken = new Set<string>();
  for (const w of wins.sort((a, b) => b.margin - a.margin)) {
    if (taken.has(w.userId)) continue;
    taken.add(w.userId);
    items.push({ userId: w.userId, title: w.c.title, reason: w.c.reason(w.n), doodle: w.c.doodle });
  }
  // Yang belum kebagian: julukan hangat yang berbeda-beda (tidak ada yang dobel).
  const titles = new Set(items.map((x) => x.title));
  const warm = [
    { title: 'Teman Setia', reason: (n: number) => `${n} hal kecil, selalu datang`, doodle: 'cangkir' },
    { title: 'Penjaga Halaman', reason: (n: number) => `${n} kali menjaga halaman tetap terisi`, doodle: 'buku' },
    { title: 'Si Paling Hadir', reason: (n: number) => `muncul ${n} kali, tanpa absen hati`, doodle: 'tunas' },
    { title: 'Pembawa Hangat', reason: (n: number) => `${n} hal kecil yang bikin hangat`, doodle: 'matahari' },
    { title: 'Pencatat Diam-diam', reason: (n: number) => `${n} catatan kecil`, doodle: 'pena' },
  ].filter((w) => !titles.has(w.title));
  const quiet = [
    { title: 'Penonton Setia', reason: 'membaca semuanya, diam-diam', doodle: 'bintang' },
    { title: 'Pendengar Terbaik', reason: 'tidak menulis, tapi selalu ada', doodle: 'awan' },
    { title: 'Tamu Kehormatan', reason: 'kursinya selalu disiapkan', doodle: 'kado' },
  ];
  let wi = 0;
  let qi = 0;
  for (const p of people) {
    if (taken.has(p.userId)) continue;
    const n = mine(p.userId).length;
    if (n) {
      const w = warm[wi++ % warm.length]!;
      items.push({ userId: p.userId, title: wi > warm.length ? `${w.title} ${Math.ceil(wi / warm.length)}` : w.title, reason: w.reason(n), doodle: w.doodle });
    } else {
      const q = quiet[qi++ % quiet.length]!;
      items.push({ userId: p.userId, title: qi > quiet.length ? `${q.title} ${Math.ceil(qi / quiet.length)}` : q.title, reason: q.reason, doodle: q.doodle });
    }
  }
  const order = new Map(people.map((p, i) => [p.userId, i]));
  return { type: 'awards', items: items.sort((a, b) => order.get(a.userId)! - order.get(b.userId)!) };
}

/** Tebak siapa: kalimat-kalimat kecil, pembaca menebak penulisnya. */
export function guessScene(people: { userId: string }[], drops: WrapDrop[], seed: string, avoid: Set<string>): GuessScene | null {
  const writers = new Set(drops.filter(isText).map((d) => d.authorId));
  if (people.length < 2 || writers.size < 2) return null;
  const usable = (d: WrapDrop) => isText(d) && d.payload.text!.trim().length >= 16 && d.kind !== 'last_line';
  let pool = drops.filter((d) => usable(d) && !avoid.has(d.id));
  // Kalau kalimat yang tersisa hanya dari satu orang, kutipan boleh dipakai lagi.
  if (new Set(pool.map((d) => d.authorId)).size < 2) pool = drops.filter(usable);
  const byAuthor = new Map<string, WrapDrop[]>();
  for (const d of pool) (byAuthor.get(d.authorId) ?? byAuthor.set(d.authorId, []).get(d.authorId)!).push(d);
  const picks: WrapDrop[] = [];
  const authors = [...byAuthor.keys()].sort((a, b) => hashString(`${seed}:${a}`) - hashString(`${seed}:${b}`));
  for (let round = 0; picks.length < 3 && round < 3; round++) {
    for (const a of authors) {
      const list = byAuthor.get(a)!.sort((x, y) => hashString(`${seed}:${x.id}`) - hashString(`${seed}:${y.id}`));
      if (list[round] && picks.length < 3) picks.push(list[round]!);
    }
  }
  if (picks.length < 2) return null;
  const ids = people.map((p) => p.userId);
  return {
    type: 'guess',
    rounds: picks.map((d) => {
      const others = ids.filter((id) => id !== d.authorId).sort((a, b) => hashString(`${d.id}:${a}`) - hashString(`${d.id}:${b}`)).slice(0, 3);
      const options = [d.authorId, ...others].sort((a, b) => hashString(`${seed}:${d.id}:${a}`) - hashString(`${seed}:${d.id}:${b}`));
      return { text: excerpt(d.payload.text!, 150), answerId: d.authorId, options };
    }),
  };
}

/** Saran kecil yang bisa langsung dilakukan. */
export function nextScene(
  scope: WrapScope,
  f: {
    viewerId?: string;
    people: { userId: string; name: string }[];
    drops: WrapDrop[];
    seals: Record<string, DayKey[]>;
    end: DayKey;
    peak?: number;
    sharedWord?: string;
    streak?: number;
    oneOther?: { userId: string; name: string };
    bestDay?: DayKey;
  },
): NextScene | null {
  if (scope === 'moment') return null;
  const items: NextScene['items'] = [];
  const nextP = scope === 'week' ? 'minggu depan' : scope === 'month' ? 'bulan depan' : 'tahun depan';
  if (f.oneOther) items.push({ doodle: 'surat-terbuka', text: `Surat di atas bisa sampai ke ${f.oneOther.name} besok pagi.`, cta: `kirim ke ${f.oneOther.name}`, action: 'letter' });
  const quiet = f.people.filter((p) => p.userId !== f.viewerId && !f.drops.some((d) => d.authorId === p.userId));
  if (quiet.length) items.push({ doodle: 'pelukan', text: `${quiet.map((p) => p.name).join(', ')} belum sempat menulis. Mungkin sedang sibuk; satu sapaan kecil bisa membantu.`, cta: 'buka lingkaran', action: 'circle' });
  if (f.sharedWord) items.push({ doodle: 'ui-kata', text: `“${f.sharedWord}” sudah jadi kata kalian. Simpan di kamus lingkaran?`, cta: 'buka kamus', action: 'kamus' });
  if (f.peak !== undefined) items.push({ doodle: 'ui-jam', text: `Jam ramai kalian sekitar ${formatClock(f.peak, 0)}. Besok, kirim satu kilasan di jam itu; mungkin mereka sedang membuka Sehari juga.`, cta: 'jepret kilasan', action: 'snap' });
  if (!f.streak) items.push({ doodle: 'ui-api', text: 'Apinya sedang redup. Segel hari ini bersama untuk menyalakannya lagi.', cta: 'tulis hari ini', action: 'write' });
  else items.push({ doodle: 'pena', text: `Halaman ${nextP} masih kosong. Mulai dari satu kalimat hari ini.`, cta: 'tulis hari ini', action: 'write' });
  return items.length ? { type: 'next', items: items.slice(0, 4) } : null;
}

/** Fakta lucu untuk angka-angka. */
export function funNote(kind: 'words' | 'photos' | 'songs' | 'hugs', n: number): string | undefined {
  if (kind === 'words') {
    if (n >= 1500) return `setebal ${Math.round(n / 250)} halaman buku`;
    if (n >= 500) return 'cukup untuk satu cerpen';
    if (n >= 150) return 'cukup untuk sepucuk surat';
    if (n >= 40) return `±${Math.max(1, Math.round(n / 180))} menit kalau dibaca keras`;
    return undefined;
  }
  if (kind === 'photos') return n >= 3 ? `tumpukan polaroid setinggi ${(n * 0.9).toFixed(1).replace('.', ',')} mm` : undefined;
  if (kind === 'songs') return `±${n * 4} menit musik`;
  if (kind === 'hugs') return n >= 10 ? 'cukup untuk menghangatkan satu musim hujan' : n >= 3 ? 'hangat, seperti teh sore' : undefined;
  return undefined;
}
