/**
 * Si Kepo: temuan pola dari jurnalmu sendiri, dihitung di perangkat dari
 * halaman yang sudah terbuka di sana. Tidak ada isi yang dikirim ke server,
 * dan tidak ada AI: hanya hitung-hitungan yang kebetulan usil.
 */
import { MOODS } from './content/chapterTitles';
import type { MoodCode } from './domain';
import { contentWords } from './text';
import { type DayKey, formatDayLong, weekday } from './time';

export interface KepoEntry {
  day: DayKey;
  /** Jam lokal saat ditulis. */
  hour: number;
  kind: string;
  text?: string;
  mood?: MoodCode;
  weather?: string;
  cityId?: string;
}

export interface KepoFinding {
  id: string;
  doodle: string;
  /** Kalimat temuannya. */
  title: string;
  /** Angka di baliknya, supaya tidak terasa mengarang. */
  proof: string;
}

export interface KepoReport {
  days: number;
  entries: number;
  /** Hari bertulisan yang masih dibutuhkan sebelum Si Kepo berani bicara. */
  need: number;
  findings: KepoFinding[];
}

export const KEPO_MIN_DAYS = 5;

const DAYS = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const WEATHER: Record<string, string> = { cerah: 'cerah', berawan: 'berawan', hujan: 'hujan', gerimis: 'gerimis', badai: 'badai', kabut: 'berkabut', salju: 'bersalju' };

function top<K>(m: Map<K, number>): [K, number] | undefined {
  let best: [K, number] | undefined;
  for (const e of m) if (!best || e[1] > best[1]) best = e;
  return best;
}
const inc = <K>(m: Map<K, number>, k: K, n = 1) => m.set(k, (m.get(k) ?? 0) + n);
const moodName = (m: MoodCode) => MOODS[m]?.label.toLowerCase() ?? m;

function hourLine(h: number): string {
  if (h < 4) return 'Jam segitu yang bangun cuma kamu, satpam, dan pikiranmu.';
  if (h < 9) return 'Pagi-pagi sudah menulis. Si Kepo curiga kamu orang baik.';
  if (h < 15) return 'Jam kerja. Si Kepo tidak akan bilang siapa-siapa.';
  if (h < 19) return 'Sore, jam paling jujur untuk menulis.';
  return 'Makhluk malam terdeteksi.';
}

