/**
 * Wrapped: Minggu Kita, Bulan Kita, Tahun Kita, dan Wrap Acara versi cerita.
 *
 * Satu halaman yang digulir, adegan demi adegan (snap). Sengaja dibuat aman di
 * iPhone: tidak ada lapisan `position: fixed` yang mengunci body, dan isi tidak
 * pernah bergantung pada animasi untuk terlihat. Efek muncul memakai
 * `transition` yang dipicu saat adegan masuk layar; kalau apa pun gagal,
 * semuanya tetap tampil.
 */
import { type FlameLevel, formatClock, formatDayLong, GENRES, getCity, type MediaRef, monthName, parseDay, type StoryScene, type WrapCard, type WrapStory, dayName } from '@sehari/core';
import { type CSSProperties, type ReactNode, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useMediaUrl } from '@/lib/media';
import { navigate } from '@/lib/router';
import { Avatar, Doodle, Flame } from '@/ui/kit';

export interface WrappedCtx {
  meId: string;
  circleId: string;
  name: (userId: string) => string;
  doodleOf: (userId: string) => string;
  /** Warna khas tiap orang (urutan anggota). */
  colorOf: (userId: string) => string;
}

export const PERSON_COLORS = ['var(--ink)', '#E07A5F', '#3F9C8A', '#D9A21B', '#9C6ADE', '#4F8FD8', '#C2577E', '#6E8B3D'];

const cap = (s: string) => (s ? s[0]!.toUpperCase() + s.slice(1) : s);
const reduced = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

// ── Kerangka ──────────────────────────────────────────────────────────────────

/**
 * Tandai adegan yang sudah terlihat (sekali terlihat, tetap terlihat). Memakai
 * peristiwa scroll biasa, bukan IntersectionObserver, supaya sederhana dan
 * berjalan di mana saja; ditambah pemeriksaan berkala sebagai jaring pengaman.
 */
function useSeen(root: React.RefObject<HTMLElement | null>, count: number): Set<number> {
  const [seen, setSeen] = useState<Set<number>>(() => new Set([0]));
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    if (reduced()) {
      setSeen(new Set(Array.from({ length: count }, (_, i) => i)));
      return;
    }
    const check = () => {
      const h = el.clientHeight || window.innerHeight;
      const top = el.getBoundingClientRect().top;
      const scenes = el.querySelectorAll<HTMLElement>('[data-scene]');
      setSeen((prev) => {
        let next: Set<number> | null = null;
        scenes.forEach((s) => {
          const i = Number(s.dataset.scene);
          if (prev.has(i)) return;
          const r = s.getBoundingClientRect();
          if (r.top - top < h * 0.72 && r.bottom - top > h * 0.15) (next ??= new Set(prev)).add(i);
        });
        return next ?? prev;
      });
    };
    check();
    el.addEventListener('scroll', check, { passive: true });
    window.addEventListener('resize', check);
    const iv = window.setInterval(check, 700);
    return () => {
      el.removeEventListener('scroll', check);
      window.removeEventListener('resize', check);
      window.clearInterval(iv);
    };
  }, [root, count]);
  return seen;
}

function Scene({ i, seen, tone, children, className }: { i: number; seen: boolean; tone?: string; children: ReactNode; className?: string }) {
  return (
    <section data-scene={i} className={['wr-scene', seen ? 'in' : '', className].filter(Boolean).join(' ')} style={tone ? ({ '--tone': tone } as CSSProperties) : undefined}>
      <div className="wr-inner">{children}</div>
    </section>
  );
}

/** Elemen yang muncul bertahap. `n` = urutan (jeda). Tanpa adegan aktif tetap terbaca oleh pembaca layar. */
function R({ n = 0, children, className, style, as: Tag = 'div' }: { n?: number; children: ReactNode; className?: string; style?: CSSProperties; as?: 'div' | 'p' | 'span' | 'h1' | 'h2' }) {
  return (
    <Tag className={['rv', className].filter(Boolean).join(' ')} style={{ '--i': n, ...style } as CSSProperties}>
      {children}
    </Tag>
  );
}

function Kicker({ children, n = 0 }: { children: ReactNode; n?: number }) {
  return (
    <R n={n} className="wr-kicker">
      {children}
    </R>
  );
}

