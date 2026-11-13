/**
 * Jalan-jalan: menyusuri gang di satu wilayah pada satu tahun. Dari tiap jendela
 * terdengar sepotong kalimat; di jalan kamu berpapasan dengan warga kota. Masuk
 * ke rumah yang menarik untuk membaca kisahnya dari awal.
 */
import { KOTA_TAHUN, kotaRegion } from '@sehari/core';
import { type CSSProperties, useState } from 'react';
import { useJalan } from '@/lib/kota';
import { navigate, useParams, usePath } from '@/lib/router';
import { Growing, Header } from '@/ui/kit';

export default function Jalan() {
  const { wilayah } = useParams<{ wilayah: string }>();
  const { search } = usePath();
  const region = kotaRegion(wilayah);
  const awal = Number(search.get('tahun')) || 1979;
  const [tahun, setTahun] = useState(awal);
  const [geser, setGeser] = useState(awal);
  const q = useJalan(wilayah, tahun);
  if (!region) return <Growing label="wilayah ini tidak ditemukan" />;
  const min = Math.max(KOTA_TAHUN.min, region.since);
  return (
    <main className="screen kota-jalan">
      <Header title={`Jalan-jalan di ${region.name}`} sub={`tahun ${tahun}`} backTo="/kota" />
      <section className="jl-tahun" aria-label="tahun berjalan">
        <b>{geser}</b>
        <input type="range" min={min} max={2026} value={geser} onChange={(e) => setGeser(Number(e.target.value))} onPointerUp={() => setTahun(geser)} onKeyUp={() => setTahun(geser)} aria-label="tahun" data-testid="jl-tahun" />
      </section>
      {!q.data ? (
        <Growing label="melangkah ke gang…" />
      ) : !q.data.langkah.length ? (
        <p className="small soft jl-sepi">Pada {tahun}, belum ada jendela yang bercerita di {region.name}. Geser tahunnya, atau patok rumah di sini dan jadilah yang pertama.</p>
      ) : (
        <ol className="jl-jalur">
          <li className="jl-mulai tiny soft">Kamu mulai berjalan dari ujung barat {region.name}.</li>
          {q.data.langkah.map((l, i) =>
            l.jenis === 'rumah' ? (
              <li key={`r${l.claimId}`} className="jl-jendela" style={{ '--n': i } as CSSProperties} data-testid="jl-jendela">
                <span className="jl-dari tiny">
                  dari jendela <b>{l.household}</b> · {l.address}
                </span>
                <blockquote className="jl-kalimat">“{l.kalimat}”</blockquote>
                <span className="jl-bawah">
                  <span className="tiny soft">
                    {l.tokoh}
                    {l.when ? ` · ${l.when}` : ''} · ditulis {l.penName}
                  </span>
                  <button className="pill sm" onClick={() => navigate(`/naskah/${l.msId}/baca/${l.workId ?? 'lepas'}`)} data-testid="jl-masuk">
                    masuk
                  </button>
                </span>
              </li>
            ) : (
              <li key={`w${l.figurId}`} className="jl-papas" style={{ '--n': i } as CSSProperties} data-testid="jl-warga">
                <button onClick={() => navigate(`/kota/warga/${l.figurId}`)}>
                  Di jalan kamu berpapasan dengan <b>{l.name}</b>
                  {l.julukan ? `, ${l.julukan}` : ''}, di {l.tempat}.
                </button>
              </li>
            ),
          )}
          <li className="jl-akhir tiny soft">{q.data.sunyi ? `${q.data.sunyi} rumah lain jendelanya masih gelap.` : 'Gang berakhir di sini.'}</li>
        </ol>
      )}
    </main>
  );
}
