/**
 * Daftar Mimpi Bersama: bucket list lingkaran. Isi tiap mimpi dienkripsi
 * dengan kunci lingkaran; server hanya tahu siapa ikut mau dan kapan terwujud.
 */
import { type DreamCategory, type DreamWhen, type DreamWire, type Keyring, openEnvelope } from '@sehari/core';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { api } from './api';
import { type CircleView, newDropId, useKeyring } from './data';
import { circleSeal } from './meets';

export interface DreamPayload {
  v: 1;
  title: string;
  note?: string;
  cat: DreamCategory;
  when?: DreamWhen;
}

export interface OpenDream {
  wire: DreamWire;
  data: DreamPayload | null;
}

export const dk = { circle: (id: string) => ['dreams', id] as const };

function open(w: DreamWire, ring: Keyring | null): DreamPayload | null {
  if (!ring) return null;
  try {
    return openEnvelope<DreamPayload>(w.envelope as never, ring);
  } catch {
    return null;
  }
}

export function useDreams(circleId: string | undefined) {
  const ring = useKeyring();
  const q = useQuery({ queryKey: dk.circle(circleId ?? ''), queryFn: () => api.get<DreamWire[]>(`/circles/${circleId}/dreams`), enabled: !!circleId });
  const dreams = useMemo(() => (q.data ?? []).map((w) => ({ wire: w, data: open(w, ring) })), [q.data, ring]);
  return { ...q, dreams };
}

export function useRefreshDreams(circleId: string) {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: dk.circle(circleId) });
}

type Me = { id: string; publicKey: Uint8Array };

export const addDream = (circle: CircleView, data: DreamPayload, me: Me) =>
  api.post<DreamWire>(`/circles/${circle.id}/dreams`, { id: `dr${newDropId().slice(1)}`, envelope: circleSeal(data, circle, me) });
export const editDream = (id: string, circle: CircleView, data: DreamPayload, me: Me) => api.patch<DreamWire>(`/dreams/${id}`, { envelope: circleSeal(data, circle, me) });
export const setDreamDone = (id: string, done: boolean) => api.patch<DreamWire>(`/dreams/${id}`, { done });
export const linkDreamMeet = (id: string, meetId: string | null) => api.patch<DreamWire>(`/dreams/${id}`, { meetId });
export const likeDream = (id: string, on: boolean) => (on ? api.post<DreamWire>(`/dreams/${id}/like`) : api.del<DreamWire>(`/dreams/${id}/like`));
export const deleteDream = (id: string) => api.del(`/dreams/${id}`);
