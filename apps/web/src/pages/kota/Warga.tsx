/**
 * Buku Warga Kota: figuran kota bersama. Siapa pun boleh menulis perjumpaan
 * dengan mereka; perubahan besar (wafat, pindah, fakta baru) sah lewat warga.
 */
import { KOTA_SETUJU_KANON, KOTA_WILAYAH, type KotaFigurWire, type KotaUbahWire, kotaRegion, kotaTitikFigur } from '@sehari/core';
import { useQueryClient } from '@tanstack/react-query';
import { type CSSProperties, useState } from 'react';
import { api } from '@/lib/api';
import { kotaCropAt, masaHidup, useFigur, useKota, useWargaKota } from '@/lib/kota';
import { firstLine } from '@/lib/naskah';
import { navigate, useParams } from '@/lib/router';
import { Doodle, Growing, Header, Sheet, useToast } from '@/ui/kit';

const useWarga = () => {
  const kota = useKota();
  return (kota.data?.claims ?? []).some((c) => c.mine && c.state === 'aktif');
};

function useSetuju() {
  const qc = useQueryClient();
  const toast = useToast();
  return async (path: string, action: 'setuju' | 'tarik') => {
    try {
      const r = await api.put<{ state: string }>(path, { action });
      toast(r.state === 'kanon' ? 'Kini tercatat sebagai kanon kota.' : action === 'tarik' ? 'Usulan ditarik.' : 'Persetujuanmu tercatat.');
      void qc.invalidateQueries({ queryKey: ['kota', 'warga'] });
    } catch (e) {
      toast((e as Error).message);
    }
  };
}

export default function Warga() {
  const q = useWargaKota();
  const warga = useWarga();
  const setuju = useSetuju();
  const [usul, setUsul] = useState(false);
  const qc = useQueryClient();
  if (!q.data) return <Growing label="membuka buku warga…" />;
  const kanon = q.data.filter((f) => f.state === 'kanon');
  const menunggu = q.data.filter((f) => f.state === 'usul');
  return (
    <main className="screen kota-warga">
      <Header title="Buku Warga Kota" sub={`${kanon.length} figuran kota · ${menunggu.length} usulan`} backTo="/kota/almanak" />
      <nav className="ka-tab" aria-label="almanak kota">
        <button onClick={() => navigate('/kota/almanak', { replace: true })}>peristiwa</button>
        <button className="on">warga kota</button>
      </nav>
      <p className="ka-pembuka rupa-hand">Orang-orang yang dikenal seluruh kota. Siapa pun boleh berjumpa dengan mereka; nasib mereka diputuskan bersama.</p>
      {menunggu.length ? (
        <section className="section">
          <span className="label">usulan figuran baru</span>
          {menunggu.map((f) => (
            <article key={f.id} className="ka-usul">
              <b>{f.name}</b>
              <span className="tiny soft">
                {f.julukan ? `${f.julukan} · ` : ''}
                {kotaRegion(f.region)?.name} · diusulkan {f.proposer} · {f.endorsements} dari {KOTA_SETUJU_KANON} persetujuan
              </span>
              <p className="small">{f.ciri}</p>
              <div className="row" style={{ gap: 6 }}>
                {f.mine ? (
                  <button className="pill sm" onClick={() => void setuju(`/kota/warga/${f.id}`, 'tarik')}>
                    tarik usulan
                  </button>
                ) : warga ? (
                  <button className={`pill sm ${f.endorsedByMe ? 'active' : ''}`} disabled={f.endorsedByMe} onClick={() => void setuju(`/kota/warga/${f.id}`, 'setuju')}>
                    {f.endorsedByMe ? 'kamu setuju' : 'setujui sebagai warga kota'}
                  </button>
                ) : null}
              </div>
            </article>
          ))}
        </section>
      ) : null}
      <section className="kw-daftar">
        {kanon.map((f, i) => (
          <button key={f.id} className="kw-kartu" style={{ '--n': i } as CSSProperties} onClick={() => navigate(`/kota/warga/${f.id}`)} data-testid="kw-figur">
            <span className="kw-inisial" aria-hidden>
              {f.name.replace(/^(dr\.|Pak|Bu|Mbah|Wak|Ma|Bang|Koh|Nyai|Cik)\s+/i, '').slice(0, 1)}
            </span>
            <span className="grow">
              <b>{f.name}</b>
              <span className="kw-julukan">{f.julukan}</span>
              <span className="tiny soft">
                {f.tempat} · {masaHidup(f)}
                {f.jumpa ? ` · ${f.jumpa} perjumpaan` : ''}
              </span>
            </span>
            {f.died ? <span className="kw-wafat" aria-label="sudah wafat">†</span> : null}
          </button>
        ))}
      </section>
      <div className="ka-aksi">
        <button className="btn" onClick={() => (warga ? setUsul(true) : navigate('/kota'))} data-testid="kw-usul">
          {warga ? 'usulkan figuran kota' : 'patok rumah dulu untuk mengusulkan'}
        </button>
      </div>
      <Sheet open={usul} onClose={() => setUsul(false)} title="usulkan figuran kota">
        <FigurBaru
          onDone={() => {
            setUsul(false);
            void qc.invalidateQueries({ queryKey: ['kota', 'warga'] });
          }}
        />
      </Sheet>
    </main>
  );
}

