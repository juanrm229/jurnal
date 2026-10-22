/**
 * Stiker scrapbook: doodle dengan tepi putih seperti stiker vinyl dan isi
 * warna pastel, plus hiasan khusus — selotip washi, cap pos, dan label.
 */
import { formatDayLong, getCity } from '@sehari/core';
import { getDoodle } from '@sehari/doodles';
import { type CSSProperties, memo } from 'react';

/** Isi pastel (bisa diganti dari bilah elemen). */
export const FILLS = ['#FDE68A', '#FBCFE8', '#BFDBFE', '#BBF7D0', '#FED7AA', '#DDD6FE', '#FFFFFF', 'none'] as const;
/** Warna garis stiker; 'var(--ink)' mengikuti tema. */
export const LINES = ['var(--ink)', '#16161A', '#C2410C', '#BE185D', '#15803D', '#0369A1', '#7C3AED'] as const;

export const WASHI = ['washi:garis', 'washi:titik', 'washi:kotak', 'washi:polos', 'washi:bunga', 'washi:zigzag'] as const;
export const SPECIAL = [...WASHI, 'cap:pos', 'cap:tanggal', 'label:kertas'] as const;

export const isSpecial = (id?: string) => !!id && /^(washi|cap|label):/.test(id);
export const specialWidth = (id: string) => (id.startsWith('washi:') ? 380 : id.startsWith('cap:') ? 220 : 320);

const WASHI_BG: Record<string, (c: string) => string> = {
  garis: (c) => `repeating-linear-gradient(-45deg, ${c} 0 10px, color-mix(in srgb, ${c} 45%, #fff) 10px 20px)`,
  titik: (c) => `radial-gradient(circle at 6px 6px, color-mix(in srgb, ${c} 55%, #000 0%) 2.6px, transparent 3px) 0 0/14px 14px, ${c}`,
  kotak: (c) => `linear-gradient(90deg, color-mix(in srgb, ${c} 60%, #fff) 50%, transparent 0) 0 0/16px 16px, linear-gradient(color-mix(in srgb, ${c} 60%, #fff) 50%, transparent 0) 0 0/16px 16px, ${c}`,
  polos: (c) => c,
  bunga: (c) => `radial-gradient(circle at 50% 50%, #fff 2px, transparent 2.5px) 0 0/18px 18px, radial-gradient(circle at 50% 30%, color-mix(in srgb, #fff 70%, ${c}) 3px, transparent 3.5px) 0 0/18px 18px, ${c}`,
  zigzag: (c) => `linear-gradient(135deg, ${c} 25%, transparent 25%) -8px 0/16px 16px, linear-gradient(225deg, ${c} 25%, transparent 25%) -8px 0/16px 16px, linear-gradient(315deg, ${c} 25%, transparent 25%) 0 0/16px 16px, linear-gradient(45deg, ${c} 25%, transparent 25%) 0 0/16px 16px, color-mix(in srgb, ${c} 40%, #fff)`,
};

/** Ujung selotip yang disobek tangan. */
const TORN = 'polygon(0 8%, 3% 0, 6% 10%, 9% 2%, 12% 6%, 88% 4%, 91% 0, 94% 9%, 97% 1%, 100% 7%, 100% 93%, 97% 100%, 94% 91%, 91% 99%, 88% 94%, 12% 96%, 9% 100%, 6% 90%, 3% 98%, 0 92%)';

