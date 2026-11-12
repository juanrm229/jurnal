/**
 * Model bersama meja cerita: membuka amplop, merakit Peta Pengetahuan, dan
 * menjawab "kartu prompt tokoh ini berisi apa". Semua layar membaca dari sini.
 */
import {
  STORY_FREE,
  storyBabak,
  type StoryFactPayload,
  type StoryFocusPayload,
  type StoryHandoffPayload,
  storyLens,
  type StoryMeta,
  type StoryPalettePayload,
  type StoryPartPayload,
  type StoryPartWire,
  type StoryPremise,
  storyPremise,
  type StoryReadPayload,
  storyRole,
  type StorySeat,
  storySeat,
  storySentences,
  storyTilt,
  type StoryWire,
} from '@sehari/core';
import { useMemo } from 'react';
import { api } from '@/lib/api';
import { memberName, useCircles } from '@/lib/data';
import { useReady } from '@/lib/session';
import { sealPart, useOpenAny, useStoryCache } from '@/lib/stories';
import { useToast } from '@/ui/kit';

export type Env = { ciphertext: string; recipients: unknown[] } | null | undefined;

export interface Fact {
  id: string;
  round: number;
  authorId: string;
  state: 'usul' | 'sah' | 'tunda' | 'diganti';
  agrees: string[];
  defers: string[];
  supersedes: string | null;
  f: StoryFactPayload;
}

export interface Prompt {
  tokoh: string;
  seat: StorySeat | null;
  waktu: string;
  tahu: { text: string; from?: string }[];
  mengira: string[];
  /** Fakta yang ada di cerita tapi tidak sampai ke tokoh ini: tampil tersensor. */
  sensor: { len: number; hint: string }[];
  belumTahu?: string;
  misteri: string[];
  jejak: { what: string; question: string; from: string; round: number }[];
  opsi: { text: string; from: string; role?: string }[];
  celah: string[];
  fokus: { text: string; lens: string; tilt: boolean } | null;
}

const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();
const has = (list: string[] | undefined, t: string) => !!list?.some((x) => same(x, t));

