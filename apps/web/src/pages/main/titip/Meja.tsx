/**
 * Meja TITIP SURAT. Server memegang kartu & aturan; HP ini menampilkan
 * tanganmu, lawan, tumpukan, dan kejadian terbaru, dengan bunyi dan getar.
 */
import { surat } from '@sehari/core';
import { useEffect, useMemo, useRef, useState } from 'react';
import { navigate, useParams } from '@/lib/router';
import { useSession } from '@/lib/session';
import { profile, useCountdown, useWakeLock, vibrate } from '@/lib/sidik';
import { bunyi, joinMeja, kalimat, leaveMeja, namaKartu, rekor, sendTitip, useMeja, type View } from '@/lib/titip';
import { Doodle, Growing, Header, Sheet, Toggle, useToast } from '@/ui/kit';
import { PlayerFace, Timer } from '../../sidik/parts';
import { DudukForm, KodeMeja } from '../shared';
import { Aturan, Belakang, hue, Kartu, Kursi, Perangko } from './parts';

type Act = (a: surat.Action) => Promise<void>;

export default function TitipMeja() {
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
      apply(await sendTitip(C, a));
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
        <Header title="Titip Surat" backTo="/main" />
        <div className="sd-empty">
          <Doodle id="amplop" size={64} />
          <p>{err}</p>
          <button className="btn soft" onClick={() => navigate('/main')}>
            kembali ke Ruang Main
          </button>
        </div>
      </main>
    );
  if (!view) return <Growing label="menata meja…" />;
  if (!view.me)
    return (
      <DudukForm
        judul="duduk di meja"
        ajakan={view.phase === 'lobby' ? 'Kamu diajak main Titip Surat.' : 'Permainan di meja ini sudah berjalan.'}
        tombol="duduk"
        backTo="/main"
        doodle="amplop"
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
    <main className={`screen sd-screen ts-screen ph-${view.phase}`}>
      <Atas view={view} serverNow={serverNow} onRiwayat={() => setLembar('riwayat')} onAturan={() => setLembar('aturan')} onLeave={async () => { if (view.phase === 'lobby') await leaveMeja(C).catch(() => {}); navigate('/main'); }} />
      {view.phase === 'lobby' ? <Lobi view={view} act={act} busy={busy} onAturan={() => setLembar('aturan')} /> : <Permainan view={view} act={act} busy={busy} />}
      {view.phase === 'jeda' ? <Jeda view={view} act={act} serverNow={serverNow} /> : null}
      {view.phase === 'akhir' ? <Akhir view={view} act={act} /> : null}
      <Sheet open={lembar === 'aturan'} onClose={() => setLembar(null)} title="aturan Titip Surat">
        <Aturan />
      </Sheet>
      <Sheet open={lembar === 'riwayat'} onClose={() => setLembar(null)} title="riwayat meja">
        <Riwayat view={view} />
      </Sheet>
    </main>
  );
}

