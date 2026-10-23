/** Semua janji temu: yang akan datang (dengan hitung mundur) dan kenangan janji. */
import { useEffect, useState } from 'react';
import { useCircles, useMe } from '@/lib/data';
import { countdown, fmtWhen, type OpenMeet, useMeets } from '@/lib/meets';
import { Link } from '@/lib/router';
import { Scene } from '@/ui/art';
import { Avatar, Doodle, Growing, Header } from '@/ui/kit';

export function useNow(ms = 30_000) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return now;
}

export default function Janji() {
  const { meets, isLoading } = useMeets();
  const { circles } = useCircles();
  const now = useNow();
  const live = meets.filter((m) => m.plan && m.wire.status !== 'cancelled');
  const upcoming = live.filter((m) => new Date(m.wire.startsAt).getTime() > now - 6 * 3600_000 && m.wire.status === 'planned').sort((a, b) => a.wire.startsAt.localeCompare(b.wire.startsAt));
  const past = live.filter((m) => !upcoming.includes(m));
  const met = live.filter((m) => m.wire.members.filter((x) => x.metAt).length >= 2).length;

  return (
    <main className="screen">
      <Header title="janji temu" backTo="/lingkaran" />
      <div className="janji-hero">
        <Scene id="dua-orang" />
        <p className="lede center" style={{ margin: '0 auto' }}>
          Atur kencan atau kumpul kecil. Saat sudah di tempat, saling tandai “kita ketemu” — lalu tulis ceritanya bersama.
        </p>
        <div className="row mt" style={{ justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link to="/janji/baru" className="btn auto">
            <Doodle id="ui-kalender" size={20} color="currentColor" /> buat janji
          </Link>
          <Link to="/janji/acak" className="btn soft auto">
            <Doodle id="ui-dadu" size={20} color="currentColor" /> bingung mau ke mana?
          </Link>
        </div>
        {met ? <p className="tiny soft center mt">{met} kali bertemu dan tercatat di sini</p> : null}
      </div>

      {isLoading ? (
        <Growing />
      ) : (
        <>
          <section className="section">
            <span className="label">akan datang</span>
            {upcoming.length === 0 ? <p className="small soft">Belum ada janji. Sesekali, ajak dia keluar tanpa alasan.</p> : null}
            <div className="col" style={{ gap: 12 }}>
              {upcoming.map((m) => (
                <MeetCard key={m.wire.id} m={m} now={now} circle={circles.find((c) => c.id === m.wire.circleId)?.name ?? ''} />
              ))}
            </div>
          </section>
          {past.length ? (
            <section className="section">
              <span className="label">kenangan janji</span>
              <div className="col" style={{ gap: 12 }}>
                {past.map((m) => (
                  <MeetCard key={m.wire.id} m={m} now={now} circle={circles.find((c) => c.id === m.wire.circleId)?.name ?? ''} past />
                ))}
              </div>
            </section>
          ) : null}
        </>
      )}
    </main>
  );
}

export function MeetCard({ m, now, circle, past }: { m: OpenMeet; now: number; circle: string; past?: boolean }) {
  const me = useMe();
  const { circles } = useCircles();
  const people = circles.find((c) => c.id === m.wire.circleId)?.members ?? [];
  const metCount = m.wire.members.filter((x) => x.metAt).length;
  const photos = m.entries.filter((e) => e.data?.kind === 'photo').length;
  const stories = m.entries.filter((e) => e.data?.kind === 'story').length;
  const mine = m.wire.members.find((x) => x.userId === me.user.id);
  return (
    <Link to={`/janji/${m.wire.id}`} className={`meet-card ${past ? 'past' : ''}`}>
      <div className="meet-date">
        <span className="meet-day">{fmtWhen(m.wire.startsAt, { day: 'numeric' })}</span>
        <span className="meet-mon">{fmtWhen(m.wire.startsAt, { month: 'short' })}</span>
      </div>
      <div className="grow" style={{ minWidth: 0 }}>
        <div className="meet-title">{m.plan?.title}</div>
        <div className="tiny soft">
          {m.plan?.place.name} · {fmtWhen(m.wire.startsAt, { hour: '2-digit', minute: '2-digit' })} · {circle}
        </div>
        <div className="row mt" style={{ gap: 6, flexWrap: 'wrap' }}>
          {past ? (
            <>
              {metCount >= 2 ? <span className="badge pub">ketemu</span> : <span className="badge">selesai</span>}
              {photos ? <span className="tiny ink-soft">{photos} foto</span> : null}
              {stories ? <span className="tiny ink-soft">{stories} cerita</span> : null}
            </>
          ) : (
            <>
              <span className="badge pub">{countdown(m.wire.startsAt, now)}</span>
              {!mine?.rsvp ? <span className="tiny ink">belum jawab ikut?</span> : null}
            </>
          )}
        </div>
      </div>
      <div className="row" style={{ gap: 0 }}>
        {m.wire.members
          .filter((x) => x.rsvp === 'yes' || x.metAt)
          .slice(0, 3)
          .map((x) => (
            <span key={x.userId} style={{ marginLeft: -8 }}>
              <Avatar doodle={people.find((p) => p.userId === x.userId)?.doodle ?? 'tunas'} size={30} sealed={!!x.metAt} />
            </span>
          ))}
      </div>
    </Link>
  );
}
