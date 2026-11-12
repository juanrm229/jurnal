/** Almanak Kota Sangkala: garis waktu peristiwa kanon, usulan warga, dan formulir usul. */
import { KOTA_SETUJU_KANON, KOTA_WILAYAH, type KotaPeristiwaWire, kotaRegion } from '@sehari/core';
import { useQueryClient } from '@tanstack/react-query';
import { type CSSProperties, useState } from 'react';
import { api } from '@/lib/api';
import { tanggal, useAlmanak, useKota } from '@/lib/kota';
import { navigate } from '@/lib/router';
import { Doodle, Growing, Header, Sheet, useToast } from '@/ui/kit';

export default function Almanak() {
  const q = useAlmanak();
  const kota = useKota();
  const qc = useQueryClient();
  const toast = useToast();
  const [usul, setUsul] = useState(false);
  if (!q.data) return <Growing label="membuka almanak…" />;
  const warga = (kota.data?.claims ?? []).some((c) => c.mine && c.state === 'aktif');
  const kanon = q.data.filter((e) => e.state === 'kanon');
  const menunggu = q.data.filter((e) => e.state === 'usul');
  const dekade = [...new Set(kanon.map((e) => Math.floor(e.year / 10) * 10))];
  const jawab = async (e: KotaPeristiwaWire, action: 'setuju' | 'tarik') => {
    try {
      const r = await api.put<{ state: string }>(`/kota/almanak/${e.id}`, { action });
      toast(r.state === 'kanon' ? 'Peristiwa ini kini tercatat di almanak.' : action === 'tarik' ? 'Usulan ditarik.' : 'Persetujuanmu tercatat.');
      void qc.invalidateQueries({ queryKey: ['kota', 'almanak'] });
    } catch (err) {
      toast((err as Error).message);
    }
  };

  return (
    <main className="screen kota-almanak">
      <Header title="Almanak Sangkala" sub={`${kanon.length} peristiwa kanon · ${menunggu.length} usulan`} backTo="/kota" />
      <p className="ka-pembuka rupa-hand">Sejarah kota yang ditulis warganya. Setiap peristiwa bisa disaksikan dari banyak rumah.</p>

      {menunggu.length ? (
        <section className="section">
          <span className="label">usulan menunggu persetujuan</span>
          <div className="col" style={{ gap: 8 }}>
            {menunggu.map((e) => (
              <article key={e.id} className="ka-usul">
                <span className="ka-tahun">{tanggal(e)}</span>
                <b>{e.title}</b>
                <p className="small">{e.body}</p>
                <span className="tiny soft">
                  diusulkan {e.proposer} · {e.endorsements} dari {KOTA_SETUJU_KANON} persetujuan · {e.regions.length ? e.regions.map((r) => kotaRegion(r)?.name).join(', ') : 'seluruh kota'}
                </span>
                <div className="row" style={{ gap: 6 }}>
                  {e.mine ? (
                    <button className="pill sm" onClick={() => void jawab(e, 'tarik')}>
                      tarik usulan
                    </button>
                  ) : warga ? (
                    <button className={`pill sm ${e.endorsedByMe ? 'active' : ''}`} disabled={e.endorsedByMe} onClick={() => void jawab(e, 'setuju')} data-testid="ka-setuju">
                      {e.endorsedByMe ? 'kamu setuju' : 'setujui sebagai sejarah kota'}
                    </button>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <section className="ka-garis">
        {dekade.map((d) => (
          <div key={d} className="ka-dekade">
            <h3>{d}-an</h3>
            {kanon
              .filter((e) => Math.floor(e.year / 10) * 10 === d)
              .map((e, i) => (
                <button key={e.id} className="ka-peristiwa" style={{ '--n': i } as CSSProperties} onClick={() => navigate(`/kota/peristiwa/${e.id}`)} data-testid="ka-peristiwa">
                  <span className="ka-tahun">{tanggal(e)}</span>
                  <span className="grow">
                    <b>{e.title}</b>
                    <span className="tiny soft">
                      {e.regions.length ? e.regions.map((r) => kotaRegion(r)?.name).join(' · ') : 'seluruh kota'}
                      {e.testimonies ? ` · ${e.testimonies} kesaksian` : ''}
                      {e.proposer ? ` · diusulkan ${e.proposer}` : ''}
                    </span>
                  </span>
                  <Doodle id="ui-panah-kanan" size={14} />
                </button>
              ))}
          </div>
        ))}
      </section>

      <div className="ka-aksi">
        <button className="btn" onClick={() => (warga ? setUsul(true) : navigate('/kota'))} data-testid="ka-usul">
          {warga ? 'usulkan peristiwa' : 'patok rumah dulu untuk mengusulkan peristiwa'}
        </button>
      </div>
      <Sheet open={usul} onClose={() => setUsul(false)} title="usulkan peristiwa">
        <FormUsul
          onDone={() => {
            setUsul(false);
            void qc.invalidateQueries({ queryKey: ['kota', 'almanak'] });
          }}
        />
      </Sheet>
    </main>
  );
}

function FormUsul({ onDone }: { onDone: () => void }) {
  const toast = useToast();
  const [title, setTitle] = useState('');
  const [year, setYear] = useState('');
  const [month, setMonth] = useState('');
  const [regions, setRegions] = useState<string[]>([]);
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const y = Number(year);
  const ok = title.trim().length >= 6 && Number.isInteger(y) && y >= 1700 && y <= 2030 && body.trim().length >= 20;
  return (
    <div className="col" style={{ gap: 10 }}>
      <input className="field" value={title} maxLength={90} onChange={(e) => setTitle(e.target.value)} placeholder="judul peristiwa, mis. Festival layang-layang pertama" data-testid="ka-judul" />
      <div className="row" style={{ gap: 8 }}>
        <input className="field" inputMode="numeric" maxLength={4} value={year} onChange={(e) => setYear(e.target.value.replace(/\D/g, ''))} placeholder="tahun" data-testid="ka-tahun" />
        <select className="field" value={month} onChange={(e) => setMonth(e.target.value)} aria-label="bulan">
          <option value="">bulan (opsional)</option>
          {['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'].map((b, i) => (
            <option key={b} value={i + 1}>
              {b}
            </option>
          ))}
        </select>
      </div>
      <span className="tiny soft">wilayah yang mengalaminya (kosongkan untuk seluruh kota)</span>
      <div className="row wrap" style={{ gap: 6 }}>
        {KOTA_WILAYAH.map((r) => (
          <button key={r.id} className={`pill sm ${regions.includes(r.id) ? 'active' : ''}`} onClick={() => setRegions(regions.includes(r.id) ? regions.filter((x) => x !== r.id) : [...regions, r.id])}>
            {r.name}
          </button>
        ))}
      </div>
      <textarea className="field" rows={4} value={body} maxLength={800} onChange={(e) => setBody(e.target.value)} placeholder="apa yang terjadi, seperti ditulis di almanak kota" data-testid="ka-isi" />
      <p className="tiny soft">Peristiwa menjadi sejarah kota setelah {KOTA_SETUJU_KANON} warga lain menyetujuinya. Hindari tokoh atau kejadian sungguhan.</p>
      <button
        className="btn"
        disabled={!ok || busy}
        onClick={async () => {
          setBusy(true);
          try {
            await api.post('/kota/almanak', { title: title.trim(), year: y, month: month ? Number(month) : undefined, regions, body: body.trim() });
            toast('Usulanmu masuk almanak. Tunggu warga lain menyetujuinya.');
            onDone();
          } catch (e) {
            toast((e as Error).message);
            setBusy(false);
          }
        }}
        data-testid="ka-kirim">
        {busy ? 'mengirim…' : 'kirim usulan'}
      </button>
    </div>
  );
}
