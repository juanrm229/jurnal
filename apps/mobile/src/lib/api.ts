import type { ApiErrorBody } from '@sehari/core';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

function defaultBase(): string {
  const env = process.env.EXPO_PUBLIC_API_URL;
  if (env) return env.replace(/\/$/, '');
  const extra = (Constants.expoConfig?.extra as { apiUrl?: string } | undefined)?.apiUrl;
  if (Platform.OS === 'web' && typeof location !== 'undefined' && location.hostname !== 'localhost') {
    return `${location.protocol}//${location.hostname}:8787`;
  }
  // Di HP saat pengembangan: pakai IP komputer tempat Metro berjalan.
  const host = Constants.expoConfig?.hostUri?.split(':')[0];
  if (Platform.OS !== 'web' && host && extra?.includes('localhost')) return extra.replace('localhost', host);
  return extra ?? 'http://localhost:8787';
}

export const API_URL = defaultBase();

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

let token: string | null = null;
let onUnauthorized: (() => void) | null = null;

export function setToken(t: string | null) {
  token = t;
}
export function getToken() {
  return token;
}
export function setUnauthorizedHandler(fn: () => void) {
  onUnauthorized = fn;
}

async function request<T>(method: string, path: string, body?: unknown, raw?: { data: Uint8Array; type: string }): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}/v1${path}`, {
      method,
      headers: {
        ...(token ? { authorization: `Bearer ${token}` } : {}),
        ...(body !== undefined ? { 'content-type': 'application/json' } : {}),
        ...(raw ? { 'content-type': raw.type } : {}),
      },
      body: raw ? (raw.data as unknown as BodyInit) : body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(0, 'offline', 'Tidak tersambung. Harimu tetap tersimpan di perangkat dulu.');
  }
  if (res.status === 401 && token) onUnauthorized?.();
  const text = await res.text();
  const json = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const err = (json as ApiErrorBody | null)?.error;
    throw new ApiError(res.status, err?.code ?? 'error', err?.message ?? `Gagal (${res.status})`);
  }
  return json as T;
}

export const api = {
  get: <T>(p: string) => request<T>('GET', p),
  post: <T>(p: string, b?: unknown) => request<T>('POST', p, b ?? {}),
  put: <T>(p: string, b?: unknown) => request<T>('PUT', p, b ?? {}),
  patch: <T>(p: string, b?: unknown) => request<T>('PATCH', p, b ?? {}),
  del: <T>(p: string) => request<T>('DELETE', p),
  upload: <T>(p: string, data: Uint8Array, type = 'application/octet-stream') => request<T>('POST', p, undefined, { data, type }),
  async download(p: string): Promise<Uint8Array> {
    const res = await fetch(`${API_URL}/v1${p}`, { headers: token ? { authorization: `Bearer ${token}` } : {} });
    if (!res.ok) throw new ApiError(res.status, 'download', 'Gagal mengunduh.');
    return new Uint8Array(await res.arrayBuffer());
  },
};
