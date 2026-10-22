/**
 * Papan Tahun: setahun digambar sebagai jalan berliku 365 petak, seperti ular
 * tangga yang tenang. Petak yang tersegel bersama menumbuhkan tanaman; hari
 * yang terlewat tertutup kabut (tidak pernah merah). Bidak anggota berdiri
 * berdampingan di petak hari ini.
 */
import { circleDayNumber, COPY, dayName, eachDay, formatDayLong, monthName, parseDay, specialTileFor } from '@sehari/core';
import { gardenDoodleFor } from '@sehari/doodles';
import { memo, type ReactNode, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { type CircleView, useCalendar, useCircle, useMe, useToday } from '@/lib/data';
import { navigate, useParams } from '@/lib/router';
import { Avatar, Doodle, ErrorNote, Growing, Header, Screen, Sticky } from '@/ui/kit';
import { calendarMap, coverFor, type DayCover, LoreHero, mix, YearSwitch } from './board';

const SPECIAL: Record<string, { doodle: string; line: string }> = {
  gerbang: { doodle: 'kunci', line: COPY.streak.milestone7.line },
  jembatan: { doodle: 'peta', line: COPY.streak.milestone30.line },
  mercusuar: { doodle: 'lampu', line: COPY.streak.milestone100.line },
  pelabuhan: { doodle: 'kompas', line: COPY.streak.milestone365.line },
};

interface Tile {
  day: string;
  cover: DayCover;
  past: boolean;
  isToday: boolean;
  before: boolean;
  special?: { code: string; name: string; days: number };
}

export default function Papan() {
  const { id } = useParams<{ id: string }>();
  const me = useMe();
  const today = useToday();
  const circle = useCircle(id);
  const thisYear = Number(today.slice(0, 4));
  const [year, setYear] = useState(thisYear);
  const cal = useCalendar(id, `${year}-01-01`, `${year}-12-31`);
  const [picked, setPicked] = useState<Tile | null>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const noteRef = useRef<HTMLDivElement>(null);
  const scrolled = useRef('');

  const tiles = useMemo<Tile[]>(() => {
    if (!circle) return [];
    const map = calendarMap(cal.data);
    // Papan dimulai di hari lingkaran lahir; hari sebelumnya bukan kabut, hanya belum ada.
    const from = circle.createdDay > `${year}-01-01` ? circle.createdDay : `${year}-01-01`;
    if (from > `${year}-12-31`) return [];
    return eachDay(from, `${year}-12-31`).map((day) => {
      const n = circleDayNumber(circle.createdDay, day);
      const sp = n >= 1 ? specialTileFor(n) : undefined;
      return {
        day,
        cover: coverFor(circle, day, map.get(day)),
        past: day < today,
        isToday: day === today,
        before: day < circle.createdDay,
        special: sp ? { code: sp.code, name: sp.name, days: sp.days } : undefined,
      };
    });
  }, [circle, cal.data, year, today]);

  const onTodayY = (y: number) => {
    if (scrolled.current === `${year}`) return;
    scrolled.current = `${year}`;
    window.setTimeout(() => {
      const top = (boardRef.current?.getBoundingClientRect().top ?? 0) + window.scrollY;
      window.scrollTo({ top: Math.max(0, top + y - 260), behavior: 'smooth' });
    }, 300);
  };

  if (!circle)
    return (
      <Screen>
        <Header title="papan tahun" backTo={`/l/${id}`} />
        <Growing />
      </Screen>
    );
  const minYear = Number(circle.createdDay.slice(0, 4));
  const together = tiles.filter((t) => t.cover.together).length;
  const ahead = tiles.filter((t) => !t.past && !t.isToday).length;
  const ageToday = circleDayNumber(circle.createdDay, today);

  const showNote = (t: Tile) => {
    setPicked(t);
    // Catatan muncul di atas papan; bawa pandangan ke sana.
    window.setTimeout(() => noteRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 30);
  };
  const onTile = (t: Tile) => {
    if (t.special || t.isToday) return showNote(t);
    if (t.past && !t.before) navigate(`/l/${id}/hari/${t.day}`);
    else showNote(t);
  };

  return (
    <Screen>
      <Header title="papan tahun" sub={circle.name} backTo={`/l/${id}`} />
      <LoreHero
        doodle="peta-lipat"
        title="jalan setahun kalian"
        sub="satu petak, satu hari. yang tersegel bersama menumbuhkan tanaman kecil."
      />

      <YearSwitch
        year={year}
        min={minYear}
        max={thisYear}
        onChange={(y) => {
          setYear(y);
          setPicked(null);
        }}
      />
      <p className="small soft center" style={{ margin: '2px 0 0' }}>
        <span className="ink">{together}</span> petak terisi bersama
        {year === thisYear ? ` · ${ahead} petak lagi menunggu` : ''}
      </p>
      {year === thisYear && ageToday >= 1 ? (
        <p className="hand center" style={{ fontSize: 22, margin: '2px 0 0', color: 'var(--ink-soft)' }}>
          hari ini petak ke-{ageToday} perjalanan kalian
        </p>
      ) : null}

      <div ref={noteRef} style={{ marginTop: 16 }}>
        {picked ? <TileNote tile={picked} circle={circle} meId={me.user.id} onClose={() => setPicked(null)} onOpen={() => navigate(`/l/${id}/hari/${picked.day}`)} /> : null}
      </div>

      {cal.error ? (
        <ErrorNote error={cal.error} onRetry={() => void cal.refetch()} />
      ) : cal.isLoading ? (
        <Growing label="menggambar papan…" />
      ) : (
        <div ref={boardRef} className="rise">
          {year === minYear && circle.createdDay > `${year}-01-01` ? (
            <div className="row" style={{ justifyContent: 'center', marginBottom: 8, gap: 6 }}>
              <Doodle id="tunas" size={22} draw />
              <span className="tiny ink-soft">jalan dimulai {formatDayLong(circle.createdDay)}, hari lingkaran ini lahir</span>
            </div>
          ) : null}
          <div className="card lore-board-card">
            <Board tiles={tiles} circle={circle} onTile={onTile} onTodayY={onTodayY} />
          </div>
        </div>
      )}

      <Legend />
      <p className="tiny soft center mt">tidak ada yang kalah di papan ini. petak yang berkabut tetap bagian dari jalan.</p>
    </Screen>
  );
}

// ── Papan ───────────────────────────────────────────────────────────────────

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [w, setW] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setW(el.clientWidth));
    ro.observe(el);
    setW(el.clientWidth);
    return () => ro.disconnect();
  }, []);
  return [ref, w] as const;
}

