/**
 * Meja KARTU SATU. Server memegang dek & aturan; HP ini menampilkan
 * tanganmu, lawan, tumpukan, dan tombol-tombol cepat: ambil, SATU!,
 * tangkap, tantang, salip.
 */
import { satu } from '@sehari/core';
import { type CSSProperties, useEffect, useMemo, useRef, useState } from 'react';
import { navigate, useParams } from '@/lib/router';
import { AKHIR, ATURAN, joinMeja, kalimat, leaveMeja, rekor, sendSatu, TUMPUK, useMeja, type View, WARNA_HEX } from '@/lib/satu';
import { useSession } from '@/lib/session';
import { profile, useCountdown, useWakeLock, vibrate } from '@/lib/sidik';
import { bunyi } from '@/lib/titip';
import { Doodle, Growing, Header, Sheet, Toggle, useToast } from '@/ui/kit';
import { PlayerFace, Timer } from '../../sidik/parts';
import { DudukForm, KodeMeja } from '../shared';
import { AturanSatu, BelakangSatu, KartuSatu, Kursi, PilihWarna } from './parts';

type Act = (a: satu.Action) => Promise<void>;
const URUT: Record<string, number> = { m: 0, k: 1, h: 2, b: 3 };
const urutTangan = (h: satu.Card[]) => [...h].sort((a, b) => (URUT[a.w ?? 'z'] ?? 9) - (URUT[b.w ?? 'z'] ?? 9) || satu.poin(a) - satu.poin(b) || a.t.localeCompare(b.t));

