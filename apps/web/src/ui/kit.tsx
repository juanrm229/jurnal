import { type FlameLevel, MOOD_CODES, MOODS, type MoodCode } from '@sehari/core';
import { getDoodle } from '@sehari/doodles';
import { type CSSProperties, type ReactNode, createContext, memo, useCallback, useContext, useEffect, useState } from 'react';
import { API_URL } from '@/lib/api';
import { back } from '@/lib/router';
import { sound, useSoundPrefs } from '@/lib/sound';

// ── Doodle ──────────────────────────────────────────────────────────────────

/** Doodle tinta tangan; warnanya mengikuti `color` CSS (bawaan: var(--ink)). */
export const Doodle = memo(function Doodle({
  id,
  size = 32,
  color,
  sw = 2.4,
  className,
  style,
  draw,
  title,
}: {
  id: string;
  size?: number | string;
  color?: string;
  sw?: number;
  className?: string;
  style?: CSSProperties;
  /** Animasi menggambar sendiri. */
  draw?: boolean | number;
  title?: string;
}) {
  const d = getDoodle(id);
  const delay = typeof draw === 'number' ? draw : 0;
  return (
    <svg
      width={size}
      height={size}
      viewBox={d.viewBox}
      className={[draw ? 'draw' : '', className].filter(Boolean).join(' ')}
      style={{ color: color ?? 'var(--ink)', flexShrink: 0, overflow: 'visible', ...style }}
      role="img"
      aria-label={title ?? d.name}>
      {d.strokes.map((p, i) => (
        <path
          key={i}
          d={p}
          pathLength={1}
          stroke="currentColor"
          strokeWidth={sw}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={draw ? { animationDelay: `${delay + i * 0.06}s` } : undefined}
        />
      ))}
      {d.fills?.map((p, i) => <path key={`f${i}`} d={p} fill="currentColor" />)}
    </svg>
  );
});

// ── Tata letak ──────────────────────────────────────────────────────────────

export function Screen({ children, wide, className }: { children: ReactNode; wide?: boolean; className?: string }) {
  return <main className={['screen', wide ? 'wide' : '', className].filter(Boolean).join(' ')}>{children}</main>;
}

export function Header({ title, sub, right, backTo }: { title?: ReactNode; sub?: ReactNode; right?: ReactNode; backTo?: string }) {
  return (
    <header className="row between" style={{ minHeight: 52, marginBottom: 8 }}>
      <button className="icon-btn" aria-label="kembali" onClick={() => back(backTo)}>
        <Doodle id="ui-kembali" size={24} />
      </button>
      <div className="grow center">
        {title ? <div className="h2" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</div> : null}
        {sub ? <div className="tiny ink-soft">{sub}</div> : null}
      </div>
      <div style={{ minWidth: 40, display: 'flex', justifyContent: 'flex-end' }}>{right}</div>
    </header>
  );
}

export function Section({ title, right, children }: { title: string; right?: ReactNode; children: ReactNode }) {
  return (
    <section className="section">
      <div className="row between" style={{ marginBottom: 8 }}>
        <span className="label">{title}</span>
        {right}
      </div>
      {children}
    </section>
  );
}

export function Empty({ doodle = 'tunas', title, body, action }: { doodle?: string; title: string; body?: string; action?: ReactNode }) {
  return (
    <div className="col center" style={{ alignItems: 'center', padding: '28px 8px', gap: 10 }}>
      <Doodle id={doodle} size={72} draw />
      <div className="h2">{title}</div>
      {body ? <div className="small soft" style={{ maxWidth: 360 }}>{body}</div> : null}
      {action}
    </div>
  );
}

export function Growing({ label = 'menyiram…' }: { label?: string }) {
  return (
    <div className="col" style={{ alignItems: 'center', padding: 40, gap: 8 }}>
      <Doodle id="tunas" size={48} className="breathe" />
      <span className="small ink-soft">{label}</span>
    </div>
  );
}