function Board({ tiles, circle, onTile, onTodayY }: { tiles: Tile[]; circle: CircleView; onTile: (t: Tile) => void; onTodayY?: (y: number) => void }) {
  const [ref, w] = useWidth<HTMLDivElement>();
  const cols = w ? Math.max(7, Math.min(14, Math.floor(w / 42))) : 0;
  const cell = cols ? w / cols : 0;
  const rowH = cell * 1.12;
  const rows = cols ? Math.ceil(tiles.length / cols) : 0;

  const pos = (i: number) => {
    const r = Math.floor(i / cols);
    const k = i % cols;
    const col = r % 2 === 0 ? k : cols - 1 - k;
    return { x: col * cell + cell / 2, y: r * rowH + rowH / 2, r };
  };

  const path = useMemo(() => {
    if (!cols) return '';
    let d = '';
    for (let i = 0; i < tiles.length; i++) {
      const p = pos(i);
      if (i === 0) {
        d += `M${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
        continue;
      }
      const q = pos(i - 1);
      if (q.r === p.r) d += ` L${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
      else {
        // Belokan lembut di ujung baris, seperti jalan ular tangga.
        const out = q.r % 2 === 0 ? cell * 0.62 : -cell * 0.62;
        d += ` C${(q.x + out).toFixed(1)} ${q.y.toFixed(1)} ${(p.x + out).toFixed(1)} ${p.y.toFixed(1)} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
      }
    }
    return d;
  }, [cols, cell, rowH, tiles.length]);

  const pawns = circle.active;
  const todayIdx = tiles.findIndex((t) => t.isToday);
  useEffect(() => {
    if (cols && todayIdx >= 0) onTodayY?.(Math.floor(todayIdx / cols) * rowH);
  }, [cols, todayIdx]);

  return (
    <div ref={ref} style={{ position: 'relative', width: '100%', height: rows * rowH || 200 }}>
      {cols ? (
        <>
          <svg width={w} height={rows * rowH} style={{ position: 'absolute', left: 0, top: 0, pointerEvents: 'none', color: 'var(--ink-soft)' }} aria-hidden>
            <path d={path} className="lore-road" stroke="currentColor" strokeWidth={2} strokeDasharray="2 5" strokeLinecap="round" fill="none" opacity={0.7} />
          </svg>
          {tiles.map((t, i) => {
            const p = pos(i);
            return (
              <div key={t.day} style={{ position: 'absolute', left: p.x - cell / 2, top: p.y - rowH / 2, width: cell, height: rowH, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <TileView tile={t} size={cell * 0.78} circleId={circle.id} onPress={onTile} />
                {t.isToday ? (
                  <div className="lore-pawns" style={{ top: -cell * 0.3 }}>
                    {pawns.slice(0, 4).map((m, j) => (
                      <span key={m.userId} style={{ marginLeft: j ? -cell * 0.22 : 0, animationDelay: `${j * 0.25}s` }}>
                        <Avatar doodle={m.doodle} size={Math.max(18, cell * 0.48)} sealed={circle.todaySealed[m.userId]} title={m.penName} />
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
            );
          })}
        </>
      ) : null}
    </div>
  );
}

const TileView = memo(function TileView({ tile, size, circleId, onPress }: { tile: Tile; size: number; circleId: string; onPress: (t: Tile) => void }) {
  const { cover, past, isToday, before, special } = tile;
  const { day: dom, month } = parseDay(tile.day);
  const fog = past && !before && cover.fraction === 0;
  const bg = cover.together ? mix('var(--card)', 'var(--pill)', 0.35 + cover.fraction * 0.65) : cover.fraction > 0 ? mix('var(--card)', 'var(--pill)', 0.25) : 'var(--card)';
  const border = isToday || special ? 'var(--ink)' : cover.together ? 'var(--ink-soft)' : 'var(--card-edge)';

  let content: ReactNode;
  // Benih tanaman sama di semua perangkat untuk lingkaran & hari yang sama.
  if (cover.together) content = <Doodle id={gardenDoodleFor(`${circleId}:${tile.day}`).id} size={size * 0.78} sw={2.2} />;
  else if (fog) content = <Doodle id="kabut" size={size * 0.62} color="var(--fog)" />;
  else if (cover.fraction > 0) content = <span style={{ width: 7, height: 7, borderRadius: 4, border: '1.5px solid var(--ink)', background: mix('var(--card)', 'var(--ink)', cover.fraction * 0.5) }} />;
  else if (isToday) content = <span className="tiny ink">{dom}</span>;
  else content = <span style={{ width: 3, height: 3, borderRadius: 2, background: before ? 'var(--card-edge)' : 'var(--ink-soft)', opacity: before ? 1 : 0.8 }} />;

  return (
    <button
      className={`lore-tile ${isToday ? 'today' : ''}`}
      onClick={() => onPress(tile)}
      title={formatDayLong(tile.day)}
      aria-label={`${formatDayLong(tile.day)}${cover.together ? ', tersegel bersama' : fog ? `, ${COPY.streak.fog}` : ''}${special ? `, petak ${special.name}` : ''}`}
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.28,
        background: fog ? mix('var(--card)', 'var(--fog)', 0.18) : bg,
        borderWidth: isToday ? 2 : special ? 1.5 : 1,
        borderStyle: special && !isToday ? 'dashed' : 'solid',
        borderColor: border,
        opacity: !past && !isToday ? 0.75 : 1,
      }}>
      {content}
      {dom === 1 ? <span className="lore-tile-month">{monthName(month, true).toLowerCase()}</span> : null}
      {special ? (
        <span className="lore-tile-special">
          <Doodle id={SPECIAL[special.code]?.doodle ?? 'bintang'} size={Math.max(12, size * 0.42)} />
        </span>
      ) : null}
    </button>
  );
});

function TileNote({ tile, circle, meId, onClose, onOpen }: { tile: Tile; circle: CircleView; meId: string; onClose: () => void; onOpen: () => void }) {
  const sp = tile.special ? SPECIAL[tile.special.code] : undefined;
  const n = circleDayNumber(circle.createdDay, tile.day);
  const canOpen = (tile.past || tile.isToday) && !tile.before;
  let body: string;
  if (tile.special && sp) {
    body =
      tile.past || tile.isToday
        ? sp.line
        : `Hari ke-${tile.special.days} lingkaran ini jatuh di sini. Di petak ${tile.special.name}, sesuatu akan terbuka: surat lama, halaman ilustrasi, atau kapsul yang dikunci dulu.`;
  } else if (tile.isToday) {
    const sealedN = Object.values(circle.todaySealed).filter(Boolean).length;
    body = `Bidak ${circle.active.map((m) => (m.userId === meId ? 'kamu' : m.penName)).join(', ')} berdiri di petak ini. ${COPY.seal.circleProgress(sealedN, circle.active.length)}`;
  } else if (tile.before) {
    body = 'Lingkaran ini belum lahir di hari itu. Jalannya dimulai nanti.';
  } else {
    body = 'Petak ini masih menunggu. Jalannya pelan, satu hari setiap kali.';
  }
  return (
    <div className="rise" style={{ marginBottom: 20 }}>
      <Sticky color={tile.special ? 'yellow' : 'blue'} tilt={-1}>
        <div className="row between" style={{ alignItems: 'flex-start' }}>
          <div className="grow">
            <div className="tiny" style={{ letterSpacing: '0.12em', opacity: 0.7 }}>{tile.special ? `petak istimewa · ${tile.special.name.toLowerCase()}` : dayName(tile.day).toLowerCase()}</div>
            <div className="hand" style={{ fontSize: 30, color: 'inherit' }}>
              {formatDayLong(tile.day)}
              {n >= 1 ? <span className="small" style={{ fontFamily: 'var(--mono)', opacity: 0.65 }}>{`  · hari ke-${n}`}</span> : null}
            </div>
          </div>
          {sp ? <Doodle id={sp.doodle} size={40} draw color="currentColor" /> : null}
        </div>
        <p className="small" style={{ margin: '8px 0 12px' }}>{body}</p>
        <div className="row">
          {canOpen ? (
            <button className="btn sm grow" onClick={onOpen}>
              buka halamannya
            </button>
          ) : null}
          <button className={`btn ghost sm ${canOpen ? 'auto' : 'grow'}`} onClick={onClose} style={{ color: 'inherit', borderColor: 'currentColor' }}>
            tutup
          </button>
        </div>
      </Sticky>
    </div>
  );
}

function Legend() {
  const item = (node: ReactNode, label: string) => (
    <div className="row" style={{ gap: 6 }}>
      <span style={{ width: 22, display: 'flex', justifyContent: 'center' }}>{node}</span>
      <span className="tiny soft">{label}</span>
    </div>
  );
  return (
    <div className="lore-legend">
      {item(<Doodle id="tunas" size={20} />, 'tersegel bersama')}
      {item(<span style={{ width: 7, height: 7, borderRadius: 4, border: '1.5px solid var(--ink)' }} />, 'sebagian menitipkan')}
      {item(<Doodle id="kabut" size={18} color="var(--fog)" />, COPY.streak.fog)}
      {item(<span style={{ width: 3, height: 3, borderRadius: 2, background: 'var(--ink-soft)' }} />, 'hari yang akan datang')}
      {item(<span style={{ width: 14, height: 14, borderRadius: 4, border: '1.5px dashed var(--ink)' }} />, 'petak istimewa')}
    </div>
  );
}
