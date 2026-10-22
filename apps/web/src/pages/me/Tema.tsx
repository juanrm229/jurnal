import { useState } from 'react';
import { useSession } from '@/lib/session';
import { currentTheme, INKS, PAPERS, setTheme } from '@/lib/theme';
import { Scene } from '@/ui/art';
import { Doodle, Header } from '@/ui/kit';

const SAMPLE = ['bunga-matahari', 'kucing-tidur', 'kopi-susu', 'sepeda', 'bulan', 'surat-botol', 'kupu-kupu', 'kereta', 'payung-terbuka', 'hati-dua'];

/** Ganti warna tinta doodle dan warna kertas. Berlaku seketika di seluruh aplikasi. */
export default function Tema() {
  const { me } = useSession();
  const [t, setT] = useState(currentTheme);
  const [custom, setCustom] = useState(t.ink);
  const pick = (next: typeof t) => {
    setT(next);
    setTheme(next, !!me);
  };
  return (
    <main className="screen">
      <Header title="tema" sub="tinta & kertas" />
      <div key={`${t.ink}${t.paper}`} style={{ maxWidth: 420, margin: '0 auto' }}>
        <Scene id="taman-tahun" speed={2.2} />
      </div>
      <section className="section">
        <span className="label">warna tinta</span>
        <div className="row wrap" style={{ gap: 14 }}>
          {INKS.map((i) => (
            <button key={i.id} className={`swatch ${t.ink === i.id ? 'on' : ''}`} style={{ background: i.id }} title={i.name} aria-label={i.name} onClick={() => pick({ ...t, ink: i.id })} />
          ))}
          <label className="swatch" style={{ background: `conic-gradient(red, yellow, lime, cyan, blue, magenta, red)`, position: 'relative', cursor: 'pointer' }} title="warna sendiri">
            <input type="color" value={custom} onChange={(e) => { setCustom(e.target.value); pick({ ...t, ink: e.target.value }); }} style={{ opacity: 0, position: 'absolute', inset: 0, cursor: 'pointer' }} />
          </label>
        </div>
        <p className="tiny soft">{INKS.find((i) => i.id === t.ink)?.name ?? 'warnamu sendiri'}</p>
      </section>
      <section className="section">
        <span className="label">kertas</span>
        <div className="row wrap">
          {PAPERS.map((p) => (
            <button key={p.id} className={`pill ${t.paper === p.id ? 'active' : ''}`} onClick={() => pick({ ...t, paper: p.id })}>
              <span className="paper-dot" style={{ background: p.color }} /> {p.name}
            </button>
          ))}
        </div>
      </section>
      <div className="card row wrap mt" style={{ justifyContent: 'center', gap: 14 }}>
        {SAMPLE.map((id, i) => <Doodle key={`${id}${t.ink}${t.paper}`} id={id} size={46} draw={i * 0.06} />)}
      </div>
      <p className="tiny soft center mt">{me ? 'Tersimpan di akunmu — ikut di semua perangkat.' : 'Tersimpan di perangkat ini.'}</p>
    </main>
  );
}