/** Angka yang menghitung naik saat adegannya terlihat. Selalu berakhir di angka sebenarnya. */
function CountUp({ value, on, ms = 1400 }: { value: number; on: boolean; ms?: number }) {
  const [v, setV] = useState(on && !reduced() ? 0 : value);
  useEffect(() => {
    if (!on) return;
    if (reduced() || value <= 1) {
      setV(value);
      return;
    }
    let raf = 0;
    const t0 = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / ms);
      setV(Math.round(value * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    const done = window.setTimeout(() => setV(value), ms + 300);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(done);
    };
  }, [on, value, ms]);
  return <span aria-label={String(value)}>{v.toLocaleString('id-ID')}</span>;
}

function Person({ id, ctx, size = 34 }: { id: string; ctx: WrappedCtx; size?: number }) {
  return (
    <span className="wr-person" style={{ '--pc': ctx.colorOf(id) } as CSSProperties}>
      <Avatar doodle={ctx.doodleOf(id)} size={size} />
      <span>{ctx.name(id)}</span>
    </span>
  );
}

function Photo({ media, className, style }: { media: MediaRef; className?: string; style?: CSSProperties }) {
  const url = useMediaUrl(media);
  return (
    <div className={['wr-photo', className].filter(Boolean).join(' ')} style={{ aspectRatio: media.width && media.height ? media.width / media.height : 1, background: media.tint ?? 'var(--pill)', ...style }}>
      {url ? <img src={url} alt="" draggable={false} /> : <Doodle id="ui-foto" size={30} style={{ opacity: 0.5 }} />}
    </div>
  );
}

const fmtDay = (d: string) => `${cap(dayName(d))}, ${formatDayLong(d, false)}`;

// ── Adegan ────────────────────────────────────────────────────────────────────

function Opening({ s, on, ctx, story }: { s: Extract<StoryScene, { type: 'opening' }>; on: boolean; ctx: WrappedCtx; story: WrapStory }) {
  return (
    <div className="wr-open">
      <div className={`wr-envelope${on ? ' open' : ''}`} aria-hidden>
        <div className="wr-env-back" />
        <div className="wr-env-letter">
          <span className="wr-hand">untuk kita</span>
        </div>
        <div className="wr-env-front" />
        <div className="wr-env-flap" />
        <div className="wr-env-seal">
          <Doodle id="hati-kecil" size={22} color="#fff" />
        </div>
      </div>
      <Kicker n={2}>{s.kicker} · {s.label.toLowerCase()}</Kicker>
      <R n={3} as="h1" className="wr-title">
        {s.title}
      </R>
      <R n={4} className="wr-names">
        {story.people.map((p, i) => (
          <span key={p.userId} className="row" style={{ gap: 6 }}>
            {i > 0 ? <span className="wr-amp">&</span> : null}
            <Person id={p.userId} ctx={ctx} size={30} />
          </span>
        ))}
      </R>
      <R n={6} as="p" className="wr-lead">
        {s.tagline}
      </R>
      <R n={8} className="wr-scroll-hint">
        <span>gulir pelan-pelan</span>
        <span className="wr-chev" aria-hidden>
          ↓
        </span>
      </R>
    </div>
  );
}

function Tally({ s, on }: { s: Extract<StoryScene, { type: 'tally' }>; on: boolean }) {
  return (
    <>
      <Kicker>angka-angka kecil</Kicker>
      <div className="wr-tally">
        {s.items.map((it, i) => (
          <R key={it.label} n={i + 1} className="wr-stat">
            <Doodle id={it.doodle} size={34} />
            <div className="wr-stat-num">
              <CountUp value={it.value} on={on} ms={1100 + i * 200} />
            </div>
            <div className="wr-stat-label">{it.label}</div>
            {it.note ? <div className="wr-stat-note">{it.note}</div> : null}
          </R>
        ))}
      </div>
    </>
  );
}

