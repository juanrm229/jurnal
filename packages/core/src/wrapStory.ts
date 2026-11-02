/**
 * Wrapped versi cerita: dari isi yang sudah didekripsi di perangkat, rangkai
 * adegan-adegan kecil yang personal: jam kalian menulis, momen sinkron, kata
 * yang kalian berdua pakai, siapa memeluk tulisan siapa, sampai surat penutup
 * yang ditulis dari data untuk orang yang kamu ajak berbagi hari.
 *
 * Semua dihitung di perangkat. Tidak ada yang dikirim ke server.
 */
import { MOODS } from './content/chapterTitles';
import type { DropKind, MediaRef, MoodCode, SongRef } from './domain';
import { excerpt, tokenize, wordCounts, type WordCount } from './text';
import { type DayKey, dayName, eachDay, formatClock, monthName, monthRange, parseDay, weekRange, yearRange, zonedTimeToUtc } from './time';
import {
  type FilmScene,
  filmScene,
  type FutureLetterScene,
  type JourneyScene,
  journeyScene,
  type MontageScene,
  montageScene,
  type MoodLineScene,
  moodLineScene,
  type NewWordsScene,
  newWordsScene,
  type WeeksScene,
  weeksScene,
} from './wrapLong';
import { type KenalScene, kenalScene, type CompareScene, compareScene, type FacesScene, facesScene, type PlantScene, plantScene, type RollScene, rollScene } from './wrapWeekly';
import { type AwardsScene, awardsScene, funNote, type GuessScene, guessScene, type NextScene, nextScene, type YouScene, youScene } from './wrapExtras';
import { buildWrap, moodTally, songTally, type WrapCard, type WrapDrop, type WrapInput, type WrapScope } from './wrap';

export interface StoryPerson {
  userId: string;
  name: string;
}

export interface StoryDay {
  /** DayKey, atau MonthKey untuk Tahun Kita (satu batang per bulan). */
  key: string;
  /** "Sen", "12", "Jan". */
  top: string;
  bottom: string;
  count: number;
  moodColor?: string;
  wrote: string[];
  sealed: string[];
}

export interface SyncMoment {
  day: DayKey;
  a: { userId: string; hour: number; minute: number };
  b: { userId: string; hour: number; minute: number };
  /** Selisih menit (waktu sebenarnya, lintas zona). */
  gap: number;
}

export type StoryScene =
  | { type: 'opening'; title: string; label: string; kicker: string; names: string[]; tagline: string }
  | { type: 'tally'; items: { value: number; label: string; note?: string; doodle: string }[] }
  | { type: 'days'; title: string; unit: 'day' | 'month'; days: StoryDay[]; busiest?: string; caption: string }
  | {
      type: 'clock';
      perMember: { userId: string; hours: number[]; peak: number; nickname: string }[];
      peak: number;
      caption: string;
      sync?: SyncMoment;
    }
  | {
      type: 'mood';
      dominant: { mood: MoodCode; label: string; color: string; count: number };
      moods: { mood: MoodCode; label: string; color: string; count: number }[];
      perMember: { userId: string; mood: MoodCode; label: string; color: string }[];
      caption: string;
    }
  | { type: 'photos'; title: string; total: number; items: { userId: string; dropId: string; media: MediaRef; day: DayKey }[] }
  | { type: 'words'; top: WordCount[]; shared: { word: string; count: number }[]; total: number }
  | { type: 'quotes'; items: { userId: string; dropId: string; day: DayKey; text: string; hugs: number }[] }
  | { type: 'hugs'; total: number; pairs: { from: string; to: string; count: number }[]; caption: string }
  | { type: 'songs'; songs: (SongRef & { count: number; byUserIds: string[] })[] }
  | {
      type: 'bookends';
      first: { userId: string; day: DayKey; hour: number; minute: number; text: string };
      last: { userId: string; day: DayKey; hour: number; minute: number; text: string };
    }
  | { type: 'bestDay'; day: DayKey; count: number; hugs: number; people: number; caption: string }
  | { type: 'fire'; current: number; longest: number; togetherDays: number; totalDays: number; perMember: { userId: string; days: number }[] }
  | { type: 'extra'; card: WrapCard }
  | { type: 'quiet'; text: string }
  | { type: 'letter'; to: string; toUserIds: string[]; paragraphs: string[]; signoff: string }
  | YouScene
  | RollScene
  | MoodLineScene
  | WeeksScene
  | NewWordsScene
  | MontageScene
  | JourneyScene
  | FilmScene
  | FutureLetterScene
  | KenalScene
  | CompareScene
  | FacesScene
  | PlantScene
  | AwardsScene
  | GuessScene
  | NextScene;

