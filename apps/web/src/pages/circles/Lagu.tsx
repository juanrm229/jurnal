/**
 * Rak Lagu: setiap lagu yang pernah kalian tempel di halaman hari dipajang
 * seperti sampul piringan di dinding galeri putih, dan semuanya berjajar di
 * rak di bawahnya. Hanya lagu dari hari yang sudah dibuka bersama.
 */
import { addDays, formatDayLong } from '@sehari/core';
import { type CSSProperties, useMemo, useState } from 'react';
import { tiltFor } from '@/lib/board';
import { memberName, type OpenDrop, useCircle, useCircleRange, useCircles, useMe, useOpenDrops, useToday } from '@/lib/data';
import { Link, useParams } from '@/lib/router';
import { Avatar, Doodle, Empty, Growing, Header, Sheet } from '@/ui/kit';

const HUES = ['#f2c14e', '#e86a5b', '#5b8def', '#7cc47f', '#c78bd6', '#f39b6d', '#4fb6b0', '#2f2f3a'];
const hueFor = (s: string) => HUES[Math.abs([...s].reduce((h, c) => (h * 33 + c.charCodeAt(0)) | 0, 7)) % HUES.length]!;
const PROVIDER: Record<string, string> = { spotify: 'Spotify', youtube_music: 'YouTube Music', youtube: 'YouTube', apple_music: 'Apple Music', lainnya: 'tautan' };

export default function Lagu() {
  const { id = '' } = useParams<{ id: string }>();
  const circle = useCircle(id);
  const { circles } = useCircles();
  const me = useMe();
  const today = useToday();
  const q = useCircleRange(id, addDays(today, -399), today, !!circle);
  const drops = useOpenDrops(q.data?.drops);
  const [who, setWho] = useState<string | null>(null);
  const [open, setOpen] = useState<OpenDrop | null>(null);

  const songs = useMemo(
    () =>
      drops
        .filter((d) => d.wire.kind === 'song' && d.payload?.song)
        .filter((d) => !who || d.wire.authorId === who)
        .sort((a, b) => b.wire.day.localeCompare(a.wire.day)),
    [drops, who],
  );

  if (!circle) return <Growing />;
  const name = (uid: string) => memberName(circles, uid, me.user.id);
  const wall = songs.slice(0, 12);

  return (
    <main className="screen rupa-lagu">
      <Header title="rak lagu" sub={circle.name} backTo={`/l/${id}`} />

      <section className="rl-room" aria-label="dinding lagu">
        <div className="rl-wall">
          {q.isLoading ? (
            <Growing label="menggantung sampul…" />
          ) : wall.length ? (
            <div className="rl-hang">
              {wall.map((d, i) => (
                <button key={d.wire.id} className={`rl-cover rise ${i === 0 ? 'hero' : ''}`} style={{ animationDelay: `${i * 0.05}s` }} onClick={() => setOpen(d)}>
                  <Cover d={d} />
                  {i === 0 ? (
                    <span className="rl-caption">
                      <b>{d.payload!.song!.title}</b>
                      <span>{d.payload!.song!.artist}</span>
                    </span>
                  ) : null}
                </button>
              ))}
            </div>
          ) : (
            <Empty doodle="piringan-hitam" title="Dindingnya masih kosong." body="Tempel lagu yang diputar berulang di halaman hari ini. Setelah hari itu dibuka bersama, sampulnya tergantung di sini." />
          )}
        </div>
        <div className="rl-floor" aria-hidden>
          <span className="rl-bench" />
        </div>
      </section>

      <div className="chip-row">
        <button className={`pill sm ${!who ? 'active' : ''}`} onClick={() => setWho(null)}>
          semua · {drops.filter((d) => d.wire.kind === 'song').length}
        </button>
        {circle.members.map((m) => (
          <button key={m.userId} className={`pill sm ${who === m.userId ? 'active' : ''}`} onClick={() => setWho(m.userId)}>
            <Avatar doodle={m.doodle} size={18} /> {m.userId === me.user.id ? 'kamu' : m.penName}
          </button>
        ))}
      </div>

      {songs.length ? (
        <section className="section">
          <span className="label">rak · {songs.length} lagu</span>
          <div className="rl-shelf">
            {songs.map((d) => {
              const s = d.payload!.song!;
              return (
                <button key={d.wire.id} className="rl-spine" style={{ '--c': hueFor(s.title + s.artist), '--tilt': `${tiltFor(d.wire.id, 1.5)}deg` } as CSSProperties} onClick={() => setOpen(d)} title={`${s.title} · ${s.artist}`}>
                  <span>{s.title}</span>
                </button>
              );
            })}
          </div>
          <span className="rl-plank" aria-hidden />
        </section>
      ) : null}

      <Sheet open={!!open} onClose={() => setOpen(null)} title="lagu hari itu">
        {open?.payload?.song ? (
          <div className="col" style={{ gap: 12, alignItems: 'center', textAlign: 'center' }}>
            <span className="rl-cover big">
              <Cover d={open} />
            </span>
            <span className="h2 ink">{open.payload.song.title}</span>
            <span className="small ink-soft" style={{ marginTop: -8 }}>{open.payload.song.artist}</span>
            {open.payload.text ? <p className="rupa-hand" style={{ fontSize: 28, margin: 0 }}>“{open.payload.text}”</p> : null}
            <span className="tiny soft">
              ditempel {name(open.wire.authorId)} · <Link to={`/l/${id}/hari/${open.wire.day}`}>{formatDayLong(open.wire.day)}</Link>
            </span>
            <a className="btn" href={open.payload.song.url} target="_blank" rel="noreferrer" style={{ alignSelf: 'stretch' }}>
              <Doodle id="not-balok" size={18} color="currentColor" /> putar di {PROVIDER[open.payload.song.provider] ?? 'tautan'}
            </a>
          </div>
        ) : null}
      </Sheet>
    </main>
  );
}

function Cover({ d }: { d: OpenDrop }) {
  const s = d.payload!.song!;
  const [broken, setBroken] = useState(false);
  if (s.artworkUrl && !broken) return <img src={s.artworkUrl} alt="" loading="lazy" referrerPolicy="no-referrer" onError={() => setBroken(true)} />;
  // Tanpa sampul: piringan doodle dengan warna dari judulnya.
  return (
    <span className="rl-blank" style={{ '--c': hueFor(s.title + s.artist) } as CSSProperties}>
      <Doodle id="piringan-hitam" size="58%" color="#fff" />
      <span>{s.title}</span>
    </span>
  );
}
