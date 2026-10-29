/**
 * Papan ULAR TANGGA. Server memegang dadu & aturan; HP ini menampilkan papan,
 * kartumu, dadu (bisa dilempar dengan menggoyang HP), dan pratinjau langkah:
 * ke mana kamu mendarat, dan ke mana lawan jatuh kalau kamu dorong.
 */
import { tangga } from '@sehari/core';
import { type CSSProperties, useEffect, useMemo, useRef, useState } from 'react';
import { navigate, useParams } from '@/lib/router';
import { useSession } from '@/lib/session';
import { profile, useCountdown, useWakeLock, vibrate } from '@/lib/sidik';
import { izinGoyang, joinMeja, kalimat, leaveMeja, PION, rekor, sendTangga, useGoyang, useMeja, type View } from '@/lib/tangga';
import { bunyi } from '@/lib/titip';
import { Doodle, Growing, Header, Sheet, Toggle, useToast } from '@/ui/kit';
import { PlayerFace, Timer } from '../../sidik/parts';
import { DudukForm, KodeMeja } from '../shared';
import { AturanTangga, Dadu, KartuAksi, Papan } from './parts';

type Act = (a: tangga.Action) => Promise<void>;

export default function TanggaMeja() {
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
      apply(await sendTangga(C, a));
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
        <Header title="Ular Tangga" backTo="/main" />
        <div className="sd-empty">
          <Doodle id="ui-dadu" size={64} />
          <p>{err}</p>
          <button className="btn soft" onClick={() => navigate('/main')}>
            kembali ke Ruang Main
          </button>
        </div>
      </main>
    );
  if (!view) return <Growing label="menggelar papan…" />;
  if (!view.me)
    return (
      <DudukForm
        judul="ikut main"
        ajakan={view.phase === 'lobby' ? 'Kamu diajak main Ular Tangga.' : 'Permainan di papan ini sudah berjalan.'}
        tombol="ikut"
        backTo="/main"
        doodle="ui-dadu"
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
    <main className={`screen sd-screen tg-screen ph-${view.phase}`}>
      <Atas view={view} serverNow={serverNow} onRiwayat={() => setLembar('riwayat')} onAturan={() => setLembar('aturan')} onLeave={async () => { if (view.phase === 'lobby') await leaveMeja(C).catch(() => {}); navigate('/main'); }} />
      {view.phase === 'lobby' ? <Lobi view={view} act={act} busy={busy} /> : <Permainan view={view} act={act} busy={busy} />}
      {view.phase === 'akhir' ? <Akhir view={view} act={act} /> : null}
      <Sheet open={lembar === 'aturan'} onClose={() => setLembar(null)} title="aturan Ular Tangga">
        <AturanTangga />
      </Sheet>
      <Sheet open={lembar === 'riwayat'} onClose={() => setLembar(null)} title="riwayat">
        <div className="ts-riwayat">
          {[...view.log].reverse().map((e) => (
            <p key={e.n}>
              <span>
                <b className="tiny soft">r{e.r}</b> {kalimat(e, view, view.me!.id)}
              </span>
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
      const kena = baru.find((e) => e.t === 'gerak' && e.lewat === 'ular');
      if (kena) (bunyi.keluar(), kena.by === me && vibrate([150, 80, 250]));
      else if (baru.some((e) => e.t === 'gerak' && e.lewat === 'tangga')) bunyi.perangko();
      else if (baru.some((e) => e.t === 'lempar' || e.t === 'gerak')) bunyi.kartu();
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
  const secs = useCountdown(view.phase === 'main' ? view.deadline : null, serverNow);
  return (
    <header className="sd-top">
      <button className="hdr-back" aria-label="keluar" onClick={onLeave}>
        <Doodle id="ui-kembali" size={20} />
      </button>
      <div className="sd-top-mid">
        <b>
          <Doodle id="ui-dadu" size={20} color="currentColor" /> Ular Tangga
        </b>
        <span>{view.phase === 'lobby' ? `papan ${view.code}` : `ronde ${view.ronde} · ${view.preset}`}</span>
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
  const set = (opts: Partial<tangga.Opts>) => void act({ t: 'opsi', opts });
  return (
    <section className="sd-lobby">
      <KodeMeja code={view.code} path={`/main/tangga/${view.code}`} ajak="Main Ular Tangga yuk!" />
      <span className="sd-label">di papan · {n}/{tangga.MAX_PLAYERS}</span>
      <div className="sd-players">
        {view.players.map((p, i) => (
          <span key={p.id} className="sd-player rise">
            <span className="tg-pion diam" style={{ '--c': PION[i % PION.length] } as CSSProperties}>
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
      <span className="sd-label">cara main</span>
      <div className="st-preset">
        {(
          [
            ['jenius', 'Jenius', 'Dua dadu: jalan & dorong lawan. Kartu aksi, musim, papan acak.', 'ui-ide'],
            ['klasik', 'Klasik', 'Satu dadu, papan klasik. Dapat 6 jalan lagi.', 'ui-dadu'],
          ] as const
        ).map(([id, nama, ket, d]) => (
          <button key={id} className={view.preset === id ? 'on' : ''} disabled={!host || busy} onClick={() => void act({ t: 'preset', nama: id })} data-testid={`tg-preset-${id}`}>
            <Doodle id={d} size={28} color="currentColor" />
            <b>{nama}</b>
            <span className="tiny">{ket}</span>
          </button>
        ))}
      </div>
      {host ? (
        <div className="sd-settings">
          <Toggle label="Dua dadu & dorong" hint={`Satu dadu untuk jalan, satu untuk mendorong lawan dalam ${tangga.JARAK_DORONG} kotak.`} value={o.dorong} onChange={(v) => set({ dorong: v })} />
          <Toggle label="Kartu aksi" hint="Kotak kartu memberi Gergaji, Penawar, Dadu Emas, Tukar Tempat, dan lainnya." value={o.kartu} onChange={(v) => set({ kartu: v })} />
          <Toggle label="Musim" hint={`Tiap ${tangga.SIKLUS_MUSIM} ronde muncul ular atau tangga baru.`} value={o.musim} onChange={(v) => set({ musim: v })} />
          <span className="sd-label">papan</span>
          <div className="seg">
            {(['acak', 'klasik'] as const).map((t) => (
              <button key={t} className={o.papan === t ? 'on' : ''} onClick={() => set({ papan: t })}>
                {t}
              </button>
            ))}
          </div>
          <span className="sd-label">lewat dari 100</span>
          <div className="seg">
            {(['pantul', 'pas', 'bebas'] as const).map((t) => (
              <button key={t} className={o.akhir === t ? 'on' : ''} onClick={() => set({ akhir: t })}>
                {t}
              </button>
            ))}
          </div>
          <p className="tiny soft">{{ pantul: 'Kelebihan langkah memantul mundur dari 100.', pas: 'Harus angka pas; kalau lebih, tidak bergerak.', bebas: 'Lewat 100 langsung menang.' }[o.akhir]}</p>
          <span className="sd-label">batas waktu giliran</span>
          <div className="seg">
            {[0, 20, 40, 60].map((t) => (
              <button key={t} className={o.waktu === t ? 'on' : ''} onClick={() => set({ waktu: t })}>
                {t ? `${t} dtk` : 'santai'}
              </button>
            ))}
          </div>
          <span className="sd-label">bot</span>
          <div className="row" style={{ gap: 8 }}>
            <button className="btn sm soft grow" disabled={n >= tangga.MAX_PLAYERS || busy} onClick={() => void act({ t: 'bot', tambah: true })} data-testid="tg-bot">
              <Doodle id="ui-tambah" size={16} color="currentColor" /> tambah bot
            </button>
            <button className="btn sm soft grow" disabled={!view.players.some((p) => p.bot) || busy} onClick={() => void act({ t: 'bot', tambah: false })}>
              kurangi bot
            </button>
          </div>
          <button className="btn sd-cta" disabled={n < 2 || busy} onClick={() => void act({ t: 'mulai' })} data-testid="tg-mulai">
            <Doodle id="ui-dadu" size={20} color="currentColor" /> gelar papan
          </button>
        </div>
      ) : (
        <p className="sd-wait">Menunggu tuan rumah menggelar papan…</p>
      )}
    </section>
  );
}

// ── Permainan ───────────────────────────────────────────────────────────────

type PilihKartu = { kartu: tangga.KartuId; target?: string; nilai?: number; kotak?: number };

function Permainan({ view, act, busy }: { view: View; act: Act; busy: boolean }) {
  const me = view.me!;
  const aku = view.players.find((p) => p.id === me.id)!;
  const giliranku = view.phase === 'main' && view.giliran === me.id;
  const lempar = giliranku && view.fase === 'lempar';
  const pilih = giliranku && view.fase === 'pilih';
  const [kartu, setKartu] = useState<PilihKartu | null>(null);
  const [pakai, setPakai] = useState(0);
  const [dorong, setDorong] = useState<{ d: number; t: string } | null>(null);
  const [goyang, setGoyang] = useState(false);
  useEffect(() => {
    setPakai(0);
    setDorong(null);
  }, [view.dadu?.join(), view.giliran]);
  useGoyang(lempar && goyang && !busy, () => (vibrate(40), void act({ t: 'lempar' })));

  // Dadu dipasang ulang setiap lemparan baru supaya animasinya selalu berputar.
  const lemparN = view.log.filter((e) => e.t === 'lempar').at(-1)?.n ?? 0;

  const penawar = me.kartu.includes('penawar');
  const hitung = (pos: number, n: number, pw: boolean) => tangga.hitung(view.papan, view.opts.akhir, pos, n, pw);
  const pratinjau = pilih && view.dadu?.[pakai] !== undefined ? hitung(aku.pos, view.dadu[pakai]!, penawar) : null;
  const bisaDorong = pilih && pratinjau && view.opts.dorong && view.dadu!.length > 1 ? view.players.filter((x) => x.id !== me.id && tangga.bisaDorong(x, pratinjau.ke)) : [];
  const didorong = pilih && dorong && view.dadu?.[dorong.d] !== undefined ? view.players.find((x) => x.id === dorong.t) : undefined;
  const sorot = [pratinjau?.ke, didorong ? hitung(didorong.pos, view.dadu![dorong!.d]!, didorong.penawar).ke : undefined].filter((x): x is number => !!x);

  // Kartu yang butuh memilih kotak di papan.
  const pilihKotak = kartu?.kartu === 'gergaji' ? (s: number) => view.papan.ular.some(([h]) => h === s && !view.papan.putus.includes(h)) : kartu?.kartu === 'ular' ? (s: number) => s >= 11 && s <= 99 && !tangga.terpakai(view.papan).has(s) && !view.players.some((x) => x.pos === s) : undefined;
  const kirimKartu = (k: PilihKartu) => {
    setKartu(null);
    void act({ t: 'kartu', ...k });
  };
  const ket = (pos: number, h: tangga.Hasil) => (h.ke === 100 ? 'SAMPAI 100!' : h.lewat === 'ular' ? `ular! turun ke ${h.ke}` : h.lewat === 'tangga' ? `tangga! naik ke ${h.ke}` : h.penawar ? `${h.ke} (penawar menyelamatkan)` : h.ke === pos ? 'tidak bergerak' : `${h.ke}`);

  return (
    <section className="tg-meja">
      <div className="tg-pemain">
        {view.players.map((p, i) => (
          <span key={p.id} className={`tg-chip ${view.giliran === p.id ? 'giliran' : ''} ${p.id === me.id ? 'aku' : ''}`} style={{ '--c': PION[i % PION.length] } as CSSProperties}>
            <PlayerFace avatar={p.avatar} size={24} />
            <b>{p.id === me.id ? 'kamu' : p.name}</b>
            <span className="tg-pos">{p.pos || 'start'}</span>
            {view.opts.kartu ? (
              <span className="tiny tg-jml-kartu">
                <Doodle id="kartu" size={12} color="currentColor" />
                {p.kartu}
              </span>
            ) : null}
            {p.penawar ? <Doodle id="cangkir" size={14} color="currentColor" /> : null}
            {p.perisai ? <Doodle id="payung-terbuka" size={14} color="currentColor" /> : null}
          </span>
        ))}
      </div>

      <Papan v={view} sorot={sorot} pilihKotak={pilihKotak} onKotak={(s) => kartu && kirimKartu({ ...kartu, kotak: s })} />

      {view.musim ? (
        <p className="tg-musim">
          <Doodle id={view.musim.jenis === 'ular' ? 'gelombang' : 'tunas'} size={16} color="currentColor" /> Ronde {view.musim.ronde}: {view.musim.jenis === 'ular' ? 'ular' : 'tangga'} baru muncul di {view.musim.a} → {view.musim.b}
          {view.musim.ronde - view.ronde > 0 ? ` (${view.musim.ronde - view.ronde} ronde lagi)` : ''}
        </p>
      ) : null}
      <p className="st-kejadian">{view.log.length ? kalimat(view.log.at(-1)!, view, me.id) : ''}</p>

      <div className={`st-aku tg-aku ${giliranku ? 'giliran' : ''}`}>
        {kartu && pilihKotak ? (
          <div className="tg-aksi">
            <p className="ts-status">{kartu.kartu === 'gergaji' ? 'Ketuk kepala ular yang mau dipotong.' : 'Ketuk kotak kosong untuk ular peliharaanmu.'}</p>
            <button className="btn soft" onClick={() => setKartu(null)}>
              batal
            </button>
          </div>
        ) : lempar ? (
          <div className="tg-aksi">
            <p className="ts-status" data-testid="tg-status">
              Giliranmu.{view.emas ? ` Dadu emas: ${view.emas}.` : ''}
              {view.ketiga ? ' Tiga dadu!' : ''}
            </p>
            {view.opts.kartu && me.kartu.length ? (
              <div className="tg-tangan">
                {me.kartu.map((k, i) => (
                  <KartuAksi key={`${k}${i}`} id={k} mati={view.kartuDipakai || k === 'penawar' || busy} onClick={() => (tangga.KARTU[k].pilih ? setKartu({ kartu: k }) : kirimKartu({ kartu: k }))} />
                ))}
              </div>
            ) : null}
            <button className="btn sd-cta tg-lempar" disabled={busy} onClick={() => void act({ t: 'lempar' })} data-testid="tg-lempar">
              <Doodle id="ui-dadu" size={22} color="currentColor" /> lempar dadu
            </button>
            {!goyang ? (
              <button className="linkish tiny" onClick={async () => setGoyang(await izinGoyang())}>
                atau aktifkan goyang HP untuk melempar
              </button>
            ) : (
              <p className="tiny soft center">Goyang HP-mu untuk melempar.</p>
            )}
          </div>
        ) : pilih && view.dadu && pratinjau ? (
          <div className="tg-aksi">
            <div className="tg-dadu-baris">
              {view.dadu.map((d, i) => (
                <Dadu key={`${lemparN}-${i}`} n={d} kocok peran={i === pakai ? 'jalan' : dorong?.d === i ? 'dorong' : null} onClick={() => (setPakai(i), dorong?.d === i && setDorong(null))} />
              ))}
            </div>
            <p className="tg-pratinjau" data-testid="tg-pratinjau">
              Kamu jalan {view.dadu[pakai]}: {aku.pos || 'start'} → <b>{ket(aku.pos, pratinjau!)}</b>
            </p>
            {view.opts.dorong && view.dadu.length > 1 ? (
              <>
                <span className="sd-label">dorong lawan dengan dadu lain?</span>
                <div className="tg-dorong">
                  <button className={`pill sm ${!dorong ? 'active' : ''}`} onClick={() => setDorong(null)}>
                    tidak
                  </button>
                  {bisaDorong.flatMap((x) =>
                    view.dadu!.map((d, j) => {
                      if (j === pakai) return null;
                      const h = hitung(x.pos, d, x.penawar);
                      return (
                        <button key={`${x.id}${j}`} className={`pill sm ${dorong?.t === x.id && dorong.d === j ? 'active' : ''} ${h.lewat === 'ular' ? 'bahaya' : h.lewat === 'tangga' || h.ke === 100 ? 'untung' : ''}`} onClick={() => setDorong({ d: j, t: x.id })} data-testid="tg-dorong">
                          {x.name} +{d}: {x.pos} → {ket(x.pos, h)}
                        </button>
                      );
                    }),
                  )}
                </div>
                {!bisaDorong.length ? <p className="tiny soft">Tidak ada lawan dalam {tangga.JARAK_DORONG} kotak yang bisa didorong.</p> : null}
              </>
            ) : null}
            <button className="btn sd-cta" disabled={busy} onClick={() => void act({ t: 'jalan', pakai, dorong: dorong?.d, target: dorong?.t })} data-testid="tg-jalan">
              jalan
            </button>
          </div>
        ) : (
          <div className="tg-aksi">
            <p className="ts-status">{aku.pos === 100 ? 'Kamu sudah sampai!' : `Giliran ${view.players.find((p) => p.id === view.giliran)?.name ?? '…'}.`}</p>
            {view.dadu && view.giliran !== me.id ? (
              <div className="tg-dadu-baris kecil">
                {view.dadu.map((d, i) => (
                  <Dadu key={`${lemparN}-${i}`} n={d} kocok kecil />
                ))}
              </div>
            ) : null}
            {view.opts.kartu && me.kartu.length ? (
              <div className="tg-tangan">
                {me.kartu.map((k, i) => (
                  <KartuAksi key={`${k}${i}`} id={k} />
                ))}
              </div>
            ) : null}
          </div>
        )}
      </div>

      <Sheet open={!!kartu && !pilihKotak} onClose={() => setKartu(null)} title={kartu ? tangga.KARTU[kartu.kartu].nama : ''}>
        {kartu ? (
          <div className="col" style={{ gap: 10 }}>
            <p className="small">{tangga.KARTU[kartu.kartu].efek}</p>
            {tangga.KARTU[kartu.kartu].pilih === 'nilai' ? (
              <div className="tg-dadu-baris">
                {[1, 2, 3, 4, 5, 6].map((n) => {
                  const h = hitung(aku.pos, n, penawar);
                  return (
                    <button key={n} className="tg-nilai" onClick={() => kirimKartu({ ...kartu, nilai: n })} data-testid="tg-nilai">
                      <Dadu n={n} kecil />
                      <span className="tiny">{ket(aku.pos, h)}</span>
                    </button>
                  );
                })}
              </div>
            ) : null}
            {tangga.KARTU[kartu.kartu].pilih === 'lawan' ? (
              <div className="ts-pilih">
                {view.players
                  .filter((x) => x.id !== me.id && tangga.bisaDidorong(x) && (kartu.kartu !== 'tukar' || Math.abs(x.pos - aku.pos) <= tangga.JARAK_TUKAR))
                  .map((x) => (
                    <button key={x.id} className="pill" onClick={() => kirimKartu({ ...kartu, target: x.id })} data-testid="tg-target">
                      {x.name} · {x.pos}
                      {kartu.kartu === 'angin' ? ` → ${hitung(x.pos, -4, x.penawar).ke}` : ''}
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

function Akhir({ view, act }: { view: View; act: Act }) {
  const w = view.players.find((p) => p.id === view.pemenang)!;
  const urut = useMemo(() => [...view.players].sort((a, b) => b.pos - a.pos), [view.rev]);
  const me = view.me!.id;
  return (
    <div className="ts-layar akhir rise" data-testid="tg-akhir">
      <div className="ts-layar-isi">
        <PlayerFace avatar={w.avatar} size={84} />
        <p className="sd-big-line">{w.id === me ? 'Kamu sampai di 100!' : `${w.name} sampai di 100!`}</p>
        <p className="sd-whisper">{view.ronde} ronde.</p>
        <div className="ts-klasemen">
          {urut.map((p, i) => (
            <span key={p.id} className={p.id === w.id ? 'baru' : ''}>
              <b style={{ width: 22 }}>{i + 1}</b>
              <PlayerFace avatar={p.avatar} size={26} />
              <b className="grow">{p.id === me ? 'kamu' : p.name}</b>
              <span className="tiny">kotak {p.pos}</span>
            </span>
          ))}
        </div>
        {me === view.host ? (
          <button className="btn sd-cta" onClick={() => void act({ t: 'lagi' })} data-testid="tg-lagi">
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
