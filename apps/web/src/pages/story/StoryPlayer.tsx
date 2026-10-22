/**
 * Pemutar cerita ala Story: ketuk kanan/kiri untuk maju/mundur, tahan untuk
 * berhenti sejenak, garis kemajuan di atas. Tahun Kita lebih pelan, dengan
 * peralihan memudar seperti film pendek. Layar penuh di ponsel; di layar
 * lebar jadi selembar kertas tegak 9:16 di tengah.
 */
import { type CSSProperties, type PointerEvent, type ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { Doodle } from '@/ui/kit';

export interface StoryPage {
  key: string;
  /** null = tidak maju sendiri (mis. halaman akhir). */
  duration: number | null;
  /** Warna latar (CSS, mis. 'var(--sticky-yellow)'). */
  tint: string;
  /** Halaman yang penuh tombol: ketukan tidak dipakai untuk berpindah. */
  interactive?: boolean;
  render: (state: { playing: boolean; duration: number; go: (delta: number) => void }) => ReactNode;
}

const INTERACTIVE = 'a,button,input,textarea,select,label,[data-no-tap]';

export function StoryPlayer({ pages, slow, onClose, startAt = 0 }: { pages: StoryPage[]; slow?: boolean; onClose: () => void; startAt?: number }) {
  const count = pages.length;
  const [index, setIndex] = useState(Math.max(0, Math.min(startAt, count - 1)));
  const [paused, setPaused] = useState(false);
  const [hidden, setHidden] = useState(false);
  const hold = useRef<{ timer: number | null; held: boolean; skip: boolean }>({ timer: null, held: false, skip: false });
  const page = pages[Math.min(index, count - 1)]!;
  const playing = !paused && !hidden;

  const go = useCallback((delta: number) => setIndex((i) => Math.max(0, Math.min(count - 1, i + delta))), [count]);

  // Layar di belakang tidak ikut menggulung.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  // Tab disembunyikan: cerita ikut menunggu.
  useEffect(() => {
    const on = () => setHidden(document.visibilityState === 'hidden');
    document.addEventListener('visibilitychange', on);
    return () => document.removeEventListener('visibilitychange', on);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement | null)?.closest?.('input,textarea')) return;
      if (e.key === 'ArrowRight') go(1);
      else if (e.key === 'ArrowLeft') go(-1);
      else if (e.key === ' ' && !page.interactive) {
        e.preventDefault();
        setPaused((p) => !p);
      } else if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go, onClose, page.interactive]);

  const clearHold = () => {
    if (hold.current.timer) window.clearTimeout(hold.current.timer);
    hold.current.timer = null;
  };

  const onDown = (e: PointerEvent<HTMLDivElement>) => {
    hold.current.skip = !!(e.target as HTMLElement).closest(INTERACTIVE) || e.button !== 0;
    if (hold.current.skip) return;
    hold.current.held = false;
    clearHold();
    hold.current.timer = window.setTimeout(() => {
      hold.current.held = true;
      setPaused(true);
    }, 220);
  };

  const onUp = (e: PointerEvent<HTMLDivElement>) => {
    clearHold();
    if (hold.current.skip) return;
    if (hold.current.held) {
      hold.current.held = false;
      setPaused(false);
      return;
    }
    const r = e.currentTarget.getBoundingClientRect();
    if (e.clientX - r.left < r.width * 0.32) go(-1);
    else go(1);
  };

  const onCancel = () => {
    clearHold();
    if (hold.current.held) {
      hold.current.held = false;
      setPaused(false);
    }
  };

  const body = <div key={page.key} className={`story-page${slow ? ' slow' : ''}`}>{page.render({ playing, duration: page.duration ?? 0, go })}</div>;

  return (
    <div className={`story${playing ? '' : ' paused'}`} role="dialog" aria-modal aria-label="cerita" data-testid="story">
      {index > 0 ? (
        <button className="story-side prev" aria-label="kartu sebelumnya" onClick={() => go(-1)}>
          <Doodle id="ui-kembali" size={26} color="currentColor" />
        </button>
      ) : null}
      <div className="story-frame" style={{ '--story-tint': page.tint } as CSSProperties}>
        <span id="story-hint" hidden>
          ketuk kanan untuk lanjut, kiri untuk kembali, tahan untuk berhenti sejenak
        </span>
        <div className="story-top">
          <div className="story-bars" aria-hidden>
            {pages.map((p, i) => (
              <span key={p.key} className={`story-bar${i < index ? ' done' : i === index ? (p.duration ? ' now' : ' done') : ''}`}>
                <i
                  key={i === index ? `now-${index}` : 'idle'}
                  style={i === index && p.duration ? ({ '--d': `${p.duration}ms` } as CSSProperties) : undefined}
                  onAnimationEnd={i === index ? () => go(1) : undefined}
                />
              </span>
            ))}
          </div>
          <div className="row between" style={{ marginTop: 2 }}>
            <span className="row gap-sm tiny ink" style={{ paddingLeft: 6, opacity: paused ? 1 : 0, transition: 'opacity .2s' }} aria-live="polite">
              <Doodle id="ui-jam" size={16} />
              berhenti sejenak
            </span>
            <button className="icon-btn" aria-label="tutup" onClick={onClose} data-testid="story-close">
              <Doodle id="ui-tutup" size={22} />
            </button>
          </div>
        </div>
        {page.interactive ? (
          <div className="story-body interactive">{body}</div>
        ) : (
          <div
            className="story-body"
            data-testid="story-tap"
            onPointerDown={onDown}
            onPointerUp={onUp}
            onPointerCancel={onCancel}
            onPointerLeave={onCancel}
            onContextMenu={(e) => e.preventDefault()}
            aria-describedby="story-hint">
            {body}
          </div>
        )}
      </div>
      {index < count - 1 ? (
        <button className="story-side next" aria-label="kartu berikutnya" onClick={() => go(1)}>
          <Doodle id="ui-panah-kanan" size={26} color="currentColor" />
        </button>
      ) : null}
    </div>
  );
}
