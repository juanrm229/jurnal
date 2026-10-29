/**
 * KARTU SATU: halaman depan. Buka meja, masuk dengan kode, aturan ori &
 * aturan tongkrongan.
 */
import { satu } from '@sehari/core';
import { type CSSProperties, useState } from 'react';
import { navigate } from '@/lib/router';
import { createMeja, rekor } from '@/lib/satu';
import { useSession } from '@/lib/session';
import { profile } from '@/lib/sidik';
import { Doodle, Header, Sheet, useToast } from '@/ui/kit';
import { AturanSatu, KartuSatu } from './parts';

const KIPAS: satu.Card[] = [
  { id: 1, w: 'm', t: '7' },
  { id: 2, w: 'k', t: 'skip' },
  { id: 3, w: null, t: '+4' },
  { id: 4, w: 'h', t: 'rev' },
  { id: 5, w: 'b', t: '+2' },
];

export default function SatuBeranda() {
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
      navigate(`/main/satu/${v.code}`);
    } catch (e) {
      toast((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="screen sd-screen ts-beranda">
      <Header title="Kartu Satu" sub="Ruang Main · cocokkan warna, 2–10 orang" backTo="/main" />
      <section className="ts-hero">
        <div className="ts-hero-kartu" aria-hidden>
          {KIPAS.map((c, i) => (
            <span key={c.id} style={{ '--i': i - 2 } as CSSProperties}>
              <KartuSatu c={c} />
            </span>
          ))}
        </div>
        <h1 className="sd-hero-title">kartu satu.</h1>
        <p className="sd-hero-sub">Cocokkan warna atau angka, balas plus dengan plus, dan jangan lupa teriak "SATU!" sebelum ketahuan.</p>
      </section>
      <div className="sd-home-actions">
        <button className="btn sd-cta" disabled={busy} onClick={() => void create()} data-testid="st-create">
          <Doodle id="kartu" size={20} color="currentColor" /> buka meja
        </button>
        <div className="sd-joincode">
          <input className="field" value={code} maxLength={4} placeholder="KODE" onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z]/g, ''))} />
          <button className="btn soft" disabled={code.length !== 4} onClick={() => navigate(`/main/satu/${code}`)}>
            duduk
          </button>
        </div>
        <p className="tiny soft center">2–10 orang · aturan ori atau tongkrongan · bisa ditemani bot</p>
      </div>
      {r.main ? (
        <section className="sd-rank">
          <Doodle id="kartu" size={40} color="#16161a" />
          <span className="grow">
            <b>{r.menang} kali menang</b>
            <span className="tiny" style={{ display: 'block' }}>
              dari {r.main} permainan · {r.kalah} kali traktir gorengan
            </span>
          </span>
        </section>
      ) : null}
      <section className="section">
        <span className="label">dua cara main</span>
        <div className="st-preset">
          <div>
            <Doodle id="bintang" size={28} color="currentColor" />
            <b>Aturan Ori</b>
            <span className="tiny">Persis aturan resmi: tanpa tumpuk, +4 bisa ditantang, lupa "satu!" ambil 2, kumpulkan 500 poin.</span>
          </div>
          <div>
            <Doodle id="kopi-susu" size={28} color="currentColor" />
            <b>Aturan Tongkrongan</b>
            <span className="tiny">Tumpuk & balas plus, pantul pakai Putar Balik, salip, buang kembar, tutup harus angka, main sampai ketemu yang kalah.</span>
          </div>
        </div>
        <p className="tiny soft center">Atau racik sendiri: setiap aturan bisa dinyalakan satu per satu.</p>
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
      <Sheet open={aturan} onClose={() => setAturan(false)} title="aturan Kartu Satu">
        <AturanSatu />
      </Sheet>
    </main>
  );
}
