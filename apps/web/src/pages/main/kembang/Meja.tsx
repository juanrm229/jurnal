/**
 * Meja KEMBANG API. Kamu melihat kartu semua orang kecuali kartumu sendiri.
 * Ketuk kartu teman untuk memberi petunjuk (dengan pratinjau kartu yang
 * tersentuh), atau ketuk kartumu untuk memainkan, membuang, atau menggesernya.
 */
import { hanabi as H } from '@sehari/core';
import { useEffect, useRef, useState } from 'react';
import { bunyiLetup, HEX, joinMeja, kalimat, leaveMeja, rekor, sendKembang, useMeja, type View } from '@/lib/hanabi';
import { navigate, useParams } from '@/lib/router';
import { useSession } from '@/lib/session';
import { profile, useCountdown, useWakeLock, vibrate } from '@/lib/sidik';
import { bunyi } from '@/lib/titip';
import { Doodle, Growing, Header, Sheet, Toggle, useToast } from '@/ui/kit';
import { PlayerFace, Timer } from '../../sidik/parts';
import { DudukForm, KodeMeja } from '../shared';
import { Api, AturanKembang, KartuK, Token } from './parts';

type Act = (a: H.Action) => Promise<void>;

export default function KembangMeja() {
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
      apply(await sendKembang(C, a));
    } catch (e) {
      toast((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const letup = useEfek(view);

  if (err && !view)
    return (
      <main className="screen sd-screen">
        <Header title="Kembang Api" backTo="/main" />
        <div className="sd-empty">
          <Doodle id="kembang-api" size={64} />
          <p>{err}</p>
          <button className="btn soft" onClick={() => navigate('/main')}>
            kembali ke Ruang Main
          </button>
        </div>
      </main>
    );
  if (!view) return <Growing label="menyiapkan panggung…" />;
  if (!view.me)
    return (
      <DudukForm
        judul="duduk di meja"
        ajakan={view.phase === 'lobby' ? 'Kamu diajak main Kembang Api.' : 'Permainan di meja ini sudah berjalan.'}
        tombol="duduk"
        backTo="/main"
        doodle="kembang-api"
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
    <main className={`screen sd-screen kb-screen ph-${view.phase}`}>
      <Atas view={view} serverNow={serverNow} onRiwayat={() => setLembar('riwayat')} onAturan={() => setLembar('aturan')} onLeave={async () => { if (view.phase === 'lobby') await leaveMeja(C).catch(() => {}); navigate('/main'); }} />
      {view.phase === 'lobby' ? <Lobi view={view} act={act} busy={busy} /> : <Permainan view={view} act={act} busy={busy} letup={letup} onBuang={() => setLembar('buang')} />}
      {view.phase === 'akhir' ? <Akhir view={view} act={act} /> : null}
      <Sheet open={lembar === 'aturan'} onClose={() => setLembar(null)} title="aturan Kembang Api">
        <AturanKembang />
      </Sheet>
      <Sheet open={lembar === 'buang'} onClose={() => setLembar(null)} title="kartu terbuang">
        <Buangan view={view} />
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

/** Letupan saat kembang api menyala, getar saat sumbu terbakar. */
function useEfek(view: View | null) {
  const lastN = useRef(-1);
  const lastTurn = useRef<string | null>(null);
  const lastPhase = useRef('');
  const [letup, setLetup] = useState<H.Warna | null>(null);
  useEffect(() => {
    if (!view?.me) return;
    const me = view.me.id;
    const n = view.log.at(-1)?.n ?? 0;
    if (lastN.current >= 0 && n > lastN.current) {
      const baru = view.log.filter((e) => e.n > lastN.current);
      const main = baru.find((e) => e.t === 'main');
      if (main?.kartu) {
        bunyiLetup(0.8 + main.kartu.n * 0.1);
        setLetup(main.kartu.w);
        setTimeout(() => setLetup(null), 1400);
      } else if (baru.some((e) => e.t === 'gagal')) (bunyi.keluar(), vibrate([200, 80, 200]));
      else if (baru.some((e) => e.t === 'petunjuk' && e.ke === me)) (bunyi.giliran(), vibrate(60));
      else if (baru.some((e) => e.t === 'buang' || e.t === 'petunjuk')) bunyi.kartu();
    }
    lastN.current = n;
    if (view.giliran === me && lastTurn.current !== me) (bunyi.giliran(), vibrate([30, 50, 30]));
    lastTurn.current = view.giliran;
    if (lastPhase.current && lastPhase.current !== view.phase && view.phase === 'akhir') {
      if ((view.skor ?? 0) >= 15) bunyi.menang();
      rekor.catat(view.code, view.rev, view.skor ?? 0);
    }
    lastPhase.current = view.phase;
  }, [view?.rev]);
  return letup;
}

function Atas({ view, serverNow, onLeave, onRiwayat, onAturan }: { view: View; serverNow: () => number; onLeave: () => void; onRiwayat: () => void; onAturan: () => void }) {
  const secs = useCountdown(view.phase === 'main' ? view.deadline : null, serverNow);
  return (
    <header className="sd-top">
      <button className="hdr-back" aria-label="keluar" onClick={onLeave}>
        <Doodle id="ui-kembali" size={20} />
      </button>
      <div className="sd-top-mid">
        <b>
          <Doodle id="kembang-api" size={20} color="currentColor" /> Kembang Api
        </b>
        <span>{view.phase === 'lobby' ? `meja ${view.code}` : view.sisaAkhir !== null ? `giliran terakhir · sisa ${view.sisaAkhir}` : 'kooperatif'}</span>
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
      <KodeMeja code={view.code} path={`/main/kembang/${view.code}`} ajak="Main Kembang Api yuk! Kita harus kompak." />
      <span className="sd-label">di meja · {n}/{H.MAX_PLAYERS}</span>
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
      <p className="small soft center">{n >= 2 ? `${H.tanganUntuk(n)} kartu per orang · 8 token petunjuk · 3 sumbu.` : 'Butuh minimal 2 orang. Sedang sendiri? Ajak bot.'}</p>
      {host ? (
        <div className="sd-settings">
          <span className="sd-label">warna keenam</span>
          <div className="seg">
            {(['tidak', 'biasa', 'langka', 'pelangi'] as const).map((t) => (
              <button key={t} className={o.warna6 === t ? 'on' : ''} onClick={() => void act({ t: 'opsi', opts: { warna6: t } })}>
                {t}
              </button>
            ))}
          </div>
          <p className="tiny soft">{{ tidak: 'Lima warna, skor maksimal 25 (resmi).', biasa: 'Tambah warna pelangi 10 kartu, skor maksimal 30.', langka: 'Pelangi hanya satu kartu tiap angka. Semuanya kritis.', pelangi: 'Kartu pelangi tersentuh oleh setiap petunjuk warna.' }[o.warna6]}</p>
          <Toggle label="Catatan otomatis" hint="Kartumu menampilkan kemungkinan warna & angka dari petunjuk. Matikan untuk tantangan mengingat sendiri." value={o.catatan} onChange={(v) => void act({ t: 'opsi', opts: { catatan: v } })} />
          <span className="sd-label">batas waktu giliran</span>
          <div className="seg">
            {[0, 30, 60, 90].map((t) => (
              <button key={t} className={o.waktu === t ? 'on' : ''} onClick={() => void act({ t: 'opsi', opts: { waktu: t } })}>
                {t ? `${t} dtk` : 'santai'}
              </button>
            ))}
          </div>
          <span className="sd-label">bot (mengerti konvensi petunjuk)</span>
          <div className="row" style={{ gap: 8 }}>
            <button className="btn sm soft grow" disabled={n >= H.MAX_PLAYERS || busy} onClick={() => void act({ t: 'bot', tambah: true })} data-testid="kb-bot">
              <Doodle id="ui-tambah" size={16} color="currentColor" /> tambah bot
            </button>
            <button className="btn sm soft grow" disabled={!view.players.some((p) => p.bot) || busy} onClick={() => void act({ t: 'bot', tambah: false })}>
              kurangi bot
            </button>
          </div>
          <button className="btn sd-cta" disabled={n < 2 || busy} onClick={() => void act({ t: 'mulai' })} data-testid="kb-mulai">
            <Doodle id="kembang-api" size={20} color="currentColor" /> mulai pertunjukan
          </button>
        </div>
      ) : (
        <p className="sd-wait">Menunggu tuan rumah memulai pertunjukan…</p>
      )}
    </section>
  );
}

// ── Permainan ───────────────────────────────────────────────────────────────

function Permainan({ view, act, busy, letup, onBuang }: { view: View; act: Act; busy: boolean; letup: H.Warna | null; onBuang: () => void }) {
  const me = view.me!.id;
  const aku = view.players.find((p) => p.id === me)!;
  const giliranku = view.phase === 'main' && view.giliran === me;
  const wm = H.warnaMain(view.opts);
  const [teman, setTeman] = useState<string | null>(null);
  const [petunjuk, setPetunjuk] = useState<{ warna?: H.Warna; angka?: number } | null>(null);
  const [kartuku, setKartuku] = useState<number | null>(null);
  const urutan = [...view.players.slice(view.players.indexOf(aku) + 1), ...view.players.slice(0, view.players.indexOf(aku))];
  const terakhir = view.log.at(-1);
  // Kartu yang baru disentuh petunjuk terakhir disorot beberapa detik.
  const [sorot, setSorot] = useState<number[]>([]);
  useEffect(() => {
    const e = view.log.at(-1);
    if (e?.t !== 'petunjuk') return;
    setSorot(e.sentuh ?? []);
    const t = setTimeout(() => setSorot([]), 4500);
    return () => clearTimeout(t);
  }, [view.log.at(-1)?.n]);
  const t = view.players.find((p) => p.id === teman);
  const kena = t && petunjuk ? t.hand.filter((c) => (petunjuk.warna ? H.sentuhWarna(view.opts, c.w!, petunjuk.warna) : c.n === petunjuk.angka)).map((c) => c.id) : [];
  const ck = aku.hand.find((c) => c.id === kartuku);
  const geser = (arah: -1 | 1) => {
    const ids = aku.hand.map((c) => c.id);
    const i = ids.indexOf(kartuku!);
    const j = i + arah;
    if (j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j]!, ids[i]!];
    void act({ t: 'atur', urutan: ids });
  };

  return (
    <section className="kb-meja">
      <Token v={view} />
      <Api v={view} letup={letup} />
      <div className="kb-teman">
        {urutan.map((p) => (
          <div key={p.id} className={`kb-baris ${view.giliran === p.id ? 'giliran' : ''}`} data-testid={`kb-baris-${p.name}`}>
            <span className="kb-nama">
              <PlayerFace avatar={p.avatar} size={24} />
              <b>{p.name}</b>
              {view.giliran === p.id ? <em>sedang berpikir…</em> : null}
            </span>
            <span className="kb-tangan">
              {p.hand.map((c) => (
                <KartuK key={c.id} c={c} warnaMain={wm} sorot={sorot.includes(c.id)} onClick={giliranku && view.token > 0 ? () => (setTeman(p.id), setPetunjuk(null)) : undefined} testid="kb-kartu-teman" />
              ))}
            </span>
          </div>
        ))}
      </div>
      <p className="st-kejadian">{terakhir ? kalimat(terakhir, view, me) : ''}</p>
      <button className="linkish tiny" onClick={onBuang}>
        lihat {view.buang.length} kartu terbuang
      </button>

      <div className={`st-aku kb-aku ${giliranku ? 'giliran' : ''}`}>
        <p className="ts-status" data-testid="kb-status">
          {giliranku ? (view.token > 0 ? 'Giliranmu. Ketuk kartu teman untuk memberi petunjuk, atau kartumu untuk dimainkan/dibuang.' : 'Token habis. Mainkan atau buang kartumu.') : `Giliran ${view.players.find((p) => p.id === view.giliran)?.name ?? '…'}.`}
        </p>
        <span className="kb-tangan aku">
          {aku.hand.map((c) => (
            <KartuK key={c.id} c={c} warnaMain={wm} sorot={sorot.includes(c.id)} pilih={kartuku === c.id} onClick={() => setKartuku(c.id)} testid="kb-kartuku" />
          ))}
        </span>
        <p className="tiny soft center">kiri = paling baru · berbingkai kuning = pernah disentuh petunjuk</p>
      </div>

      <Sheet open={!!t} onClose={() => setTeman(null)} title={t ? `petunjuk untuk ${t.name}` : ''}>
        {t ? (
          <div className="col" style={{ gap: 10 }}>
            <span className="kb-tangan">
              {t.hand.map((c) => (
                <KartuK key={c.id} c={c} warnaMain={wm} sorot={kena.includes(c.id)} />
              ))}
            </span>
            <span className="sd-label">sebut warna</span>
            <div className="kb-pilih">
              {H.warnaPetunjuk(view.opts).map((w) => {
                const ada = t.hand.some((c) => H.sentuhWarna(view.opts, c.w!, w));
                return (
                  <button key={w} className={`kb-pil ${petunjuk?.warna === w ? 'on' : ''}`} style={{ '--w': HEX[w] } as React.CSSProperties} disabled={!ada} onClick={() => setPetunjuk({ warna: w })} data-testid="kb-warna">
                    {H.NAMA_WARNA[w]}
                  </button>
                );
              })}
            </div>
            <span className="sd-label">sebut angka</span>
            <div className="kb-pilih">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} className={`kb-pil angka ${petunjuk?.angka === n ? 'on' : ''}`} disabled={!t.hand.some((c) => c.n === n)} onClick={() => setPetunjuk({ angka: n })} data-testid="kb-angka">
                  {n}
                </button>
              ))}
            </div>
            <button
              className="btn sd-cta"
              disabled={!petunjuk || busy}
              onClick={() => {
                void act({ t: 'petunjuk', ke: t.id, ...petunjuk! });
                setTeman(null);
              }}
              data-testid="kb-beri"
            >
              {petunjuk ? `beri petunjuk (${kena.length} kartu)` : 'pilih warna atau angka'}
            </button>
          </div>
        ) : null}
      </Sheet>

      <Sheet open={!!ck} onClose={() => setKartuku(null)} title="kartumu">
        {ck ? (
          <div className="col" style={{ gap: 10, alignItems: 'center' }}>
            <KartuK c={ck} warnaMain={wm} />
            <p className="small center">
              {ck.tahu.sentuh || ck.tahu.warna.length < wm.length || ck.tahu.angka.length < 5
                ? `Mungkin: ${ck.tahu.warna.map((w) => H.NAMA_WARNA[w]).join('/')} · ${ck.tahu.angka.join('/')}`
                : 'Belum ada petunjuk tentang kartu ini.'}
            </p>
            {giliranku ? (
              <div className="row" style={{ gap: 8, width: '100%' }}>
                <button className="btn grow" disabled={busy} onClick={() => (setKartuku(null), void act({ t: 'mainkan', kartu: ck.id }))} data-testid="kb-mainkan">
                  mainkan
                </button>
                <button className="btn soft grow" disabled={busy || view.token >= H.TOKEN} onClick={() => (setKartuku(null), void act({ t: 'buang', kartu: ck.id }))} data-testid="kb-buang">
                  buang (+1 token)
                </button>
              </div>
            ) : null}
            <div className="row" style={{ gap: 8 }}>
              <button className="btn sm soft" onClick={() => geser(-1)}>
                ← geser
              </button>
              <button className="btn sm soft" onClick={() => geser(1)}>
                geser →
              </button>
            </div>
          </div>
        ) : null}
      </Sheet>
    </section>
  );
}

