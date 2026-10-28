/**
 * SIDIK: permainan detektif bersama. Halaman depan: buat kasus, masuk dengan
 * kode, kenali peran & kasus, dan lihat pangkatmu.
 */
import { sidik } from '@sehari/core';
import { useState } from 'react';
import { navigate } from '@/lib/router';
import { useSession } from '@/lib/session';
import { createRoom, profile, rankOf, RANKS, stats } from '@/lib/sidik';
import { Scene } from '@/ui/art';
import { Doodle, Header, Sheet, useToast } from '@/ui/kit';

export default function Sidik() {
  const toast = useToast();
  const session = useSession();
  const [code, setCode] = useState('');
  const [name, setName] = useState(profile.get()?.name ?? session.me?.user.penName ?? '');
  const [ask, setAsk] = useState(false);
  const [busy, setBusy] = useState(false);
  const [role, setRole] = useState<sidik.RoleId | null>(null);
  const s = stats.get();
  const [min, title, rankDoodle] = rankOf(s.wins);
  const next = RANKS.find(([m]) => m > s.wins);

  const create = async () => {
    if (!name.trim()) return setAsk(true);
    setBusy(true);
    try {
      const p = { name: name.trim(), avatar: profile.get()?.avatar ?? 'kucing' };
      profile.set(p);
      const v = await createRoom(p);
      navigate(`/sidik/${v.code}`);
    } catch (e) {
      toast((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="screen sd-screen sd-home">
      <Header title="SIDIK" sub="permainan detektif bersama" backTo="/hari" />
      <section className="sd-hero">
        <div className="sd-hero-scene" aria-hidden>
          <Scene id="hujan-jendela" speed={1.4} />
        </div>
        <h1 className="sd-hero-title">sidik.</h1>
        <p className="sd-hero-sub">Satu kasus. Banyak tersangka. Dan di antara kalian, ada yang berbohong.</p>
      </section>

      <div className="sd-home-actions">
        <button className="btn sd-cta" disabled={busy} onClick={() => void create()} data-testid="sd-create">
          <Doodle id="ui-cari" size={20} color="currentColor" /> buka kasus baru
        </button>
        <div className="sd-joincode">
          <input className="field" value={code} maxLength={4} placeholder="KODE" onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z]/g, ''))} />
          <button className="btn soft" disabled={code.length !== 4} onClick={() => navigate(`/sidik/${code}`)}>
            masuk
          </button>
        </div>
        <p className="tiny soft center">2 sampai 20 orang · 15–25 menit · teman tanpa akun Sehari bisa ikut lewat QR</p>
      </div>

      <section className="sd-rank">
        <Doodle id={rankDoodle} size={40} color="#16161a" />
        <span className="grow">
          <b>{title}</b>
          <span className="tiny" style={{ display: 'block' }}>
            {s.games} kasus · {s.wins} menang{s.asEvil ? ` · ${s.evilWins}/${s.asEvil} sebagai penjahat` : ''}
            {next ? ` · ${next[0] - s.wins} kemenangan lagi menuju ${next[1]}` : ''}
          </span>
        </span>
        <span className="sd-rank-bar" style={{ width: `${next ? ((s.wins - min) / (next[0] - min)) * 100 : 100}%` }} />
      </section>

      <section className="section">
        <span className="label">cara bermain</span>
        <ol className="sd-how">
          {(
            [
              ['bulan', 'Malam.', 'Semua menunduk. Pilih tempat untuk diselidiki, lalu tahan tombol. Yang jahat diam-diam memalsukan petunjuk.'],
              ['matahari', 'Pagi.', 'Petunjuk rahasia sampai di HP-mu. Bisa jadi palsu.'],
              ['gelembung-kata', 'Diskusi.', 'Bagikan petunjuk, atau tunjukkan buktinya ke semua HP. Yang menolak menunjukkan… patut dicurigai.'],
              ['silang', 'Coret.', 'Coret tersangka yang pasti bukan pelaku. Kalau pelakunya ikut tercoret, dia lolos.'],
              ['ui-cari', 'Tuduh.', 'Setelah tiga malam, tunjuk pelakunya. Lalu tonton siaran ulang: siapa memalsukan apa.'],
            ] as const
          ).map(([d, t, x]) => (
            <li key={t}>
              <Doodle id={d} size={34} />
              <span>
                <b>{t}</b> {x}
              </span>
            </li>
          ))}
        </ol>
      </section>

      <section className="section">
        <span className="label">11 peran</span>
        <div className="sd-role-gallery">
          {Object.values(sidik.ROLES).map((r) => (
            <button key={r.id} className={`sd-role-chip team-${r.team}`} onClick={() => setRole(r.id)}>
              <Doodle id={r.doodle} size={34} color="currentColor" />
              <b>{r.name}</b>
            </button>
          ))}
        </div>
      </section>

      <section className="section">
        <span className="label">{sidik.STORIES.length} kasus</span>
        <div className="sd-story-list">
          {sidik.STORIES.map((st) => (
            <div key={st.id} className="sd-story-card">
              <span className="sd-tape" />
              <Doodle id={st.doodle} size={40} color="#16161a" />
              <b>{st.title}</b>
              <span className="tiny">{st.genre}</span>
              <p className="tiny">{st.crime}</p>
            </div>
          ))}
        </div>
        <p className="tiny soft center">Tersangka, ciri, dan pelakunya diacak setiap main. Kasus yang sama tidak pernah terulang persis.</p>
      </section>

      <Sheet open={ask} onClose={() => setAsk(false)} title="nama samaranmu">
        <div className="col" style={{ gap: 10 }}>
          <input className="field" maxLength={24} value={name} onChange={(e) => setName(e.target.value)} placeholder="mis. Detektif Kopi" autoFocus />
          <button className="btn" disabled={!name.trim()} onClick={() => (setAsk(false), void create())}>
            buka kasus
          </button>
        </div>
      </Sheet>
      <Sheet open={!!role} onClose={() => setRole(null)} title={role ? sidik.ROLES[role].name : ''}>
        {role ? (
          <div className="col" style={{ gap: 8 }}>
            <Doodle id={sidik.ROLES[role].doodle} size={64} draw />
            <i className="small">{sidik.ROLES[role].tagline}</i>
            <span className="small">
              <b>Kemampuan.</b> {sidik.ROLES[role].power}
            </span>
            <span className="small">
              <b>Tujuan.</b> {sidik.ROLES[role].goal}
            </span>
            <span className="tiny soft">
              Tim: {sidik.ROLES[role].team === 'baik' ? 'detektif' : sidik.ROLES[role].team === 'jahat' ? 'pelaku' : 'netral'}
            </span>
          </div>
        ) : null}
      </Sheet>
    </main>
  );
}
