/**
 * Surat: Surat Tersesat, Surat Wasiat Kecil / kapsul waktu, dan surat petak
 * istimewa. Isi selalu dibuka di perangkat.
 */
import {
  addDays,
  diffDays,
  hashString,
  type LetterPayload,
  type LetterWire,
  MILESTONES,
  newSymmetricKey,
  openEnvelope,
  type Keyring,
  toBase64,
} from '@sehari/core';
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { api } from '@/lib/api';
import { qk, useKeyring } from '@/lib/data';

export type StickyColor = 'yellow' | 'peach' | 'green' | 'blue';
const COLORS: StickyColor[] = ['yellow', 'peach', 'green', 'blue'];

export function newLetterId(): string {
  const r = toBase64(newSymmetricKey()).replace(/[^a-zA-Z0-9]/g, '').slice(0, 12).toLowerCase();
  return `l${Date.now().toString(36)}${r}`;
}

export const stickyColorFor = (id: string): StickyColor => COLORS[hashString(id) % COLORS.length]!;
export const tiltFor = (id: string): number => ((hashString(`t${id}`) % 9) - 4) * 0.8;

export const KIND_LABEL: Record<LetterWire['kind'], string> = {
  lost: 'Surat Tersesat',
  future: 'Surat untuk Nanti',
  milestone: 'Surat Petak Istimewa',
  when: 'Surat Buka Kalau…',
};

export const KIND_DOODLE: Record<LetterWire['kind'], string> = { lost: 'surat-botol', future: 'jam-pasir', milestone: 'kunci', when: 'amplop' };

/** Momen siap pakai untuk Surat "Buka Kalau…". */
export const WHEN_MOMENTS = [
  'buka kalau kamu sedih',
  'buka kalau kamu kangen aku',
  'buka kalau kamu tidak bisa tidur',
  'buka kalau kita habis bertengkar',
  'buka kalau kamu ragu sama dirimu',
  'buka kalau kamu merasa sendirian',
  'buka kalau kamu sedang bahagia',
  'buka kalau kamu capek sekali',
  'buka kalau hari ini ulang tahunmu',
  'buka kalau kamu baru saja gagal',
  'buka kalau kamu butuh tertawa',
  'buka kalau kamu lupa kenapa kita bersama',
];

export function milestoneName(days: number | null | undefined): string | undefined {
  return MILESTONES.find((m) => m.days === days)?.name;
}

export function openLetter(l: LetterWire, ring: Keyring | null): LetterPayload | null {
  if (!l.envelope || !ring) return null;
  try {
    return openEnvelope<LetterPayload>(l.envelope as never, ring);
  } catch {
    return null;
  }
}

/** Semua surat (masuk & keluar), sudah dibuka bila kuncinya ada. */
export function useAllLetters() {
  const ring = useKeyring();
  const inbox = useQuery({ queryKey: qk.letters('inbox'), queryFn: () => api.get<LetterWire[]>('/letters?box=inbox') });
  const outbox = useQuery({ queryKey: qk.letters('outbox'), queryFn: () => api.get<LetterWire[]>('/letters?box=outbox') });
  const open = useMemo(() => {
    const m = new Map<string, LetterPayload | null>();
    for (const l of [...(inbox.data ?? []), ...(outbox.data ?? [])]) if (!m.has(l.id)) m.set(l.id, openLetter(l, ring));
    return m;
  }, [inbox.data, outbox.data, ring]);
  return { inbox, outbox, open };
}

/** Tanggal ISO → "22 Oktober 2026" menurut zona pengguna. */
export function formatWhen(iso: string, tz: string): string {
  try {
    return new Intl.DateTimeFormat('id-ID', { timeZone: tz, day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(iso));
  } catch {
    return iso.slice(0, 10);
  }
}

export function isoDay(iso: string, tz: string): string {
  try {
    const p = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(iso));
    return p;
  } catch {
    return iso.slice(0, 10);
  }
}

/** Berapa lama surat di perjalanan, dengan bahasa yang lembut. */
export function travelled(writtenAt: string, deliveredAt: string | null, tz: string): string | null {
  if (!deliveredAt) return null;
  const d = diffDays(isoDay(deliveredAt, tz), isoDay(writtenAt, tz));
  if (d <= 0) return null;
  if (d < 45) return `${d} hari di perjalanan`;
  const months = Math.round(d / 30);
  return `kira-kira ${months} bulan di perjalanan`;
}

/** Hari ke-n lingkaran jatuh pada tanggal ini. */
export const milestoneDay = (createdDay: string, n: number) => addDays(createdDay, n - 1);