function FigurBaru({ onDone }: { onDone: () => void }) {
  const toast = useToast();
  const [f, setF] = useState({ name: '', julukan: '', region: 'lorongsumbu', tempat: '', ciri: '', born: '', died: '', tetap: '' });
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });
  const ok = f.name.trim().length >= 3 && f.tempat.trim().length >= 3 && f.ciri.trim().length >= 20;
  return (
    <div className="col" style={{ gap: 10 }}>
      <input className="field" value={f.name} maxLength={60} onChange={set('name')} placeholder="nama atau sebutan, mis. Cik Nur" data-testid="kw-nama" />
      <input className="field" value={f.julukan} maxLength={80} onChange={set('julukan')} placeholder="julukan, mis. penjual kue putu" />
      <select className="field" value={f.region} onChange={set('region')} aria-label="wilayah tempat ia biasa ditemui">
        {KOTA_WILAYAH.map((r) => (
          <option key={r.id} value={r.id}>
            {r.name}
          </option>
        ))}
      </select>
      <input className="field" value={f.tempat} maxLength={120} onChange={set('tempat')} placeholder="tempat ia biasa ditemui" data-testid="kw-tempat" />
      <textarea className="field" rows={3} value={f.ciri} maxLength={600} onChange={set('ciri')} placeholder="ciri yang dikenal semua orang" data-testid="kw-ciri" />
      <div className="row" style={{ gap: 8 }}>
        <input className="field" inputMode="numeric" maxLength={4} value={f.born} onChange={set('born')} placeholder="lahir" />
        <input className="field" inputMode="numeric" maxLength={4} value={f.died} onChange={set('died')} placeholder="wafat (kosongkan)" />
      </div>
      <textarea className="field" rows={2} value={f.tetap} maxLength={600} onChange={set('tetap')} placeholder="hal yang tak boleh diubah satu rumah sendirian (satu per baris)" />
      <p className="tiny soft">Figuran kota menjadi kanon setelah {KOTA_SETUJU_KANON} warga lain menyetujuinya. Jangan memakai orang sungguhan.</p>
      <button
        className="btn"
        disabled={!ok || busy}
        onClick={async () => {
          setBusy(true);
          try {
            await api.post('/kota/warga', {
              name: f.name.trim(),
              julukan: f.julukan.trim() || undefined,
              region: f.region,
              tempat: f.tempat.trim(),
              ciri: f.ciri.trim(),
              born: Number(f.born) || undefined,
              died: Number(f.died) || undefined,
              tetap: f.tetap.split('\n').map((x) => x.trim()).filter((x) => x.length >= 5).slice(0, 5),
            });
            toast('Usulanmu masuk Buku Warga. Tunggu warga lain menyetujuinya.');
            onDone();
          } catch (e) {
            toast((e as Error).message);
            setBusy(false);
          }
        }}
        data-testid="kw-kirim">
        {busy ? 'mengirim…' : 'kirim usulan'}
      </button>
    </div>
  );
}

