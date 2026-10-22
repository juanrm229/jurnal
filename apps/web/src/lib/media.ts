/**
 * Media dienkripsi di peramban sebelum diunggah; kuncinya ada di dalam payload
 * Drop yang juga terenkripsi. Foto dikompres dulu (maks 1600 px, JPEG).
 */
import { decryptMedia, encryptMedia, type MediaRef } from '@sehari/core';
import { useEffect, useState } from 'react';
import { api } from './api';

export async function uploadBytes(bytes: Uint8Array, mime: string, extra: Partial<MediaRef> = {}): Promise<MediaRef> {
  const { data, key } = encryptMedia(bytes);
  const { id } = await api.upload<{ id: string }>('/media', data);
  return { id, key, mime, ...extra };
}

export async function compressImage(file: Blob, max = 1600): Promise<{ bytes: Uint8Array; width: number; height: number; tint: string }> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const w = Math.round(bmp.width * scale);
  const h = Math.round(bmp.height * scale);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(bmp, 0, 0, w, h);
  // Warna rata-rata sebagai placeholder saat memuat.
  const px = ctx.getImageData(0, 0, w, h).data;
  let r = 0, g = 0, b = 0, n = 0;
  for (let i = 0; i < px.length; i += 4 * 97) {
    r += px[i]!;
    g += px[i + 1]!;
    b += px[i + 2]!;
    n++;
  }
  const hex = (v: number) => Math.round(v / n).toString(16).padStart(2, '0');
  const blob = await new Promise<Blob>((res, rej) => canvas.toBlob((x) => (x ? res(x) : rej(new Error('gagal kompres'))), 'image/jpeg', 0.82));
  return { bytes: new Uint8Array(await blob.arrayBuffer()), width: w, height: h, tint: `#${hex(r)}${hex(g)}${hex(b)}` };
}

export async function uploadPhoto(file: Blob): Promise<MediaRef> {
  const c = await compressImage(file);
  return uploadBytes(c.bytes, 'image/jpeg', { width: c.width, height: c.height, tint: c.tint });
}

const memo = new Map<string, Promise<string>>();

export function mediaUrl(ref: MediaRef): Promise<string> {
  let p = memo.get(ref.id);
  if (!p) {
    p = api.download(`/media/${ref.id}`).then((enc) => URL.createObjectURL(new Blob([decryptMedia(enc, ref.key) as unknown as BlobPart], { type: ref.mime })));
    memo.set(ref.id, p);
    p.catch(() => memo.delete(ref.id));
  }
  return p;
}

/** Pratinjau lokal sebelum unggah selesai (foto baru langsung tampil). */
export function primeMedia(id: string, url: string) {
  memo.set(id, Promise.resolve(url));
}

export function useMediaUrl(ref: MediaRef | undefined): string | null {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    setUrl(null);
    if (ref) mediaUrl(ref).then((u) => alive && setUrl(u)).catch(() => {});
    return () => {
      alive = false;
    };
  }, [ref?.id]);
  return url;
}
