/**
 * Puisi Temuan (blackout poetry): kata-kata lingkaran selama seminggu jadi
 * selembar teks. Hitamkan kata demi kata sampai tersisa puisi kalian sendiri.
 */
import { blackoutSource, formatDayLong, isoWeek, weekRange } from '@sehari/core';
import { useMemo, useRef, useState } from 'react';
import { nowParts, useCircle, useCircleRange, useCreateDrop, useMe, useOpenDrops, useToday } from '@/lib/data';
import { useParams } from '@/lib/router';
import { Doodle, Empty, Growing, Header, Screen, Section, Sticky } from '@/ui/kit';
import { authoredTexts, Btn, ErrLine, errorText, LoreHero, nameIn } from './board';

const MIN_WORDS = 24;

export default function Puisi() {
  const { id } = useParams<{ id: string }>();
  const me = useMe();
  const today = useToday();
  const circle = useCircle(id);
  const { start, end } = weekRange(isoWeek(today));
  const to = end < today ? end : today;
  const range = useCircleRange(id, start, to, !!circle);
  const opened = useOpenDrops(range.data?.drops);
  const create = useCreateDrop();
  const [black, setBlack] = useState<Set<number>>(new Set());
  const [saved, setSaved] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  // Sapuan: tahan & geser untuk menghitamkan beberapa kata sekaligus.
  const brush = useRef<null | boolean>(null);

  const words = useMemo(() => blackoutSource(authoredTexts(opened, { kinds: ['text', 'idea', 'word', 'answer', 'card', 'expedition', 'last_line', 'prologue', 'epilogue'] })), [opened]);
  const poems = opened.filter((d) => d.wire.kind === 'blackout' && d.payload?.text);
  const kept = words.filter((_, i) => !black.has(i));
  const poem = kept.join(' ');

  if (!circle)
    return (
      <Screen>
        <Header title="puisi temuan" backTo={`/l/${id}`} />
        <Growing />
      </Screen>
    );

  const setWord = (i: number, off: boolean) =>
    setBlack((s) => {
      if (s.has(i) === off) return s;
      const n = new Set(s);
      if (off) n.add(i);
      else n.delete(i);
      return n;
    });

  const save = async () => {
    setErr(null);
    const { hour, minute } = nowParts(me.user.tz);
    try {
      await create.mutateAsync({ day: today, audience: 'circle', circleIds: [id], payload: { v: 1, kind: 'blackout', text: poem, hour, minute, tz: me.user.tz } });
      setSaved(poem);
      setBlack(new Set());
      void range.refetch();
    } catch (e) {
      setErr(errorText(e));
    }
  };

  const canSave = kept.length >= 2 && black.size >= 1;

  return (
    <Screen>
      <Header title="puisi temuan" sub={`${formatDayLong(start, false)} – ${formatDayLong(end)}`} backTo={`/l/${id}`} />
      {range.isLoading ? (
        <Growing label="mengumpulkan kata seminggu…" />
      ) : words.length < MIN_WORDS ? (
        <Empty
          doodle="pena"
          title="kata-katanya masih sedikit"
          body={`Minggu ini baru ada ${words.length} kata yang terbuka di lingkaran. Puisi temuan butuh selembar teks dulu — tulis-tulis kecil sepanjang minggu sudah cukup.${range.data?.locked.length ? ' Kata-kata teman terbuka setelah kamu menyegel harimu.' : ' Coba lagi menjelang akhir pekan.'}`}
        />
      ) : (
        <>
          <LoreHero doodle="pena" size={56} title="hitamkan, temukan" sub="Ketuk kata untuk menghitamkannya. Yang tersisa adalah puisimu." />
          <div
            className="lore-blackout"
            onPointerUp={() => (brush.current = null)}
            onPointerLeave={() => (brush.current = null)}
            onPointerCancel={() => (brush.current = null)}>
            <span className="lore-blackout-clip" aria-hidden>
              <Doodle id="klip-kertas" size={40} />
            </span>
            {words.map((w, i) => {
              const off = black.has(i);
              return (
                <button
                  key={i}
                  className={`lore-word ${off ? 'off' : ''}`}
                  aria-pressed={off}
                  aria-label={off ? `kembalikan ${w}` : `hitamkan ${w}`}
                  onPointerDown={(e) => {
                    (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
                    brush.current = !off;
                    setWord(i, !off);
                  }}
                  onPointerEnter={() => {
                    if (brush.current !== null) setWord(i, brush.current);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setWord(i, !off);
                    }
                  }}>
                  {w}
                </button>
              );
            })}
          </div>
          <div className="row" style={{ justifyContent: 'center', marginTop: 10 }}>
            <button className="btn ghost sm auto" onClick={() => setBlack(new Set(words.map((_, i) => i)))}>
              hitamkan semua
            </button>
            <button className="btn ghost sm auto" onClick={() => setBlack(new Set())}>
              mulai lagi
            </button>
          </div>
          <p className="tiny soft center" style={{ marginTop: 6 }}>tip: hitamkan semua dulu, lalu ketuk kata yang ingin kamu selamatkan · tahan & geser untuk menyapu</p>

          {black.size ? (
            <div className="rise" style={{ marginTop: 24 }}>
              <Sticky color="yellow" tilt={-1}>
                <div className="tiny" style={{ letterSpacing: '0.14em', opacity: 0.7 }}>puisimu</div>
                <div className="hand" style={{ fontSize: 30, lineHeight: 1.2, marginTop: 4, color: 'inherit' }}>{poem || '…'}</div>
              </Sticky>
            </div>
          ) : null}
          <div style={{ height: 16 }} />
          <Btn icon="buku" disabled={!canSave} loading={create.isPending} onClick={() => void save()}>
            simpan ke kitab
          </Btn>
          <ErrLine>{err}</ErrLine>
        </>
      )}

      {saved ? (
        <div className="card col center rise" style={{ alignItems: 'center', marginTop: 16, background: 'var(--pill)' }}>
          <Doodle id="ui-centang" size={32} draw />
          <span className="small center">Puisinya sudah masuk kitab minggu ini.</span>
        </div>
      ) : null}

      {poems.length ? (
        <Section title="puisi minggu ini">
          <div className="col" style={{ gap: 12 }}>
            {poems.map((d, i) => (
              <div key={d.wire.id} className="card lore-poem-paper" style={{ transform: `rotate(${i % 2 ? 0.5 : -0.5}deg)` }}>
                <div className="hand" style={{ fontSize: 26, lineHeight: 1.25 }}>{d.payload!.text}</div>
                <div className="tiny soft" style={{ marginTop: 6 }}>
                  ditemukan {nameIn(circle, d.wire.authorId, me.user.id)} · {formatDayLong(d.wire.day, false)}
                </div>
              </div>
            ))}
          </div>
        </Section>
      ) : null}
    </Screen>
  );
}
