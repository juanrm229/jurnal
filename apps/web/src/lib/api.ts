import type { ApiErrorBody } from '@sehari/core';

/** API di origin yang sama (server menyajikan web app), atau VITE_API_URL saat dev terpisah. */
export const API_URL = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ?? '';

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
export const setToken = (t: string | null) => (token = t);
export const currentToken = () => token;
export const setUnauthorizedHandler = (fn: () => void) => (onUnauthorized = fn);

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
    throw new ApiError(0, 'offline', 'Tidak tersambung. Coba lagi sebentar lagi.');
  }
  if (res.status === 401 && token) onUnauthorized?.();
  const text = await res.text();
  // Proksi/hosting kadang membalas halaman HTML (502, 504, batas laju): jangan sampai
  // pengguna melihat "Unexpected token <" — jatuhkan ke pesan yang bisa dimengerti.
  let json: unknown = null;
  if (text) {
    try {
      json = JSON.parse(text) as unknown;
    } catch {
      if (res.ok) throw new ApiError(res.status, 'bad_response', 'Balasan server tidak terbaca. Coba lagi sebentar lagi.');
    }
  }
  if (!res.ok) {
    const err = (json as ApiErrorBody | null)?.error;
    const fallback =
      res.status === 429
        ? 'Terlalu cepat. Tunggu sebentar, lalu coba lagi.'
        : res.status >= 500
          ? 'Server sedang sibuk. Coba lagi sebentar lagi.'
          : `Gagal (${res.status})`;
    throw new ApiError(res.status, err?.code ?? 'error', err?.message ?? fallback);
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
