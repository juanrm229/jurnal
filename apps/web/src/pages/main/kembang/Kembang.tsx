/**
 * KEMBANG API: halaman depan. Kooperatif: kamu melihat kartu semua orang
 * kecuali kartumu sendiri.
 */
import { useState } from 'react';
import { createMeja, rekor } from '@/lib/hanabi';
import { navigate } from '@/lib/router';
import { useSession } from '@/lib/session';
import { profile } from '@/lib/sidik';
import { Doodle, Header, Sheet, useToast } from '@/ui/kit';
import { AturanKembang, KartuK } from './parts';

const TAMPIL = (['m', 'k', 'h', 'b', 'p'] as const).map((w, i) => ({ id: i, w, n: i + 1, tahu: { warna: [], angka: [], sentuh: false, tanda: false } }));

export default function KembangBeranda() {
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
      navigate(`/main/kembang/${v.code}`);
    } catch (e) {
      toast((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <main className="screen sd-screen ts-beranda kb-beranda">
      <Header title="Kembang Api" sub="Ruang Main · kooperatif, 2–5 orang" backTo="/main" />
      <section className="ts-hero">
        <div className="kb-hero" aria-hidden>
          {TAMPIL.map((c) => (
            <KartuK key={c.id} c={c} warnaMain={['m', 'k', 'h', 'b', 'p']} />
          ))}
        </div>
        <h1 className="sd-hero-title">kembang api.</h1>
        <p className="sd-hero-sub">Kalian melihat kartu semua orang, kecuali kartu sendiri. Dengan petunjuk yang terbatas, nyalakan pertunjukan kembang api terindah bersama.</p>
      </section>
      <div className="sd-home-actions">
        <button className="btn sd-cta" disabled={busy} onClick={() => void create()} data-testid="kb-create">
          <Doodle id="kembang-api" size={20} color="currentColor" /> buka meja
        </button>
        <div className="sd-joincode">
          <input className="field" value={code} maxLength={4} placeholder="KODE" onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z]/g, ''))} />
          <button className="btn soft" disabled={code.length !== 4} onClick={() => navigate(`/main/kembang/${code}`)}>
            duduk
          </button>
        </div>
        <p className="tiny soft center">2–5 orang · 20–30 menit · bisa berdua dengan bot</p>
      </div>
      {r.main ? (
        <section className="sd-rank">
          <Doodle id="kembang-api" size={40} color="#16161a" />
          <span className="grow">
            <b>skor terbaik {r.terbaik}</b>
            <span className="tiny" style={{ display: 'block' }}>
              dari {r.main} pertunjukan
            </span>
          </span>
        </section>
      ) : null}
      <section className="section">
        <span className="label">cara bermain</span>
        <ol className="sd-how">
          {(
            [
              ['ui-hening', 'Kartumu menghadap teman.', 'Kamu tidak tahu kartumu sendiri. Teman yang tahu.'],
              ['gelembung-kata', 'Petunjuk terbatas.', 'Sebut satu warna atau satu angka, dan tunjukkan semua kartu yang cocok. Hanya ada 8 token.'],
              ['kembang-api', 'Nyalakan berurutan.', 'Mainkan kartu 1 sampai 5 di setiap warna. Salah tiga kali, pertunjukan gagal.'],
              ['bintang', 'Skor 25.', 'Legendaris. Hampir mustahil, sangat memuaskan.'],
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
      <Sheet open={aturan} onClose={() => setAturan(false)} title="aturan Kembang Api">
        <AturanKembang />
      </Sheet>
    </main>
  );
}
