/**
 * Meja SAUDAGAR. Server memegang bank, dadu, dan aturan; HP ini menampilkan
 * papan, uang semua orang, dan tombol sesuai fase: lempar, beli/lelang,
 * akhiri giliran, plus lembar Asetku (bangun, jual, gadai, tebus) dan Tukar.
 */
import { saudagar as S } from '@sehari/core';
import { type CSSProperties, useEffect, useMemo, useRef, useState } from 'react';
import { navigate, useParams } from '@/lib/router';
import { joinMeja, kalimat, leaveMeja, rekor, rp, sendSaudagar, useMeja, type View, WARNA_PEMAIN } from '@/lib/saudagar';
import { useSession } from '@/lib/session';
import { profile, useCountdown, useWakeLock, vibrate } from '@/lib/sidik';
import { bunyi } from '@/lib/titip';
import { Doodle, Growing, Header, Sheet, Toggle, useToast } from '@/ui/kit';
import { PlayerFace, Timer } from '../../sidik/parts';
import { Dadu } from '../tangga/parts';
import { DudukForm, KodeMeja } from '../shared';
import { Akta, AturanSaudagar, Papan } from './parts';

type Act = (a: S.Action) => Promise<void>;

export default function SaudagarMeja() {
  const { code = '' } = useParams<{ code: string }>();
  const C = code.toUpperCase();
  const { view, err, apply, serverNow } = useMeja(C);
  const toast = useToast();
  const session = useSession();
  const [busy, setBusy] = useState(false);
  const [lembar, setLembar] = useState<null | 'aturan' | 'riwayat' | 'aset' | 'tukar'>(null);
  const [petak, setPetak] = useState<number | null>(null);
  useWakeLock(!!view?.me && view.phase !== 'akhir');
  const act: Act = async (a) => {
    setBusy(true);
    try {
      apply(await sendSaudagar(C, a));
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
        <Header title="Saudagar" backTo="/main" />
        <div className="sd-empty">
          <Doodle id="rumah" size={64} />
          <p>{err}</p>
          <button className="btn soft" onClick={() => navigate('/main')}>
            kembali ke Ruang Main
          </button>
        </div>
      </main>
    );
  if (!view) return <Growing label="membuka bank…" />;
  if (!view.me)
    return (
      <DudukForm
        judul="duduk di meja"
        ajakan={view.phase === 'lobby' ? 'Kamu diajak main Saudagar.' : 'Permainan di meja ini sudah berjalan.'}
        tombol="duduk"
        backTo="/main"
        doodle="rumah"
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
  const masuk = view.tawaran.filter((t) => t.ke === view.me!.id).length;

  return (
    <main className={`screen sd-screen sg-screen ph-${view.phase}`}>
      <Atas view={view} serverNow={serverNow} onRiwayat={() => setLembar('riwayat')} onAturan={() => setLembar('aturan')} onLeave={async () => { if (view.phase === 'lobby') await leaveMeja(C).catch(() => {}); navigate('/main'); }} />
      {view.phase === 'lobby' ? (
        <Lobi view={view} act={act} busy={busy} />
      ) : (
        <Permainan view={view} act={act} busy={busy} serverNow={serverNow} onPetak={setPetak} onAset={() => setLembar('aset')} onTukar={() => setLembar('tukar')} masuk={masuk} />
      )}
      {view.phase === 'main' && view.lelang ? <Lelang view={view} act={act} busy={busy} serverNow={serverNow} /> : null}
      {view.phase === 'main' && view.utang?.dari === view.me.id ? <Tagihan view={view} act={act} busy={busy} onAset={() => setLembar('aset')} /> : null}
      <KartuMuncul view={view} />
      {view.phase === 'akhir' ? <Akhir view={view} act={act} /> : null}
      <Sheet open={petak !== null} onClose={() => setPetak(null)} title={petak !== null ? S.PETAK[petak]!.nama : ''}>
        {petak !== null ? <Akta i={petak} v={view} /> : null}
      </Sheet>
      <Sheet open={lembar === 'aset'} onClose={() => setLembar(null)} title="asetku">
        <Aset view={view} act={act} busy={busy} />
      </Sheet>
      <Sheet open={lembar === 'tukar'} onClose={() => setLembar(null)} title="tukar-menukar">
        <Tukar view={view} act={act} busy={busy} />
      </Sheet>
      <Sheet open={lembar === 'aturan'} onClose={() => setLembar(null)} title="aturan Saudagar">
        <AturanSaudagar opts={view.opts} />
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
      if (baru.some((e) => e.t === 'sewa' && e.ke === me)) (bunyi.perangko(), vibrate(40));
      else if (baru.some((e) => (e.t === 'sewa' || e.t === 'bayar') && e.by === me)) bunyi.keluar();
      else if (baru.some((e) => e.t === 'penjara' && e.by === me)) (bunyi.keluar(), vibrate([200, 80, 200]));
      else if (baru.some((e) => e.t === 'lempar' || e.t === 'beli' || e.t === 'bangun')) bunyi.kartu();
      if (baru.some((e) => e.t === 'lelang')) vibrate([40, 40, 40]);
    }
    lastN.current = n;
    if (view.giliran === me && lastTurn.current !== me) (bunyi.giliran(), vibrate([30, 50, 30]));
    lastTurn.current = view.giliran;
    if (lastPhase.current && lastPhase.current !== view.phase && view.phase === 'akhir') {
      if (view.pemenang === me) bunyi.menang();
      rekor.catat(view.code, view.rev, view.pemenang === me);
    }
    lastPhase.current = view.phase;
  }, [view?.rev]);
}

