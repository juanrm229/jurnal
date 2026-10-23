/**
 * Satu hari di lingkaran: buku terbuka. Halaman tiap orang berdampingan,
 * sampulnya terbuka pelan saat semuanya sudah tersegel.
 */
import { addDays, COPY, dayName, type FootnoteWire, formatDayLong, getCity, type LockedDrop, openEnvelope, type ReactionKind, sealEnvelope, yellowing } from '@sehari/core';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Page, type PageItem, withLayouts } from '@/editor/Page';
import { api } from '@/lib/api';
import { newDropId, qk, useCircle, useCircleDay, useKeyring, useMe, useOpenDrops, useReact, useToday } from '@/lib/data';
import { Link, navigate, useParams } from '@/lib/router';
import { useSession } from '@/lib/session';
import { claimTokens, tokenCandidates } from '@/lib/tokens';
import { Scene } from '@/ui/art';
import { sound } from '@/lib/sound';
import { Avatar, Doodle, Growing, Header, Sheet, useToast } from '@/ui/kit';

const REACTIONS: { kind: ReactionKind; label: string; doodle: string }[] = [
  { kind: 'hug', label: 'peluk', doodle: 'ui-peluk' },
  { kind: 'me_too', label: 'aku juga', doodle: 'ui-aku-juga' },
  { kind: 'here', label: 'aku di sini', doodle: 'ui-hati' },
  { kind: 'candle', label: 'lilin', doodle: 'lilin' },
];

