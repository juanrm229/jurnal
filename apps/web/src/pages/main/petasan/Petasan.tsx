/**
 * KUCING PETASAN: halaman depan. Jangan sampai meledak.
 */
import { petasan as K } from '@sehari/core';
import { type CSSProperties, useState } from 'react';
import { createMeja, rekor } from '@/lib/petasan';
import { navigate } from '@/lib/router';
import { useSession } from '@/lib/session';
import { profile } from '@/lib/sidik';
import { Doodle, Header, Sheet, useToast } from '@/ui/kit';
import { AturanPetasan, KartuP } from './parts';

export default function PetasanBeranda() {
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
      navigate(`/main/petasan/${v.code}`);
    } catch (e) {
      toast((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <main className="screen sd-screen ts-beranda">
      <Header title="Kucing Petasan" sub="Ruang Main · 2–10 orang" backTo="/main" />
      <section className="ts-hero">
        <div className="ts-hero-kartu" aria-hidden>
          {(['siram', 'ogah', 'petasan', 'serbu', 'oren'] as K.Jenis[]).map((j, i) => (
            <span key={j} style={{ '--i': i - 2 } as CSSProperties}>
              <KartuP j={j} />
            </span>
          ))}
        </div>
        <h1 className="sd-hero-title">kucing petasan.</h1>
        <p className="sd-hero-sub">Di tumpukan ada kucing yang membawa petasan. Ambil kartu, berdoa, dan siapkan air. Yang terakhir selamat menang.</p>
      </section>
      <div className="sd-home-actions">
        <button className="btn sd-cta" disabled={busy} onClick={() => void create()} data-testid="kp-create">
          <Doodle id="kembang-api" size={20} color="currentColor" /> buka meja
        </button>
        <div className="sd-joincode">
          <input className="field" value={code} maxLength={4} placeholder="KODE" onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z]/g, ''))} />
          <button className="btn soft" disabled={code.length !== 4} onClick={() => navigate(`/main/petasan/${code}`)}>
            duduk
          </button>
        </div>
        <p className="tiny soft center">2–10 orang · 10–15 menit · bisa ditemani bot</p>
      </div>
      {r.main ? (
        <section className="sd-rank">
          <Doodle id="kucing" size={40} color="#16161a" />
          <span className="grow">
            <b>{r.selamat} kali selamat</b>
            <span className="tiny" style={{ display: 'block' }}>
              dari {r.main} permainan
            </span>
          </span>
        </section>
      ) : null}
      <section className="section">
        <span className="label">{K.JENIS.length} jenis kartu</span>
        <div className="ts-galeri">
          {K.JENIS.map((j) => (
            <KartuP key={j} j={j} onClick={() => setAturan(true)} />
          ))}
        </div>
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
      <Sheet open={aturan} onClose={() => setAturan(false)} title="aturan Kucing Petasan">
        <AturanPetasan />
      </Sheet>
    </main>
  );
}
