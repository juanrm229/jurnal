/**
 * Strip hidup: tiap jepretan menyimpan beberapa bingkai gerak sebelum kilat.
 * Strip digambar ulang untuk tiap bingkai, lalu diputar bolak-balik dan
 * direkam menjadi video (MP4 bila bisa, selain itu WebM) untuk dibagikan.
 */
import { toBlob } from './camera';
import { renderStrip, type StripInput, type TemplateId } from './strips';

type Img = CanvasImageSource & { width: number; height: number };

/** Jumlah bingkai gerak per jepretan. */
export const BURST = 6;

export async function renderLiveFrames(t: TemplateId, base: Omit<StripInput, 'frames'>, bursts: Img[][][], onProgress?: (k: number) => void): Promise<Blob[]> {
  const out: Blob[] = [];
  const k = Math.max(...bursts.flatMap((col) => col.map((sh) => sh.length)), 1);
  for (let i = 0; i < k; i++) {
    const frames = bursts.map((col) => col.map((sh) => sh[Math.min(i, sh.length - 1)]!));
    const c = document.createElement('canvas');
    await renderStrip(c, t, { ...base, frames });
    out.push(await toBlob(c, 'image/jpeg', 0.86));
    onProgress?.(i + 1);
  }
  return out;
}

const pingPong = (n: number) => [...Array(n).keys(), ...Array.from({ length: Math.max(0, n - 2) }, (_, i) => n - 2 - i)];

export async function encodeVideo(frames: Blob[], height = 960, loops = 4): Promise<{ blob: Blob; ext: 'mp4' | 'webm' }> {
  const imgs = await Promise.all(frames.map((b) => createImageBitmap(b)));
  const h = height;
  const w = Math.round((imgs[0]!.width * h) / imgs[0]!.height / 2) * 2;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  ctx.drawImage(imgs[0]!, 0, 0, w, h);
  const mime = ['video/mp4;codecs=avc1', 'video/mp4', 'video/webm;codecs=vp9', 'video/webm'].find((m) => MediaRecorder.isTypeSupported(m));
  if (!mime) throw new Error('Peramban ini belum bisa membuat video.');
  const stream = c.captureStream(30);
  const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 4_000_000 });
  const chunks: Blob[] = [];
  rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
  const done = new Promise<void>((res) => (rec.onstop = () => res()));
  rec.start();
  const seq = pingPong(imgs.length);
  for (let l = 0; l < loops; l++)
    for (const i of seq) {
      ctx.drawImage(imgs[i]!, 0, 0, w, h);
      await new Promise((r) => setTimeout(r, 110));
    }
  await new Promise((r) => setTimeout(r, 150));
  rec.stop();
  await done;
  stream.getTracks().forEach((t) => t.stop());
  const type = mime.startsWith('video/mp4') ? 'video/mp4' : 'video/webm';
  return { blob: new Blob(chunks, { type }), ext: type === 'video/mp4' ? 'mp4' : 'webm' };
}

export { pingPong };
