/** Surat dari Kota Sangkala di Kotak Surat: diantar Bang Jamil, lama antarnya mengikuti jarak di peta. */
import type { CSSProperties } from 'react';
import { useSuratKota, waktuTiba } from '@/lib/kota';
import { navigate } from '@/lib/router';

export function SuratSangkala({ arah }: { arah: 'masuk' | 'keluar' }) {
  const q = useSuratKota();
  const list = (q.data ?? []).filter((x) => x.arah === arah);
  if (!list.length) return null;
  return (
    <section className="ss-pos" aria-label="surat dari Sangkala">
      <span className="label">{arah === 'masuk' ? 'surat dari Sangkala' : 'surat ke Sangkala'}</span>
      {list.map((x, i) => (
        <button key={x.id} className={`ss-surat ${x.sampai ? '' : 'jalan'}`} style={{ '--miring': `${((i * 37) % 5) - 2}deg` } as CSSProperties} onClick={() => navigate(x.ke)} data-testid="surat-sangkala">
          <span className="ss-cap" aria-hidden>
            POS SANGKALA
          </span>
          <span className="ss-kepala">
            <span className="tiny">{x.jenis === 'ketuk' ? 'surat ketukan' : 'surat memegang tokoh'}</span>
            <b>{arah === 'masuk' ? `dari ${x.dari}` : `kepada ${x.kepada}`}</b>
            {arah === 'masuk' ? <span className="tiny soft">untuk {x.kepada}</span> : null}
          </span>
          <span className="ss-isi">{x.isi.length > 180 ? `${x.isi.slice(0, 180)}…` : x.isi}</span>
          <span className="ss-status tiny">
            {x.sampai ? `diantar Bang Jamil · sampai ${waktuTiba(x.sampaiAt)}` : `Bang Jamil masih di jalan · tiba sekitar ${waktuTiba(x.sampaiAt)}`}
          </span>
        </button>
      ))}
    </section>
  );
}
