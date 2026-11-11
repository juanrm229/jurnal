/**
 * "Rahasia kecil": tiga hal yang baru terjadi kalau kalian sama-sama
 * melakukannya. Tinta hilang (terbaca hanya saat sama-sama di sini), tukar
 * pena (menulis hari satu sama lain), bendera putih (baikan tanpa gengsi).
 */
import { formatDayShort, formatMonth, swapTarget, todayIn, type InkWire } from '@sehari/core';
import { useEffect, useRef, useState } from 'react';
import { eraseInk, lowerTruce, openNote, raiseTruce, sendSwap, useInkLive, useRefreshBerdua, useSwaps, useTruce, writeInk } from '@/lib/berdua';
import { type CircleView, useMe, useToday } from '@/lib/data';
import { sound } from '@/lib/sound';
import { store } from '@/lib/storage';
import { Avatar, Confetti, Doodle, Sheet, useToast } from '@/ui/kit';

type Open = null | 'ink' | 'swap' | 'truce';

const nameOf = (circle: CircleView, meId: string, id: string) => (id === meId ? 'kamu' : (circle.members.find((m) => m.userId === id)?.penName ?? 'teman'));

function Row({ icon, title, sub, hot, onClick, testid }: { icon: string; title: string; sub: string; hot?: boolean; onClick: () => void; testid: string }) {
  return (
    <button className={`ch-row bd-row ${hot ? 'hot' : ''}`} onClick={onClick} data-testid={testid}>
      <Doodle id={icon} size={26} />
      <span className="grow">
        <span className="small" style={{ display: 'block' }}>{title}</span>
        <span className={`tiny ${hot ? 'ink' : 'soft'}`}>{sub}</span>
      </span>
      {hot ? <span className="bd-dot" aria-hidden /> : <Doodle id="ui-panah-kanan" size={16} />}
    </button>
  );
}

