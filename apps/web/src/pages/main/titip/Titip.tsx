/**
 * TITIP SURAT: halaman depan. Buka meja, masuk dengan kode, kenali 10 kartu.
 */
import { surat } from '@sehari/core';
import { useState } from 'react';
import { navigate } from '@/lib/router';
import { useSession } from '@/lib/session';
import { profile } from '@/lib/sidik';
import { createMeja, rekor } from '@/lib/titip';
import { Doodle, Header, Sheet, useToast } from '@/ui/kit';
import { Aturan, Kartu } from './parts';

export default function TitipBeranda() {
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
      navigate(`/main/titip/${v.code}`);
    } catch (e) {
      toast((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="screen sd-screen ts-beranda">
      <Header title="Titip Surat" sub="Ruang Main · kartu deduksi, 2–6 orang" backTo="/main" />
      <section className="ts-hero">
        <div className="ts-hero-kartu" aria-hidden>
          {[1, 5, 9, 3, 7].map((v, i) => (
            <span key={v} style={{ '--i': i - 2 } as React.CSSProperties}>
              <Kartu v={v} kecil />
            </span>
          ))}
        </div>
        <h1 className="sd-hero-title">titip surat.</h1>
        <p className="sd-hero-sub">Semua ingin suratnya sampai ke Dia. Titipkan lewat orang-orang di sekitarnya, tebak isi tangan lawan, dan bertahan sampai kartu terakhir.</p>
      </section>
      <div className="sd-home-actions">
        <button className="btn sd-cta" disabled={busy} onClick={() => void create()} data-testid="ts-create">
          <Doodle id="amplop" size={20} color="currentColor" /> buka meja
        </button>
        <div className="sd-joincode">
          <input className="field" value={code} maxLength={4} placeholder="KODE" onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z]/g, ''))} />
          <button className="btn soft" disabled={code.length !== 4} onClick={() => navigate(`/main/titip/${code}`)}>
            duduk
          </button>
        </div>
        <p className="tiny soft center">2–6 orang · 15–25 menit · bisa ditemani bot · teman tanpa akun ikut lewat QR</p>
      </div>
      {r.main ? (
        <section className="sd-rank">
          <Doodle id="perangko" size={40} color="#16161a" />
          <span className="grow">
            <b>{r.menang} kali suratmu sampai</b>
            <span className="tiny" style={{ display: 'block' }}>
              dari {r.main} permainan · {r.perangko} perangko terkumpul
            </span>
          </span>
        </section>
      ) : null}
      <section className="section">
        <span className="label">21 kartu, 10 jenis</span>
        <div className="ts-galeri">
          {surat.JENIS.map((j) => (
            <Kartu key={j.v} v={j.v} kecil onClick={() => setAturan(true)} />
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
      <Sheet open={aturan} onClose={() => setAturan(false)} title="aturan Titip Surat">
        <Aturan />
      </Sheet>
    </main>
  );
}
