/**
 * Janji temu: rencana kencan / kumpul. Isi rencana & cerita sesudahnya
 * dienkripsi dengan kunci lingkaran; server hanya tahu waktu dan kehadiran.
 */
import { type Keyring, type MediaRef, type MeetEntryKind, type MeetEntryWire, type MeetRsvp, type MeetWire, openEnvelope, sealEnvelope } from '@sehari/core';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { api } from './api';
import { type CircleView, newDropId, useKeyring } from './data';

export interface MeetPayload {
  v: 1;
  title: string;
  place: { name: string; address?: string };
  activity?: string;
  food?: string;
  dress?: string;
  challenge?: string;
  question?: string;
  budget?: string;
  notes?: string;
  /** Jam selesai kira-kira (ISO), opsional. */
  endsAt?: string;
}

export type EntryPayload =
  | { kind: 'story'; title?: string; text: string; rating?: number; best?: string; next?: string }
  | { kind: 'note'; text: string }
  | { kind: 'wish'; text: string }
  | { kind: 'photo'; media: MediaRef[]; caption?: string };

export interface OpenMeet {
  wire: MeetWire;
  plan: MeetPayload | null;
  entries: { wire: MeetEntryWire; data: EntryPayload | null }[];
}

export const mk = {
  all: ['meets'] as const,
  circle: (id: string) => ['meets', 'circle', id] as const,
  one: (id: string) => ['meets', 'one', id] as const,
};

function open<T>(env: unknown, ring: Keyring | null): T | null {
  if (!ring) return null;
  try {
    return openEnvelope<T>(env as never, ring);
  } catch {
    return null;
  }
}

export function openMeet(wire: MeetWire, ring: Keyring | null): OpenMeet {
  return {
    wire,
    plan: open<MeetPayload>(wire.envelope, ring),
    entries: wire.entries.map((e) => ({ wire: e, data: open<EntryPayload>(e.envelope, ring) })),
  };
}

const useOpened = (wires: MeetWire[] | undefined) => {
  const ring = useKeyring();
  return useMemo(() => (wires ?? []).map((w) => openMeet(w, ring)), [wires, ring]);
};

export function useMeets() {
  const q = useQuery({ queryKey: mk.all, queryFn: () => api.get<MeetWire[]>('/meets') });
  return { ...q, meets: useOpened(q.data) };
}
export function useCircleMeets(circleId: string) {
  const q = useQuery({ queryKey: mk.circle(circleId), queryFn: () => api.get<MeetWire[]>(`/circles/${circleId}/meets`) });
  return { ...q, meets: useOpened(q.data) };
}
export function useMeet(id: string) {
  const ring = useKeyring();
  const q = useQuery({ queryKey: mk.one(id), queryFn: () => api.get<MeetWire>(`/meets/${id}`), enabled: !!id, refetchInterval: id ? 20_000 : false });
  return { ...q, meet: useMemo(() => (q.data ? openMeet(q.data, ring) : null), [q.data, ring]) };
}

export function useRefreshMeets() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: mk.all });
}

function circleSeal(value: unknown, circle: CircleView, me: { id: string; publicKey: Uint8Array }) {
  const key = circle.keys.get(circle.currentEpoch);
  if (!key) throw new Error('Kunci lingkaran belum tersedia di perangkat ini.');
  const env = sealEnvelope(value, [
    { t: 'user', userId: me.id, publicKey: me.publicKey },
    { t: 'circle', circleId: circle.id, epoch: circle.currentEpoch, key },
  ]);
  return { ciphertext: env.ciphertext, recipients: env.recipients };
}

export const newMeetId = () => `m${newDropId().slice(1)}`;

export async function createMeet(id: string, circle: CircleView, startsAt: Date, plan: MeetPayload, me: { id: string; publicKey: Uint8Array }) {
  return api.post<MeetWire>('/meets', { id, circleId: circle.id, startsAt: startsAt.toISOString(), envelope: circleSeal(plan, circle, me) });
}
export async function updateMeet(id: string, circle: CircleView, patch: { startsAt?: Date; plan?: MeetPayload; status?: MeetWire['status'] }, me: { id: string; publicKey: Uint8Array }) {
  return api.patch<MeetWire>(`/meets/${id}`, {
    startsAt: patch.startsAt?.toISOString(),
    envelope: patch.plan ? circleSeal(patch.plan, circle, me) : undefined,
    status: patch.status,
  });
}
export const rsvpMeet = (id: string, rsvp: MeetRsvp) => api.put<MeetWire>(`/meets/${id}/rsvp`, { rsvp });
export const arriveMeet = (id: string) => api.post<MeetWire>(`/meets/${id}/arrive`);
export const metMeet = (id: string, on: boolean) => (on ? api.post<MeetWire>(`/meets/${id}/met`) : api.del<MeetWire>(`/meets/${id}/met`));

export async function addMeetEntry(meetId: string, kind: MeetEntryKind, data: EntryPayload, circle: CircleView, me: { id: string; publicKey: Uint8Array }, mediaIds: string[] = []) {
  return api.post<MeetWire>(`/meets/${meetId}/entries`, { id: newDropId(), kind, envelope: circleSeal(data, circle, me), mediaIds });
}

// ── Waktu ───────────────────────────────────────────────────────────────────

export function countdown(iso: string, now = Date.now()): string {
  const ms = new Date(iso).getTime() - now;
  if (ms <= 0) return ms > -6 * 3600_000 ? 'sedang berlangsung' : 'sudah lewat';
  const m = Math.round(ms / 60000);
  if (m < 60) return `${m} menit lagi`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} jam lagi`;
  const d = Math.round(h / 24);
  return d === 1 ? 'besok' : `${d} hari lagi`;
}

export const fmtWhen = (iso: string, opts: Intl.DateTimeFormatOptions = { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }) => new Intl.DateTimeFormat('id-ID', opts).format(new Date(iso));

export const mapUrl = (p: MeetPayload['place']) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([p.name, p.address].filter(Boolean).join(', '))}`;

/** Berkas kalender (.ics) untuk ditambahkan ke Google Calendar / Apple Calendar. */
export function icsFor(m: OpenMeet): string {
  const start = new Date(m.wire.startsAt);
  const end = m.plan?.endsAt ? new Date(m.plan.endsAt) : new Date(start.getTime() + 3 * 3600_000);
  const z = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const esc = (s: string) => s.replace(/[,;\\]/g, (c) => `\\${c}`).replace(/\n/g, '\\n');
  const p = m.plan;
  const desc = [p?.activity && `ngapain: ${p.activity}`, p?.food && `makan: ${p.food}`, p?.dress && `dresscode: ${p.dress}`, p?.challenge && `misi: ${p.challenge}`, p?.notes].filter(Boolean).join('\n');
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Sehari//Janji Temu//ID',
    'BEGIN:VEVENT',
    `UID:${m.wire.id}@sehari`,
    `DTSTAMP:${z(new Date())}`,
    `DTSTART:${z(start)}`,
    `DTEND:${z(end)}`,
    `SUMMARY:${esc(p?.title ?? 'Janji temu')}`,
    `LOCATION:${esc([p?.place.name, p?.place.address].filter(Boolean).join(', '))}`,
    `DESCRIPTION:${esc(desc)}`,
    'BEGIN:VALARM',
    'TRIGGER:-PT2H',
    'ACTION:DISPLAY',
    'DESCRIPTION:Janji temu sebentar lagi',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}

export function download(name: string, data: Blob) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(data);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
