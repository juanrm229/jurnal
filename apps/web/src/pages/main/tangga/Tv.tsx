/**
 * Mode TV ULAR TANGGA: papan besar di layar bersama, dengan dadu & kejadian.
 */
import { useParams } from '@/lib/router';
import { kalimat, useMeja } from '@/lib/tangga';
import { QR } from '@/ui/art';
import { Doodle, Growing } from '@/ui/kit';
import { PlayerFace } from '../../sidik/parts';
import { Dadu, Papan } from './parts';

export default function TanggaTv() {
  const { code = '' } = useParams<{ code: string }>();
  const { view } = useMeja(code.toUpperCase(), { tv: true });
  if (!view) return <Growing label="menyalakan layar…" />;
  if (view.phase === 'lobby')
    return (
      <main className="ts-tv">
        <div className="ts-tv-lobi">
          <QR value={`${location.origin}/main/tangga/${view.code}`} size={240} />
          <div>
            <h1>ular tangga.</h1>
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
  const lemparN = view.log.filter((e) => e.t === 'lempar').at(-1)?.n ?? 0;
  return (
    <main className="ts-tv tg-tv">
      <div className="tg-tv-papan">
        <Papan v={view} />
      </div>
      <aside className="tg-tv-samping">
        <b className="tg-tv-judul">
          <Doodle id="ui-dadu" size={34} color="currentColor" /> ronde {view.ronde}
        </b>
        <p>Giliran: {view.players.find((p) => p.id === view.giliran)?.name ?? '—'}</p>
        {view.dadu ? (
          <div className="tg-dadu-baris">
            {view.dadu.map((d, i) => (
              <Dadu key={`${lemparN}-${i}`} n={d} kocok />
            ))}
          </div>
        ) : null}
        <div className="ts-tv-kejadian">
          {view.log.slice(-5).map((e, i, a) => (
            <p key={e.n} className={i === a.length - 1 ? 'baru' : ''}>
              {kalimat(e, view, null)}
            </p>
          ))}
        </div>
        {w ? <p className="sd-big-line">{w.name} sampai di 100!</p> : null}
      </aside>
    </main>
  );
}
