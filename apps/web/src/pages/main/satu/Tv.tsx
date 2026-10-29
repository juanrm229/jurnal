/**
 * Mode TV KARTU SATU: semua kursi, kartu teratas besar, arah, dan kejadian.
 * Tidak pernah menampilkan kartu di tangan.
 */
import type { CSSProperties } from 'react';
import { useEffect, useRef } from 'react';
import { useParams } from '@/lib/router';
import { kalimat, useMeja, WARNA_HEX } from '@/lib/satu';
import { speak } from '@/lib/sidik';
import { QR } from '@/ui/art';
import { Doodle, Growing } from '@/ui/kit';
import { PlayerFace } from '../../sidik/parts';
import { BelakangSatu, KartuSatu, Kursi } from './parts';

export default function SatuTv() {
  const { code = '' } = useParams<{ code: string }>();
  const { view } = useMeja(code.toUpperCase(), { tv: true });
  const lastN = useRef(-1);
  useEffect(() => {
    const e = view?.log.at(-1);
    if (!view || !e) return;
    if (lastN.current >= 0 && e.n > lastN.current && view.log.some((x) => x.n > lastN.current && x.t === 'satu')) speak('Satu!');
    lastN.current = e.n;
  }, [view?.rev]);
  if (!view) return <Growing label="menyalakan layar…" />;
  const link = `${location.origin}/main/satu/${view.code}`;
  if (view.phase === 'lobby')
    return (
      <main className="ts-tv">
        <div className="ts-tv-lobi">
          <QR value={link} size={240} />
          <div>
            <h1>kartu satu.</h1>
            <p className="sd-tv-code">{view.code}</p>
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
      </main>
    );
  const w = view.players.find((p) => p.id === view.pemenang);
  const k = view.players.find((p) => p.id === view.kalah);
  return (
    <main className="ts-tv st-tv" style={{ '--warna': WARNA_HEX[view.warna] } as CSSProperties}>
      <header className="ts-tv-atas">
        <b>
          <Doodle id="kartu" size={36} color="currentColor" /> Kartu Satu · ronde {view.ronde}
        </b>
        <span>meja {view.code}</span>
      </header>
      <div className="ts-tv-kursi">
        {view.players.map((p) => (
          <Kursi key={p.id} p={p} v={view} />
        ))}
      </div>
      <div className="st-tv-tengah">
        <span className={`st-arah besar ${view.arah === 1 ? '' : 'balik'}`}>
          <Doodle id="panah-spiral" size={60} color="currentColor" />
        </span>
        <BelakangSatu n={view.draw} />
        {view.atas ? <KartuSatu c={view.atas} /> : null}
        {view.tarik > 0 ? <span className="st-tumpuk-badge besar">+{view.tarik}</span> : null}
        <div className="ts-tv-kejadian">
          {view.log.slice(-4).map((e, i, a) => (
            <p key={e.n} className={i === a.length - 1 ? 'baru' : ''}>
              {kalimat(e, view, null)}
            </p>
          ))}
        </div>
      </div>
      {view.phase === 'akhir' && (k || w) ? (
        <div className="ts-layar akhir">
          <div className="ts-layar-isi">
            <PlayerFace avatar={(k ?? w)!.avatar} size={110} />
            <p className="sd-big-line">{k ? `${k.name} yang kalah. Traktir gorengan!` : `${w!.name} menang!`}</p>
          </div>
        </div>
      ) : null}
    </main>
  );
}
