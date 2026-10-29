/**
 * Mode TV TITIP SURAT: meja dari atas. Kursi semua pemain, tumpukan, dan
 * kejadian terbaru dalam huruf besar. Tidak pernah menampilkan kartu di tangan.
 */
import { useParams } from '@/lib/router';
import { kalimat, useMeja } from '@/lib/titip';
import { QR } from '@/ui/art';
import { Doodle, Growing } from '@/ui/kit';
import { PlayerFace } from '../../sidik/parts';
import { HasilRonde } from './Meja';
import { Belakang, Kartu, Kursi } from './parts';

export default function TitipTv() {
  const { code = '' } = useParams<{ code: string }>();
  const { view } = useMeja(code.toUpperCase(), { tv: true });
  if (!view) return <Growing label="menyalakan layar…" />;
  const link = `${location.origin}/main/titip/${view.code}`;
  if (view.phase === 'lobby')
    return (
      <main className="ts-tv">
        <div className="ts-tv-lobi">
          <QR value={link} size={240} />
          <div>
            <h1>titip surat.</h1>
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
  const last = view.log.filter((e) => e.r === view.ronde).slice(-4);
  const w = view.players.find((p) => p.id === view.pemenang);
  return (
    <main className="ts-tv">
      <header className="ts-tv-atas">
        <b>
          <Doodle id="amplop" size={36} color="currentColor" /> Titip Surat · ronde {view.ronde}
        </b>
        <span>target {view.target} perangko · meja {view.code}</span>
      </header>
      <div className="ts-tv-kursi">
        {view.players.map((p) => (
          <Kursi key={p.id} p={p} v={view} />
        ))}
      </div>
      <div className="ts-tv-tengah">
        <Belakang n={view.deck} />
        {view.terbuka.map((v, i) => (
          <Kartu key={i} v={v} kecil />
        ))}
        <div className="ts-tv-kejadian">
          {last.map((e, i) => (
            <p key={e.n} className={i === last.length - 1 ? 'baru' : ''}>
              {kalimat(e, view, null).teks}
            </p>
          ))}
        </div>
      </div>
      {view.phase === 'jeda' && view.hasil ? (
        <div className="ts-layar">
          <div className="ts-layar-isi">
            <HasilRonde view={view} />
          </div>
        </div>
      ) : null}
      {view.phase === 'akhir' && w ? (
        <div className="ts-layar akhir">
          <div className="ts-layar-isi">
            <PlayerFace avatar={w.avatar} size={110} />
            <p className="sd-big-line">Surat {w.name} sampai ke Dia.</p>
            {view.hasil ? <HasilRonde view={view} /> : null}
          </div>
        </div>
      ) : null}
    </main>
  );
}
