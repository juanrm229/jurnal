/**
 * Halaman jurnal: selembar kertas lebar 1000 satuan. Setiap Drop adalah satu
 * elemen yang bisa diletakkan, digeser, diputar, diperbesar, dan ditumpuk —
 * foto boleh menimpa tulisan. Tata letak tersimpan di dalam payload terenkripsi.
 */
import { type Audience, type DropPayload, MOODS, type PageLayout, type ReactionKind } from '@sehari/core';
import { type CSSProperties, type ReactNode, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { DOODLES, fnv1a } from '@sehari/doodles';
import { Doodle } from '@/ui/kit';
import { PageElement } from './elements';

export const PAGE_W = 1000;

export interface PageItem {
  id: string;
  authorId: string;
  payload: DropPayload;
  audience: Audience;
  circleIds: string[];
  mediaIds: string[];
  reactions: { kind: ReactionKind; userId: string }[];
  footnotes: { id: string; authorName: string; text: string }[];
  /** Sedang diunggah — belum ada di server. */
  pending?: boolean;
  localUrl?: string;
}

const DEFAULT_W: Record<string, number> = {
  text: 600,
  idea: 520,
  word: 460,
  photo: 460,
  screenshot: 420,
  sticker: 150,
  voice: 420,
  song: 420,
  mood: 560,
  card: 480,
  answer: 480,
  silent: 320,
  last_line: 780,
  auto: 380,
  blackout: 640,
  prologue: 640,
  epilogue: 640,
  expedition: 520,
};

export const defaultWidth = (kind: string) => DEFAULT_W[kind] ?? 520;

/** Elemen tanpa posisi (dibuat dari aplikasi lain) disusun rapi ke bawah. */
export function withLayouts(items: PageItem[]): (PageItem & { layout: PageLayout })[] {
  // Elemen tanpa posisi menyusul di bawah elemen yang sudah diletakkan.
  const placedBottom = items.reduce((m, it) => (it.payload.layout ? Math.max(m, it.payload.layout.y + (it.payload.kind === 'photo' ? it.payload.layout.w * 1.1 : 200)) : m), 0);
  let y = Math.max(230, placedBottom + 60);
  let i = 0;
  return items.map((it) => {
    if (it.payload.layout) return { ...it, layout: it.payload.layout };
    const w = defaultWidth(it.payload.kind);
    const side = i++ % 2 === 0;
    const x = it.payload.kind === 'sticker' ? (side ? 760 : 90) : it.payload.kind === 'photo' ? (side ? 90 : 450) : it.payload.kind === 'last_line' ? 110 : 90;
    const layout: PageLayout = { x, y, w, rot: it.payload.kind === 'photo' ? (side ? -3 : 2.5) : 0, z: i };
    y += it.payload.kind === 'photo' ? 420 : it.payload.kind === 'sticker' ? 120 : it.payload.kind === 'last_line' ? 140 : 200;
    return { ...it, layout };
  });
}

export interface PageProps {
  items: PageItem[];
  editable?: boolean;
  viewerId: string;
  selectedId?: string | null;
  editingId?: string | null;
  onSelect?: (id: string | null) => void;
  onLayout?: (id: string, layout: PageLayout) => void;
  onEdit?: (id: string) => void;
  onText?: (id: string, text: string) => void;
  onEndEdit?: (id: string) => void;
  onCreateAt?: (x: number, y: number) => void;
  onFiles?: (files: File[], x: number, y: number) => void;
  onItemTap?: (id: string, at: { x: number; y: number }) => void;
  /** Bilah alat kecil di atas elemen terpilih. */
  renderTools?: (item: PageItem & { layout: PageLayout }) => ReactNode;
  head?: ReactNode;
  foot?: ReactNode;
  /** Pengganti isi halaman kosong yang bisa disunting. */
  empty?: ReactNode;
  /** Benih doodle kecil di pinggir kertas (sama di semua perangkat). */
  margins?: string;
  sealed?: boolean;
  mood?: string;
  minHeight?: number;
  aged?: number;
  className?: string;
}

export function Page(props: PageProps) {
  const { items, editable, selectedId, onSelect } = props;
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.4);
  const [dragOver, setDragOver] = useState(false);
  const [live, setLive] = useState<Record<string, PageLayout>>({});
  // Ketukan yang hanya melepas pilihan/penyuntingan tidak membuat tulisan baru.
  const dismissed = useRef(false);
  // Elemen yang muncul setelah halaman dimuat ditempel dengan sedikit pantulan.
  const initial = useRef<Set<string> | null>(null);
  if (initial.current === null && items.length) initial.current = new Set(items.map((i) => i.id));
  useEffect(() => {
    const t = window.setTimeout(() => {
      if (initial.current === null) initial.current = new Set();
    }, 900);
    return () => window.clearTimeout(t);
  }, []);
  // Dua jari: cubit untuk memperbesar, putar untuk memutar elemen terpilih.
  const pts = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef(false);
  const pinch = useRef<null | { id: string; start: PageLayout; d0: number; a0: number; last: PageLayout }>(null);
  const two = () => {
    const [a, b] = [...pts.current.values()];
    return { d: Math.hypot(b!.x - a!.x, b!.y - a!.y), a: Math.atan2(b!.y - a!.y, b!.x - a!.x) };
  };

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setScale(el.clientWidth / PAGE_W));
    ro.observe(el);
    setScale(el.clientWidth / PAGE_W);
    return () => ro.disconnect();
  }, []);

  const laid = withLayouts(items).map((it) => ({ ...it, layout: live[it.id] ?? it.layout }));
  const marginDoodles = useMemo(() => {
    if (!props.margins) return [];
    const pool = DOODLES.filter((d) => ['stiker', 'cuaca', 'perasaan', 'bunga'].includes(d.category)).map((d) => d.id);
    const h = fnv1a(props.margins);
    return [0, 1, 2, 3, 4].map((i) => {
      const r = fnv1a(`${props.margins}:${i}`);
      const left = i % 2 === 0;
      return { id: pool[(h + r) % pool.length]!, x: left ? 8 + (r % 40) : 930 - (r % 30), y: 260 + i * 230 + (r % 120), rot: (r % 40) - 20, size: 46 + (r % 24) };
    });
  }, [props.margins]);
  const bottom = laid.reduce((m, it) => Math.max(m, it.layout.y + (it.payload.kind === 'photo' ? it.layout.w * 1.1 : 260)), 0);
  const height = Math.max(props.minHeight ?? 1300, bottom + 260);

  const endPointer = (id: number) => {
    pts.current.delete(id);
    const p = pinch.current;
    if (p && pts.current.size < 2) {
      pinch.current = null;
      props.onLayout?.(p.id, p.last);
      window.setTimeout(() => setLive(({ [p.id]: _, ...rest }) => rest), 400);
    }
    if (pts.current.size === 0) window.setTimeout(() => (gesture.current = false), 50);
  };

  const toPage = (clientX: number, clientY: number) => {
    const r = ref.current!.getBoundingClientRect();
    return { x: (clientX - r.left) / scale, y: (clientY - r.top) / scale };
  };

  const moodColor = props.mood ? MOODS[props.mood as keyof typeof MOODS]?.color : undefined;
  const aged = props.aged ?? 0;

  return (
    <div
      ref={ref}
      className={['page lined', dragOver ? 'drag-over' : '', props.sealed ? 'sealed' : '', props.className].filter(Boolean).join(' ')}
      style={{ height: height * scale, '--s': scale, '--page-wash': moodColor ?? 'transparent', filter: aged ? `sepia(${aged * 0.55}) saturate(${1 - aged * 0.2})` : undefined, touchAction: editable && selectedId ? 'none' : undefined } as CSSProperties}
      onPointerDownCapture={(e) => {
        pts.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (pts.current.size === 2 && editable && selectedId) {
          const it = laid.find((x) => x.id === selectedId);
          if (it && it.authorId === props.viewerId) {
            const t = two();
            pinch.current = { id: it.id, start: it.layout, d0: Math.max(1, t.d), a0: t.a, last: it.layout };
            gesture.current = true;
          }
        }
      }}
      onPointerMoveCapture={(e) => {
        if (!pts.current.has(e.pointerId)) return;
        pts.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
        const p = pinch.current;
        if (!p || pts.current.size < 2) return;
        const t = two();
        const w = Math.round(Math.max(70, Math.min(1000, p.start.w * (t.d / p.d0))));
        let rot = p.start.rot + ((t.a - p.a0) * 180) / Math.PI;
        if (Math.abs(rot) < 3) rot = 0;
        const next = { ...p.start, w, rot: Math.round(rot * 10) / 10, x: Math.round(p.start.x + (p.start.w - w) / 2), y: Math.round(p.start.y + ((p.start.w - w) / 2) * 0.7) };
        p.last = next;
        setLive((m) => ({ ...m, [p.id]: next }));
      }}
      onPointerUpCapture={(e) => endPointer(e.pointerId)}
      onPointerCancelCapture={(e) => endPointer(e.pointerId)}
      onPointerDown={(e) => {
        dismissed.current = !!(selectedId || props.editingId);
        if (e.target === ref.current || (e.target as HTMLElement).dataset.paper) onSelect?.(null);
      }}
      onClick={(e) => {
        if (!editable || !props.onCreateAt) return;
        if (e.target !== ref.current && !(e.target as HTMLElement).dataset.paper) return;
        if (dismissed.current) return;
        const p = toPage(e.clientX, e.clientY);
        props.onCreateAt(Math.max(40, Math.min(p.x - 20, PAGE_W - 400)), Math.max(180, p.y - 20));
      }}
      onDragOver={(e) => {
        if (!editable || !props.onFiles) return;
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        if (!editable || !props.onFiles) return;
        e.preventDefault();
        setDragOver(false);
        const files = [...e.dataTransfer.files].filter((f) => f.type.startsWith('image/'));
        if (files.length) {
          const p = toPage(e.clientX, e.clientY);
          props.onFiles(files, p.x - 200, p.y - 150);
        }
      }}>
      {props.margins ? (
        <>
          <span className="page-tape l" />
          <span className="page-tape r" />
        </>
      ) : null}
      {marginDoodles.map((m, i) => (
        <span key={i} className="margin-doodle" data-paper="1" style={{ left: m.x * scale, top: m.y * scale, transform: `rotate(${m.rot}deg)` }}>
          <Doodle id={m.id} size={m.size * scale} sw={2} />
        </span>
      ))}
      {props.head ? <div className="page-head">{props.head}</div> : null}
      {laid
        .sort((a, b) => a.layout.z - b.layout.z)
        .map((it) => (
          <Movable
            key={it.id}
            item={it}
            scale={scale}
            editable={!!editable && it.authorId === props.viewerId}
            selected={selectedId === it.id}
            editing={props.editingId === it.id}
            onSelect={() => onSelect?.(it.id)}
            onLive={(l) => setLive((m) => ({ ...m, [it.id]: l }))}
            onCommit={(l) => {
              props.onLayout?.(it.id, l);
              window.setTimeout(() => setLive(({ [it.id]: _, ...rest }) => rest), 400);
            }}
            onTap={(at) => props.onItemTap?.(it.id, at)}
            onEdit={() => props.onEdit?.(it.id)}
            gesture={gesture}
            fresh={!!initial.current && !initial.current.has(it.id)}
            tools={selectedId === it.id && editable ? props.renderTools?.(it) : null}>
            <PageElement
              item={it}
              scale={scale}
              editing={props.editingId === it.id}
              onText={(t) => props.onText?.(it.id, t)}
              onEndEdit={() => props.onEndEdit?.(it.id)}
              viewerId={props.viewerId}
            />
          </Movable>
        ))}
      {props.foot}
      {editable && items.length === 0 && props.empty ? props.empty : null}
      {editable && items.length === 0 && !props.empty ? (
        <div data-paper="1" style={{ position: 'absolute', left: 0, right: 0, top: '38%', textAlign: 'center', color: 'var(--ink-soft)', pointerEvents: 'none' }}>
          <Doodle id="penyiram" size={64 * Math.max(scale, 0.7)} draw className="sway" />
          <div className="hand" style={{ fontSize: Math.max(22, 44 * scale), color: 'var(--ink-soft)' }}>
            ketuk di mana saja untuk menulis
          </div>
          <div className="tiny">atau seret foto ke sini</div>
        </div>
      ) : null}
    </div>
  );
}