/** Bunyi & getar setiap ada kejadian baru; giliranmu diberi tanda. */
function useSuara(view: View | null) {
  const lastN = useRef(-1);
  const lastTurn = useRef<string | null>(null);
  useEffect(() => {
    if (!view?.me) return;
    const n = view.log.at(-1)?.n ?? 0;
    if (lastN.current >= 0 && n > lastN.current) {
      const baru = view.log.filter((e) => e.n > lastN.current);
      if (baru.some((e) => e.t === 'keluar')) {
        bunyi.keluar();
        vibrate(baru.some((e) => e.t === 'keluar' && e.by === view.me!.id) ? [120, 80, 240] : 60);
      } else if (baru.some((e) => e.t === 'main' || e.t === 'buang')) bunyi.kartu();
    }
    lastN.current = n;
    const turn = view.phase === 'main' ? (view.pending ?? view.giliran) : null;
    if (turn === view.me.id && lastTurn.current !== view.me.id) (bunyi.giliran(), vibrate([40, 60, 40]));
    lastTurn.current = turn;
  }, [view?.rev]);
  const lastPhase = useRef('');
  useEffect(() => {
    if (!view?.me) return;
    const k = `${view.phase}:${view.ronde}`;
    if (lastPhase.current && lastPhase.current !== k) {
      if (view.phase === 'jeda' && view.hasil?.pemenang.includes(view.me.id)) bunyi.perangko();
      if (view.phase === 'akhir') {
        if (view.pemenang === view.me.id) bunyi.menang();
        else bunyi.keluar();
        rekor.catat(view.code, view.rev, view.pemenang === view.me.id, view.players.find((p) => p.id === view.me!.id)?.perangko ?? 0);
      }
    }
    lastPhase.current = k;
  }, [view?.phase, view?.ronde]);
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
          <Doodle id="amplop" size={20} color="currentColor" /> Titip Surat
        </b>
        <span>{view.phase === 'lobby' ? `meja ${view.code}` : `ronde ${view.ronde} · target ${view.target} perangko`}</span>
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
  const n = view.players.length;
  const bots = view.players.filter((p) => p.bot).length;
  return (
    <section className="sd-lobby">
      <KodeMeja code={view.code} path={`/main/titip/${view.code}`} ajak="Main Titip Surat yuk!" />
      <span className="sd-label">di meja · {n}/{surat.MAX_PLAYERS}</span>
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
      <p className="small soft center">
        {n >= 2 ? `${n} orang · kumpulkan ${surat.targetFor(n)} perangko untuk menang.` : 'Butuh minimal 2 orang. Sedang sendiri? Ajak bot.'}{' '}
        <button className="linkish" onClick={onAturan}>
          baca aturan
        </button>
      </p>
      {host ? (
        <div className="sd-settings">
          <span className="sd-label">bot</span>
          <div className="row" style={{ gap: 8 }}>
            <button className="btn sm soft grow" disabled={n >= surat.MAX_PLAYERS || busy} onClick={() => void act({ t: 'bot', tambah: true })} data-testid="ts-bot">
              <Doodle id="ui-tambah" size={16} color="currentColor" /> tambah bot
            </button>
            <button className="btn sm soft grow" disabled={!bots || busy} onClick={() => void act({ t: 'bot', tambah: false })}>
              kurangi bot
            </button>
          </div>
          <span className="sd-label">batas waktu giliran</span>
          <div className="seg">
            {[0, 30, 60, 90].map((t) => (
              <button key={t} className={view.opts.waktu === t ? 'on' : ''} onClick={() => void act({ t: 'opsi', waktu: t })}>
                {t ? `${t} dtk` : 'santai'}
              </button>
            ))}
          </div>
          <div className="mt">
            <Toggle label="catatan otomatis" hint="hitungan kartu yang belum terlihat & kartu yang kamu ketahui" value={view.opts.pelacak} onChange={(v) => void act({ t: 'opsi', pelacak: v })} />
          </div>
          <button className="btn sd-cta" disabled={n < 2 || busy} onClick={() => void act({ t: 'mulai' })} data-testid="ts-mulai">
            <Doodle id="amplop" size={20} color="currentColor" /> kocok & bagikan
          </button>
        </div>
      ) : (
        <p className="sd-wait">Menunggu tuan rumah mengocok kartu…</p>
      )}
    </section>
  );
}

// ── Permainan ───────────────────────────────────────────────────────────────