export interface WrapStory {
  scope: WrapScope;
  period: string;
  title: string;
  label: string;
  people: StoryPerson[];
  scenes: StoryScene[];
}

const NOT_CONTENT: DropKind[] = ['auto', 'sticker'];
const TEXT_KINDS: DropKind[] = ['text', 'idea', 'word', 'answer', 'card', 'expedition', 'last_line', 'prologue', 'epilogue', 'intent'];
const WARM = new Set(['hug', 'here', 'me_too', 'candle']);

const SCOPE_THIS: Record<WrapScope, string> = { week: 'minggu ini', month: 'bulan ini', year: 'tahun ini', moment: 'acara ini' };
const SCOPE_KICKER: Record<WrapScope, string> = { week: 'minggu kita', month: 'bulan kita', year: 'tahun kita', moment: 'wrap acara' };

function rangeOf(input: WrapInput): { start: DayKey; end: DayKey } {
  if (input.scope === 'week') return weekRange(input.period);
  if (input.scope === 'month') return monthRange(input.period);
  if (input.scope === 'year') return yearRange(Number(input.period));
  return input.range!;
}

/** Julukan lembut menurut jam paling sering menulis. */
export function hourNickname(h: number): string {
  if (h >= 4 && h < 6) return 'si penjaga subuh';
  if (h >= 6 && h < 11) return 'si penyapa pagi';
  if (h >= 11 && h < 15) return 'si teman makan siang';
  if (h >= 15 && h < 18) return 'si penunggu senja';
  if (h >= 18 && h < 22) return 'si pencerita malam';
  return 'si burung malam';
}

const warmth = (d: WrapDrop) => d.reactions.filter((r) => WARM.has(r.kind) && r.userId !== d.authorId).length;
const at = (d: WrapDrop) => `${d.day} ${String(d.payload.hour).padStart(2, '0')}:${String(d.payload.minute).padStart(2, '0')}`;

function absMinutes(d: WrapDrop): number {
  try {
    return zonedTimeToUtc(d.day, d.payload.hour, d.payload.minute, d.payload.tz || 'Asia/Jakarta').getTime() / 60_000;
  } catch {
    return Date.UTC(...(d.day.split('-').map(Number) as [number, number, number])) / 60_000 + d.payload.hour * 60 + d.payload.minute;
  }
}

function joinNames(names: string[]): string {
  if (names.length <= 1) return names[0] ?? '';
  return `${names.slice(0, -1).join(', ')} & ${names[names.length - 1]}`;
}

function dominantMood(drops: WrapDrop[]): MoodCode | undefined {
  return moodTally(drops)[0]?.mood;
}

