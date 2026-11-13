/** Kabar Kota: yang terjadi di Sangkala belakangan ini, dikelompokkan per hari. */
import type { KotaKabarWire } from '@sehari/core';
import { type CSSProperties, useEffect } from 'react';
import { kabarDilihat, tandaiKabar, useKabar } from '@/lib/kota';
import { navigate } from '@/lib/router';
import { Doodle, Growing, Header } from '@/ui/kit';

const IKON: Record<KotaKabarWire['jenis'], string> = { rumah: 'rumah', adegan: 'pena', ikatan: 'ui-peluk', peristiwa: 'buku-terbuka', figur: 'pelukan', ubah: 'bintang' };
const JENIS: Record<KotaKabarWire['jenis'], string> = { rumah: 'rumah baru', adegan: 'adegan', ikatan: 'ikatan', peristiwa: 'almanak', figur: 'warga kota', ubah: 'buku warga' };
const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

function hari(iso: string) {
  const d = new Date(iso);
  const kini = new Date();
  const sel = Math.round((new Date(kini.toDateString()).getTime() - new Date(d.toDateString()).getTime()) / 86_400_000);
  return sel === 0 ? 'hari ini' : sel === 1 ? 'kemarin' : `${d.getDate()} ${BULAN[d.getMonth()]}`;
}

export default function Kabar() {
  const q = useKabar();
  const lama = kabarDilihat();
  useEffect(() => {
    if (q.data?.[0]) tandaiKabar(q.data[0].at);
  }, [q.data]);
  if (!q.data) return <Growing label="mengambil koran pagi…" />;
  const grup: [string, KotaKabarWire[]][] = [];
  for (const k of q.data) {
    const h = hari(k.at);
    const g = grup.at(-1);
    if (g && g[0] === h) g[1].push(k);
    else grup.push([h, [k]]);
  }
  return (
    <main className="screen kota-kabar">
      <Header title="Kabar Kota" sub="yang terjadi di Sangkala, 60 hari terakhir" backTo="/kota" />
      {!q.data.length ? (
        <p className="small soft kk-sepi">Kota masih sunyi. Patok rumah dan terbitkan adegan pertamamu: kabarnya akan tercatat di sini.</p>
      ) : (
        grup.map(([h, list]) => (
          <section key={h} className="kb-hari">
            <h3>{h}</h3>
            {list.map((k, i) => (
              <button key={k.id} className={`kb-kabar ${k.jenis} ${k.at > lama ? 'baru' : ''}`} style={{ '--n': i } as CSSProperties} onClick={() => navigate(k.ke)} data-testid="kb-kabar">
                <span className="kb-ikon" aria-hidden>
                  <Doodle id={IKON[k.jenis]} size={20} color="currentColor" />
                </span>
                <span className="grow">
                  <span className="kb-jenis">{JENIS[k.jenis]}</span>
                  <b>{k.judul}</b>
                  {k.isi ? <span className="small kb-isi">{k.isi}</span> : null}
                </span>
              </button>
            ))}
          </section>
        ))
      )}
    </main>
  );
}
