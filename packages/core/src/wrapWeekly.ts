/**
 * Adegan Wrapped yang dirangkai dari fitur harian: Rol Minggu Ini, perbandingan
 * dengan periode sebelumnya, wajah-wajah (Reaksi Wajah), dan Tanaman Berdua.
 */
import type { FaceExpression, MediaRef } from './domain';
import { kenalLabel, quizScores } from './kenal';
import { type PlantState, plantFor } from './plant';
import { tokenize } from './text';
import type { DayKey } from './time';
import type { WrapDrop, WrapInput, WrapScope } from './wrap';

export interface RollScene {
  type: 'roll';
  title?: string;
  items: { userId: string; shots: { dropId: string; media: MediaRef; day: DayKey; caption?: string }[] }[];
}

export interface CompareScene {
  type: 'compare';
  before: string;
  now: string;
  rows: { label: string; before: number; now: number }[];
  people: { userId: string; before: number; now: number }[];
  headline: string;
}

export interface FacesScene {
  type: 'faces';
  items: { userId: string; expression: FaceExpression; media: MediaRef; dropId: string }[];
  top?: { expression: FaceExpression; count: number };
}

export interface KenalScene {
  type: 'kenal';
  items: { userId: string; correct: number; total: number; label: string }[];
  best?: { from: string; to: string; correct: number; total: number };
  days: number;
}

/** Seberapa kenal: skor tebakan Kuis Seberapa Kenal di periode ini. */
export function kenalScene(drops: WrapDrop[]): KenalScene | null {
  const answers = drops
    .filter((d) => d.payload.quiz && d.questionId?.startsWith('kenal:'))
    .map((d) => ({ authorId: d.authorId, day: d.day, questionId: d.questionId!, choice: d.payload.quiz!.choice, guesses: d.payload.quiz!.guesses ?? {} }));
  const s = quizScores(answers);
  const items = Object.entries(s.byGuesser)
    .map(([userId, v]) => ({ userId, ...v, label: kenalLabel(v.correct, v.total) }))
    .sort((a, b) => b.correct / b.total - a.correct / a.total);
  if (!items.length) return null;
  return { type: 'kenal', items, best: s.pairs[0], days: new Set(answers.map((a) => a.day)).size };
}

export interface PlantScene {
  type: 'plant';
  state: PlantState;
  together: number;
}

const WARM = new Set(['hug', 'here', 'me_too', 'candle']);
const PREV: Record<WrapScope, string> = { week: 'minggu lalu', month: 'bulan lalu', year: 'tahun lalu', moment: 'sebelumnya' };
const NOW: Record<WrapScope, string> = { week: 'minggu ini', month: 'bulan ini', year: 'tahun ini', moment: 'acara ini' };

const content = (ds: WrapDrop[]) => ds.filter((d) => d.kind !== 'auto' && d.kind !== 'sticker');
const words = (ds: WrapDrop[]) => ds.reduce((a, d) => a + (d.payload.text ? tokenize(d.payload.text).length : 0), 0);
const photos = (ds: WrapDrop[]) => ds.filter((d) => d.kind === 'photo').reduce((a, d) => a + (d.payload.media?.length ?? 0), 0);
const hugs = (ds: WrapDrop[]) => ds.reduce((a, d) => a + d.reactions.filter((r) => WARM.has(r.kind) && r.userId !== d.authorId).length, 0);

/** Rol pilihan tiap anggota, urut sesuai urutan anggota. */
export function rollScene(input: WrapInput, drops: WrapDrop[]): RollScene | null {
  if (!input.rolls?.some((r) => r.dropIds.length)) return null;
  const byId = new Map(drops.map((d) => [d.id, d]));
  const items = input.members
    .map((m) => {
      const r = input.rolls!.find((x) => x.userId === m.userId);
      const shots = (r?.dropIds ?? [])
        .map((id) => byId.get(id))
        .filter((d): d is WrapDrop => !!d && !!d.payload.media?.[0])
        .map((d) => ({ dropId: d.id, media: d.payload.media![0]!, day: d.day, caption: d.payload.text?.trim() || undefined }));
      return { userId: m.userId, shots };
    })
    .filter((x) => x.shots.length);
  return items.length ? { type: 'roll', title: input.sceneTitle?.trim() || undefined, items } : null;
}

/** Dibanding periode sebelumnya. */
export function compareScene(input: WrapInput, drops: WrapDrop[]): CompareScene | null {
  if (!input.previous || input.scope === 'moment' || input.scope === 'year') return null;
  const before = input.previous.drops;
  const a = content(before);
  const b = content(drops);
  if (!a.length && !b.length) return null;
  const rows = [
    { label: 'hal kecil', before: a.length, now: b.length },
    { label: 'kata', before: words(a), now: words(b) },
    { label: 'foto', before: photos(a), now: photos(b) },
    { label: 'pelukan', before: hugs(before), now: hugs(drops) },
    { label: 'kilasan', before: before.filter((d) => d.flash).length, now: drops.filter((d) => d.flash).length },
  ].filter((r) => r.before || r.now);
  const people = input.members.map((m) => ({ userId: m.userId, before: a.filter((d) => d.authorId === m.userId).length, now: b.filter((d) => d.authorId === m.userId).length }));
  const diff = b.length - a.length;
  const nowW = NOW[input.scope];
  const prevW = PREV[input.scope];
  const headline = !a.length
    ? `${cap(prevW)} masih kosong. ${cap(nowW)} jadi awal ceritanya.`
    : diff > 0
      ? `${cap(nowW)} lebih ramai dari ${prevW}: ${diff} hal kecil lagi.`
      : diff < 0
        ? `${cap(nowW)} lebih pelan dari ${prevW}. Tidak apa-apa; yang pelan juga bagian dari cerita.`
        : `${cap(nowW)} sama ramainya dengan ${prevW}. Konsisten itu juga romantis.`;
  return { type: 'compare', before: prevW, now: nowW, rows, people, headline };
}

/** Wajah-wajah: semua Reaksi Wajah di periode ini. */
export function facesScene(drops: WrapDrop[]): FacesScene | null {
  const items = drops.flatMap((d) => (d.faces ?? []).map((f) => ({ ...f, dropId: d.id })));
  if (!items.length) return null;
  const count = new Map<FaceExpression, number>();
  for (const f of items) count.set(f.expression, (count.get(f.expression) ?? 0) + 1);
  const top = [...count.entries()].sort((x, y) => y[1] - x[1])[0];
  return { type: 'faces', items: items.slice(0, 24), top: top ? { expression: top[0], count: top[1] } : undefined };
}

/** Tanaman Berdua di akhir periode. */
export function plantScene(input: WrapInput, togetherInPeriod: number): PlantScene | null {
  if (!input.streak || !input.createdDay || input.scope === 'moment') return null;
  const today = input.today ?? input.createdDay;
  return { type: 'plant', state: plantFor({ streak: input.streak, createdDay: input.createdDay, today }), together: togetherInPeriod };
}

const cap = (s: string) => (s ? s[0]!.toUpperCase() + s.slice(1) : s);