function Days({ s, ctx, story }: { s: Extract<StoryScene, { type: 'days' }>; ctx: WrappedCtx; story: WrapStory }) {
  const max = Math.max(1, ...s.days.map((d) => d.count));
  const dense = s.days.length > 12;
  return (
    <>
      <Kicker>{s.title.toLowerCase()}</Kicker>
      <div className={`wr-days${dense ? ' dense' : ''}`} style={{ gridTemplateColumns: `repeat(${dense ? 7 : s.days.length}, minmax(0, 1fr))` }}>
        {s.days.map((d, i) => (
          <R key={d.key} n={dense ? Math.floor(i / 3) : i + 1} className={`wr-day${d.key === s.busiest ? ' best' : ''}${d.count ? '' : ' empty'}`}>
            {!dense && s.unit === 'day' ? <div className="wr-day-top">{d.top}</div> : null}
            <div className="wr-day-col">
              <div className="wr-day-bar" style={{ '--h': d.count / max, background: d.moodColor ?? 'color-mix(in srgb, var(--ink) 30%, transparent)' } as CSSProperties} />
            </div>
            <div className="wr-day-dots">
              {story.people.map((p) => (
                <i key={p.userId} className={d.sealed.includes(p.userId) ? 'on' : d.wrote.includes(p.userId) ? 'half' : ''} style={{ '--pc': ctx.colorOf(p.userId) } as CSSProperties} />
              ))}
            </div>
            <div className="wr-day-bottom">{dense ? d.bottom : d.bottom || d.top}</div>
            {d.key === s.busiest ? <Doodle id="kilau" size={18} className="wr-day-star" /> : null}
          </R>
        ))}
      </div>
      <R n={9} className="wr-legend">
        {story.people.map((p) => (
          <span key={p.userId} className="row" style={{ gap: 6 }}>
            <i className="wr-dot on" style={{ '--pc': ctx.colorOf(p.userId) } as CSSProperties} />
            {ctx.name(p.userId)}
          </span>
        ))}
        <span className="soft">titik penuh = menyegel</span>
      </R>
      {s.caption ? (
        <R n={10} as="p" className="wr-caption">
          {s.caption}
        </R>
      ) : null}
    </>
  );
}

function Clock({ s, ctx }: { s: Extract<StoryScene, { type: 'clock' }>; ctx: WrappedCtx }) {
  const R0 = 46;
  const max = Math.max(1, ...s.perMember.flatMap((m) => m.hours));
  const n = s.perMember.length;
  return (
    <>
      <Kicker>jam-jam kalian</Kicker>
      <R n={1} className="wr-clock">
        <svg viewBox="-150 -150 300 300" role="img" aria-label={s.caption}>
          <circle r={R0 + 92} className="wr-clock-ring" />
          <circle r={R0} className="wr-clock-face" />
          {Array.from({ length: 24 }, (_, h) => {
            const a = (h / 24) * Math.PI * 2 - Math.PI / 2;
            return (
              <g key={h}>
                <line x1={Math.cos(a) * (R0 + 2)} y1={Math.sin(a) * (R0 + 2)} x2={Math.cos(a) * (R0 + 92)} y2={Math.sin(a) * (R0 + 92)} className="wr-clock-tick" />
                {h % 6 === 0 ? (
                  <text x={Math.cos(a) * (R0 + 108)} y={Math.sin(a) * (R0 + 108) + 4} className="wr-clock-num">
                    {String(h).padStart(2, '0')}
                  </text>
                ) : null}
              </g>
            );
          })}
          {s.perMember.map((m, mi) =>
            m.hours.map((c, h) => {
              if (!c) return null;
              const spread = n > 1 ? ((mi - (n - 1) / 2) / n) * ((Math.PI * 2) / 24) * 0.8 : 0;
              const a = (h / 24) * Math.PI * 2 - Math.PI / 2 + spread;
              const len = 14 + (c / max) * 76;
              return (
                <line
                  key={`${m.userId}-${h}`}
                  className="wr-petal"
                  style={{ '--d': `${(h % 12) * 60 + mi * 120}ms` } as CSSProperties}
                  x1={Math.cos(a) * (R0 + 4)}
                  y1={Math.sin(a) * (R0 + 4)}
                  x2={Math.cos(a) * (R0 + 4 + len)}
                  y2={Math.sin(a) * (R0 + 4 + len)}
                  stroke={ctx.colorOf(m.userId)}
                  strokeWidth={n > 2 ? 5 : 8}
                />
              );
            }),
          )}
          <text y={-4} className="wr-clock-center">
            {formatClock(s.peak, 0)}
          </text>
          <text y={16} className="wr-clock-sub">
            jam ramai
          </text>
        </svg>
      </R>
      <div className="wr-nicks">
        {s.perMember.map((m, i) => (
          <R key={m.userId} n={3 + i} className="wr-nick">
            <Person id={m.userId} ctx={ctx} size={26} />
            <span className="wr-hand">{m.nickname}</span>
            <span className="tiny soft">paling sering jam {formatClock(m.peak, 0)}</span>
          </R>
        ))}
      </div>
      {s.sync ? (
        <R n={7} className="wr-sync">
          <div className="wr-sync-kicker">momen sinkron</div>
          <div className="wr-sync-row">
            <div className="wr-sync-side">
              <Avatar doodle={ctx.doodleOf(s.sync.a.userId)} size={38} />
              <b>{formatClock(s.sync.a.hour, s.sync.a.minute)}</b>
              <span className="tiny">{ctx.name(s.sync.a.userId)}</span>
            </div>
            <div className="wr-sync-mid">
              <span className="wr-sync-line" />
              <Doodle id="hati-dua" size={34} className="wr-beat" />
              <span className="wr-sync-gap">{s.sync.gap === 0 ? 'menit yang sama' : `${s.sync.gap} menit`}</span>
            </div>
            <div className="wr-sync-side">
              <Avatar doodle={ctx.doodleOf(s.sync.b.userId)} size={38} />
              <b>{formatClock(s.sync.b.hour, s.sync.b.minute)}</b>
              <span className="tiny">{ctx.name(s.sync.b.userId)}</span>
            </div>
          </div>
          <div className="small">{fmtDay(s.sync.day)}: kalian menulis hampir bersamaan, tanpa janjian.</div>
        </R>
      ) : (
        <R n={6} as="p" className="wr-caption">
          {s.caption}
        </R>
      )}
    </>
  );
}

