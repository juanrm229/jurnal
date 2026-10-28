/** Kamera depan, potong ke rasio strip (dicerminkan seperti photobox), bunyi jepret. */
import { useEffect, useRef, useState } from 'react';
import { applyFilter, type FilterId, type RGB } from './filters';
import { drawProps, type Prop } from './props';

export function useCamera(on: boolean) {
  const video = useRef<HTMLVideoElement | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const [ready, setReady] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    if (!on) return;
    let dead = false;
    setErr(null);
    navigator.mediaDevices
      ?.getUserMedia({ video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 960 } }, audio: false })
      .then((s) => {
        if (dead) return s.getTracks().forEach((t) => t.stop());
        stream.current = s;
        // Video disisipkan tak terlihat di halaman: Safari iPhone hanya memutar
        // kamera dari elemen yang ada di dokumen.
        const v = video.current ?? document.createElement('video');
        video.current = v;
        v.setAttribute('playsinline', '');
        v.style.cssText = 'position:fixed;left:0;top:0;width:2px;height:2px;opacity:0;pointer-events:none';
        if (!v.isConnected) document.body.appendChild(v);
        v.muted = true;
        v.playsInline = true;
        v.srcObject = s;
        void v.play().then(() => setReady(true));
      })
      .catch(() => setErr('Izinkan kamera supaya photobox bisa memotret.'));
    if (!navigator.mediaDevices) setErr('Peramban ini tidak bisa membuka kamera.');
    return () => {
      dead = true;
      stream.current?.getTracks().forEach((t) => t.stop());
      stream.current = null;
      video.current?.remove();
      setReady(false);
    };
  }, [on]);
  return { video, ready, err };
}

/** Ambil satu bingkai dari video: dipotong tengah ke rasio, dicerminkan, difilter. */
export function grab(v: HTMLVideoElement, aspect: number, maxW: number, filter: FilterId, ink: RGB, into?: HTMLCanvasElement, props?: Prop[]): HTMLCanvasElement {
  const vw = v.videoWidth || 640;
  const vh = v.videoHeight || 480;
  let sw = vw;
  let sh = vw / aspect;
  if (sh > vh) {
    sh = vh;
    sw = vh * aspect;
  }
  const w = Math.round(Math.min(maxW, sw));
  const h = Math.round(w / aspect);
  const c = into ?? document.createElement('canvas');
  if (c.width !== w) c.width = w;
  if (c.height !== h) c.height = h;
  const ctx = c.getContext('2d', { willReadFrequently: true })!;
  ctx.save();
  ctx.translate(w, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(v, (vw - sw) / 2, (vh - sh) / 2, sw, sh, 0, 0, w, h);
  ctx.restore();
  applyFilter(ctx, w, h, filter, ink);
  drawProps(ctx, w, h, props);
  return c;
}

export const toBlob = (c: HTMLCanvasElement, type = 'image/jpeg', q = 0.88) =>
  new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('Gagal menyimpan foto.'))), type, q));

let ac: AudioContext | null = null;
/** Bunyi jepret kamera: klik mekanis + desis singkat, dibuat langsung (tanpa berkas). */
export function shutter() {
  try {
    ac ??= new AudioContext();
    const t = ac.currentTime;
    const buf = ac.createBuffer(1, ac.sampleRate * 0.12, ac.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 3);
    const n = ac.createBufferSource();
    n.buffer = buf;
    const f = ac.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = 2400;
    const g = ac.createGain();
    g.gain.value = 0.5;
    n.connect(f).connect(g).connect(ac.destination);
    n.start(t);
    const o = ac.createOscillator();
    const og = ac.createGain();
    o.frequency.setValueAtTime(180, t);
    o.frequency.exponentialRampToValueAtTime(60, t + 0.08);
    og.gain.setValueAtTime(0.35, t);
    og.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
    o.connect(og).connect(ac.destination);
    o.start(t);
    o.stop(t + 0.12);
  } catch {}
}

/** Bunyi "tit" hitung mundur. */
export function beep(high = false) {
  try {
    ac ??= new AudioContext();
    const t = ac.currentTime;
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.type = 'sine';
    o.frequency.value = high ? 1320 : 880;
    g.gain.setValueAtTime(0.12, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
    o.connect(g).connect(ac.destination);
    o.start(t);
    o.stop(t + 0.16);
  } catch {}
}
