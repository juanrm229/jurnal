/**
 * Halaman jurnal: selembar kertas lebar 1000 satuan. Setiap Drop adalah satu
 * elemen yang bisa diletakkan, digeser, diputar, diperbesar, dan ditumpuk —
 * foto boleh menimpa tulisan. Tata letak tersimpan di dalam payload terenkripsi.
 */
import { type Audience, type DropPayload, MOODS, type PageLayout, type ReactionKind } from '@sehari/core';
import { type CSSProperties, type ReactNode, useEffect, useLayoutEffect, useRef, useState } from 'react';
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
  let y = 230;
  let i = 0;
  return items.map((it) => {
    if (it.payload.layout) return { ...it, layout: it.payload.layout };
    const w = defaultWidth(it.payload.kind);
    const side = i++ % 2 === 0;
    const x = it.payload.kind === 'sticker' ? (side ? 760 : 90) : it.payload.kind === 'photo' ? (side ? 90 : 450) : 90;
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

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setScale(el.clientWidth / PAGE_W));
    ro.observe(el);
    setScale(el.clientWidth / PAGE_W);
    return () => ro.disconnect();
  }, []);

  const laid = withLayouts(items).map((it) => ({ ...it, layout: live[it.id] ?? it.layout }));
  const bottom = laid.reduce((m, it) => Math.max(m, it.layout.y + (it.payload.kind === 'photo' ? it.layout.w * 1.1 : 260)), 0);
  const height = Math.max(props.minHeight ?? 1300, bottom + 260);

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
      style={{ height: height * scale, '--s': scale, '--page-wash': moodColor ?? 'transparent', filter: aged ? `sepia(${aged * 0.55}) saturate(${1 - aged * 0.2})` : undefined } as CSSProperties}
      onPointerDown={(e) => {
        if (e.target === ref.current || (e.target as HTMLElement).dataset.paper) onSelect?.(null);
      }}
      onClick={(e) => {
        if (!editable || !props.onCreateAt) return;
        if (e.target !== ref.current && !(e.target as HTMLElement).dataset.paper) return;
        if (selectedId) return onSelect?.(null);
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
      {editable && items.length === 0 ? (
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
  tools,
  children,
}: {
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
    if (d.moved) onCommit(last.current);
    else if (d.kind === 'move' && selected && editable) onEdit();
    void e;
  };

  return (
    <div
      ref={box}
      className={['el', editable ? '' : 'readonly', selected ? 'selected' : '', dragging ? 'dragging' : '', item.audience === 'self' ? 'private' : ''].filter(Boolean).join(' ')}
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
      {tools ? <div className="el-toolbar" onPointerDown={(e) => e.stopPropagation()}>{tools}</div> : null}
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
