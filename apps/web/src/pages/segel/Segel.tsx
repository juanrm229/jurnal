/**
 * SEBELUM DISEGEL: halaman depan. Buka meja, masuk dengan kode, pelajari
 * script, profesi, dan jinx, lihat gelarmu.
 */
import { segel } from '@sehari/core';
import { useState } from 'react';
import { navigate } from '@/lib/router';
import { createMeja, GELAR, gelarOf, segelStats } from '@/lib/segel';
import { useSession } from '@/lib/session';
import { profile } from '@/lib/sidik';
import { Scene } from '@/ui/art';
import { Doodle, Header, Sheet, useToast } from '@/ui/kit';
import { ProfInfo, ScriptSheet } from './parts';

export default function Segel() {
  const toast = useToast();
  const session = useSession();
  const [code, setCode] = useState('');
  const [name, setName] = useState(profile.get()?.name ?? session.me?.user.penName ?? '');
  const [ask, setAsk] = useState(false);
  const [busy, setBusy] = useState(false);
  const [prof, setProf] = useState<segel.ProfId | null>(null);
  const [script, setScript] = useState<string | null>(null);
  const [rumpun, setRumpun] = useState<segel.Rumpun | 'semua'>('semua');
  const s = segelStats.get();
  const [min, title, doodle] = gelarOf(s.wins);
  const next = GELAR.find(([m]) => m > s.wins);

  const create = async () => {
    if (!name.trim()) return setAsk(true);
    setBusy(true);
    try {
      const p = { name: name.trim(), avatar: profile.get()?.avatar ?? 'kucing' };
      profile.set(p);
      const v = await createMeja(p);
      navigate(`/segel/${v.code}`);
    } catch (e) {
      toast((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const profs = Object.values(segel.PROFS).filter((p) => rumpun === 'semua' || p.rumpun === rumpun);

  return (
    <main className="screen sd-screen sg-home">
      <Header title="Sebelum Disegel" sub="arsip berlapis" backTo="/hari" />
      <section className="sd-hero">
        <div className="sd-hero-scene" aria-hidden>
          <Scene id="amplop-segel" speed={1.3} />
        </div>
        <h1 className="sd-hero-title">sebelum disegel.</h1>
        <p className="sd-hero-sub">Satu kejadian. Banyak salinan. Seseorang di meja ini sedang mengubah arsip.</p>
      </section>

      <div className="sd-home-actions">
        <button className="btn sd-cta" disabled={busy} onClick={() => void create()} data-testid="sg-create">
          <Doodle id="segel-lilin" size={20} color="currentColor" /> buka meja baru
        </button>
        <div className="sd-joincode">
          <input className="field" value={code} maxLength={4} placeholder="KODE" onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z]/g, ''))} />
          <button className="btn soft" disabled={code.length !== 4} onClick={() => navigate(`/segel/${code}`)}>
            masuk
          </button>
        </div>
        <p className="tiny soft center">2–16 orang · 25–45 menit · 2–4 kooperatif, 5+ ada Revisi tersembunyi · tanpa eliminasi</p>
      </div>

      <section className="sd-rank">
        <Doodle id={doodle} size={40} color="#16161a" />
        <span className="grow">
          <b>{title}</b>
          <span className="tiny" style={{ display: 'block' }}>
            {s.games} arsip · {s.wins} menang{s.perfect ? ` · ${s.perfect} sempurna` : ''}
            {s.asRevisi ? ` · ${s.revisiWins}/${s.asRevisi} sebagai Revisi` : ''}
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
              ['segel-lilin', 'Profesi & kubu.', 'Profesi adalah alatmu. Kubu (Restorasi atau Revisi) adalah tujuanmu, dan keduanya terpisah.'],
              ['amplop', 'Berkas.', 'Tiap bab kamu memegang berkas rahasia. Ada kamera yang jamnya meleset, saksi yang salah dengar, dan salinan yang diam-diam disunting.'],
              ['stempel', 'Satu aksi.', 'Terbitkan, kirim, audit asal (1 Lensa), pakai profesi, atau buktikan fakta (2 Lensa). Semua diselesaikan serentak.'],
              ['kompas', 'Mesin dunia.', 'Centang salinan yang kamu percaya, dan lihat dunia mana yang tersisa. Kalau bertentangan, ada yang berbohong.'],
              ['gelembung-kata', 'Runding & segel.', 'Diskusi, lalu segel teori: siapa, lewat mana, pukul berapa.'],
              ['bintang', 'Putusan.', 'Di bab 4, tarik cadangan dan putuskan tiga jangkar. Restorasi menang bila benar dan rantai bukti publiknya cukup.'],
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
        <span className="label">script</span>
        <div className="sd-story-list">
          {segel.SCRIPTS.map((sc) => (
            <button key={sc.id} className="sd-story-card sg-script-tile" onClick={() => setScript(sc.id)}>
              <span className="sd-tape" />
              <b>{sc.nama}</b>
              <span className="tiny">
                {sc.min}–{sc.max} orang · {sc.pool.length} profesi · {segel.jinxFor(sc.pool).length} jinx
              </span>
              <p className="tiny">{sc.desk}</p>
            </button>
          ))}
        </div>
      </section>

      <section className="section">
        <span className="label">almanak · {Object.keys(segel.PROFS).length} profesi · {segel.JINX.length} jinx</span>
        <div className="sd-stories">
          {(['semua', ...Object.keys(segel.RUMPUN)] as (segel.Rumpun | 'semua')[]).map((r) => (
            <button key={r} className={`pill sm ${rumpun === r ? 'active' : ''}`} onClick={() => setRumpun(r)}>
              {r === 'semua' ? 'semua' : segel.RUMPUN[r]}
            </button>
          ))}
        </div>
        <div className="sg-prof-grid mt">
          {profs.map((p) => (
            <button key={p.id} className="sg-prof-chip" onClick={() => setProf(p.id)}>
              <Doodle id={p.doodle} size={28} color="currentColor" />
              <b>{p.nama}</b>
              {segel.JINX.some((j) => j.a === p.id || j.b === p.id) ? <span className="sg-jx">jinx</span> : null}
            </button>
          ))}
        </div>
      </section>

      <section className="section">
        <span className="label">{segel.TEMA.length} kasus</span>
        <div className="sd-story-list">
          {segel.TEMA.map((t) => (
            <div key={t.id} className="sd-story-card">
              <span className="sd-tape" />
              <Doodle id={t.doodle} size={40} color="#16161a" />
              <b>{t.judul}</b>
              <p className="tiny">{t.pembuka.replace('{obj}', t.obj).replace('{asal}', t.asal).split('. ').slice(0, 2).join('. ')}.</p>
            </div>
          ))}
        </div>
        <p className="tiny soft center">Pelaku, jalur, waktu, jam kamera, dan jebakannya dibangun ulang setiap main. Setiap kasus diperiksa mesin: jawabannya tunggal dan bisa dicapai.</p>
      </section>

      <Sheet open={ask} onClose={() => setAsk(false)} title="nama panggilanmu">
        <div className="col" style={{ gap: 10 }}>
          <input className="field" maxLength={24} value={name} onChange={(e) => setName(e.target.value)} placeholder="mis. Juru Salin" autoFocus />
          <button className="btn" disabled={!name.trim()} onClick={() => (setAsk(false), void create())}>
            buka meja
          </button>
        </div>
      </Sheet>
      <Sheet open={!!prof} onClose={() => setProf(null)} title={prof ? segel.PROFS[prof].nama : ''}>
        {prof ? <ProfInfo id={prof} /> : null}
      </Sheet>
      <Sheet open={!!script} onClose={() => setScript(null)} title={script ? segel.scriptOf(script).nama : ''}>
        {script ? <ScriptSheet id={script} /> : null}
      </Sheet>
    </main>
  );
}
