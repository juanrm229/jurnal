/**
 * Bahan bersama untuk layar-layar Lore (Papan, Kitab, Langit, Lemari, …):
 * pemilih tahun, teks yang sudah didekripsi di perangkat, cakupan segel per
 * hari, sampul genre, dan kartu Drop mungil.
 */
import {
  type AuthoredText,
  type CircleCalendarDay,
  type CircleKind,
  COPY,
  type DayKey,
  type DropKind,
  formatClock,
  formatDayLong,
  GENRES,
  type Genre,
  getCity,
  hashString,
  type LockedDrop,
  type MediaRef,
  MOODS,
  threshold,
  type WrapDrop,
} from '@sehari/core';
import { type CSSProperties, memo, type ReactNode } from 'react';
import { ApiError } from '@/lib/api';
import type { CircleView, OpenDrop } from '@/lib/data';
import { useMediaUrl } from '@/lib/media';
import { Doodle, MoodDot } from '@/ui/kit';

// ── Tahun ───────────────────────────────────────────────────────────────────

export function YearSwitch({ year, min, max, onChange }: { year: number; min: number; max: number; onChange: (y: number) => void }) {
  return (
    <div className="row" style={{ justifyContent: 'center', gap: 0 }}>
      <span style={{ width: 44, display: 'flex', justifyContent: 'center' }}>
        {year > min ? (
          <button className="icon-btn" aria-label="tahun sebelumnya" onClick={() => onChange(year - 1)}>
            <Doodle id="ui-kembali" size={18} />
          </button>
        ) : null}
      </span>
      <span className="hand" style={{ fontSize: 40, lineHeight: 1 }}>
        {year}
      </span>
      <span style={{ width: 44, display: 'flex', justifyContent: 'center' }}>
        {year < max ? (
          <button className="icon-btn" aria-label="tahun berikutnya" onClick={() => onChange(year + 1)}>
            <Doodle id="ui-panah-kanan" size={18} />
          </button>
        ) : null}
      </span>
    </div>
  );
}

// ── Kepala halaman lore ─────────────────────────────────────────────────────

/** Doodle besar yang menggambar dirinya sendiri + judul tulisan tangan. */
export function LoreHero({ doodle, title, sub, extra, size = 76 }: { doodle: string; title: ReactNode; sub?: ReactNode; extra?: ReactNode; size?: number }) {
  return (
    <div className="lore-hero">
      <span className="lore-hero-doodle">
        <Doodle id={doodle} size={size} draw sw={2.2} />
      </span>
      <div className="hand lore-hero-title">{title}</div>
      {sub ? <div className="small soft lore-hero-sub">{sub}</div> : null}
      {extra}
    </div>
  );
}

export function ErrLine({ children, center, style }: { children: ReactNode; center?: boolean; style?: CSSProperties }) {
  if (!children) return null;
  return (
    <p className={`tiny ${center ? 'center' : ''}`} style={{ color: 'var(--danger)', margin: '6px 0 0', ...style }} role="alert">
      {children}
    </p>
  );
}

/** Tombol dengan status memuat (tanpa pustaka UI). */
export function Btn({
  children,
  kind,
  icon,
  loading,
  disabled,
  onClick,
  className,
  style,
  title,
}: {
  children: ReactNode;
  kind?: 'soft' | 'ghost' | 'danger';
  icon?: string;
  loading?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  className?: string;
  style?: CSSProperties;
  title?: string;
}) {
  return (
    <button className={['btn', kind ?? '', className ?? ''].filter(Boolean).join(' ')} disabled={disabled || loading} onClick={onClick} style={style} title={title}>
      {loading ? <Doodle id="tunas" size={20} color="currentColor" className="breathe" /> : icon ? <Doodle id={icon} size={20} color="currentColor" /> : null}
      <span>{children}</span>
    </button>
  );
}

// ── Nama & galat ────────────────────────────────────────────────────────────

export function nameIn(circle: CircleView, userId: string, meId: string): string {
  if (userId === meId) return 'kamu';
  return circle.members.find((m) => m.userId === userId)?.penName ?? 'seseorang';
}

export function errorText(e: unknown, fallback = 'Ada yang tersangkut. Coba lagi sebentar lagi.'): string {
  if (e instanceof ApiError) return e.message;
  if (e instanceof Error && e.message) return e.message;
  return fallback;
}

