/**
 * Ruang SIDIK: satu layar yang berganti mengikuti fase permainan.
 * Server memegang aturan & waktu; HP ini menampilkan bagianmu sendiri,
 * menggetarkan, menyalakan narator (di HP tuan rumah), dan menjaga layar tetap menyala.
 */
import { sidik } from '@sehari/core';
import { useEffect, useMemo, useRef, useState } from 'react';
import { compressImage } from '@/lib/media';
import { navigate, useParams } from '@/lib/router';
import { useSession } from '@/lib/session';
import { hush, joinRoom, leaveRoom, profile, sendAct, sfx, speak, stats, useCountdown, useRoom, useWakeLock, vibrate, type View } from '@/lib/sidik';
import { QR } from '@/ui/art';
import { Doodle, Growing, Header, Toggle, useToast } from '@/ui/kit';
import { Scene } from '@/ui/art';
import { Board, faceOf, HoldButton, IntelList, PlayerFace, Replay, RoleCard, roleInfo, Timer, useNotes } from './parts';

const AVATARS = ['tunas', 'kucing', 'burung', 'ikan', 'kelinci', 'landak', 'bebek', 'katak', 'kupu-kupu', 'lebah', 'siput', 'kepik'];

const PHASE_LINE: Partial<Record<sidik.Phase, (v: View) => string>> = {
  role: () => 'Setiap orang, lihat peranmu diam-diam. Jangan sampai ada yang mengintip.',
  night: (v) => `Malam ke-${v.round}. Semua menunduk ke layar. Pilih tempat yang ingin kalian selidiki, lalu tahan tombolnya.`,
  dawn: () => 'Pagi datang. Periksa petunjuk kalian baik-baik.',
  day: () => 'Waktunya berdiskusi. Siapa yang jujur, dan siapa yang berbohong?',
  vote: (v) => `Waktunya mencoret ${v.quota} tersangka. Coretan butuh suara lebih dari separuh.`,
  verdict: () => 'Hasilnya sudah keluar.',
  accuse: () => 'Ini saatnya. Tunjuk pelakunya.',
  hunt: () => 'Pelaku tertangkap. Tapi penyusup belum menyerah. Dia mencari ahli forensik.',
};