export const StickerArt = memo(function StickerArt({ id, line, fill, cut = true, day, cityId, scale = 1, style }: { id: string; line?: string; fill?: string; cut?: boolean; day?: string; cityId?: string | null; scale?: number; style?: CSSProperties }) {
  if (id.startsWith('washi:')) {
    const pat = id.slice(6);
    const c = fill && fill !== 'none' ? fill : '#FBCFE8';
    return <div style={{ height: Math.max(14, 64 * scale), width: '100%', background: (WASHI_BG[pat] ?? WASHI_BG.polos!)(c), opacity: 0.82, clipPath: TORN, boxShadow: '0 1px 0 rgba(0,0,0,.05)', mixBlendMode: 'multiply', ...style }} />;
  }
  if (id.startsWith('cap:')) {
    const ink = line ?? 'var(--ink)';
    const now = new Date();
    const d = day ?? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const date = formatDayLong(d).toUpperCase();
    const city = (getCity(cityId)?.name ?? 'SEHARI').toUpperCase().slice(0, 14);
    const top = id === 'cap:pos' ? `POS ${city}` : 'DISEGEL DGN SAYANG';
    return (
      <svg viewBox="0 0 200 200" width="100%" style={{ display: 'block', color: ink, opacity: 0.85, mixBlendMode: 'multiply', ...style }} aria-label="cap">
        <defs>
          <path id={`arc-${id}`} d="M 30 100 A 70 70 0 1 1 170 100" />
          <filter id="cap-rough">
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" result="n" />
            <feDisplacementMap in="SourceGraphic" in2="n" scale="2.4" />
          </filter>
        </defs>
        <g filter="url(#cap-rough)" fill="none" stroke="currentColor">
          <circle cx="100" cy="100" r="92" strokeWidth="5" />
          <circle cx="100" cy="100" r="80" strokeWidth="1.6" />
          {id === 'cap:pos' ? <path d="M 20 100 q 12 -10 24 0 t 24 0 t 24 0 t 24 0 t 24 0 t 24 0 t 24 0" strokeWidth="3" opacity=".5" transform="translate(0 46)" /> : null}
        </g>
        <g filter="url(#cap-rough)" fill="currentColor" style={{ fontFamily: 'var(--mono)', fontWeight: 600 }}>
          <text fontSize="14" letterSpacing="1.5">
            <textPath href={`#arc-${id}`} startOffset="50%" textAnchor="middle">{top}</textPath>
          </text>
          <text x="100" y="108" fontSize={date.length > 14 ? 15 : 18} textAnchor="middle" letterSpacing="0.5">{date}</text>
          {id === 'cap:tanggal' ? <text x="100" y="136" fontSize="12" textAnchor="middle" letterSpacing="3">✦ HARI INI ✦</text> : null}
        </g>
      </svg>
    );
  }
  if (id.startsWith('label:')) {
    return (
      <div style={{ position: 'relative', background: fill && fill !== 'none' ? fill : '#FFF8E1', padding: `${12 * scale}px ${22 * scale}px ${12 * scale}px ${40 * scale}px`, borderRadius: 6 * scale, clipPath: 'polygon(14% 0, 100% 0, 100% 100%, 14% 100%, 0 50%)', boxShadow: '0 2px 6px rgba(0,0,0,.12)', ...style }}>
        <span style={{ position: 'absolute', left: 24 * scale, top: '50%', width: 9 * scale, height: 9 * scale, borderRadius: '50%', background: 'var(--paper)', transform: 'translate(-50%,-50%)', boxShadow: 'inset 0 1px 2px rgba(0,0,0,.25)' }} />
        <span className="hand" style={{ fontSize: Math.max(12, 40 * scale), color: line ?? 'var(--ink)', lineHeight: 1 }}>sehari</span>
      </div>
    );
  }
  const d = getDoodle(id);
  const ink = line ?? 'var(--ink)';
  const f = fill && fill !== 'none' ? fill : undefined;
  return (
    <svg viewBox="-6 -6 76 76" width="100%" style={{ display: 'block', overflow: 'visible', filter: cut ? 'drop-shadow(0 2px 2.5px rgba(0,0,0,.22))' : undefined, ...style }} role="img" aria-label={d.name}>
      {cut ? (
        <g stroke="#fff" strokeWidth={11} strokeLinecap="round" strokeLinejoin="round" fill="#fff">
          {d.strokes.map((p, i) => <path key={i} d={p} />)}
          {d.fills?.map((p, i) => <path key={`f${i}`} d={p} />)}
        </g>
      ) : null}
      {f ? (
        <g fill={f} stroke={f} strokeWidth={3} strokeLinejoin="round">
          {d.strokes.map((p, i) => <path key={i} d={p} />)}
        </g>
      ) : null}
      <g stroke={ink} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" fill="none">
        {d.strokes.map((p, i) => <path key={i} d={p} />)}
      </g>
      {d.fills?.map((p, i) => <path key={`d${i}`} d={p} fill={ink} />)}
    </svg>
  );
});
