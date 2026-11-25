/** Ilustrasi besar dan pemilih kota. (QR ada di ./qr — pustakanya hanya dimuat halaman yang memakainya.) */
import { type City, searchCities, getCity } from '@sehari/core';
import { getScene } from '@sehari/doodles';
import { type CSSProperties, memo, useMemo, useState } from 'react';

/** Ilustrasi doodle besar yang menggambar dirinya sendiri, lapis demi lapis. */
export const Scene = memo(function Scene({ id, width = '100%', draw = true, speed = 1, sw = 2, style, className }: { id: string; width?: number | string; draw?: boolean; speed?: number; sw?: number; style?: CSSProperties; className?: string }) {
  const s = getScene(id);
  const delays = useMemo(() => {
    if (!s) return [];
    const map = new Map<string, number>();
    for (const l of s.layers ?? []) for (const d of l.strokes) if (!map.has(d)) map.set(d, l.delay);
    // Garis tanpa lapisan menyusul berurutan.
    let t = 0;
    return s.strokes.map((d, i) => {
      const base = map.get(d);
      if (base !== undefined) return base / 1000 / speed + (i % 12) * 0.035;
      t += 0.02;
      return t / speed;
    });
  }, [s, speed]);
  if (!s) return null;
  return (
    <svg viewBox={s.viewBox} width={width} className={[draw ? 'draw' : '', className].filter(Boolean).join(' ')} style={{ color: 'var(--ink)', overflow: 'visible', display: 'block', height: 'auto', ...style }} role="img" aria-label={s.name}>
      {s.strokes.map((d, i) => (
        <path key={i} d={d} pathLength={1} stroke="currentColor" strokeWidth={sw} fill="none" strokeLinecap="round" strokeLinejoin="round" style={draw ? { animationDelay: `${delays[i]}s`, animationDuration: `${0.9 / speed}s` } : undefined} />
      ))}
      {s.fills?.map((d, i) => <path key={`f${i}`} d={d} fill="currentColor" className={draw ? 'fade' : undefined} style={draw ? { animationDelay: `${(delays[delays.length - 1] ?? 0) + 0.2}s` } : undefined} />)}
    </svg>
  );
});

export function CityPicker({ value, onChange }: { value: string | null; onChange: (c: City) => void }) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(!value);
  const current = getCity(value);
  const list = useMemo(() => searchCities(q, 8), [q]);
  if (!open && current)
    return (
      <button className="field row between" style={{ textAlign: 'left' }} onClick={() => setOpen(true)}>
        <span>{current.name}{current.province ? `, ${current.province}` : ''}</span>
        <span className="tiny ink">ganti</span>
      </button>
    );
  return (
    <div className="col gap-sm">
      <input className="field" placeholder="Cari kota…" value={q} onChange={(e) => setQ(e.target.value)} autoComplete="off" />
      <div className="col" style={{ gap: 2 }}>
        {list.map((c) => (
          <button key={c.id} className="row between" style={{ background: c.id === value ? 'var(--pill)' : 'none', border: 0, padding: '9px 12px', borderRadius: 10, textAlign: 'left' }} onClick={() => { onChange(c); setOpen(false); setQ(''); }}>
            <span>{c.name}</span>
            <span className="tiny soft">{c.province ?? c.country}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
