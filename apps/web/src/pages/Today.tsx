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
import { PrintSheet } from '@/editor/PrintSheet';
import { NiatCard, niatSkipped, rememberNiat, skipNiat } from '@/editor/Niat';
import { SealCeremony } from '@/editor/Seal';
import { MoodSheet, PromptSheet, SilentSheet, SongSheet, StickerSheet, VoiceSheet } from '@/editor/Sheets';
import { TEXT_SIZES } from '@/editor/elements';
import { FILLS, isSpecial, LINES, specialWidth } from '@/editor/stickers';
import { DockBtn, EmptyPage, Tile, useKeyboardInset } from '@/editor/dock';
import { api } from '@/lib/api';
import { buildDropBody, type CircleView, type DraftDrop, newDropId, nowParts, openDrop, qk, updateDrop, useCircles, useKeyring, useMe, useMyDay, useToday } from '@/lib/data';
import { primeMedia, uploadBytes, uploadPhoto } from '@/lib/media';
import { Link, navigate, useParams, usePath } from '@/lib/router';
import { useReady } from '@/lib/session';
import { takePendingStrip } from '@/lib/photobox/booth';
import { store } from '@/lib/storage';
import { Avatar, Doodle, Growing, MusicToggle, Sheet, Toggle, useToast } from '@/ui/kit';
import { sound } from '@/lib/sound';
import { countdown, fmtWhen, useMeets } from '@/lib/meets';

