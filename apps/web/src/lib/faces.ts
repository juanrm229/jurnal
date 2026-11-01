/**
 * Reaksi Wajah: balas kilasan atau tulisan dengan foto ekspresimu sendiri.
 * Foto tiap ekspresi disimpan (sebagai referensi media terenkripsi) di
 * perangkat ini, jadi berikutnya cukup satu ketukan.
 */
import { type FaceExpression, type FacePayload, type FaceWire, type MediaRef, openEnvelope, type RecipientSpec, sealEnvelope } from '@sehari/core';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';
import { api } from './api';
import { type CircleView, useCircles, useKeyring } from './data';
import { FLASH_KEY } from './flash';
import { uploadPhoto } from './media';
import { useSession } from './session';
import { store } from './storage';

const key = (userId: string) => `faces:${userId}`;

export function savedFaces(userId: string): Partial<Record<FaceExpression, MediaRef>> {
  return store.json<Partial<Record<FaceExpression, MediaRef>>>(key(userId)) ?? {};
}

export function saveFace(userId: string, expr: FaceExpression, ref: MediaRef) {
  store.set(key(userId), JSON.stringify({ ...savedFaces(userId), [expr]: ref }));
}

/** Ambil swafoto persegi dari kamera depan (dicerminkan seperti cermin). */
export async function captureSquare(video: HTMLVideoElement, size = 520): Promise<Blob> {
  const w = video.videoWidth || 640;
  const h = video.videoHeight || 480;
  const side = Math.min(w, h);
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const g = c.getContext('2d')!;
  g.translate(size, 0);
  g.scale(-1, 1);
  g.drawImage(video, (w - side) / 2, (h - side) / 2, side, side, 0, 0, size, size);
  return new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('Foto gagal dibuat.'))), 'image/jpeg', 0.86));
}

export async function uploadFace(userId: string, expr: FaceExpression, blob: Blob): Promise<MediaRef> {
  const ref = await uploadPhoto(blob);
  saveFace(userId, expr, ref);
  return ref;
}

/** Kirim (atau ganti) reaksi wajah pada satu Drop di satu lingkaran. */
export function useSendFace() {
  const qc = useQueryClient();
  const { me, identity } = useSession();
  return useCallback(
    async (dropId: string, circle: CircleView, expression: FaceExpression, media: MediaRef) => {
      if (!me || !identity) throw new Error('Belum siap.');
      const ck = circle.keys.get(circle.currentEpoch);
      if (!ck) throw new Error('Kunci lingkaran belum tersedia. Muat ulang, ya.');
      const recips: RecipientSpec[] = [
        { t: 'user', userId: me.user.id, publicKey: identity.publicKey },
        { t: 'circle', circleId: circle.id, epoch: circle.currentEpoch, key: ck },
      ];
      const payload: FacePayload = { v: 1, media };
      const env = sealEnvelope(payload, recips);
      await api.put(`/drops/${dropId}/face`, { expression, envelope: { ciphertext: env.ciphertext, recipients: env.recipients }, mediaIds: [media.id] });
      void qc.invalidateQueries({ queryKey: FLASH_KEY });
      void qc.invalidateQueries({ queryKey: ['circleDay'] });
      void qc.invalidateQueries({ queryKey: ['circleRange'] });
    },
    [me, identity, qc],
  );
}

export function useRemoveFace() {
  const qc = useQueryClient();
  return useCallback(
    async (dropId: string) => {
      await api.del(`/drops/${dropId}/face`);
      void qc.invalidateQueries({ queryKey: FLASH_KEY });
      void qc.invalidateQueries({ queryKey: ['circleDay'] });
    },
    [qc],
  );
}

export interface OpenFace {
  userId: string;
  expression: FaceExpression;
  media: MediaRef | null;
}

/** Buka envelope reaksi wajah dengan kunci yang dimiliki pembaca. */
export function useOpenFaces(faces: FaceWire[] | undefined): OpenFace[] {
  const ring = useKeyring();
  return useMemo(
    () =>
      (faces ?? []).map((f) => {
        let media: MediaRef | null = null;
        try {
          if (ring) media = openEnvelope<FacePayload>(f.envelope as never, ring).media;
        } catch {
          media = null;
        }
        return { userId: f.userId, expression: f.expression, media };
      }),
    [faces, ring],
  );
}

/** Lingkaran tempat pembaca bisa mengirim reaksi untuk Drop ini. */
export function useFaceCircle(circleIds: string[]): CircleView | undefined {
  const { circles } = useCircles();
  return circles.find((c) => circleIds.includes(c.id) && c.status === 'active' && c.me?.state === 'active');
}
