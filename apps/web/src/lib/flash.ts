/**
 * Kilasan: foto kilat & "kangen" yang langsung terlihat lingkaran, sebelum
 * segel. Isinya tetap terenkripsi end-to-end seperti Drop lain; yang berbeda
 * hanya aturan kapan ia boleh dibuka.
 */
import type { DropPayload, DropWire, FlashKind } from '@sehari/core';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { api } from './api';
import { buildDropBody, type CircleView, newDropId, nowParts, type OpenDrop, qk, useCircles, useMe, useOpenDrops, useToday } from './data';
import { uploadPhoto } from './media';
import { useSession } from './session';
import { store } from './storage';

export const FLASH_KEY = ['flashes'] as const;

export interface Flash extends OpenDrop {
  flash: FlashKind;
}

/** Kilasan terbaru dari semua lingkaran (kemarin & hari ini), terbaru dulu. */
export function useFlashes(): { flashes: Flash[]; isLoading: boolean; refetch: () => unknown } {
  const q = useQuery({
    queryKey: FLASH_KEY,
    queryFn: () => api.get<{ flashes: DropWire[] }>('/flashes'),
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });
  const opened = useOpenDrops(q.data?.flashes);
  const flashes = opened.filter((d): d is Flash => !!d.wire.meta.flash && !!d.payload).map((d) => ({ ...d, flash: d.wire.meta.flash! }));
  return { flashes, isLoading: q.isLoading, refetch: q.refetch };
}

/** Lingkaran yang bisa menerima kilasan (aktif, kamu anggota aktif, bukan kapsul momen). */
export function flashTargets(circles: CircleView[]): CircleView[] {
  return circles.filter((c) => c.status === 'active' && c.me?.state === 'active' && c.kind !== 'moment');
}

/** Pilihan bawaan: lingkaran halaman utama (sama seperti halaman hari ini). */
export function defaultFlashCircles(circles: CircleView[]): string[] {
  const targets = flashTargets(circles);
  const saved = store.json<string[]>('flashCircles') ?? store.json<string[]>('pageCircles');
  const chosen = saved ? targets.filter((c) => saved.includes(c.id)).map((c) => c.id) : [];
  return chosen.length ? chosen : targets.map((c) => c.id);
}

export function rememberFlashCircles(ids: string[]) {
  store.set('flashCircles', JSON.stringify(ids));
}

/** Kirim kilasan. Lingkaran dengan "halaman sendiri" mendapat Drop di halamannya sendiri. */
export function useSendFlash() {
  const qc = useQueryClient();
  const { me, identity } = useSession();
  const { circles } = useCircles();
  const today = useToday();
  return useCallback(
    async (kind: FlashKind, circleIds: string[], opts: { photo?: Blob; caption?: string } = {}) => {
      if (!me || !identity) throw new Error('Belum siap. Coba sebentar lagi.');
      const chosen = flashTargets(circles).filter((c) => circleIds.includes(c.id));
      if (!chosen.length) throw new Error('Pilih lingkaran tujuan.');
      let payload: DropPayload = { v: 1, kind: kind === 'snap' ? 'photo' : 'sticker', ...nowParts(me.user.tz), tz: me.user.tz, cityId: me.user.cityId ?? undefined };
      let mediaIds: string[] = [];
      if (kind === 'snap') {
        if (!opts.photo) throw new Error('Fotonya belum ada.');
        const ref = await uploadPhoto(opts.photo);
        payload = { ...payload, media: [ref], text: opts.caption?.trim() || undefined };
        mediaIds = [ref.id];
      } else {
        payload = { ...payload, sticker: 'hati-dua', style: { fill: '#F6C9D0' } };
      }
      const own = chosen.filter((c) => c.me?.ownPage);
      const main = chosen.filter((c) => !c.me?.ownPage);
      const groups: { circleIds: string[]; pageCircleId?: string }[] = [...(main.length ? [{ circleIds: main.map((c) => c.id) }] : []), ...own.map((c) => ({ circleIds: [c.id], pageCircleId: c.id }))];
      for (const g of groups) {
        const body = buildDropBody({ day: today, payload, audience: 'circle', circleIds: g.circleIds, pageCircleId: g.pageCircleId, mediaIds, meta: { flash: kind } }, { me, identity, circles, id: newDropId() });
        await api.post('/drops', body);
      }
      rememberFlashCircles(circleIds);
      void qc.invalidateQueries({ queryKey: FLASH_KEY });
      void qc.invalidateQueries({ queryKey: qk.myDay(today) });
    },
    [me, identity, circles, today, qc],
  );
}

export function useMeId(): string {
  return useMe().user.id;
}
