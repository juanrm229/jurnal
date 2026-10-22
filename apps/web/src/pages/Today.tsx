/**
 * Halaman hari ini: selembar kertas untuk satu hari. Tulis di mana saja,
 * seret foto ke atasnya, tempel stiker, rekam suara — lalu segel saat senja.
 */
import {
  type Audience,
  COPY,
  dailyCardFor,
  dayName,
  dayOfYear,
  type DropKind,
  type DropPayload,
  formatDayLong,
  getCity,
  type MoodCode,
  nightQuestionFor,
  type PageLayout,
  sealableDays,
  type SongRef,
  sunsetUtc,
  tzOffsetMinutes,
  zoneLabel,
} from '@sehari/core';
import { gardenDoodleFor } from '@sehari/doodles';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { defaultWidth, Page, type PageItem, PAGE_W } from '@/editor/Page';
import { SealCeremony } from '@/editor/Seal';
import { MoodSheet, PromptSheet, SilentSheet, SongSheet, StickerSheet, VoiceSheet } from '@/editor/Sheets';
import { TEXT_SIZES } from '@/editor/elements';
import { api } from '@/lib/api';
import { buildDropBody, type CircleView, type DraftDrop, newDropId, nowParts, openDrop, qk, updateDrop, useCircles, useKeyring, useMe, useMyDay, useToday } from '@/lib/data';
import { primeMedia, uploadBytes, uploadPhoto } from '@/lib/media';
import { Link, navigate, useParams } from '@/lib/router';
import { useReady } from '@/lib/session';
import { store } from '@/lib/storage';
import { Avatar, Doodle, Growing, Sheet, useToast } from '@/ui/kit';

type Item = PageItem & { draft?: boolean };

