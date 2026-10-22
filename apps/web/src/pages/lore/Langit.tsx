/**
 * Langit Lingkaran: setiap hari yang tersegel bersama menjadi bintang. Hari-hari
 * penting dihubungkan jadi rasi dan diberi nama ("Rasi Pindahan Kos").
 * Kanvasnya selalu malam, bahkan di tema terang.
 */
import { type ConstellationWire, dayOfYear, daysInYear, eachDay, formatDayLong, monthName } from '@sehari/core';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { api } from '@/lib/api';
import { openCircleText, sealCircleText, useCalendar, useCircle, useMe, useToday } from '@/lib/data';
import { navigate, useParams } from '@/lib/router';
import { Doodle, ErrorNote, Growing, Header, Screen, Section } from '@/ui/kit';
import { Btn, calendarMap, coverFor, ErrLine, errorText, nameIn, unit, YearSwitch } from './board';

interface Star {
  day: string;
  x: number;
  y: number;
  r: number;
  bright: boolean;
}

/** Spiral dua setengah putaran dari tengah ke tepi, dengan sedikit getaran per hari. */
function placeStar(circleId: string, day: string, size: number, offset = 0): { x: number; y: number } {
  const year = Number(day.slice(0, 4));
  const t = (dayOfYear(day) - 0.5) / daysInYear(year);
  const turns = 2.6;
  const angle = t * Math.PI * 2 * turns - Math.PI / 2;
  const rMax = size * 0.44;
  const rMin = size * 0.07;
  const jitter = offset === 0;
  const jr = jitter ? (unit(`${circleId}:${day}:r`) - 0.5) * size * 0.05 : 0;
  const ja = jitter ? (unit(`${circleId}:${day}:a`) - 0.5) * 0.1 : 0;
  const rad = rMin + (rMax - rMin) * Math.sqrt(t) + jr + offset;
  return { x: size / 2 + Math.cos(angle + ja) * rad, y: size / 2 + Math.sin(angle + ja) * rad };
}

/** Kanvas langit memakai satuan tetap; SVG diskalakan mengikuti lebar layar. */
const SIZE = 400;