function Mood({ s, ctx }: { s: Extract<StoryScene, { type: 'mood' }>; ctx: WrappedCtx }) {
  const total = s.moods.reduce((a, m) => a + m.count, 0);
  let acc = 0;
  const conic = s.moods
    .map((m) => {
      const from = (acc / total) * 360;
      acc += m.count;
      return `${m.color} ${from}deg ${(acc / total) * 360}deg`;
    })
    .join(', ');
  return (
    <>
      <Kicker>warna hari-hari kita</Kicker>
      <R n={1} className="wr-mood-orb" style={{ '--conic': `conic-gradient(${conic})`, '--main': s.dominant.color } as CSSProperties}>
        <div className="wr-mood-core">
          <span className="wr-hand" style={{ fontSize: 34 }}>
            {s.dominant.label}
          </span>
        </div>
      </R>
      <R n={3} as="p" className="wr-caption">
        {s.caption}
      </R>
      <R n={4} className="wr-mood-chips">
        {s.moods.slice(0, 6).map((m) => (
          <span key={m.mood} className="wr-chip" style={{ background: m.color }}>
            {m.label} · {m.count}
          </span>
        ))}
      </R>
      {s.perMember.length > 1 ? (
        <div className="wr-mood-people">
          {s.perMember.map((m, i) => (
            <R key={m.userId} n={5 + i} className="wr-mood-person">
              <Person id={m.userId} ctx={ctx} size={26} />
              <span>
                paling sering <b style={{ color: m.color }}>{m.label}</b>
              </span>
            </R>
          ))}
        </div>
      ) : null}
    </>
  );
}

function Photos({ s, ctx }: { s: Extract<StoryScene, { type: 'photos' }>; ctx: WrappedCtx }) {
  const cols = s.items.length === 1 ? 1 : s.items.length <= 4 ? 2 : 3;
  return (
    <>
      <Kicker>{s.title.toLowerCase()}</Kicker>
      <div className="wr-polaroids" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, maxWidth: cols === 1 ? 300 : 460 }}>
        {s.items.map((p, i) => (
          <R key={p.dropId} n={i + 1} className="wr-polaroid" style={{ '--r': `${((i * 37) % 9) - 4}deg` } as CSSProperties}>
            <Photo media={p.media} style={{ aspectRatio: 1 }} />
            <div className="wr-polaroid-cap">
              <span>{ctx.name(p.userId)}</span>
              <span className="soft">{formatDayLong(p.day, false)}</span>
            </div>
          </R>
        ))}
      </div>
      {s.total > s.items.length ? (
        <R n={s.items.length + 2} as="p" className="wr-caption">
          dan {s.total - s.items.length} foto lain yang menunggu dibuka di halaman harian.
        </R>
      ) : null}
    </>
  );
}

