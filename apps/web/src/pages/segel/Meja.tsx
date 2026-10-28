/**
 * Meja SEBELUM DISEGEL: satu layar yang berganti mengikuti fase. Aplikasi
 * menjadi moderator: menyelesaikan aksi, mencatat versi salinan, memeriksa
 * rantai bukti. HP tuan rumah membacakan narasi.
 */
import { segel } from '@sehari/core';
import { useEffect, useRef, useState } from 'react';
import { navigate, useParams } from '@/lib/router';
import { anchorLabel, dimOfView, joinMeja, leaveMeja, segelStats, sendSegel, temaOfView, useMeja, type View } from '@/lib/segel';
import { useSession } from '@/lib/session';
import { hush, profile, sfx, speak, useCountdown, useWakeLock, vibrate } from '@/lib/sidik';
import { QR } from '@/ui/art';
import { Doodle, Growing, Header, Sheet, Toggle, useToast } from '@/ui/kit';
import { faceOf, HoldButton, PlayerFace, Timer } from '../sidik/parts';
import { AnchorPick, Berkas, Composer, Indeks, Jangkar, Kabar, mainText, MesinDunia, nameIn, ProfInfo, Rekonstruksi, ScriptSheet } from './parts';

type Act = (a: segel.Action) => void;
const AVATARS = ['tunas', 'kucing', 'burung', 'ikan', 'kelinci', 'landak', 'bebek', 'katak', 'kupu-kupu', 'lebah', 'siput', 'kepik'];

const LINE: Partial<Record<segel.Phase, (v: View) => string>> = {
  peran: () => 'Lihat profesi dan kubumu diam-diam. Profesi adalah alat. Kubu adalah tujuan.',
  aksi: (v) => `Bab ${v.bab}. Setiap orang mengunci satu aksi. Arsip akan menyelesaikannya bersamaan.`,
  runding: () => 'Hasil sudah dibagikan. Berundinglah. Ingat: salinan bisa berbeda dari sumbernya.',
  segel: (v) => (v.bab === 4 ? 'Segel akhir. Kunci teorimu, dan lampirkan berkas yang ingin masuk arsip.' : 'Segel teorimu: siapa, lewat mana, pukul berapa.'),
  pulih: () => 'Bab terakhir. Pilih dua laporan untuk ditarik dari arsip pusat.',
  vonis: () => 'Putusan. Setiap jangkar butuh suara lebih dari separuh meja.',
  tebak: () => 'Sebelum hasil dibuka, tunjuk siapa yang menurutmu Revisi.',
};

