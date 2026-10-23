/**
 * Panduan: video tutorial per fitur (direkam dari aplikasi asli) dan
 * penjelasan langkah demi langkah. Bisa dibuka tanpa masuk.
 */
import { useRef, useState } from 'react';
import { GUIDE, type GuideChapter } from '@/lib/panduan';
import { navigate } from '@/lib/router';
import { Doodle, Header } from '@/ui/kit';

const clip = (id: string) => `/panduan/${id}.mp4`;
const poster = (id: string) => `/panduan/${id}.jpg`;

export default function Panduan() {
  const [playing, setPlaying] = useState<number | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const top = useRef<HTMLVideoElement>(null);

  const playAll = (i = 0) => {
    setPlaying(i);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    requestAnimationFrame(() => top.current?.play().catch(() => {}));
  };

  return (
    <main className="screen panduan">
      <Header title="panduan" sub="video & langkah-langkah" backTo="/aku" />
      <section className="pd-hero">
        <div className="pd-player">
          {playing === null ? (
            <button className="pd-start" onClick={() => playAll(0)}>
              <img src={poster('hari')} alt="" loading="lazy" onError={(e) => (e.currentTarget.style.display = 'none')} />
              <span className="pd-play">
                <svg viewBox="0 0 24 24" width="34" height="34" aria-hidden>
                  <path d="M8 5v14l11-7z" fill="currentColor" />
                </svg>
              </span>
              <span className="pd-start-label">putar semua bab · ±12 menit</span>
            </button>
          ) : (
            <video
              ref={top}
              key={GUIDE[playing]!.id}
              src={clip(GUIDE[playing]!.id)}
              poster={poster(GUIDE[playing]!.id)}
              controls
              autoPlay
              playsInline
              onEnded={() => (playing + 1 < GUIDE.length ? setPlaying(playing + 1) : setPlaying(null))}
            />
          )}
        </div>
        <div className="col" style={{ gap: 6 }}>
          <h1 className="pd-title">Panduan Sehari</h1>
          <p className="small ink-soft" style={{ margin: 0 }}>
            {playing === null ? 'Semua fitur dijelaskan dengan suara, langsung dari aplikasinya. Atau pilih babnya di bawah.' : `Sekarang: bab ${playing + 1} · ${GUIDE[playing]!.title}`}
          </p>
          {playing !== null ? (
            <div className="row" style={{ gap: 6 }}>
              <button className="pill sm" disabled={playing === 0} onClick={() => setPlaying(playing - 1)}>
                ← bab sebelumnya
              </button>
              <button className="pill sm" disabled={playing + 1 >= GUIDE.length} onClick={() => setPlaying(playing + 1)}>
                bab berikutnya →
              </button>
            </div>
          ) : null}
        </div>
      </section>

      <section className="section">
        <span className="label">{GUIDE.length} bab</span>
        <div className="col" style={{ gap: 12 }}>
          {GUIDE.map((c, i) => (
            <Chapter key={c.id} c={c} n={i + 1} open={open === c.id} onToggle={() => setOpen(open === c.id ? null : c.id)} onPlay={() => playAll(i)} />
          ))}
        </div>
      </section>
      <p className="tiny soft center mt-lg">Video direkam dari aplikasi Sehari yang sebenarnya. Nama dan isi di dalamnya hanya contoh.</p>
    </main>
  );
}

function Chapter({ c, n, open, onToggle, onPlay }: { c: GuideChapter; n: number; open: boolean; onToggle: () => void; onPlay: () => void }) {
  return (
    <article className={`pd-ch rise ${open ? 'open' : ''}`} style={{ animationDelay: `${n * 0.03}s` }}>
      <button className="pd-ch-head" onClick={onToggle} aria-expanded={open}>
        <span className="pd-thumb">
          <img src={poster(c.id)} alt="" loading="lazy" onError={(e) => (e.currentTarget.style.display = 'none')} />
          <Doodle id={c.doodle} size={22} />
        </span>
        <span className="grow" style={{ minWidth: 0 }}>
          <span className="tiny ink-soft">bab {n}</span>
          <span className="pd-ch-title">{c.title}</span>
        </span>
        <span className="pd-chev" aria-hidden>
          {open ? '−' : '+'}
        </span>
      </button>
      {open ? (
        <div className="pd-ch-body">
          <p className="serif-italic" style={{ margin: 0 }}>
            {c.lead}
          </p>
          <video className="pd-inline" src={clip(c.id)} poster={poster(c.id)} controls playsInline preload="none" />
          <ol className="pd-steps">
            {c.steps.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ol>
          {c.tip ? (
            <div className="sticky" style={{ background: 'var(--sticky-yellow)' }}>
              <span className="small">
                <b>tip · </b>
                {c.tip}
              </span>
            </div>
          ) : null}
          <div className="row" style={{ gap: 8 }}>
            <button className="btn soft grow" onClick={onPlay}>
              putar mulai dari sini
            </button>
            {c.try ? (
              <button className="btn grow" onClick={() => navigate(c.try!.to)}>
                {c.try.label}
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </article>
  );
}