function Words({ s }: { s: Extract<StoryScene, { type: 'words' }> }) {
  const max = Math.max(...s.top.map((w) => w.count), 1);
  return (
    <>
      <Kicker>kata-kata yang paling sering mampir</Kicker>
      <div className="wr-cloud">
        {s.top.map((w, i) => {
          const size = 16 + Math.round((w.count / max) * 30);
          return (
            <R
              key={w.word}
              n={i + 1}
              as="span"
              className={`wr-word${i % 3 === 0 ? ' hand' : ''}`}
              style={{ fontSize: i % 3 === 0 ? size + 8 : size * 0.85, '--r': `${((i * 7) % 9) - 4}deg` } as CSSProperties}>
              {w.word}
            </R>
          );
        })}
      </div>
      {s.shared.length ? (
        <R n={s.top.length + 1} className="wr-shared">
          <div className="wr-sync-kicker">kata yang kalian tulis bersama</div>
          <div className="row wrap" style={{ justifyContent: 'center', gap: 8 }}>
            {s.shared.map((w) => (
              <span key={w.word} className="wr-ribbon">
                “{w.word}”
              </span>
            ))}
          </div>
          <div className="tiny soft">tanpa janjian, kata-kata ini muncul di tulisan lebih dari satu orang</div>
        </R>
      ) : null}
    </>
  );
}

function Quotes({ s, ctx }: { s: Extract<StoryScene, { type: 'quotes' }>; ctx: WrappedCtx }) {
  return (
    <>
      <Kicker>kalimat yang tertinggal</Kicker>
      <div className="wr-quotes">
        {s.items.map((q, i) => (
          <R key={q.dropId} n={i * 2 + 1} className="wr-quote" style={{ '--r': `${i % 2 ? 1.2 : -1.2}deg`, '--pc': ctx.colorOf(q.userId) } as CSSProperties}>
            <span className="wr-quote-mark" aria-hidden>
              “
            </span>
            <p>{q.text}</p>
            <div className="wr-quote-by">
              <Person id={q.userId} ctx={ctx} size={24} />
              <span className="tiny soft">
                {formatDayLong(q.day, false)}
                {q.hugs ? ` · ${q.hugs} pelukan` : ''}
              </span>
            </div>
          </R>
        ))}
      </div>
    </>
  );
}

function Hugs({ s, on, ctx }: { s: Extract<StoryScene, { type: 'hugs' }>; on: boolean; ctx: WrappedCtx }) {
  return (
    <>
      <Kicker>siapa memeluk siapa</Kicker>
      <R n={1} className="wr-big">
        <CountUp value={s.total} on={on} />
      </R>
      <R n={2} className="wr-big-label">
        pelukan, “aku di sini”, dan “aku juga”
      </R>
      <div className="wr-hugs">
        {s.pairs.map((p, i) => (
          <R key={`${p.from}-${p.to}`} n={3 + i} className="wr-hug">
            <Person id={p.from} ctx={ctx} size={28} />
            <span className="wr-hug-arrow" style={{ '--pc': ctx.colorOf(p.from) } as CSSProperties}>
              <Doodle id="ui-peluk" size={20} />
              <b>{p.count}×</b>
            </span>
            <Person id={p.to} ctx={ctx} size={28} />
          </R>
        ))}
      </div>
      <R n={4 + s.pairs.length} as="p" className="wr-caption">
        {s.caption}
      </R>
    </>
  );
}

function Songs({ s, ctx }: { s: Extract<StoryScene, { type: 'songs' }>; ctx: WrappedCtx }) {
  const top = s.songs[0]!;
  return (
    <>
      <Kicker>soundtrack kita</Kicker>
      <R n={1} className="wr-vinyl" aria-hidden>
        <div className="wr-vinyl-disc">
          <div className="wr-vinyl-label">
            <Doodle id="ui-lagu" size={22} color="#fff" />
          </div>
        </div>
      </R>
      <R n={2} as="h2" className="wr-song-title">
        {top.title}
      </R>
      <R n={3} className="wr-song-artist">
        {top.artist} · {top.count}× diputar
      </R>
      {s.songs.length > 1 ? (
        <ol className="wr-playlist">
          {s.songs.slice(1).map((x, i) => (
            <R key={`${x.title}-${x.artist}`} n={4 + i} className="wr-track">
              <span className="wr-track-n">{i + 2}</span>
              <span className="grow">
                <b>{x.title}</b>
                <span className="tiny soft"> · {x.artist}</span>
              </span>
              <span className="row" style={{ gap: 2 }}>
                {x.byUserIds.slice(0, 3).map((u) => (
                  <i key={u} className="wr-dot on" style={{ '--pc': ctx.colorOf(u) } as CSSProperties} />
                ))}
              </span>
            </R>
          ))}
        </ol>
      ) : null}
    </>
  );
}

