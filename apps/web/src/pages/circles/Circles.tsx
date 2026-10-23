import { CIRCLE_KIND_LABEL, COPY } from '@sehari/core';
import { useCircles } from '@/lib/data';
import { Link } from '@/lib/router';
import { Scene } from '@/ui/art';
import { Avatar, Doodle, Flame, Growing } from '@/ui/kit';

export default function Circles() {
  const { circles, isLoading } = useCircles();
  const live = circles.filter((x) => x.status === 'active');
  const past = circles.filter((x) => x.status !== 'active');
  return (
    <main className="screen">
      <div className="row between mt">
        <h1 className="display ink" style={{ margin: 0 }}>lingkaran</h1>
        <Link to="/l/baru" className="pill active">
          <Doodle id="ui-tambah" size={16} color="currentColor" /> baru
        </Link>
      </div>
      <p className="small soft">Kecil, dipilih, dan intim. Paling banyak delapan orang.</p>
      {isLoading ? (
        <Growing />
      ) : circles.length === 0 ? (
        <div className="col center" style={{ alignItems: 'center' }}>
          <Scene id="dua-orang" />
          <div className="h2">belum ada lingkaran</div>
          <p className="small soft">{COPY.onboarding.invite.body}</p>
          <Link to="/l/baru" className="btn auto">buat lingkaran</Link>
        </div>
      ) : (
        <div className="col mt" style={{ gap: 12 }}>
          {live.map((x, i) => (
            <Link key={x.id} to={`/l/${x.id}`} className="card col rise" style={{ animationDelay: `${i * 0.05}s`, gap: 10 }}>
              <div className="row between">
                <div className="row grow" style={{ minWidth: 0 }}>
                  <Doodle id={x.doodle} size={38} />
                  <div style={{ minWidth: 0 }}>
                    <div className="h2 ink" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{x.name}</div>
                    <div className="tiny soft">{CIRCLE_KIND_LABEL[x.kind]} · {x.active.length} orang</div>
                  </div>
                </div>
                {x.kind !== 'moment' ? <Flame level={x.streak.flame} days={x.streak.current} /> : <Doodle id="kado" size={26} />}
              </div>
              <div className="row" style={{ gap: 6 }}>
                {x.active.map((m) => <Avatar key={m.userId} doodle={m.doodle} size={28} sealed={x.todaySealed[m.userId]} title={m.penName} />)}
              </div>
              {x.rotationNeeded ? <span className="tiny ink-soft">memperbarui kunci lingkaran…</span> : null}
            </Link>
          ))}
        </div>
      )}
      {past.length ? (
        <section className="section">
          <span className="label">arsip</span>
          <div className="col">
            {past.map((x) => (
              <Link key={x.id} to={`/l/${x.id}`} className="card flat row">
                <Doodle id={x.status === 'memorial' ? 'lilin' : x.status === 'split' ? 'daun-kering' : 'kado'} size={28} />
                <span className="grow">
                  <span className="ink" style={{ display: 'block' }}>{x.name}</span>
                  <span className="tiny soft">{x.status === 'memorial' ? 'kapsul kenangan' : x.status === 'split' ? 'arsip dibekukan' : 'acara selesai'}</span>
                </span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}
      <Link to="/janji" className="sticky row mt-lg" style={{ background: 'var(--sticky-peach)', gap: 12 }}>
        <Doodle id="tangan-bergandeng" size={36} />
        <span>
          <span className="h2" style={{ display: 'block' }}>janji temu</span>
          <span className="tiny">Atur kencan atau kumpul, tandai “kita ketemu”, lalu tulis ceritanya. Bingung mau ke mana? Ada mesin acaknya.</span>
        </span>
      </Link>
      <Link to="/l/baru?kind=moment" className="sticky row mt" style={{ background: 'var(--sticky-green)', gap: 12 }}>
        <Doodle id="kado" size={36} />
        <span>
          <span className="h2" style={{ display: 'block' }}>kapsul momen</span>
          <span className="tiny">Nikahan, reuni, wisuda, trip: semua tamu menulis, lalu jadi Wrap acara.</span>
        </span>
      </Link>
    </main>
  );
}
