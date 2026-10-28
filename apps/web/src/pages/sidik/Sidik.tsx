/**
 * SIDIK: permainan detektif bersama. Halaman depan: buat kasus, masuk dengan
 * kode, kenali peran & kasus, dan lihat pangkatmu.
 */
import { sidik } from '@sehari/core';
import { useState } from 'react';
import { navigate } from '@/lib/router';
import { useSession } from '@/lib/session';
import { createRoom, profile, rankOf, RANKS, stats } from '@/lib/sidik';
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
  const [min, title, emoji] = rankOf(s.wins);
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
          <span className="sd-lamp" />
          <span className="sd-beam" />
          <span className="sd-hat">🕵️</span>
          <span className="sd-fog" />
        </div>
        <h1 className="sd-hero-title">SIDIK</h1>
        <p className="sd-hero-sub">Satu kasus. Banyak tersangka. Dan di antara kalian, ada yang berbohong.</p>
      </section>

      <div className="sd-home-actions">
        <button className="btn sd-cta" disabled={busy} onClick={() => void create()} data-testid="sd-create">
          🗂️ buka kasus baru
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
        <span className="sd-rank-emoji">{emoji}</span>
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
          <li><b>🌙 Malam.</b> Semua menunduk. Pilih tempat untuk diselidiki, lalu tahan tombol. Yang jahat diam-diam memalsukan petunjuk.</li>
          <li><b>☀️ Pagi.</b> Petunjuk rahasia sampai di HP-mu. Bisa jadi palsu.</li>
          <li><b>💬 Diskusi.</b> Bagikan petunjuk, atau tunjukkan buktinya ke semua HP. Yang menolak menunjukkan… patut dicurigai.</li>
          <li><b>✏️ Coret.</b> Coret tersangka yang pasti bukan pelaku. Kalau pelakunya ikut tercoret, dia lolos.</li>
          <li><b>☝️ Tuduh.</b> Setelah tiga malam, tunjuk pelakunya. Lalu tonton siaran ulang: siapa memalsukan apa.</li>
        </ol>
      </section>

      <section className="section">
        <span className="label">11 peran</span>
        <div className="sd-role-gallery">
          {Object.values(sidik.ROLES).map((r) => (
            <button key={r.id} className={`sd-role-chip team-${r.team}`} onClick={() => setRole(r.id)}>
              <span>{r.emoji}</span>
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
              <span className="sd-story-emoji">{st.emoji}</span>
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
      <Sheet open={!!role} onClose={() => setRole(null)} title={role ? `${sidik.ROLES[role].emoji} ${sidik.ROLES[role].name}` : ''}>
        {role ? (
          <div className="col" style={{ gap: 8 }}>
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
