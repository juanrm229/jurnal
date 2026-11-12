/** Halaman rumah di Kota: sampul dari peta, keluarga, dan bab-bab yang sudah terbit. */
import { kotaPlot, kotaRegion } from '@sehari/core';
import { useState } from 'react';
import { api } from '@/lib/api';
import { kotaCrop, useKotaClaim, useKotaRefresh } from '@/lib/kota';
import { firstLine, povColor, useNaskah, useNaskahModel } from '@/lib/naskah';
import { navigate, useParams } from '@/lib/router';
import { Doodle, Growing, Sheet, useToast } from '@/ui/kit';

const ALASAN = { 'data-pribadi': 'memuat data pribadi orang sungguhan', pelecehan: 'pelecehan atau kebencian', spam: 'spam atau iklan', lainnya: 'lainnya' } as const;

export default function Rumah() {
  const { id } = useParams<{ id: string }>();
  const q = useKotaClaim(id);
  const c = q.data;
  const ms = useNaskah(c?.msId ?? '');
  const m = useNaskahModel(c ? ms.data : undefined);
  const toast = useToast();
  const refresh = useKotaRefresh();
  const [lapor, setLapor] = useState(false);
  if (!c) return q.isError ? <Growing label="rumah ini tidak ditemukan" /> : <Growing label="mengetuk pintu…" />;
  const plot = kotaPlot(c.plotId);
  const region = kotaRegion(c.regionId);
  const scenes = (m?.scenes ?? []).filter((s) => s.status === 'terbit' && s.p);
  const chapters = [...new Set(scenes.map((s) => s.chapter))].sort((a, b) => a - b);

  return (
    <main className="kota-rumah">
      <div className="kr-sampul" style={kotaCrop(c.plotId, 420, 300, 4.2)}>
        <span className="kpt-tanda" aria-hidden />
        <div className="kr-sampul-kabut" aria-hidden />
        <button className="kp-glass kp-back" aria-label="kembali ke peta" onClick={() => navigate('/kota')}>
          <Doodle id="ui-kembali" size={20} />
        </button>
        <span className="kp-glass kr-era">
          {c.from}–{c.to}
        </span>
      </div>
      <div className="kr-isi">
        <span className="kp-musim">
          {plot?.address} · {region?.name}
        </span>
        <h1 className="kr-judul">{c.household}</h1>
        {m?.meta.logline ? <p className="kr-logline">{m.meta.logline}</p> : null}
        <span className="small soft">
          oleh <b className="kr-pena">{c.penName}</b> · {c.scenes} adegan
        </span>
        {c.state === 'terbengkalai' ? <p className="tiny kr-desas">Belum ada adegan terbit. Keluarga ini sekarang tinggal sebagai desas-desus di gang.</p> : null}

        {m?.tokoh.length ? (
          <div className="kr-penghuni">
            {m.tokoh.map((t) => (
              <span key={t.id} className="kr-wajah" style={{ background: povColor(m, t.id) }} title={t.p.name}>
                {t.p.name.slice(0, 1)}
              </span>
            ))}
            <span className="small soft">{m.tokoh.map((t) => t.p.name).join(', ')}</span>
          </div>
        ) : null}

        {chapters.length ? (
          <section className="kr-bab">
            {chapters.map((ch) => (
              <div key={ch}>
                <span className="label">bab {ch}</span>
                {scenes
                  .filter((s) => s.chapter === ch)
                  .map((s) => (
                    <button key={s.id} className="kr-adegan" onClick={() => navigate(`/naskah/${c.msId}/a/${s.id}`)} data-testid="kota-adegan">
                      <span className="kr-adegan-waktu tiny">{s.p!.when.label || '—'}</span>
                      <span className="grow">
                        <b style={{ color: m ? povColor(m, s.p!.pov) : undefined }}>{m?.nameOf(s.p!.pov)}</b>
                        <span className="small">{s.p!.title ?? firstLine(s.p!.text, 80)}</span>
                      </span>
                    </button>
                  ))}
              </div>
            ))}
          </section>
        ) : (
          <p className="small soft kr-kosong">{c.mine ? 'Rumahmu masih sunyi. Tulis adegan pertama: siapa yang pertama menyalakan lampu di rumah ini?' : 'Rumah ini belum bercerita.'}</p>
        )}

        <div className="kr-aksi">
          {c.mine ? (
            <>
              <button className="btn" onClick={() => navigate(`/naskah/${c.msId}`)} data-testid="kota-tulis">
                <Doodle id="pena" size={18} color="currentColor" /> tulis di studio
              </button>
              <button
                className="btn ghost"
                onClick={async () => {
                  if (!confirm('Lepaskan rumah ini? Persilnya lowong lagi; naskahmu tetap tersimpan di studio, hanya untukmu.')) return;
                  await api.del(`/kota/claims/${c.id}`);
                  void refresh();
                  navigate('/kota', { replace: true });
                }}>
                lepaskan rumah
              </button>
            </>
          ) : (
            <>
              {scenes[0] ? (
                <button className="btn" onClick={() => navigate(`/naskah/${c.msId}/a/${scenes[0]!.id}`)}>
                  baca dari awal
                </button>
              ) : null}
              <button className="btn ghost" onClick={() => setLapor(true)} data-testid="kota-lapor">
                laporkan rumah ini
              </button>
            </>
          )}
        </div>
      </div>
      <Sheet open={lapor} onClose={() => setLapor(false)} title="laporkan rumah">
        <div className="col" style={{ gap: 8 }}>
          <p className="small soft">Laporan tidak memberi tahu pemilik siapa pelapornya. Rumah disembunyikan setelah beberapa warga melapor.</p>
          {(Object.keys(ALASAN) as (keyof typeof ALASAN)[]).map((k) => (
            <button
              key={k}
              className="btn soft"
              onClick={async () => {
                try {
                  await api.post(`/kota/claims/${c.id}/report`, { reason: k });
                  toast('Terima kasih. Laporanmu tercatat.');
                } catch (e) {
                  toast((e as Error).message);
                }
                setLapor(false);
              }}>
              {ALASAN[k]}
            </button>
          ))}
        </div>
      </Sheet>
    </main>
  );
}
