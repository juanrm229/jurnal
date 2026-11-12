/** Halaman peristiwa bergaya Koran Sangkala: kesaksian dari rumah-rumah yang mengalaminya atau hanya mendengar. */
import { type NaskahCanonPayload, type NaskahScenePayload, type NaskahWire, kotaPlot, kotaRegion } from '@sehari/core';
import { useState } from 'react';
import { api } from '@/lib/api';
import { kotaCropAt, tanggal, useKota, usePeristiwa } from '@/lib/kota';
import { firstLine, newNaskahId } from '@/lib/naskah';
import { navigate, useParams } from '@/lib/router';
import { Doodle, Growing, useToast } from '@/ui/kit';

const HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

export default function Peristiwa() {
  const { id } = useParams<{ id: string }>();
  const q = usePeristiwa(id);
  const kota = useKota();
  const toast = useToast();
  const [mode, setMode] = useState<'mengalami' | 'mendengar'>('mengalami');
  const [busy, setBusy] = useState(false);
  if (!q.data) return q.isError ? <Growing label="peristiwa ini tidak ditemukan" /> : <Growing label="mencetak koran…" />;
  const { event: e, testimonies } = q.data;
  const pusat = kotaRegion(e.regions[0] ?? '')?.label ?? [1000, 520];
  const list = testimonies.filter((t) => t.saksi === mode);
  const rumahku = (kota.data?.claims ?? []).find((c) => c.mine && c.state === 'aktif' && c.kind === 'rumah') ?? (kota.data?.claims ?? []).find((c) => c.mine && c.state === 'aktif');
  // Hari dalam seminggu dari tanggal 15 bulan itu: sekadar hiasan kepala koran.
  const hari = e.month ? HARI[new Date(e.year, e.month - 1, 15).getDay()] : null;

  const tulis = async () => {
    if (!rumahku) return navigate('/kota');
    setBusy(true);
    try {
      const ms = await api.get<NaskahWire>(`/naskah/${rumahku.msId}`);
      const tokoh = ms.canon.map((c) => (c.envelope as { plain?: NaskahCanonPayload }).plain).find((p) => p?.kind === 'tokoh');
      const tokohId = ms.canon.find((c) => (c.envelope as { plain?: NaskahCanonPayload }).plain === tokoh)?.id ?? '';
      if (!tokohId) {
        toast('Rumahmu belum punya tokoh. Tambahkan dulu di Kanon, lalu kembali ke koran ini.');
        navigate(`/naskah/${rumahku.msId}`);
        return;
      }
      const kena = !e.regions.length || e.regions.includes(rumahku.regionId);
      const sid = newNaskahId();
      const p: NaskahScenePayload = { v: 1, pov: tokohId, when: { label: tanggal(e), sort: e.month ? `${e.year}-${String(e.month).padStart(2, '0')}` : String(e.year) }, text: '', peristiwa: e.id, saksi: kena ? 'mengalami' : 'mendengar' };
      const chapter = Math.max(1, ...ms.scenes.map((s) => s.chapter));
      await api.post(`/naskah/${rumahku.msId}/scenes`, { id: sid, chapter, order: Math.max(0, ...ms.scenes.map((s) => s.order)) + 1, envelope: { plain: p }, status: 'draf' });
      navigate(`/naskah/${rumahku.msId}/a/${sid}`);
    } catch (err) {
      toast((err as Error).message);
      setBusy(false);
    }
  };

  return (
    <main className="koran">
      <header className="kr-kepala">
        <div className="kr-kepala-baris">
          <button className="kr-balik" aria-label="kembali" onClick={() => history.length > 1 ? history.back() : navigate('/kota/almanak')}>
            <Doodle id="ui-kembali" size={18} />
          </button>
          <span>ALMANAK KOTA · {e.state === 'kanon' ? 'KANON' : 'USULAN'}</span>
          <span className="kr-kosong" aria-hidden />
        </div>
        <b className="kr-nama">KORAN SANGKALA</b>
        <div className="kr-tanggal">
          <span>{hari ? `${hari.toUpperCase()}, ` : ''}{tanggal(e).toUpperCase()}</span>
          <span>EDISI WARGA</span>
        </div>
      </header>

      <h1 className="kr-judul-berita">{e.title}</h1>
      <p className="kr-lede">{e.body}</p>
      <div className="kr-foto" style={kotaCropAt(pusat[0], pusat[1], 358, 150, 1.6)} role="img" aria-label={`peta ${e.regions.map((r) => kotaRegion(r)?.name).join(', ') || 'kota'}`}>
        <span className="kr-foto-ket">{e.regions.length ? e.regions.map((r) => kotaRegion(r)?.name).join(' · ') : 'seluruh kota'}</span>
      </div>

      <nav className="kr-pilih" aria-label="sudut pandang kesaksian">
        {(['mengalami', 'mendengar'] as const).map((k) => (
          <button key={k} className={mode === k ? 'on' : ''} onClick={() => setMode(k)}>
            {k} · {testimonies.filter((t) => t.saksi === k).length} rumah
          </button>
        ))}
      </nav>

      {list.length ? (
        <div className={`kr-kolom ${list.length === 1 ? 'satu' : ''}`}>
          {list.map((t) => (
            <article key={t.sceneId} className="kr-kesaksian">
              <span className="kr-alamat">
                {kotaPlot(t.plotId)?.address ?? t.household} · {t.when}
              </span>
              <p>{firstLine(t.text, 420)}</p>
              <span className="kr-tanda">
                {t.tokoh}, {t.household}
              </span>
              <button className="kr-baca" onClick={() => navigate(`/naskah/${t.msId}/a/${t.sceneId}`)}>
                baca adegannya · oleh {t.penName}
              </button>
            </article>
          ))}
        </div>
      ) : (
        <p className="kr-sepi">{mode === 'mengalami' ? 'Belum ada rumah yang menuliskan bagaimana mereka mengalaminya.' : 'Belum ada rumah yang menuliskan kabar yang mereka dengar.'}</p>
      )}

      <div className="kr-aksi">
        <button className="btn" disabled={busy} onClick={() => void tulis()} data-testid="kr-tulis">
          {rumahku ? (busy ? 'menyiapkan halaman…' : `tulis kesaksian ${rumahku.household}`) : 'patok rumah untuk ikut bersaksi'}
        </button>
      </div>
    </main>
  );
}