export function buildWrapStory(input: WrapInput): WrapStory {
  const r = rangeOf(input);
  const base = buildWrap(input);
  const days = eachDay(r.start, r.end);
  const inRange = input.drops.filter((d) => d.day >= r.start && d.day <= r.end);
  const drops = inRange.filter((d) => !NOT_CONTENT.includes(d.kind));
  const people: StoryPerson[] = input.members.map((m) => ({ userId: m.userId, name: m.name }));
  const nameOf = (id: string) => people.find((p) => p.userId === id)?.name ?? 'seseorang';
  const viewer = input.viewerId;
  const others = people.filter((p) => p.userId !== viewer);
  const thisP = SCOPE_THIS[input.scope];
  const scenes: StoryScene[] = [];
  const seal = (id: string) => (input.seals[id] ?? []).filter((d) => d >= r.start && d <= r.end);
  const filledDays = new Set([...drops.map((d) => d.day), ...people.flatMap((p) => seal(p.userId))]);

  // ── Pembuka ───────────────────────────────────────────────────────────────
  scenes.push({
    type: 'opening',
    title: base.title,
    label: base.label,
    kicker: SCOPE_KICKER[input.scope],
    names: people.map((p) => p.name),
    tagline: drops.length
      ? `${filledDays.size} hari terisi, ${people.length} orang, ${drops.length} hal kecil.`
      : 'Halaman yang tenang. Kadang yang tenang juga perlu dikenang.',
  });

  if (!drops.length) {
    if (input.streak && input.scope !== 'moment') {
      const s = base.cards.find((c) => c.type === 'streak');
      if (s && s.type === 'streak') scenes.push({ type: 'fire', current: s.current, longest: s.longest, togetherDays: s.togetherDays, totalDays: days.length, perMember: s.perMember });
    }
    scenes.push({ type: 'quiet', text: `${thisP[0]!.toUpperCase()}${thisP.slice(1)} sepi, dan itu tidak apa-apa. Kabut juga bagian dari cerita.` });
    return { scope: input.scope, period: input.period, title: base.title, label: base.label, people, scenes };
  }

  // ── Kamu minggu ini ───────────────────────────────────────────────────────
  if (viewer && people.some((p) => p.userId === viewer)) scenes.push(youScene(input.scope, viewer, drops, seal(viewer).length));

  // ── Angka-angka ───────────────────────────────────────────────────────────
  const textDrops = drops.filter((d) => TEXT_KINDS.includes(d.kind) && d.payload.text?.trim());
  const wordTotal = textDrops.reduce((a, d) => a + tokenize(d.payload.text!).length, 0);
  const photoTotal = drops.filter((d) => d.kind === 'photo').reduce((a, d) => a + (d.payload.media?.length ?? 0), 0);
  const songs = songTally(drops);
  const hugTotal = inRange.reduce((a, d) => a + warmth(d), 0);
  const tally: { value: number; label: string; note?: string; doodle: string }[] = [
    { value: filledDays.size, label: `dari ${days.length} hari terisi`, doodle: 'tunas' },
    { value: drops.length, label: 'hal kecil dititipkan', doodle: 'amplop' },
  ];
  if (wordTotal) tally.push({ value: wordTotal, label: 'kata ditulis', note: funNote('words', wordTotal), doodle: 'pena' });
  if (photoTotal) tally.push({ value: photoTotal, label: 'foto ditempel', note: funNote('photos', photoTotal), doodle: 'kamera' });
  if (songs.length) tally.push({ value: songs.length, label: 'lagu diputar', note: funNote('songs', songs.length), doodle: 'kaset' });
  if (hugTotal) tally.push({ value: hugTotal, label: 'pelukan dikirim', note: funNote('hugs', hugTotal), doodle: 'pelukan' });
  const snaps = inRange.filter((d) => d.flash === 'snap').length;
  const kangens = inRange.filter((d) => d.flash === 'kangen').length;
  if (snaps) tally.push({ value: snaps, label: 'kilasan dikirim', doodle: 'kamera' });
  if (kangens) tally.push({ value: kangens, label: 'kali saling kangen', note: kangens >= 5 ? 'sering sekali, dan itu manis' : undefined, doodle: 'hati-dua' });
  scenes.push({ type: 'tally', items: tally });

  // ── Dibanding periode sebelumnya ──────────────────────────────────────────
  const compare = compareScene(input, inRange);
  if (compare) scenes.push(compare);

  // ── Hari demi hari ────────────────────────────────────────────────────────
  const dayEntry = (key: string, top: string, bottom: string, inKey: (d: DayKey) => boolean): StoryDay => {
    const ds = drops.filter((d) => inKey(d.day));
    const mood = dominantMood(ds);
    return {
      key,
      top,
      bottom,
      count: ds.length,
      moodColor: mood ? MOODS[mood].color : undefined,
      wrote: [...new Set(ds.map((d) => d.authorId))],
      sealed: people.filter((p) => seal(p.userId).some(inKey)).map((p) => p.userId),
    };
  };
  let dayList: StoryDay[];
  if (input.scope === 'year') {
    dayList = Array.from({ length: 12 }, (_, i) => {
      const mk = `${input.period}-${String(i + 1).padStart(2, '0')}`;
      return dayEntry(mk, monthName(i + 1, true), '', (d) => d.startsWith(mk));
    });
  } else {
    dayList = days.map((d) => dayEntry(d, dayName(d).slice(0, 3), String(parseDay(d).day), (x) => x === d));
  }
  const busiest = [...dayList].sort((a, b) => b.count - a.count)[0];
  scenes.push({
    type: 'days',
    title: input.scope === 'year' ? 'Dua belas bulan, satu per satu' : 'Hari demi hari',
    unit: input.scope === 'year' ? 'month' : 'day',
    days: dayList,
    busiest: busiest && busiest.count > 0 ? busiest.key : undefined,
    caption:
      busiest && busiest.count > 0
        ? input.scope === 'year'
          ? `${monthName(Number(busiest.key.slice(5)))} jadi bulan paling ramai: ${busiest.count} hal kecil.`
          : `${dayName(busiest.key)[0]!.toUpperCase()}${dayName(busiest.key).slice(1)} ${parseDay(busiest.key).day} jadi hari paling ramai: ${busiest.count} hal kecil.`
        : '',
  });

  // ── Bulan: grafik mood & minggu-minggu · Tahun: montase dua belas bulan ───
  if (input.scope === 'month') {
    const ml = moodLineScene(input, drops, r.start, r.end);
    if (ml) scenes.push(ml);
    const wk = weeksScene(input, drops, r.start, r.end);
    if (wk) scenes.push(wk);
  }
  if (input.scope === 'year') {
    const mt = montageScene(input, drops, input.period);
    if (mt) scenes.push(mt);
  }

  // ── Jam kalian ────────────────────────────────────────────────────────────
  const perMember = people
    .map((p) => {
      const hours = Array.from({ length: 24 }, () => 0);
      for (const d of drops) if (d.authorId === p.userId) hours[Math.max(0, Math.min(23, d.payload.hour))]!++;
      const peak = hours.indexOf(Math.max(...hours));
      return { userId: p.userId, hours, peak, nickname: hourNickname(peak) };
    })
    .filter((m) => m.hours.some((h) => h > 0));
  const allHours = Array.from({ length: 24 }, (_, h) => perMember.reduce((a, m) => a + m.hours[h]!, 0));
  const peak = allHours.indexOf(Math.max(...allHours));
  // Momen sinkron: dua orang berbeda menulis di hari yang sama, berselang paling lama 20 menit.
  let sync: SyncMoment | undefined;
  if (people.length > 1) {
    const sorted = [...drops].map((d) => ({ d, t: absMinutes(d) })).sort((a, b) => a.t - b.t);
    for (let i = 0; i < sorted.length; i++) {
      for (let j = i + 1; j < sorted.length && sorted[j]!.t - sorted[i]!.t <= 20; j++) {
        const a = sorted[i]!.d;
        const b = sorted[j]!.d;
        if (a.authorId === b.authorId) continue;
        const gap = Math.round(sorted[j]!.t - sorted[i]!.t);
        if (!sync || gap < sync.gap) {
          sync = {
            day: a.day,
            a: { userId: a.authorId, hour: a.payload.hour, minute: a.payload.minute },
            b: { userId: b.authorId, hour: b.payload.hour, minute: b.payload.minute },
            gap,
          };
        }
      }
    }
  }
  if (perMember.length) {
    scenes.push({
      type: 'clock',
      perMember,
      peak,
      caption: `Jam ${formatClock(peak, 0)} jadi jam paling ramai di lingkaran kalian.`,
      sync,
    });
  }

  // ── Warna ─────────────────────────────────────────────────────────────────
  const moods = moodTally(drops).map((m) => ({ ...m, label: MOODS[m.mood].label, color: MOODS[m.mood].color }));
  if (moods.length) {
    const pm = people
      .map((p) => ({ p, m: dominantMood(drops.filter((d) => d.authorId === p.userId)) }))
      .filter((x): x is { p: StoryPerson; m: MoodCode } => !!x.m)
      .map(({ p, m }) => ({ userId: p.userId, mood: m, label: MOODS[m].label, color: MOODS[m].color }));
    const total = moods.reduce((a, m) => a + m.count, 0);
    scenes.push({
      type: 'mood',
      dominant: moods[0]!,
      moods,
      perMember: pm,
      caption: `${Math.round((moods[0]!.count / total) * 100)}% hari-hari ${thisP} berwarna ${moods[0]!.label}.`,
    });
  }

  // ── Foto ──────────────────────────────────────────────────────────────────
  // Rol pilihan kalian sendiri lebih dulu; kalau belum ada yang memilih, pilihan otomatis.
  const roll = input.scope === 'week' ? rollScene(input, drops) : null;
  const photoCard = base.cards.find((c) => c.type === 'photos');
  if (roll) scenes.push(roll);
  else if (photoCard && photoCard.type === 'photos') scenes.push({ type: 'photos', title: photoCard.title, total: photoTotal, items: photoCard.items });

  // ── Wajah-wajah ───────────────────────────────────────────────────────────
  const faces = facesScene(inRange);
  if (faces) scenes.push(faces);

  // ── Kata ──────────────────────────────────────────────────────────────────
  const texts = textDrops.map((d) => ({ authorId: d.authorId, day: d.day, text: d.payload.text! }));
  const counts = wordCounts(texts);
  if (counts.length >= 3) {
    const shared = people.length > 1 ? counts.filter((w) => w.authors >= 2).slice(0, 6).map((w) => ({ word: w.word, count: w.count })) : [];
    scenes.push({ type: 'words', top: counts.slice(0, 14), shared, total: wordTotal });
  }
  if (input.scope === 'month') {
    const nw = newWordsScene(input, drops);
    if (nw) scenes.push(nw);
  }
  if (input.scope === 'year') {
    const jr = journeyScene(drops);
    if (jr) scenes.push(jr);
  }

  // ── Kalimat yang tertinggal ───────────────────────────────────────────────
  const quotes = people
    .map((p) => {
      const pick = textDrops
        .filter((d) => d.authorId === p.userId && d.payload.text!.trim().length >= 12)
        .sort((a, b) => warmth(b) - warmth(a) || Math.abs(a.payload.text!.length - 110) - Math.abs(b.payload.text!.length - 110))[0];
      return pick ? { userId: p.userId, dropId: pick.id, day: pick.day, text: excerpt(pick.payload.text!, 200), hugs: warmth(pick) } : null;
    })
    .filter((x): x is NonNullable<typeof x> => !!x);
  const guess = guessScene(people, textDrops, `${input.circle.id}:${input.period}`, new Set(quotes.map((q) => q.dropId)));
  if (guess) scenes.push(guess);
  const kenal = kenalScene(inRange);
  if (kenal) scenes.push(kenal);
  if (quotes.length) scenes.push({ type: 'quotes', items: quotes });

  // ── Pelukan ───────────────────────────────────────────────────────────────
  const pairMap = new Map<string, number>();
  for (const d of inRange) {
    for (const x of d.reactions) {
      if (!WARM.has(x.kind) || x.userId === d.authorId) continue;
      const k = `${x.userId}>${d.authorId}`;
      pairMap.set(k, (pairMap.get(k) ?? 0) + 1);
    }
  }
  if (hugTotal) {
    const pairs = [...pairMap.entries()]
      .map(([k, count]) => ({ from: k.split('>')[0]!, to: k.split('>')[1]!, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
    const top = pairs[0]!;
    scenes.push({ type: 'hugs', total: hugTotal, pairs, caption: `${top.count} pelukan dari ${nameOf(top.from)} untuk tulisan ${nameOf(top.to)}.` });
  }

  // ── Penghargaan ───────────────────────────────────────────────────────────
  const awards = awardsScene(people, inRange.filter((d) => d.kind !== 'auto'), Object.fromEntries(people.map((p) => [p.userId, seal(p.userId)])));
  if (awards) scenes.push(awards);

  // ── Lagu ──────────────────────────────────────────────────────────────────
  if (songs.length) scenes.push({ type: 'songs', songs: songs.slice(0, 8) });

  // ── Halaman pertama & terakhir ────────────────────────────────────────────
  const ordered = [...textDrops].sort((a, b) => (at(a) < at(b) ? -1 : at(a) > at(b) ? 1 : 0));
  if (ordered.length >= 2) {
    const f = ordered[0]!;
    const l = ordered[ordered.length - 1]!;
    const pack = (d: WrapDrop) => ({ userId: d.authorId, day: d.day, hour: d.payload.hour, minute: d.payload.minute, text: excerpt(d.payload.text!, 140) });
    scenes.push({ type: 'bookends', first: pack(f), last: pack(l) });
  }

  // ── Hari terbaik ──────────────────────────────────────────────────────────
  if (input.scope !== 'week' || drops.length >= 4) {
    const byDay = new Map<DayKey, WrapDrop[]>();
    for (const d of drops) (byDay.get(d.day) ?? byDay.set(d.day, []).get(d.day)!).push(d);
    const score = (ds: WrapDrop[]) => ds.length + ds.reduce((a, d) => a + warmth(d), 0) * 2 + new Set(ds.map((d) => d.authorId)).size * 2;
    const best = [...byDay.entries()].sort((a, b) => score(b[1]) - score(a[1]) || (a[0] < b[0] ? -1 : 1))[0];
    if (best) {
      const h = best[1].reduce((a, d) => a + warmth(d), 0);
      const ppl = new Set(best[1].map((d) => d.authorId)).size;
      scenes.push({
        type: 'bestDay',
        day: best[0],
        count: best[1].length,
        hugs: h,
        people: ppl,
        caption: ppl > 1 ? `Hari itu ${ppl} orang sama-sama hadir di halaman yang sama.` : 'Hari yang penuh, meski ditulis sendirian.',
      });
    }
  }

  // ── Bab, puisi, peran, tempat (bulan & tahun) ─────────────────────────────
  for (const c of base.cards) {
    if (['roles', 'lines', 'chapters', 'places', 'motif', 'genre'].includes(c.type)) scenes.push({ type: 'extra', card: c });
  }

  // ── Tanaman & api ─────────────────────────────────────────────────────────
  const s = base.cards.find((c) => c.type === 'streak');
  const plant = plantScene(input, s && s.type === 'streak' ? s.togetherDays : 0);
  if (plant) scenes.push(plant);
  if (s && s.type === 'streak') scenes.push({ type: 'fire', current: s.current, longest: s.longest, togetherDays: s.togetherDays, totalDays: days.length, perMember: s.perMember });

  // ── Film Bulan/Tahun Ini ──────────────────────────────────────────────────
  if (input.scope === 'month' || input.scope === 'year') {
    const film = filmScene(input, drops, input.scope === 'month' ? 'Film Bulan Ini' : 'Film Tahun Ini', base.label, songs[0] ? { title: songs[0].title, artist: songs[0].artist } : undefined);
    if (film) scenes.push(film);
  }

  // ── Surat penutup ─────────────────────────────────────────────────────────
  scenes.push(letterFor(input, { drops, textDrops, people, others, viewer, sync, quotes, pairMap, moods, perMember, filledDays: filledDays.size, totalDays: days.length, counts, photoTotal, kangens }));

  // ── Untuk berikutnya ──────────────────────────────────────────────────────
  const next = nextScene(input.scope, {
    viewerId: viewer,
    people,
    drops,
    seals: input.seals,
    end: r.end,
    peak: perMember.length ? peak : undefined,
    sharedWord: people.length > 1 ? counts.find((w) => w.authors >= 2)?.word : undefined,
    streak: input.streak?.current,
    oneOther: others.length === 1 ? others[0] : undefined,
  });
  if (next) scenes.push(next);
  // Tahun Kita: surat untuk diri & kalian setahun lagi, terbuka di malam buka kapsul berikutnya.
  if (input.scope === 'year') scenes.push({ type: 'futureLetter', year: Number(input.period) + 1, openOn: `${Number(input.period) + 1}-12-31` });

  return { scope: input.scope, period: input.period, title: base.title, label: base.label, people, scenes };
}

function letterFor(
  input: WrapInput,
  f: {
    drops: WrapDrop[];
    textDrops: WrapDrop[];
    people: StoryPerson[];
    others: StoryPerson[];
    viewer?: string;
    sync?: SyncMoment;
    quotes: { userId: string; text: string }[];
    pairMap: Map<string, number>;
    moods: { label: string }[];
    perMember: { userId: string; peak: number; nickname: string }[];
    filledDays: number;
    totalDays: number;
    counts: WordCount[];
    photoTotal: number;
    kangens?: number;
  },
): StoryScene {
  const thisP = SCOPE_THIS[input.scope];
  const solo = f.others.length === 0;
  const one = f.others.length === 1 ? f.others[0]! : null;
  const yours = solo ? 'ku' : one ? 'mu' : ' kalian';
  const me = f.people.find((p) => p.userId === f.viewer);
  const to = solo ? 'Untuk diriku sendiri,' : `Untuk ${joinNames(f.others.map((o) => o.name))},`;
  const p: string[] = [];

  p.push(
    `${thisP[0]!.toUpperCase()}${thisP.slice(1)} kita menitipkan ${f.drops.length} hal kecil di ${f.filledDays} dari ${f.totalDays} hari. Kelihatannya sederhana, tapi semuanya ${solo ? 'kusimpan' : 'kita simpan'} di sini, rapi, seperti surat-surat yang belum ingin dibuang.`,
  );

  if (f.sync && f.viewer && (f.sync.a.userId === f.viewer || f.sync.b.userId === f.viewer)) {
    const mine = f.sync.a.userId === f.viewer ? f.sync.a : f.sync.b;
    const theirs = f.sync.a.userId === f.viewer ? f.sync.b : f.sync.a;
    const dn = dayName(f.sync.day);
    const d = `${dn[0]!.toUpperCase()}${dn.slice(1)} ${parseDay(f.sync.day).day} ${monthName(parseDay(f.sync.day).month)}`;
    p.push(
      f.sync.gap === 0
        ? `Hari ${d}, kita menulis di menit yang persis sama: ${formatClock(mine.hour, mine.minute)}. Aku tidak tahu itu kebetulan atau bukan, tapi aku memilih menganggapnya bukan.`
        : `Hari ${d}, ${one ? 'kamu' : f.people.find((x) => x.userId === theirs.userId)?.name ?? 'kamu'} menulis jam ${formatClock(theirs.hour, theirs.minute)}, aku jam ${formatClock(mine.hour, mine.minute)}. Cuma ${f.sync.gap} menit berselang. Mungkin itu yang orang sebut sehati.`,
    );
  }

  const shared = f.counts.filter((w) => w.authors >= 2)[0];
  if (shared && !solo) p.push(`Ada satu kata yang ternyata kita tulis bersama-sama: “${shared.word}”. Kita tidak janjian. Aku suka kebetulan kecil seperti itu.`);
  else if (f.counts[0]) p.push(`Kata yang paling sering muncul ${thisP}: “${f.counts[0].word}”. Mungkin itu isi kepala${yours} yang paling jujur.`);

  if (one) {
    const theirClock = f.perMember.find((m) => m.userId === one.userId);
    if (theirClock) p.push(`Kamu paling sering datang sekitar jam ${formatClock(theirClock.peak, 0)}, ${theirClock.nickname}. Sekarang aku tahu kapan harus menunggu.`);
    const toMe = f.viewer ? (f.pairMap.get(`${one.userId}>${f.viewer}`) ?? 0) : 0;
    const fromMe = f.viewer ? (f.pairMap.get(`${f.viewer}>${one.userId}`) ?? 0) : 0;
    if (toMe || fromMe) {
      p.push(
        toMe && fromMe
          ? `Kamu memeluk tulisanku ${toMe} kali, aku memeluk tulisanmu ${fromMe} kali. ${toMe > fromMe ? 'Aku masih berutang beberapa pelukan.' : toMe < fromMe ? 'Tidak apa-apa, pelukanku memang tidak dihitung.' : 'Seimbang. Seperti seharusnya.'}`
          : toMe
            ? `Kamu memeluk tulisanku ${toMe} kali. Setiap kali, aku merasa ditemukan.`
            : `Aku memeluk tulisanmu ${fromMe} kali, karena kadang “aku di sini” lebih mudah dikirim lewat satu ketukan.`,
      );
    }
    const q = f.quotes.find((x) => x.userId === one.userId);
    if (q) p.push(`Kalimatmu yang paling kuingat ${thisP}: “${q.text}”`);
  } else if (!solo && f.quotes.length) {
    const q = f.quotes.find((x) => x.userId !== f.viewer) ?? f.quotes[0]!;
    p.push(`Ada kalimat dari ${f.people.find((x) => x.userId === q.userId)?.name ?? 'kalian'} yang masih tertinggal di kepalaku: “${q.text}”`);
  }

  if (f.kangens && !solo) p.push(f.kangens === 1 ? `Sekali, di tengah hari, salah satu dari kita mengirim “kangen”. Satu ketukan kecil, tapi sampai.` : `${f.kangens} kali kita saling mengirim “kangen” ${thisP}. Tanpa kata, tapi semuanya sampai.`);
  if (f.photoTotal) p.push(`${f.photoTotal} foto membuat ${thisP} punya warna. Bukan foto yang bagus-bagus. Justru itu yang paling bagus.`);
  if (f.moods[0]) p.push(`Kalau ${thisP} harus diberi satu warna, aku pilih ${f.moods[0].label}.`);

  const closing: Record<WrapScope, string> = {
    week: `Terima kasih sudah ada di halaman-halaman kecil ini. Sampai jumpa di minggu berikutnya; aku akan menyimpan tempat untuk${yours}.`,
    month: `Bab ini selesai. Halaman berikutnya masih kosong, dan aku ingin mengisinya bersama${solo ? ' diriku sendiri' : one ? 'mu' : ' kalian'}.`,
    year: `Satu jilid lagi di rak kita. Terima kasih sudah menjalani ${input.period} bersama${solo ? ' diriku sendiri' : one ? 'ku' : ' aku'}.`,
    moment: 'Acaranya selesai, kenangannya baru mulai.',
  };
  p.push(closing[input.scope]);

  return { type: 'letter', to, toUserIds: f.others.map((o) => o.userId), paragraphs: p, signoff: me ? `— ${me.name}` : '— aku' };
}
