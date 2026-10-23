/**
 * Karya: esai, cerpen, puisi, catatan, surat, fragmen. Seluruh isinya
 * (judul, teks, sampul) dienkripsi di perangkat sebelum dikirim.
 */
import { type Keyring, type MoodCode, openEnvelope, type RecipientSpec, sealEnvelope, type WorkNoteWire, type WorkStatus, type WorkWire } from '@sehari/core';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { api } from './api';
import { type CircleView, newDropId, useKeyring } from './data';

export type WorkKind = 'esai' | 'cerpen' | 'puisi' | 'catatan' | 'surat' | 'fragmen';

export const KIND_INFO: Record<WorkKind, { name: string; tagline: string; doodle: string; prose: boolean }> = {
  esai: { name: 'esai pribadi', tagline: 'pikiran yang ingin kamu urai pelan-pelan', doodle: 'pena', prose: true },
  cerpen: { name: 'cerpen', tagline: 'dunia kecil dengan tokoh dan akhir', doodle: 'buku-terbuka', prose: true },
  puisi: { name: 'puisi', tagline: 'baris-baris yang tidak perlu menjelaskan diri', doodle: 'bulan', prose: false },
  catatan: { name: 'catatan harian', tagline: 'jurnal panjang untuk dirimu sendiri', doodle: 'buku', prose: true },
  surat: { name: 'surat', tagline: 'untuk seseorang — dikirim atau tidak', doodle: 'amplop', prose: true },
  fragmen: { name: 'fragmen', tagline: 'potongan, kilasan, catatan pinggir', doodle: 'kertas-sobek', prose: false },
};
export const KINDS = Object.keys(KIND_INFO) as WorkKind[];

/** Warna sampul — dipadukan dengan tinta tema. */
export const COVERS = ['tinta', 'malam', 'krem', 'merah-bata', 'lumut', 'senja', 'kabut', 'kertas'] as const;
export type CoverTone = (typeof COVERS)[number];

export interface WorkPayload {
  v: 1;
  kind: WorkKind;
  title: string;
  subtitle?: string;
  epigraph?: string;
  body: string;
  cover: { tone: CoverTone; doodle?: string };
  promptId?: string;
  mood?: MoodCode;
}

export interface OpenWork {
  wire: WorkWire;
  work: WorkPayload | null;
}

export const wk = {
  mine: ['works', 'mine'] as const,
  feed: ['works', 'feed'] as const,
  circle: (id: string) => ['works', 'circle', id] as const,
  one: (id: string) => ['works', 'one', id] as const,
  notes: (id: string) => ['works', 'notes', id] as const,
};

export function openWork(wire: WorkWire, ring: Keyring | null): OpenWork {
  if (!ring) return { wire, work: null };
  try {
    return { wire, work: openEnvelope<WorkPayload>(wire.envelope as never, ring) };
  } catch {
    return { wire, work: null };
  }
}

function useOpened(wires: WorkWire[] | undefined) {
  const ring = useKeyring();
  return useMemo(() => (wires ?? []).map((w) => openWork(w, ring)), [wires, ring]);
}

export function useMyWorks() {
  const q = useQuery({ queryKey: wk.mine, queryFn: () => api.get<WorkWire[]>('/works') });
  return { ...q, works: useOpened(q.data) };
}
export function useWorkFeed() {
  const q = useQuery({ queryKey: wk.feed, queryFn: () => api.get<WorkWire[]>('/works/feed') });
  return { ...q, works: useOpened(q.data) };
}
export function useCircleWorks(circleId: string) {
  const q = useQuery({ queryKey: wk.circle(circleId), queryFn: () => api.get<WorkWire[]>(`/circles/${circleId}/works`) });
  return { ...q, works: useOpened(q.data) };
}
export function useWork(id: string | undefined) {
  const ring = useKeyring();
  const q = useQuery({ queryKey: wk.one(id ?? ''), queryFn: () => api.get<WorkWire>(`/works/${id}`), enabled: !!id });
  return { ...q, open: useMemo(() => (q.data ? openWork(q.data, ring) : null), [q.data, ring]) };
}

export function newWorkId() {
  return `w${newDropId().slice(1)}`;
}

/** Kunci penerima: aku + kunci lingkaran tujuan. */
function recipients(ctx: { meId: string; publicKey: Uint8Array; circles: CircleView[] }, circleIds: string[]): RecipientSpec[] {
  const r: RecipientSpec[] = [{ t: 'user', userId: ctx.meId, publicKey: ctx.publicKey }];
  for (const id of circleIds) {
    const c = ctx.circles.find((x) => x.id === id);
    const key = c?.keys.get(c.currentEpoch);
    if (!c || !key) throw new Error('Kunci lingkaran belum tersedia di perangkat ini.');
    r.push({ t: 'circle', circleId: id, epoch: c.currentEpoch, key });
  }
  return r;
}

export async function saveWork(id: string, work: WorkPayload, status: WorkStatus, circleIds: string[], ctx: { meId: string; publicKey: Uint8Array; circles: CircleView[] }): Promise<WorkWire> {
  const ids = status === 'published' ? circleIds : [];
  const env = sealEnvelope(work, recipients(ctx, ids));
  return api.post<WorkWire>('/works', { id, status, circleIds: ids, envelope: { ciphertext: env.ciphertext, recipients: env.recipients } });
}

export function useReactWork(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ kind, on }: { kind: 'hug' | 'me_too' | 'candle' | 'here'; on: boolean }) => (on ? api.put(`/works/${id}/reactions/${kind}`) : api.del(`/works/${id}/reactions/${kind}`)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['works'] }),
  });
}

export function useWorkNotes(id: string) {
  const ring = useKeyring();
  const q = useQuery({ queryKey: wk.notes(id), queryFn: () => api.get<WorkNoteWire[]>(`/works/${id}/notes`) });
  const notes = useMemo(
    () =>
      (q.data ?? []).map((n) => {
        try {
          return { wire: n, text: ring ? openEnvelope<{ text: string }>(n.envelope as never, ring).text : '…' };
        } catch {
          return { wire: n, text: '…' };
        }
      }),
    [q.data, ring],
  );
  return { ...q, notes };
}

export async function addWorkNote(workId: string, text: string, circleIds: string[], ctx: { meId: string; publicKey: Uint8Array; circles: CircleView[] }) {
  const env = sealEnvelope({ text }, recipients(ctx, circleIds.filter((id) => ctx.circles.some((c) => c.id === id && c.keys.get(c.currentEpoch)))));
  await api.post(`/works/${workId}/notes`, { id: newDropId(), envelope: { ciphertext: env.ciphertext, recipients: env.recipients } });
}

// ── Hitung ──────────────────────────────────────────────────────────────────

export const countWords = (s: string) => (s.trim().match(/[\p{L}\p{N}'’-]+/gu) ?? []).length;
export const readingMinutes = (words: number) => Math.max(1, Math.round(words / 200));

/** Cuplikan polos untuk kartu rak. */
export function excerpt(body: string, n = 160) {
  const t = body
    .replace(/^#+\s+/gm, '')
    .replace(/^>\s?/gm, '')
    .replace(/[*_~]/g, '')
    .replace(/^(---|\*\*\*|❦)\s*$/gm, '')
    .replace(/\s+/g, ' ')
    .trim();
  return t.length > n ? `${t.slice(0, n).replace(/\s\S*$/, '')}…` : t;
}