function Bookends({ s, ctx }: { s: Extract<StoryScene, { type: 'bookends' }>; ctx: WrappedCtx }) {
  const note = (x: typeof s.first, label: string, n: number, color: string, r: number) => (
    <R n={n} className="wr-note" style={{ background: color, '--r': `${r}deg` } as CSSProperties}>
      <div className="wr-note-label">{label}</div>
      <p className="wr-hand">{x.text}</p>
      <div className="wr-quote-by">
        <Person id={x.userId} ctx={ctx} size={22} />
        <span className="tiny">
          {fmtDay(x.day)} · {formatClock(x.hour, x.minute)}
        </span>
      </div>
    </R>
  );
  return (
    <>
      <Kicker>halaman pertama & terakhir</Kicker>
      <div className="wr-bookends">
        {note(s.first, 'yang membuka', 1, 'var(--sticky-yellow)', -2)}
        <R n={2} className="wr-between" aria-hidden>
          <span />
          <Doodle id="jam-pasir" size={26} />
          <span />
        </R>
        {note(s.last, 'yang menutup', 3, 'var(--sticky-blue)', 1.5)}
      </div>
    </>
  );
}

function BestDay({ s, circleId }: { s: Extract<StoryScene, { type: 'bestDay' }>; circleId: string }) {
  const p = parseDay(s.day);
  return (
    <>
      <Kicker>hari terbaik versi kita</Kicker>
      <R n={1} className="wr-date">
        <span className="wr-date-day">{p.day}</span>
        <span className="wr-date-month">{monthName(p.month).toLowerCase()}</span>
        <span className="wr-date-wd">{dayName(s.day)}</span>
      </R>
      <R n={3} className="wr-best-facts">
        <span>
          <b>{s.count}</b> hal kecil
        </span>
        <span>
          <b>{s.hugs}</b> pelukan
        </span>
        <span>
          <b>{s.people}</b> orang
        </span>
      </R>
      <R n={4} as="p" className="wr-caption">
        {s.caption}
      </R>
      <R n={5}>
        <button className="btn ghost auto" onClick={() => navigate(`/l/${circleId}/hari/${s.day}`)}>
          buka hari itu
        </button>
      </R>
    </>
  );
}

function Fire({ s, on, ctx }: { s: Extract<StoryScene, { type: 'fire' }>; on: boolean; ctx: WrappedCtx }) {
  const level: FlameLevel = s.current >= 14 ? 'bright' : s.current >= 3 ? 'warm' : s.current >= 1 ? 'dim' : 'ember';
  return (
    <>
      <Kicker>api yang kita jaga</Kicker>
      <R n={1} className="wr-fire">
        <Flame level={level} days={s.current} size={64} />
      </R>
      <R n={2} className="wr-fire-nums">
        <div>
          <b>
            <CountUp value={s.current} on={on} />
          </b>
          <span>hari berturut</span>
        </div>
        <div>
          <b>
            <CountUp value={s.longest} on={on} />
          </b>
          <span>terpanjang</span>
        </div>
        <div>
          <b>
            <CountUp value={s.togetherDays} on={on} />
          </b>
          <span>hari bersama</span>
        </div>
      </R>
      <div className="wr-fire-people">
        {s.perMember.map((m, i) => (
          <R key={m.userId} n={3 + i} className="wr-fire-person">
            <Person id={m.userId} ctx={ctx} size={24} />
            <span className="wr-fire-bar">
              <i style={{ '--w': m.days / Math.max(1, s.totalDays), '--pc': ctx.colorOf(m.userId) } as CSSProperties} />
            </span>
            <span className="tiny">{m.days} hari</span>
          </R>
        ))}
      </div>
      <R n={4 + s.perMember.length} as="p" className="wr-caption">
        bukan lomba. semua yang ikut menjaga api ini dihitung.
      </R>
    </>
  );
}

