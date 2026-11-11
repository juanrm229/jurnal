/**
 * Kertas Kalkir: halaman dari masa lalu (setahun, setengah tahun, sebulan,
 * atau seminggu lalu) tembus samar di bawah halaman hari ini, di posisi
 * aslinya. Dibuka di perangkat dengan kunci yang sama; tidak ada yang baru
 * dikirim ke server.
 */
import { addDays, type DropPayload, formatDayLong, formatDayShort, type MyDay, parseDay } from '@sehari/core';
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { api } from '@/lib/api';
import { openDrop, qk, useKeyring, useMyDays } from '@/lib/data';
import { Doodle } from '@/ui/kit';
import { type PageItem, withLayouts } from './Page';

export interface Ghost {
  day: string;
  label: string;
  items: { id: string; payload: DropPayload; x: number; y: number; w: number; rot: number }[];
}

function candidates(day: string): { day: string; label: string }[] {
  const { year, month, day: d } = parseDay(day);
  const pad = (n: number) => String(n).padStart(2, '0');
  const leap = (y: number) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
  const lastYear = `${year - 1}-${pad(month)}-${pad(month === 2 && d === 29 && !leap(year - 1) ? 28 : d)}`;
  return [
    { day: lastYear, label: 'setahun lalu' },
    { day: addDays(day, -182), label: 'setengah tahun lalu' },
    { day: addDays(day, -30), label: 'sebulan lalu' },
    { day: addDays(day, -7), label: 'seminggu lalu' },
  ];
}

/** Halaman lama terdekat yang tersegel dan berisi, siap dijiplak. */
export function useKalkir(day: string, viewerId: string, on: boolean): Ghost | null {
  const cands = useMemo(() => candidates(day), [day]);
  const days = useMyDays(cands[0]!.day, cands[cands.length - 1]!.day);
  const pick = on ? cands.find((c) => days.data?.some((x) => x.day === c.day && x.sealedAt && x.dropCount > 0)) : undefined;
  const ring = useKeyring();
  const q = useQuery({ queryKey: qk.myDay(pick?.day ?? '-'), queryFn: () => api.get<MyDay>(`/days/${pick!.day}`), enabled: !!pick, staleTime: 3600_000 });
  return useMemo(() => {
    if (!pick || !q.data || !ring) return null;
    const items: PageItem[] = q.data.drops
      .filter((w) => w.authorId === viewerId && !w.pageCircleId)
      .map((w) => ({ w, o: openDrop(w, ring) }))
      .filter((x) => x.o.payload && ['text', 'idea', 'word', 'card', 'answer', 'intent', 'last_line', 'photo', 'expedition'].includes(x.o.payload.kind))
      .map(({ w, o }) => ({ id: w.id, authorId: w.authorId, payload: o.payload!, audience: w.audience, circleIds: w.circleIds, mediaIds: w.mediaIds, reactions: [], footnotes: [] }));
    if (!items.length) return null;
    return { day: pick.day, label: pick.label, items: withLayouts(items).map((it) => ({ id: it.id, payload: it.payload, x: it.layout.x, y: it.layout.y, w: it.layout.w, rot: it.layout.rot })) };
  }, [pick?.day, q.data, ring, viewerId]);
}

/** Lapisan jiplakan; dirender di dalam <Page> (memakai skala --s milik halaman). */
export function KalkirLayer({ ghost }: { ghost: Ghost }) {
  return (
    <div className="kalkir" aria-hidden data-testid="kalkir">
      {ghost.items.map((g) => {
        const p = g.payload;
        const font = p.style?.font ?? (p.kind === 'intent' || p.kind === 'last_line' ? 'hand' : 'mono');
        const size = (p.style?.size ?? 38) * (font === 'hand' ? 1.25 : 1);
        const box = { left: `calc(var(--s) * ${g.x}px)`, top: `calc(var(--s) * ${g.y}px)`, width: `calc(var(--s) * ${g.w}px)`, transform: `rotate(${g.rot}deg)` };
        if (p.kind === 'photo')
          return (
            <div key={g.id} className="kalkir-photo" style={{ ...box, height: `calc(var(--s) * ${Math.round(g.w * 1.05)}px)` }}>
              <Doodle id="ui-foto" size={28} />
              {p.text ? <span>{p.text}</span> : null}
            </div>
          );
        if (!p.text) return null;
        return (
          <div key={g.id} className={`kalkir-text ${font}`} style={{ ...box, fontSize: `max(9px, calc(var(--s) * ${size}px))` }}>
            {p.text}
          </div>
        );
      })}
    </div>
  );
}

export function KalkirChip({ ghost, on, onToggle, onOpen }: { ghost: Ghost; on: boolean; onToggle: () => void; onOpen: () => void }) {
  return (
    <div className="kalkir-chip" data-testid="kalkir-chip">
      <button onClick={onToggle} aria-pressed={on} title={on ? 'sembunyikan kertas kalkir' : 'tampilkan kertas kalkir'}>
        <Doodle id="buku-terbuka" size={16} color="currentColor" />
        <span>
          kalkir · <b>{ghost.label}</b>
        </span>
        <span className="kalkir-eye">{on ? 'tampak' : 'tersembunyi'}</span>
      </button>
      {on ? (
        <button onClick={onOpen} className="kalkir-go" aria-label={`buka halaman ${formatDayLong(ghost.day)}`}>
          {formatDayShort(ghost.day)} →
        </button>
      ) : null}
    </div>
  );
}