export default function Meja() {
  const { code = '' } = useParams<{ code: string }>();
  const C = code.toUpperCase();
  const { view, err, apply, serverNow } = useMeja(C);
  const toast = useToast();
  const session = useSession();
  const [busy, setBusy] = useState(false);
  useWakeLock(!!view?.mine && view.phase !== 'end');

  const act: Act = async (a) => {
    setBusy(true);
    try {
      apply(await sendSegel(C, a));
    } catch (e) {
      toast((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const last = useRef('');
  useEffect(() => {
    if (!view?.mine) return;
    const key = `${view.phase}:${view.bab}:${view.vonis.round}`;
    if (last.current === key) return;
    const first = last.current === '';
    last.current = key;
    if (first) return;
    const ph = view.phase;
    if (ph === 'aksi') (vibrate([120, 80, 120]), sfx.night());
    if (ph === 'runding') (vibrate(80), sfx.dawn());
    if (ph === 'segel' || ph === 'vonis') (vibrate([60, 60, 160]), sfx.stamp());
    if (ph === 'end') (vibrate([100, 80, 300]), won(view) ? sfx.reveal() : sfx.fail());
    const narr = view.opts.narrator && view.mine && view.me === view.host;
    const tm = temaOfView(view);
    if (ph === 'intro') speak(tm.pembuka.replace('{obj}', tm.obj).replace('{asal}', tm.asal), narr);
    else if (ph === 'end' && view.result) speak(endLine(view), narr);
    else speak(LINE[ph]?.(view) ?? '', narr);
  }, [view?.phase, view?.bab, view?.vonis.round]);
  useEffect(() => () => hush(), []);

  useEffect(() => {
    if (view?.phase !== 'end' || !view.result || !view.mine?.kubu) return;
    const tag = `${view.code}:${view.result.reason}:${view.board.length}`;
    if (localStorage.getItem('sehari.segelLast') === tag) return;
    localStorage.setItem('sehari.segelLast', tag);
    segelStats.add(view.mine.kubu, won(view), view.result.sempurna);
  }, [view?.phase]);

  if (err && !view)
    return (
      <main className="screen sd-screen">
        <Header title="Sebelum Disegel" backTo="/segel" />
        <div className="sd-empty">
          <Doodle id="awan" size={64} />
          <p>{err}</p>
          <button className="btn soft" onClick={() => navigate('/segel')}>
            kembali
          </button>
        </div>
      </main>
    );
  if (!view) return <Growing label="membuka arsip…" />;
  if (!view.mine) return <Masuk view={view} defaultName={profile.get()?.name ?? session.me?.user.penName ?? ''} onJoin={async (p) => { profile.set(p); try { apply(await joinMeja(C, p)); } catch (e) { toast((e as Error).message); } }} />;

  const inGame = view.phase !== 'lobby' && view.phase !== 'end';
  return (
    <main className={`screen sd-screen sg-screen ph-${view.phase} ${inGame ? 'ingame' : ''}`}>
      <Atas view={view} serverNow={serverNow} onLeave={async () => { if (view.phase === 'lobby') await leaveMeja(C).catch(() => {}); navigate('/segel'); }} />
      {view.phase === 'lobby' ? <Lobi view={view} act={act} busy={busy} /> : null}
      {view.phase === 'intro' ? <Pembuka view={view} act={act} /> : null}
      {view.phase === 'peran' ? <Peran view={view} act={act} /> : null}
      {view.phase === 'aksi' || view.phase === 'runding' ? <Bab view={view} act={act} code={C} busy={busy} /> : null}
      {view.phase === 'segel' ? <SegelTeori view={view} act={act} busy={busy} /> : null}
      {view.phase === 'pulih' ? <Pulih view={view} act={act} busy={busy} /> : null}
      {view.phase === 'vonis' ? <Vonis view={view} act={act} busy={busy} code={C} /> : null}
      {view.phase === 'tebak' ? <Tebak view={view} act={act} /> : null}
      {view.phase === 'end' ? <Akhir view={view} /> : null}
    </main>
  );
}

function won(v: View) {
  return !!v.result && v.mine?.kubu === v.result.winner;
}

function endLine(v: View) {
  const r = v.result!;
  const tm = temaOfView(v);
  const w = v.reveal!.w;
  const truth = `${segel.worldText(tm, w)}.`;
  const why = {
    benar: `Arsip disegel dengan benar. ${truth} ${tm.penutup}`,
    salah: `Arsip disegel, tapi isinya keliru. Yang sebenarnya: ${truth}`,
    buntu: `Meja tidak mencapai mayoritas. Arsip ditutup tanpa putusan sah. ${truth}`,
    lemah: `Jawabannya benar, tapi rantai bukti di papan tidak cukup membuktikannya. Arsip ditolak. ${truth}`,
  }[r.reason];
  return why;
}

function Atas({ view, serverNow, onLeave }: { view: View; serverNow: () => number; onLeave: () => void }) {
  const secs = useCountdown(view.deadline, serverNow);
  const total = view.phase === 'runding' ? view.opts.talk : view.phase in segel.DUR ? segel.DUR[view.phase as keyof typeof segel.DUR] / 1000 : undefined;
  const beat = useRef(-1);
  useEffect(() => {
    if (secs === null || secs > 10 || secs === beat.current || !['aksi', 'runding', 'segel', 'vonis', 'pulih'].includes(view.phase)) return;
    beat.current = secs;
    if (secs <= 5) (vibrate(90), sfx.heart());
    else sfx.tick();
  }, [secs]);
  const tm = temaOfView(view);
  const label: Partial<Record<segel.Phase, string>> = {
    intro: 'berkas pembuka',
    peran: 'profesi & kubu',
    aksi: `bab ${view.bab} · aksi`,
    runding: `bab ${view.bab} · runding`,
    segel: view.bab === 4 ? 'segel akhir' : `bab ${view.bab} · segel teori`,
    pulih: 'bab 4 · cadangan',
    vonis: `putusan${view.vonis.round > 1 ? ` · putaran ${view.vonis.round}` : ''}`,
    tebak: 'tunjuk Revisi',
    end: 'arsip ditutup',
  };
  const prof = view.mine?.prof ? segel.PROFS[view.mine.prof] : null;
  return (
    <header className="sd-top">
      <button className="hdr-back" aria-label="keluar" onClick={onLeave}>
        <Doodle id="ui-kembali" size={20} />
      </button>
      <div className="sd-top-mid">
        <b>
          <Doodle id={view.phase === 'lobby' ? 'segel-lilin' : tm.doodle} size={20} color="currentColor" /> {view.phase === 'lobby' ? 'Sebelum Disegel' : tm.judul}
        </b>
        <span>
          {label[view.phase] ?? `meja ${view.code}`}
          {prof && view.phase !== 'lobby' ? (
            <>
              {' · '}
              <Doodle id={prof.doodle} size={13} color="currentColor" />
            </>
          ) : null}
          {view.mine && view.dim ? (
            <span className="sg-lensa-top">
              {' · '}
              <Doodle id="kacamata" size={13} color="currentColor" /> {view.mine.lensa}
            </span>
          ) : null}
        </span>
      </div>
      <Timer secs={secs} total={total} />
    </header>
  );
}

// ── Masuk & lobi ────────────────────────────────────────────────────────────

function Masuk({ view, defaultName, onJoin }: { view: View; defaultName: string; onJoin: (p: { name: string; avatar: string }) => void }) {
  const [name, setName] = useState(defaultName);
  const [avatar, setAvatar] = useState(profile.get()?.avatar ?? AVATARS[Math.floor(Math.random() * AVATARS.length)]!);
  return (
    <main className="screen sd-screen">
      <Header title="masuk ke meja" sub={`meja ${view.code}`} backTo="/segel" />
      <section className="sd-join">
        <Doodle id="segel-lilin" size={80} draw />
        <p className="sd-join-title">{view.phase === 'lobby' ? 'Kamu diundang menyusun sebuah arsip.' : 'Meja ini sudah berjalan.'}</p>
        <div className="sd-avatars">
          {AVATARS.map((a) => (
            <button key={a} className={avatar === a ? 'on' : ''} onClick={() => setAvatar(a)}>
              <Doodle id={a} size={26} color="currentColor" />
            </button>
          ))}
        </div>
        <input className="field sd-name" maxLength={24} value={name} placeholder="nama panggilanmu" onChange={(e) => setName(e.target.value)} autoFocus />
        <button className="btn sd-cta" disabled={!name.trim() || view.phase !== 'lobby'} onClick={() => onJoin({ name: name.trim(), avatar })} data-testid="sg-join">
          duduk di meja
        </button>
        <p className="tiny soft center">Tidak perlu akun. Namamu hanya terlihat di meja ini.</p>
      </section>
    </main>
  );
}

function Lobi({ view, act, busy }: { view: View; act: Act; busy: boolean }) {
  const host = view.me === view.host;
  const link = `${location.origin}/segel/${view.code}`;
  const n = view.players.length;
  const script = segel.scriptOf(view.script.id);
  const [sheet, setSheet] = useState<string | null>(null);
  const revisi = segel.revisiFor(Math.max(2, n));
  return (
    <section className="sd-lobby">
      <div className="sd-code-card">
        <span className="tiny">kode meja</span>
        <b className="sd-code">{view.code}</b>
        <div className="sd-qr">
          <QR value={link} size={150} />
        </div>
        <div className="row" style={{ gap: 8 }}>
          <a className="btn sm soft grow wa" href={`https://wa.me/?text=${encodeURIComponent(`Ada arsip yang harus disegel malam ini. Masuk pakai kode ${view.code}: ${link}`)}`} target="_blank" rel="noreferrer">
            undang lewat WA
          </a>
          <a className="btn sm soft grow" href={`/segel/${view.code}/tv`} target="_blank" rel="noreferrer">
            <Doodle id="laptop" size={16} color="currentColor" /> mode TV
          </a>
        </div>
      </div>

      <span className="sd-label">di meja · {n}/16</span>
      <div className="sd-players">
        {view.players.map((p) => (
          <span key={p.id} className="sd-player rise">
            <PlayerFace avatar={p.avatar} size={46} />
            <span className="tiny">
              {p.name}
              {p.id === view.host ? ' ★' : ''}
            </span>
          </span>
        ))}
      </div>
      <p className="small soft center">{n <= 4 ? 'Kooperatif: kalian semua Restorasi, melawan gangguan arsip yang mengubah salinan diam-diam.' : `${revisi} Revisi tersembunyi di antara kalian · pagu suntingan meja ${segel.paguFor(n)}.`}</p>

      <button className="sg-script-card" onClick={() => setSheet(script.id)}>
        <span className="sd-tape" />
        <span className="tiny">script{view.script.auto ? ' · otomatis' : ''}</span>
        <b>{script.nama}</b>
        <span className="tiny">
          {script.pool.length} profesi · {segel.jinxFor(script.pool).length} jinx · lihat lembar script
        </span>
      </button>

      {host ? (
        <div className="sd-settings">
          <span className="sd-label">script</span>
          <div className="sd-stories">
            {[{ id: 'auto', nama: 'otomatis' }, ...segel.SCRIPTS].map((s) => (
              <button key={s.id} className={`pill sm ${view.opts.script === s.id ? 'active' : ''}`} onClick={() => act({ t: 'opts', script: s.id })}>
                {s.nama}
              </button>
            ))}
          </div>
          <span className="sd-label">kasus</span>
          <div className="sd-stories">
            {[{ id: 'acak', doodle: 'ui-dadu', judul: 'acak' }, ...segel.TEMA].map((s) => (
              <button key={s.id} className={`pill sm sd-story-chip ${view.opts.tema === s.id ? 'active' : ''}`} onClick={() => act({ t: 'opts', tema: s.id })}>
                <Doodle id={s.doodle} size={16} color="currentColor" />
                {s.judul}
              </button>
            ))}
          </div>
          <span className="sd-label">waktu runding per bab</span>
          <div className="seg">
            {[120, 240, 360, 480].map((t) => (
              <button key={t} className={view.opts.talk === t ? 'on' : ''} onClick={() => act({ t: 'opts', talk: t })}>
                {t / 60} mnt
              </button>
            ))}
          </div>
          <div className="mt">
            <Toggle label="narator suara" hint="dibacakan dari HP ini; taruh di tengah meja" value={view.opts.narrator} onChange={(x) => act({ t: 'opts', narrator: x })} />
          </div>
          <button className="btn sd-cta" disabled={n < 2 || busy} onClick={() => act({ t: 'start' })} data-testid="sg-start">
            buka arsip
          </button>
        </div>
      ) : (
        <p className="sd-wait">Menunggu tuan rumah membuka arsip…</p>
      )}
      <Sheet open={!!sheet} onClose={() => setSheet(null)} title={script.nama}>
        {sheet ? <ScriptSheet id={sheet} /> : null}
      </Sheet>
    </section>
  );
}

// ── Pembuka & peran ─────────────────────────────────────────────────────────

function Ready({ view, act, label = 'siap' }: { view: View; act: Act; label?: string }) {
  const me = view.players.find((p) => p.id === view.me);
  const ready = view.players.filter((p) => p.ready).length;
  return (
    <div className="sd-ready">
      <button className="btn sd-cta" disabled={me?.ready} onClick={() => act({ t: 'ready' })} data-testid="sg-ready">
        {me?.ready ? `menunggu yang lain (${ready}/${view.players.length})` : label}
      </button>
    </div>
  );
}

function Pembuka({ view, act }: { view: View; act: Act }) {
  const tm = temaOfView(view);
  const d = dimOfView(view);
  return (
    <section className="sg-pembuka">
      <article className="sd-file">
        <span className="sd-file-tab">berkas pembuka</span>
        <Doodle id={tm.doodle} size={56} draw />
        <h2 className="sd-file-title">{tm.judul}</h2>
        <p className="sd-file-text">{tm.pembuka.replace('{obj}', tm.obj).replace('{asal}', tm.asal)}</p>
        <div className="sg-known">
          <span className="sd-label">yang diketahui semua orang</span>
          <ul className="small">
            <li>
              Tepat satu dari {d.K} tokoh membawa <b>{tm.obj}</b> dari {tm.asal} ke {tm.tujuan}, lewat satu dari {d.R} jalur, pada satu dari {d.T} waktu.
            </li>
            <li>Tidak ada pelaku kedua, jalur rahasia, atau benda kembar.</li>
            <li>Jam acuan malam itu disebut KAS. Ada alat yang jamnya tidak tepat.</li>
            <li>Kesaksian bisa keliru. Salinan bisa disunting. Sumber asli tidak pernah berubah.</li>
          </ul>
          <div className="sg-cast">
            {tm.tokoh.slice(0, d.K).map((t) => (
              <span key={t.name} className="sg-cast-one">
                <Doodle id={faceOf(t.name)} size={30} color="currentColor" />
                <b>{t.name}</b>
                <span className="tiny">{t.job}</span>
              </span>
            ))}
          </div>
          <div className="sg-chips">
            {tm.jalur.slice(0, d.R).map((j) => (
              <span key={j} className="pill sm">
                <Doodle id="peta-lipat" size={14} color="currentColor" /> {j}
              </span>
            ))}
            {Array.from({ length: d.T }, (_, i) => (
              <span key={i} className="pill sm">
                <Doodle id="jam-dinding" size={14} color="currentColor" /> {segel.slotTime(tm, i)}
              </span>
            ))}
          </div>
        </div>
      </article>
      <Ready view={view} act={act} label="aku siap menyusun arsip" />
    </section>
  );
}

function Peran({ view, act }: { view: View; act: Act }) {
  const me = view.mine!;
  const [open, setOpen] = useState(false);
  const prof = me.prof ? segel.PROFS[me.prof] : null;
  const tm = temaOfView(view);
  const team = view.players.filter((p) => p.kubu === 'revisi' && p.id !== view.me);
  const rv = me.revisi;
  return (
    <section className="sd-rolephase">
      <p className="sd-whisper">Pegang HP-mu rapat-rapat.</p>
      {!open ? (
        <div className="sg-sealed">
          <HoldButton label="tahan untuk membuka segel" onDone={() => setOpen(true)} />
        </div>
      ) : (
        <>
          {prof ? (
            <div className="sg-prof-card rise">
              <span className="sd-tape" />
              <Doodle id={prof.doodle} size={64} draw />
              <span className="tiny">profesimu · {segel.RUMPUN[prof.rumpun]}</span>
              <h2>{prof.nama}</h2>
              <p className="small">{prof.teks}</p>
              <p className="tiny soft">{prof.batas}</p>
            </div>
          ) : null}
          <div className={`sg-kubu ${me.kubu}`}>
            <span className="sg-wax">{me.kubu === 'revisi' ? '✎' : view.coop ? '∞' : '✓'}</span>
            <span className="grow">
              <span className="tiny">kubumu</span>
              <b>{me.kubu === 'revisi' ? 'Revisi' : 'Restorasi'}</b>
              <span className="small" style={{ display: 'block' }}>
                {me.kubu === 'revisi'
                  ? 'Buat setidaknya satu jangkar final keliru, atau arsip ditutup tanpa putusan sah. Kamu bisa memberi info benar demi dipercaya.'
                  : view.coop
                    ? 'Kalian semua di sini. Lawannya adalah gangguan arsip yang mengubah salinan diam-diam.'
                    : 'Segel arsip dengan pelaku, jalur, dan waktu yang benar, didukung rantai bukti publik.'}
              </span>
            </span>
          </div>
          {rv ? (
            <div className="sg-truth">
              <span className="tiny">yang hanya kamu tahu</span>
              <b>{segel.worldText(tm, rv.w)}.</b>
              <span className="small">
                Kamera {tm.kamera[0]} {rv.off > 0 ? `terlambat ${rv.off * 7} menit` : `lebih cepat ${-rv.off * 7} menit`}. Umpan yang beredar mengarah ke {anchorLabel(tm, 'p', rv.decoy.p)} lewat {anchorLabel(tm, 'r', rv.decoy.r)}.
              </span>
              <span className="small">Tinta Revisi: {me.tinta} kali suntingan rahasia. Laporan menyesatkan: {rv.herrings.join(', ') || '—'}.</span>
              {team.length ? <span className="small">Rekan Revisi: {team.map((p) => p.name).join(', ')}.</span> : null}
            </div>
          ) : null}
          <Ready view={view} act={act} label="aku paham" />
        </>
      )}
    </section>
  );
}

// ── Satu bab ────────────────────────────────────────────────────────────────

type Tab = 'aksi' | 'berkas' | 'papan' | 'dunia' | 'kabar';

function Bab({ view, act, code, busy }: { view: View; act: Act; code: string; busy: boolean }) {
  const aksi = view.phase === 'aksi';
  const [tab, setTab] = useState<Tab>(aksi ? 'aksi' : 'kabar');
  useEffect(() => setTab(aksi ? 'aksi' : 'kabar'), [view.phase, view.bab]);
  const me = view.mine!;
  const fresh = view.notes.filter((n) => n.bab === view.bab && n.to !== '*').length;
  const tabs: [Tab, string, string][] = [
    ...(aksi ? ([['aksi', 'aksi', 'stempel']] as [Tab, string, string][]) : []),
    ['kabar', `kabar${!aksi && fresh ? ` (${fresh})` : ''}`, 'bendera'],
    ['berkas', `berkasku (${me.copies.length})`, 'amplop'],
    ['papan', `papan (${view.board.length})`, 'pin-papan'],
    ['dunia', 'mesin dunia', 'kompas'],
  ];
  return (
    <section className="sg-bab">
      <div className="sd-tabs sg-tabs" role="tablist">
        {tabs.map(([t, l, d]) => (
          <button key={t} role="tab" aria-selected={tab === t} className={tab === t ? 'on' : ''} onClick={() => setTab(t)} data-testid={`sg-tab-${t}`}>
            <Doodle id={d} size={16} color="currentColor" /> {l}
          </button>
        ))}
      </div>
      <Pemain view={view} act={act} />
      {tab === 'aksi' && aksi ? (
        me.main ? (
          <div className="sg-locked">
            <span className="sg-wax small">✓</span>
            <p className="small">
              Terkunci: <b>{mainText(view, me.main)}</b>. Arsip menyelesaikan semua aksi bersamaan saat semua siap atau waktu habis.
            </p>
            <button className="btn soft sm" onClick={() => act({ t: 'batal' })}>
              ubah aksi
            </button>
          </div>
        ) : (
          <>
            <p className="sg-hint">
              {view.bab === 1 ? 'Bab 1: kabar pertama. Baca berkasmu dulu, lalu pilih satu aksi.' : view.bab === 4 ? 'Bab 4: aksi terakhir sebelum arsip disegel.' : `Bab ${view.bab}: berkas baru sudah diumumkan di indeks, isinya dibagikan sesudah aksi.`}
            </p>
            <Composer v={view} onLock={(m) => act({ t: 'aksi', main: m })} busy={busy} />
          </>
        )
      ) : null}
      {tab === 'kabar' ? (
        <>
          {view.phase === 'runding' ? <Ready view={view} act={act} label="cukup berunding" /> : null}
          <Kabar v={view} />
        </>
      ) : null}
      {tab === 'berkas' ? (
        <>
          <div className="sg-berkas-list">
            {[...me.copies].reverse().map((c) => (
              <Berkas key={c.cid} v={view} c={c} />
            ))}
          </div>
          <Indeks v={view} />
          {view.coop ? <CoopShare view={view} act={act} /> : null}
        </>
      ) : null}
      {tab === 'papan' ? <Papan view={view} /> : null}
      {tab === 'dunia' ? <MesinDunia v={view} code={code} /> : null}
      {view.phase === 'runding' && tab !== 'kabar' ? <Ready view={view} act={act} label="cukup berunding" /> : null}
    </section>
  );
}

/** Mode kooperatif: terbit & kirim gratis kapan saja selama bab. */
function CoopShare({ view, act }: { view: View; act: Act }) {
  const me = view.mine!;
  const unpub = me.copies.filter((c) => !view.board.some((b) => b.c.rid === c.rid && JSON.stringify(b.c.f) === JSON.stringify(c.f) && b.c.stamp === c.stamp));
  if (!unpub.length) return null;
  return (
    <button className="btn soft mt" onClick={() => unpub.forEach((c) => act({ t: 'terbit', cid: c.cid }))} data-testid="sg-terbit-semua">
      <Doodle id="pin-papan" size={16} color="currentColor" /> terbitkan semua salinanku ({unpub.length}) · gratis
    </button>
  );
}

/** Baris pemain: siapa sudah mengunci; ketuk untuk memberi Lensa. */
function Pemain({ view, act }: { view: View; act: Act }) {
  const [give, setGive] = useState<string | null>(null);
  const me = view.mine!;
  const p = view.players.find((x) => x.id === give);
  return (
    <>
      <div className="sg-players">
        {view.players.map((x) => (
          <button key={x.id} className={`sg-player ${x.done ? 'done' : ''} ${x.kubu === 'revisi' && x.id !== view.me ? 'mate' : ''}`} onClick={() => x.id !== view.me && setGive(x.id)}>
            <PlayerFace avatar={x.avatar} size={30} />
            <span className="tiny">{x.name}</span>
            <span className="sg-lensa">{'●'.repeat(x.lensa)}</span>
          </button>
        ))}
      </div>
      <Sheet open={!!give} onClose={() => setGive(null)} title={p ? p.name : ''}>
        {p ? (
          <div className="col" style={{ gap: 10 }}>
            <p className="small">
              {p.name} memegang {p.lensa} Lensa. Kamu memegang {me.lensa}. Memberi Lensa gratis dan tidak memakai aksi.
            </p>
            <button className="btn" disabled={me.lensa < 1 || p.lensa >= view.lensaCap} onClick={() => (act({ t: 'lensa', to: p.id }), setGive(null))}>
              beri 1 Lensa
            </button>
          </div>
        ) : null}
      </Sheet>
    </>
  );
}

function Papan({ view }: { view: View }) {
  const tm = temaOfView(view);
  const theories = Object.entries(view.theories).filter(([, t]) => Object.keys(t).length > 1 || !view.mine || !t[view.me!]);
  return (
    <div className="sg-papan">
      {view.certs.length ? (
        <div className="sg-certs">
          {view.certs.map((c) => (
            <span key={c.id} className="sg-cert">
              <span className="sg-wax small">F</span>
              <span>
                <b>
                  {segel.ANCHOR_NAME[c.a]} = {anchorLabel(tm, c.a, c.v)}
                </b>
                <span className="tiny" style={{ display: 'block' }}>
                  fakta terbukti · rantai {c.cite.join(', ')} · {nameIn(view, c.by)}
                </span>
              </span>
            </span>
          ))}
        </div>
      ) : null}
      <span className="sd-label">dunia menurut papan (dibaca apa adanya)</span>
      <Jangkar v={view} ws={segel.worlds(dimOfView(view), view.board.filter((b) => !b.umpan && !b.bantah).map((b) => ({ f: b.c.f, blur: b.c.blur }))).filter((w) => view.certs.every((c) => !c.ok || w[c.a] === c.v))} />
      <div className="sg-berkas-list">
        {[...view.board].reverse().map((b) => (
          <Berkas key={b.id} v={view} c={b.c} pub={b} />
        ))}
        {!view.board.length ? <p className="tiny soft center">Papan masih kosong. Terbitkan berkas supaya semua bisa membacanya.</p> : null}
      </div>
      {theories.length ? (
        <>
          <span className="sd-label">teori yang sudah disegel</span>
          {theories.map(([b, t]) => (
            <div key={b} className="sg-teori-bab">
              <span className="tiny">bab {b}</span>
              {Object.entries(t).map(([pid, x]) => (
                <span key={pid} className="sg-teori">
                  <PlayerFace avatar={view.players.find((p) => p.id === pid)?.avatar ?? 'tunas'} size={18} />
                  <b>{nameIn(view, pid)}</b> {anchorLabel(tm, 'p', x.p)} · {anchorLabel(tm, 'r', x.r)} · {anchorLabel(tm, 't', x.t)}
                </span>
              ))}
            </div>
          ))}
        </>
      ) : null}
    </div>
  );
}

// ── Segel teori, cadangan, putusan, tebak ───────────────────────────────────

function SegelTeori({ view, act, busy }: { view: View; act: Act; busy: boolean }) {
  const me = view.mine!;
  const [t, setT] = useState<Partial<segel.Theory>>(me.theory ?? {});
  const final = view.bab === 4;
  const [att, setAtt] = useState<Set<string>>(() => new Set(me.attach ?? me.copies.filter((c) => c.f.k !== 'rumor').map((c) => c.cid)));
  const done = !!me.theory;
  return (
    <section className="sg-segel">
      <p className="sd-big-line">{final ? 'Segel akhir' : `Segel teori bab ${view.bab}`}</p>
      <p className="sd-whisper">{final ? 'Teorimu dibuka serentak sebelum putusan. Lampiran masuk ke papan sebagai bagian arsip.' : 'Teori tidak menentukan kemenangan. Ia menjaga suara orang yang pendiam.'}</p>
      <AnchorPick v={view} value={t} onChange={setT} />
      {final ? (
        <>
          <span className="sd-label">lampirkan ke arsip final ({att.size})</span>
          <div className="sg-opt-list">
            {me.copies.map((c) => {
              const on = att.has(c.cid);
              return (
                <button key={c.cid} className={`sg-opt ${on ? 'on' : ''}`} onClick={() => setAtt((s) => (s.has(c.cid) ? new Set([...s].filter((x) => x !== c.cid)) : new Set([...s, c.cid])))}>
                  <Berkas v={view} c={c} compact />
                </button>
              );
            })}
          </div>
        </>
      ) : null}
      <HoldButton
        label={done ? 'teori tersegel' : 'tahan untuk menyegel'}
        done={done}
        disabled={busy || t.p === undefined || t.r === undefined || t.t === undefined}
        onDone={() => {
          if (final) act({ t: 'lampir', cids: [...att] });
          act({ t: 'teori', v: t as segel.Theory });
        }}
      />
    </section>
  );
}

function Pulih({ view, act, busy }: { view: View; act: Act; busy: boolean }) {
  const me = view.mine!;
  const [pick, setPick] = useState<string[]>(me.pull ?? []);
  const [extra, setExtra] = useState<string | null>(null);
  const saksi = me.prof === 'saksi_terakhir' && !me.used;
  return (
    <section className="sg-pulih">
      <p className="sd-big-line">Tarik cadangan</p>
      <p className="sd-whisper">Pilih sampai dua laporan. Dua terbanyak ditarik dari arsip pusat dan terbit bercap ASAL TERBUKTI. Berkas yang disembunyikan pemegangnya pun bisa ditarik.</p>
      <Indeks v={view} onPick={(rid) => setPick((p) => (p.includes(rid) ? p.filter((x) => x !== rid) : [...p, rid].slice(-2)))} />
      <div className="sg-chips mt">
        {pick.map((r) => (
          <span key={r} className="pill active">
            {r}
          </span>
        ))}
      </div>
      {saksi ? (
        <>
          <span className="sd-label">Saksi Terakhir: satu tambahan pilihanmu</span>
          <div className="sg-chips">
            {view.index.map((i) => (
              <button key={i.id} className={`pill sm ${extra === i.id ? 'active' : ''}`} onClick={() => setExtra(i.id)}>
                {i.id}
              </button>
            ))}
          </div>
        </>
      ) : null}
      <button className="btn sd-cta mt" disabled={busy || !!me.pull} onClick={() => act({ t: 'tarik', rids: pick, ...(extra ? { extra } : {}) })} data-testid="sg-tarik">
        {me.pull ? 'pilihan terkunci' : pick.length ? `tarik ${pick.join(' & ')}` : 'tidak menarik apa pun'}
      </button>
    </section>
  );
}

function Vonis({ view, act, busy, code }: { view: View; act: Act; busy: boolean; code: string }) {
  const me = view.mine!;
  const tm = temaOfView(view);
  const [t, setT] = useState<Partial<segel.Theory>>({});
  const [peek, setPeek] = useState(false);
  const open = view.vonis.open;
  const prev = view.vonis.tally[view.vonis.tally.length - 1];
  const ok = open.every((a) => t[a] !== undefined);
  return (
    <section className="sg-vonis">
      <p className="sd-big-line">{view.vonis.round > 1 ? `Putaran ${view.vonis.round}` : 'Putusan arsip'}</p>
      <p className="sd-whisper">Butuh {Math.floor(view.players.length / 2) + 1} dari {view.players.length} suara per jangkar.</p>
      {segel.ANCHORS.filter((a) => !open.includes(a) && view.vonis.anchors[a] !== null).map((a) => (
        <span key={a} className="sg-decided">
          <span className="sg-wax small">✓</span> {segel.ANCHOR_NAME[a]}: <b>{anchorLabel(tm, a, view.vonis.anchors[a])}</b>
        </span>
      ))}
      {prev && view.vonis.round > 1 ? (
        <div className="sg-tally">
          {Object.entries(prev).map(([a, c]) => (
            <span key={a} className="tiny">
              {segel.ANCHOR_NAME[a as segel.Anchor]}: {Object.entries(c).map(([v, k]) => `${anchorLabel(tm, a as segel.Anchor, Number(v))} ${k}`).join(' · ')}
            </span>
          ))}
        </div>
      ) : null}
      <AnchorPick v={view} value={t} onChange={setT} open={open} />
      <HoldButton label={me.vote ? 'suaramu tersegel' : 'tahan untuk memutus'} done={!!me.vote} disabled={busy || !ok} onDone={() => act({ t: 'vonis', v: t })} />
      <button className="btn ghost sm mt" onClick={() => setPeek(true)}>
        <Doodle id="kompas" size={16} color="currentColor" /> buka mesin dunia
      </button>
      <Sheet open={peek} onClose={() => setPeek(false)} title="mesin dunia">
        <MesinDunia v={view} code={code} />
      </Sheet>
    </section>
  );
}

function Tebak({ view, act }: { view: View; act: Act }) {
  const me = view.mine!;
  return (
    <section className="sg-tebak">
      <p className="sd-big-line">Siapa Revisi?</p>
      <p className="sd-whisper">Tidak mengubah putusan. Tapi kalau Restorasi menang dan semua Revisi tertunjuk, arsip disegel sempurna. Kalau Revisi menang tanpa tertunjuk, merekalah yang sempurna.</p>
      <div className="sg-pick-row">
        {view.players
          .filter((p) => p.id !== view.me)
          .map((p) => (
            <button key={p.id} className={`sg-sus ${me.guess === p.id ? 'on' : ''}`} onClick={() => act({ t: 'tebak', pid: p.id })}>
              <PlayerFace avatar={p.avatar} size={40} />
              <b>{p.name}</b>
            </button>
          ))}
        <button className={`sg-sus ${me.guess === '' ? 'on' : ''}`} onClick={() => act({ t: 'tebak', pid: '' })}>
          <Doodle id="tanda-tanya" size={34} color="currentColor" />
          <b>tidak tahu</b>
        </button>
      </div>
    </section>
  );
}

// ── Akhir ───────────────────────────────────────────────────────────────────

function Akhir({ view }: { view: View }) {
  const r = view.result!;
  const tm = temaOfView(view);
  const rv = view.reveal!;
  const mine = won(view);
  const [tab, setTab] = useState<'pemain' | 'rekon' | 'papan'>('pemain');
  return (
    <section className="sd-result sg-akhir">
      <div className={`sg-verdict ${r.winner}`}>
        <span className="sg-wax big">{r.winner === 'restorasi' ? '✓' : '✎'}</span>
        <b className="sd-result-big">{r.winner === 'restorasi' ? (r.sempurna ? 'disegel sempurna' : 'arsip disegel') : r.sempurna ? 'revisi sempurna' : 'arsip tercemar'}</b>
        <span className="small">{mine ? 'Kubumu menang.' : 'Kubumu kalah kali ini.'}</span>
      </div>
      <article className="sd-file">
        <span className="sd-file-tab">yang sebenarnya terjadi</span>
        <Doodle id={faceOf(tm.tokoh[rv.w.p]!.name)} size={56} draw />
        <h2 className="sd-file-title">{segel.worldText(tm, rv.w)}.</h2>
        <p className="sd-file-text">
          {tm.tokoh[rv.w.p]!.name} melakukannya karena {tm.tokoh[rv.w.p]!.motif}. {endLine(view)}
        </p>
        <div className="sg-chain">
          {segel.ANCHORS.map((a) => (
            <span key={a} className={`sg-chain-row ${r.anchors[a] === rv.w[a] && r.chain[a] ? 'ok' : 'no'}`}>
              <b>{segel.ANCHOR_NAME[a]}</b> putusan: {anchorLabel(tm, a, r.anchors[a])} · {r.anchors[a] === rv.w[a] ? 'benar' : 'keliru'} · rantai {r.chain[a] ? 'cukup' : 'kurang'}
            </span>
          ))}
        </div>
      </article>
      <div className="sd-tabs sg-tabs">
        {(['pemain', 'rekon', 'papan'] as const).map((t) => (
          <button key={t} className={tab === t ? 'on' : ''} onClick={() => setTab(t)}>
            {t === 'pemain' ? 'profesi & kubu' : t === 'rekon' ? 'rekonstruksi' : 'papan akhir'}
          </button>
        ))}
      </div>
      {tab === 'pemain' ? (
        <div className="sg-reveal">
          {view.players.map((p) => (
            <span key={p.id} className={`sg-reveal-one ${p.kubu} ${r.caught.includes(p.id) ? 'caught' : ''}`}>
              <PlayerFace avatar={p.avatar} size={40} />
              <b>{p.name}</b>
              {p.prof ? (
                <span className="tiny sd-ico">
                  <Doodle id={segel.PROFS[p.prof].doodle} size={14} color="currentColor" /> {segel.PROFS[p.prof].nama}
                </span>
              ) : null}
              <span className={`sg-mini-cap ${p.kubu === 'revisi' ? 'merah' : ''}`}>{p.kubu}</span>
              {r.caught.includes(p.id) ? <span className="tiny">tertunjuk</span> : null}
            </span>
          ))}
        </div>
      ) : null}
      {tab === 'rekon' ? <Rekonstruksi v={view} /> : null}
      {tab === 'papan' ? <Papan view={view} /> : null}
      <div className="col mt" style={{ gap: 8 }}>
        <button className="btn sd-cta" onClick={() => navigate('/segel')}>
          buka meja baru
        </button>
      </div>
    </section>
  );
}