type Item = PageItem & { draft?: boolean; pageCircleId?: string | null };

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
  const mainSealed = !!q.data?.sealedAt;
  const sealedCircles = q.data?.sealedCircles ?? [];
  // Halaman terpisah: lingkaran yang memilih "halaman sendiri", lingkaran yang
  // belum terjangkau halaman utama yang sudah tersegel (susulan), dan yang sudah punya isi.
  const ownPageIds = new Set(active.filter((c) => c.me?.ownPage).map((c) => c.id));
  const withPage = new Set((q.data?.drops ?? []).map((d) => d.pageCircleId).filter((x): x is string => !!x));
  const sepCircles = active.filter((c) => ownPageIds.has(c.id) || withPage.has(c.id) || (mainSealed && !sealedCircles.includes(c.id)));
  const [pageSel, setPageSel] = useState<string>('main');
  const [printing, setPrinting] = useState(false);
  // Draf dari lembar tulis yang belum sempat "selesai" (aplikasi tertutup, dsb.).
  const [lost, setLost] = useState<string | null>(() => {
    const d = store.json<{ text: string; at: number }>('lastDraft');
    return d && d.text.trim() && Date.now() - d.at < 2 * 86400_000 ? d.text : null;
  });
  const forgetLost = () => {
    setLost(null);
    store.del('lastDraft');
  };
  const page = pageSel !== 'main' && sepCircles.some((c) => c.id === pageSel) ? pageSel : 'main';
  const pageCircle = page === 'main' ? null : active.find((c) => c.id === page)!;
  const sealed = page === 'main' ? mainSealed : sealedCircles.includes(page);
  const editable = !sealed && sealableDays(me.user.tz).includes(day);

  // Audiens halaman: semua lingkaran aktif, kecuali pernah diatur sendiri.
  // `seen` = lingkaran yang sudah pernah kamu putuskan; lingkaran baru di luar
  // itu ditawarkan dulu (tidak pernah ikut dibagikan diam-diam, tidak pula hilang).
  const [pageCircles, setPageCircles] = useState<string[] | null>(() => store.json<string[]>('pageCircles'));
  const [seenCircles, setSeenCircles] = useState<string[]>(() => store.json<string[]>('pageCirclesSeen') ?? store.json<string[]>('pageCircles') ?? []);
  const activeIds = active.filter((c) => !ownPageIds.has(c.id)).map((c) => c.id);
  const mainCircleIds = (pageCircles ?? activeIds).filter((id) => activeIds.includes(id));
  const circleIds = page === 'main' ? mainCircleIds : [page];
  const defaultAudience: Audience = circleIds.length ? 'circle' : 'self';
  const newCircles = pageCircles === null || page !== 'main' ? [] : active.filter((c) => activeIds.includes(c.id) && !seenCircles.includes(c.id) && !pageCircles.includes(c.id));
  const choosePage = (next: string[], seen: string[] = activeIds) => {
    setPageCircles(next);
    store.set('pageCircles', JSON.stringify(next));
    const s2 = [...new Set([...seenCircles, ...seen])];
    setSeenCircles(s2);
    store.set('pageCirclesSeen', JSON.stringify(s2));
  };

  const [items, setItems] = useState<Item[]>([]);
  const loaded = useRef<string | null>(null);
  useEffect(() => {
    if (!q.data || !ring) return;
    const key = `${day}:${q.data.sealedAt ?? ''}:${(q.data.sealedCircles ?? []).join(',')}`;
    if (loaded.current === key) return;
    loaded.current = key;
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
          pageCircleId: w.pageCircleId,
          mediaIds: w.mediaIds,
          reactions: w.reactions,
          footnotes: [],
        })),
    );
  }, [q.data, ring, day]);

  const [selected, setSelected] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [sheet, setSheet] = useState<null | 'sticker' | 'mood' | 'song' | 'voice' | 'prompt' | 'silent' | 'audience' | 'more' | 'caption' | 'save'>(null);
  const [caption, setCaption] = useState('');
  const [captionFor, setCaptionFor] = useState<string | null>(null);
  const kb = useKeyboardInset();
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
    pageCircleId: it.pageCircleId ?? undefined,
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

  // Semua yang "bersama" di halaman ini mengikuti audiens halaman: kalau ada
  // lingkaran baru (atau dilepas), isi yang sudah ada disegel ulang untuk mereka.
  const pageKey = [...mainCircleIds].sort().join(',');
  useEffect(() => {
    if (mainSealed || !sealableDays(me.user.tz).includes(day) || !ring || !mainCircleIds.length) return;
    if (mainCircleIds.some((id) => !active.find((c) => c.id === id)?.keys.get(active.find((c) => c.id === id)!.currentEpoch))) return;
    for (const it of items) {
      if (it.pageCircleId || it.audience !== 'circle' || it.draft || it.pending || it.authorId !== me.user.id) continue;
      if ([...it.circleIds].sort().join(',') === pageKey) continue;
      const next = { ...it, circleIds: mainCircleIds };
      patch(it.id, () => next);
      save(next, 0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageKey, items, mainSealed, ring]);

  const create = async (payload: DropPayload, extra: { mediaIds?: string[]; meta?: DraftDrop['meta']; localUrl?: string; draft?: boolean } = {}) => {
    const id = newDropId();
    const it: Item = {
      id,
      authorId: me.user.id,
      payload,
      audience: defaultAudience,
      circleIds,
      pageCircleId: pageCircle?.id ?? null,
      mediaIds: extra.mediaIds ?? [],
      reactions: [],
      footnotes: [],
      draft: extra.draft,
      localUrl: extra.localUrl,
    };
    setItems((xs) => [...xs, it]);
    sound.play('pop');
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
  // Elemen baru muncul di tengah layar, tapi mencari ruang kosong supaya tidak
  // menumpuk di atas foto atau tulisan yang sudah ada.
  const viewCenter = (w: number, h = w * 0.62) => {
    const r = pageBox.current?.getBoundingClientRect();
    if (!r) return { x: 200, y: 300 };
    const s = r.width / PAGE_W;
    const vy = (window.innerHeight / 2 - r.top) / s;
    const base = { x: Math.round(PAGE_W / 2 - w / 2 + (Math.random() - 0.5) * 120), y: Math.round(Math.max(200, vy - 80)) };
    const boxes = [...pageBox.current!.querySelectorAll<HTMLElement>('.el')].map((el) => {
      const b = el.getBoundingClientRect();
      return { x: (b.left - r.left) / s, y: (b.top - r.top) / s, w: b.width / s, h: b.height / s };
    });
    const hit = (x: number, y: number) => boxes.some((b) => x < b.x + b.w - 24 && x + w > b.x + 24 && y < b.y + b.h - 24 && y + h > b.y + 24);
    if (!hit(base.x, base.y)) return base;
    const clamp = (x: number) => Math.round(Math.max(20, Math.min(PAGE_W - w - 20, x)));
    const xs = [base.x, 40, PAGE_W - w - 40, PAGE_W / 2 - w / 2].map(clamp);
    for (let dy = 50; dy < 3000; dy += 50)
      for (const y of [base.y + dy, base.y - dy]) {
        if (y < 190) continue;
        for (const x of xs) if (!hit(x, y)) return { x, y: Math.round(y) };
      }
    // Halaman penuh: taruh di bawah elemen paling bawah (halaman ikut memanjang).
    const bottom = boxes.reduce((m, b) => Math.max(m, b.y + b.h), 0);
    return { x: clamp(PAGE_W / 2 - w / 2), y: Math.round(bottom + 40) };
  };

  // ── Aksi ──────────────────────────────────────────────────────────────────

  const addText = (x: number, y: number, extra: Partial<DropPayload> = {}, meta?: DraftDrop['meta']) => {
    const id = newDropId();
    const payload = { ...base((extra.kind as DropKind) ?? 'text', { x, y }), ...extra };
    const it: Item = { id, authorId: me.user.id, payload, audience: defaultAudience, circleIds, pageCircleId: pageCircle?.id ?? null, mediaIds: [], reactions: [], footnotes: [], draft: true };
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

  const addPhotos = async (files: File[], x?: number, y?: number, opts: { tags?: string[]; w?: number } = {}) => {
    for (const [i, f] of files.slice(0, 6).entries()) {
      const w = opts.w ?? 460;
      const pos = x !== undefined && y !== undefined ? { x: x + i * 40, y: y + i * 40 } : viewCenter(w, opts.w ? w * 2.6 : 540);
      const localUrl = URL.createObjectURL(f);
      const id = newDropId();
      const payload = { ...base('photo', { ...pos, w, rot: Math.round((Math.random() - 0.5) * 8) }), ...(opts.tags ? { tags: opts.tags } : {}) };
      const it: Item = { id, authorId: me.user.id, payload, audience: defaultAudience, circleIds, pageCircleId: pageCircle?.id ?? null, mediaIds: [], reactions: [], footnotes: [], pending: true, localUrl };
      setItems((xs) => [...xs, it]);
      sound.play('pop');
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

  // Datang dari kartu bersama / pertanyaan malam: ?prompt=…&kind=…
  const { search } = usePath();
  useEffect(() => {
    const prompt = search.get('prompt');
    if (!prompt || q.isLoading || !ring) return;
    // Pertanyaan dari lingkaran yang punya halaman sendiri: tempel di halamannya.
    const target = search.get('circleId');
    if (target && ownPageIds.has(target) && page !== target) return setPageSel(target);
    if (!editable) return;
    const kind = (search.get('kind') as DropKind) || 'card';
    const c = viewCenter(480);
    if (kind === 'photo') fileInput.current?.click();
    else addText(c.x, c.y, { kind, prompt, layout: { x: c.x, y: c.y, w: 480, rot: -1.5, z: nextZ() } }, { cardId: search.get('cardId') ?? undefined, questionId: search.get('questionId') ?? undefined, expeditionId: search.get('expeditionId') ?? undefined, expeditionDay: search.get('expeditionDay') ? Number(search.get('expeditionDay')) : undefined });
    navigate('/hari', { replace: true });
  }, [search.get('prompt'), editable, q.isLoading, !!ring, page, ownPageIds.size]);

  // Strip dari photobox: dibawa lewat memori, ditempel sebagai strip (bukan polaroid).
  useEffect(() => {
    if (search.get('tempel') !== 'photobox' || !editable || q.isLoading || !ring) return;
    const b = takePendingStrip();
    navigate('/hari', { replace: true });
    if (b) void addPhotos([new File([b], 'photobox.jpg', { type: b.type })], undefined, undefined, { tags: ['photobox'], w: 380 });
  }, [editable, q.isLoading, !!ring]);

  // Pintasan aplikasi (PWA): ?cerita=1 membuka rekaman, ?niat=1 menampilkan Niat Pagi lagi.
  useEffect(() => {
    if (!editable || q.isLoading) return;
    if (search.get('cerita')) setSheet('voice');
    if (search.get('niat')) setNiatOff(false);
    if (search.get('cerita') || search.get('niat')) navigate('/hari', { replace: true });
  }, [editable, q.isLoading]);

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
  // Isi halaman yang sedang dibuka (utama, atau halaman terpisah satu lingkaran).
  const pageItems = items.filter((x) => (x.pageCircleId ?? null) === (pageCircle?.id ?? null));
  const niat = items.find((x) => x.payload.kind === 'intent' && !x.pageCircleId && x.authorId === me.user.id)?.payload.text;
  const [niatOff, setNiatOff] = useState(() => niatSkipped(day));
  useEffect(() => {
    if (niat) rememberNiat(day, niat);
  }, [niat, day]);
  const showNiat = editable && page === 'main' && day === today && !!q.data && !niat && !niatOff;
  const mood = pageItems.find((x) => x.payload.mood)?.payload.mood;

  if (q.isLoading || !ring) return <Growing label="membuka halaman…" />;

  const openCaption = (it: Item) => {
    setCaptionFor(it.id);
    setCaption(it.payload.text ?? '');
    setSheet('caption');
  };
  const saveCaption = () => {
    if (captionFor) restyle(captionFor, (p) => ({ ...p, text: caption.trim() || undefined }));
    setSheet(null);
  };
  const addSticker = (id: string) => {
    const w = isSpecial(id) ? specialWidth(id) : 150;
    const c = viewCenter(w);
    const fill = id.startsWith('cap:') ? undefined : FILLS[Math.floor(Math.random() * 6)];
    void create({ ...base('sticker', { ...c, w, rot: Math.round((Math.random() - 0.5) * (id.startsWith('washi:') ? 30 : 20)) }), sticker: id, text: id.startsWith('cap:') ? day : undefined, style: fill ? { fill } : undefined });
  };
  const cycle = <T,>(list: readonly T[], cur: T | undefined) => list[(Math.max(0, list.indexOf(cur as T)) + 1) % list.length]!;
  const toolsFor = (it: Item) => {
    const k = it.payload.kind;
    const p = it.payload;
    const common = (
      <>
        <DockBtn icon="ui-tambah" label="ke depan" onClick={() => restyle(it.id, (x) => ({ ...x, layout: { ...x.layout!, z: nextZ() } }))} />
        <DockBtn icon={it.audience === 'self' ? 'ui-gembok' : 'ui-gembok-buka'} label={it.audience === 'self' ? 'hanya aku' : 'bersama'} onClick={() => restyle(it.id, (x) => x, it.audience === 'self' ? (circleIds.length ? 'circle' : 'self') : 'self')} />
        <DockBtn icon="ui-hapus" label="hapus" danger onClick={() => void remove(it.id)} />
      </>
    );
    if (['text', 'idea', 'card', 'answer', 'word', 'expedition'].includes(k))
      return (
        <>
          <DockBtn icon="pena" label="ubah" onClick={() => setEditing(it.id)} />
          <DockBtn icon="ui-teks" label={p.style?.font === 'hand' ? 'tangan' : p.style?.font === 'serif' ? 'sastra' : 'mesin tik'} onClick={() => restyle(it.id, (x) => ({ ...x, style: { ...x.style, font: cycle(['mono', 'hand', 'serif'] as const, x.style?.font ?? 'mono') } }))} />
          <DockBtn icon="ui-cari" label="ukuran" onClick={() => restyle(it.id, (x) => ({ ...x, style: { ...x.style, size: cycle([TEXT_SIZES.s, TEXT_SIZES.m, TEXT_SIZES.l, TEXT_SIZES.xl], (x.style?.size ?? TEXT_SIZES.m) as 38) } }))} />
          <DockBtn swatch={p.style?.color ?? 'var(--text)'} label="warna" onClick={() => restyle(it.id, (x) => ({ ...x, style: { ...x.style, color: cycle(['var(--text)', ...LINES] as const, (x.style?.color ?? 'var(--text)') as 'var(--text)') } }))} />
          {common}
        </>
      );
    if (k === 'sticker')
      return (
        <>
          {!p.sticker?.startsWith('cap:') ? <DockBtn swatch={p.style?.fill ?? 'none'} label="isi" onClick={() => restyle(it.id, (x) => ({ ...x, style: { ...x.style, fill: cycle(FILLS, (x.style?.fill ?? 'none') as 'none') } }))} /> : null}
          {!p.sticker?.startsWith('washi:') ? <DockBtn swatch={p.color ?? 'var(--ink)'} label="garis" onClick={() => restyle(it.id, (x) => ({ ...x, color: cycle(LINES, (x.color ?? 'var(--ink)') as 'var(--ink)') }))} /> : null}
          {!isSpecial(p.sticker) ? <DockBtn icon="bingkai-polaroid" label={p.style?.cut === false ? 'tanpa tepi' : 'tepi putih'} onClick={() => restyle(it.id, (x) => ({ ...x, style: { ...x.style, cut: x.style?.cut === false } }))} /> : null}
          {common}
        </>
      );
    if (k === 'photo')
      return (
        <>
          <DockBtn icon="pena" label="keterangan" onClick={() => openCaption(it)} />
          {common}
        </>
      );
    return common;
  };

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

  const tools = selectedItem && !selectedItem.draft && !selectedItem.pending ? toolsFor(selectedItem) : null;
  const names = active.filter((c) => circleIds.includes(c.id)).map((c) => c.name).join(' · ');
  const susulan = mainSealed ? sepCircles.filter((c) => !ownPageIds.has(c.id) && !sealedCircles.includes(c.id)) : [];
  const toggleOwnPage = async (c: CircleView, on: boolean) => {
    try {
      await api.put(`/circles/${c.id}/own-page`, { ownPage: on });
      await qc.invalidateQueries({ queryKey: qk.circles });
      if (on) setPageSel(c.id);
      sound.play('pop');
    } catch (e) {
      toast((e as Error).message);
    }
  };

  return (
    <main className="screen today" style={{ maxWidth: 760 }}>
      <header className="today-top">
        <Link to="/" className="row" aria-label="beranda">
          <Doodle id="tunas" size={26} />
          <span className="h2">sehari</span>
        </Link>
        <div className="row" style={{ gap: 2 }}>
          {active.slice(0, 2).map((c) => (
            <TogetherChip key={c.id} c={c} meId={me.user.id} day={day} />
          ))}
          <Link to="/lingkaran" className="icon-btn" aria-label="lingkaran">
            <Doodle id="ui-lingkaran" size={22} />
          </Link>
          <MusicToggle />
          <Link to="/karya" className="icon-btn" aria-label="karya">
            <Doodle id="pena" size={22} />
          </Link>
          <Link to="/kenangan" className="icon-btn" aria-label="kenangan">
            <Doodle id="ui-kenangan" size={22} />
          </Link>
          <Link to="/aku" className="icon-btn" aria-label="aku">
            <Avatar doodle={me.user.doodle} size={30} />
          </Link>
        </div>
      </header>

      {params.day && day !== today ? (
        <div className="card flat small row between" style={{ marginBottom: 12 }}>
          <span>{sealed ? 'Halaman ini sudah tersegel.' : editable ? 'Hari yang terlewat masih bisa ditulis dan disegel sampai 7 hari. Tulis halaman susulanmu, lalu segel untuk membuka halaman mereka.' : 'Hari ini hilang di kabut — tidak apa-apa.'}</span>
          <Link to="/hari" className="pill">hari ini</Link>
        </div>
      ) : null}

      <MeetBanner />

      {editable && lost && !items.some((x) => x.payload.text?.trim() === lost.trim()) ? (
        <div className="sticky row" style={{ background: 'var(--sticky-yellow)', gap: 10, marginBottom: 10, alignItems: 'flex-start' }}>
          <Doodle id="pena" size={24} />
          <div className="col grow" style={{ gap: 8 }}>
            <span className="small">Ada tulisan yang belum sempat tersimpan: “{lost.slice(0, 60)}{lost.length > 60 ? '…' : ''}”</span>
            <div className="row" style={{ gap: 6 }}>
              <button className="btn sm auto" onClick={() => { const c = viewCenter(560); addText(c.x, c.y, { kind: 'text', text: lost }); forgetLost(); }}>
                pulihkan
              </button>
              <button className="btn ghost sm auto" onClick={forgetLost}>
                buang
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {editable && newCircles.length ? (
        <div className="sticky row" style={{ background: 'var(--sticky-blue)', gap: 10, marginBottom: 10, alignItems: 'flex-start' }} data-testid="new-circle-prompt">
          <Doodle id="ui-lingkaran" size={26} />
          <div className="col grow" style={{ gap: 8 }}>
            <span className="small">
              Lingkaran baru: <b>{newCircles.map((c) => c.name).join(', ')}</b>. Bagikan halaman ini juga ke sana?
            </span>
            <div className="row" style={{ gap: 6 }}>
              <button className="btn sm auto" onClick={() => choosePage([...circleIds, ...newCircles.map((c) => c.id)])}>
                ya, bagikan
              </button>
              <button className="btn ghost sm auto" onClick={() => choosePage(circleIds)}>
                jangan
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {sepCircles.length ? (
        <div className="page-tabs" role="tablist" aria-label="halaman">
          <button role="tab" aria-selected={page === 'main'} className={page === 'main' ? 'on' : ''} onClick={() => setPageSel('main')}>
            <Doodle id={mainSealed ? 'segel-lilin' : 'buku'} size={16} color="currentColor" /> halaman utama
          </button>
          {sepCircles.map((c) => (
            <button key={c.id} role="tab" aria-selected={page === c.id} className={page === c.id ? 'on' : ''} onClick={() => setPageSel(c.id)} data-testid={`page-tab-${c.id}`}>
              <Doodle id={sealedCircles.includes(c.id) ? 'segel-lilin' : c.doodle} size={16} color="currentColor" /> {c.name}
            </button>
          ))}
        </div>
      ) : null}

      {page === 'main' && susulan.length && sealableDays(me.user.tz).includes(day) ? (
        <div className="sticky row" style={{ background: 'var(--sticky-green)', gap: 10, marginBottom: 10, alignItems: 'flex-start' }} data-testid="susulan-prompt">
          <Doodle id="amplop" size={26} />
          <div className="col grow" style={{ gap: 8 }}>
            <span className="small">
              <b>{susulan.map((c) => c.name).join(', ')}</b> belum menerima halamanmu hari ini. Tulis halaman susulan khusus untuk mereka?
            </span>
            <button className="btn sm auto" onClick={() => setPageSel(susulan[0]!.id)}>
              tulis halaman susulan
            </button>
          </div>
        </div>
      ) : null}

      {showNiat ? (
        <NiatCard
          day={day}
          onSkip={() => {
            skipNiat(day);
            setNiatOff(true);
          }}
          onSave={(text) => {
            rememberNiat(day, text);
            void create({ ...base('intent', { x: 90, y: 210, rot: -1.2 }), text, style: { font: 'hand', size: 54 } });
          }}
        />
      ) : null}

      {editable ? (
        <button className="for-chip" onClick={() => setSheet('audience')}>
          <span className="tiny ink-soft">{pageCircle ? 'halaman khusus' : 'untuk'}</span>
          <span className="small ink">{pageCircle ? pageCircle.name : defaultAudience === 'self' ? '🔒 hanya aku' : names}</span>
          <span className="tiny soft">· {pageItems.filter((x) => !x.draft).length} hal di kapsul</span>
        </button>
      ) : null}

      <div ref={pageBox} className="page-stack">
        <Page
          key={page}
          items={pageItems}
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
            if (it && (it.payload.text !== undefined || ['text', 'idea', 'word', 'card', 'answer', 'expedition'].includes(it.payload.kind)) && it.payload.kind !== 'photo' && it.payload.kind !== 'sticker') setEditing(id);
            else if (it?.payload.kind === 'photo') openCaption(it);
          }}
          onText={setText}
          onEndEdit={endEdit}
          onLayout={setLayout}
          onCreateAt={(x, y) => addText(x, y)}
          onFiles={(files, x, y) => void addPhotos(files, x, y)}
          head={head}
          sealed={sealed}
          mood={mood}
          margins={`${me.user.id}:${day}:${page}`}
          empty={<EmptyPage />}
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
          <div style={{ height: 120 }} />
          <nav className={`dock ${tools || editing ? 'context' : ''}`} style={{ bottom: `calc(env(safe-area-inset-bottom) + 12px + ${kb}px)` }} aria-label="alat halaman">
            {editing ? (
              <>
                <span className="dock-hint small">menulis…</span>
                <span className="grow" />
                <button className="dock-done" onMouseDown={(e) => e.preventDefault()} onClick={() => { endEdit(editing); setSelected(null); }}>
                  <Doodle id="ui-centang" size={20} color="currentColor" sw={3} /> selesai
                </button>
              </>
            ) : tools ? (
              <>
                <div className="dock-scroll">{tools}</div>
                <button className="dock-done" onClick={() => setSelected(null)} aria-label="selesai">
                  <Doodle id="ui-centang" size={20} color="currentColor" sw={3} />
                </button>
              </>
            ) : (
              <>
                <DockBtn icon="ui-teks" label="tulis" onClick={() => { const c = viewCenter(560, 170); addText(c.x, c.y); }} />
                <DockBtn icon="ui-foto" label="foto" onClick={() => fileInput.current?.click()} />
                <DockBtn icon="kilau" label="stiker" onClick={() => setSheet('sticker')} />
                <DockBtn icon="ui-tambah" label="lainnya" onClick={() => setSheet('more')} />
                <span className="grow" />
                <button className="dock-seal" disabled={!pageItems.some((x) => !x.draft)} onClick={() => { setSelected(null); setSealing(true); }} aria-label={COPY.seal.cta}>
                  <span className="wax-mini">
                    <Doodle id="tunas" size={24} color="var(--on-ink)" sw={3} />
                  </span>
                  <span className="tiny">segel</span>
                </button>
              </>
            )}
          </nav>
          <input ref={fileInput} type="file" accept="image/*" multiple hidden onChange={(e) => { const f = [...(e.target.files ?? [])]; e.target.value = ''; if (f.length) void addPhotos(f); }} />
        </>
      ) : (
        <div className="mt-lg col" style={{ paddingBottom: 100 }}>
          {sealed
            ? active.filter((c) => (pageCircle ? c.id === pageCircle.id : sealedCircles.includes(c.id) && !ownPageIds.has(c.id) && !withPage.has(c.id))).map((c) => (
                <Link key={c.id} to={`/l/${c.id}/hari/${day}`} className="btn soft">
                  <Doodle id="buku-terbuka" size={22} /> buka bersama {c.name}
                </Link>
              ))
            : null}
          {pageItems.length ? (
            <button className="btn soft" onClick={() => setSheet('save')}>
              <Doodle id="ui-unduh" size={22} /> simpan halaman (PDF / teks)
            </button>
          ) : null}
          <Link to="/kenangan" className="btn ghost">
            <Doodle id="ui-kenangan" size={22} /> ke kenangan
          </Link>
        </div>
      )}

      <Sheet open={sheet === 'more'} onClose={() => setSheet(null)} title="tambahkan">
        <div className="tile-grid">
          <Tile icon="ui-mikrofon" label="cerita suara" sub="rekam bebas, bisa jadi tulisan" onClick={() => setSheet('voice')} />
          <Tile icon="kamera" label="photobox" sub="strip foto lucu, sendiri atau berdua" onClick={() => navigate('/photobox')} />
          <Tile icon="ui-lagu" label="lagu" sub="yang diputar berulang hari ini" onClick={() => setSheet('song')} />
          <Tile icon="ui-palet" label="warna hari" sub="satu warna untuk rasa hari ini" onClick={() => setSheet('mood')} />
          <Tile icon="kartu" label="kartu & pertanyaan" sub="kalau bingung mau menulis apa" onClick={() => setSheet('prompt')} />
          <Tile icon="stempel" label="cap tanggal" sub="cap pos hari ini" onClick={() => { setSheet(null); addSticker('cap:pos'); }} />
          <Tile icon="selotip" label="selotip washi" sub="tempel di sudut foto" onClick={() => { setSheet(null); addSticker('washi:garis'); }} />
          <Tile icon="gelembung-kata" label="tentang kita" sub="kartu ngobrol yang dalam, 580+ kartu" onClick={() => navigate('/tentang-kita')} />
          <Tile icon="amplop" label="kartu ucapan" sub="tulis, hias, kirim ke WhatsApp" onClick={() => navigate('/kartu')} />
          <Tile icon="lilin" label="ruang hening" sub="hari berat boleh cuma lilin" onClick={() => setSheet('silent')} />
          <Tile icon="ui-unduh" label="simpan halaman" sub="PDF atau teks, untuk disimpan sendiri" onClick={() => setSheet('save')} />
          <Tile icon="ui-lingkaran" label="untuk siapa" sub={defaultAudience === 'self' ? 'hanya aku' : names} onClick={() => setSheet('audience')} />
        </div>
      </Sheet>
      <Sheet open={sheet === 'caption'} onClose={() => setSheet(null)} title="keterangan foto">
        <div className="col">
          <input className="field hand" style={{ fontSize: 26 }} value={caption} maxLength={120} placeholder="di mana, sama siapa, kenapa…" autoFocus onChange={(e) => setCaption(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && saveCaption()} />
          <button className="btn" onClick={saveCaption}>simpan</button>
        </div>
      </Sheet>

      <StickerSheet
        open={sheet === 'sticker'}
        onClose={() => setSheet(null)}
        onPick={(id) => {
          setSheet(null);
          addSticker(id);
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
        onDone={async (blob, ms, transcript) => {
          setSheet(null);
          try {
            const at = viewCenter(420);
            const ref = await uploadBytes(new Uint8Array(await blob.arrayBuffer()), blob.type, { durationMs: ms });
            await create({ ...base('voice', { ...at, rot: -2 }), media: [ref] }, { mediaIds: [ref.id] });
            // Transkrip jadi tulisan tepat di bawah kasetnya.
            if (transcript) await create({ ...base('text', { x: Math.max(40, at.x - 60), y: at.y + 300, w: 620, rot: 0 }), text: transcript, prompt: 'cerita suara', style: { font: 'hand', size: 38 } });
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
      {printing ? <PrintSheet day={day} items={pageItems.map((x) => x.payload)} author={me.user.penName ?? ''} place={getCity(me.user.cityId)?.name} title={pageCircle ? `untuk ${pageCircle.name}` : undefined} /> : null}

      <Sheet open={sheet === 'save'} onClose={() => setSheet(null)} title="simpan halaman ini">
        <div className="col" style={{ gap: 10 }}>
          <button
            className="btn"
            onClick={() => {
              setSheet(null);
              setSelected(null);
              // Dokumen cetak yang ditata ulang; tunggu foto terbuka dulu. Di HP pilih "Simpan sebagai PDF".
              setPrinting(true);
              const done = () => {
                setPrinting(false);
                window.removeEventListener('afterprint', done);
              };
              window.addEventListener('afterprint', done);
              // Huruf dimuat dulu (tidak dipakai di layar, jadi belum tentu sudah ada), lalu cetak.
              const fonts = ['italic 500 26px "Fraunces Variable"', '400 16px Literata', 'italic 400 16px Literata', '400 12px "IBM Plex Mono"', '700 20px Caveat'];
              void Promise.all(fonts.map((f) => document.fonts.load(f).catch(() => null))).then(() =>
                setTimeout(() => window.print(), pageItems.some((x) => x.payload.media?.length) ? 2000 : 400),
              );
            }}>
            <Doodle id="ui-cetak" size={20} color="currentColor" /> PDF / cetak
          </button>
          <button
            className="btn soft"
            onClick={() => {
              const lines = [`${dayName(day)}, ${formatDayLong(day, false)}${pageCircle ? ` · halaman untuk ${pageCircle.name}` : ''}`, ''];
              for (const it of pageItems) {
                const p = it.payload;
                const time = p.hour !== undefined ? `${String(p.hour).padStart(2, '0')}.${String(p.minute ?? 0).padStart(2, '0')} ` : '';
                const body = [p.prompt && `(${p.prompt})`, p.kind === 'photo' ? `[foto]${p.text ? ` ${p.text}` : ''}` : p.text, p.song && `[lagu] ${p.song.title} — ${p.song.artist}`].filter(Boolean).join('\n');
                if (body) lines.push(`${time}${body}`, '');
              }
              const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
              const a = document.createElement('a');
              a.href = URL.createObjectURL(blob);
              a.download = `sehari-${day}${pageCircle ? `-${pageCircle.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}` : ''}.txt`;
              a.click();
              setTimeout(() => URL.revokeObjectURL(a.href), 2000);
              setSheet(null);
              toast('Teks halaman diunduh.');
            }}>
            <Doodle id="ui-teks" size={20} color="currentColor" /> teks (.txt)
          </button>
          <p className="tiny soft" style={{ margin: 0 }}>
            Tersimpan di perangkatmu, tidak dikirim ke mana pun. Untuk setahun penuh, pakai “cetak buku Tahun Kita” di kitab lingkaran.
          </p>
        </div>
      </Sheet>

      <Sheet open={sheet === 'audience'} onClose={() => setSheet(null)} title={pageCircle ? `halaman khusus ${pageCircle.name}` : 'halaman ini untuk'}>
        <div className="col">
          {pageCircle ? (
            <p className="small" style={{ margin: 0 }}>
              Halaman ini hanya untuk <b>{pageCircle.name}</b>. Lingkaranmu yang lain tidak pernah melihatnya, dan halaman ini disegel sendiri.
            </p>
          ) : null}
          {!pageCircle && active.filter((c) => !ownPageIds.has(c.id)).map((c) => {
            const on = circleIds.includes(c.id);
            return (
              <button key={c.id} className={`pill ${on ? 'active' : ''}`} style={{ justifyContent: 'flex-start', padding: '12px 16px' }} onClick={() => {
                choosePage(on ? circleIds.filter((x) => x !== c.id) : [...circleIds, c.id]);
              }}>
                <Doodle id={c.doodle} size={20} color="currentColor" /> {c.name}
              </button>
            );
          })}
          {!pageCircle ? (
            <button className={`pill ${circleIds.length === 0 ? 'active' : ''}`} style={{ justifyContent: 'flex-start', padding: '12px 16px' }} onClick={() => choosePage([])}>
              🔒 hanya aku
            </button>
          ) : null}
          {!pageCircle ? <p className="tiny soft">Berlaku untuk semua yang “bersama” di halaman utama, termasuk yang sudah ditempel. Yang kamu kunci “hanya aku” tetap hanya untukmu.</p> : null}
          {active.length > 1 || pageCircle ? (
            <>
              <span className="label mt">halaman sendiri</span>
              <p className="tiny soft" style={{ marginTop: 0 }}>
                Lingkaran dengan halaman sendiri tidak melihat halaman utamamu. Kamu menulis dan menyegel halaman khusus untuk mereka. Cocok untuk sahabat atau keluarga.
              </p>
              {active.map((c) => (
                <Toggle key={c.id} label={c.name} hint={ownPageIds.has(c.id) ? 'punya halaman sendiri' : 'menerima halaman utama'} value={ownPageIds.has(c.id)} onChange={(v) => void toggleOwnPage(c, v)} />
              ))}
            </>
          ) : null}
        </div>
      </Sheet>

      {sealing ? (
        <SealCeremony
          day={day}
          circles={pageCircle ? [pageCircle] : active.filter((c) => mainCircleIds.includes(c.id))}
          pageCircleId={pageCircle?.id}
          niat={pageCircle ? undefined : niat}
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
  if (!others.length) return null;
  return (
    <Link to={`/l/${c.id}/hari/${day}`} className="row card flat" style={{ padding: '4px 10px 4px 4px', borderRadius: 999, gap: 4 }} title={c.name}>
      {others.slice(0, 3).map((m) => (
        <Avatar key={m.userId} doodle={m.doodle} size={26} sealed={c.todaySealed[m.userId]} title={`${m.penName}${c.todaySealed[m.userId] ? ' · tersegel' : ''}`} />
      ))}
      <span className="tiny ink">{c.todaySealed[meId] ? '✓' : c.streak.current || ''}</span>
    </Link>
  );
}

/** Janji temu dalam 2 hari ke depan muncul di atas halaman. */
function MeetBanner() {
  const { meets } = useMeets();
  const now = Date.now();
  const m = meets
    .filter((x) => x.plan && x.wire.status === 'planned' && new Date(x.wire.startsAt).getTime() > now - 8 * 3600_000 && new Date(x.wire.startsAt).getTime() < now + 2 * 86_400_000)
    .sort((a, b) => a.wire.startsAt.localeCompare(b.wire.startsAt))[0];
  if (!m) return null;
  return (
    <Link to={`/janji/${m.wire.id}`} className="meet-banner">
      <Doodle id="tangan-bergandeng" size={28} className="breathe" />
      <span className="grow" style={{ minWidth: 0 }}>
        <span className="small ink" style={{ display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.plan!.title}</span>
        <span className="tiny soft">{fmtWhen(m.wire.startsAt, { weekday: 'short', hour: '2-digit', minute: '2-digit' })} · {m.plan!.place.name}</span>
      </span>
      <span className="badge pub">{countdown(m.wire.startsAt, now)}</span>
    </Link>
  );
}