export const isPaymentRequired = (e: unknown) => e instanceof ApiError && e.status === 402;

// ── Teks yang dibuka di perangkat ───────────────────────────────────────────

/** Jenis Drop yang isinya boleh ditambang untuk kata (bukan Ruang Hening, bukan jejak otomatis). */
const TEXT_KINDS: DropKind[] = ['text', 'idea', 'word', 'answer', 'card', 'expedition', 'last_line', 'prologue', 'epilogue', 'song', 'photo'];

const byTime = (a: OpenDrop, b: OpenDrop) =>
  a.wire.day < b.wire.day ? -1 : a.wire.day > b.wire.day ? 1 : a.payload!.hour * 60 + a.payload!.minute - (b.payload!.hour * 60 + b.payload!.minute);

export function sortByTime(drops: OpenDrop[]): OpenDrop[] {
  return [...drops].filter((d) => d.payload).sort(byTime);
}

export function authoredTexts(drops: OpenDrop[], opts: { kinds?: DropKind[]; authorId?: string } = {}): AuthoredText[] {
  const kinds = opts.kinds ?? TEXT_KINDS;
  return drops
    .filter((d) => d.payload?.text && kinds.includes(d.wire.kind) && (!opts.authorId || d.wire.authorId === opts.authorId))
    .sort(byTime)
    .map((d) => ({ authorId: d.wire.authorId, day: d.wire.day, text: d.payload!.text! }));
}

export function toWrapDrops(drops: OpenDrop[]): WrapDrop[] {
  return drops
    .filter((d) => d.payload)
    .map((d) => ({ id: d.wire.id, authorId: d.wire.authorId, day: d.wire.day, kind: d.wire.kind, payload: d.payload!, reactions: d.wire.reactions }));
}

// ── Cakupan segel ───────────────────────────────────────────────────────────

export interface DayCover {
  day: DayKey;
  active: number;
  sealed: number;
  frozen: number;
  fraction: number;
  together: boolean;
}

/** Sama dengan aturan streak di @sehari/core: bersama = ≥2 aktif, cukup tersegel, minimal satu segel sungguhan. */
export function coverFor(circle: Pick<CircleView, 'members' | 'kind'>, day: DayKey, cal: CircleCalendarDay | undefined): DayCover {
  const active = circle.members.filter((m) => day >= m.joinedDay && (!m.leftDay || day <= m.leftDay)).length;
  const sealed = cal?.sealed.length ?? 0;
  const frozen = cal?.frozen.filter((u) => !cal.sealed.includes(u)).length ?? 0;
  const covered = sealed + frozen;
  const needed = Math.max(1, Math.ceil(active * threshold(circle.kind as CircleKind) - 1e-9));
  return {
    day,
    active,
    sealed,
    frozen,
    fraction: active ? Math.min(1, covered / active) : 0,
    together: active >= 2 && covered >= needed && sealed > 0,
  };
}

export function calendarMap(cal: CircleCalendarDay[] | undefined): Map<DayKey, CircleCalendarDay> {
  return new Map((cal ?? []).map((x) => [x.day, x]));
}

/** Angka 0..1 yang stabil untuk sebuah kunci (posisi bintang, kemiringan buku). */
export function unit(seed: string): number {
  return (hashString(seed) % 10_000) / 10_000;
}

/** Campuran dua warna CSS (t = porsi `b`). */
export const mix = (a: string, b: string, t: number) => `color-mix(in srgb, ${b} ${Math.round(Math.max(0, Math.min(1, t)) * 100)}%, ${a})`;

// ── Sampul genre ────────────────────────────────────────────────────────────

export type CoverPattern = Genre['cover']['pattern'];

export function genreById(id: string | null | undefined): Genre | undefined {
  return id ? GENRES.find((g) => g.id === id) : undefined;
}

/** Warna kertas sampul dari variabel tema (bukan warna tetap). */
export function coverTint(pattern: CoverPattern | undefined): string {
  switch (pattern) {
    case 'gelombang':
      return 'var(--sticky-blue)';
    case 'kotak':
      return 'var(--sticky-peach)';
    case 'titik':
      return 'var(--sticky-green)';
    case 'garis':
      return 'var(--sticky-yellow)';
    case 'bintang':
      return 'var(--pill)';
    case 'polos':
      return 'color-mix(in srgb, var(--sticky-yellow) 30%, var(--card))';
    default:
      return 'var(--card)';
  }
}

