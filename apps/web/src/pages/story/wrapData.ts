/**
 * Bahan Wrap dirangkai di perangkat: Drop didekripsi di sini, lalu `buildWrap`
 * menghitung kartu-kartunya. Tidak ada isi yang dikirim ke server.
 */
import {
  addDays,
  buildWrap,
  type ChapterWire,
  diffDays,
  type DropWire,
  GENRES,
  type LockedDrop,
  monthRange,
  type MotifWire,
  suggestTitlesFor,
  type VolumeWire,
  type Wrap,
  type WrapDrop,
  type WrapInput,
  type WrapMember,
  type WrapScope,
  todayIn,
  weekRange,
  yearRange,
} from '@sehari/core';
import { useQueries, useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { api } from '@/lib/api';
import { type CircleView, openCircleText, qk, useCalendar, useCircles, useMe, useOpenDrops } from '@/lib/data';

export const SCOPES: WrapScope[] = ['week', 'month', 'year', 'moment'];

/** Rentang hari untuk satu periode Wrap, atau null bila parameter tidak masuk akal. */
export function rangeFor(scope: string, period: string, circle: Pick<CircleView, 'moment'> | undefined): { start: string; end: string } | null {
  try {
    if (scope === 'week' && /^\d{4}-W\d{2}$/.test(period)) return weekRange(period);
    if (scope === 'month' && /^\d{4}-(0[1-9]|1[0-2])$/.test(period)) return monthRange(period);
    if (scope === 'year' && /^\d{4}$/.test(period)) return yearRange(Number(period));
    if (scope === 'moment' && circle?.moment) return { start: circle.moment.startsOn, end: circle.moment.endsOn };
  } catch {
    return null;
  }
  return null;
}

/** Endpoint Drop membatasi 400 hari per panggilan; potong rentang yang lebih panjang. */
function chunks(start: string, end: string, max = 370): { from: string; to: string }[] {
  const out: { from: string; to: string }[] = [];
  let from = start;
  while (from <= end) {
    const to = diffDays(end, from) > max ? addDays(from, max) : end;
    out.push({ from, to });
    from = addDays(to, 1);
  }
  return out;
}

type DropsResult = { data?: { drops: DropWire[] }; isLoading: boolean; error: unknown; refetch: () => unknown };

/** Stabil di luar komponen supaya hasil gabungan tidak dibuat ulang tiap render. */
function combineDrops(results: DropsResult[]) {
  return {
    wires: results.flatMap((q) => q.data?.drops ?? []),
    loading: results.some((q) => q.isLoading),
    error: results.find((q) => q.error)?.error ?? null,
    refetch: () => {
      for (const q of results) void q.refetch();
    },
  };
}

export type WrapState =
  | { status: 'loading' }
  | { status: 'invalid' }
  | { status: 'locked'; reason: 'memorial' | 'split'; circle: CircleView }
  | { status: 'error'; error: unknown; retry: () => void }
  | {
      status: 'ready';
      circle: CircleView;
      wrap: Wrap;
      input: WrapInput;
      quiet: boolean;
      /** Usulan judul bab otomatis (hanya untuk tampilan lingkaran, tidak pernah publik). */
      suggestedTitle?: string;
    };

export function useWrapData(circleId: string, scope: string, period: string): WrapState {
  const me = useMe();
  const { circles, isLoading: circlesLoading } = useCircles();
  const circle = circles.find((c) => c.id === circleId);
  const range = rangeFor(scope, period, circle);
  const blocked = !!circle && (circle.memorialLocked || circle.status === 'split');
  const enabled = !!circle && !!range && !blocked;
  const parts = range ? chunks(range.start, range.end) : [];

  const dropQs = useQueries({
    queries: parts.map((p) => ({
      queryKey: qk.circleRange(circleId, p.from, p.to),
      queryFn: () => api.get<{ drops: DropWire[]; locked: LockedDrop[] }>(`/circles/${circleId}/drops?from=${p.from}&to=${p.to}`),
      enabled,
    })),
    combine: combineDrops,
  });
  const cal = useCalendar(enabled ? circleId : '', range?.start ?? '', range?.end ?? '');
  const wantsLore = enabled && (scope === 'month' || scope === 'year');
  const chapters = useQuery({
    queryKey: ['chapters', circleId],
    queryFn: () => api.get<ChapterWire[]>(`/circles/${circleId}/chapters`),
    enabled: wantsLore,
  });
  const volumes = useQuery({
    queryKey: ['volumes', circleId],
    queryFn: () => api.get<VolumeWire[]>(`/circles/${circleId}/volumes`),
    enabled: enabled && scope === 'year',
  });
  const motifs = useQuery({
    queryKey: ['motifs', circleId],
    queryFn: () => api.get<MotifWire[]>(`/circles/${circleId}/motifs`),
    enabled: enabled && scope === 'year',
  });

  const opened = useOpenDrops(dropQs.wires);

  const loading =
    circlesLoading ||
    (enabled && (dropQs.loading || cal.isLoading || (wantsLore && chapters.isLoading) || (scope === 'year' && (volumes.isLoading || motifs.isLoading))));
  const failed = dropQs.error ?? cal.error;

  const built = useMemo(() => {
    if (!circle || !range || blocked || loading || failed) return null;
    const meFirst = [...circle.members].sort((a, b) => (a.userId === me.user.id ? -1 : b.userId === me.user.id ? 1 : 0));
    const members: WrapMember[] = meFirst
      .filter((m) => m.state !== 'left' || (m.leftDay != null && m.leftDay >= range.start))
      .map((m) => ({ userId: m.userId, name: m.penName }));

    const drops: WrapDrop[] = [];
    const seen = new Set<string>();
    for (const d of opened) {
      if (!d.payload || seen.has(d.wire.id)) continue;
      seen.add(d.wire.id);
      drops.push({ id: d.wire.id, authorId: d.wire.authorId, day: d.wire.day, kind: d.wire.kind, payload: d.payload, reactions: d.wire.reactions });
    }

    const seals: Record<string, string[]> = {};
    for (const day of cal.data ?? []) for (const u of day.sealed) (seals[u] ??= []).push(day.day);

    let chapterTitle: string | undefined;
    let chapterTitles: { month: string; title: string }[] | undefined;
    if (scope === 'month') {
      const ch = chapters.data?.find((x) => x.month === period);
      chapterTitle = ch?.titleEnc ? openCircleText(circle, ch.titleEnc, '') || undefined : undefined;
    }
    if (scope === 'year') {
      chapterTitles = (chapters.data ?? [])
        .filter((x) => x.month.startsWith(`${period}-`) && x.titleEnc)
        .map((x) => ({ month: x.month, title: openCircleText(circle, x.titleEnc, '') }))
        .filter((x) => x.title);
    }
    let genreName: string | undefined;
    let motifList: string[] | undefined;
    if (scope === 'year') {
      const vol = volumes.data?.find((v) => v.year === Number(period));
      genreName = GENRES.find((g) => g.id === vol?.genreId)?.name;
      motifList = (motifs.data ?? [])
        .filter((m) => m.year === Number(period))
        .map((m) => openCircleText(circle, m.termEnc, ''))
        .filter(Boolean);
    }

    const input: WrapInput = {
      scope: scope as WrapScope,
      period,
      range: scope === 'moment' ? range : undefined,
      circle: { id: circle.id, kind: circle.kind, name: circle.name },
      members,
      drops,
      seals,
      streak: circle.streak,
      chapterTitle,
      chapterTitles,
      genreName,
      motifs: motifList,
      viewerId: me.user.id,
      today: todayIn(me.user.tz, new Date(), true),
    };
    const wrap = buildWrap(input);
    const suggestedTitle = scope === 'month' && !chapterTitle && drops.length ? suggestTitlesFor(input)[0] : undefined;
    return { input, wrap, quiet: drops.length === 0, suggestedTitle };
  }, [circle, range?.start, range?.end, blocked, loading, failed, opened, cal.data, chapters.data, volumes.data, motifs.data, scope, period, me.user.id]);

  if (circlesLoading) return { status: 'loading' };
  if (!circle || !SCOPES.includes(scope as WrapScope) || !range) return circle || !circlesLoading ? { status: 'invalid' } : { status: 'loading' };
  if (circle.memorialLocked) return { status: 'locked', reason: 'memorial', circle };
  if (circle.status === 'split') return { status: 'locked', reason: 'split', circle };
  if (failed) {
    return {
      status: 'error',
      error: failed,
      retry: () => {
        dropQs.refetch();
        void cal.refetch();
      },
    };
  }
  if (loading || !built) return { status: 'loading' };
  return { status: 'ready', circle, ...built };
}