function Permainan({ view, act, busy }: { view: View; act: Act; busy: boolean }) {
  const me = view.me!;
  const aku = view.players.find((p) => p.id === me.id)!;
  const lawan = view.players.filter((p) => p.id !== me.id);
  const giliranku = view.phase === 'main' && view.giliran === me.id && !view.pending;
  const posku = view.phase === 'main' && view.pending === me.id;
  const [sel, setSel] = useState<number | null>(null);
  const [target, setTarget] = useState<string | null>(null);
  const [tebak, setTebak] = useState<number | null>(null);
  useEffect(() => {
    setSel(null);
    setTarget(null);
    setTebak(null);
  }, [view.giliran, view.ronde, view.phase]);
  const kartuSel = me.hand.find((c) => c.id === sel);
  const sasaran = kartuSel ? surat.sasaranFor(view, me.id, kartuSel.v) : [];
  const wajibIbu = surat.mustIbu(me.hand);
  const butuhTarget = !!kartuSel && !!surat.jenis(kartuSel.v).sasaran && sasaran.length > 0;
  const siap = !!kartuSel && (!butuhTarget || !!target) && (kartuSel.v !== 1 || !butuhTarget || tebak !== null);
  const giliranNama = view.players.find((p) => p.id === (view.pending ?? view.giliran))?.name;

  return (
    <section className="ts-meja">
      <div className="ts-lawan">
        {lawan.map((p) => (
          <Kursi key={p.id} p={p} v={view} me={me.id} bisa={butuhTarget && sasaran.includes(p.id)} onPick={butuhTarget ? () => setTarget(p.id) : undefined}>
            {target === p.id ? <span className="ts-dipilih">dipilih</span> : null}
            {view.giliran === p.id || view.pending === p.id ? <span className="ts-mikir">sedang memilih…</span> : null}
          </Kursi>
        ))}
      </div>

      <div className="ts-tengah">
        <div className="ts-tumpukan" aria-label={`${view.deck} kartu di tumpukan`}>
          <Belakang n={view.deck} />
          <span className="tiny">tumpukan</span>
        </div>
        {view.terbuka.length ? (
          <div className="ts-terbuka">
            {view.terbuka.map((v, i) => (
              <Kartu key={i} v={v} mini />
            ))}
            <span className="tiny">dibuka (berdua)</span>
          </div>
        ) : null}
        <Kejadian view={view} />
      </div>

      {me.tahu.length || (view.opts.pelacak && me.sisa.length) ? <Catatan view={view} /> : null}

      <div className={`ts-aku ${giliranku || posku ? 'giliran' : ''} ${aku.out ? 'keluar' : ''}`}>
        <div className="ts-aku-atas">
          <PlayerFace avatar={aku.avatar} size={30} dim={aku.out} />
          <b>kamu</b>
          <Perangko n={aku.perangko} target={view.target} />
          {aku.aman ? (
            <span className="ts-badge aman">
              <Doodle id="payung-terbuka" size={14} color="currentColor" /> aman
            </span>
          ) : null}
          <span className="grow" />
          {aku.buang.map((x, i) => (
            <Kartu key={i} v={x} mini />
          ))}
        </div>
        {aku.out ? (
          <p className="sd-whisper">Kamu tersingkir di ronde ini. Tonton sampai selesai, perangko berikutnya masih bisa direbut.</p>
        ) : posku ? (
          <Pos view={view} act={act} busy={busy} />
        ) : (
          <>
            <p className="ts-status" data-testid="ts-status">
              {giliranku ? (wajibIbu ? 'Giliranmu. Ibu wajib dimainkan.' : 'Giliranmu. Pilih satu kartu untuk dimainkan.') : `Giliran ${giliranNama ?? '…'}.`}
            </p>
            <div className="ts-tangan">
              {me.hand.map((c) => (
                <Kartu key={c.id} v={c.v} pilih={sel === c.id} mati={giliranku && wajibIbu && c.v !== 8} onClick={giliranku && !(wajibIbu && c.v !== 8) ? () => (setSel(c.id), setTarget(null), setTebak(null)) : undefined} testid="ts-kartu" />
              ))}
            </div>
            {giliranku && kartuSel ? (
              <div className="ts-aksi rise">
                <p className="small">{surat.jenis(kartuSel.v).efek}</p>
                {kartuSel.v === 9 ? <p className="small ts-awas">Melepas Dia berarti kamu tersingkir dari ronde ini.</p> : null}
                {kartuSel.v === 5 && target === me.id && me.hand.some((c) => c.v === 9) ? <p className="small ts-awas">Kartu lainmu Dia. Kalau dibuang, kamu tersingkir.</p> : null}
                {surat.jenis(kartuSel.v).sasaran && !sasaran.length ? <p className="small soft">Semua lawan terlindung. Kartu ini dimainkan tanpa efek.</p> : null}
                {butuhTarget ? (
                  <>
                    <span className="sd-label">pilih {kartuSel.v === 5 ? 'pemain (boleh dirimu)' : 'pemain'}</span>
                    <div className="ts-pilih">
                      {sasaran.map((id) => (
                        <button key={id} className={`pill sm ${target === id ? 'active' : ''}`} onClick={() => setTarget(id)} data-testid="ts-target">
                          {id === me.id ? 'diriku' : view.players.find((p) => p.id === id)?.name}
                        </button>
                      ))}
                    </div>
                  </>
                ) : null}
                {kartuSel.v === 1 && butuhTarget ? (
                  <>
                    <span className="sd-label">tebak kartunya</span>
                    <div className="ts-tebak">
                      {surat.JENIS.filter((j) => j.v !== 1).map((j) => (
                        <button key={j.v} className={tebak === j.v ? 'on' : ''} style={hue(j.v)} onClick={() => setTebak(j.v)} data-testid="ts-tebak">
                          <b>{j.v}</b>
                          <span>{j.nama}</span>
                          {view.opts.pelacak ? <i>{me.sisa[j.v]} tersisa</i> : null}
                        </button>
                      ))}
                    </div>
                  </>
                ) : null}
                <button className={`btn sd-cta ${kartuSel.v === 9 ? 'danger-glow' : ''}`} disabled={!siap || busy} onClick={() => void act({ t: 'main', kartu: kartuSel.id, target: butuhTarget ? target! : undefined, tebak: tebak ?? undefined })} data-testid="ts-mainkan">
                  mainkan {namaKartu(kartuSel.v)}
                </button>
              </div>
            ) : null}
          </>
        )}
      </div>
    </section>
  );
}