function Extra({ card, ctx }: { card: WrapCard; ctx: WrappedCtx }) {
  switch (card.type) {
    case 'roles':
      return (
        <>
          <Kicker>{card.title.toLowerCase()}</Kicker>
          <div className="wr-quotes">
            {card.items.map((r, i) => (
              <R key={r.userId} n={i + 1} className="wr-role">
                <Person id={r.userId} ctx={ctx} size={30} />
                <div className="wr-hand" style={{ fontSize: 30 }}>
                  {r.role}
                </div>
                <div className="small soft">{r.reason}</div>
              </R>
            ))}
          </div>
          <R n={card.items.length + 1} as="p" className="wr-caption">
            julukan, bukan peringkat.
          </R>
        </>
      );
    case 'lines':
      return (
        <>
          <Kicker>{card.title.toLowerCase()}</Kicker>
          <div className="wr-lines">
            {card.lines.map((l, i) => (
              <R key={`${l.day}-${i}`} n={Math.min(i + 1, 14)} as="p" className="wr-hand" style={{ color: ctx.colorOf(l.userId) }}>
                {l.text}
              </R>
            ))}
          </div>
        </>
      );
    case 'chapters':
      return (
        <>
          <Kicker>{card.title.toLowerCase()}</Kicker>
          <ol className="wr-toc">
            {card.items.map((c, i) => (
              <R key={c.month} n={i + 1} className="wr-toc-row">
                <span className="soft">{monthName(Number(c.month.slice(5))).toLowerCase()}</span>
                <span className="wr-toc-dots" />
                <b>{c.title}</b>
              </R>
            ))}
          </ol>
        </>
      );
    case 'places':
      return (
        <>
          <Kicker>{card.title.toLowerCase()}</Kicker>
          <div className="wr-places">
            {card.cities.slice(0, 8).map((c, i) => (
              <R key={c.cityId} n={i + 1} className="wr-place">
                <Doodle id="kompas" size={22} />
                <b>{getCity(c.cityId)?.name ?? c.cityId}</b>
                <span className="tiny soft">{c.days} hari</span>
              </R>
            ))}
          </div>
          <R n={10} as="p" className="wr-caption">
            hanya nama kota, tidak pernah titik persis.
          </R>
        </>
      );
    case 'motif':
      return (
        <>
          <Kicker>{card.title.toLowerCase()}</Kicker>
          <R n={1} as="h2" className="wr-title wr-hand">
            {card.word}
          </R>
          <R n={2} as="p" className="wr-caption">
            muncul di {card.days} hari berbeda.
          </R>
        </>
      );
    case 'genre':
      return (
        <>
          <Kicker>{card.title.toLowerCase()}</Kicker>
          <R n={1} as="h2" className="wr-title">
            {card.genre}
          </R>
          <R n={2} as="p" className="wr-caption">
            {GENRES.find((g) => g.name === card.genre)?.blurb ?? ''}
          </R>
        </>
      );
    default:
      return null;
  }
}

function Letter({ s }: { s: Extract<StoryScene, { type: 'letter' }> }) {
  return (
    <div className="wr-letter">
      <R n={0} className="wr-letter-stamp" aria-hidden>
        <Doodle id="surat-terbuka" size={30} />
      </R>
      <R n={1} as="p" className="wr-letter-to wr-hand">
        {s.to}
      </R>
      {s.paragraphs.map((p, i) => (
        <R key={i} n={2 + i * 1.6} as="p" className="wr-letter-p">
          {p}
        </R>
      ))}
      <R n={3 + s.paragraphs.length * 1.6} as="p" className="wr-letter-sign wr-hand">
        {s.signoff}
      </R>
    </div>
  );
}

function Quiet({ s }: { s: Extract<StoryScene, { type: 'quiet' }> }) {
  return (
    <>
      <R n={0}>
        <Doodle id="awan" size={90} />
      </R>
      <R n={1} as="p" className="wr-lead">
        {s.text}
      </R>
    </>
  );
}

const TONE: Partial<Record<StoryScene['type'], string>> = {
  opening: 'var(--paper)',
  tally: 'var(--sticky-yellow)',
  days: 'var(--paper)',
  clock: 'var(--sticky-blue)',
  photos: 'var(--paper)',
  words: 'var(--sticky-green)',
  quotes: 'var(--paper)',
  hugs: 'var(--sticky-peach)',
  songs: 'color-mix(in srgb, var(--ink) 12%, var(--paper))',
  bookends: 'var(--paper)',
  bestDay: 'var(--sticky-yellow)',
  fire: 'var(--sticky-peach)',
  letter: 'var(--paper)',
};