export default function Together() {
  const { id, day } = useParams<{ id: string; day: string }>();
  const me = useMe();
  const { identity } = useSession();
  const toast = useToast();
  const today = useToday();
  const qc = useQueryClient();
  const circle = useCircle(id);
  const q = useCircleDay(id, day);
  const drops = useOpenDrops(q.data?.drops);
  const ring = useKeyring();
  const react = useReact();
  const [tap, setTap] = useState<null | { dropId: string; owner: string; x: number; y: number }>(null);
  const [noteFor, setNoteFor] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [won, setWon] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const pointer = useRef({ x: 0, y: 0 });
  const narrow = useMedia('(max-width: 820px)');
  const [idx, setIdx] = useState(0);
  const [dir, setDir] = useState<'next' | 'prev' | 'none'>('none');
  const swipe = useRef<null | { x: number; y: number; t: number }>(null);
  const aged = circle?.settings.yellowingPages && circle.status === 'active' ? yellowing(q.data?.lastVisitedOn ?? day, today) : 0;

  useEffect(() => {
    if (!q.data || !circle) return;
    const t = setTimeout(() => void api.post(`/circles/${id}/days/${day}/visit`).catch(() => {}), 1500);
    return () => clearTimeout(t);
  }, [q.data?.day, circle?.id]);

  useEffect(() => {
    if (!q.data?.iSealed || !circle) return;
    const mine = drops.filter((d) => d.wire.authorId === me.user.id);
    const allSealed = q.data.members.every((m) => m.sealed || m.frozen);
    const codes = tokenCandidates({ circle, day, mine, homeCityId: me.user.homeCityId, allSealed, yellowed: aged > 0.2 });
    if (codes.length) void claimTokens(circle.id, day, codes).then(setWon);
  }, [q.data?.iSealed, drops.length]);

  // Sampul terbuka sendiri sesaat setelah halaman dimuat.
  useEffect(() => {
    if (!q.data) return;
    const t = setTimeout(() => setOpen(true), 500);
    return () => clearTimeout(t);
  }, [!!q.data]);

  const footText = (fn: FootnoteWire) => {
    try {
      return ring ? openEnvelope<{ text: string }>(fn.envelope as never, ring).text : '…';
    } catch {
      return '…';
    }
  };

  const pages = useMemo(() => {
    if (!q.data || !circle) return [];
    return q.data.members.map((m) => {
      const items: PageItem[] = drops
        .filter((d) => d.wire.authorId === m.userId && d.payload)
        .map((d) => ({
          id: d.wire.id,
          authorId: d.wire.authorId,
          payload: d.payload!,
          audience: d.wire.audience,
          circleIds: d.wire.circleIds,
          mediaIds: d.wire.mediaIds,
          reactions: d.wire.reactions,
          footnotes: d.wire.footnotes.map((fn) => ({ id: fn.id, authorName: fn.authorId === me.user.id ? 'kamu' : (circle.members.find((x) => x.userId === fn.authorId)?.penName ?? '…'), text: footText(fn) })),
        }));
      return { member: m, info: circle.members.find((x) => x.userId === m.userId), items, locked: q.data!.locked.filter((l) => l.authorId === m.userId) };
    });
  }, [q.data, drops, circle, ring]);

  if (!circle || !q.data) return <Growing />;
  const data = q.data;
  const name = (uid: string) => (uid === me.user.id ? 'kamu' : (circle.members.find((m) => m.userId === uid)?.penName ?? 'seseorang'));
  // Halamanku dulu (kiri), lalu yang lain.
  const ordered = [...pages].sort((a, b) => (a.member.userId === me.user.id ? -1 : b.member.userId === me.user.id ? 1 : 0));
  // Halaman berdampingan dibuat sama tinggi.
  const pageH = Math.max(1200, ...ordered.map((p) => withLayouts(p.items).reduce((m, it) => Math.max(m, it.layout.y + (it.payload.kind === 'photo' ? it.layout.w * 1.1 : 260)), 0) + 260));
  const go = (i: number) => {
    const n = Math.max(0, Math.min(ordered.length - 1, i));
    if (n === idx) return;
    setDir(n > idx ? 'next' : 'prev');
    sound.play('turn');
    setIdx(n);
    setTap(null);
  };
  const canReact = circle.status === 'active' || circle.status === 'memorial';
  const tapped = tap ? drops.find((d) => d.wire.id === tap.dropId) : undefined;

  const addFootnote = async () => {
    if (!noteFor || !note.trim() || !identity) return;
    const key = circle.keys.get(circle.currentEpoch);
    if (!key) return;
    const env = sealEnvelope({ text: note.trim() }, [
      { t: 'user', userId: me.user.id, publicKey: identity.publicKey },
      { t: 'circle', circleId: circle.id, epoch: circle.currentEpoch, key },
    ]);
    try {
      await api.post(`/drops/${noteFor}/footnotes`, { id: newDropId(), envelope: { ciphertext: env.ciphertext, recipients: env.recipients } });
      setNote('');
      setNoteFor(null);
      await qc.invalidateQueries({ queryKey: qk.circleDay(id, day) });
    } catch (e) {
      toast((e as Error).message);
    }
  };

  return (
    <main className="screen wide" onClick={() => setTap(null)}>
      <Header
        title={`${dayName(day)}, ${formatDayLong(day)}`}
        sub={circle.name}
        backTo={`/l/${id}`}
        right={
          <div className="row" style={{ gap: 0 }}>
            <button className="icon-btn" aria-label="hari sebelumnya" onClick={() => navigate(`/l/${id}/hari/${addDays(day, -1)}`, { replace: true })}>
              <Doodle id="ui-kembali" size={20} />
            </button>
            {day < today ? (
              <button className="icon-btn" aria-label="hari berikutnya" onClick={() => navigate(`/l/${id}/hari/${addDays(day, 1)}`, { replace: true })}>
                <Doodle id="ui-panah-kanan" size={20} />
              </button>
            ) : null}
          </div>
        }
      />

      <div className="row wrap" style={{ justifyContent: 'center', gap: 16, margin: '6px 0 14px' }}>
        {data.members.map((m) => {
          const info = circle.members.find((x) => x.userId === m.userId);
          return (
            <div key={m.userId} className="col center" style={{ alignItems: 'center', gap: 2 }}>
              <Avatar doodle={info?.doodle ?? 'tunas'} size={40} sealed={m.sealed} />
              <span className={`tiny ${m.sealed ? 'ink' : 'soft'}`}>{name(m.userId)}</span>
              <span className="tiny soft">{m.sealed ? 'tersegel' : m.frozen ? 'istirahat' : `${m.dropCount} hal`}</span>
            </div>
          );
        })}
      </div>

      {day === circle.createdDay ? <p className="hand center" style={{ fontSize: 26 }}>Prolog — halaman pertama kitab kalian</p> : null}
      {aged > 0.15 ? <p className="tiny ink-soft center">{COPY.memories.yellowing}</p> : null}
      {won.length ? (
        <Link to={`/l/${id}/lemari`} className="sticky row" style={{ background: 'var(--sticky-yellow)', margin: '10px auto', maxWidth: 520 }}>
          <Doodle id={won[0] === 'kembang_api' ? 'kembang-api' : won[0] === 'daun_kering' ? 'daun-kering' : won[0]!} size={30} />
          <span className="small">Token baru masuk Lemari Benda: {won.join(', ').replace(/_/g, ' ')}.</span>
        </Link>
      ) : null}

      {!data.iSealed && day === today && circle.settings.revealMode === 'after_seal' && circle.kind !== 'moment' ? (
        <div className="card col center" style={{ alignItems: 'center', maxWidth: 520, margin: '0 auto 16px' }}>
          <Doodle id="segel-lilin" size={40} className="breathe" />
          <p className="small">{COPY.seal.giveFirst}</p>
          <Link to="/hari" className="btn auto">ke halamanku</Link>
        </div>
      ) : null}

      <div className={`book ${open ? 'open' : ''}`}>
        <div className="book-cover" onClick={() => setOpen(true)}>
          <Doodle id={circle.doodle} size={64} color="var(--on-ink)" />
          <div className="hand" style={{ fontSize: 34 }}>{circle.name}</div>
          <div className="tiny">{formatDayLong(day)}</div>
        </div>
        {narrow && ordered.length > 1 ? (
          <div className="pager-tabs" role="tablist">
            {ordered.map((p, i) => (
              <button key={p.member.userId} role="tab" aria-selected={i === idx} className={i === idx ? 'on' : ''} onClick={() => go(i)}>
                <Avatar doodle={p.info?.doodle ?? 'tunas'} size={30} sealed={p.member.sealed} />
                <span>{name(p.member.userId)}</span>
                <i>{p.items.length || (p.locked.length ? '🔒' : '·')}</i>
              </button>
            ))}
          </div>
        ) : null}
        <div
          className={narrow ? 'pager' : 'spread'}
          onPointerDown={(e) => (swipe.current = { x: e.clientX, y: e.clientY, t: Date.now() })}
          onPointerUp={(e) => {
            const s0 = swipe.current;
            swipe.current = null;
            if (!narrow || !s0) return;
            const dx = e.clientX - s0.x;
            const dy = e.clientY - s0.y;
            if (Math.abs(dx) > 60 && Math.abs(dy) < 60 && Date.now() - s0.t < 700) go(idx + (dx < 0 ? 1 : -1));
          }}>
          {(narrow ? ordered.slice(idx, idx + 1) : ordered).map((p) => (
            <div key={p.member.userId} className={narrow ? `pager-page turn-${dir}` : undefined} style={{ position: 'relative' }} onPointerDown={(e) => (pointer.current = { x: e.clientX, y: e.clientY })}>
              <Page
                items={p.items}
                viewerId={me.user.id}
                aged={aged}
                minHeight={pageH}
                margins={`${p.member.userId}:${day}`}
                mood={p.items.find((x) => x.payload.mood)?.payload.mood}
                head={
                  <div className="row between">
                    <div className="row">
                      <Avatar doodle={p.info?.doodle ?? 'tunas'} size={30} sealed={p.member.sealed} />
                      <div>
                        <div className="h2">{name(p.member.userId)}</div>
                        <div className="tiny ink-soft">{getCity(p.items.find((x) => x.payload.cityId)?.payload.cityId ?? p.info?.cityId)?.name ?? ''}</div>
                      </div>
                    </div>
                    <span className="tiny ink-soft">{p.items.length} hal</span>
                  </div>
                }
                onItemTap={(dropId, at) => {
                  if (!canReact) return;
                  void at;
                  setTimeout(() => setTap({ dropId, owner: p.member.userId, ...pointer.current }));
                }}
                foot={
                  <>
                    {p.locked.length ? <LockedNote locked={p.locked} who={name(p.member.userId)} /> : null}
                    {!p.items.length && !p.locked.length ? (
                      <div data-paper="1" style={{ position: 'absolute', top: '22%', left: '8%', right: '8%', textAlign: 'center', pointerEvents: 'none' }}>
                        <Scene id={day < today ? 'langit-malam' : 'hujan-jendela'} speed={1.4} />
                        <p className="hand" style={{ fontSize: 26, color: 'var(--ink)' }}>
                          {p.member.userId === me.user.id ? 'halamanmu masih kosong.' : day < today ? COPY.streak.fog : `${name(p.member.userId)} belum menulis hari ini.`}
                        </p>
                        {p.member.userId === me.user.id && day === today ? <p className="tiny soft">tulis sesuatu di halaman hari ini</p> : null}
                      </div>
                    ) : null}
                  </>
                }
              />
              {tap && tap.owner === p.member.userId && tapped ? (
                <ReactBar
                  x={tap.x}
                  y={tap.y}
                  mine={tapped.wire.reactions.filter((r) => r.userId === me.user.id).map((r) => r.kind)}
                  onReact={(kind, on) => react.mutate({ dropId: tapped.wire.id, kind, on })}
                  onNote={tapped.wire.kind !== 'silent' ? () => setNoteFor(tapped.wire.id) : undefined}
                />
              ) : null}
            </div>
          ))}
        </div>
        {narrow && ordered.length > 1 ? (
          <div className="row between mt">
            <button className="pill" disabled={idx === 0} onClick={() => go(idx - 1)}>
              <Doodle id="ui-kembali" size={16} color="currentColor" /> {idx > 0 ? name(ordered[idx - 1]!.member.userId) : ''}
            </button>
            <span className="tiny soft">geser untuk membalik halaman</span>
            <button className="pill" disabled={idx === ordered.length - 1} onClick={() => go(idx + 1)}>
              {idx < ordered.length - 1 ? name(ordered[idx + 1]!.member.userId) : ''} <Doodle id="ui-panah-kanan" size={16} color="currentColor" />
            </button>
          </div>
        ) : null}
      </div>

      <Footnotes pages={ordered.map((p) => ({ who: name(p.member.userId), items: p.items }))} />

      <p className="tiny soft center mt-lg">ketuk sesuatu di halaman untuk memeluk, bilang “aku juga”, atau menulis catatan kaki</p>

      <Sheet open={!!noteFor} onClose={() => setNoteFor(null)} title="catatan kaki">
        <div className="col">
          <input className="field hand" style={{ fontSize: 26 }} value={note} maxLength={200} placeholder="catatan kecil di pinggir halaman…" onChange={(e) => setNote(e.target.value)} autoFocus onKeyDown={(e) => e.key === 'Enter' && void addFootnote()} />
          <button className="btn" disabled={!note.trim()} onClick={() => void addFootnote()}>tempel</button>
        </div>
      </Sheet>
    </main>
  );
}