function Buangan({ view }: { view: View }) {
  const wm = H.warnaMain(view.opts);
  return (
    <div className="kb-buangan">
      {wm.map((w) => {
        const cs = view.buang.filter((c) => c.w === w).sort((a, b) => a.n - b.n);
        return (
          <div key={w} className="kb-buangan-baris">
            <span className="tiny" style={{ color: HEX[w], width: 56 }}>
              {H.NAMA_WARNA[w]}
            </span>
            {cs.length ? cs.map((c) => <KartuK key={c.id} c={{ id: c.id, w: c.w, n: c.n, tahu: { warna: [], angka: [], sentuh: false, tanda: false } }} warnaMain={wm} kecil />) : <span className="tiny soft">belum ada</span>}
          </div>
        );
      })}
    </div>
  );
}

function Akhir({ view, act }: { view: View; act: Act }) {
  const maks = H.skorMaks(view.opts);
  const me = view.me!.id;
  return (
    <div className="ts-layar akhir rise" data-testid="kb-akhir">
      <div className="ts-layar-isi">
        <Doodle id="kembang-api" size={64} color={view.sebab === 'sumbu' ? '#e23b3b' : 'var(--ink)'} />
        <p className="sd-big-line">
          {view.sebab === 'sumbu' ? 'Sumbu habis terbakar. Pertunjukan gagal.' : `Skor ${view.skor} dari ${maks}.`}
        </p>
        <p className="sd-whisper">{view.sebab === 'sumbu' ? `Sempat menyala ${H.skorOf(view.api)} kartu.` : H.ulasan(view.skor ?? 0, maks)}</p>
        <Api v={view} />
        {me === view.host ? (
          <button className="btn sd-cta" onClick={() => void act({ t: 'lagi' })} data-testid="kb-lagi">
            pertunjukan lagi
          </button>
        ) : null}
        <button className="btn soft" onClick={() => navigate('/main')}>
          kembali ke Ruang Main
        </button>
      </div>
    </div>
  );
}
