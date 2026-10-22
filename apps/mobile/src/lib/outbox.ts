/**
 * Antrean offline: Drop yang gagal terkirim karena tidak ada sinyal disimpan
 * di perangkat (sudah terenkripsi) dan dikirim ulang saat tersambung lagi.
 * Server menerima id yang sama secara idempoten.
 */
import type { CreateDropBody } from '@sehari/core';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { AppState } from 'react-native';
import { api, ApiError } from './api';
import { kv } from './storage';

const KEY = 'outbox';

export async function enqueue(body: CreateDropBody): Promise<void> {
  const list = (await kv.get<CreateDropBody[]>(KEY)) ?? [];
  if (!list.some((x) => x.id === body.id)) list.push(body);
  await kv.set(KEY, list);
}

export async function pending(): Promise<CreateDropBody[]> {
  return (await kv.get<CreateDropBody[]>(KEY)) ?? [];
}

export async function flush(): Promise<number> {
  const list = await pending();
  if (!list.length) return 0;
  const keep: CreateDropBody[] = [];
  let sent = 0;
  for (const body of list) {
    try {
      await api.post('/drops', body);
      sent++;
    } catch (e) {
      // Masih offline → simpan. Ditolak server (mis. hari sudah lewat) → buang.
      if (e instanceof ApiError && e.status === 0) keep.push(body);
    }
  }
  await kv.set(KEY, keep);
  return sent;
}

export function useOutboxFlusher() {
  const qc = useQueryClient();
  useEffect(() => {
    const run = () =>
      flush()
        .then((n) => {
          if (n) void qc.invalidateQueries();
        })
        .catch(() => {});
    void run();
    const sub = AppState.addEventListener('change', (st) => st === 'active' && run());
    const t = setInterval(run, 60_000);
    return () => {
      sub.remove();
      clearInterval(t);
    };
  }, [qc]);
}