function ReactBar({ x, y, mine, onReact, onNote }: { x: number; y: number; mine: ReactionKind[]; onReact: (k: ReactionKind, on: boolean) => void; onNote?: () => void }) {
  return (
    <div className="react-bar" style={{ position: 'fixed', left: Math.max(150, Math.min(window.innerWidth - 150, x)), top: Math.max(70, y) }} onClick={(e) => e.stopPropagation()}>
      {REACTIONS.map((r) => (
        <button key={r.kind} data-sound="pop" className={mine.includes(r.kind) ? 'on' : ''} onClick={() => onReact(r.kind, !mine.includes(r.kind))}>
          <Doodle id={r.doodle} size={16} color="currentColor" sw={2.6} /> {r.label}
        </button>
      ))}
      {onNote ? (
        <button onClick={onNote}>
          <Doodle id="pena" size={16} color="currentColor" sw={2.6} /> catatan
        </button>
      ) : null}
    </div>
  );
}

function LockedNote({ locked, who }: { locked: LockedDrop[]; who: string }) {
  const l = locked[0]!;
  const why = l.reason === 'time_capsule' ? `kapsul waktu · terbuka ${l.unlockOn ? formatDayLong(l.unlockOn) : 'nanti'}` : l.reason === 'secret_card' ? 'kartu rahasia · terbuka setelah kamu menjawab' : l.reason === 'split' ? 'mode pisah' : 'terbuka setelah kamu menyegel';
  return (
    <div data-paper="1" style={{ position: 'absolute', left: '12%', right: '12%', bottom: '6%', pointerEvents: 'none' }}>
      <div className="card col center" style={{ alignItems: 'center', transform: 'rotate(-1.5deg)', background: 'color-mix(in srgb, var(--ink) 8%, var(--card))' }}>
        <Doodle id="amplop" size={48} className="breathe" />
        <div className="small">{who} · {locked.length} hal tersegel</div>
        <div className="tiny soft">{why}</div>
      </div>
    </div>
  );
}

