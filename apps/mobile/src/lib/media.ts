/**
 * Media selalu dienkripsi di perangkat sebelum diunggah. Kuncinya ada di dalam
 * payload Drop yang juga terenkripsi, jadi server hanya melihat byte acak.
 */
import { decryptMedia, encryptMedia, type MediaRef, toBase64 } from '@sehari/core';
import { File, Paths } from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { api } from './api';

async function readBytes(uri: string): Promise<Uint8Array> {
  if (Platform.OS !== 'web' && uri.startsWith('file:')) return new File(uri).bytes();
  const res = await fetch(uri);
  return new Uint8Array(await res.arrayBuffer());
}

export async function uploadBytes(bytes: Uint8Array, mime: string, extra: Partial<MediaRef> = {}): Promise<MediaRef> {
  const { data, key } = encryptMedia(bytes);
  const { id } = await api.upload<{ id: string }>('/media', data);
  return { id, key, mime, ...extra };
}

/** Kompres foto (maks 1600 px, JPEG 0.78) lalu enkripsi & unggah. */
export async function uploadPhoto(uri: string, width?: number, height?: number): Promise<MediaRef> {
  const max = 1600;
  const resize = width && height && Math.max(width, height) > max ? (width > height ? { width: max } : { height: max }) : undefined;
  const out = await ImageManipulator.manipulateAsync(uri, resize ? [{ resize }] : [], { compress: 0.78, format: ImageManipulator.SaveFormat.JPEG });
  const bytes = await readBytes(out.uri);
  return uploadBytes(bytes, 'image/jpeg', { width: out.width, height: out.height });
}

export async function uploadFile(uri: string, mime: string, extra: Partial<MediaRef> = {}): Promise<MediaRef> {
  return uploadBytes(await readBytes(uri), mime, extra);
}

const memo = new Map<string, Promise<string>>();

/** Unduh, dekripsi, dan berikan URI lokal yang bisa diputar/ditampilkan. */
export function mediaUri(ref: MediaRef): Promise<string> {
  let p = memo.get(ref.id);
  if (!p) {
    p = (async () => {
      const bytes = decryptMedia(await api.download(`/media/${ref.id}`), ref.key);
      if (Platform.OS === 'web') {
        return URL.createObjectURL(new Blob([bytes as unknown as BlobPart], { type: ref.mime }));
      }
      const ext = ref.mime.split('/')[1]?.split(';')[0] ?? 'bin';
      const f = new File(Paths.cache, `m_${ref.id}.${ext}`);
      if (!f.exists) f.write(bytes);
      return f.uri;
    })();
    memo.set(ref.id, p);
    p.catch(() => memo.delete(ref.id));
  }
  return p;
}

export function useMediaUri(ref: MediaRef | undefined): { uri: string | null; error: boolean } {
  const [uri, setUri] = useState<string | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    let alive = true;
    setUri(null);
    setError(false);
    if (ref) {
      mediaUri(ref)
        .then((u) => alive && setUri(u))
        .catch(() => alive && setError(true));
    }
    return () => {
      alive = false;
    };
  }, [ref?.id]);
  return { uri, error };
}

export function bytesToDataUri(bytes: Uint8Array, mime: string): string {
  return `data:${mime};base64,${toBase64(bytes)}`;
}
