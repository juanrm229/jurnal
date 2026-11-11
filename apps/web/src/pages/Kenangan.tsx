import { addDays, COPY, daysInYear, type DropWire, eachDay, formatDayLong, type MediaRef, type MyDay } from '@sehari/core';
import { gardenDoodleFor } from '@sehari/doodles';
import { useQueries } from '@tanstack/react-query';
import { type CSSProperties, type PointerEvent, useState } from 'react';
import { api } from '@/lib/api';
import { useMediaUrl } from '@/lib/media';
import { gardenSeedFor } from '@/lib/garden';
import { openDrop, qk, useCircles, useKeyring, useLetters, useMe, useMyDays, useOnThisDay, useToday } from '@/lib/data';
import { Link, navigate } from '@/lib/router';
import { Doodle } from '@/ui/kit';
import { useMyWorks } from '@/lib/works';
import { WrapHistory } from '@/pages/circles/WrapHistory';
import { ScreenTitle } from '@/ui/shell';

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'mei', 'jun', 'jul', 'agu', 'sep', 'okt', 'nov', 'des'];
/** Tinggi punggung buku: cukup untuk judulnya, sedikit berbeda tiap buku. */
const spineH = (label: string, extra = 0) => `${Math.min(168, Math.max(96, 26 + label.length * 7.6) + extra)}px`;

