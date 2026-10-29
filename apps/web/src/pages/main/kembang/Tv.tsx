/**
 * Mode TV KEMBANG API: barisan kembang api besar, token, sumbu, dan kejadian.
 * Tidak menampilkan kartu siapa pun (supaya tidak ada yang melihat kartunya sendiri).
 */
import { hanabi as H } from '@sehari/core';
import { kalimat, useMeja } from '@/lib/hanabi';
import { useParams } from '@/lib/router';
import { QR } from '@/ui/art';
import { Doodle, Growing } from '@/ui/kit';
import { PlayerFace } from '../../sidik/parts';
import { Api, Token } from './parts';

export default function KembangTv() {
  const { code = '' } = useParams<{ code: string }>();
  const { view } = useMeja(code.toUpperCase(), { tv: true });
  if (!view) return <Growing label="menyalakan layar…" />;
  if (view.phase === 'lobby')
    return (
      <main className="ts-tv">
        <div className="ts-tv-lobi">
          <QR value={`${location.origin}/main/kembang/${view.code}`} size={240} />
          <div>
            <h1>kembang api.</h1>
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
  return (
    <main className="ts-tv kb-tv">
      <header className="ts-tv-atas">
        <b>
          <Doodle id="kembang-api" size={36} color="currentColor" /> Kembang Api
        </b>
        <span>
          skor {H.skorOf(view.api)}/{H.skorMaks(view.opts)} · giliran {view.players.find((p) => p.id === view.giliran)?.name ?? '—'}
        </span>
      </header>
      <Api v={view} />
      <Token v={view} />
      <div className="ts-tv-kejadian">
        {view.log.slice(-5).map((e, i, a) => (
          <p key={e.n} className={i === a.length - 1 ? 'baru' : ''}>
            {kalimat(e, view, null)}
          </p>
        ))}
      </div>
      {view.phase === 'akhir' ? <p className="sd-big-line">{view.sebab === 'sumbu' ? 'Pertunjukan gagal.' : `Skor ${view.skor}. ${H.ulasan(view.skor ?? 0, H.skorMaks(view.opts))}`}</p> : null}
    </main>
  );
}