export default function SatuMeja() {
  const { code = '' } = useParams<{ code: string }>();
  const C = code.toUpperCase();
  const { view, err, apply, serverNow } = useMeja(C);
  const toast = useToast();
  const session = useSession();
  const [busy, setBusy] = useState(false);
  const [lembar, setLembar] = useState<null | 'aturan' | 'riwayat'>(null);
  useWakeLock(!!view?.me && view.phase !== 'akhir');

  const act: Act = async (a) => {
    setBusy(true);
    try {
      apply(await sendSatu(C, a));
    } catch (e) {
      toast((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  useSuara(view);

  if (err && !view)
    return (
      <main className="screen sd-screen">
        <Header title="Kartu Satu" backTo="/main" />
        <div className="sd-empty">
          <Doodle id="kartu" size={64} />
          <p>{err}</p>
          <button className="btn soft" onClick={() => navigate('/main')}>
            kembali ke Ruang Main
          </button>
        </div>
      </main>
    );
  if (!view) return <Growing label="mengocok kartu…" />;
  if (!view.me)
    return (
      <DudukForm
        judul="duduk di meja"
        ajakan={view.phase === 'lobby' ? 'Kamu diajak main Kartu Satu.' : 'Permainan di meja ini sudah berjalan.'}
        tombol="duduk"
        backTo="/main"
        doodle="kartu"
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
    <main className={`screen sd-screen st-screen ph-${view.phase}`} style={{ '--warna': WARNA_HEX[view.warna] } as CSSProperties}>
      <Atas view={view} serverNow={serverNow} onRiwayat={() => setLembar('riwayat')} onAturan={() => setLembar('aturan')} onLeave={async () => { if (view.phase === 'lobby') await leaveMeja(C).catch(() => {}); navigate('/main'); }} />
      {view.phase === 'lobby' ? <Lobi view={view} act={act} busy={busy} onAturan={() => setLembar('aturan')} /> : <Permainan view={view} act={act} busy={busy} />}
      {view.phase === 'jeda' ? <Jeda view={view} act={act} serverNow={serverNow} /> : null}
      {view.phase === 'akhir' ? <Akhir view={view} act={act} /> : null}
      <Sheet open={lembar === 'aturan'} onClose={() => setLembar(null)} title="aturan Kartu Satu">
        <AturanSatu opts={view.opts} />
      </Sheet>
      <Sheet open={lembar === 'riwayat'} onClose={() => setLembar(null)} title="riwayat meja">
        <div className="ts-riwayat">
          {[...view.log].reverse().map((e) => (
            <p key={e.n} className={e.t === 'ronde' ? 'ronde' : ''}>
              {e.kartu?.length ? <KartuSatu c={e.kartu[e.kartu.length - 1]!} kecil /> : null}
              <span>{kalimat(e, view, view.me!.id)}</span>
            </p>
          ))}
        </div>
      </Sheet>
    </main>
  );
}

function useSuara(view: View | null) {
  const lastN = useRef(-1);
  const lastTurn = useRef<string | null>(null);
  const lastPhase = useRef('');
  useEffect(() => {
    if (!view?.me) return;
    const me = view.me.id;
    const n = view.log.at(-1)?.n ?? 0;
    if (lastN.current >= 0 && n > lastN.current) {
      const baru = view.log.filter((e) => e.n > lastN.current);
      if (baru.some((e) => e.t === 'tangkap' && e.target === me)) (bunyi.keluar(), vibrate([120, 60, 120]));
      else if (baru.some((e) => e.t === 'tarik' && e.by === me && (e.jumlah ?? 0) >= 4)) (bunyi.keluar(), vibrate(200));
      else if (baru.some((e) => e.t === 'salip')) (bunyi.perangko(), vibrate(80));
      else if (baru.some((e) => e.t === 'main' || e.t === 'tarik')) bunyi.kartu();
    }
    lastN.current = n;
    const turn = view.giliran;
    if (turn === me && lastTurn.current !== me) (bunyi.giliran(), vibrate([30, 50, 30]));
    lastTurn.current = turn;
    const k = `${view.phase}:${view.ronde}`;
    if (lastPhase.current && lastPhase.current !== k && view.phase === 'akhir') {
      if (view.pemenang === me) bunyi.menang();
      else bunyi.keluar();
      rekor.catat(view.code, view.rev, view.pemenang === me, view.kalah === me);
    }
    lastPhase.current = k;
  }, [view?.rev]);
}

function Atas({ view, serverNow, onLeave, onRiwayat, onAturan }: { view: View; serverNow: () => number; onLeave: () => void; onRiwayat: () => void; onAturan: () => void }) {
  const secs = useCountdown(view.phase === 'main' ? view.deadline : null, serverNow);
  const preset = { ori: 'aturan ori', tongkrongan: 'aturan tongkrongan', racikan: 'aturan racikan' }[view.preset];
  return (
    <header className="sd-top">
      <button className="hdr-back" aria-label="keluar" onClick={onLeave}>
        <Doodle id="ui-kembali" size={20} />
      </button>
      <div className="sd-top-mid">
        <b>
          <Doodle id="kartu" size={20} color="currentColor" /> Kartu Satu
        </b>
        <span>{view.phase === 'lobby' ? `meja ${view.code}` : `ronde ${view.ronde} · ${preset}`}</span>
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

// ── Lobi ────────────────────────────────────────────────────────────────────

function Lobi({ view, act, busy, onAturan }: { view: View; act: Act; busy: boolean; onAturan: () => void }) {
  const host = view.me!.id === view.host;
  const o = view.opts;
  const n = view.players.length;
  const set = (opts: Partial<satu.Opts>) => void act({ t: 'opsi', opts });
  return (
    <section className="sd-lobby">
      <KodeMeja code={view.code} path={`/main/satu/${view.code}`} ajak="Main Kartu Satu yuk!" />
      <span className="sd-label">di meja · {n}/{satu.MAX_PLAYERS}</span>
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

      <span className="sd-label">aturan main</span>
      <div className="st-preset">
        {(
          [
            ['ori', 'Aturan Ori', 'Resmi: tanpa tumpuk, tantangan +4, skor 500.', 'bintang'],
            ['tongkrongan', 'Aturan Tongkrongan', 'Tumpuk & balas plus, pantul, salip, buang kembar, cari yang kalah.', 'kopi-susu'],
          ] as const
        ).map(([id, nama, ket, d]) => (
          <button key={id} className={view.preset === id ? 'on' : ''} disabled={!host || busy} onClick={() => void act({ t: 'preset', nama: id })} data-testid={`st-preset-${id}`}>
            <Doodle id={d} size={28} color="currentColor" />
            <b>{nama}</b>
            <span className="tiny">{ket}</span>
          </button>
        ))}
      </div>
      {view.preset === 'racikan' ? <p className="tiny soft center">Aturan racikan sendiri.</p> : null}

      {host ? (
        <div className="sd-settings">
          <span className="sd-label">tumpuk +2 / +4</span>
          <div className="seg">
            {(['tidak', 'sejenis', 'campur'] as const).map((t) => (
              <button key={t} className={o.tumpuk === t ? 'on' : ''} onClick={() => set({ tumpuk: t })}>
                {t}
              </button>
            ))}
          </div>
          <p className="tiny soft">{TUMPUK[o.tumpuk]}</p>
          {ATURAN.map((a) => (
            <Toggle key={a.k} label={a.nama} hint={a.ket} value={!!o[a.k]} onChange={(v) => set({ [a.k]: v })} />
          ))}
          <span className="sd-label">akhir permainan</span>
          <div className="seg">
            {(['skor', 'sekali', 'pecundang'] as const).map((t) => (
              <button key={t} className={o.akhir === t ? 'on' : ''} onClick={() => set({ akhir: t })}>
                {t === 'pecundang' ? 'cari yg kalah' : t === 'skor' ? 'poin' : 'sekali'}
              </button>
            ))}
          </div>
          <p className="tiny soft">{AKHIR[o.akhir]}</p>
          {o.akhir === 'skor' ? (
            <>
              <span className="sd-label">target poin</span>
              <div className="seg">
                {[100, 200, 300, 500].map((t) => (
                  <button key={t} className={o.target === t ? 'on' : ''} onClick={() => set({ target: t })}>
                    {t}
                  </button>
                ))}
              </div>
            </>
          ) : null}
          <span className="sd-label">batas waktu giliran</span>
          <div className="seg">
            {[0, 15, 30, 60].map((t) => (
              <button key={t} className={o.waktu === t ? 'on' : ''} onClick={() => set({ waktu: t })}>
                {t ? `${t} dtk` : 'santai'}
              </button>
            ))}
          </div>
          <span className="sd-label">bot</span>
          <div className="row" style={{ gap: 8 }}>
            <button className="btn sm soft grow" disabled={n >= satu.MAX_PLAYERS || busy} onClick={() => void act({ t: 'bot', tambah: true })} data-testid="st-bot">
              <Doodle id="ui-tambah" size={16} color="currentColor" /> tambah bot
            </button>
            <button className="btn sm soft grow" disabled={!view.players.some((p) => p.bot) || busy} onClick={() => void act({ t: 'bot', tambah: false })}>
              kurangi bot
            </button>
          </div>
          <button className="btn sd-cta" disabled={n < 2 || busy} onClick={() => void act({ t: 'mulai' })} data-testid="st-mulai">
            <Doodle id="kartu" size={20} color="currentColor" /> kocok & bagikan
          </button>
        </div>
      ) : (
        <>
          <p className="small soft center">
            Tuan rumah sedang mengatur aturan.{' '}
            <button className="linkish" onClick={onAturan}>
              lihat aturan meja
            </button>
          </p>
          <p className="sd-wait">Menunggu kocokan…</p>
        </>
      )}
    </section>
  );
}

// ── Permainan ───────────────────────────────────────────────────────────────

function Permainan({ view, act, busy }: { view: View; act: Act; busy: boolean }) {
  const me = view.me!;
  const aku = view.players.find((p) => p.id === me.id)!;
  const giliranku = view.phase === 'main' && view.giliran === me.id;
  const tangan = useMemo(() => urutTangan(me.hand), [me.hand.map((c) => c.id).join()]);
  const [pilih, setPilih] = useState<number[]>([]);
  const [tanya, setTanya] = useState<null | { ids: number[]; warna?: satu.Warna; perluWarna: boolean; perluTarget: boolean }>(null);
  useEffect(() => setPilih([]), [view.giliran, view.atas?.id]);
  const lawan = view.players.filter((p) => p.id !== me.id);
  const atas = view.atas;

  const kirim = (ids: number[], warna?: satu.Warna, target?: string) => {
    setPilih([]);
    setTanya(null);
    void act({ t: 'main', kartu: ids, warna, target });
  };
  const mainkan = (ids: number[]) => {
    const cards = ids.map((id) => me.hand.find((c) => c.id === id)!);
    const last = cards[cards.length - 1]!;
    const perluWarna = last.w === null;
    const perluTarget = view.opts.tujuhNol && last.t === '7' && me.hand.length > ids.length;
    if (perluWarna || perluTarget) setTanya({ ids, perluWarna, perluTarget });
    else kirim(ids);
  };
  const tap = (c: satu.Card) => {
    if (me.salip.includes(c.id)) return void act({ t: 'salip', kartu: c.id });
    if (!giliranku || !me.bisa.includes(c.id)) return;
    if (pilih.length) {
      const first = me.hand.find((x) => x.id === pilih[0])!;
      if (c.t === first.t && c.w !== null) return setPilih(pilih.includes(c.id) ? pilih.filter((x) => x !== c.id) : [...pilih, c.id]);
    }
    const kembar = view.opts.kembar && c.w !== null && view.ditarik === null && me.hand.some((x) => x.id !== c.id && x.t === c.t && x.w !== null);
    if (kembar) return setPilih([c.id]);
    mainkan([c.id]);
  };
  // Pilihan tambahan saat kembar: kartu bernilai sama (warna apa pun) ikut bisa dipilih.
  const bisaPilih = (c: satu.Card) => me.bisa.includes(c.id) || (pilih.length > 0 && c.w !== null && c.t === me.hand.find((x) => x.id === pilih[0])?.t);
  const ambilLabel = view.tarik > 0 ? `ambil ${view.tarik}` : 'ambil kartu';
  const status = !giliranku
    ? aku.selesai
      ? `Kartumu habis! Urutan ke-${aku.selesai}.`
      : `Giliran ${view.players.find((p) => p.id === view.giliran)?.name ?? '…'}.`
    : view.awalWarna
      ? 'Kartu pembuka Ganti Warna: kamu memilih warnanya.'
      : view.tarik > 0
        ? me.bisa.length
          ? `Ada +${view.tarik} untukmu. Balas, atau ambil semuanya.`
          : `Ada +${view.tarik} untukmu. Tidak bisa membalas.`
        : view.ditarik !== null
          ? 'Kartu yang baru diambil cocok. Mainkan atau lewati.'
          : me.bisa.length
            ? 'Giliranmu.'
            : 'Tidak ada yang cocok. Ambil kartu.';

  return (
    <section className="st-meja">
      <div className="st-lawan">
        {lawan.map((p) => (
          <Kursi key={p.id} p={p} v={view} me={me.id} onTangkap={() => void act({ t: 'tangkap', target: p.id })} />
        ))}
      </div>

      <div className="st-tengah">
        <span className={`st-arah ${view.arah === 1 ? '' : 'balik'}`} aria-label={view.arah === 1 ? 'searah jarum jam' : 'berlawanan arah'}>
          <Doodle id="panah-spiral" size={30} color="currentColor" />
        </span>
        <BelakangSatu n={view.draw} onClick={giliranku && !view.awalWarna && view.ditarik === null ? () => void act({ t: 'tarik' }) : undefined} aktif={giliranku && !me.bisa.length && view.ditarik === null} />
        <div className="st-buangan">
          {view.log
            .filter((e) => (e.t === 'main' || e.t === 'salip') && e.kartu?.length && e.r === view.ronde)
            .slice(-3, -1)
            .map((e, i) => (
              <span key={e.n} className="st-bekas" style={{ rotate: `${(i - 1) * 9 + (e.n % 7)}deg` }}>
                <KartuSatu c={e.kartu![e.kartu!.length - 1]!} />
              </span>
            ))}
          {atas ? <KartuSatu c={atas} putar={(view.log.at(-1)?.n ?? 0) % 9 - 4} /> : null}
          {atas?.w === null || view.awalWarna ? <span className="st-warna-kini">{satu.NAMA_WARNA[view.warna]}</span> : null}
        </div>
        {view.tarik > 0 ? <span className="st-tumpuk-badge" data-testid="st-tarik">+{view.tarik}</span> : null}
        <p className="st-kejadian">{view.log.length ? kalimat(view.log.at(-1)!, view, me.id) : ''}</p>
      </div>

      <div className={`st-aku ${giliranku ? 'giliran' : ''}`}>
        <p className="ts-status" data-testid="st-status">
          {status}
        </p>
        {giliranku && view.awalWarna ? <PilihWarna onPilih={(w) => void act({ t: 'warna', warna: w })} judul="warna pembuka" /> : null}
        <div className="st-tangan" style={{ '--n': tangan.length } as CSSProperties}>
          {tangan.map((c) => (
            <KartuSatu key={c.id} c={c} pilih={pilih.includes(c.id)} salip={me.salip.includes(c.id)} mati={!(me.salip.includes(c.id) || (giliranku && bisaPilih(c)))} onClick={() => tap(c)} testid="st-kartu" />
          ))}
        </div>
        <div className="st-tombol">
          {giliranku && !view.awalWarna && view.ditarik === null ? (
            <button className={`btn ${me.bisa.length ? 'soft' : ''}`} disabled={busy} onClick={() => void act({ t: 'tarik' })} data-testid="st-tarik-btn">
              {ambilLabel}
            </button>
          ) : null}
          {giliranku && view.ditarik !== null ? (
            <button className="btn soft" disabled={busy} onClick={() => void act({ t: 'lewat' })} data-testid="st-lewat">
              lewati
            </button>
          ) : null}
          {giliranku && view.tantang ? (
            <button className="btn soft danger-glow" disabled={busy} onClick={() => void act({ t: 'tantang' })} data-testid="st-tantang">
              tantang +4
            </button>
          ) : null}
          {pilih.length ? (
            <button className="btn" disabled={busy} onClick={() => mainkan(pilih)} data-testid="st-mainkan">
              mainkan {pilih.length} kartu
            </button>
          ) : null}
          {!aku.selesai && me.hand.length <= 2 && !aku.satu ? (
            <button className="btn st-satu-btn" onClick={() => (vibrate(60), void act({ t: 'satu' }))} data-testid="st-satu">
              SATU!
            </button>
          ) : null}
        </div>
      </div>

      <Sheet open={!!tanya} onClose={() => setTanya(null)} title={tanya?.perluWarna ? 'pilih warna' : 'tukar tangan dengan'}>
        {tanya ? (
          <div className="col" style={{ gap: 12 }}>
            {tanya.perluWarna && !tanya.warna ? (
              <PilihWarna onPilih={(w) => (tanya.perluTarget ? setTanya({ ...tanya, warna: w }) : kirim(tanya.ids, w))} />
            ) : null}
            {tanya.perluTarget && (!tanya.perluWarna || tanya.warna) ? (
              <div className="ts-pilih">
                {view.players
                  .filter((p) => p.id !== me.id && !p.selesai)
                  .map((p) => (
                    <button key={p.id} className="pill" onClick={() => kirim(tanya.ids, tanya.warna, p.id)} data-testid="st-target">
                      {p.name} · {p.kartu} kartu
                    </button>
                  ))}
              </div>
            ) : null}
          </div>
        ) : null}
      </Sheet>
    </section>
  );
}

// ── Jeda & akhir ────────────────────────────────────────────────────────────

function Klasemen({ view }: { view: View }) {
  const pecundang = view.opts.akhir === 'pecundang';
  const urut = pecundang ? view.urutan.map((id) => view.players.find((p) => p.id === id)!).filter(Boolean) : [...view.players].sort((a, b) => b.skor - a.skor);
  return (
    <div className="ts-klasemen">
      {urut.map((p, i) => (
        <span key={p.id} className={p.id === view.pemenang || p.id === view.hasil?.pemenang ? 'baru' : p.id === view.kalah ? 'kalah' : ''}>
          <b style={{ width: 22 }}>{i + 1}</b>
          <PlayerFace avatar={p.avatar} size={26} />
          <b className="grow">{p.id === view.me?.id ? 'kamu' : p.name}</b>
          {pecundang ? <span className="tiny">{p.id === view.kalah ? 'kalah' : ''}</span> : <span className="tiny">{p.skor} poin</span>}
        </span>
      ))}
    </div>
  );
}

function Jeda({ view, act, serverNow }: { view: View; act: Act; serverNow: () => number }) {
  const secs = useCountdown(view.deadline, serverNow);
  const h = view.hasil!;
  const aku = view.players.find((p) => p.id === view.me!.id)!;
  const w = view.players.find((p) => p.id === h.pemenang)!;
  return (
    <div className="ts-layar rise" data-testid="st-jeda">
      <div className="ts-layar-isi">
        <span className="sd-label center">ronde {view.ronde} selesai</span>
        <PlayerFace avatar={w.avatar} size={64} />
        <p className="sd-big-line">
          {w.id === aku.id ? 'Kamu' : w.name} habis duluan: +{h.poin} poin.
        </p>
        <p className="tiny soft center">Target {view.opts.target} poin. Kartu angka sesuai nilai, aksi 20, hitam 50.</p>
        <Klasemen view={view} />
        <button className="btn sd-cta" disabled={aku.siap} onClick={() => void act({ t: 'siap' })} data-testid="st-siap">
          {aku.siap ? 'menunggu yang lain…' : 'ronde berikutnya'}
        </button>
        <p className="tiny soft center">otomatis lanjut dalam {secs ?? 0} detik</p>
      </div>
    </div>
  );
}

function Akhir({ view, act }: { view: View; act: Act }) {
  const w = view.players.find((p) => p.id === view.pemenang);
  const k = view.players.find((p) => p.id === view.kalah);
  const me = view.me!.id;
  return (
    <div className="ts-layar akhir rise" data-testid="st-akhir">
      <div className="ts-layar-isi">
        {k ? (
          <>
            <PlayerFace avatar={k.avatar} size={84} />
            <p className="sd-big-line">{k.id === me ? 'Kamu yang kalah. Traktir gorengan!' : `${k.name} yang kalah. Traktir gorengan!`}</p>
            {w ? <p className="sd-whisper">{w.id === me ? 'Kamu' : w.name} habis paling duluan.</p> : null}
          </>
        ) : w ? (
          <>
            <PlayerFace avatar={w.avatar} size={84} />
            <p className="sd-big-line">{w.id === me ? 'Kamu menang!' : `${w.name} menang!`}</p>
          </>
        ) : null}
        <Klasemen view={view} />
        {me === view.host ? (
          <button className="btn sd-cta" onClick={() => void act({ t: 'lagi' })} data-testid="st-lagi">
            main lagi di meja ini
          </button>
        ) : (
          <p className="sd-wait">Tuan rumah bisa memulai permainan baru.</p>
        )}
        <button className="btn soft" onClick={() => navigate('/main')}>
          kembali ke Ruang Main
        </button>
      </div>
    </div>
  );
}