export default function Today() {
  const { me, identity } = useReady();
  const meFull = useMe();
  const toast = useToast();
  const qc = useQueryClient();
  const today = useToday();
  const params = useParams<{ day?: string }>();
  const day = params.day ?? today;
  const q = useMyDay(day);
  const { circles } = useCircles();
  const ring = useKeyring();
  const active = useMemo(() => circles.filter((c) => c.status === 'active' && c.me?.state === 'active'), [circles]);
  const sealed = !!q.data?.sealedAt;
  const editable = !sealed && sealableDays(me.user.tz).includes(day);

  // Audiens bawaan halaman: semua lingkaran aktif (bisa diubah).
  const [pageCircles, setPageCircles] = useState<string[] | null>(() => store.json<string[]>('pageCircles'));
  const circleIds = (pageCircles ?? active.map((c) => c.id)).filter((id) => active.some((c) => c.id === id));
  const defaultAudience: Audience = circleIds.length ? 'circle' : 'self';

  const [items, setItems] = useState<Item[]>([]);
  const loaded = useRef<string | null>(null);
  useEffect(() => {
    if (!q.data || !ring) return;
    if (loaded.current === `${day}:${q.data.sealedAt ?? ''}`) return;
    loaded.current = `${day}:${q.data.sealedAt ?? ''}`;
    setItems(
      q.data.drops
        .map((w) => ({ w, o: openDrop(w, ring) }))
        .filter((x) => x.o.payload)
        .map(({ w, o }) => ({
          id: w.id,
          authorId: w.authorId,
          payload: o.payload!,
          audience: w.audience,
          circleIds: w.circleIds,
          mediaIds: w.mediaIds,
          reactions: w.reactions,
          footnotes: [],
        })),
    );
  }, [q.data, ring, day]);

  const [selected, setSelected] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [sheet, setSheet] = useState<null | 'sticker' | 'mood' | 'song' | 'voice' | 'prompt' | 'silent' | 'audience'>(null);
  const [sealing, setSealing] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const pageBox = useRef<HTMLDivElement>(null);
  const timers = useRef<Record<string, number>>({});

  const ctx = { me: meFull, identity, circles };
  const draftOf = (it: Item, kind?: DropKind): DraftDrop => ({
    day,
    payload: { ...it.payload, kind: kind ?? it.payload.kind },
    audience: it.audience,
    circleIds: it.audience === 'self' ? [] : it.circleIds,
    mediaIds: it.mediaIds,
  });

  const patch = (id: string, f: (it: Item) => Item) => setItems((xs) => xs.map((x) => (x.id === id ? f(x) : x)));

  const save = useCallback(
    (it: Item, delay = 500) => {
      if (it.draft || it.pending) return;
      window.clearTimeout(timers.current[it.id]);
      timers.current[it.id] = window.setTimeout(() => {
        updateDrop(it.id, draftOf(it), ctx).catch((e) => toast((e as Error).message));
      }, delay);
    },
    [ctx],
  );

  const create = async (payload: DropPayload, extra: { mediaIds?: string[]; meta?: DraftDrop['meta']; localUrl?: string; draft?: boolean } = {}) => {
    const id = newDropId();
    const it: Item = {
      id,
      authorId: me.user.id,
      payload,
      audience: defaultAudience,
      circleIds,
      mediaIds: extra.mediaIds ?? [],
      reactions: [],
      footnotes: [],
      draft: extra.draft,
      localUrl: extra.localUrl,
    };
    setItems((xs) => [...xs, it]);
    if (!extra.draft) await post(it, extra.meta);
    return it;
  };

  const post = async (it: Item, meta?: DraftDrop['meta']) => {
    try {
      await api.post('/drops', buildDropBody({ ...draftOf(it), meta }, { ...ctx, id: it.id }));
      patch(it.id, (x) => ({ ...x, draft: false, pending: false }));
      void qc.invalidateQueries({ queryKey: qk.myDay(day) });
    } catch (e) {
      toast((e as Error).message);
      setItems((xs) => xs.filter((x) => x.id !== it.id));
    }
  };

  const nextZ = () => items.reduce((m, x) => Math.max(m, x.payload.layout?.z ?? 0), 0) + 1;
  const base = (kind: DropKind, layout: Partial<PageLayout> = {}): DropPayload => ({
    v: 1,
    kind,
    ...nowParts(me.user.tz),
    tz: me.user.tz,
    cityId: me.user.cityId ?? undefined,
    layout: { x: 120, y: 260, w: defaultWidth(kind), rot: 0, z: nextZ(), ...layout },
  });

  /** Tengah layar dalam koordinat halaman — tempat stiker & elemen baru muncul. */
  const viewCenter = (w: number) => {
    const r = pageBox.current?.getBoundingClientRect();
    if (!r) return { x: 200, y: 300 };
    const s = r.width / PAGE_W;
    const y = (window.innerHeight / 2 - r.top) / s;
    return { x: Math.round(PAGE_W / 2 - w / 2 + (Math.random() - 0.5) * 120), y: Math.round(Math.max(200, y - 80)) };
  };

  // ── Aksi ──────────────────────────────────────────────────────────────────

  const addText = (x: number, y: number, extra: Partial<DropPayload> = {}, meta?: DraftDrop['meta']) => {
    const id = newDropId();
    const payload = { ...base((extra.kind as DropKind) ?? 'text', { x, y }), ...extra };
    const it: Item = { id, authorId: me.user.id, payload, audience: defaultAudience, circleIds, mediaIds: [], reactions: [], footnotes: [], draft: true };
    pendingMeta.current[id] = meta;
    setItems((xs) => [...xs, it]);
    setSelected(id);
    setEditing(id);
  };
  const pendingMeta = useRef<Record<string, DraftDrop['meta']>>({});

  const endEdit = (id: string) => {
    setEditing(null);
    const it = items.find((x) => x.id === id);
    if (!it) return;
    const empty = !it.payload.text?.trim();
    if (it.draft) {
      if (empty) setItems((xs) => xs.filter((x) => x.id !== id));
      else void post(it, pendingMeta.current[id]);
    } else if (empty && ['text', 'idea', 'word'].includes(it.payload.kind)) {
      void remove(id);
    } else save(it, 0);
  };

  const remove = async (id: string) => {
    const it = items.find((x) => x.id === id);
    setItems((xs) => xs.filter((x) => x.id !== id));
    setSelected(null);
    if (it && !it.draft) await api.del(`/drops/${id}`).catch((e) => toast((e as Error).message));
  };

  const addPhotos = async (files: File[], x?: number, y?: number) => {
    for (const [i, f] of files.slice(0, 6).entries()) {
      const pos = x !== undefined && y !== undefined ? { x: x + i * 40, y: y + i * 40 } : viewCenter(460);
      const localUrl = URL.createObjectURL(f);
      const id = newDropId();
      const payload = base('photo', { ...pos, rot: Math.round((Math.random() - 0.5) * 8) });
      const it: Item = { id, authorId: me.user.id, payload, audience: defaultAudience, circleIds, mediaIds: [], reactions: [], footnotes: [], pending: true, localUrl };
      setItems((xs) => [...xs, it]);
      try {
        const ref = await uploadPhoto(f);
        primeMedia(ref.id, localUrl);
        let latest: Item | undefined;
        setItems((xs) =>
          xs.map((x2) => {
            if (x2.id !== id) return x2;
            latest = { ...x2, payload: { ...x2.payload, media: [ref] }, mediaIds: [ref.id] };
            return latest;
          }),
        );
        await post(latest ?? { ...it, payload: { ...payload, media: [ref] }, mediaIds: [ref.id] });
      } catch (e) {
        toast((e as Error).message);
        setItems((xs) => xs.filter((x2) => x2.id !== id));
      }
    }
  };

  // Tempel gambar dari papan klip.
  useEffect(() => {
    if (!editable) return;
    const onPaste = (e: ClipboardEvent) => {
      const files = [...(e.clipboardData?.files ?? [])].filter((f) => f.type.startsWith('image/'));
      if (files.length) {
        e.preventDefault();
        void addPhotos(files);
      }
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  });

  const setLayout = (id: string, layout: PageLayout) => {
    const it = items.find((x) => x.id === id);
    if (!it) return;
    const next = { ...it, payload: { ...it.payload, layout } };
    patch(id, () => next);
    save(next, 300);
  };

  const setText = (id: string, text: string) => {
    const it = items.find((x) => x.id === id);
    if (!it) return;
    const next = { ...it, payload: { ...it.payload, text } };
    patch(id, () => next);
    if (!it.draft) save(next, 900);
  };

  const restyle = (id: string, f: (p: DropPayload) => DropPayload, audience?: Audience) => {
    const it = items.find((x) => x.id === id);
    if (!it) return;
    const next: Item = { ...it, payload: f(it.payload), ...(audience ? { audience, circleIds: audience === 'self' ? [] : circleIds } : {}) };
    patch(id, () => next);
    save(next, 0);
  };

  // ── Hari, kartu, pertanyaan ───────────────────────────────────────────────

  const primary = active[0];
  const card = useMemo(
    () => dailyCardFor({ userId: me.user.id, day, kind: primary?.kind ?? 'duo', ownedDecks: meFull.ownedDecks, rare: { circleCreatedDay: primary?.createdDay, tzOffsetMin: tzOffsetMinutes(me.user.tz) } }).card,
    [me.user.id, day, primary?.id],
  );
  const question = primary?.settings.nightQuestion ? nightQuestionFor(primary.id, day, primary.kind) : null;
  const city = getCity(me.user.cityId);
  const sunset = city ? sunsetUtc(day, city.lat, city.lon) : null;
  const sunsetLabel = sunset ? new Intl.DateTimeFormat('id-ID', { timeZone: me.user.tz, hour: '2-digit', minute: '2-digit' }).format(sunset) : null;
  const mood = items.find((x) => x.payload.mood)?.payload.mood;

  if (q.isLoading || !ring) return <Growing label="membuka halaman…" />;

  const head = (
    <div className="row between" style={{ alignItems: 'flex-start' }}>
      <div>
        <div className="hand" style={{ fontSize: 'clamp(30px, 6.5vw, 58px)' }}>
          {dayName(day)}, {formatDayLong(day, false).toLowerCase()}
        </div>
        <div className="tiny ink-soft">
          #{dayOfYear(day)} · {city ? `${city.name} · ` : ''}
          {zoneLabel(me.user.tz)}
          {sunsetLabel ? ` · senja ${sunsetLabel}` : ''}
        </div>
      </div>
      <Doodle id={sealed ? gardenDoodleFor(`${me.user.id}:${day}`).id : 'tunas'} size="clamp(44px, 10vw, 86px)" draw={sealed} className={sealed ? '' : 'sway'} style={{ opacity: sealed ? 1 : 0.35 }} />
    </div>
  );

  const selectedItem = items.find((x) => x.id === selected);

  return (
    <main className="screen" style={{ maxWidth: 760 }}>
      {/* Bilah atas: siapa yang menjalani hari ini bersamamu */}
      <div className="row between" style={{ padding: '4px 2px 14px' }}>
        <Link to="/" className="row" aria-label="beranda">
          <Doodle id="tunas" size={28} />
          <span className="h2">sehari</span>
        </Link>
        <div className="row" style={{ gap: 4 }}>
          {active.slice(0, 3).map((c) => (
            <TogetherChip key={c.id} c={c} meId={me.user.id} day={day} />
          ))}
        </div>
      </div>

      {params.day && day !== today ? (
        <div className="card flat small row between" style={{ marginBottom: 12 }}>
          <span>{sealed ? 'Halaman ini sudah tersegel.' : editable ? 'Halaman kemarin masih bisa disegel sampai 04.00.' : 'Hari ini hilang di kabut — tidak apa-apa.'}</span>
          <Link to="/hari" className="pill">hari ini</Link>
        </div>
      ) : null}

      <div ref={pageBox}>
        <Page
          items={items}
          editable={editable}
          viewerId={me.user.id}
          selectedId={selected}
          editingId={editing}
          onSelect={(id) => {
            if (editing && id !== editing) endEdit(editing);
            setSelected(id);
          }}
          onEdit={(id) => {
            const it = items.find((x) => x.id === id);
            if (it && (it.payload.text !== undefined || ['text', 'idea', 'word', 'card', 'answer', 'expedition'].includes(it.payload.kind))) setEditing(id);
            else if (it?.payload.kind === 'photo') {
              const cap = window.prompt('keterangan foto', it.payload.text ?? '');
              if (cap !== null) restyle(id, (p) => ({ ...p, text: cap.trim() || undefined }));
            }
          }}
          onText={setText}
          onEndEdit={endEdit}
          onLayout={setLayout}
          onCreateAt={(x, y) => addText(x, y)}
          onFiles={(files, x, y) => void addPhotos(files, x, y)}
          head={head}
          sealed={sealed}
          mood={mood}
          renderTools={(it) => (
            <>
              {['text', 'idea', 'card', 'answer'].includes(it.payload.kind) ? (
                <>
                  <button onClick={() => restyle(it.id, (p) => ({ ...p, style: { ...p.style, font: p.style?.font === 'hand' ? 'mono' : 'hand' } }))}>{it.payload.style?.font === 'hand' ? 'mesin tik' : 'tulisan tangan'}</button>
                  <button
                    onClick={() =>
                      restyle(it.id, (p) => {
                        const order = [TEXT_SIZES.s, TEXT_SIZES.m, TEXT_SIZES.l, TEXT_SIZES.xl];
                        const i = order.indexOf((p.style?.size ?? TEXT_SIZES.m) as (typeof order)[number]);
                        return { ...p, style: { ...p.style, size: order[(i + 1) % order.length] } };
                      })
                    }>
                    ukuran
                  </button>
                  <button onClick={() => restyle(it.id, (p) => ({ ...p, style: { ...p.style, color: p.style?.color ? undefined : 'var(--ink)' } }))}>{it.payload.style?.color ? 'hitam' : 'tinta'}</button>
                </>
              ) : null}
              {it.payload.kind === 'photo' ? <button onClick={() => { const cap = window.prompt('keterangan foto', it.payload.text ?? ''); if (cap !== null) restyle(it.id, (p) => ({ ...p, text: cap.trim() || undefined })); }}>keterangan</button> : null}
              <button onClick={() => restyle(it.id, (p) => ({ ...p, layout: { ...p.layout!, z: nextZ() } }))}>ke depan</button>
              <button onClick={() => restyle(it.id, (p) => p, it.audience === 'self' ? (circleIds.length ? 'circle' : 'self') : 'self')}>{it.audience === 'self' ? '🔒 hanya aku' : 'bersama'}</button>
              <button onClick={() => void remove(it.id)}>hapus</button>
            </>
          )}
          foot={
            sealed ? (
              <div data-paper="1" style={{ position: 'absolute', left: 0, right: 0, bottom: 30, textAlign: 'center', pointerEvents: 'none' }}>
                <Doodle id="segel-lilin" size={56} />
                <div className="tiny ink-soft">tersegel</div>
              </div>
            ) : null
          }
        />
      </div>

      {selectedItem && selectedItem.audience === 'self' ? <p className="tiny soft center">{COPY.drop.onlyMeNote}</p> : null}

      {editable ? (
        <>
          <div className="row between mt" style={{ alignItems: 'center' }}>
            <button className="pill" onClick={() => setSheet('audience')}>
              untuk: {defaultAudience === 'self' ? 'hanya aku' : active.filter((c) => circleIds.includes(c.id)).map((c) => c.name).join(' · ')}
            </button>
            <span className="tiny soft">{items.filter((x) => !x.draft).length} hal di kapsul</span>
          </div>
          <div className="mt" style={{ paddingBottom: 90 }}>
            <button className="btn" disabled={!items.some((x) => !x.draft)} onClick={() => setSealing(true)}>
              <Doodle id="segel-lilin" size={22} color="currentColor" /> {COPY.seal.cta}
            </button>
            <p className="tiny soft center">{items.length ? COPY.seal.ctaSub : COPY.seal.nothingYet}</p>
          </div>
          <nav className="toolbar" aria-label="alat halaman">
            <button onClick={() => { const c = viewCenter(560); addText(c.x, c.y); }}>
              <Doodle id="ui-teks" size={22} color="currentColor" />
              tulis
            </button>
            <button onClick={() => fileInput.current?.click()}>
              <Doodle id="ui-foto" size={22} color="currentColor" />
              foto
            </button>
            <button onClick={() => setSheet('sticker')}>
              <Doodle id="bintang-kecil" size={22} color="currentColor" />
              stiker
            </button>
            <button onClick={() => setSheet('voice')}>
              <Doodle id="ui-mikrofon" size={22} color="currentColor" />
              suara
            </button>
            <button onClick={() => setSheet('song')}>
              <Doodle id="ui-lagu" size={22} color="currentColor" />
              lagu
            </button>
            <button onClick={() => setSheet('mood')}>
              <Doodle id="ui-palet" size={22} color="currentColor" />
              warna
            </button>
            <button onClick={() => setSheet('prompt')}>
              <Doodle id="kartu" size={22} color="currentColor" />
              kartu
            </button>
            <button onClick={() => setSheet('silent')}>
              <Doodle id="lilin" size={22} color="currentColor" />
              hening
            </button>
          </nav>
          <input ref={fileInput} type="file" accept="image/*" multiple hidden onChange={(e) => { const f = [...(e.target.files ?? [])]; e.target.value = ''; if (f.length) void addPhotos(f); }} />
        </>
      ) : (
        <div className="mt-lg col" style={{ paddingBottom: 100 }}>
          {sealed
            ? active.map((c) => (
                <Link key={c.id} to={`/l/${c.id}/hari/${day}`} className="btn soft">
                  <Doodle id="buku-terbuka" size={22} /> buka bersama {c.name}
                </Link>
              ))
            : null}
        </div>
      )}

      <StickerSheet
        open={sheet === 'sticker'}
        onClose={() => setSheet(null)}
        onPick={(id) => {
          setSheet(null);
          const c = viewCenter(150);
          void create({ ...base('sticker', { ...c, w: 150, rot: Math.round((Math.random() - 0.5) * 20) }), sticker: id });
        }}
      />
      <MoodSheet
        open={sheet === 'mood'}
        onClose={() => setSheet(null)}
        onPick={(m: MoodCode) => {
          setSheet(null);
          void create({ ...base('mood', { x: 560, y: 175, w: 340, rot: -2 }), mood: m });
        }}
      />
      <SongSheet
        open={sheet === 'song'}
        onClose={() => setSheet(null)}
        onSave={(song: SongRef, note) => {
          setSheet(null);
          void create({ ...base('song', { ...viewCenter(420), rot: 2 }), song, text: note || undefined });
        }}
      />
      <VoiceSheet
        open={sheet === 'voice'}
        onClose={() => setSheet(null)}
        maxSeconds={meFull.limits.voiceSeconds}
        onDone={async (blob, ms) => {
          setSheet(null);
          try {
            const ref = await uploadBytes(new Uint8Array(await blob.arrayBuffer()), blob.type, { durationMs: ms });
            await create({ ...base('voice', { ...viewCenter(420), rot: -2 }), media: [ref] }, { mediaIds: [ref.id] });
          } catch (e) {
            toast((e as Error).message);
          }
        }}
      />
      <PromptSheet
        open={sheet === 'prompt'}
        onClose={() => setSheet(null)}
        card={card}
        question={question}
        onPick={(p) => {
          setSheet(null);
          const c = viewCenter(480);
          addText(c.x, c.y, { kind: p.kind, prompt: p.prompt, layout: { x: c.x, y: c.y, w: 480, rot: -1.5, z: nextZ() } }, { cardId: p.cardId, questionId: p.questionId });
        }}
      />
      <SilentSheet
        open={sheet === 'silent'}
        onClose={() => setSheet(null)}
        onSave={(m, text) => {
          setSheet(null);
          void create({ ...base('silent', { ...viewCenter(320) }), mood: m, text: text || undefined });
        }}
      />
      <Sheet open={sheet === 'audience'} onClose={() => setSheet(null)} title="halaman ini untuk">
        <div className="col">
          {active.map((c) => {
            const on = circleIds.includes(c.id);
            return (
              <button key={c.id} className={`pill ${on ? 'active' : ''}`} style={{ justifyContent: 'flex-start', padding: '12px 16px' }} onClick={() => {
                const next = on ? circleIds.filter((x) => x !== c.id) : [...circleIds, c.id];
                setPageCircles(next);
                store.set('pageCircles', JSON.stringify(next));
              }}>
                <Doodle id={c.doodle} size={20} color="currentColor" /> {c.name}
              </button>
            );
          })}
          <button className={`pill ${circleIds.length === 0 ? 'active' : ''}`} style={{ justifyContent: 'flex-start', padding: '12px 16px' }} onClick={() => { setPageCircles([]); store.set('pageCircles', '[]'); }}>
            🔒 hanya aku
          </button>
          <p className="tiny soft">Berlaku untuk yang kamu tambahkan setelah ini. Tiap elemen juga bisa diubah sendiri lewat tombol “bersama / hanya aku”.</p>
        </div>
      </Sheet>

      {sealing ? (
        <SealCeremony
          day={day}
          circles={active}
          onClose={() => setSealing(false)}
          onSealed={() => {
            loaded.current = null;
            void qc.invalidateQueries();
          }}
          onOpen={(cid) => navigate(`/l/${cid}/hari/${day}`)}
        />
      ) : null}
    </main>
  );
}

function TogetherChip({ c, meId, day }: { c: CircleView; meId: string; day: string }) {
  const others = c.others;
  return (
    <Link to={`/l/${c.id}/hari/${day}`} className="row card flat" style={{ padding: '4px 10px 4px 4px', borderRadius: 999, gap: 4 }} title={c.name}>
      {others.slice(0, 3).map((m) => (
        <Avatar key={m.userId} doodle={m.doodle} size={26} sealed={c.todaySealed[m.userId]} title={`${m.penName}${c.todaySealed[m.userId] ? ' · tersegel' : ''}`} />
      ))}
      <span className="tiny ink">{c.todaySealed[meId] ? '✓' : c.streak.current || ''}</span>
    </Link>
  );
}
