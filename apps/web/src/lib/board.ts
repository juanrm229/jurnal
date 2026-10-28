/**
 * Papan Inspirasi: moodboard lingkaran. Tiap tempelan (foto, tautan, catatan,
 * incaran) dienkripsi dengan kunci lingkaran; fotonya media terenkripsi biasa.
 */
import { type BoardItemWire, type Keyring, type MediaRef, openEnvelope } from '@sehari/core';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { api } from './api';
import { type CircleView, newDropId, useKeyring } from './data';
import { circleSeal } from './meets';

export type PinType = 'photo' | 'link' | 'note';

export interface PinPayload {
  v: 1;
  type: PinType;
  title?: string;
  note?: string;
  url?: string;
  /** Incaran: harga bebas ditulis, mis. "Rp120.000". */
  price?: string;
  media?: MediaRef;
  /** Warna kertas catatan. */
  color?: 'yellow' | 'peach' | 'green' | 'blue';
  /** Rak: 'incaran' (barang untuk dibeli) atau 'ide'. */
  shelf: 'incaran' | 'ide';
}

export interface OpenPin {
  wire: BoardItemWire;
  data: PinPayload | null;
}

export const bk = { circle: (id: string) => ['board', id] as const };

function open(w: BoardItemWire, ring: Keyring | null): PinPayload | null {
  if (!ring) return null;
  try {
    return openEnvelope<PinPayload>(w.envelope as never, ring);
  } catch {
    return null;
  }
}

export function useBoard(circleId: string | undefined) {
  const ring = useKeyring();
  const q = useQuery({ queryKey: bk.circle(circleId ?? ''), queryFn: () => api.get<BoardItemWire[]>(`/circles/${circleId}/board`), enabled: !!circleId });
  const pins = useMemo(() => (q.data ?? []).map((w) => ({ wire: w, data: open(w, ring) })), [q.data, ring]);
  return { ...q, pins };
}

export function useRefreshBoard(circleId: string) {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: bk.circle(circleId) });
}

type Me = { id: string; publicKey: Uint8Array };

export const addPin = (circle: CircleView, data: PinPayload, me: Me) =>
  api.post<BoardItemWire>(`/circles/${circle.id}/board`, { id: `pn${newDropId().slice(1)}`, envelope: circleSeal(data, circle, me), mediaIds: data.media ? [data.media.id] : [] });
export const setPinDone = (id: string, done: boolean) => api.patch<BoardItemWire>(`/board/${id}`, { done });
export const deletePin = (id: string) => api.del(`/board/${id}`);

export function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

/** Kemiringan & warna yang stabil per tempelan, supaya papannya terasa ditempel tangan. */
export function tiltFor(id: string, max = 3): number {
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) | 0;
  return ((Math.abs(h) % 1000) / 1000 - 0.5) * 2 * max;
}
