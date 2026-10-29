/**
 * Meja KUCING PETASAN. Server memegang tumpukan; HP ini menampilkan tanganmu,
 * tumpukan (ketuk untuk mengambil dan mengakhiri giliran), jendela Ogah!,
 * Siram Air dengan pilihan posisi, dan ledakan yang bergetar.
 */
import { petasan as K } from '@sehari/core';
import { type CSSProperties, useEffect, useMemo, useRef, useState } from 'react';
import { bunyiLedak, bunyiSumbu, joinMeja, kalimat, leaveMeja, nama, rekor, sendPetasan, useMeja, type View } from '@/lib/petasan';
import { navigate, useParams } from '@/lib/router';
import { useSession } from '@/lib/session';
import { profile, useCountdown, useWakeLock, vibrate } from '@/lib/sidik';
import { bunyi } from '@/lib/titip';
import { Doodle, Growing, Header, Sheet, Toggle, useToast } from '@/ui/kit';
import { PlayerFace, Timer } from '../../sidik/parts';
import { DudukForm, KodeMeja } from '../shared';
import { AturanPetasan, BelakangP, KartuP } from './parts';

type Act = (a: K.Action) => Promise<void>;
const URUT = K.JENIS;

export default function PetasanMeja() {
  const { code = '' } = useParams<{ code: string }>();
  const C = code.toUpperCase();
  const { view, err, apply, serverNow } = useMeja(C);
  const toast = useToast();
  const session = useSession();
  const [busy, setBusy] = useState(false);
  const [lembar, setLembar] = useState<null | 'aturan' | 'riwayat' | 'buang'>(null);
  useWakeLock(!!view?.me && view.phase !== 'akhir');
  const act: Act = async (a) => {
    setBusy(true);
    try {
      apply(await sendPetasan(C, a));
    } catch (e) {
      toast((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const duar = useEfek(view, toast);

  if (err && !view)
    return (
      <main className="screen sd-screen">
        <Header title="Kucing Petasan" backTo="/main" />
        <div className="sd-empty">
          <Doodle id="kucing" size={64} />
          <p>{err}</p>
          <button className="btn soft" onClick={() => navigate('/main')}>
            kembali ke Ruang Main
          </button>
        </div>
      </main>
    );
  if (!view) return <Growing label="menyalakan sumbu…" />;
  if (!view.me)
    return (
      <DudukForm
        judul="duduk di meja"
        ajakan={view.phase === 'lobby' ? 'Kamu diajak main Kucing Petasan.' : 'Permainan di meja ini sudah berjalan.'}
        tombol="duduk"
        backTo="/main"
        doodle="kucing"
        bisa={view.phase === 'lobby'}
        defaultName={profile.get()?.name ?? session.me?.user.penName ?? ''}
        avatar0={profile.get()?.avatar}
        onJoin={async (p) => {
          profile.set(p);
          try {
            apply(await joinMeja(C, p));
          } catch (e) {
            toast((e as Error).message);
          }
        }}
      />
    );
  return (
    <main className={`screen sd-screen kp-screen ph-${view.phase}`}>
      <Atas view={view} serverNow={serverNow} onRiwayat={() => setLembar('riwayat')} onAturan={() => setLembar('aturan')} onLeave={async () => { if (view.phase === 'lobby') await leaveMeja(C).catch(() => {}); navigate('/main'); }} />
      {view.phase === 'lobby' ? <Lobi view={view} act={act} busy={busy} /> : <Permainan view={view} act={act} busy={busy} serverNow={serverNow} onBuang={() => setLembar('buang')} />}
      {duar ? (
        <div className="kp-duar" aria-hidden>
          <b>DUAR!</b>
          <span>{duar}</span>
        </div>
      ) : null}
      {view.phase === 'akhir' ? <Akhir view={view} act={act} /> : null}
      <Sheet open={lembar === 'aturan'} onClose={() => setLembar(null)} title="aturan Kucing Petasan">
        <AturanPetasan />
      </Sheet>
      <Sheet open={lembar === 'buang'} onClose={() => setLembar(null)} title={`buangan · ${view.buang.length} kartu`}>
        <div className="kp-buang-semua">
          {[...view.buang].reverse().map((c) => (
            <KartuP key={c.id} j={c.j} kecil />
          ))}
        </div>
      </Sheet>
      <Sheet open={lembar === 'riwayat'} onClose={() => setLembar(null)} title="riwayat">
        <div className="ts-riwayat">
          {[...view.log].reverse().map((e) => (
            <p key={e.n}>
              <span>{kalimat(e, view, view.me!.id)}</span>
            </p>
          ))}
        </div>
      </Sheet>
    </main>
  );
}

/** Bunyi, getar, ledakan, dan kabar kartu yang baru kamu terima. */
function useEfek(view: View | null, toast: (m: string) => void) {
  const lastN = useRef(-1);
  const lastTurn = useRef<string | null>(null);
  const lastPhase = useRef('');
  const lastDapat = useRef(0);
  const [duar, setDuar] = useState<string | null>(null);
  useEffect(() => {
    if (!view?.me) return;
    const me = view.me.id;
    const n = view.log.at(-1)?.n ?? 0;
    if (lastN.current >= 0 && n > lastN.current) {
      const baru = view.log.filter((e) => e.n > lastN.current);
      const ledak = baru.find((e) => e.t === 'ledak');
      if (ledak) {
        bunyiLedak();
        vibrate(ledak.by === me ? [400, 100, 600] : [200]);
        const p = view.players.find((x) => x.id === ledak.by);
        setDuar(ledak.by === me ? 'kamu meledak' : `${p?.name} meledak`);
        setTimeout(() => setDuar(null), 1800);
      } else if (baru.some((e) => e.t === 'petasan')) (bunyiSumbu(), vibrate([60, 60, 60, 60, 200]));
      else if (baru.some((e) => e.t === 'ogah')) (bunyi.keluar(), vibrate(80));
      else if (baru.some((e) => e.t === 'main' || e.t === 'ambil')) bunyi.kartu();
    }
    lastN.current = n;
    if (view.me.dapat && view.me.dapat.n !== lastDapat.current) {
      if (lastDapat.current && view.me.dapat.dari) toast(`Kamu dapat ${nama(view.me.dapat.j)} dari ${view.players.find((p) => p.id === view.me!.dapat!.dari)?.name ?? '…'}.`);
      lastDapat.current = view.me.dapat.n;
    }
    if (view.giliran === me && lastTurn.current !== me) (bunyi.giliran(), vibrate([30, 50, 30]));
    lastTurn.current = view.giliran;
    if (lastPhase.current && lastPhase.current !== view.phase && view.phase === 'akhir') {
      if (view.pemenang === me) bunyi.menang();
      rekor.catat(view.code, view.rev, view.pemenang === me);
    }
    lastPhase.current = view.phase;
  }, [view?.rev]);
  return duar;
}

function Atas({ view, serverNow, onLeave, onRiwayat, onAturan }: { view: View; serverNow: () => number; onLeave: () => void; onRiwayat: () => void; onAturan: () => void }) {
  const secs = useCountdown(view.phase === 'main' && view.fase === 'main' ? view.deadline : null, serverNow);
  return (
    <header className="sd-top">
      <button className="hdr-back" aria-label="keluar" onClick={onLeave}>
        <Doodle id="ui-kembali" size={20} />
      </button>
      <div className="sd-top-mid">
        <b>
          <Doodle id="kembang-api" size={20} color="currentColor" /> Kucing Petasan
        </b>
        <span>{view.phase === 'lobby' ? `meja ${view.code}` : `${view.petasan} petasan di ${view.deck} kartu`}</span>
      </div>
      <span className="row" style={{ gap: 4 }}>
        {secs !== null ? <Timer secs={secs} total={view.opts.waktu} /> : null}
        {view.phase !== 'lobby' ? (
          <button className="ts-ikon" aria-label="riwayat" onClick={onRiwayat}>
            <Doodle id="buku-terbuka" size={20} color="currentColor" />
          </button>
        ) : null}
        <button className="ts-ikon" aria-label="aturan" onClick={onAturan}>
          <Doodle id="tanda-tanya" size={20} color="currentColor" />
        </button>
      </span>
    </header>
  );
}

function Lobi({ view, act, busy }: { view: View; act: Act; busy: boolean }) {
  const host = view.me!.id === view.host;
  const o = view.opts;
  const n = view.players.length;
  return (
    <section className="sd-lobby">
      <KodeMeja code={view.code} path={`/main/petasan/${view.code}`} ajak="Main Kucing Petasan yuk! Jangan sampai meledak." />
      <span className="sd-label">di meja · {n}/{K.MAX_PLAYERS}</span>
      <div className="sd-players">
        {view.players.map((p) => (
          <span key={p.id} className="sd-player rise">
            <PlayerFace avatar={p.avatar} size={46} />
            <span className="tiny">
              {p.name}
              {p.id === view.host ? ' ★' : ''}
              {p.bot ? ' · bot' : ''}
            </span>
          </span>
        ))}
      </div>
      <p className="small soft center">{n >= 2 ? `${n - 1} Kucing Petasan akan diselipkan di tumpukan${n > 5 ? ' (dua dek, edisi pesta)' : ''}.` : 'Butuh minimal 2 orang. Sedang sendiri? Ajak bot.'}</p>
      {host ? (
        <div className="sd-settings">
          <Toggle label="Serbuan bertumpuk" hint="Diserbu lalu menyerbu balik: korban berikutnya menjalani sisa giliranmu + 2 (aturan terbaru)." value={o.tumpuk} onChange={(v) => void act({ t: 'opsi', opts: { tumpuk: v } })} />
          <span className="sd-label">jendela Ogah!</span>
          <div className="seg">
            {[3, 4, 6].map((t) => (
              <button key={t} className={o.ogahDetik === t ? 'on' : ''} onClick={() => void act({ t: 'opsi', opts: { ogahDetik: t } })}>
                {t} dtk
              </button>
            ))}
          </div>
          <span className="sd-label">batas waktu giliran</span>
          <div className="seg">
            {[0, 20, 40, 60].map((t) => (
              <button key={t} className={o.waktu === t ? 'on' : ''} onClick={() => void act({ t: 'opsi', opts: { waktu: t } })}>
                {t ? `${t} dtk` : 'santai'}
              </button>
            ))}
          </div>
          <span className="sd-label">bot</span>
          <div className="row" style={{ gap: 8 }}>
            <button className="btn sm soft grow" disabled={n >= K.MAX_PLAYERS || busy} onClick={() => void act({ t: 'bot', tambah: true })} data-testid="kp-bot">
              <Doodle id="ui-tambah" size={16} color="currentColor" /> tambah bot
            </button>
            <button className="btn sm soft grow" disabled={!view.players.some((p) => p.bot) || busy} onClick={() => void act({ t: 'bot', tambah: false })}>
              kurangi bot
            </button>
          </div>
          <button className="btn sd-cta" disabled={n < 2 || busy} onClick={() => void act({ t: 'mulai' })} data-testid="kp-mulai">
            <Doodle id="kembang-api" size={20} color="currentColor" /> nyalakan sumbu
          </button>
        </div>
      ) : (
        <p className="sd-wait">Menunggu tuan rumah menyalakan sumbu…</p>
      )}
    </section>
  );
}

// ── Permainan ───────────────────────────────────────────────────────────────

function Permainan({ view, act, busy, serverNow, onBuang }: { view: View; act: Act; busy: boolean; serverNow: () => number; onBuang: () => void }) {
  const me = view.me!;
  const aku = view.players.find((p) => p.id === me.id)!;
  const giliranku = view.phase === 'main' && view.giliran === me.id && view.fase === 'main';
  const tangan = useMemo(() => [...me.hand].sort((a, b) => URUT.indexOf(a.j) - URUT.indexOf(b.j)), [me.hand.map((c) => c.id).join()]);
  const [pilih, setPilih] = useState<number[]>([]);
  const [tanya, setTanya] = useState<null | 'target' | 'sebut' | 'ambil'>(null);
  const [target, setTarget] = useState<string | null>(null);
  const [sebut, setSebut] = useState<K.Jenis | null>(null);
  const [intip, setIntip] = useState<number | null>(null);
  useEffect(() => setPilih([]), [view.giliran, view.fase]);
  useEffect(() => {
    if (me.intip && me.intip.n !== intip) setIntip(me.intip.n);
  }, [me.intip?.n]);

  const cs = pilih.map((id) => me.hand.find((c) => c.id === id)!).filter(Boolean);
  const kombo = cs.length ? K.komboOf(cs) : null;
  const butuhTarget = kombo === 'dua' || kombo === 'tiga' || (kombo === 'satu' && cs[0]!.j === 'minta');
  const lawan = view.players.filter((p) => p.id !== me.id && !p.out && p.kartu > 0);
  const kirim = (extra: { target?: string; sebut?: K.Jenis; ambil?: number } = {}) => {
    const ids = pilih;
    setPilih([]);
    setTanya(null);
    setTarget(null);
    setSebut(null);
    void act({ t: 'main', kartu: ids, ...extra });
  };
  const mainkan = () => {
    if (kombo === 'lima') return setTanya('ambil');
    if (butuhTarget) return setTanya('target');
    kirim();
  };
  const persen = view.deck ? Math.round((view.petasan / view.deck) * 100) : 0;

  return (
    <section className="kp-meja">
      <div className="kp-pemain">
        {view.players.map((p) => (
          <span key={p.id} className={`kp-chip ${view.giliran === p.id ? 'giliran' : ''} ${p.out ? 'out' : ''}`} data-testid={`kp-chip-${p.name}`}>
            <PlayerFace avatar={p.avatar} size={26} dim={p.out} />
            <span className="kp-chip-isi">
              <b>{p.id === me.id ? 'kamu' : p.name}</b>
              <span>{p.out ? 'meledak' : `${p.kartu} kartu${view.giliran === p.id && view.sisa > 1 ? ` · ${view.sisa}× giliran` : ''}`}</span>
            </span>
          </span>
        ))}
      </div>

      <div className={`kp-tengah ${persen >= 30 ? 'panas' : ''}`} style={{ '--panas': Math.min(1, persen / 50) } as CSSProperties}>
        <BelakangP n={view.deck} onClick={giliranku && !busy ? () => void act({ t: 'ambil' }) : undefined} aktif={giliranku} />
        <button className="kp-buangan" onClick={onBuang} aria-label="lihat buangan">
          {view.buang.length ? <KartuP j={view.buang[view.buang.length - 1]!.j} /> : <span className="kp-kosong">buangan</span>}
        </button>
        <div className="kp-info">
          <span className="kp-peluang">
            <Doodle id="kembang-api" size={16} color="currentColor" /> {persen}% peluang petasan
          </span>
          {me.tahu.length ? <span className="tiny">Kamu tahu: petasan di posisi {me.tahu.map((i) => i + 1).join(', ')} dari atas.</span> : null}
          <p className="kp-kejadian">{view.log.length ? kalimat(view.log.at(-1)!, view, me.id) : ''}</p>
        </div>
      </div>

      {view.fase === 'ogah' && view.aksi ? <JendelaOgah view={view} act={act} busy={busy} serverNow={serverNow} /> : null}

      <div className={`st-aku kp-aku ${giliranku ? 'giliran' : ''}`}>
        {aku.out ? (
          <p className="sd-whisper">Kamu sudah meledak. Tonton siapa yang bertahan.</p>
        ) : (
          <>
            <p className="ts-status" data-testid="kp-status">
              {giliranku ? (view.sisa > 1 ? `Giliranmu (${view.sisa}× karena diserbu). Mainkan kartu, lalu ambil.` : 'Giliranmu. Mainkan kartu, lalu ambil dari tumpukan.') : view.fase === 'minta' && view.minta?.dari === me.id ? 'Kamu dimintai kartu!' : `Giliran ${view.players.find((p) => p.id === view.giliran)?.name ?? '…'}.`}
            </p>
            <div className="kp-tangan" style={{ '--n': tangan.length } as CSSProperties}>
              {tangan.map((c) => (
                <KartuP key={c.id} j={c.j} pilih={pilih.includes(c.id)} mati={!giliranku || c.j === 'siram' || c.j === 'petasan'} onClick={() => setPilih(pilih.includes(c.id) ? pilih.filter((x) => x !== c.id) : [...pilih, c.id])} testid="kp-kartu" />
              ))}
            </div>
            {giliranku ? (
              <div className="kp-tombol">
                {pilih.length ? (
                  <button className="btn grow" disabled={busy || !kombo} onClick={mainkan} data-testid="kp-main">
                    {kombo === 'satu' ? `mainkan ${nama(cs[0]!.j)}` : kombo === 'dua' ? 'curi kartu (2 kembar)' : kombo === 'tiga' ? 'minta kartu (3 kembar)' : kombo === 'lima' ? 'pungut buangan (5 beda)' : 'kombo tidak sah'}
                  </button>
                ) : null}
                <button className="btn sd-cta grow" disabled={busy} onClick={() => void act({ t: 'ambil' })} data-testid="kp-ambil-btn">
                  ambil kartu
                </button>
              </div>
            ) : null}
          </>
        )}
      </div>

      <Sheet open={tanya === 'target'} onClose={() => setTanya(null)} title={kombo === 'tiga' ? 'minta dari siapa?' : 'pilih pemain'}>
        <div className="col" style={{ gap: 10 }}>
          <div className="ts-pilih">
            {lawan.map((p) => (
              <button key={p.id} className={`pill ${target === p.id ? 'active' : ''}`} onClick={() => (kombo === 'tiga' ? (setTarget(p.id), setTanya('sebut')) : kirim({ target: p.id }))} data-testid="kp-target">
                {p.name} · {p.kartu} kartu
              </button>
            ))}
          </div>
        </div>
      </Sheet>
      <Sheet open={tanya === 'sebut'} onClose={() => setTanya(null)} title="sebut kartu yang kamu minta">
        <div className="kp-buang-semua">
          {K.JENIS.filter((j) => j !== 'petasan').map((j) => (
            <KartuP key={j} j={j} kecil pilih={sebut === j} onClick={() => kirim({ target: target!, sebut: j })} testid="kp-sebut" />
          ))}
        </div>
      </Sheet>
      <Sheet open={tanya === 'ambil'} onClose={() => setTanya(null)} title="pungut satu kartu dari buangan">
        <div className="kp-buang-semua">
          {view.buang.length ? view.buang.map((c) => <KartuP key={c.id} j={c.j} kecil onClick={() => kirim({ ambil: c.id })} testid="kp-pungut" />) : <p className="small soft">Buangan masih kosong.</p>}
        </div>
      </Sheet>

      {view.fase === 'minta' && view.minta?.dari === me.id ? <Minta view={view} act={act} busy={busy} /> : null}
      {view.fase === 'jinak' && view.jinak === me.id ? <Jinak view={view} act={act} busy={busy} serverNow={serverNow} /> : null}
      {intip !== null && me.intip?.n === intip ? (
        <div className="ts-layar" onClick={() => setIntip(-1)} data-testid="kp-intip">
          <div className="ts-layar-isi">
            <span className="sd-label center">tiga kartu teratas (kiri = paling atas)</span>
            <div className="kp-intip">
              {me.intip.kartu.map((j, i) => (
                <KartuP key={i} j={j} />
              ))}
            </div>
            <p className="tiny soft center">Hanya kamu yang melihat ini. Ketuk untuk menutup.</p>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function JendelaOgah({ view, act, busy, serverNow }: { view: View; act: Act; busy: boolean; serverNow: () => number }) {
  const a = view.aksi!;
  const me = view.me!;
  const secs = useCountdown(a.deadline, serverNow);
  const ogahku = me.hand.find((c) => c.j === 'ogah');
  const aku = view.players.find((p) => p.id === me.id)!;
  const by = view.players.find((p) => p.id === a.by);
  const t = view.players.find((p) => p.id === a.target);
  const batal = a.ogah.length % 2 === 1;
  const judul = a.kombo === 'satu' ? nama(a.j) : a.kombo === 'dua' ? `2 ${nama(a.j)} (curi)` : a.kombo === 'tiga' ? `3 ${nama(a.j)} (minta ${a.sebut ? nama(a.sebut) : ''})` : '5 kartu berbeda (pungut buangan)';
  return (
    <div className={`kp-ogah ${batal ? 'batal' : ''}`} data-testid="kp-jendela">
      <span className="kp-ogah-bar" style={{ '--p': Math.max(0, (secs ?? 0) / view.opts.ogahDetik) } as CSSProperties} />
      <span className="small">
        <b>{by?.id === me.id ? 'Kamu' : by?.name}</b> memainkan <b>{judul}</b>
        {t ? ` ke ${t.id === me.id ? 'kamu' : t.name}` : ''}.
        {a.ogah.length ? ` ${a.ogah.length}× Ogah! — ${batal ? 'batal' : 'berlaku lagi'}.` : ''}
      </span>
      {ogahku && !aku.out ? (
        <button className="btn kp-ogah-btn" disabled={busy} onClick={() => (vibrate(60), void act({ t: 'ogah', kartu: ogahku.id }))} data-testid="kp-ogah">
          OGAH!
        </button>
      ) : null}
    </div>
  );
}

function Minta({ view, act, busy }: { view: View; act: Act; busy: boolean }) {
  const ke = view.players.find((p) => p.id === view.minta!.ke);
  return (
    <div className="ts-layar" data-testid="kp-minta">
      <div className="ts-layar-isi">
        <Doodle id="kado" size={44} />
        <p className="sd-big-line">{ke?.name} minta satu kartu. Kamu yang pilih.</p>
        <div className="kp-buang-semua">
          {view.me!.hand.map((c) => (
            <KartuP key={c.id} j={c.j} kecil onClick={busy ? undefined : () => void act({ t: 'beri', kartu: c.id })} testid="kp-beri" />
          ))}
        </div>
      </div>
    </div>
  );
}

function Jinak({ view, act, busy, serverNow }: { view: View; act: Act; busy: boolean; serverNow: () => number }) {
  const [pos, setPos] = useState(0);
  const secs = useCountdown(view.deadline, serverNow);
  const label = pos === 0 ? 'paling atas (pemain berikutnya langsung mengambilnya!)' : pos === view.deck ? 'paling bawah' : `kartu ke-${pos + 1} dari atas`;
  return (
    <div className="ts-layar kp-jinak" data-testid="kp-jinak">
      <div className="ts-layar-isi">
        <KartuP j="petasan" />
        <p className="sd-big-line">Kucing Petasan! Untung ada Siram Air.</p>
        <p className="sd-whisper">Selipkan kembali ke tumpukan, diam-diam. ({secs ?? 0} detik)</p>
        <input type="range" min={0} max={view.deck} value={pos} onChange={(e) => setPos(Number(e.target.value))} className="kp-geser" data-testid="kp-geser" />
        <p className="small center">{label}</p>
        <div className="row" style={{ gap: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
          {[0, 1, 2].filter((x) => x <= view.deck).map((x) => (
            <button key={x} className="pill sm" onClick={() => setPos(x)}>
              ke-{x + 1}
            </button>
          ))}
          <button className="pill sm" onClick={() => setPos(Math.floor(Math.random() * (view.deck + 1)))}>
            acak
          </button>
          <button className="pill sm" onClick={() => setPos(view.deck)}>
            paling bawah
          </button>
        </div>
        <button className="btn sd-cta" disabled={busy} onClick={() => void act({ t: 'sisip', posisi: pos })} data-testid="kp-sisip">
          selipkan
        </button>
      </div>
    </div>
  );
}

function Akhir({ view, act }: { view: View; act: Act }) {
  const w = view.players.find((p) => p.id === view.pemenang)!;
  const me = view.me!.id;
  const urut = [...view.players].sort((a, b) => (a.out ? b.out ? b.ledak - a.ledak : 1 : -1));
  return (
    <div className="ts-layar akhir rise" data-testid="kp-akhir">
      <div className="ts-layar-isi">
        <PlayerFace avatar={w.avatar} size={84} />
        <p className="sd-big-line">{w.id === me ? 'Kamu satu-satunya yang selamat!' : `${w.name} satu-satunya yang selamat!`}</p>
        <div className="ts-klasemen">
          {urut.map((p, i) => (
            <span key={p.id} className={p.id === w.id ? 'baru' : 'kalah'}>
              <b style={{ width: 22 }}>{i + 1}</b>
              <PlayerFace avatar={p.avatar} size={26} />
              <b className="grow">{p.id === me ? 'kamu' : p.name}</b>
              <span className="tiny">{p.out ? `meledak ke-${p.ledak}` : 'selamat'}</span>
            </span>
          ))}
        </div>
        {me === view.host ? (
          <button className="btn sd-cta" onClick={() => void act({ t: 'lagi' })} data-testid="kp-lagi">
            main lagi
          </button>
        ) : null}
        <button className="btn soft" onClick={() => navigate('/main')}>
          kembali ke Ruang Main
        </button>
      </div>
    </div>
  );
}
