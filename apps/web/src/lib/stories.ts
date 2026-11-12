/** Hidup Orang Lain: data cerita bersama. Bagian dienkripsi di perangkat sebelum dikirim. */
import { openEnvelope, type RecipientSpec, sealEnvelope, type StoryPartPayload, type StoryPartWire, type StoryWire } from '@sehari/core';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './api';
import { type CircleView, newDropId, useKeyring } from './data';

export const sk = { all: ['stories'] as const, one: (id: string) => ['stories', id] as const };
export const newStoryId = () => `c${newDropId().slice(1)}`;

export function useStories() {
  return useQuery({ queryKey: sk.all, queryFn: () => api.get<StoryWire[]>('/stories'), refetchInterval: 30_000 });
}
/** Satu cerita; disegarkan berkala supaya segel orang lain terlihat tanpa memuat ulang. */
export function useStory(id: string) {
  return useQuery({ queryKey: sk.one(id), queryFn: () => api.get<StoryWire>(`/stories/${id}`), refetchInterval: 8_000 });
}
export function useStoryCache() {
  const qc = useQueryClient();
  return (st: StoryWire) => {
    qc.setQueryData(sk.one(st.id), st);
    void qc.invalidateQueries({ queryKey: sk.all });
  };
}

/** Buka isi sebuah bagian; null kalau belum boleh dibaca atau kuncinya tidak ada. */
export function useOpenPart() {
  const ring = useKeyring();
  return (p: StoryPartWire | undefined): StoryPartPayload | null => {
    if (!p?.envelope || !ring) return null;
    try {
      return openEnvelope<StoryPartPayload>(p.envelope as never, ring);
    } catch {
      return null;
    }
  };
}

export function sealPart(payload: StoryPartPayload, circle: CircleView | undefined, me: { id: string; publicKey: Uint8Array }) {
  const recips: RecipientSpec[] = [{ t: 'user', userId: me.id, publicKey: me.publicKey }];
  if (circle) {
    const key = circle.keys.get(circle.currentEpoch);
    if (!key) throw new Error('Kunci lingkaran belum tersedia di perangkat ini.');
    recips.push({ t: 'circle', circleId: circle.id, epoch: circle.currentEpoch, key });
  }
  const env = sealEnvelope(payload, recips);
  return { ciphertext: env.ciphertext, recipients: env.recipients };
}

export const wordCount = (s: string) => (s.trim() ? s.trim().split(/\s+/).length : 0);
