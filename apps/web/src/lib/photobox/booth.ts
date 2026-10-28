/**
 * Sinkron photobox berdua: jam bersama dari server, kunci pratinjau di dalam
 * envelope lingkaran, pratinjau ±1 fps terenkripsi, dan jepretan sebagai
 * media terenkripsi biasa.
 */
import { type BoothConfig, type BoothWire, decryptBytes, encryptBytes, fromBase64, type Keyring, type MediaRef, newSymmetricKey, openEnvelope, toBase64 } from '@sehari/core';
import { useQuery } from '@tanstack/react-query';
import { useRef } from 'react';
import { api } from '../api';
import { type CircleView, newDropId } from '../data';
import { uploadBytes } from '../media';
import { circleSeal } from '../meets';
import { toBlob } from './camera';

type Me = { id: string; publicKey: Uint8Array };

export async function createBooth(circle: CircleView, config: BoothConfig, me: Me) {
  const key = newSymmetricKey();
  return api.post<BoothWire>(`/circles/${circle.id}/booths`, { id: `bx${newDropId().slice(1)}`, envelope: circleSeal({ previewKey: toBase64(key) }, circle, me), config });
}

export function boothKey(w: BoothWire | undefined, ring: Keyring | null): Uint8Array | null {
  if (!w || !ring) return null;
  try {
    return fromBase64(openEnvelope<{ previewKey: string }>(w.envelope as never, ring).previewKey);
  } catch {
    return null;
  }
}

/**
 * Status booth, diperbarui terus. `skew` = jam server − jam HP ini, diambil dari
 * sampel dengan jeda jaringan terpendek supaya hitung mundur kedua HP sama.
 */
export function useBooth(id: string, fast: boolean) {
  const skew = useRef<{ v: number; rtt: number }>({ v: 0, rtt: Infinity });
  const q = useQuery({
    queryKey: ['booth', id],
    queryFn: async () => {
      const t0 = Date.now();
      const w = await api.get<BoothWire>(`/booths/${id}`);
      const t1 = Date.now();
      const rtt = t1 - t0;
      if (rtt < skew.current.rtt + 40) skew.current = { v: new Date(w.serverNow).getTime() - (t0 + t1) / 2, rtt: Math.min(rtt, skew.current.rtt) };
      return w;
    },
    refetchInterval: fast ? 700 : 1500,
    refetchIntervalInBackground: true,
    retry: 1,
  });
  /** Ubah jam server (ISO) ke jam HP ini. */
  const local = (iso: string) => new Date(iso).getTime() - skew.current.v;
  return { ...q, local };
}

export const joinBooth = (id: string) => api.post<BoothWire>(`/booths/${id}/join`);
export const setReady = (id: string, ready: boolean) => api.patch<BoothWire>(`/booths/${id}`, { ready });
export const setConfig = (id: string, config: BoothConfig) => api.patch<BoothWire>(`/booths/${id}`, { config });
export const startBooth = (id: string) => api.post<BoothWire>(`/booths/${id}/start`);
export const resetBooth = (id: string) => api.post<BoothWire>(`/booths/${id}/reset`);

export async function sendPreview(id: string, key: Uint8Array, c: HTMLCanvasElement) {
  const b = await toBlob(c, 'image/jpeg', 0.6);
  await api.upload(`/booths/${id}/preview`, encryptBytes(key, new Uint8Array(await b.arrayBuffer())));
}

export async function fetchPreview(id: string, userId: string, key: Uint8Array): Promise<string> {
  const enc = await api.download(`/booths/${id}/preview/${userId}`);
  return URL.createObjectURL(new Blob([decryptBytes(key, enc) as unknown as BlobPart], { type: 'image/jpeg' }));
}

export async function uploadFrames(id: string, circle: CircleView, me: Me, frames: HTMLCanvasElement[]) {
  const refs: MediaRef[] = [];
  for (const c of frames) {
    const b = await toBlob(c, 'image/jpeg', 0.86);
    refs.push(await uploadBytes(new Uint8Array(await b.arrayBuffer()), 'image/jpeg', { width: c.width, height: c.height }));
  }
  return api.put<BoothWire>(`/booths/${id}/frames`, { envelope: circleSeal({ frames: refs }, circle, me), mediaIds: refs.map((r) => r.id) });
}

export function framesOf(w: BoothWire | undefined, userId: string | null, ring: Keyring | null): MediaRef[] | null {
  const f = w?.frames.find((x) => x.userId === userId);
  if (!f || !ring) return null;
  try {
    return openEnvelope<{ frames: MediaRef[] }>(f.envelope as never, ring).frames;
  } catch {
    return null;
  }
}

/** Hasil strip untuk ditempel ke halaman hari ini (dibawa lewat memori, bukan URL). */
let pending: Blob | null = null;
export const setPendingStrip = (b: Blob) => (pending = b);
export const takePendingStrip = () => {
  const b = pending;
  pending = null;
  return b;
};
