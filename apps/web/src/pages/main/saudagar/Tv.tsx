/**
 * Mode TV SAUDAGAR: papan besar, uang semua orang, dan lelang yang sedang berjalan.
 */
import type { CSSProperties } from 'react';
import { useParams } from '@/lib/router';
import { kalimat, rp, useMeja, WARNA_PEMAIN } from '@/lib/saudagar';
import { QR } from '@/ui/art';
import { Doodle, Growing } from '@/ui/kit';
import { PlayerFace } from '../../sidik/parts';
import { Dadu } from '../tangga/parts';
import { Papan } from './parts';

export default function SaudagarTv() {
  const { code = '' } = useParams<{ code: string }>();
  const { view } = useMeja(code.toUpperCase(), { tv: true });
  if (!view) return <Growing label="menyalakan layar…" />;
  if (view.phase === 'lobby')
    return (
      <main className="ts-tv">
        <div className="ts-tv-lobi">
          <QR value={`${location.origin}/main/saudagar/${view.code}`} size={240} />
          <div>
            <h1>saudagar.</h1>
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
  const lemparN = view.log.filter((e) => e.t === 'lempar').at(-1)?.n ?? 0;
  const w = view.players.find((p) => p.id === view.pemenang);
  return (
    <main className="ts-tv tg-tv sg-tv">
      <div className="tg-tv-papan">
        <Papan v={view}>
          <span className="sg-logo">saudagar.</span>
          {view.dadu ? (
            <span className="tg-dadu-baris">
              {view.dadu.map((d, i) => (
                <Dadu key={`${lemparN}-${i}`} n={d} kocok />
              ))}
            </span>
          ) : null}
          {view.lelang ? <span className="sg-pot">LELANG: {rp(view.lelang.tawar)}</span> : null}
          {view.opts.parkir && view.pot ? <span className="sg-pot">jackpot {rp(view.pot)}</span> : null}
        </Papan>
      </div>
      <aside className="tg-tv-samping">
        {view.players.map((p, i) => (
          <span key={p.id} className={`sg-chip besar ${view.giliran === p.id ? 'giliran' : ''} ${p.bangkrut ? 'bangkrut' : ''}`} style={{ '--c': WARNA_PEMAIN[i % WARNA_PEMAIN.length] } as CSSProperties}>
            <PlayerFace avatar={p.avatar} size={34} dim={p.bangkrut} />
            <span className="sg-chip-isi">
              <b>{p.name}</b>
              <span>{p.bangkrut ? 'bangkrut' : `${rp(p.uang)} · kekayaan ${rp(p.kekayaan)}`}</span>
            </span>
            {p.penjara >= 0 ? <Doodle id="ui-gembok" size={18} color="currentColor" /> : null}
          </span>
        ))}
        <div className="ts-tv-kejadian">
          {view.log.slice(-4).map((e, i, a) => (
            <p key={e.n} className={i === a.length - 1 ? 'baru' : ''}>
              {kalimat(e, view, null)}
            </p>
          ))}
        </div>
        {w ? <p className="sd-big-line">{w.name} saudagar terkaya!</p> : null}
      </aside>
    </main>
  );
}