export default function Room() {
  const { code = '' } = useParams<{ code: string }>();
  const C = code.toUpperCase();
  const { view, err, apply, serverNow } = useRoom(C);
  const toast = useToast();
  const session = useSession();
  const [busy, setBusy] = useState(false);
  const inGame = !!view?.me && view.phase !== 'lobby' && view.phase !== 'end';
  useWakeLock(!!view?.me && view.phase !== 'end');

  const act = async (a: sidik.Action) => {
    setBusy(true);
    try {
      apply(await sendAct(C, a));
    } catch (e) {
      toast((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  // Efek setiap pergantian fase: getar serentak, bunyi, dan narator (di HP tuan rumah).
  const lastPhase = useRef<string>('');
  useEffect(() => {
    if (!view?.me) return;
    const key = `${view.phase}:${view.round}`;
    if (lastPhase.current === key) return;
    const first = lastPhase.current === '';
    lastPhase.current = key;
    if (first) return;
    const ph = view.phase;
    if (ph === 'night') (vibrate([200, 120, 200]), sfx.night());
    if (ph === 'dawn') (vibrate(80), sfx.dawn());
    if (ph === 'verdict') (vibrate([60, 60, 160]), sfx.stamp());
    if (ph === 'end') (vibrate([100, 80, 300]), view.result && view.me && won(view) ? sfx.reveal() : sfx.fail());
    const narr = view.opts.narrator && view.me.id === view.host;
    if (ph === 'intro') speak(view.story.intro, narr);
    else if (ph === 'end' && view.result) speak(endLine(view), narr);
    else if (ph === 'dawn' && view.event && view.event.round === view.round) speak(`${PHASE_LINE.dawn!(view)} ${sidik.EVENTS.find((e) => e.id === view.event!.id)?.text ?? ''}`, narr);
    else speak(PHASE_LINE[ph]?.(view) ?? '', narr);
  }, [view?.phase, view?.round]);
  useEffect(() => () => hush(), []);

  // Statistik pribadi, sekali per permainan.
  useEffect(() => {
    if (view?.phase !== 'end' || !view.result || !view.me?.role) return;
    const k = `sidikDone.${view.code}.${view.rev}`;
    const tag = `${view.code}:${view.result.reason}:${view.result.accused ?? ''}:${view.suspects.length}`;
    if (localStorage.getItem(k) || localStorage.getItem(`sehari.sidikLast`) === tag) return;
    localStorage.setItem('sehari.sidikLast', tag);
    stats.add(view.me.role, sidik.teamOf(view.me.role), won(view));
  }, [view?.phase]);

  if (err && !view)
    return (
      <main className="screen sd-screen">
        <Header title="SIDIK" backTo="/sidik" />
        <div className="sd-empty">
          <Doodle id="awan" size={64} />
          <p>{err}</p>
          <button className="btn soft" onClick={() => navigate('/sidik')}>
            kembali
          </button>
        </div>
      </main>
    );
  if (!view) return <Growing label="membuka berkas kasus…" />;
  if (!view.me) return <JoinForm view={view} defaultName={profile.get()?.name ?? session.me?.user.penName ?? ''} onJoin={async (p) => { profile.set(p); try { apply(await joinRoom(C, p)); } catch (e) { toast((e as Error).message); } }} />;

  return (
    <main className={`screen sd-screen ph-${view.phase} ${inGame ? 'ingame' : ''}`}>
      <TopBar view={view} serverNow={serverNow} onLeave={async () => { if (view.phase === 'lobby') await leaveRoom(C).catch(() => {}); navigate('/sidik'); }} />
      {view.phase === 'lobby' ? <Lobby view={view} act={act} busy={busy} /> : null}
      {view.phase === 'intro' ? <Intro view={view} act={act} /> : null}
      {view.phase === 'role' ? <RolePhase view={view} act={act} /> : null}
      {view.phase === 'night' ? <Night view={view} act={act} busy={busy} /> : null}
      {view.phase === 'dawn' ? <Dawn view={view} act={act} /> : null}
      {view.phase === 'day' ? <Day view={view} act={act} code={C} /> : null}
      {view.phase === 'vote' ? <Vote view={view} act={act} code={C} busy={busy} /> : null}
      {view.phase === 'verdict' ? <Verdict view={view} /> : null}
      {view.phase === 'accuse' ? <Accuse view={view} act={act} code={C} busy={busy} /> : null}
      {view.phase === 'hunt' ? <Hunt view={view} act={act} /> : null}
      {view.phase === 'end' ? <End view={view} act={act} /> : null}
    </main>
  );
}

function won(v: View) {
  const r = v.result!;
  const me = v.me!;
  if (me.role === 'wartawan') return r.scoops.includes(me.id);
  return sidik.teamOf(me.role) === r.winner;
}

function endLine(v: View) {
  const r = v.result!;
  const c = v.suspects[v.culprit ?? 0];
  const reason = {
    benar: `Pelakunya ${c?.name}. ${v.story.caught}`,
    tercoret: `Kalian mencoret ${c?.name}, pelaku yang sebenarnya. ${v.story.escaped}`,
    salahtangkap: `Kalian menangkap orang yang salah. Pelakunya ${c?.name}. ${v.story.escaped}`,
    dibungkam: `Pelaku tertangkap, tapi penyusup berhasil membongkar ahli forensik. Kemenangan direbut di detik terakhir.`,
    terbongkar: `Pengkhianatnya terbongkar! Detektif menang.`,
    fitnah: `Kamu menuduh rekanmu yang tidak bersalah. Kepercayaan runtuh, dan pelaku lolos.`,
    buntu: 'Kasus buntu.',
  }[r.reason];
  return reason;
}

function TopBar({ view, serverNow, onLeave }: { view: View; serverNow: () => number; onLeave: () => void }) {
  const secs = useCountdown(view.deadline, serverNow);
  const total = view.phase === 'day' ? view.opts.talk : view.phase in sidik.DUR ? sidik.DUR[view.phase as keyof typeof sidik.DUR] / 1000 : undefined;
  const lastBeat = useRef(-1);
  useEffect(() => {
    if (secs === null || secs > 10 || secs === lastBeat.current || !['day', 'vote', 'accuse', 'night', 'hunt'].includes(view.phase)) return;
    lastBeat.current = secs;
    if (secs <= 5) (vibrate(90), sfx.heart());
    else sfx.tick();
  }, [secs]);
  const info = roleInfo(view.me?.role);
  const label: Partial<Record<sidik.Phase, string>> = { intro: 'berkas kasus', role: 'peranmu', night: `malam ${view.round}`, dawn: `pagi ${view.round}`, day: `hari ${view.round} · diskusi`, vote: `hari ${view.round} · coret`, verdict: 'putusan', accuse: 'tuduhan akhir', hunt: 'perburuan', end: 'kasus ditutup' };
  return (
    <header className="sd-top">
      <button className="hdr-back" aria-label="keluar" onClick={onLeave}>
        <Doodle id="ui-kembali" size={20} />
      </button>
      <div className="sd-top-mid">
        <b>
          <Doodle id={view.phase === 'lobby' ? 'ui-cari' : view.story.doodle} size={20} color="currentColor" /> {view.phase === 'lobby' ? 'SIDIK' : view.story.title}
        </b>
        <span>
          {label[view.phase] ?? `ruang ${view.code}`}
          {info && view.phase !== 'lobby' ? (
            <>
              {' · '}
              <Doodle id={info.doodle} size={13} color="currentColor" />
            </>
          ) : null}
        </span>
      </div>
      <Timer secs={secs} total={total} />
    </header>
  );
}

// ── Masuk ───────────────────────────────────────────────────────────────────

function JoinForm({ view, defaultName, onJoin }: { view: View; defaultName: string; onJoin: (p: { name: string; avatar: string }) => void }) {
  const saved = profile.get();
  const [name, setName] = useState(defaultName);
  const [avatar, setAvatar] = useState(saved?.avatar ?? AVATARS[Math.floor(Math.random() * AVATARS.length)]!);
  const file = useRef<HTMLInputElement>(null);
  return (
    <main className="screen sd-screen">
      <Header title="masuk ke kasus" sub={`ruang ${view.code}`} backTo="/sidik" />
      <section className="sd-join">
        <Doodle id={view.story.doodle} size={80} draw />
        <p className="sd-join-title">{view.phase === 'lobby' ? 'Kamu diundang ke sebuah kasus.' : 'Kasus ini sudah berjalan.'}</p>
        <div className="sd-avatar-pick">
          <button className="sd-selfie" onClick={() => file.current?.click()} aria-label="ambil foto wajah">
            <PlayerFace avatar={avatar} size={84} />
            <span className="tiny sd-ico">
              <Doodle id="ui-foto" size={14} color="currentColor" /> foto wajah
            </span>
          </button>
          <div className="sd-avatars">
            {AVATARS.map((a) => (
              <button key={a} className={avatar === a ? 'on' : ''} onClick={() => setAvatar(a)}>
                <Doodle id={a} size={26} color="currentColor" />
              </button>
            ))}
          </div>
        </div>
        <input
          ref={file}
          type="file"
          accept="image/*"
          capture="user"
          hidden
          onChange={async (e) => {
            const f = e.target.files?.[0];
            e.target.value = '';
            if (!f) return;
            const c = await compressImage(f, 160);
            setAvatar(`data:image/jpeg;base64,${btoa(String.fromCharCode(...c.bytes))}`);
          }}
        />
        <input className="field sd-name" maxLength={24} value={name} placeholder="nama samaranmu" onChange={(e) => setName(e.target.value)} autoFocus />
        <button className="btn sd-cta" disabled={!name.trim() || view.phase !== 'lobby'} onClick={() => onJoin({ name: name.trim(), avatar })} data-testid="sd-join">
          masuk ruang penyidikan
        </button>
        <p className="tiny soft center">Tidak perlu akun. Namamu hanya terlihat di ruangan ini.</p>
      </section>
    </main>
  );
}

// ── Lobi ────────────────────────────────────────────────────────────────────

function Lobby({ view, act, busy }: { view: View; act: (a: sidik.Action) => void; busy: boolean }) {
  const host = view.me!.id === view.host;
  const link = `${location.origin}/sidik/${view.code}`;
  const n = view.players.length;
  const preview = n >= 2 ? sidik.rolesFor(n, () => 0.99).roles : [];
  return (
    <section className="sd-lobby">
      <div className="sd-code-card">
        <span className="tiny">kode ruang</span>
        <b className="sd-code">{view.code}</b>
        <div className="sd-qr">
          <QR value={link} size={150} />
        </div>
        <div className="row" style={{ gap: 8 }}>
          <a className="btn sm soft grow" href={`https://wa.me/?text=${encodeURIComponent(`Ada kasus baru di SIDIK! Masuk pakai kode ${view.code}: ${link}`)}`} target="_blank" rel="noreferrer">
            undang lewat WA
          </a>
          <a className="btn sm soft grow" href={`/sidik/${view.code}/tv`} target="_blank" rel="noreferrer">
            <Doodle id="laptop" size={16} color="currentColor" /> mode TV
          </a>
        </div>
      </div>

      <span className="sd-label">penyidik di ruangan · {n}/20</span>
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

      {n >= 2 ? (
        <p className="small soft center" style={{ margin: '4px 0 0' }}>
          {n <= 3 ? (
            'Mode paranoia: mungkin ada pengkhianat di antara kalian, mungkin juga tidak.'
          ) : (
            <span className="sd-ico" style={{ flexWrap: 'wrap', justifyContent: 'center' }}>
              peran yang mungkin muncul:
              {[...new Set(preview)].map((r) => (
                <Doodle key={r} id={sidik.ROLES[r].doodle} size={20} color="currentColor" />
              ))}
            </span>
          )}
        </p>
      ) : null}

      {host ? (
        <div className="sd-settings">
          <span className="sd-label">kasus</span>
          <div className="sd-stories">
            {[{ id: 'acak', doodle: 'ui-dadu', title: 'acak' }, ...sidik.STORIES].map((s) => (
              <button key={s.id} className={`pill sm sd-story-chip ${view.opts.story === s.id ? 'active' : ''}`} onClick={() => act({ t: 'opts', opts: { story: s.id } })}>
                <Doodle id={s.doodle} size={16} color="currentColor" />
                {s.title}
              </button>
            ))}
          </div>
          <span className="sd-label">waktu diskusi</span>
          <div className="seg">
            {[90, 150, 240, 360].map((t) => (
              <button key={t} className={view.opts.talk === t ? 'on' : ''} onClick={() => act({ t: 'opts', opts: { talk: t } })}>
                {t < 120 ? `${t} dtk` : `${t / 60} mnt`}
              </button>
            ))}
          </div>
          <div className="mt">
            <Toggle label="narator suara" hint="dibacakan dari HP ini; taruh di tengah meja" value={view.opts.narrator} onChange={(v) => act({ t: 'opts', opts: { narrator: v } })} />
          </div>
          <button className="btn sd-cta" disabled={n < 2 || busy} onClick={() => act({ t: 'start' })} data-testid="sd-start">
            buka berkas kasus
          </button>
        </div>
      ) : (
        <p className="sd-wait">Menunggu tuan rumah membuka berkas kasus…</p>
      )}
    </section>
  );
}

// ── Pembuka & peran ─────────────────────────────────────────────────────────

function Typewriter({ text, speed = 22 }: { text: string; speed?: number }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    setN(0);
    const t = setInterval(() => setN((x) => (x >= text.length ? (clearInterval(t), x) : x + 2)), speed);
    return () => clearInterval(t);
  }, [text]);
  return (
    <span>
      {text.slice(0, n)}
      {n < text.length ? <i className="sd-caret">▍</i> : null}
    </span>
  );
}

function Ready({ view, act, label = 'siap' }: { view: View; act: (a: sidik.Action) => void; label?: string }) {
  const me = view.players.find((p) => p.id === view.me!.id)!;
  const done = view.players.filter((p) => p.ready).length;
  return (
    <div className="sd-ready">
      <button className="btn sd-cta" disabled={me.ready} onClick={() => act({ t: 'ready' })} data-testid="sd-ready">
        {me.ready ? `menunggu yang lain… ${done}/${view.players.length}` : label}
      </button>
    </div>
  );
}

function Intro({ view, act }: { view: View; act: (a: sidik.Action) => void }) {
  const st = view.story;
  return (
    <section className="sd-intro">
      <div className="sd-file">
        <span className="sd-file-tab">BERKAS KASUS · {st.genre.toUpperCase()}</span>
        <h1 className="sd-file-title">
          <Doodle id={st.doodle} size={40} color="currentColor" draw /> {st.title}
        </h1>
        <p className="sd-file-text">
          <Typewriter text={st.intro} />
        </p>
        <div className="sd-file-facts">
          <span>
            <b>kejadian</b> {st.crime}
          </span>
          <span>
            <b>waktu</b> {st.when}
          </span>
          <span>
            <b>tersangka</b> {view.suspects.length} orang
          </span>
        </div>
        <div className="sd-places">
          {st.places.map((p, i) => (
            <span key={i} className="sd-place-mini">
              <Doodle id={p.doodle} size={26} color="currentColor" />
              {p.name}
              <i>jejak {st.cats[p.cat]!.name}</i>
            </span>
          ))}
        </div>
      </div>
      <Ready view={view} act={act} label="aku siap menyelidiki" />
    </section>
  );
}

function RolePhase({ view, act }: { view: View; act: (a: sidik.Action) => void }) {
  const [seen, setSeen] = useState(false);
  return (
    <section className="sd-rolephase">
      <p className="sd-whisper">Pegang HP-mu rapat-rapat.</p>
      <RoleCard view={view} onSeen={() => setSeen(true)} />
      {seen ? <Ready view={view} act={act} label="aku paham peranku" /> : <p className="tiny soft center">buka kartumu dulu</p>}
    </section>
  );
}

// ── Malam ───────────────────────────────────────────────────────────────────

function Night({ view, act, busy }: { view: View; act: (a: sidik.Action) => void; busy: boolean }) {
  const me = view.me!;
  const role = me.role!;
  const st = view.story;
  const [place, setPlace] = useState<number | null>(null);
  const [target, setTarget] = useState<string | undefined>();
  const [target2, setTarget2] = useState<string | undefined>();
  const [pickN, setPick] = useState<number | undefined>();
  const others = view.players.filter((p) => p.id !== me.id);
  const done = !!me.act;
  const acted = view.players.filter((p) => p.acted).length;
  const needPick = role === 'forensik';
  const ready = place !== null && (!needPick || pickN !== undefined);

  const PlayerPick = ({ value, onPick, exclude = [], allowNone }: { value?: string; onPick: (id?: string) => void; exclude?: string[]; allowNone?: boolean }) => (
    <div className="sd-pick-players">
      {allowNone ? (
        <button className={!value ? 'on' : ''} onClick={() => onPick(undefined)}>
          tidak
        </button>
      ) : null}
      {others
        .filter((p) => !exclude.includes(p.id))
        .map((p) => (
          <button key={p.id} className={value === p.id ? 'on' : ''} onClick={() => onPick(p.id)}>
            <PlayerFace avatar={p.avatar} size={28} />
            {p.name}
          </button>
        ))}
    </div>
  );

  if (done)
    return (
      <section className="sd-night done">
        <Scene id="langit-malam" width={240} className="sd-night-sky" />
        <p className="sd-night-title">Kamu bergerak dalam gelap.</p>
        <p className="small">Tutup layarmu. Menunggu yang lain… {acted}/{view.players.length}</p>
      </section>
    );

  return (
    <section className="sd-night">
      <Scene id="langit-malam" className="sd-night-sky" />
      <p className="sd-night-title">malam ke-{view.round}</p>
      <span className="sd-label">selidiki di mana?</span>
      <div className="sd-place-grid">
        {st.places.map((p, i) => (
          <button key={i} className={`sd-place ${place === i ? 'on' : ''}`} onClick={() => setPlace(i)}>
            <Doodle id={p.doodle} size={38} color="currentColor" />
            <b>{p.name}</b>
            <span className="tiny">jejak {st.cats[p.cat]!.name}</span>
          </button>
        ))}
      </div>

      {role === 'penyusup' ? (
        <>
          <span className="sd-label sd-ico">
            <Doodle id="pena" size={16} color="currentColor" /> palsukan petunjuk siapa?
          </span>
          <PlayerPick value={target} onPick={setTarget} exclude={me.allies} allowNone />
        </>
      ) : null}
      {role === 'pengawal' ? (
        <>
          <span className="sd-label sd-ico">
            <Doodle id="payung-terbuka" size={16} color="currentColor" /> jaga siapa malam ini?
          </span>
          <PlayerPick value={target} onPick={setTarget} allowNone />
        </>
      ) : null}
      {role === 'peretas' ? (
        <>
          <span className="sd-label sd-ico">
            <Doodle id="laptop" size={16} color="currentColor" /> retas petunjuk siapa?
          </span>
          <PlayerPick value={target} onPick={setTarget} allowNone />
        </>
      ) : null}
      {role === 'psikolog' && me.uses.psy > 0 ? (
        <>
          <span className="sd-label sd-ico">
            <Doodle id="gelembung-kata" size={16} color="currentColor" /> baca dua orang (sekali saja dalam permainan)
          </span>
          <PlayerPick value={target} onPick={setTarget} allowNone />
          {target ? <PlayerPick value={target2} onPick={setTarget2} exclude={[target]} allowNone /> : null}
        </>
      ) : null}
      {role === 'kakitangan' ? (
        <>
          <span className="sd-label sd-ico">
            <Doodle id="penyiram" size={16} color="currentColor" /> bersihkan tempat mana?
          </span>
          <div className="sd-pick-players">
            <button className={pickN === undefined ? 'on' : ''} onClick={() => setPick(undefined)}>
              tidak
            </button>
            {st.places.map((p, i) => (
              <button key={i} className={pickN === i ? 'on' : ''} onClick={() => setPick(i)}>
                <Doodle id={p.doodle} size={16} color="currentColor" /> {p.name}
              </button>
            ))}
          </div>
        </>
      ) : null}
      {(role === 'forensik' || role === 'peniru') && me.offers.length ? (
        <>
          <span className="sd-label sd-ico">
            <Doodle id={role === 'forensik' ? 'kacamata' : 'stempel'} size={16} color="currentColor" />
            {role === 'forensik' ? 'terbitkan laporan mana?' : `terbitkan laporan palsu? (sisa ${me.uses.forge})`}
          </span>
          <div className="sd-offers">
            {role === 'peniru' ? (
              <button className={pickN === undefined ? 'on' : ''} onClick={() => setPick(undefined)}>
                tidak malam ini
              </button>
            ) : null}
            {me.offers.map((o, i) => (
              <button key={i} className={pickN === i ? 'on' : ''} onClick={() => setPick(i)}>
                <Doodle id="amplop" size={16} color="currentColor" /> {o}
              </button>
            ))}
          </div>
        </>
      ) : null}

      <HoldButton
        label={ready ? 'tahan untuk bergerak dalam gelap' : 'pilih dulu'}
        disabled={!ready || busy}
        onDone={() => act({ t: 'night', place: place!, target, target2, pick: pickN })}
      />
      <p className="tiny center sd-dim">Semua orang menahan tombol yang sama, jadi tidak ada yang tahu siapa sedang beraksi.</p>
    </section>
  );
}

// ── Pagi ────────────────────────────────────────────────────────────────────

function Dawn({ view, act }: { view: View; act: (a: sidik.Action) => void }) {
  const mine = view.intel.filter((i) => i.round === view.round && (i.to === view.me!.id || i.to === '*'));
  return (
    <section className="sd-dawn">
      <p className="sd-dawn-title">
        <Doodle id="matahari" size={40} color="currentColor" draw /> pagi ke-{view.round}
      </p>
      <div className="sd-envelopes">
        {mine.length ? (
          mine.map((i, k) => (
            <div key={i.id} className={`sd-envelope k-${i.kind}`} style={{ animationDelay: `${k * 0.35}s` }}>
              <span className="sd-env-kind">
                <Doodle id={i.to === '*' ? (i.kind === 'event' ? 'petir' : 'amplop') : 'ui-gembok'} size={14} color="currentColor" />
                {i.to === '*' ? (i.kind === 'event' ? 'kejadian' : 'untuk semua') : 'hanya untukmu'}
              </span>
              <p>{i.text}</p>
            </div>
          ))
        ) : (
          <p className="small soft">Tidak ada yang baru pagi ini.</p>
        )}
      </div>
      <Ready view={view} act={act} label="ke ruang diskusi" />
    </section>
  );
}

// ── Diskusi ─────────────────────────────────────────────────────────────────

function Day({ view, act, code }: { view: View; act: (a: sidik.Action) => void; code: string }) {
  const [tab, setTab] = useState<'papan' | 'petunjuk' | 'bisik' | 'peran'>('papan');
  const { notes, cycle } = useNotes(code);
  const [off, setOff] = useState<Set<string>>(new Set());
  const toggle = (id: string) => setOff((s) => (s.has(id) ? (s.delete(id), new Set(s)) : new Set(s.add(id))));
  const ketua = view.players.find((p) => p.id === view.ketua);
  return (
    <section className="sd-day">
      <p className="sd-day-hint">
        <Doodle id="stempel" size={14} color="currentColor" /> Ketua penyidik hari ini: <b>{ketua?.name}</b> (memutuskan bila suara seri)
      </p>
      <div className="sd-tabs">
        {(['papan', 'petunjuk', 'bisik', 'peran'] as const).map((t) => (
          <button key={t} className={tab === t ? 'on' : ''} onClick={() => setTab(t)}>
            <Doodle id={t === 'papan' ? 'pin-papan' : t === 'petunjuk' ? 'ui-cari' : t === 'bisik' ? 'gelembung-kata' : 'kartu'} size={18} color="currentColor" />
            {t === 'peran' ? 'peranku' : t}
          </button>
        ))}
      </div>
      {tab === 'papan' ? (
        <>
          <p className="tiny soft">Ketuk kartu untuk menandai: ✗ bukan · ? ragu · ★ curiga. Angka merah = bertentangan dengan berapa petunjuk yang kamu tahu.</p>
          <Board view={view} notes={notes} onNote={cycle} off={off} />
        </>
      ) : null}
      {tab === 'petunjuk' ? <IntelList view={view} onShow={(id) => act({ t: 'show', id })} off={off} onToggle={toggle} /> : null}
      {tab === 'bisik' ? <Whisper view={view} act={act} /> : null}
      {tab === 'peran' ? <RoleCard view={view} /> : null}
      <Ready view={view} act={act} label="cukup diskusinya" />
    </section>
  );
}

function Whisper({ view, act }: { view: View; act: (a: sidik.Action) => void }) {
  const [to, setTo] = useState<string | null>(null);
  const [text, setText] = useState('');
  const me = view.me!;
  const name = (id: string) => view.players.find((p) => p.id === id)?.name ?? '?';
  return (
    <div className="sd-whisper-box">
      <p className="tiny soft">Satu bisikan rahasia per hari. Hanya dia yang bisa membacanya (dan semua orang di siaran ulang nanti).</p>
      {me.whispered ? (
        <p className="small">Bisikanmu hari ini sudah terkirim.</p>
      ) : (
        <>
          <div className="sd-pick-players">
            {view.players
              .filter((p) => p.id !== me.id)
              .map((p) => (
                <button key={p.id} className={to === p.id ? 'on' : ''} onClick={() => setTo(p.id)}>
                  <PlayerFace avatar={p.avatar} size={26} /> {p.name}
                </button>
              ))}
          </div>
          <input className="field" maxLength={140} placeholder="ketik bisikan…" value={text} onChange={(e) => setText(e.target.value)} />
          <button className="btn sm" disabled={!to || !text.trim()} onClick={() => (act({ t: 'whisper', to: to!, text }), vibrate(20), setText(''))}>
            kirim bisikan
          </button>
        </>
      )}
      {view.whispers.length ? (
        <div className="sd-intel">
          {view.whispers.map((w, i) => (
            <div key={i} className="sd-clue k-bisik">
              <span className="sd-clue-kind">
                <Doodle id="gelembung-kata" size={14} color="currentColor" /> {w.from === me.id ? `kamu → ${name(w.to)}` : `${name(w.from)} → kamu`} · hari {w.round}
              </span>
              <span className="sd-clue-text">“{w.text}”</span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

// ── Coret, putusan, tuduhan, perburuan ──────────────────────────────────────

function Vote({ view, act, code, busy }: { view: View; act: (a: sidik.Action) => void; code: string; busy: boolean }) {
  const { notes } = useNotes(code);
  const [sel, setSel] = useState<number[]>(view.me!.votes);
  const q = view.quota;
  const need = Math.floor(view.players.length / 2) + 1;
  const voted = view.players.filter((p) => p.acted).length;
  return (
    <section className="sd-vote">
      <p className="sd-big-line">Coret sampai {q} tersangka</p>
      <p className="tiny soft center">
        Tersangka hanya tercoret bila dipilih ≥ {need} orang. Jangan sampai pelakunya ikut tercoret!
      </p>
      <Board view={view} notes={notes} selected={sel} onSelect={(id) => setSel((x) => (x.includes(id) ? x.filter((y) => y !== id) : x.length < q ? [...x, id] : x))} />
      <div className="sd-ready">
        <button className="btn sd-cta" disabled={busy} onClick={() => (act({ t: 'vote', ids: sel }), vibrate(30))} data-testid="sd-vote">
          {view.me!.votes.length || view.players.find((p) => p.id === view.me!.id)?.acted ? `terkirim · ${voted}/${view.players.length}` : `coret ${sel.length}/${q}`}
        </button>
      </div>
    </section>
  );
}

function Verdict({ view }: { view: View }) {
  const gone = view.suspects.filter((s) => s.out === view.round);
  return (
    <section className="sd-verdict">
      <p className="sd-big-line">Putusan hari ke-{view.round}</p>
      {gone.length ? (
        <div className="sd-gone">
          {gone.map((s, i) => (
            <div key={s.id} className="sd-gone-card" style={{ animationDelay: `${0.4 + i * 0.6}s` }}>
              <b>{s.name}</b>
              <span className="tiny">{s.job}</span>
              <span className="tiny">{view.tally[s.id] ?? 0} suara</span>
              <span className="sd-stamp big">DICORET</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="center">Tidak ada yang mendapat cukup suara. Tidak ada yang dicoret.</p>
      )}
      <p className="sd-whisper center">Pelakunya… masih di antara mereka yang tersisa.</p>
    </section>
  );
}

function Accuse({ view, act, code, busy }: { view: View; act: (a: sidik.Action) => void; code: string; busy: boolean }) {
  const { notes } = useNotes(code);
  const me = view.me!;
  const [pick, setPick] = useState<number | null>(me.accuse);
  const [scoop, setScoop] = useState<string | undefined>();
  const [traitor, setTraitor] = useState<string>('');
  const others = view.players.filter((p) => p.id !== me.id);
  const paranoia = view.players.length <= 3;
  const sent = me.accuse !== null;
  return (
    <section className="sd-accuse">
      <p className="sd-big-line">Tunjuk pelakunya</p>
      <Board view={view} notes={notes} selected={pick !== null ? [pick] : []} onSelect={(id) => setPick(id)} />
      {me.role === 'wartawan' ? (
        <>
          <span className="sd-label sd-ico">
            <Doodle id="kamera" size={16} color="currentColor" /> diam-diam: siapa Penyusup?
          </span>
          <div className="sd-pick-players">
            {others.map((p) => (
              <button key={p.id} className={scoop === p.id ? 'on' : ''} onClick={() => setScoop(p.id)}>
                {p.name}
              </button>
            ))}
          </div>
        </>
      ) : null}
      {paranoia && sidik.teamOf(me.role) !== 'jahat' ? (
        <>
          <span className="sd-label sd-ico">
            <Doodle id="ui-dadu" size={16} color="currentColor" /> apakah ada pengkhianat di antara kalian?
          </span>
          <p className="tiny soft">Benar menebak pengkhianat = menang. Menuduh rekan yang jujur = kalah.</p>
          <div className="sd-pick-players">
            <button className={traitor === '' ? 'on' : ''} onClick={() => setTraitor('')}>
              tidak ada
            </button>
            {others.map((p) => (
              <button key={p.id} className={traitor === p.id ? 'on' : ''} onClick={() => setTraitor(p.id)}>
                {p.name} pengkhianat!
              </button>
            ))}
          </div>
        </>
      ) : null}
      <div className="sd-ready">
        <button className="btn sd-cta danger-glow" disabled={pick === null || busy || sent} onClick={() => (act({ t: 'accuse', id: pick!, scoop, traitor: paranoia ? traitor : undefined }), vibrate([50, 50, 120]))} data-testid="sd-accuse">
          {sent ? `menunggu… ${view.players.filter((p) => p.acted).length}/${view.players.length}` : pick !== null ? `tuduh ${view.suspects[pick]!.name}` : 'pilih satu tersangka'}
        </button>
      </div>
    </section>
  );
}

function Hunt({ view, act }: { view: View; act: (a: sidik.Action) => void }) {
  const me = view.me!;
  const [t, setT] = useState<string | undefined>();
  if (me.role !== 'penyusup')
    return (
      <section className="sd-hunt">
        <span className="pulse">
          <Doodle id="pena" size={70} />
        </span>
        <p className="sd-big-line">Penyusup sedang memilih…</p>
        <p className="small center">Pelaku sudah tertangkap. Tapi kalau penyusup berhasil menebak siapa Ahli Forensik, kemenangan direbut.</p>
      </section>
    );
  return (
    <section className="sd-hunt">
      <p className="sd-big-line">Siapa Ahli Forensik?</p>
      <p className="small center">Tebakanmu benar = tim pelaku menang.</p>
      <div className="sd-pick-players big">
        {view.players
          .filter((p) => p.id !== me.id && !me.allies.includes(p.id))
          .map((p) => (
            <button key={p.id} className={t === p.id ? 'on' : ''} onClick={() => setT(p.id)}>
              <PlayerFace avatar={p.avatar} size={34} /> {p.name}
            </button>
          ))}
      </div>
      <HoldButton label="tahan untuk menuduh" disabled={!t} onDone={() => act({ t: 'hunt', target: t! })} />
    </section>
  );
}

// ── Akhir ───────────────────────────────────────────────────────────────────

function End({ view, act }: { view: View; act: (a: sidik.Action) => void }) {
  const r = view.result!;
  const me = view.me!;
  const c = view.suspects[view.culprit ?? 0]!;
  const st = view.story;
  const win = won(view);
  const [tab, setTab] = useState<'cerita' | 'ulang' | 'petunjuk'>('cerita');
  const teamWin = r.winner === 'baik' ? 'Tim detektif menang' : 'Tim pelaku menang';
  const myClues = useMemo(() => view.intel.filter((i) => i.to === me.id && i.fact), [view.intel]);
  return (
    <section className="sd-end">
      <div className={`sd-result ${win ? 'win' : 'lose'}`}>
        <Doodle id={win ? 'bintang' : 'hati-patah'} size={56} draw />
        <span className="sd-result-big">{win ? 'menang!' : 'kalah…'}</span>
        <span>{teamWin}</span>
      </div>
      <div className="sd-culprit-card">
        <span className="tiny">pelakunya adalah</span>
        <PlayerFace avatar={faceOf(c.name)} size={120} />
        <span className="sd-culprit-traits">
          {c.attrs.map((v, k) => (
            <span key={k}>{st.cats[k]!.traits[v]!.label}</span>
          ))}
        </span>
        <b>{c.name}</b>
        <span className="small">{c.job}</span>
        <i className="tiny">“{c.quirk}”</i>
      </div>
      <p className="sd-end-story">{endLine(view)}</p>
      {r.scoops.length ? <p className="small center">Wartawan {r.scoops.map((id) => view.players.find((p) => p.id === id)?.name).join(', ')} mendapat berita eksklusif!</p> : null}

      <div className="sd-roles-reveal">
        {view.players.map((p) => {
          const info = roleInfo(p.role);
          return (
            <span key={p.id} className={`sd-reveal team-${info?.team}`}>
              <PlayerFace avatar={p.avatar} size={36} />
              <b>{p.name}</b>
              <span className="tiny">
                {info ? <Doodle id={info.doodle} size={14} color="currentColor" /> : null} {info?.name}
              </span>
            </span>
          );
        })}
        {view.shadow ? <span className="tiny soft">Tidak ada pengkhianat malam ini; yang memalsukan adalah bayangan.</span> : null}
      </div>

      <div className="sd-tabs">
        {(['cerita', 'ulang', 'petunjuk'] as const).map((t) => (
          <button key={t} className={tab === t ? 'on' : ''} onClick={() => setTab(t)}>
            <Doodle id={t === 'cerita' ? 'pin-papan' : t === 'ulang' ? 'bulan' : 'ui-cari'} size={18} color="currentColor" />
            {t === 'cerita' ? 'papan akhir' : t === 'ulang' ? 'siaran ulang' : 'petunjukku'}
          </button>
        ))}
      </div>
      {tab === 'cerita' ? <Board view={view} notes={{}} showHits={false} /> : null}
      {tab === 'ulang' ? <Replay view={view} /> : null}
      {tab === 'petunjuk' ? (
        <div className="sd-intel">
          {myClues.map((i) => (
            <div key={i.id} className={`sd-clue ${i.truth ? 'real' : 'fake'}`}>
              <span className="sd-clue-kind">malam {i.round}</span>
              <span className="sd-clue-text">{i.text}</span>
              <b className={i.truth ? 'sd-real' : 'sd-fake'}>{i.truth ? 'ASLI' : 'PALSU'}</b>
            </div>
          ))}
        </div>
      ) : null}

      <div className="sd-ready">
        {me.id === view.host ? (
          <button className="btn sd-cta" onClick={() => act({ t: 'start' })} data-testid="sd-again">
            kasus berikutnya (pemain sama)
          </button>
        ) : (
          <p className="small soft center">Menunggu tuan rumah membuka kasus berikutnya…</p>
        )}
        <button className="btn ghost" onClick={() => navigate('/sidik')}>
          keluar
        </button>
      </div>
    </section>
  );
}