function Footnotes({ pages }: { pages: { who: string; items: PageItem[] }[] }) {
  const all = pages.flatMap((p) => p.items.flatMap((it) => it.footnotes.map((fn) => ({ ...fn, on: p.who, what: it.payload.text?.slice(0, 40) ?? it.payload.kind }))));
  if (!all.length) return null;
  return (
    <section className="section" style={{ maxWidth: 640, margin: '24px auto 0' }}>
      <span className="label">catatan kaki</span>
      {all.map((f) => (
        <div key={f.id} className="row" style={{ alignItems: 'flex-start', gap: 10, padding: '6px 0' }}>
          <span className="tiny ink-soft" style={{ minWidth: 70 }}>✎ {f.authorName}</span>
          <span className="grow">
            <span className="hand" style={{ fontSize: 24, display: 'block' }}>{f.text}</span>
            <span className="tiny soft">di halaman {f.on} · “{f.what}”</span>
          </span>
        </div>
      ))}
    </section>
  );
}

function useMedia(q: string) {
  const [m, setM] = useState(() => matchMedia(q).matches);
  useEffect(() => {
    const mq = matchMedia(q);
    const f = () => setM(mq.matches);
    mq.addEventListener('change', f);
    return () => mq.removeEventListener('change', f);
  }, [q]);
  return m;
}