/** Pola tinta tipis di atas sampul: garis, titik, kotak, gelombang, bintang. */
export const CoverPatternArt = memo(function CoverPatternArt({ pattern, width, height, color = 'var(--ink)', opacity = 0.28 }: { pattern: CoverPattern | undefined; width: number; height: number; color?: string; opacity?: number }) {
  const els: ReactNode[] = [];
  const step = 12;
  if (pattern === 'garis') {
    for (let y = step; y < height; y += step) els.push(<line key={y} x1={0} y1={y} x2={width} y2={y} stroke="currentColor" strokeWidth={1} />);
  } else if (pattern === 'titik') {
    for (let y = step / 2; y < height; y += step) for (let x = (y / step) % 2 ? step / 2 : step; x < width; x += step) els.push(<circle key={`${x}:${y}`} cx={x} cy={y} r={1.3} fill="currentColor" />);
  } else if (pattern === 'kotak') {
    for (let y = 0; y < height; y += step) els.push(<line key={`h${y}`} x1={0} y1={y} x2={width} y2={y} stroke="currentColor" strokeWidth={0.8} />);
    for (let x = 0; x < width; x += step) els.push(<line key={`v${x}`} x1={x} y1={0} x2={x} y2={height} stroke="currentColor" strokeWidth={0.8} />);
  } else if (pattern === 'gelombang') {
    for (let y = step; y < height; y += step) {
      let d = `M0 ${y}`;
      for (let x = 0; x < width; x += step) d += ` q${step / 4} -4 ${step / 2} 0 t${step / 2} 0`;
      els.push(<path key={y} d={d} stroke="currentColor" strokeWidth={1} fill="none" />);
    }
  } else if (pattern === 'bintang') {
    for (let i = 0; i < Math.max(6, Math.round((width * height) / 500)); i++) {
      const x = unit(`bx${i}`) * width;
      const y = unit(`by${i}`) * height;
      els.push(<path key={i} d={`M${x} ${y - 2.5} L${x} ${y + 2.5} M${x - 2.5} ${y} L${x + 2.5} ${y}`} stroke="currentColor" strokeWidth={1} />);
    }
  }
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ position: 'absolute', left: 0, top: 0, color, opacity, pointerEvents: 'none' }} aria-hidden>
      {pattern === 'polos' ? <rect x={4} y={4} width={width - 8} height={height - 8} stroke="currentColor" strokeWidth={1} fill="none" /> : null}
      {els}
    </svg>
  );
});

/** Sampul mini genre untuk dipilih bersama. */
export function GenreCover({ genre, width = 96, height = 128, selected }: { genre: Genre; width?: number; height?: number; selected?: boolean }) {
  return (
    <div
      className="lore-cover"
      style={{
        width,
        height,
        background: coverTint(genre.cover.pattern),
        border: selected ? '2.5px solid var(--ink)' : '1px solid var(--card-edge)',
      }}>
      <CoverPatternArt pattern={genre.cover.pattern} width={width} height={height} />
      <Doodle id={genre.cover.doodle} size={Math.min(width, height) * 0.45} />
    </div>
  );
}

// ── Kartu Drop mungil (Dadu Kenangan) ───────────────────────────────────────

export const KIND_DOODLE: Record<string, string> = {
  text: 'ui-teks',
  photo: 'ui-foto',
  screenshot: 'ui-foto',
  video: 'kamera',
  voice: 'ui-mikrofon',
  song: 'ui-lagu',
  idea: 'ui-ide',
  word: 'ui-kata',
  mood: 'ui-palet',
  answer: 'bulan',
  card: 'kartu',
  expedition: 'kompas',
  last_line: 'pena',
  silent: 'lilin',
  auto: 'matahari',
  blackout: 'buku',
  prologue: 'buku',
  epilogue: 'buku',
  sticker: 'bintang-kecil',
};