/** Rak: taman setahun, buku-buku yang kalian tulis, dan cerita yang sudah jadi. */
export default function Kenangan() {
  const me = useMe();
  const today = useToday();
  const thisYear = Number(today.slice(0, 4));
  const [year, setYear] = useState(thisYear);
  const days = useMyDays(`${year}-01-01`, `${year}-12-31`);
  const { circles } = useCircles();
  const letters = useLetters('inbox');
  const works = useMyWorks();
  const otd = useOnThisDay(today);
  const sealed = new Set((days.data ?? []).filter((d) => d.sealedAt).map((d) => d.day));
  const frozen = new Set((days.data ?? []).filter((d) => d.frozen).map((d) => d.day));
  const total = daysInYear(year);
  const left = year === thisYear ? eachDay(today, `${year}-12-31`).length - 1 : 0;
  const firstYear = Number(me.user.createdAt.slice(0, 4));
  // Hari yang sedang ditunjuk di kisi; bawaannya hari ini.
  const [pick, setPick] = useState<string | null>(null);
  const at = pick && pick.startsWith(String(year)) ? pick : year === thisYear ? today : null;
  const recent = [...sealed].sort().slice(-9);
  // Taman yang masih kosong: bayangan beberapa tanaman yang akan tumbuh.
  const ghosts = !!days.data && year === thisYear && sealed.size < 4 ? Array.from({ length: 6 }, (_, i) => addDays(today, i + 1)) : [];
  const live = circles.filter((c) => c.status === 'active' && c.me?.state === 'active');
  const [storyOf, setStoryOf] = useState<string | null>(null);
  const story = live.find((c) => c.id === storyOf) ?? live[0];
  const workCount = works.data?.length ?? 0;
  const letterCount = letters.data?.length ?? 0;

  /** Kisi 12 bulan x 31 hari: jari menggeser, pembacaan di bawahnya mengikuti. */
  const scrub = (e: PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const m = Math.min(11, Math.max(0, Math.floor(((e.clientY - r.top) / r.height) * 12)));
    const len = new Date(year, m + 1, 0).getDate();
    const d = Math.min(len, Math.max(1, Math.floor(((e.clientX - r.left) / r.width) * 31) + 1));
    const key = `${year}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    if (key !== pick) setPick(key > today ? today : key);
  };

  return (
    <main className="screen rak">
      <ScreenTitle title="rak" sub="Semua yang kamu dan orang terdekat simpan." />

      <section className="card taman" data-testid="taman">
        <div className="row between">
          <div className="row" style={{ gap: 0 }}>
            {year > firstYear ? <button className="icon-btn" aria-label="tahun sebelumnya" onClick={() => setYear(year - 1)}><Doodle id="ui-kembali" size={18} /></button> : null}
            <span className="label">taman {year}</span>
            {year < thisYear ? <button className="icon-btn" aria-label="tahun berikutnya" onClick={() => setYear(year + 1)}><Doodle id="ui-panah-kanan" size={18} /></button> : null}
          </div>
          <span className="tiny soft">
            <b className="ink">{sealed.size}</b> hari tumbuh{left > 0 ? ` · ${left} hari lagi` : ` dari ${total}`}
          </span>
        </div>

        <div className="taman-row" key={year}>
          {recent.map((d, i) => (
            <button key={d} className="taman-plant" style={{ '--n': i, '--h': `${26 + ((i * 7) % 4) * 5}px` } as CSSProperties} onClick={() => navigate(`/hari/${d}`)} aria-label={`${formatDayLong(d)} · tersegel`}>
              <Doodle id={gardenDoodleFor(gardenSeedFor(me.user.id, d)).id} size="100%" sw={2.8} />
            </button>
          ))}
          {ghosts.slice(0, Math.max(0, 6 - recent.length)).map((d, i) => (
            <span key={d} className="taman-plant ghost" style={{ '--n': recent.length + i, '--h': `${26 + ((i * 5) % 4) * 5}px` } as CSSProperties} aria-hidden>
              <Doodle id={gardenDoodleFor(gardenSeedFor(me.user.id, d)).id} size="100%" sw={2.8} />
            </span>
          ))}
        </div>
        {ghosts.length ? <p className="rupa-hand taman-hint">yang samar itu tamanmu minggu depan, kalau tiap hari disegel.</p> : null}

        <div className="tahun">
          <div className="tahun-months" aria-hidden>
            {MONTHS.map((m, i) => (
              <span key={m} className={at && Number(at.slice(5, 7)) === i + 1 ? 'on' : ''}>{m[0]}</span>
            ))}
          </div>
          <div className="tahun-grid" role="img" aria-label={`${sealed.size} hari tersegel di ${year}`} onPointerDown={scrub} onPointerMove={(e) => (e.buttons || e.pointerType === 'mouse') && scrub(e)} data-testid="tahun-grid">
            {MONTHS.map((_, m) => {
              const len = new Date(year, m + 1, 0).getDate();
              return Array.from({ length: 31 }, (_, i) => {
                const d = `${year}-${String(m + 1).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`;
                const cls = i >= len ? 'none' : sealed.has(d) ? 'on' : frozen.has(d) ? 'fog' : d > today ? 'future' : '';
                return <i key={d} className={`${cls}${d === today ? ' now' : ''}${d === at ? ' at' : ''}`} style={cls === 'on' ? ({ '--n': m * 2 + i * 0.4 } as CSSProperties) : undefined} />;
              });
            })}
          </div>
        </div>
        {at ? (
          <button className="tahun-read" onClick={() => navigate(at === today ? '/hari' : `/hari/${at}`)} data-testid="tahun-open">
            <span className="tahun-read-art" key={at}>
              {sealed.has(at) ? <Doodle id={gardenDoodleFor(gardenSeedFor(me.user.id, at)).id} size={30} draw /> : <Doodle id={frozen.has(at) ? 'kabut' : 'tunas'} size={26} color="var(--ink-soft)" />}
            </span>
            <span className="grow">
              <b key={at}>{at === today ? 'hari ini' : formatDayLong(at, false)}</b>
              <span className="tiny soft">{sealed.has(at) ? 'tersegel · ketuk untuk membukanya lagi' : frozen.has(at) ? 'hilang di kabut, tidak apa-apa' : at === today ? 'belum disegel' : 'tidak disegel'}</span>
            </span>
            <Doodle id="ui-panah-kanan" size={16} />
          </button>
        ) : null}
      </section>

      <section className="section">
        <span className="label">buku kalian</span>
        <div className="rakbuku">
          {live.filter((c) => c.kind !== 'moment').map((c, i) => (
            <Link key={c.id} to={`/l/${c.id}/kitab`} className={`spine ${i % 2 ? 'tint' : 'fill'}`} style={{ '--n': i, '--h': spineH(`kitab ${c.name}`, (i % 3) * 6), '--w': `${32 + Math.min(18, Math.floor(c.streak.togetherDays / 12))}px` } as CSSProperties} title="bab, adegan, dan jilid yang bisa dicetak">
              <span>kitab {c.name}</span>
            </Link>
          ))}
          {!live.length ? (
            <Link to="/l/baru" className="spine dashed" style={{ '--n': 0, '--h': spineH('kitab kalian mulai di sini'), '--w': '34px' } as CSSProperties}>
              <span>kitab kalian mulai di sini</span>
            </Link>
          ) : null}
          <Link to={`/hari/${today}`} className="spine" style={{ '--n': live.length + 1, '--h': spineH('jurnal pribadi'), '--w': `${30 + Math.min(18, Math.floor(sealed.size / 12))}px` } as CSSProperties} title="halaman-halamanmu, termasuk yang hanya aku">
            <span>jurnal pribadi</span>
          </Link>
          <Link to="/karya" className="spine tint" style={{ '--n': live.length + 2, '--h': spineH('karya', 30), '--w': `${28 + Math.min(16, workCount * 3)}px` } as CSSProperties} data-testid="spine-karya">
            <span>karya{workCount ? ` · ${workCount}` : ''}</span>
          </Link>
          <Link to="/surat" className="spine" style={{ '--n': live.length + 3, '--h': spineH('surat', 8), '--w': `${26 + Math.min(16, letterCount * 3)}px` } as CSSProperties}>
            <span>surat{letterCount ? ` · ${letterCount}` : ''}</span>
          </Link>
          <Link to="/kepo" className="spine thin" style={{ '--n': live.length + 4, '--h': spineH('si kepo', 22), '--w': '24px' } as CSSProperties} data-testid="to-kepo">
            <span>si kepo</span>
          </Link>
          <span className="rakbuku-pot" aria-hidden>
            <Doodle id="kaktus" size={48} draw={0.8} />
          </span>
        </div>
        <p className="tiny soft" style={{ marginTop: 8 }}>Makin banyak isinya, makin tebal punggungnya.</p>
      </section>

      <WeekPiles today={today} />

      {otd.data?.length ? (
        <section className="section">
          <span className="label">hari ini, dulu</span>
          {otd.data.map((x) => (
            <Link key={`${x.circleId}-${x.day}`} to={x.circleId ? `/l/${x.circleId}/hari/${x.day}` : `/hari/${x.day}`} className="sticky row" style={{ background: 'var(--sticky-blue)', gap: 12, marginBottom: 10 }}>
              <Doodle id="jam-pasir" size={34} className="sway" />
              <span>
                <span className="hand" style={{ fontSize: 26, display: 'block' }}>{x.yearsAgo} tahun lalu, hari ini.</span>
                <span className="tiny">{formatDayLong(x.day)} · {x.drops.length} hal tersimpan{x.circleId ? ` · ${circles.find((c) => c.id === x.circleId)?.name ?? ''}` : ''}</span>
              </span>
            </Link>
          ))}
        </section>
      ) : null}

      <section className="section">
        <div className="row between" style={{ marginBottom: 8 }}>
          <span className="label">cerita kita</span>
          {live.length > 1 ? (
            <span className="row" style={{ gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              {live.map((c) => (
                <button key={c.id} className={`pill sm ${c.id === story?.id ? 'active' : ''}`} onClick={() => setStoryOf(c.id)}>
                  {c.name}
                </button>
              ))}
            </span>
          ) : null}
        </div>
        {story ? (
          <div className="card" key={story.id}>
            <WrapHistory circleId={story.id} createdDay={story.createdDay} today={today} moment={story.kind === 'moment'} />
          </div>
        ) : (
          <p className="small soft">{COPY.empty.memories}</p>
        )}
      </section>
    </main>
  );
}

/** Seminggu ini: foto-foto tiap hari ditumpuk seperti polaroid di meja. */
function WeekPiles({ today }: { today: string }) {
  const ring = useKeyring();
  const days = Array.from({ length: 7 }, (_, i) => addDays(today, -i));
  const qs = useQueries({ queries: days.map((d) => ({ queryKey: qk.myDay(d), queryFn: () => api.get<MyDay>(`/days/${d}`), staleTime: 60_000 })) });
  const piles = days
    .map((d, i) => {
      const drops: DropWire[] = qs[i]?.data?.drops ?? [];
      const photos = drops
        .filter((w) => w.kind === 'photo')
        .map((w) => openDrop(w, ring).payload?.media?.find((m) => m.mime.startsWith('image/')))
        .filter((m): m is MediaRef => !!m);
      const words = drops.length;
      return { d, photos, words, sealed: !!qs[i]?.data?.sealedAt };
    })
    .filter((p) => p.words > 0);
  if (!piles.length) return null;
  const label = (d: string) => (d === today ? 'hari ini' : d === addDays(today, -1) ? 'kemarin' : formatDayLong(d, false));
  return (
    <section className="section rupa-week">
      <span className="rupa-hand" style={{ fontSize: 30 }}>banyak yang terjadi minggu ini.</span>
      <div className="col" style={{ gap: 14 }}>
        {piles.map((p) => (
          <Link key={p.d} to={`/hari/${p.d}`} className="rw-day">
            <span className="rw-label">
              <b className={p.d === addDays(today, -1) ? 'accent' : ''}>{label(p.d)}</b>
              <span className="tiny soft">
                {p.words} hal{p.sealed ? ' · tersegel' : ''}
              </span>
            </span>
            <span className="rw-pile">
              {p.photos.length ? (
                p.photos.slice(0, 4).map((m, i) => <PileShot key={m.id} m={m} i={i} />)
              ) : (
                <span className="rw-empty">
                  <Doodle id="buku-terbuka" size={30} />
                </span>
              )}
            </span>
          </Link>
        ))}
      </div>
      <Link to="/hari?cerita=1" className="rw-listen">
        <span className="vr-dot on" />
        <span className="grow">
          <b className="small">ceritakan harimu</b>
          <span className="tiny soft" style={{ display: 'block' }}>rekam bebas, nanti tersimpan rapi di halaman</span>
        </span>
        <Doodle id="ui-mikrofon" size={22} />
      </Link>
    </section>
  );
}

function PileShot({ m, i }: { m: MediaRef; i: number }) {
  const url = useMediaUrl(m);
  const rot = [-6, 4, -2, 7][i] ?? 0;
  return (
    <span className="rw-shot" style={{ '--r': `${rot}deg`, '--i': i, background: m.tint } as CSSProperties}>
      {url ? <img src={url} alt="" loading="lazy" /> : null}
    </span>
  );
}
