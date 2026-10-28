/**
 * Meja SEUMUR. Satu layar yang mengikuti fase: lobi → pembuka → (fokus →
 * main) → jeda renung → … → akhir. Langit berubah sesuai bab; HP tuan rumah
 * membacakan pembuka bab; setiap kartu yang diletakkan berbunyi satu nada.
 */
import { seumur } from '@sehari/core';
import { useEffect, useRef, useState } from 'react';
import { navigate, useParams } from '@/lib/router';
import { almanak, bunyi, bunyiPadam, joinMeja, laguKehidupan, leaveMeja, nadaUsia, rekor, sendSeumur, useMeja, type View } from '@/lib/seumur';
import { useSession } from '@/lib/session';
import { hush, profile, speak, useWakeLock, vibrate } from '@/lib/sidik';
import { QR } from '@/ui/art';
import { Doodle, Growing, Header, Toggle, useToast } from '@/ui/kit';
import { PlayerFace } from '../sidik/parts';
import { faceIn, GarisHidup, Kartu, KartuTangan, Lilin, Meja as MejaOrang, Napas, nameIn } from './parts';

type Act = (a: seumur.Action) => void;
const AVATARS = ['tunas', 'kucing', 'burung', 'ikan', 'kelinci', 'landak', 'bebek', 'katak', 'kupu-kupu', 'lebah', 'siput', 'kepik'];

