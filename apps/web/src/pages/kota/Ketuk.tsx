/**
 * Mengetuk rumah lain: susun kalimat hubungan antara tokohmu dan tokoh mereka,
 * tulis surat dari dalam cerita, lalu segel. Pemilik rumah yang memutuskan.
 */
import { KOTA_HUBUNGAN, KOTA_HUBUNGAN_IDS, type KotaClaimWire, type KotaHubungan, type KotaTokohWire, kotaCekHubungan, kotaPlot } from '@sehari/core';
import { useState } from 'react';
import { api } from '@/lib/api';
import { useKota, useKotaClaim, useTautan, waktuTiba } from '@/lib/kota';
import { navigate, useParams } from '@/lib/router';
import { Doodle, Growing, useToast } from '@/ui/kit';

const jiwa = (t: KotaTokohWire, c: KotaClaimWire) => ({ name: t.name, born: t.born, died: t.died, from: c.from, to: c.to });

export default function Ketuk() {
  const { id } = useParams<{ id: string }>();
  const kota = useKota();
  const target = useKotaClaim(id);
  const theirs = useTautan(id);
  const mineAll = (kota.data?.claims ?? []).filter((c) => c.mine && c.state === 'aktif' && c.id !== id);
  const [fromId, setFromId] = useState<string>('');
  const from = mineAll.find((c) => c.id === fromId) ?? mineAll[0];
  const ours = useTautan(from?.id ?? '');
  const [aku, setAku] = useState('');
  const [dia, setDia] = useState('');
  const [type, setType] = useState<KotaHubungan>('anak');
  const [letter, setLetter] = useState('');
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const b = target.data;
  if (!b || !kota.data) return <Growing label="berjalan ke pintunya…" />;

  const myTokoh = (ours.data?.tokoh ?? []).filter((t) => t.claimId === from?.id);
  const theirTokoh = (theirs.data?.tokoh ?? []).filter((t) => t.claimId === b.id);
  const ta = myTokoh.find((t) => t.id === aku) ?? myTokoh[0];
  const tb = theirTokoh.find((t) => t.id === dia) ?? theirTokoh[0];
  const cek = ta && tb && from ? kotaCekHubungan(type, jiwa(ta, from), jiwa(tb, b)) : [];
  const blocked = cek.some((x) => !x.ok);
  const ok = !!ta && !!tb && !blocked && letter.trim().length >= 10;

  return (
    <main className="kota-ketuk">
      <header className="kk-head">
        <button className="kk-x" aria-label="batal mengetuk" onClick={() => navigate(`/kota/rumah/${b.id}`)}>
          <Doodle id="ui-tutup" size={18} color="currentColor" />
        </button>
        <div>
          <span className="kk-alamat">mengetuk {kotaPlot(b.plotId)?.address}</span>
          <b>{b.household}</b>
        </div>
      </header>

      {!from ? (
        <section className="kk-kosong">
          <p>Untuk mengetuk, kamu perlu rumah sendiri di Kota. Tokohmu yang mengetuk, bukan kamu.</p>
          <button className="btn" onClick={() => navigate('/kota')}>
            cari persil
          </button>
        </section>
      ) : (
        <>
          {mineAll.length > 1 ? (
            <div className="kk-rumahku" role="group" aria-label="mengetuk dari rumah">
              {mineAll.map((c) => (
                <button key={c.id} className={c.id === from.id ? 'on' : ''} onClick={() => (setFromId(c.id), setAku(''))}>
                  {c.household} · {c.from}
                </button>
              ))}
            </div>
          ) : null}

          <section className="kk-kalimat" aria-label="kalimat hubungan">
            {myTokoh.length ? (
              <span className="kk-pilih">
                {myTokoh.map((t) => (
                  <button key={t.id} className={ta?.id === t.id ? 'on' : ''} onClick={() => setAku(t.id)} data-testid={`kk-aku-${t.name}`}>
                    {t.name}
                  </button>
                ))}
              </span>
            ) : (
              <button className="kk-tambah" onClick={() => navigate(`/naskah/${from.msId}`)}>
                tambahkan tokoh di rumahmu dulu
              </button>
            )}
            <span>adalah</span>
            <span className="kk-pilih">
              {KOTA_HUBUNGAN_IDS.map((k) => (
                <button key={k} className={type === k ? 'on' : ''} onClick={() => setType(k)} data-testid={`kk-jenis-${k}`}>
                  {KOTA_HUBUNGAN[k].label}
                </button>
              ))}
            </span>
            <span>dari</span>
            {theirTokoh.length ? (
              <span className="kk-pilih">
                {theirTokoh.map((t) => (
                  <button key={t.id} className={tb?.id === t.id ? 'on' : ''} onClick={() => setDia(t.id)} data-testid={`kk-dia-${t.name}`}>
                    {t.name}
                  </button>
                ))}
              </span>
            ) : (
              <span className="kk-catat">rumah ini belum punya tokoh untuk diketuk</span>
            )}
          </section>

          {cek.length ? (
            <ul className="kk-cek" aria-label="diperiksa kota">
              {cek.map((x, i) => (
                <li key={i} className={x.ok ? (x.warn ? 'warn' : 'ok') : 'gagal'}>
                  {x.text}
                </li>
              ))}
            </ul>
          ) : null}

          <section className="kk-surat">
            <span className="kk-surat-k">surat ketukan · ditulis sebagai {ta?.name ?? 'tokohmu'}</span>
            <textarea value={letter} maxLength={1200} onChange={(e) => setLetter(e.target.value)} placeholder={`${tb ? `${tb.name}, ` : ''}saya ${ta?.name ?? '…'}. …`} aria-label="isi surat ketukan" data-testid="kk-surat" />
            <span className="kk-lak" aria-hidden>
              {ta?.name.slice(0, 1) ?? ''}
            </span>
          </section>

          <section className="kk-nanti">
            <span>pemilik rumah akan memilih</span>
            <div>
              <i>jadi kanon</i>
              <i className="putus">desas-desus</i>
              <i>usul balik</i>
              <i>tolak</i>
            </div>
          </section>

          <div className="kk-aksi">
            <button
              className="kk-kirim"
              disabled={!ok || busy}
              onClick={async () => {
                setBusy(true);
                try {
                  const r = await api.post<{ state: string; sampaiAt?: string }>('/kota/ketuk', { fromClaimId: from.id, fromTokoh: ta!.id, toClaimId: b.id, toTokoh: tb!.id, type, letter: letter.trim() });
                  toast(r.state === 'kanon' ? 'Kedua rumahmu kini tersambung.' : `Bang Jamil mengantar suratmu ke ${b.household}; tiba ${waktuTiba(r.sampaiAt ?? new Date().toISOString())}.`);
                  navigate(`/kota/rumah/${b.id}`, { replace: true });
                } catch (e) {
                  toast((e as Error).message);
                  setBusy(false);
                }
              }}
              data-testid="kk-kirim">
              <span className="kk-lak-kecil" aria-hidden /> {busy ? 'mengetuk…' : 'segel dan ketuk'}
            </button>
          </div>
        </>
      )}
    </main>
  );
}