/** Tukang Pos: simpan satu, kembalikan sisanya ke bawah tumpukan dengan urutan pilihan. */
function Pos({ view, act, busy }: { view: View; act: Act; busy: boolean }) {
  const hand = view.me!.hand;
  const [simpan, setSimpan] = useState<number | null>(null);
  const [urut, setUrut] = useState<number[]>([]);
  useEffect(() => setUrut(hand.filter((c) => c.id !== simpan).map((c) => c.id)), [simpan, hand.length]);
  return (
    <div className="ts-pos rise">
      <p className="ts-status">Tukang Pos datang. Simpan satu kartu.</p>
      <div className="ts-tangan tiga">
        {hand.map((c) => (
          <Kartu key={c.id} v={c.v} kecil pilih={simpan === c.id} onClick={() => setSimpan(c.id)} testid="ts-simpan" />
        ))}
      </div>
      {simpan !== null && urut.length > 1 ? (
        <div className="ts-urut">
          <span className="tiny soft">kembali ke bawah tumpukan:</span>
          {urut.map((id, i) => (
            <span key={id} className="row" style={{ gap: 6, alignItems: 'center' }}>
              <Kartu v={hand.find((c) => c.id === id)!.v} mini />
              <span className="tiny">{i === urut.length - 1 ? 'paling bawah' : 'di atasnya'}</span>
            </span>
          ))}
          <button className="btn sm soft" onClick={() => setUrut([...urut].reverse())}>
            tukar urutan
          </button>
        </div>
      ) : null}
      <button className="btn sd-cta" disabled={simpan === null || busy} onClick={() => void act({ t: 'pos', simpan: simpan!, bawah: urut })} data-testid="ts-pos">
        simpan & kembalikan
      </button>
    </div>
  );
}

function Kejadian({ view }: { view: View }) {
  const me = view.me?.id ?? null;
  const items = view.log.filter((e) => e.r === view.ronde).slice(-3);
  return (
    <div className="ts-kejadian" aria-live="polite">
      {items.map((e, i) => {
        const k = kalimat(e, view, me);
        return (
          <p key={e.n} className={`ts-kj ${i === items.length - 1 ? 'baru' : ''}`} style={e.v !== undefined && e.t === 'main' ? hue(e.v) : undefined}>
            {e.t === 'main' ? <Kartu v={e.v!} mini /> : null}
            <span>
              {k.teks}
              {k.rahasia ? <em className="ts-rahasia"> Diam-diam: {k.rahasia}</em> : null}
            </span>
          </p>
        );
      })}
    </div>
  );
}