function Atas({ view, serverNow, onLeave, onRiwayat, onAturan }: { view: View; serverNow: () => number; onLeave: () => void; onRiwayat: () => void; onAturan: () => void }) {
  const secs = useCountdown(view.phase === 'main' && !view.lelang ? view.deadline : null, serverNow);
  const [, tick] = useState(0);
  useEffect(() => {
    if (!view.opts.batas || view.phase !== 'main') return;
    const t = setInterval(() => tick((x) => x + 1), 10_000);
    return () => clearInterval(t);
  }, [view.opts.batas, view.phase]);
  const sisaMenit = view.opts.batas && view.phase === 'main' ? Math.max(0, Math.ceil((view.mulaiAt + view.opts.batas * 60_000 - serverNow()) / 60_000)) : null;
  return (
    <header className="sd-top">
      <button className="hdr-back" aria-label="keluar" onClick={onLeave}>
        <Doodle id="ui-kembali" size={20} />
      </button>
      <div className="sd-top-mid">
        <b>
          <Doodle id="rumah" size={20} color="currentColor" /> Saudagar
        </b>
        <span>{view.phase === 'lobby' ? `meja ${view.code}` : `aturan ${view.preset}${sisaMenit !== null ? ` · sisa ${sisaMenit} mnt` : ''}`}</span>
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
  const set = (opts: Partial<S.Opts>) => void act({ t: 'opsi', opts });
  return (
    <section className="sd-lobby">
      <KodeMeja code={view.code} path={`/main/saudagar/${view.code}`} ajak="Main Saudagar yuk! Siapa yang jadi juragan properti?" />
      <span className="sd-label">di meja · {n}/{S.MAX_PLAYERS}</span>
      <div className="sd-players">
        {view.players.map((p, i) => (
          <span key={p.id} className="sd-player rise">
            <span className="sg-wajah" style={{ '--c': WARNA_PEMAIN[i % WARNA_PEMAIN.length] } as CSSProperties}>
              <PlayerFace avatar={p.avatar} size={40} />
            </span>
            <span className="tiny">
              {p.name}
              {p.id === view.host ? ' ★' : ''}
              {p.bot ? ' · bot' : ''}
            </span>
          </span>
        ))}
      </div>
      <span className="sd-label">aturan</span>
      <div className="st-preset">
        {(
          [
            ['resmi', 'Aturan Resmi', 'Persis Monopoli resmi: lelang, tanpa jackpot, sampai tersisa satu.', 'stempel'],
            ['rumahan', 'Aturan Rumahan', 'Jackpot Parkir Bebas, Start dobel, selesai dalam 60 menit.', 'rumah'],
          ] as const
        ).map(([id, nama, ket, d]) => (
          <button key={id} className={view.preset === id ? 'on' : ''} disabled={!host || busy} onClick={() => void act({ t: 'preset', nama: id })} data-testid={`sg-preset-${id}`}>
            <Doodle id={d} size={28} color="currentColor" />
            <b>{nama}</b>
            <span className="tiny">{ket}</span>
          </button>
        ))}
      </div>
      {host ? (
        <div className="sd-settings">
          <Toggle label="Lelang" hint="Properti yang ditolak dilelang ke semua pemain (resmi)." value={o.lelang} onChange={(v) => set({ lelang: v })} />
          <Toggle label="Jackpot Parkir Bebas" hint="Pajak & denda terkumpul; yang berhenti di Parkir Bebas mengambilnya." value={o.parkir} onChange={(v) => set({ parkir: v })} />
          <Toggle label="Start dobel" hint="Berhenti tepat di Mulai: terima dua kali lipat." value={o.startDobel} onChange={(v) => set({ startDobel: v })} />
          <span className="sd-label">modal awal</span>
          <div className="seg">
            {[1000, 1500, 2000].map((t) => (
              <button key={t} className={o.modal === t ? 'on' : ''} onClick={() => set({ modal: t })}>
                {rp(t)}
              </button>
            ))}
          </div>
          <span className="sd-label">batas waktu permainan</span>
          <div className="seg">
            {[0, 30, 45, 60, 90].map((t) => (
              <button key={t} className={o.batas === t ? 'on' : ''} onClick={() => set({ batas: t })}>
                {t ? `${t} mnt` : 'tanpa'}
              </button>
            ))}
          </div>
          <span className="sd-label">batas waktu giliran</span>
          <div className="seg">
            {[0, 30, 60, 90].map((t) => (
              <button key={t} className={o.waktu === t ? 'on' : ''} onClick={() => set({ waktu: t })}>
                {t ? `${t} dtk` : 'santai'}
              </button>
            ))}
          </div>
          <span className="sd-label">bot</span>
          <div className="row" style={{ gap: 8 }}>
            <button className="btn sm soft grow" disabled={n >= S.MAX_PLAYERS || busy} onClick={() => void act({ t: 'bot', tambah: true })} data-testid="sg-bot">
              <Doodle id="ui-tambah" size={16} color="currentColor" /> tambah bot
            </button>
            <button className="btn sm soft grow" disabled={!view.players.some((p) => p.bot) || busy} onClick={() => void act({ t: 'bot', tambah: false })}>
              kurangi bot
            </button>
          </div>
          <button className="btn sd-cta" disabled={n < 2 || busy} onClick={() => void act({ t: 'mulai' })} data-testid="sg-mulai">
            <Doodle id="rumah" size={20} color="currentColor" /> buka bank & mulai
          </button>
        </div>
      ) : (
        <p className="sd-wait">Menunggu tuan rumah membuka bank…</p>
      )}
    </section>
  );
}

// ── Permainan ───────────────────────────────────────────────────────────────

function Permainan({ view, act, busy, onPetak, onAset, onTukar, masuk }: { view: View; act: Act; busy: boolean; serverNow: () => number; onPetak: (i: number) => void; onAset: () => void; onTukar: () => void; masuk: number }) {
  const me = view.me!;
  const aku = view.players.find((p) => p.id === me.id)!;
  const giliranku = view.phase === 'main' && view.giliran === me.id;
  const lemparN = view.log.filter((e) => e.t === 'lempar').at(-1)?.n ?? 0;
  const terakhir = view.log.at(-1);
  const beli = view.beli !== null ? (S.PETAK[view.beli] as S.Milikan) : null;
  return (
    <section className="sg-meja">
      <div className="sg-pemain">
        {view.players.map((p, i) => (
          <span key={p.id} className={`sg-chip ${view.giliran === p.id ? 'giliran' : ''} ${p.bangkrut ? 'bangkrut' : ''}`} style={{ '--c': WARNA_PEMAIN[i % WARNA_PEMAIN.length] } as CSSProperties} data-testid={`sg-chip-${p.name}`}>
            <PlayerFace avatar={p.avatar} size={24} dim={p.bangkrut} />
            <span className="sg-chip-isi">
              <b>{p.id === me.id ? 'kamu' : p.name}</b>
              <span>{p.bangkrut ? 'bangkrut' : rp(p.uang)}</span>
            </span>
            {p.penjara >= 0 ? <Doodle id="ui-gembok" size={13} color="currentColor" /> : null}
          </span>
        ))}
      </div>

      <Papan v={view} onPetak={onPetak} sorot={view.beli ?? view.lelang?.kotak ?? null}>
        <span className="sg-logo">saudagar.</span>
        {view.dadu ? (
          <span className="tg-dadu-baris kecil">
            {view.dadu.map((d, i) => (
              <Dadu key={`${lemparN}-${i}`} n={d} kocok kecil />
            ))}
          </span>
        ) : null}
        {terakhir ? <span className="sg-kejadian">{kalimat(terakhir, view, me.id)}</span> : null}
        {view.opts.parkir && view.pot ? <span className="sg-pot">jackpot {rp(view.pot)}</span> : null}
        <span className="tiny soft">
          bank: {view.rumahBank} rumah · {view.hotelBank} hotel
        </span>
      </Papan>

      <div className={`st-aku sg-aku ${giliranku ? 'giliran' : ''}`}>
        {aku.bangkrut ? (
          <p className="sd-whisper">Kamu bangkrut. Tonton sampai ada saudagar terkaya.</p>
        ) : giliranku && view.fase === 'beli' && beli ? (
          <div className="sg-aksi">
            <p className="ts-status">Berhenti di {beli.nama}. Beli?</p>
            <div className="row" style={{ gap: 8 }}>
              <button className="btn grow" disabled={busy || aku.uang < beli.harga} onClick={() => void act({ t: 'beli' })} data-testid="sg-beli">
                beli {rp(beli.harga)}
              </button>
              <button className="btn soft grow" disabled={busy} onClick={() => void act({ t: 'tolak' })} data-testid="sg-tolak">
                {view.opts.lelang ? 'lelang' : 'tidak'}
              </button>
            </div>
            {aku.uang < beli.harga ? <p className="tiny soft center">Uangmu kurang. Gadai sesuatu di Asetku dulu, atau lelang.</p> : null}
            <button className="linkish tiny" onClick={() => onPetak(view.beli!)}>
              lihat akta
            </button>
          </div>
        ) : giliranku && view.fase === 'lempar' ? (
          <div className="sg-aksi">
            <p className="ts-status" data-testid="sg-status">
              {aku.penjara >= 0 ? `Kamu di penjara (percobaan ${aku.penjara + 1} dari 3).` : view.dadu ? 'Kembar! Lempar lagi.' : 'Giliranmu.'}
            </p>
            {aku.penjara >= 0 ? (
              <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
                <button className="btn soft grow" disabled={busy || aku.uang < S.DENDA_PENJARA} onClick={() => void act({ t: 'tebusPenjara' })}>
                  bayar {rp(S.DENDA_PENJARA)}
                </button>
                {aku.bebas ? (
                  <button className="btn soft grow" disabled={busy} onClick={() => void act({ t: 'kartuBebas' })}>
                    pakai kartu bebas
                  </button>
                ) : null}
              </div>
            ) : null}
            <button className="btn sd-cta" disabled={busy} onClick={() => void act({ t: 'lempar' })} data-testid="sg-lempar">
              <Doodle id="ui-dadu" size={22} color="currentColor" /> {aku.penjara >= 0 ? 'coba dadu kembar' : 'lempar dadu'}
            </button>
          </div>
        ) : giliranku && view.fase === 'selesai' ? (
          <div className="sg-aksi">
            <p className="ts-status">Bangun, gadai, atau tawar-menawar dulu, lalu akhiri giliran.</p>
            <button className="btn sd-cta" disabled={busy} onClick={() => void act({ t: 'akhiri' })} data-testid="sg-akhiri">
              akhiri giliran
            </button>
          </div>
        ) : (
          <p className="ts-status">{view.fase === 'utang' ? `${view.players.find((p) => p.id === view.utang?.dari)?.name ?? '…'} sedang mencari uang…` : `Giliran ${view.players.find((p) => p.id === view.giliran)?.name ?? '…'}.`}</p>
        )}
        {!aku.bangkrut ? (
          <div className="sg-alat">
            <button className="btn sm soft grow" onClick={onAset} data-testid="sg-aset">
              <Doodle id="rumah" size={16} color="currentColor" /> asetku
            </button>
            <button className="btn sm soft grow" onClick={onTukar} data-testid="sg-tukar">
              <Doodle id="tangan-bergandeng" size={16} color="currentColor" /> tukar{masuk ? <span className="sg-badge">{masuk}</span> : null}
            </button>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function Lelang({ view, act, busy, serverNow }: { view: View; act: Act; busy: boolean; serverNow: () => number }) {
  const l = view.lelang!;
  const me = view.me!.id;
  const aku = view.players.find((p) => p.id === me)!;
  const secs = useCountdown(l.deadline, serverNow);
  const keluar = l.keluar.includes(me) || aku.bangkrut;
  const oleh = view.players.find((p) => p.id === l.oleh);
  const pt = S.PETAK[l.kotak] as S.Milikan;
  return (
    <div className="ts-layar sg-lelang" data-testid="sg-lelang">
      <div className="ts-layar-isi">
        <span className="sd-label center">lelang · {secs ?? 0} detik</span>
        <Akta i={l.kotak} v={view} />
        <p className="sd-big-line">{oleh ? `${rp(l.tawar)} oleh ${oleh.id === me ? 'kamu' : oleh.name}` : `Belum ada tawaran (harga ${rp(pt.harga)})`}</p>
        {!keluar ? (
          <>
            <div className="row" style={{ gap: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
              {[10, 50, 100].map((n) => (
                <button key={n} className="btn sm" disabled={busy || l.oleh === me || l.tawar + n > aku.uang} onClick={() => void act({ t: 'tawar', n: l.tawar + n })} data-testid="sg-tawar">
                  +{rp(n)}
                </button>
              ))}
            </div>
            <button className="btn soft" disabled={busy || l.oleh === me} onClick={() => void act({ t: 'lewatLelang' })} data-testid="sg-mundur">
              mundur
            </button>
            <p className="tiny soft center">Uangmu {rp(aku.uang)}. Setiap tawaran baru menambah waktu.</p>
          </>
        ) : (
          <p className="sd-whisper">Kamu sudah mundur dari lelang ini.</p>
        )}
      </div>
    </div>
  );
}

function Tagihan({ view, act, busy, onAset }: { view: View; act: Act; busy: boolean; onAset: () => void }) {
  const u = view.utang!;
  const aku = view.players.find((p) => p.id === view.me!.id)!;
  const ke = view.players.find((p) => p.id === u.ke);
  const kumpul = S.bisaDikumpulkan(view, { id: aku.id, uang: aku.uang });
  return (
    <div className="ts-layar sg-tagihan" data-testid="sg-tagihan">
      <div className="ts-layar-isi">
        <Doodle id="tanda-seru" size={44} color="var(--danger)" />
        <p className="sd-big-line">
          Tagihan {rp(u.jumlah)} {ke ? `ke ${ke.name}` : 'ke bank'}
        </p>
        <p className="sd-whisper">
          Uangmu {rp(aku.uang)}. Kurang {rp(Math.max(0, u.jumlah - aku.uang))}. {kumpul >= u.jumlah ? 'Jual bangunan atau gadai properti untuk menutupnya.' : 'Bahkan dengan menjual semuanya pun tidak cukup.'}
        </p>
        <button className="btn soft" onClick={onAset}>
          buka asetku
        </button>
        <button className="btn sd-cta" disabled={busy || aku.uang < u.jumlah} onClick={() => void act({ t: 'bayarUtang' })} data-testid="sg-bayar">
          bayar
        </button>
        <button className="btn soft danger-glow" disabled={busy || aku.uang >= u.jumlah} onClick={() => void act({ t: 'bangkrut' })} data-testid="sg-bangkrut">
          nyatakan bangkrut
        </button>
      </div>
    </div>
  );
}

/** Kartu Kesempatan / Dana Umum yang baru dibuka, tampil sebentar untuk semua. */
function KartuMuncul({ view }: { view: View }) {
  const [tampil, setTampil] = useState<number | null>(null);
  const last = useRef(view.kartu?.n ?? 0);
  useEffect(() => {
    if (!view.kartu || view.kartu.n === last.current) return;
    last.current = view.kartu.n;
    setTampil(view.kartu.id);
    const t = setTimeout(() => setTampil(null), 4500);
    return () => clearTimeout(t);
  }, [view.kartu?.n]);
  if (tampil === null) return null;
  const k = S.KARTU[tampil]!;
  const by = view.players.find((p) => p.id === view.kartu?.by);
  return (
    <button className={`sg-kartu-muncul ${k.dek}`} onClick={() => setTampil(null)} data-testid="sg-kartu">
      <span className="tiny">{k.dek === 'k' ? 'Kesempatan' : 'Dana Umum'} · {by?.id === view.me?.id ? 'kamu' : by?.name}</span>
      <Doodle id={k.dek === 'k' ? 'tanda-tanya' : 'kado'} size={36} color="currentColor" />
      <b>{k.teks}</b>
    </button>
  );
}

function Aset({ view, act, busy }: { view: View; act: Act; busy: boolean }) {
  const me = view.me!.id;
  const aku = view.players.find((p) => p.id === me)!;
  const punya = view.milik.map((m, i) => ({ m, i })).filter(({ m }) => m.owner === me);
  const grup = useMemo(() => {
    const g = new Map<string, number[]>();
    for (const { i } of punya) {
      const pt = S.PETAK[i]!;
      const k = pt.jenis === 'kota' ? pt.grup : pt.jenis;
      g.set(k, [...(g.get(k) ?? []), i]);
    }
    return [...g.entries()];
  }, [view.rev]);
  if (!punya.length) return <p className="small soft">Kamu belum punya properti. Uangmu {rp(aku.uang)}.</p>;
  return (
    <div className="sg-aset">
      <p className="small">
        Uang <b>{rp(aku.uang)}</b> · kekayaan {rp(aku.kekayaan)}
        {aku.bebas ? ` · ${aku.bebas} kartu bebas penjara` : ''}
      </p>
      {grup.map(([k, is]) => {
        const lengkap = k in S.WARNA_GRUP && S.satuGrup(view.milik, k as S.Grup, me);
        return (
          <div key={k} className="sg-aset-grup" style={{ '--g': S.WARNA_GRUP[k as S.Grup] ?? '#16161a' } as CSSProperties}>
            <span className="sd-label">
              {k in S.NAMA_GRUP ? S.NAMA_GRUP[k as S.Grup] : k === 'transport' ? 'transportasi' : 'utilitas'}
              {lengkap ? ' · satu grup!' : ''}
            </span>
            {is.map((i) => {
              const pt = S.PETAK[i] as S.Milikan;
              const m = view.milik[i]!;
              const alasan = S.bisaBangun(view, me, i);
              return (
                <div key={i} className={`sg-aset-baris ${m.gadai ? 'gadai' : ''}`}>
                  <span className="grow">
                    <b>{pt.nama}</b>
                    <span className="tiny" style={{ display: 'block' }}>
                      {m.gadai ? 'tergadai' : m.rumah === 5 ? 'hotel' : m.rumah ? `${m.rumah} rumah` : 'tanah kosong'}
                    </span>
                  </span>
                  {pt.jenis === 'kota' && lengkap ? (
                    <>
                      <button className="btn sm" disabled={busy || !!alasan || aku.uang < pt.bangun} title={alasan ?? ''} onClick={() => void act({ t: 'bangun', kotak: i })} data-testid="sg-bangun">
                        +{m.rumah === 4 ? 'hotel' : 'rumah'} {rp(pt.bangun)}
                      </button>
                      {m.rumah ? (
                        <button className="btn sm soft" disabled={busy} onClick={() => void act({ t: 'jualRumah', kotak: i })}>
                          jual
                        </button>
                      ) : null}
                    </>
                  ) : null}
                  {m.gadai ? (
                    <button className="btn sm soft" disabled={busy || aku.uang < S.nilaiTebus(pt.harga)} onClick={() => void act({ t: 'tebus', kotak: i })}>
                      tebus {rp(S.nilaiTebus(pt.harga))}
                    </button>
                  ) : !m.rumah ? (
                    <button className="btn sm soft" disabled={busy} onClick={() => void act({ t: 'gadai', kotak: i })} data-testid="sg-gadai">
                      gadai +{rp(pt.harga / 2)}
                    </button>
                  ) : null}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

function PilihPaket({ view, pid, paket, set, judul }: { view: View; pid: string; paket: S.Paket; set: (p: S.Paket) => void; judul: string }) {
  const p = view.players.find((x) => x.id === pid)!;
  const kotak = view.milik.map((m, i) => ({ m, i })).filter(({ m }) => m.owner === pid);
  return (
    <div className="sg-paket">
      <span className="sd-label">{judul}</span>
      <div className="sg-paket-kotak">
        {kotak.length ? (
          kotak.map(({ m, i }) => {
            const pt = S.PETAK[i]!;
            const on = paket.kotak.includes(i);
            return (
              <button key={i} className={`pill sm ${on ? 'active' : ''}`} style={{ '--g': pt.jenis === 'kota' ? S.WARNA_GRUP[pt.grup] : '#16161a' } as CSSProperties} onClick={() => set({ ...paket, kotak: on ? paket.kotak.filter((x) => x !== i) : [...paket.kotak, i] })}>
                <i className="sg-titik" />
                {pt.nama}
                {m.gadai ? ' (gadai)' : ''}
              </button>
            );
          })
        ) : (
          <span className="tiny soft">tidak ada properti</span>
        )}
      </div>
      <label className="row" style={{ gap: 8, alignItems: 'center' }}>
        <span className="tiny">uang (juta)</span>
        <input className="field" type="number" min={0} max={p.uang} step={10} value={paket.uang || ''} placeholder="0" onChange={(e) => set({ ...paket, uang: Math.max(0, Math.min(p.uang, Math.floor(Number(e.target.value) || 0))) })} />
      </label>
      {p.bebas ? (
        <label className="row" style={{ gap: 8 }}>
          <input type="checkbox" checked={paket.bebas > 0} onChange={(e) => set({ ...paket, bebas: e.target.checked ? 1 : 0 })} /> <span className="tiny">kartu bebas penjara</span>
        </label>
      ) : null}
    </div>
  );
}

function Tukar({ view, act, busy }: { view: View; act: Act; busy: boolean }) {
  const me = view.me!.id;
  const lawan = view.players.filter((p) => p.id !== me && !p.bangkrut);
  const [ke, setKe] = useState<string>(lawan[0]?.id ?? '');
  const kosong = (): S.Paket => ({ uang: 0, kotak: [], bebas: 0 });
  const [beri, setBeri] = useState<S.Paket>(kosong);
  const [minta, setMinta] = useState<S.Paket>(kosong);
  const nm = (id: string) => (id === me ? 'kamu' : (view.players.find((p) => p.id === id)?.name ?? ''));
  const ringkas = (k: S.Paket) => [...k.kotak.map((i) => S.PETAK[i]!.nama), k.uang ? rp(k.uang) : '', k.bebas ? 'kartu bebas penjara' : ''].filter(Boolean).join(', ') || 'tidak ada';
  return (
    <div className="sg-tukar">
      {view.tawaran.length ? (
        <>
          <span className="sd-label">tawaran</span>
          {view.tawaran.map((t) => (
            <div key={t.id} className="sg-tawaran">
              <p className="small">
                <b>{nm(t.dari)}</b> memberi {ringkas(t.beri)}; <b>{nm(t.ke)}</b> memberi {ringkas(t.minta)}.
              </p>
              <div className="row" style={{ gap: 8 }}>
                {t.ke === me ? (
                  <button className="btn sm grow" disabled={busy} onClick={() => void act({ t: 'terimaTawaran', id: t.id })} data-testid="sg-terima">
                    terima
                  </button>
                ) : null}
                <button className="btn sm soft grow" disabled={busy} onClick={() => void act({ t: 'tolakTawaran', id: t.id })}>
                  {t.ke === me ? 'tolak' : 'batalkan'}
                </button>
              </div>
            </div>
          ))}
        </>
      ) : null}
      <span className="sd-label">buat tawaran</span>
      <div className="ts-pilih">
        {lawan.map((p) => (
          <button key={p.id} className={`pill sm ${ke === p.id ? 'active' : ''}`} onClick={() => (setKe(p.id), setMinta(kosong()))}>
            {p.name}
          </button>
        ))}
      </div>
      {ke ? (
        <>
          <PilihPaket view={view} pid={me} paket={beri} set={setBeri} judul="kamu beri" />
          <PilihPaket view={view} pid={ke} paket={minta} set={setMinta} judul={`kamu minta dari ${nm(ke)}`} />
          <button
            className="btn sd-cta"
            disabled={busy}
            onClick={async () => {
              await act({ t: 'ajukan', ke, beri, minta });
              setBeri(kosong());
              setMinta(kosong());
            }}
            data-testid="sg-ajukan"
          >
            ajukan tawaran
          </button>
        </>
      ) : null}
    </div>
  );
}

function Akhir({ view, act }: { view: View; act: Act }) {
  const w = view.players.find((p) => p.id === view.pemenang)!;
  const me = view.me!.id;
  const urut = [...view.players].sort((a, b) => Number(a.bangkrut) - Number(b.bangkrut) || b.kekayaan - a.kekayaan);
  return (
    <div className="ts-layar akhir rise" data-testid="sg-akhir">
      <div className="ts-layar-isi">
        <PlayerFace avatar={w.avatar} size={84} />
        <p className="sd-big-line">{w.id === me ? 'Kamu saudagar terkaya!' : `${w.name} saudagar terkaya!`}</p>
        <div className="ts-klasemen">
          {urut.map((p, i) => (
            <span key={p.id} className={p.id === w.id ? 'baru' : p.bangkrut ? 'kalah' : ''}>
              <b style={{ width: 22 }}>{i + 1}</b>
              <PlayerFace avatar={p.avatar} size={26} />
              <b className="grow">{p.id === me ? 'kamu' : p.name}</b>
              <span className="tiny">{p.bangkrut ? 'bangkrut' : rp(p.kekayaan)}</span>
            </span>
          ))}
        </div>
        {me === view.host ? (
          <button className="btn sd-cta" onClick={() => void act({ t: 'lagi' })} data-testid="sg-lagi">
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
