/**
 * SAUDAGAR: halaman depan. Jual-beli properti kota-kota Indonesia dengan
 * aturan Monopoli resmi lengkap atau aturan rumahan.
 */
import { saudagar as S } from '@sehari/core';
import { type CSSProperties, useState } from 'react';
import { navigate } from '@/lib/router';
import { createMeja, rekor, rp } from '@/lib/saudagar';
import { useSession } from '@/lib/session';
import { profile } from '@/lib/sidik';
import { Doodle, Header, Sheet, useToast } from '@/ui/kit';
import { AturanSaudagar } from './parts';

export default function SaudagarBeranda() {
  const toast = useToast();
  const session = useSession();
  const [code, setCode] = useState('');
  const [name, setName] = useState(profile.get()?.name ?? session.me?.user.penName ?? '');
  const [ask, setAsk] = useState(false);
  const [busy, setBusy] = useState(false);
  const [aturan, setAturan] = useState(false);
  const r = rekor.get();
  const create = async () => {
    if (!name.trim()) return setAsk(true);
    setBusy(true);
    try {
      const p = { name: name.trim(), avatar: profile.get()?.avatar ?? 'kucing' };
      profile.set(p);
      const v = await createMeja(p);
      navigate(`/main/saudagar/${v.code}`);
    } catch (e) {
      toast((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <main className="screen sd-screen ts-beranda">
      <Header title="Saudagar" sub="Ruang Main · jual-beli properti, 2–8 orang" backTo="/main" />
      <section className="ts-hero">
        <div className="sg-hero-akta" aria-hidden>
          {[39, 24, 11, 1].map((i, k) => {
            const p = S.PETAK[i] as Extract<S.Petak, { jenis: 'kota' }>;
            return (
              <span key={i} className="sg-mini-akta" style={{ '--g': S.WARNA_GRUP[p.grup], '--i': k - 1.5 } as CSSProperties}>
                <b>{p.nama}</b>
                <span>{rp(p.harga)}</span>
              </span>
            );
          })}
        </div>
        <h1 className="sd-hero-title">saudagar.</h1>
        <p className="sd-hero-sub">Dari Ternate sampai Jakarta. Beli, lelang, tawar-menawar, bangun hotel, dan jadi satu-satunya yang tidak bangkrut.</p>
      </section>
      <div className="sd-home-actions">
        <button className="btn sd-cta" disabled={busy} onClick={() => void create()} data-testid="sg-create">
          <Doodle id="rumah" size={20} color="currentColor" /> buka meja
        </button>
        <div className="sd-joincode">
          <input className="field" value={code} maxLength={4} placeholder="KODE" onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z]/g, ''))} />
          <button className="btn soft" disabled={code.length !== 4} onClick={() => navigate(`/main/saudagar/${code}`)}>
            duduk
          </button>
        </div>
        <p className="tiny soft center">2–8 orang · 30–90 menit (atau pakai batas waktu) · bisa ditemani bot</p>
      </div>
      {r.main ? (
        <section className="sd-rank">
          <Doodle id="rumah" size={40} color="#16161a" />
          <span className="grow">
            <b>{r.menang} kali jadi saudagar terkaya</b>
            <span className="tiny" style={{ display: 'block' }}>
              dari {r.main} permainan
            </span>
          </span>
        </section>
      ) : null}
      <section className="section">
        <span className="label">semua aturan resmi, plus</span>
        <ol className="sd-how">
          {(
            [
              ['stempel', 'Lelang sungguhan.', 'Properti yang ditolak dilelang ke semua HP sekaligus; setiap tawaran menambah waktu.'],
              ['tangan-bergandeng', 'Tukar-menukar.', 'Tawarkan properti, uang, dan kartu bebas penjara kapan saja. Bot juga akan menawarimu.'],
              ['rumah', 'Bangun merata.', 'Stok 32 rumah dan 12 hotel. Kalau habis, tunggu ada yang menjual.'],
              ['jam-pasir', 'Aturan rumahan.', 'Jackpot Parkir Bebas, Start dobel, dan batas waktu: yang terkaya menang.'],
            ] as const
          ).map(([d, t, x]) => (
            <li key={t}>
              <Doodle id={d} size={32} />
              <span>
                <b>{t}</b> {x}
              </span>
            </li>
          ))}
        </ol>
        <button className="btn soft" style={{ width: '100%' }} onClick={() => setAturan(true)}>
          baca aturan lengkap
        </button>
      </section>
      <Sheet open={ask} onClose={() => setAsk(false)} title="nama panggilanmu">
        <div className="col" style={{ gap: 10 }}>
          <input className="field" maxLength={24} value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          <button className="btn" disabled={!name.trim()} onClick={() => (setAsk(false), void create())}>
            buka meja
          </button>
        </div>
      </Sheet>
      <Sheet open={aturan} onClose={() => setAturan(false)} title="aturan Saudagar">
        <AturanSaudagar />
      </Sheet>
    </main>
  );
}
