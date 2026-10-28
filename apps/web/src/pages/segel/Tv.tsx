/**
 * Mode TV SEBELUM DISEGEL: papan publik untuk layar besar. Hanya informasi
 * publik: papan, sertifikat fakta, teori yang sudah dibuka, siapa sudah bergerak.
 */
import { segel } from '@sehari/core';
import { useEffect, useRef } from 'react';
import { useParams } from '@/lib/router';
import { anchorLabel, dimOfView, temaOfView, useMeja } from '@/lib/segel';
import { sfx, speak, useCountdown } from '@/lib/sidik';
import { QR } from '@/ui/art';
import { Doodle, Growing } from '@/ui/kit';
import { PlayerFace, Timer } from '../sidik/parts';
import { Berkas, Jangkar, Kabar } from './parts';

export default function SegelTv() {
  const { code = '' } = useParams<{ code: string }>();
  const { view, serverNow } = useMeja(code.toUpperCase(), { tv: true });
  const secs = useCountdown(view?.deadline, serverNow);
  const last = useRef('');
  useEffect(() => {
    if (!view) return;
    const k = `${view.phase}:${view.bab}`;
    if (last.current === k) return;
    last.current = k;
    const tm = temaOfView(view);
    if (view.phase === 'intro') speak(tm.pembuka.replace('{obj}', tm.obj).replace('{asal}', tm.asal), view.opts.narrator);
    if (view.phase === 'aksi') (sfx.night(), speak(`Bab ${view.bab}. Kunci satu aksi.`, view.opts.narrator));
    if (view.phase === 'runding') sfx.dawn();
    if (view.phase === 'vonis') sfx.stamp();
  }, [view?.phase, view?.bab]);
  if (!view) return <Growing label="menyalakan layar…" />;
  const tm = temaOfView(view);
  const link = `${location.origin}/segel/${view.code}`;
  const ws = view.dim ? segel.worlds(dimOfView(view), view.board.filter((b) => !b.umpan && !b.bantah).map((b) => ({ f: b.c.f, blur: b.c.blur }))) : [];
  return (
    <main className={`sd-tv sg-tv ph-${view.phase}`}>
      <header className="sd-tv-top">
        <b>
          <Doodle id={view.phase === 'lobby' ? 'segel-lilin' : tm.doodle} size={44} color="currentColor" /> {view.phase === 'lobby' ? 'sebelum disegel.' : tm.judul}
        </b>
        <span className="sd-ico">{view.phase === 'lobby' ? `kode ${view.code}` : view.bab ? `bab ${view.bab} · ${view.phase}` : view.phase}</span>
        <Timer secs={secs} />
      </header>
      {view.phase === 'lobby' ? (
        <div className="sd-tv-lobby">
          <QR value={link} size={260} />
          <div>
            <p className="sd-tv-code">{view.code}</p>
            <p>Pindai, atau buka {location.host}/segel dan masukkan kodenya.</p>
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
            {view.phase === 'intro' ? <p className="sd-tv-story">{tm.pembuka.replace('{obj}', tm.obj).replace('{asal}', tm.asal)}</p> : null}
            {view.dim ? <Jangkar v={view} ws={ws} /> : null}
            <div className="sg-tv-board">
              {[...view.board].reverse().map((b) => (
                <Berkas key={b.id} v={view} c={b.c} pub={b} />
              ))}
            </div>
          </div>
          <aside>
            <div className="sd-players">
              {view.players.map((p) => (
                <span key={p.id} className={`sd-player ${p.done ? 'acted' : ''}`}>
                  <PlayerFace avatar={p.avatar} size={44} dim={!p.done} />
                  <span>{p.name}</span>
                </span>
              ))}
            </div>
            {view.certs.map((c) => (
              <p key={c.id} className="sd-tv-story">
                Fakta terbukti: {segel.ANCHOR_NAME[c.a]} = {anchorLabel(tm, c.a, c.v)}
              </p>
            ))}
            <Kabar v={view} only="public" />
            {view.phase === 'end' && view.result && view.reveal ? (
              <p className="sd-tv-story">
                {view.result.winner === 'restorasi' ? 'Arsip disegel.' : 'Arsip tercemar.'} {segel.worldText(tm, view.reveal.w)}.
              </p>
            ) : null}
          </aside>
        </div>
      )}
    </main>
  );
}
