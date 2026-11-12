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
  // Rumah yang paling masuk akal untuk bersaksi: yang berpenghuni pada tahun itu
  // (mengalami bila wilayahnya terkena), atau yang berdiri sesudahnya (mendengar kisahnya).
  const milikku = (kota.data?.claims ?? []).filter((c) => c.mine && c.state === 'aktif');
  const kena = (c: { regionId: string }) => !e?.regions.length || e.regions.includes(c.regionId);
  const semasa = e ? milikku.filter((c) => c.from <= e.year && c.to >= e.year).sort((a, b) => Number(kena(b)) - Number(kena(a))) : [];
  const sesudah = e ? milikku.filter((c) => c.from > e.year).sort((a, b) => a.from - b.from) : [];
  const rumahku = semasa[0] ?? sesudah[0];
  const lewat = !!e && !rumahku && milikku.length > 0;
  // Hari dalam seminggu dari tanggal 15 bulan itu: sekadar hiasan kepala koran.
  const hari = e.month ? HARI[new Date(e.year, e.month - 1, 15).getDay()] : null;

  const tulis = async () => {
    if (!rumahku) return navigate('/kota');
    setBusy(true);
    try {
      const ms = await api.get<NaskahWire>(`/naskah/${rumahku.msId}`);
      const year = semasa[0] ? e.year : rumahku.from;
      const semua = ms.canon.filter((c) => c.kind === 'tokoh').map((c) => ({ id: c.id, p: (c.envelope as { plain?: NaskahCanonPayload }).plain }));
      const hidup = semua.find((x) => x.p && (!x.p.born || x.p.born <= year) && (!x.p.died || x.p.died >= year)) ?? semua[0];
      if (!hidup) {
        toast('Rumahmu belum punya tokoh. Tambahkan dulu di Kanon, lalu kembali ke koran ini.');
        navigate(`/naskah/${rumahku.msId}`);
        return;
      }
      const mengalami = !!semasa[0] && kena(rumahku);
      const sid = newNaskahId();
      const p: NaskahScenePayload = {
        v: 1,
        pov: hidup.id,
        when: semasa[0] ? { label: tanggal(e), sort: e.month ? `${e.year}-${String(e.month).padStart(2, '0')}` : String(e.year) } : { label: `${rumahku.from}, mengenang ${tanggal(e)}`, sort: String(rumahku.from) },
        text: '',
        peristiwa: e.id,
        saksi: mengalami ? 'mengalami' : 'mendengar',
      };
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
      <header className="kn-kepala">
        <div className="kn-kepala-baris">
          <button className="kn-balik" aria-label="kembali" onClick={() => history.length > 1 ? history.back() : navigate('/kota/almanak')}>
            <Doodle id="ui-kembali" size={18} />
          </button>
          <span>ALMANAK KOTA · {e.state === 'kanon' ? 'KANON' : 'USULAN'}</span>
          <span className="kn-kosong" aria-hidden />
        </div>
        <b className="kn-nama">KORAN SANGKALA</b>
        <div className="kn-tanggal">
          <span>{hari ? `${hari.toUpperCase()}, ` : ''}{tanggal(e).toUpperCase()}</span>
          <span>EDISI WARGA</span>
        </div>
      </header>

      <h1 className="kn-judul-berita">{e.title}</h1>
      <p className="kn-lede">{e.body}</p>
      <div className="kn-foto" style={kotaCropAt(pusat[0], pusat[1], 358, 150, 1.6)} role="img" aria-label={`peta ${e.regions.map((r) => kotaRegion(r)?.name).join(', ') || 'kota'}`}>
        <span className="kn-foto-ket">{e.regions.length ? e.regions.map((r) => kotaRegion(r)?.name).join(' · ') : 'seluruh kota'}</span>
      </div>

      <nav className="kn-pilih" aria-label="sudut pandang kesaksian">
        {(['mengalami', 'mendengar'] as const).map((k) => (
          <button key={k} className={mode === k ? 'on' : ''} onClick={() => setMode(k)}>
            {k} · {testimonies.filter((t) => t.saksi === k).length} rumah
          </button>
        ))}
      </nav>

      {list.length ? (
        <div className={`kn-kolom ${list.length === 1 ? 'satu' : ''}`}>
          {list.map((t) => (
            <article key={t.sceneId} className="kn-kesaksian">
              <span className="kn-alamat">
                {kotaPlot(t.plotId)?.address ?? t.household} · {t.when}
              </span>
              <p>{firstLine(t.text, 420)}</p>
              <span className="kn-tanda">
                {t.tokoh}, {t.household}
              </span>
              <button className="kn-baca" onClick={() => navigate(`/naskah/${t.msId}/a/${t.sceneId}`)}>
                baca adegannya · oleh {t.penName}
              </button>
            </article>
          ))}
        </div>
      ) : (
        <p className="kn-sepi">{mode === 'mengalami' ? 'Belum ada rumah yang menuliskan bagaimana mereka mengalaminya.' : 'Belum ada rumah yang menuliskan kabar yang mereka dengar.'}</p>
      )}

      <div className="kn-aksi">
        <button className="btn" disabled={busy || lewat} onClick={() => void tulis()} data-testid="kn-tulis">
          {rumahku ? (busy ? 'menyiapkan halaman…' : semasa[0] ? `tulis kesaksian ${rumahku.household}` : `tulis kenangan ${rumahku.household}`) : lewat ? 'rumahmu sudah kosong saat itu' : 'patok rumah untuk ikut bersaksi'}
        </button>
      </div>
    </main>
  );
}
