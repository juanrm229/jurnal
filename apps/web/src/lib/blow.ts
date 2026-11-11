/**
 * Tiup lilin: mendengarkan mikrofon untuk hembusan napas. Tiupan adalah derau
 * berat di frekuensi rendah yang bertahan sebentar; suara bicara naik-turun.
 * Suaranya tidak direkam dan tidak dikirim: hanya angka kerasnya yang dibaca.
 */
import { useEffect, useRef, useState } from 'react';

export type BlowState = 'idle' | 'asking' | 'listening' | 'denied' | 'out';

/**
 * Angka dari penganalisis berskala desibel (0 = senyap, 1 = sangat keras).
 * Ruangan biasa ada di sekitar 0,3–0,6; tiupan dekat mikrofon melonjak ke 0,85+.
 * Ambangnya ikut kebisingan ruangan: harus jelas di atas suasana sekitar.
 */
const FLOOR = 0.78;
const JUMP = 0.18;
const NEED_MS = 420;

export function useBlow(active: boolean, onOut: () => void) {
  const [state, setState] = useState<BlowState>('idle');
  /** 0..1: seberapa kencang hembusan saat ini (untuk menggoyang api). */
  const [level, setLevel] = useState(0);
  const done = useRef(onOut);
  done.current = onOut;

  useEffect(() => {
    if (!active) {
      setState('idle');
      setLevel(0);
      return;
    }
    let stream: MediaStream | null = null;
    let ctx: AudioContext | null = null;
    let raf = 0;
    let dead = false;
    setState('asking');
    (async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error('tanpa mikrofon');
        stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
        if (dead) return stream.getTracks().forEach((t) => t.stop());
        const AC: typeof AudioContext = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        ctx = new AC();
        await ctx.resume().catch(() => {});
        const an = ctx.createAnalyser();
        an.fftSize = 1024;
        an.smoothingTimeConstant = 0.5;
        ctx.createMediaStreamSource(stream).connect(an);
        const bins = new Uint8Array(an.frequencyBinCount);
        // Pita rendah (sekitar 60–600 Hz), tempat hembusan napas paling terasa.
        const hz = ctx.sampleRate / an.fftSize;
        const lo = Math.max(1, Math.round(60 / hz));
        const hi = Math.max(lo + 2, Math.round(600 / hz));
        let held = 0;
        let base = -1;
        let last = performance.now();
        setState('listening');
        const tick = () => {
          if (dead) return;
          an.getByteFrequencyData(bins);
          let sum = 0;
          for (let i = lo; i <= hi; i++) sum += bins[i]!;
          const v = sum / (hi - lo + 1) / 255;
          const now = performance.now();
          const dt = Math.min(100, now - last);
          last = now;
          if (base < 0) base = v;
          const thr = Math.min(0.94, Math.max(FLOOR, base + JUMP));
          const over = v > thr;
          // Suasana sekitar dipelajari pelan-pelan, hanya saat tidak sedang ditiup.
          if (!over) base += (v - base) * Math.min(1, dt / 600);
          held = over ? held + dt : Math.max(0, held - dt * 1.5);
          setLevel(Math.min(1, Math.max(0, (v - base) / Math.max(0.05, thr - base), held / NEED_MS)));
          if (held >= NEED_MS) {
            dead = true;
            setState('out');
            setLevel(1);
            stream?.getTracks().forEach((t) => t.stop());
            void ctx?.close().catch(() => {});
            done.current();
            return;
          }
          raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      } catch {
        if (!dead) setState('denied');
      }
    })();
    return () => {
      dead = true;
      cancelAnimationFrame(raf);
      stream?.getTracks().forEach((t) => t.stop());
      void ctx?.close().catch(() => {});
    };
  }, [active]);

  return { state, level };
}