function Catatan({ view }: { view: View }) {
  const me = view.me!;
  const [buka, setBuka] = useState(false);
  const total = me.sisa.reduce((a, b) => a + b, 0);
  return (
    <div className={`ts-catatan ${buka ? 'buka' : ''}`}>
      <button className="ts-catatan-kepala" onClick={() => setBuka(!buka)}>
        <Doodle id="pena" size={16} color="currentColor" />
        <span className="grow">
          catatan
          {me.tahu.length
            ? ` · kamu tahu: ${me.tahu.map((t) => `${view.players.find((p) => p.id === t.pid)?.name} = ${namaKartu(t.v)}`).join(', ')}`
            : ''}
        </span>
        <Doodle id={buka ? 'ui-tutup' : 'ui-tambah'} size={14} color="currentColor" />
      </button>
      {buka && me.sisa.length ? (
        <div className="ts-sisa">
          <span className="tiny soft">belum terlihat olehmu ({total} kartu, termasuk tangan lawan & kartu sisihan):</span>
          {surat.JENIS.map((j) => (
            <span key={j.v} className={`ts-sisa-baris ${me.sisa[j.v] ? '' : 'habis'}`} style={hue(j.v)}>
              <b>{j.v}</b> {j.nama}
              <i>{'●'.repeat(me.sisa[j.v]!)}{'○'.repeat(j.jumlah - me.sisa[j.v]!)}</i>
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function Riwayat({ view }: { view: View }) {
  const me = view.me?.id ?? null;
  return (
    <div className="ts-riwayat">
      {[...view.log].reverse().map((e) => {
        const k = kalimat(e, view, me);
        return (
          <p key={e.n} className={e.t === 'ronde' ? 'ronde' : ''}>
            {e.t === 'main' ? <Kartu v={e.v!} mini /> : null}
            <span>
              {k.teks}
              {k.rahasia ? <em className="ts-rahasia"> {k.rahasia}</em> : null}
            </span>
          </p>
        );
      })}
    </div>
  );
}

// ── Jeda & akhir ────────────────────────────────────────────────────────────

export function HasilRonde({ view }: { view: View }) {
  const h = view.hasil!;
  const nm = (id: string) => (id === view.me?.id ? 'Kamu' : (view.players.find((p) => p.id === id)?.name ?? ''));
  const urut = useMemo(() => [...view.players].sort((a, b) => b.perangko - a.perangko), [view.rev]);
  return (
    <>
      <p className="sd-big-line">{h.pemenang.map(nm).join(' & ')} {h.pemenang.length > 1 ? 'seri dan sama-sama' : ''} mendapat perangko.</p>
      <p className="sd-whisper">
        {h.alasan === 'sisa' ? 'Semua yang lain sudah tersingkir.' : 'Tumpukan habis. Kartu terakhir dibuka.'}
        {h.spy ? ` ${nm(h.spy)} satu-satunya Pengagum Rahasia yang bertahan: +1 perangko.` : ''}
      </p>
      {h.tangan.length > 1 ? (
        <div className="ts-buka">
          {h.tangan.map((t) => (
            <span key={t.pid} className={h.pemenang.includes(t.pid) ? 'menang' : ''}>
              <Kartu v={t.v} kecil />
              <span className="tiny">{nm(t.pid)}</span>
            </span>
          ))}
        </div>
      ) : null}
      {h.sisih !== null ? <p className="tiny soft center">Kartu yang disisihkan: {namaKartu(h.sisih)} ({h.sisih}).</p> : null}
      <div className="ts-klasemen">
        {urut.map((p) => (
          <span key={p.id} className={h.pemenang.includes(p.id) || h.spy === p.id ? 'baru' : ''}>
            <PlayerFace avatar={p.avatar} size={26} />
            <b className="grow">{p.id === view.me?.id ? 'kamu' : p.name}</b>
            <Perangko n={p.perangko} target={view.target} />
          </span>
        ))}
      </div>
    </>
  );
}

function Jeda({ view, act, serverNow }: { view: View; act: Act; serverNow: () => number }) {
  const secs = useCountdown(view.deadline, serverNow);
  const aku = view.players.find((p) => p.id === view.me!.id)!;
  const menunggu = view.players.filter((p) => !p.siap).map((p) => p.name);
  return (
    <div className="ts-layar rise" data-testid="ts-jeda">
      <div className="ts-layar-isi">
        <span className="sd-label center">ronde {view.ronde} selesai</span>
        <Doodle id="perangko" size={54} color="#d9473d" />
        <HasilRonde view={view} />
        <button className="btn sd-cta" disabled={aku.siap} onClick={() => void act({ t: 'siap' })} data-testid="ts-siap">
          {aku.siap ? `menunggu ${menunggu.join(', ')}…` : 'ronde berikutnya'}
        </button>
        <p className="tiny soft center">otomatis lanjut dalam {secs ?? 0} detik</p>
      </div>
    </div>
  );
}

function Akhir({ view, act }: { view: View; act: Act }) {
  const w = view.players.find((p) => p.id === view.pemenang)!;
  const aku = view.me!.id === w.id;
  return (
    <div className="ts-layar akhir rise" data-testid="ts-akhir">
      <div className="ts-layar-isi">
        <PlayerFace avatar={w.avatar} size={84} />
        <p className="sd-big-line">{aku ? 'Suratmu sampai ke Dia.' : `Surat ${w.name} sampai lebih dulu.`}</p>
        {view.hasil ? <HasilRonde view={view} /> : null}
        {view.me!.id === view.host ? (
          <button className="btn sd-cta" onClick={() => void act({ t: 'lagi' })} data-testid="ts-lagi">
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
