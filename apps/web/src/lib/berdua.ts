/**
 * Berdua: bendera putih, tukar pena, tinta hilang. Isi dienkripsi dengan kunci
 * lingkaran di perangkat; server hanya menahan dan melepas ciphertext.
 */
import type { InkLive, SwapState, TruceState } from '@sehari/core';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { api, API_URL, currentToken } from './api';
import { type CircleView, newDropId, openCircleText, sealCircleText } from './data';

export const bk = {
  truce: (id: string) => ['truce', id] as const,
  swaps: (id: string) => ['swaps', id] as const,
  inks: (id: string) => ['inks', id] as const,
};

const newId = (p: string) => `${p}${newDropId().slice(1)}`;
export const openNote = (circle: CircleView, enc: string | null) => (enc ? openCircleText(circle, enc, '') : '');

export function useTruce(circleId: string | undefined) {
  return useQuery({ queryKey: bk.truce(circleId ?? ''), queryFn: () => api.get<TruceState>(`/circles/${circleId}/truce`), enabled: !!circleId, refetchInterval: 60_000 });
}
export const raiseTruce = (circleId: string) => api.post<TruceState>(`/circles/${circleId}/truce`);
export const lowerTruce = (circleId: string) => api.del<TruceState>(`/circles/${circleId}/truce`);

export function useSwaps(circleId: string | undefined) {
  return useQuery({ queryKey: bk.swaps(circleId ?? ''), queryFn: () => api.get<SwapState>(`/circles/${circleId}/swaps`), enabled: !!circleId, refetchInterval: 60_000 });
}
export const sendSwap = (circle: CircleView, month: string, aboutId: string, text: string) =>
  api.post<SwapState>(`/circles/${circle.id}/swaps`, { id: newId('sw'), month, aboutId, enc: sealCircleText(circle, text) });

/**
 * Detak kehadiran + tinta. Selama `on`, perangkat ini tercatat "sedang di sini"
 * tiap beberapa detik; saat ditinggalkan, langsung dicatat pergi.
 */
export function useInkLive(circleId: string | undefined, on: boolean) {
  const q = useQuery({
    queryKey: bk.inks(circleId ?? ''),
    queryFn: () => api.post<InkLive>(`/circles/${circleId}/inks/live`),
    enabled: !!circleId && on,
    refetchInterval: 6_000,
    refetchOnWindowFocus: true,
  });
  useEffect(() => {
    if (!circleId || !on) return;
    // Pergi = langsung dicatat pergi. `keepalive` supaya tetap terkirim saat tab ditutup.
    const gone = () => {
      const t = currentToken();
      if (t) void fetch(`${API_URL}/v1/circles/${circleId}/inks/live`, { method: 'DELETE', keepalive: true, headers: { authorization: `Bearer ${t}` } }).catch(() => {});
    };
    const hide = () => {
      if (document.visibilityState === 'hidden') gone();
      else void q.refetch();
    };
    document.addEventListener('visibilitychange', hide);
    window.addEventListener('pagehide', gone);
    return () => {
      document.removeEventListener('visibilitychange', hide);
      window.removeEventListener('pagehide', gone);
      gone();
    };
  }, [circleId, on]);
  return q;
}
export const writeInk = (circle: CircleView, day: string, text: string) => api.post(`/circles/${circle.id}/inks`, { id: newId('ik'), day, enc: sealCircleText(circle, text) });
export const eraseInk = (id: string) => api.del(`/inks/${id}`);

export function useRefreshBerdua(circleId: string) {
  const qc = useQueryClient();
  return (which: keyof typeof bk) => qc.invalidateQueries({ queryKey: bk[which](circleId) });
}
