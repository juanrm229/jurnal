import { COPY, daysInYear, eachDay, formatDayLong } from '@sehari/core';
import { gardenDoodleFor } from '@sehari/doodles';
import { useState } from 'react';
import { gardenSeedFor } from '@/lib/garden';
import { useCircles, useLetters, useMe, useMyDays, useOnThisDay, useToday } from '@/lib/data';
import { Link, navigate } from '@/lib/router';
import { Doodle, ListLink } from '@/ui/kit';

/** Kenangan: taman tahunan milikmu, hari ini di tahun-tahun lalu, surat, dan cerita per lingkaran. */
export default function Kenangan() {
  const me = useMe();
  const today = useToday();
  const thisYear = Number(today.slice(0, 4));
  const [year, setYear] = useState(thisYear);
  const days = useMyDays(`${year}-01-01`, `${year}-12-31`);
  const { circles } = useCircles();
  const letters = useLetters('inbox');
  const otd = useOnThisDay(today);
  const sealed = new Set((days.data ?? []).filter((d) => d.sealedAt).map((d) => d.day));
  const frozen = new Set((days.data ?? []).filter((d) => d.frozen).map((d) => d.day));
  const total = daysInYear(year);
  const all = eachDay(`${year}-01-01`, `${year}-12-31`);
  const left = year === thisYear ? all.filter((d) => d > today).length : 0;
  const firstYear = Number(me.user.createdAt.slice(0, 4));
  const [hover, setHover] = useState<string | null>(null);

  return (
    <main className="screen">
      <h1 className="display ink mt" style={{ margin: '12px 0 4px' }}>kenangan</h1>
      <p className="small soft">Satu tanaman untuk setiap hari yang disegel. Hari yang terlewat hanya kabut.</p>

      <div className="card mt" style={{ padding: '18px 14px' }}>
        <div className="row between" style={{ marginBottom: 12 }}>
          <div className="row" style={{ gap: 0 }}>
            {year > firstYear ? <button className="icon-btn" aria-label="tahun sebelumnya" onClick={() => setYear(year - 1)}><Doodle id="ui-kembali" size={18} /></button> : null}
            <span className="title ink">{year}</span>
            {year < thisYear ? <button className="icon-btn" aria-label="tahun berikutnya" onClick={() => setYear(year + 1)}><Doodle id="ui-panah-kanan" size={18} /></button> : null}
          </div>
          <span className="small ink">{sealed.size} <span className="ink-soft">{left > 0 ? `· ${left} hari untuk tumbuh` : `dari ${total} hari tumbuh`}</span></span>
        </div>
        <div className="garden" role="grid" aria-label={`taman ${year}`}>
          {all.map((d, i) => {
            const s = sealed.has(d);
            return (
              <button
                key={d}
                className={`g ${s ? 'grown' : d < today ? 'past' : d === today ? 'today' : 'future'}`}
                disabled={d > today}
                style={s ? { animationDelay: `${Math.min(1.6, i * 0.004)}s` } : undefined}
                onClick={() => navigate(`/hari/${d}`)}
                onMouseEnter={() => setHover(d)}
                onFocus={() => setHover(d)}
                aria-label={`${formatDayLong(d)}${s ? ' · tersegel' : ''}`}>
                {s ? <Doodle id={gardenDoodleFor(gardenSeedFor(me.user.id, d)).id} size="100%" sw={3} /> : frozen.has(d) ? <Doodle id="kabut" size="80%" color="var(--ink-soft)" /> : <i />}
              </button>
            );
          })}
        </div>
        <p className="tiny soft center" style={{ marginTop: 12, minHeight: 16 }}>{hover ? formatDayLong(hover) : 'ketuk sebuah hari untuk membukanya lagi'}</p>
      </div>

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
        <span className="label">surat & kapsul waktu</span>
        <Link to="/surat" className="card row" style={{ gap: 12 }}>
          <Doodle id="surat-botol" size={36} />
          <span className="grow">
            <span className="ink" style={{ display: 'block' }}>kotak surat</span>
            <span className="tiny soft">{letters.data?.length ? `${letters.data.length} surat sudah sampai` : 'surat tersesat, surat untuk nanti, kapsul waktu'}</span>
          </span>
          <Doodle id="ui-panah-kanan" size={16} />
        </Link>
      </section>

      <section className="section">
        <span className="label">cerita per lingkaran</span>
        {circles.length === 0 ? <p className="small soft">{COPY.empty.memories}</p> : circles.map((x) => <ListLink key={x.id} icon={x.doodle} title={x.name} sub={`${x.streak.togetherDays} hari bersama`} onClick={() => navigate(`/l/${x.id}`)} />)}
      </section>

      <section className="section">
        <span className="label">rak</span>
        {circles.filter((c) => c.kind !== 'moment').map((x) => (
          <ListLink key={x.id} icon="rak-buku" title={`kitab ${x.name}`} sub="bab, adegan, dan jilid yang bisa dicetak" onClick={() => navigate(`/l/${x.id}/kitab`)} />
        ))}
        <ListLink icon="buku" title="jurnal pribadi" sub="halaman-halamanmu, termasuk yang “hanya aku”" onClick={() => navigate(`/hari/${today}`)} />
      </section>
    </main>
  );
}