export default function Langit() {
  const { id } = useParams<{ id: string }>();
  const me = useMe();
  const today = useToday();
  const qc = useQueryClient();
  const circle = useCircle(id);
  const thisYear = Number(today.slice(0, 4));
  const [year, setYear] = useState(thisYear);
  const cal = useCalendar(id, `${year}-01-01`, `${year}-12-31`);
  const cons = useQuery({ queryKey: ['constellations', id], queryFn: () => api.get<ConstellationWire[]>(`/circles/${id}/constellations`), enabled: !!circle });
  const [building, setBuilding] = useState(false);
  const [sel, setSel] = useState<string[]>([]);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [hover, setHover] = useState<string | null>(null);

  const stars = useMemo<Star[]>(() => {
    if (!circle) return [];
    const map = calendarMap(cal.data);
    const out: Star[] = [];
    for (const day of eachDay(`${year}-01-01`, `${year}-12-31`)) {
      if (day > today) break;
      const cv = coverFor(circle, day, map.get(day));
      if (!cv.together && cv.sealed === 0) continue;
      const p = placeStar(circle.id, day, SIZE);
      out.push({ day, ...p, r: cv.together ? 1.5 + cv.fraction * 0.9 + unit(`${day}:s`) * 0.9 : 0.9, bright: cv.together });
    }
    return out;
  }, [circle, cal.data, year, today]);

  // Debu bintang yang tidak berarti apa-apa, hanya supaya langitnya tidak kosong.
  const dust = useMemo(() => {
    if (!circle) return [];
    return Array.from({ length: 90 }, (_, i) => ({ x: unit(`${circle.id}:dx${i}`) * SIZE, y: unit(`${circle.id}:dy${i}`) * SIZE, r: 0.4 + unit(`${circle.id}:dr${i}`) * 0.7, d: unit(`${circle.id}:dt${i}`) * 6 }));
  }, [circle?.id]);

  const named = useMemo(() => (cons.data ?? []).map((c) => ({ ...c, name: circle ? openCircleText(circle, c.nameEnc, 'rasi tanpa nama') : '…' })), [cons.data, circle]);

  if (!circle)
    return (
      <Screen>
        <Header title="langit lingkaran" backTo={`/l/${id}`} />
        <Growing />
      </Screen>
    );
  const minYear = Number(circle.createdDay.slice(0, 4));
  const bright = stars.filter((s) => s.bright);
  const byDay = new Map(stars.map((s) => [s.day, s]));
  const inYear = named.filter((c) => c.days.filter((d) => byDay.has(d) || d.startsWith(`${year}-`)).length >= 2);

  const toggle = (day: string) => {
    setErr(null);
    setSel((s) => (s.includes(day) ? s.filter((d) => d !== day) : s.length >= 60 ? s : [...s, day].sort()));
  };

  const save = async () => {
    if (sel.length < 2 || !name.trim()) return;
    setBusy(true);
    setErr(null);
    try {
      await api.post(`/circles/${id}/constellations`, { nameEnc: sealCircleText(circle, name.trim()), days: sel });
      setSel([]);
      setName('');
      setBuilding(false);
      await qc.invalidateQueries({ queryKey: ['constellations', id] });
    } catch (e) {
      setErr(errorText(e));
    } finally {
      setBusy(false);
    }
  };

  const remove = async (cid: string) => {
    try {
      await api.del(`/circles/${id}/constellations/${cid}`);
      await qc.invalidateQueries({ queryKey: ['constellations', id] });
    } catch (e) {
      setErr(errorText(e));
    }
  };

  const starAt = (d: string) => byDay.get(d) ?? { day: d, ...placeStar(circle.id, d, SIZE), r: 1, bright: false };
  const hovered = hover ? byDay.get(hover) : undefined;

  return (
    <Screen>
      <Header title="langit lingkaran" sub={circle.name} backTo={`/l/${id}`} />
      <YearSwitch
        year={year}
        min={minYear}
        max={thisYear}
        onChange={(y) => {
          setYear(y);
          setSel([]);
        }}
      />
      <p className="small soft center" style={{ margin: '2px 0 16px' }}>
        {bright.length ? (
          <>
            <span className="ink">{bright.length}</span> bintang dari hari yang disegel bersama
          </>
        ) : (
          'langit tahun ini masih menunggu bintang pertamanya'
        )}
      </p>

      <div className={`lore-sky ${building ? 'building' : ''}`}>
        {!cal.isLoading ? (
          <>
            <svg viewBox={`0 0 ${SIZE} ${SIZE}`} width="100%" height="100%" style={{ position: 'absolute', inset: 0, display: 'block' }} aria-hidden>
              {dust.map((d, i) => (
                <circle key={i} cx={d.x} cy={d.y} r={d.r} fill="var(--night-label)" className="lore-twinkle" style={{ animationDelay: `${d.d}s` }} />
              ))}
              {/* Penanda bulan di jalur spiral. */}
              {Array.from({ length: 12 }, (_, m) => {
                const p = placeStar('label', `${year}-${String(m + 1).padStart(2, '0')}-08`, SIZE, SIZE * 0.045);
                return (
                  <text key={m} x={p.x} y={p.y} fill="var(--night-label)" opacity={0.5} fontSize={9} fontFamily="var(--mono)" textAnchor="middle">
                    {monthName(m + 1, true).toLowerCase()}
                  </text>
                );
              })}
              {inYear.map((c) => {
                const pts = c.days.map(starAt).filter((p) => p.day.startsWith(`${year}-`));
                if (pts.length < 2) return null;
                const cx = pts.reduce((a, p) => a + p.x, 0) / pts.length;
                const cy = Math.min(...pts.map((p) => p.y)) - 10;
                return (
                  <g key={c.id}>
                    <polyline points={pts.map((p) => `${p.x},${p.y}`).join(' ')} pathLength={1} className="lore-rasi-line" stroke="var(--night-line)" strokeWidth={1.1} fill="none" opacity={0.85} />
                    <text x={cx} y={Math.max(12, cy)} fill="var(--night-star)" fontSize={17} fontFamily="var(--hand)" textAnchor="middle" className="fade" style={{ animationDelay: '0.9s' }}>
                      {c.name}
                    </text>
                  </g>
                );
              })}
              {sel.length > 1 ? <polyline points={sel.map(starAt).map((p) => `${p.x},${p.y}`).join(' ')} stroke="var(--night-sel)" strokeWidth={1.2} strokeDasharray="3 4" fill="none" /> : null}
              {stars
                .filter((s) => s.bright)
                .map((s) => (
                  <circle key={`g${s.day}`} cx={s.x} cy={s.y} r={s.r * 2.6} fill="var(--night-soft)" opacity={0.14} />
                ))}
              {stars.map((s, i) => (
                <circle key={s.day} cx={s.x} cy={s.y} r={s.r} fill={s.bright ? 'var(--night-star)' : 'var(--night-soft)'} opacity={s.bright ? 1 : 0.6} className="lore-star" style={{ animationDelay: `${Math.min(2, i * 0.008)}s` }} />
              ))}
              {sel.map((d) => {
                const p = starAt(d);
                return <circle key={`s${d}`} cx={p.x} cy={p.y} r={7} stroke="var(--night-sel)" strokeWidth={1.5} fill="none" />;
              })}
              {year === thisYear
                ? (() => {
                    const p = placeStar(circle.id, today, SIZE);
                    return <circle cx={p.x} cy={p.y} r={5} stroke="var(--night-label)" strokeWidth={1} strokeDasharray="2 2" fill="none" className="breathe" style={{ transformOrigin: `${p.x}px ${p.y}px` }} />;
                  })()
                : null}
            </svg>
            {bright.map((s) => (
              <button
                key={s.day}
                className="lore-star-hit"
                aria-label={`bintang ${formatDayLong(s.day)}`}
                title={formatDayLong(s.day)}
                onMouseEnter={() => setHover(s.day)}
                onMouseLeave={() => setHover((h) => (h === s.day ? null : h))}
                onClick={() => (building ? toggle(s.day) : navigate(`/l/${id}/hari/${s.day}`))}
                style={{ left: `${(s.x / SIZE) * 100}%`, top: `${(s.y / SIZE) * 100}%` }}
              />
            ))}
            {hovered ? (
              <span className="lore-star-tip" style={{ left: `${(hovered.x / SIZE) * 100}%`, top: `${(hovered.y / SIZE) * 100}%` }}>
                {formatDayLong(hovered.day)}
              </span>
            ) : null}
            {bright.length === 0 ? (
              <div className="lore-sky-empty">
                <Doodle id="bulan" size={44} color="var(--night-soft)" draw />
                <span className="tiny center">setiap hari yang kalian segel bersama akan menyala di sini</span>
              </div>
            ) : null}
          </>
        ) : (
          <div className="lore-sky-empty mid">
            <Doodle id="bulan" size={36} color="var(--night-soft)" className="breathe" />
            <span className="tiny">menunggu malam…</span>
          </div>
        )}
      </div>
      {cal.error ? <ErrorNote error={cal.error} onRetry={() => void cal.refetch()} /> : null}

      <div style={{ height: 16 }} />
      {building ? (
        <div className="card col rise">
          <div className="row">
            <Doodle id="ui-bintang-rasi" size={30} draw />
            <span className="h2">buat rasi</span>
          </div>
          <p className="small soft" style={{ margin: 0 }}>Ketuk bintang-bintang yang ingin dihubungkan (2 sampai 60 hari), lalu beri nama.</p>
          <p className="small ink" style={{ margin: 0 }}>{sel.length ? `${sel.length} bintang dipilih` : 'belum ada bintang dipilih'}</p>
          {sel.length ? (
            <div className="row wrap" style={{ gap: 6 }}>
              {sel.map((d) => (
                <button key={d} className="pill" onClick={() => toggle(d)}>
                  {formatDayLong(d, false)} ×
                </button>
              ))}
            </div>
          ) : null}
          <input className="field hand" style={{ fontSize: 24, padding: '8px 14px' }} value={name} onChange={(e) => setName(e.target.value)} placeholder="misalnya: Rasi Pindahan Kos" maxLength={60} />
          <ErrLine>{err}</ErrLine>
          <Btn disabled={sel.length < 2 || !name.trim()} loading={busy} onClick={() => void save()}>
            simpan rasi
          </Btn>
          <Btn
            kind="ghost"
            className="sm"
            onClick={() => {
              setBuilding(false);
              setSel([]);
            }}>
            batal
          </Btn>
        </div>
      ) : (
        <Btn kind={bright.length >= 2 ? undefined : 'soft'} icon="ui-bintang-rasi" disabled={bright.length < 2} onClick={() => setBuilding(true)}>
          buat rasi
        </Btn>
      )}
      {!building && bright.length < 2 ? <p className="tiny soft center" style={{ marginTop: 6 }}>rasi butuh minimal dua bintang. pelan-pelan saja, langitnya tidak ke mana-mana.</p> : null}
      {!building ? <ErrLine center>{err}</ErrLine> : null}

      <Section title="rasi kalian">
        {cons.isLoading ? (
          <Growing />
        ) : named.length === 0 ? (
          <div className="card flat col center" style={{ alignItems: 'center' }}>
            <Doodle id="ui-bintang-rasi" size={44} draw />
            <p className="small soft center" style={{ margin: 0 }}>Belum ada rasi. Hubungkan hari-hari penting: pindahan, perjalanan, atau malam bertengkar lalu baikan.</p>
          </div>
        ) : (
          <div className="col" style={{ gap: 8 }}>
            {named.map((c) => (
              <div key={c.id} className="card row" style={{ padding: '12px 16px' }}>
                <Doodle id="ui-bintang-rasi" size={28} />
                <div className="grow">
                  <div className="hand" style={{ fontSize: 26 }}>{c.name}</div>
                  <div className="tiny soft">
                    {c.days.length} bintang · {formatDayLong(c.days[0]!, false)} – {formatDayLong(c.days[c.days.length - 1]!)} · dari {nameIn(circle, c.createdBy, me.user.id)}
                  </div>
                </div>
                {c.createdBy === me.user.id ? (
                  <button className="icon-btn" aria-label="hapus rasi" onClick={() => void remove(c.id)}>
                    <Doodle id="ui-hapus" size={20} />
                  </button>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </Section>
    </Screen>
  );
}