export function Wrapped({ story, ctx, end, onClose }: { story: WrapStory; ctx: WrappedCtx; end: (nav: { toStart: () => void; back: () => void }) => ReactNode; onClose: () => void }) {
  const root = useRef<HTMLDivElement>(null);
  const total = story.scenes.length + 1;
  const seen = useSeen(root, total);
  const [current, setCurrent] = useState(0);

  useLayoutEffect(() => {
    const el = root.current;
    if (!el) return;
    const on = () => setCurrent(Math.round(el.scrollTop / Math.max(1, el.clientHeight)));
    el.addEventListener('scroll', on, { passive: true });
    return () => el.removeEventListener('scroll', on);
  }, []);

  const go = (i: number) => {
    const el = root.current;
    if (!el) return;
    const target = el.querySelector<HTMLElement>(`[data-scene="${Math.max(0, Math.min(total - 1, i))}"]`);
    if (target) el.scrollTo({ top: target.offsetTop, behavior: reduced() ? 'auto' : 'smooth' });
  };

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown' || e.key === 'PageDown' || e.key === ' ') {
        e.preventDefault();
        go(current + 1);
      } else if (e.key === 'ArrowUp' || e.key === 'PageUp') {
        e.preventDefault();
        go(current - 1);
      } else if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  });

  const moodTone = story.scenes.find((s) => s.type === 'mood');
  const scene = (s: StoryScene, i: number) => {
    const on = seen.has(i);
    switch (s.type) {
      case 'opening':
        return <Opening s={s} on={on} ctx={ctx} story={story} />;
      case 'tally':
        return <Tally s={s} on={on} />;
      case 'days':
        return <Days s={s} ctx={ctx} story={story} />;
      case 'clock':
        return <Clock s={s} ctx={ctx} />;
      case 'mood':
        return <Mood s={s} ctx={ctx} />;
      case 'photos':
        return <Photos s={s} ctx={ctx} />;
      case 'words':
        return <Words s={s} />;
      case 'quotes':
        return <Quotes s={s} ctx={ctx} />;
      case 'hugs':
        return <Hugs s={s} on={on} ctx={ctx} />;
      case 'songs':
        return <Songs s={s} ctx={ctx} />;
      case 'bookends':
        return <Bookends s={s} ctx={ctx} />;
      case 'bestDay':
        return <BestDay s={s} circleId={ctx.circleId} />;
      case 'fire':
        return <Fire s={s} on={on} ctx={ctx} />;
      case 'extra':
        return <Extra card={s.card} ctx={ctx} />;
      case 'letter':
        return <Letter s={s} />;
      case 'quiet':
        return <Quiet s={s} />;
    }
  };

  return (
    <div className={`wr wr-${story.scope}`} ref={root} data-testid="wrapped">
      <header className="wr-bar">
        <div className="wr-progress" aria-hidden>
          {Array.from({ length: total }, (_, i) => (
            <button key={i} tabIndex={-1} className={i === current ? 'now' : i < current ? 'done' : ''} onClick={() => go(i)} />
          ))}
        </div>
        <button className="icon-btn wr-close" aria-label="tutup" onClick={onClose} data-testid="story-close">
          <Doodle id="ui-tutup" size={22} />
        </button>
      </header>
      {story.scenes.map((s, i) => (
        <Scene
          key={i}
          i={i}
          seen={seen.has(i)}
          tone={s.type === 'mood' && moodTone?.type === 'mood' ? `color-mix(in srgb, ${moodTone.dominant.color} 22%, var(--paper))` : TONE[s.type]}
          className={`wr-s-${s.type}`}>
          {scene(s, i)}
          {i < story.scenes.length - 1 && s.type !== 'opening' ? (
            <button className="wr-next" aria-label="adegan berikutnya" onClick={() => go(i + 1)}>
              ↓
            </button>
          ) : null}
        </Scene>
      ))}
      <Scene i={story.scenes.length} seen={seen.has(story.scenes.length)} tone="var(--paper)" className="wr-s-end">
        {end({ toStart: () => go(0), back: () => go(story.scenes.length - 1) })}
      </Scene>
    </div>
  );
}
