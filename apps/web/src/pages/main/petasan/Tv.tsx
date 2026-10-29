/**
 * Mode TV KUCING PETASAN: tumpukan, peluang meledak, jendela Ogah!, dan kejadian.
 */
import { kalimat, nama, useMeja } from '@/lib/petasan';
import { useParams } from '@/lib/router';
import { QR } from '@/ui/art';
import { Doodle, Growing } from '@/ui/kit';
import { PlayerFace } from '../../sidik/parts';
import { BelakangP, KartuP } from './parts';

export default function PetasanTv() {
  const { code = '' } = useParams<{ code: string }>();
  const { view } = useMeja(code.toUpperCase(), { tv: true });
  if (!view) return <Growing label="menyalakan layar…" />;
  if (view.phase === 'lobby')
    return (
      <main className="ts-tv">
        <div className="ts-tv-lobi">
          <QR value={`${location.origin}/main/petasan/${view.code}`} size={240} />
          <div>
            <h1>kucing petasan.</h1>
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
  const persen = view.deck ? Math.round((view.petasan / view.deck) * 100) : 0;
  return (
    <main className="ts-tv kp-tv">
      <header className="ts-tv-atas">
        <b>
          <Doodle id="kembang-api" size={36} color="currentColor" /> Kucing Petasan
        </b>
        <span>
          {view.petasan} petasan · {persen}% · meja {view.code}
        </span>
      </header>
      <div className="kp-pemain besar">
        {view.players.map((p) => (
          <span key={p.id} className={`kp-chip ${view.giliran === p.id ? 'giliran' : ''} ${p.out ? 'out' : ''}`}>
            <PlayerFace avatar={p.avatar} size={44} dim={p.out} />
            <span className="kp-chip-isi">
              <b>{p.name}</b>
              <span>{p.out ? 'meledak' : `${p.kartu} kartu${view.giliran === p.id && view.sisa > 1 ? ` · ${view.sisa}×` : ''}`}</span>
            </span>
          </span>
        ))}
      </div>
      <div className="st-tv-tengah">
        <BelakangP n={view.deck} />
        {view.buang.length ? <KartuP j={view.buang[view.buang.length - 1]!.j} /> : null}
        <div className="ts-tv-kejadian">
          {view.aksi ? <p className="baru">{nama(view.aksi.j)}{view.aksi.ogah.length ? ` · ${view.aksi.ogah.length}× OGAH!` : ''}</p> : null}
          {view.log.slice(-4).map((e, i, a) => (
            <p key={e.n} className={!view.aksi && i === a.length - 1 ? 'baru' : ''}>
              {kalimat(e, view, null)}
            </p>
          ))}
        </div>
      </div>
      {w ? <p className="sd-big-line">{w.name} satu-satunya yang selamat!</p> : null}
    </main>
  );
}