const UBAH_LABEL = { wafat: 'wafat', pindah: 'pindah', fakta: 'fakta baru' } as const;

export function Figur() {
  const { id } = useParams<{ id: string }>();
  const q = useFigur(id);
  const warga = useWarga();
  const setuju = useSetuju();
  const [ubah, setUbah] = useState(false);
  const qc = useQueryClient();
  if (!q.data) return q.isError ? <Growing label="figuran ini tidak ditemukan" /> : <Growing label="membuka lembar warga…" />;
  const { figur: f, perjumpaan } = q.data;
  const kanon = f.ubah.filter((u) => u.state === 'kanon');
  const usul = f.ubah.filter((u) => u.state === 'usul');
  return (
    <main className="screen kota-figur">
      <Header title={f.name} sub={f.julukan} backTo="/kota/warga" />
      {(() => {
        const p = kotaTitikFigur(f);
        return p ? (
          <button className="kw-peta" style={kotaCropAt(p[0], p[1], 358, 150, 2.6)} onClick={() => navigate('/kota')} aria-label={`${f.name} biasa ditemui di ${f.tempat}`} data-testid="kw-peta">
            <span className="kw-peta-tanda" aria-hidden />
            <span className="kw-peta-ket tiny">
              {f.tempat} · {masaHidup(f) || 'masa hidup tak tercatat'}
            </span>
          </button>
        ) : null;
      })()}
      <article className="kw-lembar">
        <span className="kw-cap" aria-hidden>
          BUKU WARGA KOTA SANGKALA
        </span>
        <dl>
          <dt>tempat biasa</dt>
          <dd>
            {f.tempat} · {kotaRegion(f.region)?.name}
          </dd>
          <dt>masa hidup</dt>
          <dd>{masaHidup(f) || 'tak tercatat'}</dd>
          <dt>ciri</dt>
          <dd>{f.ciri}</dd>
        </dl>
        {f.tetap.length ? (
          <div className="kw-tetap">
            <span>yang tak boleh diubah satu rumah sendirian</span>
            <ul>
              {f.tetap.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </article>

      {kanon.length ? (
        <section className="section">
          <span className="label">riwayat yang disepakati</span>
          {kanon.map((u) => (
            <p key={u.id} className="kw-riwayat">
              <b>{UBAH_LABEL[u.kind]}</b>
              {u.year ? ` · ${u.year}` : ''} — {u.text}
            </p>
          ))}
        </section>
      ) : null}

      {usul.length ? (
        <section className="section">
          <span className="label">usulan perubahan besar</span>
          {usul.map((u: KotaUbahWire) => (
            <article key={u.id} className="ka-usul">
              <b>
                {UBAH_LABEL[u.kind]}
                {u.year ? ` · ${u.year}` : ''}
              </b>
              <p className="small">{u.text}</p>
              <span className="tiny soft">
                diusulkan {u.proposer} · {u.endorsements} dari {KOTA_SETUJU_KANON} persetujuan
              </span>
              <div className="row" style={{ gap: 6 }}>
                {u.mine ? (
                  <button className="pill sm" onClick={() => void setuju(`/kota/ubah/${u.id}`, 'tarik').then(() => q.refetch())}>
                    tarik usulan
                  </button>
                ) : warga ? (
                  <button className={`pill sm ${u.endorsedByMe ? 'active' : ''}`} disabled={u.endorsedByMe} onClick={() => void setuju(`/kota/ubah/${u.id}`, 'setuju').then(() => q.refetch())}>
                    {u.endorsedByMe ? 'kamu setuju' : 'setujui'}
                  </button>
                ) : null}
              </div>
            </article>
          ))}
        </section>
      ) : null}

      <section className="section">
        <span className="label">perjumpaan dari rumah-rumah · {perjumpaan.length}</span>
        {perjumpaan.length ? (
          perjumpaan.map((p) => (
            <button key={p.sceneId} className="kw-jumpa" onClick={() => navigate(`/naskah/${p.msId}/a/${p.sceneId}`)}>
              <span className="tiny soft">
                {p.household} · {p.tokoh}
                {p.when ? ` · ${p.when}` : ''}
              </span>
              <span className="small">{firstLine(p.text, 180)}</span>
            </button>
          ))
        ) : (
          <p className="small soft">Belum ada rumah yang menuliskan perjumpaan dengannya. Di editor, sebut namanya lalu catat sebagai perjumpaan.</p>
        )}
      </section>

      {warga ? (
        <div className="ka-aksi">
          <button className="btn soft" onClick={() => setUbah(true)} data-testid="kw-ubah">
            usulkan perubahan besar
          </button>
        </div>
      ) : null}
      <Sheet open={ubah} onClose={() => setUbah(false)} title={`perubahan besar · ${f.name}`}>
        <UbahForm
          f={f}
          onDone={() => {
            setUbah(false);
            void q.refetch();
            void qc.invalidateQueries({ queryKey: ['kota', 'warga'] });
          }}
        />
      </Sheet>
    </main>
  );
}

function UbahForm({ f, onDone }: { f: KotaFigurWire; onDone: () => void }) {
  const toast = useToast();
  const [kind, setKind] = useState<'wafat' | 'pindah' | 'fakta'>(f.died ? 'fakta' : 'wafat');
  const [text, setText] = useState('');
  const [year, setYear] = useState('');
  const [region, setRegion] = useState(f.region);
  const [busy, setBusy] = useState(false);
  return (
    <div className="col" style={{ gap: 10 }}>
      <div className="row" style={{ gap: 6 }}>
        {(['wafat', 'pindah', 'fakta'] as const).map((k) => (
          <button key={k} className={`pill sm ${kind === k ? 'active' : ''}`} disabled={k === 'wafat' && !!f.died} onClick={() => setKind(k)}>
            {UBAH_LABEL[k]}
          </button>
        ))}
      </div>
      {kind !== 'fakta' ? <input className="field" inputMode="numeric" maxLength={4} value={year} onChange={(e) => setYear(e.target.value.replace(/\D/g, ''))} placeholder="tahun" /> : null}
      {kind === 'pindah' ? (
        <select className="field" value={region} onChange={(e) => setRegion(e.target.value)} aria-label="wilayah tujuan">
          {KOTA_WILAYAH.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
      ) : null}
      <textarea className="field" rows={3} value={text} maxLength={400} onChange={(e) => setText(e.target.value)} placeholder={kind === 'wafat' ? 'bagaimana kota mengenangnya' : kind === 'pindah' ? 'tempat barunya' : 'fakta baru yang mengikat semua rumah'} />
      <p className="tiny soft">Perubahan besar mengikat semua rumah, jadi baru berlaku setelah {KOTA_SETUJU_KANON} warga lain setuju. Perjumpaan kecil tidak perlu diusulkan.</p>
      <button
        className="btn"
        disabled={busy || text.trim().length < 5 || (kind === 'wafat' && !year)}
        onClick={async () => {
          setBusy(true);
          try {
            await api.post(`/kota/warga/${f.id}/ubah`, { kind, text: text.trim(), year: Number(year) || undefined, region: kind === 'pindah' ? region : undefined });
            toast('Usulan perubahan tercatat.');
            onDone();
          } catch (e) {
            toast((e as Error).message);
            setBusy(false);
          }
        }}>
        {busy ? 'mengirim…' : 'kirim usulan'}
      </button>
    </div>
  );
}
