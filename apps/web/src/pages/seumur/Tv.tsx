/**
 * Mode TV SEUMUR: satu layar besar di tengah meja. Langit, lilin, lingkaran
 * napas besar, dan garis hidup yang tumbuh. Tidak menampilkan kartu siapa pun.
 */
import { seumur } from '@sehari/core';
import { useEffect, useRef } from 'react';
import { useParams } from '@/lib/router';
import { bunyi, bunyiPadam, nadaUsia, useMeja } from '@/lib/seumur';
import { QR } from '@/ui/art';
import { Doodle, Growing } from '@/ui/kit';
import { PlayerFace } from '../sidik/parts';
import { GarisHidup, Lilin, Meja, Napas } from './parts';

export default function SeumurTv() {
  const { code = '' } = useParams<{ code: string }>();
  const { view, serverNow } = useMeja(code.toUpperCase(), { tv: true });
  const lastN = useRef(0);
  useEffect(() => {
    const k = view?.kejadian;
    if (!view || !k || k.n === lastN.current) return;
    const first = lastN.current === 0;
    lastN.current = k.n;
    if (first || !view.opts.suara) return;
    if (k.jenis === 'letak' && k.kartu) bunyi(nadaUsia(seumur.momenOf(k.kartu)!.usia));
    if (k.jenis === 'padam') bunyiPadam();
  }, [view?.kejadian?.n]);
  if (!view) return <Growing label="menyalakan layar…" />;
  const link = `${location.origin}/seumur/${view.code}`;
  const langit = view.phase === 'lobby' || view.phase === 'mulai' ? 'subuh' : view.babInfo.id;
  return (
    <main className={`sm-tv ph-${view.phase}`} data-langit={langit}>
      <div className="sm-langit" aria-hidden>
        <span className="sm-bintang" />
      </div>
      {view.phase === 'lobby' ? (
        <div className="sm-tv-lobi">
          <QR value={link} size={240} />
          <div>
            <h1>seumur.</h1>
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
      ) : (
        <>
          <header className="sm-tv-atas">
            <b>
              <Doodle id={view.babInfo.doodle} size={36} color="currentColor" /> {view.babInfo.nama}
            </b>
            <Lilin n={view.lilin} max={view.lilinMax} />
          </header>
          <div className="sm-tv-napas">
            <Napas serverNow={serverNow} size={300} />
          </div>
          <GarisHidup v={view} />
          <Meja v={view} mode={view.phase === 'fokus' ? 'fokus' : 'napas'} />
          {view.phase === 'akhir' ? <p className="sm-tv-akhir">{view.selesai === 'utuh' ? 'Satu kehidupan utuh.' : `Berhenti di usia ${view.berhentiUsia}.`}</p> : null}
        </>
      )}
    </main>
  );
}