function Movable({
  item,
  scale,
  editable,
  selected,
  editing,
  onSelect,
  onLive,
  onCommit,
  onTap,
  onEdit,
  gesture,
  fresh,
  tools,
  children,
}: {
  fresh?: boolean;
  gesture: React.RefObject<boolean>;
  item: PageItem & { layout: PageLayout };
  scale: number;
  editable: boolean;
  selected: boolean;
  editing: boolean;
  onSelect: () => void;
  onLive: (l: PageLayout) => void;
  onCommit: (l: PageLayout) => void;
  onTap: (at: { x: number; y: number }) => void;
  onEdit: () => void;
  tools: ReactNode;
  children: ReactNode;
}) {
  const L = item.layout;
  const box = useRef<HTMLDivElement>(null);
  const drag = useRef<{ kind: 'move' | 'turn'; sx: number; sy: number; start: PageLayout; moved: boolean; cx?: number; cy?: number; a0?: number; d0?: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  const last = useRef<PageLayout>(L);
  last.current = L;

  useEffect(() => {
    if (!selected) drag.current = null;
  }, [selected]);

  const begin = (e: React.PointerEvent, kind: 'move' | 'turn') => {
    if (editing && kind === 'move') return;
    e.stopPropagation();
    if (!editable) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    const r = box.current!.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    drag.current = {
      kind,
      sx: e.clientX,
      sy: e.clientY,
      start: L,
      moved: false,
      cx,
      cy,
      a0: Math.atan2(e.clientY - cy, e.clientX - cx),
      d0: Math.hypot(e.clientX - cx, e.clientY - cy),
    };
    if (!selected) onSelect();
  };

  const move = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    if (gesture.current) {
      d.moved = true;
      return;
    }
    const dx = e.clientX - d.sx;
    const dy = e.clientY - d.sy;
    if (!d.moved && Math.hypot(dx, dy) < 4) return;
    d.moved = true;
    setDragging(true);
    if (d.kind === 'move') {
      onLive({ ...d.start, x: Math.round(d.start.x + dx / scale), y: Math.max(0, Math.round(d.start.y + dy / scale)) });
    } else {
      const a = Math.atan2(e.clientY - d.cy!, e.clientX - d.cx!);
      const dist = Math.hypot(e.clientX - d.cx!, e.clientY - d.cy!);
      let rot = d.start.rot + ((a - d.a0!) * 180) / Math.PI;
      if (Math.abs(rot) < 3) rot = 0;
      const w = Math.max(70, Math.min(1000, d.start.w * (dist / Math.max(1, d.d0!))));
      onLive({ ...d.start, rot: Math.round(rot * 10) / 10, w: Math.round(w) });
    }
  };

  const end = (e: React.PointerEvent) => {
    const d = drag.current;
    drag.current = null;
    setDragging(false);
    if (!d) return;
    if (gesture.current) return;
    if (d.moved) onCommit(last.current);
    else if (d.kind === 'move' && selected && editable) onEdit();
    void e;
  };

  return (
    <div
      ref={box}
      className={['el', fresh ? 'el-new' : '', editable ? '' : 'readonly', selected ? 'selected' : '', dragging ? 'dragging' : '', item.audience === 'self' ? 'private' : ''].filter(Boolean).join(' ')}
      style={{
        left: L.x * scale,
        top: L.y * scale,
        width: L.w * scale,
        transform: `rotate(${L.rot}deg)`,
        zIndex: dragging || selected ? 999 : L.z,
        opacity: item.pending ? 0.6 : 1,
      }}
      onPointerDown={(e) => begin(e, 'move')}
      onPointerMove={move}
      onPointerUp={end}
      onPointerCancel={end}
      onClick={(e) => {
        e.stopPropagation();
        if (!editable) onTap({ x: L.x + L.w / 2, y: L.y });
      }}
      onDoubleClick={(e) => {
        e.stopPropagation();
        if (editable) onEdit();
      }}>
      <div className="el-body">{children}</div>
      {tools ? createPortal(<div className="el-toolbar" onPointerDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}>{tools}</div>, document.body) : null}
      {selected && editable && !editing ? (
        <span className="handle" aria-label="putar & ubah ukuran" onPointerDown={(e) => begin(e, 'turn')} onPointerMove={move} onPointerUp={end} onPointerCancel={end}>
          <Doodle id="ui-panah-kanan" size={14} color="currentColor" sw={3} />
        </span>
      ) : null}
      {item.reactions.length ? (
        <div className="react-badges">
          {[...new Set(item.reactions.map((r) => r.kind))].map((k) => (
            <span key={k}>
              <Doodle id={k === 'hug' ? 'ui-peluk' : k === 'me_too' ? 'ui-aku-juga' : k === 'candle' ? 'lilin' : 'ui-hati'} size={12} color="currentColor" sw={3} />
              {item.reactions.filter((r) => r.kind === k).length}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