export function ErrorNote({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  return (
    <div className="card col" style={{ alignItems: 'center', textAlign: 'center' }}>
      <Doodle id="awan" size={40} />
      <span className="small">{error instanceof Error ? error.message : 'Ada yang salah.'}</span>
      {onRetry ? <button className="btn ghost sm auto" onClick={onRetry}>coba lagi</button> : null}
    </div>
  );
}

export function Toggle({ label, hint, value, onChange }: { label: string; hint?: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="row between" style={{ padding: '10px 0', alignItems: 'flex-start', cursor: 'pointer' }}>
      <span className="grow">
        <span>{label}</span>
        {hint ? <span className="tiny soft" style={{ display: 'block' }}>{hint}</span> : null}
      </span>
      <button type="button" role="switch" aria-checked={value} className="switch" onClick={() => onChange(!value)} />
    </label>
  );
}

export function ListLink({ icon, title, sub, onClick, right }: { icon?: string; title: string; sub?: string; onClick?: () => void; right?: ReactNode }) {
  return (
    <button onClick={onClick} className="row" style={{ width: '100%', background: 'none', border: 0, padding: '12px 0', textAlign: 'left', gap: 14 }}>
      {icon ? <Doodle id={icon} size={28} /> : null}
      <span className="grow">
        <span style={{ display: 'block' }}>{title}</span>
        {sub ? <span className="tiny soft">{sub}</span> : null}
      </span>
      {right ?? <Doodle id="ui-panah-kanan" size={16} style={{ opacity: 0.6 }} />}
    </button>
  );
}

// ── Sheet & toast ───────────────────────────────────────────────────────────

export function Sheet({ open, onClose, children, title }: { open: boolean; onClose: () => void; children: ReactNode; title?: string }) {
  useEffect(() => {
    if (!open) return;
    sound.play('open');
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', k);
    return () => {
      window.removeEventListener('keydown', k);
      sound.play('close');
    };
  }, [open]);
  if (!open) return null;
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal onClick={(e) => e.stopPropagation()}>
        <div className="row between" style={{ marginBottom: 10 }}>
          <span className="h2">{title}</span>
          <button className="icon-btn" aria-label="tutup" onClick={onClose}>
            <Doodle id="ui-tutup" size={22} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

const ToastCtx = createContext<(msg: string) => void>(() => {});
export const useToast = () => useContext(ToastCtx);

export function ToastHost({ children }: { children: ReactNode }) {
  const [msg, setMsg] = useState<string | null>(null);
  const show = useCallback((m: string) => {
    setMsg(m);
    window.setTimeout(() => setMsg((x) => (x === m ? null : x)), 2600);
  }, []);
  return (
    <ToastCtx.Provider value={show}>
      {children}
      {msg ? <div className="toast" role="status">{msg}</div> : null}
    </ToastCtx.Provider>
  );
}

// ── Kecil-kecil ─────────────────────────────────────────────────────────────

export const AVATAR_BG = ['kertas', 'kuning', 'persik', 'hijau', 'biru', 'tinta'] as const;
const BG: Record<string, string> = {
  kertas: 'var(--card)',
  kuning: 'var(--sticky-yellow)',
  persik: 'var(--sticky-peach)',
  hijau: 'var(--sticky-green)',
  biru: 'var(--sticky-blue)',
  tinta: 'var(--ink)',
};

/** "tunas", "tunas|persik" (doodle + warna latar), atau "foto:<id>" (foto sendiri). */
export function parseAvatar(v: string | null | undefined): { photo?: string; doodle: string; bg: string } {
  if (v?.startsWith('foto:')) return { photo: `${API_URL}/v1/avatars/${v.slice(5)}`, doodle: 'tunas', bg: 'kertas' };
  const [doodle, bg] = (v || 'tunas').split('|');
  return { doodle: doodle || 'tunas', bg: bg && BG[bg] ? bg : 'kertas' };
}

export function Avatar({ doodle, size = 36, sealed, dim, title }: { doodle: string; size?: number; sealed?: boolean; dim?: boolean; title?: string }) {
  const a = parseAvatar(doodle);
  const ring = sealed ? 'var(--ink)' : 'color-mix(in srgb, var(--ink) 35%, transparent)';
  return (
    <span
      title={title}
      className="avatar"
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: a.photo ? 'var(--card)' : BG[a.bg],
        boxShadow: `0 0 0 ${size > 40 ? 2.5 : 1.5}px ${ring}${sealed ? ', 0 0 0 4px var(--paper), 0 0 0 5.5px color-mix(in srgb, var(--ink) 40%, transparent)' : ''}`,
        opacity: dim ? 0.5 : 1,
        flexShrink: 0,
        overflow: 'hidden',
      }}>
      {a.photo ? <img src={a.photo} alt="" width={size} height={size} style={{ objectFit: 'cover', width: '100%', height: '100%' }} /> : <Doodle id={a.doodle} size={size * 0.68} color={a.bg === 'tinta' ? 'var(--on-ink)' : undefined} />}
    </span>
  );
}