export function useStoryModel(st: StoryWire) {
  const { me, identity } = useReady();
  const meId = me.user.id;
  const { circles } = useCircles();
  const circle = circles.find((c) => c.id === st.circleId);
  const openAny = useOpenAny();
  const cache = useStoryCache();
  const toast = useToast();

  return useMemo(() => {
    const open = <T,>(env: Env) => openAny<T>(env as never);
    const meta = st.premise === STORY_FREE ? open<StoryMeta>(st.meta) : null;
    const base = st.premise === STORY_FREE ? null : storyPremise(st.premise)!;
    const premise: StoryPremise = base ?? { id: STORY_FREE, title: meta?.title ?? 'cerita kalian', doodle: 'pena', pitch: meta?.pitch ?? '', fakta: meta?.fakta ?? [], rounds: [] };
    const n = st.members.length;
    const name = (uid: string) => memberName(circles, uid, meId);
    const face = (uid: string) => (uid === meId ? me.user.doodle : (circle?.members.find((m) => m.userId === uid)?.doodle ?? 'tunas'));
    const main = st.parts.filter((p) => p.world === 'a');
    const fixedSeat = (round: number, i: number) => (round <= premise.rounds.length ? storySeat(premise, round, i, n) : null);
    const waktuOf = (round: number) => premise.rounds[round - 1]?.waktu ?? `gelombang ${round}`;

    /** Isi adegan; bagian lama menyimpan semuanya dalam satu amplop. */
    const sceneOf = (p: StoryPartWire | undefined) => {
      const x = p ? open<StoryPartPayload>(p.envelope) : null;
      return x ? { text: x.text } : null;
    };
    /** Serah-terima; bagian lama diturunkan dari isi adegannya. */
    const handoffOf = (p: StoryPartWire | undefined): StoryHandoffPayload | null => {
      if (!p) return null;
      const h = open<StoryHandoffPayload>(p.handoff);
      if (h) return h;
      const old = open<StoryPartPayload>(p.envelope);
      if (!old) return null;
      const tokoh = old.seat?.tokoh ?? fixedSeat(p.round, st.members.indexOf(p.authorId))?.tokoh ?? 'tokoh';
      return {
        v: 1,
        tokoh,
        waktu: old.seat?.waktu,
        line: storySentences(old.text).at(-1) ?? old.text.slice(0, 160),
        trace: old.trace ? { what: old.trace.what, knows: old.trace.knownBy ? old.trace.knownBy.split(/,|dan/).map((x) => x.trim()).filter(Boolean) : [], question: old.trace.question } : undefined,
        proof: old.proof,
      };
    };
    const tokohOf = (p: StoryPartWire) => handoffOf(p)?.tokoh ?? fixedSeat(p.round, st.members.indexOf(p.authorId))?.tokoh ?? 'tokoh';

    const facts: Fact[] = st.facts
      .map((w) => {
        const f = open<StoryFactPayload>(w.envelope);
        return f ? { id: w.id, round: w.round, authorId: w.authorId, state: w.state, agrees: w.agrees, defers: w.defers, supersedes: w.supersedes, f } : null;
      })
      .filter((x): x is Fact => !!x);
    const sah = facts.filter((x) => x.state === 'sah');

    const tokohs = [
      ...new Set([
        ...premise.rounds.flatMap((r) => r.seats.map((s) => s.tokoh)),
        ...(meta?.tokoh ?? []),
        ...main.map((p) => handoffOf(p)?.tokoh).filter((x): x is string => !!x && x !== 'tokoh'),
        ...sah.flatMap((x) => [...x.f.knows, ...x.f.believes]),
      ]),
    ];

    const palette = st.palette.map((e) => open<StoryPalettePayload>(e as Env)).filter((x): x is StoryPalettePayload => !!x);
    const paletteAll = {
      boleh: [...new Set(palette.flatMap((x) => x.boleh))],
      garis: [...new Set(palette.flatMap((x) => x.garis))],
      tirai: [...new Set(palette.flatMap((x) => x.tirai))],
    };
    const focusOf = (round: number) => {
      const f = open<StoryFocusPayload>(st.focus[String(round)] as Env);
      return f ? { text: f.text, lens: storyLens(st.members, round), tilt: round === storyTilt(st.rounds) } : null;
    };
    const roleAt = (uid: string, round: number) => storyRole(([...st.rolesLog, st.roles][storyBabak(st.rounds, round)] ?? st.roles)[uid]);

    /** Kartu prompt untuk `tokoh` di gelombang `round`, dirakit dari Peta. */
    const promptFor = (tokoh: string, round: number, seat: StorySeat | null): Prompt => {
      const before = main.filter((p) => p.round < round);
      const tahu: Prompt['tahu'] = [...(seat?.tahu ?? []).map((t) => ({ text: t }))];
      const mengira: string[] = [];
      const sensor: Prompt['sensor'] = [];
      const misteri: string[] = [];
      for (const x of sah) {
        if (x.f.mystery) misteri.push(x.f.sentence);
        else if (has(x.f.knows, tokoh)) tahu.push({ text: x.f.sentence, from: 'fakta' });
        else if (has(x.f.believes, tokoh)) mengira.push(x.f.sentence);
        else sensor.push({ len: x.f.sentence.length, hint: x.f.waktu ? `sesuatu pada ${x.f.waktu}` : 'sesuatu yang terjadi' });
      }
      if (!seat && round === 1) tahu.push(...premise.fakta.map((t) => ({ text: t, from: 'pembuka' })));
      const jejak: Prompt['jejak'] = [];
      const opsi: Prompt['opsi'] = [];
      for (const p of before) {
        const h = handoffOf(p);
        if (!h) continue;
        if (h.trace) {
          if (has(h.trace.knows, tokoh) || (n === 1 && p.round === round - 1)) jejak.push({ what: h.trace.what, question: h.trace.question, from: name(p.authorId), round: p.round });
          else if (p.round === round - 1 && p.authorId !== meId) sensor.push({ len: h.trace.what.length, hint: `jejak dari ${h.tokoh}` });
        }
        if (h.option && p.round === round - 1 && same(h.option.to, tokoh)) opsi.push({ text: h.option.text, from: name(p.authorId), role: st.phase === 'done' ? roleAt(p.authorId, p.round)?.name : undefined });
      }
      jejak.sort((a, b) => b.round - a.round);
      const celah = st.notes.filter((x) => x.resolution === 'adegan-antara' && main.find((p) => p.id === x.partId)?.authorId === meId).map((x) => open<{ text: string }>(x.envelope)?.text ?? '').filter(Boolean);
      return { tokoh, seat, waktu: waktuOf(round), tahu, mengira, sensor: sensor.slice(0, 6), belumTahu: seat?.belumTahu, misteri, jejak: jejak.slice(0, 3), opsi, celah, fokus: focusOf(round) };
    };

    /** Kalimat "apa yang harus kulakukan sekarang". */
    const nextAction = (): string => {
      if (st.phase === 'done') return st.edition && !st.editionOk.includes(meId) ? 'Susunan edisi menunggu persetujuanmu.' : 'Cerita ini selesai. Buka pengungkapannya.';
      const mine = main.find((p) => p.round === st.round && p.authorId === meId);
      if (st.phase === 'write') {
        if (storyLens(st.members, st.round) === meId && !st.focus[String(st.round)] && n > 1) return 'Kamu Lensa gelombang ini. Pilih fokusnya dulu.';
        if (!mine?.sealed) return mine ? 'Lanjutkan adeganmu, lalu segel.' : 'Baca kartumu. Giliranmu menulis.';
        const wait = st.members.filter((m) => !main.find((p) => p.round === st.round && p.authorId === m)?.sealed);
        return `Bagianmu tersegel. Menunggu ${wait.map(name).join(', ')}.`;
      }
      const vote = facts.filter((x) => (x.state === 'usul' || x.state === 'tunda') && !x.agrees.includes(meId)).length;
      if (vote) return `${vote} fakta menunggu persetujuanmu.`;
      const unread = main.filter((p) => p.round === st.round && p.authorId !== meId && !st.reads.some((r) => r.partId === p.id && r.readerId === meId && r.kind === 'tafsir'));
      if (unread.length) return `Tulis apa yang kamu tangkap dari bagian ${unread.map((p) => name(p.authorId)).join(', ')}.`;
      return st.ready.includes(meId) ? 'Menunggu yang lain selesai membaca.' : 'Siap? Lanjutkan ke gelombang berikutnya.';
    };

    const seal = (value: unknown) => sealPart(value, circle, { id: meId, publicKey: identity.publicKey });
    const run = async (f: () => Promise<StoryWire>) => {
      try {
        cache(await f());
        return true;
      } catch (e) {
        toast((e as Error).message);
        return false;
      }
    };
    const post = <T = StoryWire,>(path: string, body?: unknown) => api.post<T>(`/stories/${st.id}${path}`, body);
    const put = <T = StoryWire,>(path: string, body?: unknown) => api.put<T>(`/stories/${st.id}${path}`, body);
    const reads = st.reads.map((r) => ({ ...r, r: open<StoryReadPayload>(r.envelope) })).filter((x) => !!x.r);

    return { st, me, meId, circle, circles, premise, meta, n, name, face, main, fixedSeat, waktuOf, sceneOf, handoffOf, tokohOf, facts, sah, tokohs, palette: paletteAll, focusOf, roleAt, promptFor, nextAction, seal, run, post, put, open, reads };
  }, [st, circles, openAny, meId]);
}

export type StoryModel = ReturnType<typeof useStoryModel>;

/** Enam langkah satu gelombang, untuk garis kemajuan di atas meja. */
export const STEPS = ['kartu', 'tulis', 'segel', 'buka', 'tinjau', 'lanjut'] as const;
export function stepOf(m: StoryModel): number {
  const { st, main, meId } = m;
  if (st.phase === 'done') return 6;
  if (st.phase === 'read') return st.ready.includes(meId) ? 5 : m.reads.some((r) => r.readerId === meId) || m.facts.some((f) => f.round === st.round) ? 4 : 3;
  const mine = main.find((p) => p.round === st.round && p.authorId === meId);
  return mine?.sealed ? 2 : mine ? 1 : 0;
}
