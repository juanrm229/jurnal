/**
 * Mode TV: papan kasus untuk layar besar (laptop / TV) di tengah pesta.
 * Hanya informasi publik: tersangka, laporan, timer, siapa sudah bergerak.
 * Narator berbicara dari sini.
 */
import { sidik } from '@sehari/core';
import { useEffect, useRef } from 'react';
import { useParams } from '@/lib/router';
import { sfx, speak, useCountdown, useRoom } from '@/lib/sidik';
import { QR } from '@/ui/art';
import { Growing } from '@/ui/kit';
import { Board, IntelList, PlayerFace, Timer } from './parts';

export default function Tv() {
  const { code = '' } = useParams<{ code: string }>();
  const { view, serverNow } = useRoom(code.toUpperCase(), { tv: true });
  const secs = useCountdown(view?.deadline, serverNow);
  const last = useRef('');
  useEffect(() => {
    if (!view) return;
    const k = `${view.phase}:${view.round}`;
    if (last.current === k) return;
    last.current = k;
    if (view.phase === 'intro') speak(view.story.intro, view.opts.narrator);
    if (view.phase === 'night') (sfx.night(), speak(`Malam ke-${view.round}. Semua menunduk ke layar.`, view.opts.narrator));
    if (view.phase === 'dawn') (sfx.dawn(), speak('Pagi datang. Periksa petunjuk kalian.', view.opts.narrator));
    if (view.phase === 'verdict') sfx.stamp();
  }, [view?.phase, view?.round]);
  if (!view) return <Growing label="menyalakan layar…" />;
  const link = `${location.origin}/sidik/${view.code}`;
  return (
    <main className={`sd-tv ph-${view.phase}`}>
      <header className="sd-tv-top">
        <b>
          {view.story.emoji} {view.phase === 'lobby' ? 'SIDIK' : view.story.title}
        </b>
        <span>{view.phase === 'lobby' ? `kode ${view.code}` : `${view.phase === 'night' ? '🌙 malam' : '☀️ hari'} ${view.round || ''}`}</span>
        <Timer secs={secs} />
      </header>
      {view.phase === 'lobby' ? (
        <div className="sd-tv-lobby">
          <QR value={link} size={260} />
          <div>
            <p className="sd-tv-code">{view.code}</p>
            <p>Pindai, atau buka {location.host}/sidik dan masukkan kodenya.</p>
            <div className="sd-players">
              {view.players.map((p) => (
                <span key={p.id} className="sd-player">
                  <PlayerFace avatar={p.avatar} size={56} />
                  <span>{p.name}</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="sd-tv-grid">
          <div>
            {view.phase === 'intro' ? <p className="sd-tv-story">{view.story.intro}</p> : null}
            <Board view={view} notes={{}} showHits={false} />
          </div>
          <aside>
            <div className="sd-players">
              {view.players.map((p) => (
                <span key={p.id} className={`sd-player ${p.acted ? 'acted' : ''}`}>
                  <PlayerFace avatar={p.avatar} size={44} dim={!p.acted && ['night', 'vote', 'accuse'].includes(view.phase)} />
                  <span>{p.name}</span>
                </span>
              ))}
            </div>
            <IntelList view={view} />
            {view.phase === 'end' && view.result ? (
              <p className="sd-tv-story">
                {view.result.winner === 'baik' ? '🕵️ Tim detektif menang!' : '🐍 Tim pelaku menang!'} Pelakunya: {view.suspects[view.culprit ?? 0]?.name}.
              </p>
            ) : null}
          </aside>
        </div>
      )}
      {view.phase === 'end' ? null : <span className="sd-tv-hint">{sidik.STORIES.length} kasus · SIDIK di Sehari</span>}
    </main>
  );
}