export function BerduaCard({ circle }: { circle: CircleView }) {
  const me = useMe();
  const meId = me.user.id;
  const today = useToday();
  const toast = useToast();
  const refresh = useRefreshBerdua(circle.id);
  const [open, setOpen] = useState<Open>(null);
  const [busy, setBusy] = useState(false);
  const run = async (f: () => Promise<unknown>) => {
    if (busy) return false;
    setBusy(true);
    try {
      await f();
      return true;
    } catch (e) {
      toast((e as Error).message);
      return false;
    } finally {
      setBusy(false);
    }
  };
  const who = (id: string) => nameOf(circle, meId, id);
  const others = circle.others.filter((m) => m.state === 'active');
  const partner = others.length === 1 ? others[0]!.penName : 'mereka';
  const eligible = circle.kind !== 'moment' && circle.status === 'active' && others.length > 0;
  const cid = eligible ? circle.id : undefined;

  // ── Tinta hilang ──────────────────────────────────────────────────────────
  const live = useInkLive(cid, eligible);
  const inks = live.data?.inks ?? [];
  const hereIds = (live.data?.present ?? []).filter((u) => u !== meId);
  const hidden = inks.filter((i) => i.authorId !== meId && !i.enc);
  const readable = inks.filter((i) => i.authorId !== meId && i.enc);
  const [inkText, setInkText] = useState('');
  // Begitu tinta orang lain terbaca, kabari sekali dengan bunyi kecil.
  const seenReadable = useRef(new Set<string>());
  useEffect(() => {
    const fresh = readable.filter((i) => !seenReadable.current.has(i.id));
    if (!fresh.length) return;
    fresh.forEach((i) => seenReadable.current.add(i.id));
    sound.play('chime');
    navigator.vibrate?.([12, 50, 12]);
  }, [readable.map((i) => i.id).join(',')]);

  // ── Tukar pena ────────────────────────────────────────────────────────────
  const swaps = useSwaps(cid);
  const month = swaps.data?.month ?? today.slice(0, 7);
  const targetId = swapTarget(circle.active.map((m) => m.userId), meId, month);
  const aboutMe = swaps.data?.others.filter((o) => o.aboutId === meId) ?? [];
  const [swapText, setSwapText] = useState('');
  const swapSub = !targetId
    ? 'butuh minimal dua orang'
    : !swaps.data?.mine
      ? aboutMe.length
        ? `${who(aboutMe[0]!.authorId)} sudah menebak harimu. Tulis punyamu untuk membukanya.`
        : `${formatMonth(month)}: tulis hari ${who(targetId)} menurut tebakanmu`
      : aboutMe.some((o) => o.enc)
        ? 'sudah terbuka. Baca tebakan tentang harimu.'
        : `punyamu tersimpan. Menunggu ${partner}.`;
  const swapHot = !!targetId && ((!swaps.data?.mine && aboutMe.length > 0) || (aboutMe.some((o) => o.enc) && store.get(`swapSeen.${circle.id}`) !== month));

  // ── Bendera putih ─────────────────────────────────────────────────────────
  const truce = useTruce(cid);
  const peace = truce.data?.peace ?? [];
  const lastPeace = peace[0]?.at ?? '';
  const peaceKey = `peaceSeen.${circle.id}`;
  const [justMet, setJustMet] = useState(false);
  const unseenPeace = !!lastPeace && store.get(peaceKey) !== lastPeace;
  const hoursLeft = truce.data?.mine ? Math.max(1, Math.round((new Date(truce.data.mine.expiresAt).getTime() - Date.now()) / 3600_000)) : 0;

  const close = () => {
    if (open === 'truce' && lastPeace) store.set(peaceKey, lastPeace);
    if (open === 'swap' && aboutMe.some((o) => o.enc)) store.set(`swapSeen.${circle.id}`, month);
    setJustMet(false);
    setOpen(null);
  };

  const inkCard = (i: InkWire) => {
    const mine = i.authorId === meId;
    const text = openNote(circle, i.enc);
    return (
      <div key={i.id} className={`bd-ink ${mine ? 'mine' : ''} ${!i.enc ? 'hidden' : ''}`} data-testid={i.enc ? 'ink-open' : 'ink-hidden'}>
        <div className="tiny soft row between">
          <span>
            {mine ? 'dari kamu' : `dari ${who(i.authorId)}`} · {formatDayShort(i.day)}
          </span>
          {mine ? (
            <button className="bd-x" aria-label="hapus tinta ini" onClick={() => void run(async () => { await eraseInk(i.id); await refresh('inks'); })}>
              <Doodle id="ui-tutup" size={12} />
            </button>
          ) : null}
        </div>
        {i.enc ? (
          <p className="hand bd-ink-text">{text || '…'}</p>
        ) : (
          <p className="hand bd-ink-text bd-scribble" aria-label="belum terbaca">
            ~~~~ ~~~~~~ ~~~ ~~~~~ ~~
          </p>
        )}
        <span className="tiny soft">
          {mine
            ? i.readAt
              ? 'sudah terbaca bersama'
              : `belum terbaca. Muncul di layar ${partner} hanya saat kalian sama-sama di sini.`
            : i.enc
              ? `terbaca selama ${who(i.authorId)} juga di sini`
              : `muncul saat ${who(i.authorId)} juga membuka lingkaran ini`}
        </span>
      </div>
    );
  };

  if (!eligible) return null;

  return (
    <section className="section" data-testid="berdua">
      <div className="row between">
        <span className="label">rahasia kecil</span>
        {hereIds.length ? (
          <span className="bd-here" data-testid="here">
            {hereIds.slice(0, 3).map((u) => {
              const m = circle.members.find((x) => x.userId === u);
              return m ? <Avatar key={u} doodle={m.doodle} size={20} /> : null;
            })}
            <span className="tiny ink">{hereIds.length === 1 ? `${who(hereIds[0]!)} sedang di sini juga` : `${hereIds.length} orang sedang di sini juga`}</span>
          </span>
        ) : null}
      </div>
      <div className="card ch-list">
        <Row
          testid="row-ink"
          icon="pena"
          title="tinta hilang"
          hot={readable.length > 0}
          sub={readable.length ? `terbaca sekarang: ${readable.length} pesan dari ${who(readable[0]!.authorId)}` : hidden.length ? `${hidden.length} pesan menunggu kalian sama-sama di sini` : 'pesan yang hanya terbaca saat kalian membuka ini bersamaan'}
          onClick={() => setOpen('ink')}
        />
        <Row testid="row-swap" icon="buku-terbuka" title="tukar pena" hot={swapHot} sub={swapSub} onClick={() => setOpen('swap')} />
        <Row
          testid="row-truce"
          icon="bendera"
          title="bendera putih"
          hot={unseenPeace}
          sub={unseenPeace ? 'bendera kalian bertemu!' : truce.data?.mine ? `berkibar diam-diam · turun sendiri ${hoursLeft} jam lagi` : peace.length ? `${peace.length} kali baikan · untuk hari yang lagi keruh` : 'untuk hari yang lagi keruh'}
          onClick={() => setOpen('truce')}
        />
      </div>

      <Sheet open={open === 'ink'} onClose={close} title="tinta hilang">
        <div className="col" style={{ gap: 12 }}>
          <p className="small soft" style={{ margin: 0 }}>
            Tulis sesuatu yang tidak bisa dibaca sendirian. Pesanmu baru muncul di layar {partner} ketika kalian berdua membuka lingkaran ini pada saat yang sama, dan menghilang lagi begitu salah satu pergi.
          </p>
          <div className={`bd-presence ${hereIds.length ? 'on' : ''}`}>
            <span className="bd-pulse" aria-hidden />
            {hereIds.length ? `${hereIds.map(who).join(', ')} sedang di sini. Tinta kalian terbaca sekarang.` : `Kamu sendirian di sini. Ajak ${partner} membuka lingkaran ini.`}
          </div>
          {inks.length ? inks.map(inkCard) : <p className="tiny soft center">Belum ada tinta. Yang pertama selalu paling deg-degan.</p>}
          <textarea className="field hand" style={{ fontSize: 24, minHeight: 84 }} maxLength={600} value={inkText} placeholder="hal yang ingin kamu bilang sambil ditemani…" onChange={(e) => setInkText(e.target.value)} data-testid="ink-input" />
          <button
            className="btn"
            disabled={busy || !inkText.trim()}
            data-testid="ink-send"
            onClick={() =>
              void run(async () => {
                await writeInk(circle, today, inkText.trim());
                setInkText('');
                sound.play('soft');
                await refresh('inks');
              })
            }>
            <Doodle id="pena" size={18} color="currentColor" /> tulis dengan tinta hilang
          </button>
        </div>
      </Sheet>

      <Sheet open={open === 'swap'} onClose={close} title={`tukar pena · ${formatMonth(month).toLowerCase()}`}>
        <div className="col" style={{ gap: 12 }}>
          {!targetId ? (
            <p className="small soft">Tukar pena butuh minimal dua orang di lingkaran.</p>
          ) : !swaps.data?.mine ? (
            <>
              <p className="small soft" style={{ margin: 0 }}>
                Sebulan sekali, kalian bertukar pena: kamu menulis <b className="ink">hari {who(targetId)}</b> menurut tebakanmu. Bangun jam berapa, makan apa, sebal karena apa, mikirin siapa. Tebakan tentang harimu baru terbuka setelah kamu mengirim punyamu.
              </p>
              <textarea className="field hand" style={{ fontSize: 24, minHeight: 150 }} maxLength={1500} value={swapText} placeholder={`hari ini ${who(targetId)} pasti…`} onChange={(e) => setSwapText(e.target.value)} data-testid="swap-input" />
              <button
                className="btn"
                disabled={busy || swapText.trim().length < 10}
                data-testid="swap-send"
                onClick={() =>
                  void run(async () => {
                    await sendSwap(circle, month, targetId, swapText.trim());
                    setSwapText('');
                    sound.play('turn');
                    await refresh('swaps');
                  })
                }>
                tukar pena
              </button>
              <p className="tiny soft center" style={{ margin: 0 }}>Sekali kirim, tidak bisa diubah. Namanya juga tebakan.</p>
            </>
          ) : (
            <>
              {aboutMe.length ? (
                aboutMe.map((o) => (
                  <div key={o.id} className="bd-swap theirs" data-testid={o.enc ? 'swap-open' : 'swap-locked'}>
                    <span className="label">harimu menurut {who(o.authorId)}</span>
                    {o.enc ? <p className="hand bd-swap-text">{openNote(circle, o.enc) || '…'}</p> : <p className="small soft">masih terkunci</p>}
                  </div>
                ))
              ) : (
                <div className="bd-swap theirs">
                  <span className="label">harimu menurut {partner}</span>
                  <p className="small soft" style={{ margin: '6px 0 0' }}>Belum ditulis. Begitu {partner} menukar pena, tebakannya muncul di sini.</p>
                </div>
              )}
              <div className="bd-swap">
                <span className="label">hari {who(swaps.data.mine.aboutId)} menurutmu</span>
                <p className="hand bd-swap-text">{openNote(circle, swaps.data.mine.enc) || '…'}</p>
              </div>
              {swaps.data.others.filter((o) => o.aboutId !== meId && o.enc).map((o) => (
                <div key={o.id} className="bd-swap">
                  <span className="label">hari {who(o.aboutId)} menurut {who(o.authorId)}</span>
                  <p className="hand bd-swap-text">{openNote(circle, o.enc) || '…'}</p>
                </div>
              ))}
              <p className="tiny soft center" style={{ margin: 0 }}>Seberapa meleset? Bandingkan dengan halaman aslinya setelah kalian menyegel hari ini.</p>
            </>
          )}
        </div>
      </Sheet>

      <Sheet open={open === 'truce'} onClose={close} title="bendera putih">
        <div className="col center" style={{ gap: 12, alignItems: 'center', textAlign: 'center' }}>
          {justMet || unseenPeace ? (
            <>
              <Confetti />
              <div className="bd-flags met" aria-hidden>
                <Doodle id="bendera" size={64} />
                <Doodle id="bendera" size={64} style={{ transform: 'scaleX(-1)' }} />
              </div>
              <p className="hand ink" style={{ fontSize: 30, margin: 0 }} data-testid="truce-met">Bendera kalian bertemu.</p>
              <p className="small" style={{ margin: 0, maxWidth: 320 }}>Ternyata kalian sama-sama ingin baikan, dan tidak ada yang harus mulai duluan. Sekarang tinggal saling menyapa.</p>
            </>
          ) : truce.data?.mine ? (
            <>
              <div className="bd-flags" aria-hidden>
                <Doodle id="bendera" size={64} className="sway" />
              </div>
              <p className="hand ink" style={{ fontSize: 28, margin: 0 }} data-testid="truce-up">Benderamu berkibar diam-diam.</p>
              <p className="small soft" style={{ margin: 0, maxWidth: 320 }}>
                {partner} tidak tahu, dan tidak dikabari. Kalau {partner} juga mengibarkan benderanya dalam {hoursLeft} jam ini, kalian berdua langsung tahu. Kalau tidak, benderamu turun sendiri tanpa jejak.
              </p>
              <button className="pill" disabled={busy} onClick={() => void run(async () => { await lowerTruce(circle.id); await refresh('truce'); })}>
                turunkan saja
              </button>
            </>
          ) : (
            <>
              <div className="bd-flags idle" aria-hidden>
                <Doodle id="bendera" size={64} />
              </div>
              <p className="small" style={{ margin: 0, maxWidth: 330 }}>
                Lagi berantem, atau sekadar keruh? Kibarkan bendera putih <b>diam-diam</b>. Tidak ada yang tahu, kecuali {partner} juga mengibarkan miliknya. Kalau itu terjadi, kalian berdua dikabari: sama-sama ingin baikan, tanpa ada yang kalah.
              </p>
              <button
                className="btn auto"
                disabled={busy}
                data-testid="truce-raise"
                onClick={() =>
                  void run(async () => {
                    const before = peace.length;
                    const r = await raiseTruce(circle.id);
                    if (r.peace.length > before) {
                      setJustMet(true);
                      sound.play('chime');
                      navigator.vibrate?.([20, 60, 40]);
                    } else sound.play('soft');
                    await refresh('truce');
                  })
                }>
                <Doodle id="bendera" size={20} color="currentColor" /> kibarkan diam-diam
              </button>
            </>
          )}
          {peace.length ? (
            <p className="tiny soft" style={{ margin: '6px 0 0' }}>
              {peace.length} kali baikan · terakhir {formatDayShort(todayIn(me.user.tz, new Date(peace[0]!.at)))}. Setiap baikan jadi bintang emas di langit lingkaran.
            </p>
          ) : null}
        </div>
      </Sheet>
    </section>
  );
}
