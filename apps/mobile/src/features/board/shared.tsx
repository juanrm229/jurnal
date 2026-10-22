/**
 * Bahan bersama untuk layar-layar Papan & Kitab: pemilih tahun, teks yang
 * sudah didekripsi di perangkat, cakupan segel per hari, dan sampul genre.
 */
import {
  type AuthoredText,
  type CircleCalendarDay,
  type CircleKind,
  type DayKey,
  type DropKind,
  GENRES,
  type Genre,
  hashString,
  threshold,
  type WrapDrop,
} from '@sehari/core';
import { memo } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Line, Path, Rect } from 'react-native-svg';
import { ApiError } from '@/lib/api';
import type { CircleView, OpenDrop } from '@/lib/data';
import { Doodle } from '@/ui/Doodle';
import { IconButton, Row, Txt } from '@/ui/kit';
import { type Palette, useTheme } from '@/ui/theme';

// ── Tahun ───────────────────────────────────────────────────────────────────

export function YearSwitch({ year, min, max, onChange, testID }: { year: number; min: number; max: number; onChange: (y: number) => void; testID?: string }) {
  return (
    <Row gap={0} style={{ justifyContent: 'center' }}>
      <View style={{ width: 42, alignItems: 'center' }}>
        {year > min ? <IconButton icon="ui-kembali" label="tahun sebelumnya" onPress={() => onChange(year - 1)} size={18} testID={testID ? `${testID}-prev` : undefined} /> : null}
      </View>
      <Txt v="title" ink testID={testID}>
        {year}
      </Txt>
      <View style={{ width: 42, alignItems: 'center' }}>
        {year < max ? <IconButton icon="ui-panah-kanan" label="tahun berikutnya" onPress={() => onChange(year + 1)} size={18} testID={testID ? `${testID}-next` : undefined} /> : null}
      </View>
    </Row>
  );
}

// ── Nama ────────────────────────────────────────────────────────────────────

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

export function authoredTexts(drops: OpenDrop[], opts: { kinds?: DropKind[]; authorId?: string } = {}): AuthoredText[] {
  const kinds = opts.kinds ?? TEXT_KINDS;
  return drops
    .filter((d) => d.payload?.text && kinds.includes(d.wire.kind) && (!opts.authorId || d.wire.authorId === opts.authorId))
    .sort((a, b) => (a.wire.day < b.wire.day ? -1 : a.wire.day > b.wire.day ? 1 : (a.payload!.hour * 60 + a.payload!.minute) - (b.payload!.hour * 60 + b.payload!.minute)))
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

// ── Sampul genre ────────────────────────────────────────────────────────────

export type CoverPattern = Genre['cover']['pattern'];

export function genreById(id: string | null | undefined): Genre | undefined {
  return id ? GENRES.find((g) => g.id === id) : undefined;
}

/** Warna kertas sampul dari palet tema (bukan warna tetap). */
export function coverTint(c: Palette, pattern: CoverPattern | undefined): string {
  switch (pattern) {
    case 'gelombang':
      return c.sticky.blue;
    case 'kotak':
      return c.sticky.peach;
    case 'titik':
      return c.sticky.green;
    case 'garis':
      return c.sticky.yellow;
    case 'bintang':
      return c.pill;
    case 'polos':
      return c.aged;
    default:
      return c.card;
  }
}

/** Pola tinta tipis di atas sampul: garis, titik, kotak, gelombang, bintang. */
export const CoverPatternArt = memo(function CoverPatternArt({ pattern, width, height, color, opacity = 0.28 }: { pattern: CoverPattern | undefined; width: number; height: number; color: string; opacity?: number }) {
  const els: React.ReactNode[] = [];
  const step = 12;
  if (pattern === 'garis') {
    for (let y = step; y < height; y += step) els.push(<Line key={y} x1={0} y1={y} x2={width} y2={y} stroke={color} strokeWidth={1} />);
  } else if (pattern === 'titik') {
    for (let y = step / 2; y < height; y += step) for (let x = (y / step) % 2 ? step / 2 : step; x < width; x += step) els.push(<Circle key={`${x}:${y}`} cx={x} cy={y} r={1.3} fill={color} />);
  } else if (pattern === 'kotak') {
    for (let y = 0; y < height; y += step) els.push(<Line key={`h${y}`} x1={0} y1={y} x2={width} y2={y} stroke={color} strokeWidth={0.8} />);
    for (let x = 0; x < width; x += step) els.push(<Line key={`v${x}`} x1={x} y1={0} x2={x} y2={height} stroke={color} strokeWidth={0.8} />);
  } else if (pattern === 'gelombang') {
    for (let y = step; y < height; y += step) {
      let d = `M0 ${y}`;
      for (let x = 0; x < width; x += step) d += ` q${step / 4} -4 ${step / 2} 0 t${step / 2} 0`;
      els.push(<Path key={y} d={d} stroke={color} strokeWidth={1} fill="none" />);
    }
  } else if (pattern === 'bintang') {
    for (let i = 0; i < Math.max(6, Math.round((width * height) / 500)); i++) {
      const x = unit(`bx${i}`) * width;
      const y = unit(`by${i}`) * height;
      els.push(<Path key={i} d={`M${x} ${y - 2.5} L${x} ${y + 2.5} M${x - 2.5} ${y} L${x + 2.5} ${y}`} stroke={color} strokeWidth={1} />);
    }
  }
  return (
    <Svg width={width} height={height} style={{ position: 'absolute', left: 0, top: 0 }} opacity={opacity} pointerEvents="none">
      {pattern === 'polos' ? <Rect x={4} y={4} width={width - 8} height={height - 8} stroke={color} strokeWidth={1} fill="none" /> : null}
      {els}
    </Svg>
  );
});

/** Sampul mini genre untuk dipilih bersama. */
export function GenreCover({ genre, width = 96, height = 128, selected }: { genre: Genre; width?: number; height?: number; selected?: boolean }) {
  const { c } = useTheme();
  return (
    <View
      style={{
        width,
        height,
        borderRadius: 6,
        backgroundColor: coverTint(c, genre.cover.pattern),
        borderWidth: selected ? 2.5 : 1,
        borderColor: selected ? c.ink : c.cardEdge,
        overflow: 'hidden',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      <CoverPatternArt pattern={genre.cover.pattern} width={width} height={height} color={c.ink} />
      <Doodle id={genre.cover.doodle} size={Math.min(width, height) * 0.45} />
    </View>
  );
}
