/**
 * ULAR TANGGA: halaman depan. Mode Jenius & Klasik, kartu aksi, cara main.
 */
import { tangga } from '@sehari/core';
import { useState } from 'react';
import { navigate } from '@/lib/router';
import { useSession } from '@/lib/session';
import { profile } from '@/lib/sidik';
import { createMeja, rekor } from '@/lib/tangga';
import { Doodle, Header, Sheet, useToast } from '@/ui/kit';
import { AturanTangga, Dadu, KartuAksi } from './parts';

export default function TanggaBeranda() {
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
      navigate(`/main/tangga/${v.code}`);
    } catch (e) {
      toast((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <main className="screen sd-screen ts-beranda">
      <Header title="Ular Tangga" sub="Ruang Main · 2–6 orang" backTo="/main" />
      <section className="ts-hero">
        <div className="tg-hero-dadu" aria-hidden>
          <Dadu n={5} kocok />
          <Dadu n={2} kocok />
        </div>
        <h1 className="sd-hero-title">ular tangga.</h1>
        <p className="sd-hero-sub">Yang lama, tapi tidak lagi soal untung-untungan. Satu dadu untuk jalan, satu dadu untuk mendorong lawan ke mulut ular.</p>
      </section>
      <div className="sd-home-actions">
        <button className="btn sd-cta" disabled={busy} onClick={() => void create()} data-testid="tg-create">
          <Doodle id="ui-dadu" size={20} color="currentColor" /> gelar papan
        </button>
        <div className="sd-joincode">
          <input className="field" value={code} maxLength={4} placeholder="KODE" onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z]/g, ''))} />
          <button className="btn soft" disabled={code.length !== 4} onClick={() => navigate(`/main/tangga/${code}`)}>
            ikut
          </button>
        </div>
        <p className="tiny soft center">2–6 orang · 10–20 menit · goyang HP untuk melempar dadu</p>
      </div>
      {r.main ? (
        <section className="sd-rank">
          <Doodle id="bendera" size={40} color="#16161a" />
          <span className="grow">
            <b>{r.menang} kali sampai di 100 duluan</b>
            <span className="tiny" style={{ display: 'block' }}>
              dari {r.main} permainan
            </span>
          </span>
        </section>
      ) : null}
      <section className="section">
        <span className="label">yang membuatnya menantang</span>
        <ol className="sd-how">
          {(
            [
              ['ui-dadu', 'Dua dadu, dua keputusan.', 'Pilih dadu untuk jalan. Dadu lainnya bisa mendorong lawan yang dekat: ke kepala ular, kalau hitunganmu tepat.'],
              ['kartu', 'Kartu aksi.', 'Gergaji memotong ular, Ular Peliharaan memasang jebakan, Dadu Emas menentukan angka, Penawar menyelamatkan.'],
              ['awan', 'Musim.', `Tiap ${tangga.SIKLUS_MUSIM} ronde papan berubah. Bayangan ular atau tangga baru sudah terlihat sebelumnya.`],
              ['bendera', 'Harus pas di 100.', 'Kelebihan langkah memantul mundur, sering tepat ke mulut ular di 90-an.'],
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
        <div className="tg-tangan" style={{ justifyContent: 'center', flexWrap: 'wrap' }}>
          {(Object.keys(tangga.KARTU) as tangga.KartuId[]).map((k) => (
            <KartuAksi key={k} id={k} onClick={() => setAturan(true)} />
          ))}
        </div>
        <button className="btn soft" style={{ width: '100%', marginTop: 12 }} onClick={() => setAturan(true)}>
          baca aturan lengkap
        </button>
      </section>
      <Sheet open={ask} onClose={() => setAsk(false)} title="nama panggilanmu">
        <div className="col" style={{ gap: 10 }}>
          <input className="field" maxLength={24} value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          <button className="btn" disabled={!name.trim()} onClick={() => (setAsk(false), void create())}>
            gelar papan
          </button>
        </div>
      </Sheet>
      <Sheet open={aturan} onClose={() => setAturan(false)} title="aturan Ular Tangga">
        <AturanTangga />
      </Sheet>
    </main>
  );
}