function MiniPhoto({ media }: { media: MediaRef }) {
  const url = useMediaUrl(media);
  const ratio = media.width && media.height ? media.width / media.height : 4 / 3;
  return (
    <div className="lore-polaroid" style={{ ['--tint' as string]: media.tint ?? 'var(--pill)' }}>
      {url ? <img src={url} alt="" style={{ aspectRatio: String(ratio) }} /> : <div className="ph" style={{ aspectRatio: String(ratio) }} />}
    </div>
  );
}

function MiniVoice({ media }: { media: MediaRef }) {
  const url = useMediaUrl(media);
  return url ? <audio controls src={url} style={{ width: '100%' }} /> : <span className="tiny soft">memuat suara…</span>;
}

export function MiniDrop({ drop, author, tilt = 0 }: { drop: OpenDrop; author?: string; tilt?: number }) {
  const p = drop.payload;
  if (!p) {
    return (
      <div className="card flat row">
        <Doodle id="ui-gembok" size={22} style={{ opacity: 0.6 }} />
        <span className="small soft">Tidak bisa dibuka dengan kunci di perangkat ini.</span>
      </div>
    );
  }
  const silent = p.kind === 'silent';
  const city = getCity(p.cityId);
  return (
    <div className={`card lore-drop ${silent ? 'silent' : ''}`} style={{ transform: tilt ? `rotate(${tilt}deg)` : undefined }}>
      <div className="row between">
        <div className="row gap-sm wrap" style={{ minWidth: 0 }}>
          <Doodle id={KIND_DOODLE[p.kind] ?? 'tunas'} size={20} />
          {author ? <span className="small ink">{author}</span> : null}
          <span className="tiny soft">
            {formatClock(p.hour, p.minute)}
            {city ? ` · ${city.name}` : ''}
          </span>
        </div>
        {p.mood ? (
          <span className="row gap-sm">
            <MoodDot mood={p.mood} />
            <span className="tiny soft">{MOODS[p.mood]?.label}</span>
          </span>
        ) : null}
      </div>
      {p.prompt ? <div className="tiny ink-soft">“{p.prompt}”</div> : null}
      {silent ? (
        <div className="small soft">
          {COPY.silentRoom.title} · {p.text ? p.text : 'tanpa kata'}
        </div>
      ) : p.kind === 'last_line' && p.text ? (
        <div className="hand">{p.text}</div>
      ) : p.kind === 'word' && p.text ? (
        <div className="title">{p.text}</div>
      ) : p.text ? (
        <div style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{p.text}</div>
      ) : null}
      {p.kind === 'mood' && !p.text && p.mood ? <div style={{ height: 36, borderRadius: 10, background: MOODS[p.mood]?.color }} /> : null}
      {p.kind === 'sticker' && p.sticker ? <Doodle id={p.sticker} size={64} /> : null}
      {p.media?.filter((m) => m.mime.startsWith('image/')).map((m) => <MiniPhoto key={m.id} media={m} />)}
      {p.media?.filter((m) => m.mime.startsWith('audio/')).map((m) => <MiniVoice key={m.id} media={m} />)}
      {p.song ? (
        <a href={p.song.url} target="_blank" rel="noreferrer" className="row" style={{ background: 'var(--pill)', borderRadius: 14, padding: 12 }}>
          <Doodle id="kaset" size={28} />
          <span className="grow">
            <span className="small ink" style={{ display: 'block' }}>{p.song.title}</span>
            <span className="tiny soft">{p.song.artist}</span>
          </span>
        </a>
      ) : null}
    </div>
  );
}

export function LockedMini({ locked, author }: { locked: LockedDrop; author: string }) {
  const why =
    locked.reason === 'time_capsule'
      ? `kapsul waktu · terbuka ${locked.unlockOn ? formatDayLong(locked.unlockOn) : 'nanti'}`
      : locked.reason === 'secret_card'
        ? 'kartu rahasia · terbuka setelah kamu menjawab'
        : locked.reason === 'split'
          ? 'mode pisah'
          : 'terbuka setelah kamu menyegel';
  return (
    <div className="card flat row" style={{ borderStyle: 'dashed', borderColor: 'var(--ink-soft)', background: 'color-mix(in srgb, var(--ink) 6%, var(--card))' }}>
      <Doodle id="amplop" size={34} className="breathe" />
      <span className="grow">
        <span className="small" style={{ display: 'block' }}>{author}</span>
        <span className="tiny soft">{why}</span>
      </span>
    </div>
  );
}