export function Flame({ level, days, size = 26 }: { level: FlameLevel; days: number; size?: number }) {
  const icon = level === 'fog' ? 'kabut' : level === 'ember' || level === 'dim' ? 'ui-api-redup' : 'ui-api';
  return (
    <span className="row gap-sm" title={`api ${days} hari`}>
      <Doodle id={icon} size={size} color={level === 'fog' ? 'var(--fog)' : undefined} className={level === 'bright' ? 'breathe' : undefined} />
      <span className={level === 'fog' ? 'soft h2' : 'h2'}>{days}</span>
    </span>
  );
}

export function MoodDot({ mood, size = 14 }: { mood: MoodCode; size?: number }) {
  return <span title={MOODS[mood]?.label} style={{ width: size, height: size, borderRadius: '50%', background: MOODS[mood]?.color, display: 'inline-block', flexShrink: 0 }} />;
}

export function MoodPicker({ value, onChange, compact }: { value?: MoodCode; onChange: (m: MoodCode) => void; compact?: boolean }) {
  return (
    <div className="row wrap" style={{ gap: compact ? 8 : 12 }}>
      {MOOD_CODES.map((m) => (
        <button
          key={m}
          aria-label={MOODS[m].label}
          aria-pressed={value === m}
          onClick={() => onChange(m)}
          style={{ background: 'none', border: 0, padding: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          <span
            style={{
              width: compact ? 30 : 40,
              height: compact ? 30 : 40,
              borderRadius: '50%',
              background: MOODS[m].color,
              outline: value === m ? '3px solid var(--ink)' : 'none',
              outlineOffset: 2,
              transition: 'transform .15s',
              transform: value === m ? 'scale(1.08)' : 'none',
            }}
          />
          {!compact ? <span className="tiny soft">{MOODS[m].label}</span> : null}
        </button>
      ))}
    </div>
  );
}

export function Sticky({ children, color = 'yellow', tilt = 0, style, onClick }: { children: ReactNode; color?: 'yellow' | 'peach' | 'green' | 'blue'; tilt?: number; style?: CSSProperties; onClick?: () => void }) {
  return (
    <div className="sticky" onClick={onClick} style={{ background: `var(--sticky-${color})`, transform: `rotate(${tilt}deg)`, cursor: onClick ? 'pointer' : undefined, ...style }}>
      <span style={{ position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)', color: 'var(--text)' }}>
        <Doodle id="pin-papan" size={26} color="currentColor" />
      </span>
      {children}
    </div>
  );
}

/** Tombol kecil musik latar: nyala/mati. */
export function MusicToggle({ className = 'icon-btn' }: { className?: string }) {
  const p = useSoundPrefs();
  return (
    <button type="button" className={`${className} music-toggle ${p.music ? 'on' : ''}`} data-sound="soft" aria-pressed={p.music} aria-label={p.music ? 'matikan musik' : 'nyalakan musik'} title={p.music ? 'musik: nyala' : 'musik: mati'} onClick={() => sound.set({ music: !p.music })}>
      <Doodle id="not-balok" size={22} color="currentColor" />
      {p.music ? (
        <span className="eq" aria-hidden>
          <i />
          <i />
          <i />
        </span>
      ) : (
        <span className="slash" aria-hidden />
      )}
    </button>
  );
}

/** Hujan kelopak & bintang kecil sekali saja (mis. setelah menyegel). */
export function Confetti({ count = 22 }: { count?: number }) {
  const [pieces] = useState(() =>
    Array.from({ length: count }, (_, i) => ({
      id: ['kilau', 'bintang-kecil', 'hati-kecil', 'bunga-kecil', 'daun-kering', 'bintang'][i % 6]!,
      x: (Math.random() - 0.5) * 360,
      y: -(120 + Math.random() * 260),
      r: (Math.random() - 0.5) * 540,
      d: Math.random() * 0.25,
      s: 14 + Math.random() * 16,
    })),
  );
  return (
    <div className="confetti" aria-hidden>
      {pieces.map((p, i) => (
        <span key={i} style={{ '--x': `${p.x}px`, '--y': `${p.y}px`, '--r': `${p.r}deg`, animationDelay: `${p.d}s` } as CSSProperties}>
          <Doodle id={p.id} size={p.s} />
        </span>
      ))}
    </div>
  );
}