export function kepo(entries: KepoEntry[]): KepoReport {
  const days = new Set(entries.map((e) => e.day));
  const out: KepoFinding[] = [];
  const report = (): KepoReport => ({ days: days.size, entries: entries.length, need: Math.max(0, KEPO_MIN_DAYS - days.size), findings: out });
  if (days.size < KEPO_MIN_DAYS) return report();

  // Jam & hari favorit
  const hours = new Map<number, number>();
  const dows = new Map<number, number>();
  for (const e of entries) inc(hours, e.hour);
  for (const d of days) inc(dows, weekday(d));
  const h = top(hours)!;
  out.push({ id: 'jam', doodle: 'ui-jam', title: `Kamu paling sering menulis sekitar jam ${String(h[0]).padStart(2, '0')}. ${hourLine(h[0])}`, proof: `${h[1]} dari ${entries.length} catatan` });
  const d = top(dows)!;
  const lazy = [...Array(7).keys()].map((k) => [k, dows.get(k) ?? 0] as const).sort((a, b) => a[1] - b[1])[0]!;
  if (d[1] >= 3 && d[1] > lazy[1])
    out.push({ id: 'hari', doodle: 'ui-kalender', title: `${DAYS[d[0]]} adalah hari paling rajinmu. ${DAYS[lazy[0]]} paling sering kabur.`, proof: `${DAYS[d[0]]} ${d[1]} hari · ${DAYS[lazy[0]]} ${lazy[1]} hari` });

  // Rasa per hari, lalu dipasangkan dengan cuaca hari itu
  const dayMoods = new Map<DayKey, MoodCode[]>();
  const dayWeather = new Map<DayKey, string>();
  for (const e of entries) {
    if (e.mood) dayMoods.set(e.day, [...(dayMoods.get(e.day) ?? []), e.mood]);
    if (e.weather && !dayWeather.has(e.day)) dayWeather.set(e.day, e.weather);
  }
  const allMoods = new Map<MoodCode, number>();
  for (const ms of dayMoods.values()) for (const m of new Set(ms)) inc(allMoods, m);
  const overall = top(allMoods);
  if (overall && overall[1] >= 3) out.push({ id: 'rasa', doodle: 'ui-palet', title: `Warna yang paling sering kamu pilih: ${moodName(overall[0])}.`, proof: `${overall[1]} dari ${dayMoods.size} hari berwarna` });

  const byWeather = new Map<string, Map<MoodCode, number>>();
  for (const [day, ms] of dayMoods) {
    const w = dayWeather.get(day);
    if (!w) continue;
    const m = byWeather.get(w) ?? new Map<MoodCode, number>();
    for (const x of new Set(ms)) inc(m, x);
    byWeather.set(w, m);
  }
  let bestW: { w: string; mood: MoodCode; n: number; total: number } | undefined;
  for (const [w, m] of byWeather) {
    const t = top(m)!;
    const total = [...m.values()].reduce((a, b) => a + b, 0);
    if (t[1] >= 3 && t[1] / total >= 0.5 && t[0] !== overall?.[0] && (!bestW || t[1] > bestW.n)) bestW = { w, mood: t[0], n: t[1], total };
  }
  if (bestW) out.push({ id: 'cuaca', doodle: bestW.w === 'cerah' ? 'matahari' : 'hujan', title: `Saat ${WEATHER[bestW.w] ?? bestW.w}, kamu paling sering merasa ${moodName(bestW.mood)}. Langit ternyata ikut campur.`, proof: `${bestW.n} dari ${bestW.total} hari ${WEATHER[bestW.w] ?? bestW.w}` });

  const byDow = new Map<number, Map<MoodCode, number>>();
  for (const [day, ms] of dayMoods) {
    const m = byDow.get(weekday(day)) ?? new Map<MoodCode, number>();
    for (const x of new Set(ms)) inc(m, x);
    byDow.set(weekday(day), m);
  }
  let bestD: { dow: number; mood: MoodCode; n: number; total: number } | undefined;
  for (const [dow, m] of byDow) {
    const t = top(m)!;
    const total = [...m.values()].reduce((a, b) => a + b, 0);
    if (t[1] >= 3 && t[1] / total >= 0.6 && t[0] !== overall?.[0] && (!bestD || t[1] > bestD.n)) bestD = { dow, mood: t[0], n: t[1], total };
  }
  if (bestD) out.push({ id: 'rasa-hari', doodle: 'ui-hati', title: `${DAYS[bestD.dow]}-mu hampir selalu ${moodName(bestD.mood)}. Ada apa dengan hari ${DAYS[bestD.dow]}?`, proof: `${bestD.n} dari ${bestD.total} ${DAYS[bestD.dow]}` });

  // Kata: yang paling setia, dan yang punya hari langganan
  const wordDays = new Map<string, Set<DayKey>>();
  const dayWords = new Map<DayKey, number>();
  for (const e of entries) {
    if (!e.text) continue;
    inc(dayWords, e.day, e.text.trim().split(/\s+/).filter(Boolean).length);
    for (const w of new Set(contentWords(e.text))) if (w.length >= 4) wordDays.set(w, (wordDays.get(w) ?? new Set()).add(e.day));
  }
  const loyal = [...wordDays.entries()].filter(([, s]) => s.size >= 3).sort((a, b) => b[1].size - a[1].size || b[0].length - a[0].length);
  if (loyal[0]) out.push({ id: 'kata', doodle: 'ui-kata', title: `Kata paling setia di jurnalmu: “${loyal[0][0]}”.`, proof: `muncul di ${loyal[0][1].size} hari berbeda${loyal[1] ? ` · disusul “${loyal[1][0]}” (${loyal[1][1].size})` : ''}` });
  let ritual: { w: string; dow: number; n: number; total: number } | undefined;
  for (const [w, s] of loyal) {
    const m = new Map<number, number>();
    for (const day of s) inc(m, weekday(day));
    const t = top(m)!;
    if (t[1] >= 3 && t[1] / s.size >= 0.6 && (!ritual || t[1] > ritual.n)) ritual = { w, dow: t[0], n: t[1], total: s.size };
  }
  if (ritual) out.push({ id: 'ritual', doodle: 'ui-cari', title: `“${cap(ritual.w)}” hampir selalu muncul hari ${DAYS[ritual.dow]}. Si Kepo mencium sebuah ritual.`, proof: `${ritual.n} dari ${ritual.total} kemunculan` });

  // Halaman terpanjang & rata-rata
  const longest = top(dayWords);
  if (longest && longest[1] >= 40) {
    const avg = Math.round([...dayWords.values()].reduce((a, b) => a + b, 0) / dayWords.size);
    out.push({ id: 'panjang', doodle: 'pena', title: `Halaman terpanjangmu: ${formatDayLong(longest[0])}. Hari itu banyak yang perlu keluar.`, proof: `${longest[1]} kata · rata-ratamu ${avg} kata sehari` });
  }

  // Foto & kota
  const photoDow = new Map<number, number>();
  for (const e of entries) if (e.kind === 'photo') inc(photoDow, weekday(e.day));
  const p = top(photoDow);
  const photos = [...photoDow.values()].reduce((a, b) => a + b, 0);
  if (p && photos >= 5 && p[1] / photos >= 0.3) out.push({ id: 'foto', doodle: 'ui-foto', title: `Kameramu paling sibuk hari ${DAYS[p[0]]}.`, proof: `${p[1]} dari ${photos} foto` });
  const cities = new Set(entries.map((e) => e.cityId).filter(Boolean));
  if (cities.size >= 2) out.push({ id: 'kota', doodle: 'ui-lokasi', title: `Kamu menulis dari ${cities.size} kota. Jurnalmu lebih sering jalan-jalan daripada kamu kira.`, proof: `${cities.size} kota dalam ${days.size} hari` });

  return report();
}

function cap(s: string) {
  return s ? s[0]!.toUpperCase() + s.slice(1) : s;
}