export default function SeumurMeja() {
  const { code = '' } = useParams<{ code: string }>();
  const C = code.toUpperCase();
  const { view, err, apply, serverNow } = useMeja(C);
  const toast = useToast();
  const session = useSession();
  const [busy, setBusy] = useState(false);
  useWakeLock(!!view?.mine && view.phase !== 'akhir');

  const act: Act = async (a) => {
    setBusy(true);
    try {
      apply(await sendSeumur(C, a));
    } catch (e) {
      toast((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  // Bunyi & narasi mengikuti kejadian.
  const lastN = useRef(0);
  useEffect(() => {
    const k = view?.kejadian;
    if (!view || !k || k.n === lastN.current) return;
    const first = lastN.current === 0;
    lastN.current = k.n;
    if (first) return;
    const suara = view.opts.suara;
    if (k.jenis === 'letak' && k.kartu && suara) bunyi(nadaUsia(seumur.momenOf(k.kartu)!.usia));
    if (k.jenis === 'padam') {
      vibrate([80, 60, 160]);
      if (suara) bunyiPadam();
    }
    if (k.jenis === 'napas' && suara) [0, 1, 2].forEach((i) => setTimeout(() => bunyi(nadaUsia(30 + i * 20) * 2, { dur: 3, vol: 0.08 }), i * 180));
  }, [view?.kejadian?.n]);

  const lastPh = useRef('');
  useEffect(() => {
    if (!view?.mine) return;
    const key = `${view.phase}:${view.bab}:${view.kehidupan}`;
    if (lastPh.current === key) return;
    const first = lastPh.current === '';
    lastPh.current = key;
    if (first) return;
    const narr = view.opts.narasi && view.me === view.host;
    if (view.phase === 'mulai') speak('Satu kehidupan, disusun bersama, tanpa kata. Tarik napas. Kita mulai dari pagi.', narr);
    if (view.phase === 'fokus' && view.ronde === 0) speak(`${view.babInfo.nama}. ${view.babInfo.pembuka}`, narr);
    if (view.phase === 'jeda') speak('Berhenti sejenak. Lihat kembali bab yang baru saja kalian lalui.', narr);
    if (view.phase === 'akhir') speak(view.selesai === 'utuh' ? 'Satu kehidupan utuh. Terima kasih sudah menjalaninya bersama.' : `Kehidupan ini berhenti di usia ${view.berhentiUsia}. Tetap sebuah kehidupan.`, narr);
  }, [view?.phase, view?.bab, view?.kehidupan]);
  useEffect(() => () => hush(), []);

  // Simpan ke almanak & rekor.
  useEffect(() => {
    if (!view) return;
    almanak.add(view.garis.map((g) => g.id));
    if (view.phase === 'akhir' && view.mine) {
      const tag = `${view.code}:${view.kehidupan}`;
      if (localStorage.getItem('sehari.seumurLast') !== tag) {
        localStorage.setItem('sehari.seumurLast', tag);
        rekor.add(view.selesai === 'utuh', view.berhentiUsia ?? 0);
      }
    }
  }, [view?.garis.length, view?.phase]);

  if (err && !view)
    return (
      <main className="screen sm-screen">
        <Header title="Seumur" backTo="/seumur" />
        <div className="sd-empty">
          <Doodle id="awan" size={64} />
          <p>{err}</p>
        </div>
      </main>
    );
  if (!view) return <Growing label="menyalakan lilin…" />;
  if (!view.mine) return <Masuk view={view} defaultName={profile.get()?.name ?? session.me?.user.penName ?? ''} onJoin={async (p) => { profile.set(p); try { apply(await joinMeja(C, p)); } catch (e) { toast((e as Error).message); } }} />;

  const langit = view.phase === 'lobby' || view.phase === 'mulai' ? 'subuh' : view.babInfo.id;
  return (
    <main className={`screen sm-screen ph-${view.phase}`} data-langit={langit}>
      <div className="sm-langit" aria-hidden>
        <span className="sm-bintang" />
      </div>
      <Atas view={view} onLeave={async () => { if (view.phase === 'lobby') await leaveMeja(C).catch(() => {}); navigate('/seumur'); }} />
      {view.phase === 'lobby' ? <Lobi view={view} act={act} busy={busy} /> : null}
      {view.phase === 'mulai' ? <Pembuka view={view} act={act} /> : null}
      {view.phase === 'fokus' ? <Fokus view={view} act={act} serverNow={serverNow} /> : null}
      {view.phase === 'main' ? <Main view={view} act={act} serverNow={serverNow} busy={busy} /> : null}
      {view.phase === 'jeda' ? <Jeda view={view} act={act} /> : null}
      {view.phase === 'akhir' ? <Akhir view={view} act={act} /> : null}
    </main>
  );
}

function Atas({ view, onLeave }: { view: View; onLeave: () => void }) {
  const inGame = !['lobby', 'mulai'].includes(view.phase);
  return (
    <header className="sm-atas">
      <button className="hdr-back" aria-label="keluar" onClick={onLeave}>
        <Doodle id="ui-kembali" size={20} />
      </button>
      <div className="sm-atas-mid">
        <b>{inGame ? view.babInfo.nama : 'seumur'}</b>
        <span>{inGame ? (view.phase === 'jeda' ? 'jeda renung' : view.phase === 'akhir' ? 'gulungan' : `ronde ${view.ronde + 1} dari ${view.rondeTotal}`) : `meja ${view.code}`}</span>
      </div>
      {inGame && view.phase !== 'akhir' ? <Lilin n={view.lilin} max={view.lilinMax} /> : <span />}
    </header>
  );
}

// ── Masuk & lobi ────────────────────────────────────────────────────────────

function Masuk({ view, defaultName, onJoin }: { view: View; defaultName: string; onJoin: (p: { name: string; avatar: string }) => void }) {
  const [name, setName] = useState(defaultName);
  const [avatar, setAvatar] = useState(profile.get()?.avatar ?? AVATARS[Math.floor(Math.random() * AVATARS.length)]!);
  return (
    <main className="screen sm-screen" data-langit="subuh">
      <div className="sm-langit" aria-hidden />
      <Header title="duduk di meja" sub={`meja ${view.code}`} backTo="/seumur" />
      <section className="sd-join">
        <Doodle id="lilin" size={80} draw />
        <p className="sd-join-title">{view.phase === 'lobby' ? 'Kamu diundang menyusun satu kehidupan.' : 'Kehidupan di meja ini sudah dimulai.'}</p>
        <div className="sd-avatars">
          {AVATARS.map((a) => (
            <button key={a} className={avatar === a ? 'on' : ''} onClick={() => setAvatar(a)}>
              <Doodle id={a} size={26} color="currentColor" />
            </button>
          ))}
        </div>
        <input className="field sd-name" maxLength={24} value={name} placeholder="nama panggilanmu" onChange={(e) => setName(e.target.value)} autoFocus />
        <button className="btn sd-cta" disabled={!name.trim() || view.phase !== 'lobby'} onClick={() => onJoin({ name: name.trim(), avatar })} data-testid="sm-join">
          duduk
        </button>
      </section>
    </main>
  );
}

function Lobi({ view, act, busy }: { view: View; act: Act; busy: boolean }) {
  const host = view.me === view.host;
  const link = `${location.origin}/seumur/${view.code}`;
  const n = view.players.length;
  return (
    <section className="sd-lobby sm-lobi">
      <div className="sd-code-card">
        <span className="tiny">kode meja</span>
        <b className="sd-code">{view.code}</b>
        <div className="sd-qr">
          <QR value={link} size={150} />
        </div>
        <div className="row" style={{ gap: 8 }}>
          <a className="btn sm soft grow wa" href={`https://wa.me/?text=${encodeURIComponent(`Ayo menyusun satu kehidupan bersama di Seumur. Kode ${view.code}: ${link}`)}`} target="_blank" rel="noreferrer">
            undang lewat WA
          </a>
          <a className="btn sm soft grow" href={`/seumur/${view.code}/tv`} target="_blank" rel="noreferrer">
            <Doodle id="laptop" size={16} color="currentColor" /> mode TV
          </a>
        </div>
      </div>
      <span className="sd-label">di meja · {n}/10</span>
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
      <p className="small soft center">
        {n >= 2 ? `${seumur.lilinFor(n)} lilin · ${seumur.rondeFor(n).length} ronde tiap bab · ${seumur.rondeFor(n).reduce((a, b) => a + b, 0) * 4} momen per orang` : 'Butuh minimal dua orang.'}
      </p>
      {host ? (
        <div className="sd-settings">
          <Toggle label="narator" hint="pembuka bab dibacakan dari HP ini" value={view.opts.narasi} onChange={(x) => act({ t: 'opts', narasi: x })} />
          <Toggle label="suara" hint="setiap momen berbunyi satu nada" value={view.opts.suara} onChange={(x) => act({ t: 'opts', suara: x })} />
          <button className="btn sd-cta mt" disabled={n < 2 || busy} onClick={() => act({ t: 'start' })} data-testid="sm-start">
            mulai satu kehidupan
          </button>
        </div>
      ) : (
        <p className="sd-wait">Menunggu tuan rumah…</p>
      )}
    </section>
  );
}

function Ready({ view, act, label }: { view: View; act: Act; label: string }) {
  const me = view.players.find((p) => p.id === view.me);
  return (
    <button className="btn sd-cta sm-lanjut" disabled={me?.ready} onClick={() => act({ t: 'ready' })} data-testid="sm-ready">
      {me?.ready ? `menunggu yang lain (${view.players.filter((p) => p.ready).length}/${view.players.length})` : label}
    </button>
  );
}

function Pembuka({ view, act }: { view: View; act: Act }) {
  return (
    <section className="sm-pembuka">
      <p className="sm-puisi">Satu kehidupan,
        <br />
        disusun bersama,
        <br />
        tanpa kata.</p>
      <ol className="sm-aturan">
        <li>
          <Doodle id="kartu" size={26} color="currentColor" />
            <span>Setiap orang memegang <b>momen hidup</b>. Usianya tersembunyi, bahkan darimu.</span>
        </li>
        <li>
          <Doodle id="ui-hening" size={26} color="currentColor" />
            <span><b>Jangan bicara.</b> Jangan sebut usia, isi kartu, atau beri kode.</span>
        </li>
        <li>
          <Doodle id="jam-pasir" size={26} color="currentColor" />
            <span>Saat kamu merasa waktunya tiba, <b>tahan kartumu</b> untuk meletakkannya di garis hidup.</span>
        </li>
        <li>
          <Doodle id="lilin" size={26} color="currentColor" />
            <span>Kalau masih ada momen yang lebih muda tertahan di tangan seseorang, <b>satu lilin padam</b>.</span>
        </li>
        <li>
          <Doodle id="awan" size={26} color="currentColor" />
            <span><b>Napas Dalam:</b> bila semua menahannya bersama, momen termuda di tiap tangan terbuka.</span>
        </li>
      </ol>
      <p className="tiny soft center">Empat bab: Pagi, Siang, Sore, Malam. Selesaikan keempatnya untuk satu kehidupan utuh.</p>
      <Ready view={view} act={act} label="aku siap" />
    </section>
  );
}

// ── Fokus & main ────────────────────────────────────────────────────────────

function Fokus({ view, act, serverNow }: { view: View; act: Act; serverNow: () => number }) {
  const me = view.mine!;
  const holding = view.players.filter((p) => p.fokus).length;
  const press = (tahan: boolean) => {
    if (tahan !== me.fokus) act({ t: 'fokus', tahan });
  };
  return (
    <section className="sm-fokus">
      {view.ronde === 0 ? (
        <div className="sm-bab-judul rise">
          <Doodle id={view.babInfo.doodle} size={42} draw />
          <h2>{view.babInfo.nama}</h2>
          <p>{view.babInfo.pembuka}</p>
        </div>
      ) : (
        <p className="sm-bisik">Ronde {view.ronde + 1}. Setiap orang akan memegang {seumur.rondeFor(view.players.length)[view.ronde]} momen.</p>
      )}
      <div
        className={`sm-fokus-tombol ${me.fokus ? 'on' : ''}`}
        onPointerDown={() => press(true)}
        onPointerUp={() => press(false)}
        onPointerLeave={() => me.fokus && press(false)}
        onPointerCancel={() => press(false)}
        onContextMenu={(e) => e.preventDefault()}
        data-testid="sm-fokus"
      >
        <Napas serverNow={serverNow} size={230} getar aktif={me.fokus}>
          <span className="sm-fokus-teks">{me.fokus ? (holding === view.players.length ? 'mulai…' : 'tetap tahan') : 'tahan jempolmu di sini'}</span>
        </Napas>
      </div>
      <p className="sm-bisik">Tiga napas bersama. Kartu dibagikan saat semua jempol menahan lingkaran.</p>
      <MejaOrang v={view} mode="fokus" />
    </section>
  );
}

function Main({ view, act, serverNow, busy }: { view: View; act: Act; serverNow: () => number; busy: boolean }) {
  const me = view.mine!;
  const k = view.kejadian;
  const [overlay, setOverlay] = useState<null | { jenis: 'padam' | 'napas'; kartu?: string[] }>(null);
  const lastK = useRef(k?.n ?? 0);
  useEffect(() => {
    if (!k || k.n === lastK.current) return;
    lastK.current = k.n;
    if (k.jenis === 'padam') {
      setOverlay({ jenis: 'padam', kartu: k.terlambat });
      const t = setTimeout(() => setOverlay(null), 3600);
      return () => clearTimeout(t);
    }
    if (k.jenis === 'napas') {
      setOverlay({ jenis: 'napas' });
      const t = setTimeout(() => setOverlay(null), 2400);
      return () => clearTimeout(t);
    }
  }, [k?.n]);
  const holdingNapas = view.players.filter((p) => p.napas).length;
  return (
    <section className="sm-main">
      <GarisHidup v={view} />
      <div className="sm-tengah">
        <Napas serverNow={serverNow} size={92} teks={false} />
        {view.terbuka.length ? (
          <div className="sm-terbuka">
            <span className="sd-label">dibuka oleh napas dalam</span>
            {view.terbuka.map((t) => (
              <span key={t.id} className="sm-terbuka-satu">
                <PlayerFace avatar={faceIn(view, t.by)} size={18} /> {t.teks}
              </span>
            ))}
          </div>
        ) : null}
      </div>
      <MejaOrang v={view} mode="napas" />
      <div className="sm-tangan-baris">
        {me.tangan.map((c) => (
          <KartuTangan key={c.id} k={c} onLetak={() => act({ t: 'letak', kartu: c.id })} disabled={busy} />
        ))}
        {!me.tangan.length ? <p className="sm-bisik">Tanganmu kosong. Temani yang lain dalam hening.</p> : null}
      </div>
      {view.napas > 0 && me.tangan.length ? (
        <button
          className={`sm-napas-dalam ${me.napas ? 'on' : ''}`}
          onPointerDown={() => !me.napas && act({ t: 'napas', tahan: true })}
          onPointerUp={() => me.napas && act({ t: 'napas', tahan: false })}
          onPointerLeave={() => me.napas && act({ t: 'napas', tahan: false })}
          onContextMenu={(e) => e.preventDefault()}
        >
          <Doodle id="awan" size={18} color="currentColor" /> napas dalam ×{view.napas}
          {holdingNapas ? <span className="tiny"> · {holdingNapas}/{view.players.filter((p) => p.kartu).length} menahan</span> : null}
        </button>
      ) : null}
      {overlay ? (
        <div className={`sm-overlay ${overlay.jenis}`} role="status">
          {overlay.jenis === 'padam' ? (
            <>
              <span className="sm-overlay-lilin">
                <Lilin n={0} max={1} />
              </span>
              <b>Satu lilin padam.</b>
              {overlay.kartu?.length ? (
                <span className="small">
                  Datang terlambat:{' '}
                  {overlay.kartu
                    .map((id) => seumur.momenOf(id)!)
                    .map((m) => `${m.teks} (${m.usia})`)
                    .join('; ')}
                </span>
              ) : null}
            </>
          ) : (
            <>
              <Doodle id="awan" size={44} draw />
              <b>Napas dalam.</b>
              <span className="small">Momen termuda di setiap tangan kini terlihat semua.</span>
            </>
          )}
        </div>
      ) : null}
    </section>
  );
}

// ── Jeda renung ─────────────────────────────────────────────────────────────

function Jeda({ view, act }: { view: View; act: Act }) {
  const me = view.mine!;
  const s = view.sorotan;
  const babIni = view.garis.filter((g) => g.bab === view.bab);
  const next = seumur.BAB[view.bab + 1];
  return (
    <section className="sm-jeda">
      <p className="sm-bisik">Bab {view.babInfo.nama} selesai. {babIni.length} momen tersusun.</p>
      {s ? (
        <div className="sm-sorot rise">
          <Kartu k={s} usia={s.usia} by={s.by} v={view} menyala />
          <p className="sm-tanya">Sudah pernah mengalaminya?</p>
          <div className="seg">
            {(
              [
                ['sudah', 'sudah'],
                ['belum', 'belum'],
                ['tidak', 'mungkin tidak akan'],
              ] as const
            ).map(([j, l]) => (
              <button key={j} className={me.renung === j ? 'on' : ''} onClick={() => act({ t: 'renung', jawab: j })} data-testid={`sm-renung-${j}`}>
                {l}
              </button>
            ))}
          </div>
          {s.hitung ? (
            <p className="sm-hitung">
              <b>{s.hitung.sudah}</b> dari {view.players.length} di meja ini sudah mengalaminya{s.hitung.tidak ? ` · ${s.hitung.tidak} merasa mungkin tidak akan` : ''}.
              {s.by ? (
                <>
                  <br />
                  <i>{nameIn(view, s.by)} boleh bercerita satu kalimat, atau tidak sama sekali.</i>
                </>
              ) : null}
            </p>
          ) : (
            <p className="tiny soft center">Jawaban dibuka setelah semua menjawab.</p>
          )}
        </div>
      ) : null}
      <Ready view={view} act={act} label={next ? `lanjut ke ${next.nama}` : 'tutup kehidupan ini'} />
    </section>
  );
}

// ── Akhir ───────────────────────────────────────────────────────────────────

function Akhir({ view, act }: { view: View; act: Act }) {
  const [main, setMain] = useState(-1);
  const stop = useRef<() => void>(() => {});
  useEffect(() => () => stop.current(), []);
  const putar = () => {
    stop.current();
    stop.current = laguKehidupan(
      view.garis.map((g) => g.usia),
      (i) => {
        setMain(i);
        document.querySelector(`.sm-gulungan [data-i="${i}"]`)?.scrollIntoView({ block: 'center', behavior: 'smooth' });
      },
    );
  };
  const tepat = view.garis.filter((g) => !g.terlambat).length;
  const host = view.me === view.host;
  return (
    <section className="sm-akhir">
      <div className="sm-akhir-judul rise">
        <Doodle id={view.selesai === 'utuh' ? 'bintang' : 'lilin'} size={56} draw />
        <h2>{view.selesai === 'utuh' ? 'Satu kehidupan utuh.' : `Kehidupan ini berhenti di usia ${view.berhentiUsia}.`}</h2>
        <p>
          {view.garis.length} momen · {tepat} tepat waktu · {view.garis.length - tepat} datang terlambat
        </p>
      </div>
      <button className="btn soft sm-putar" onClick={putar} data-testid="sm-lagu">
        <Doodle id="not-balok" size={18} color="currentColor" /> putar lagu kehidupan ini
      </button>
      <div className="sm-gulungan">
        <span className="sm-gulungan-ujung">lahir</span>
        {view.garis.map((g, i) => (
          <div key={g.id} data-i={i} className={`sm-gulungan-baris ${main === i ? 'main' : ''} ${g.terlambat ? 'telat' : ''}`}>
            <b className="sm-gulungan-usia">{g.usia}</b>
            <Doodle id={g.doodle} size={22} color="currentColor" />
            <span className="grow">{g.teks}</span>
            <PlayerFace avatar={faceIn(view, g.by)} size={18} />
          </div>
        ))}
        <span className="sm-gulungan-ujung">{view.selesai === 'utuh' ? 'malam yang tenang' : '…'}</span>
      </div>
      <div className="col" style={{ gap: 8 }}>
        {host ? (
          <button className="btn sd-cta" onClick={() => act({ t: 'ulang' })} data-testid="sm-ulang">
            mulai kehidupan baru
          </button>
        ) : (
          <p className="sd-wait">Tuan rumah bisa memulai kehidupan baru.</p>
        )}
        <button className="btn ghost" onClick={() => navigate('/seumur')}>
          keluar
        </button>
      </div>
    </section>
  );
}
