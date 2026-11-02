/**
 * Film Bulan Ini / Tahun Ini: foto-foto rol dirangkai menjadi film pendek 9:16
 * di perangkat (canvas + WebAudio + MediaRecorder). Foto tetap terenkripsi di
 * server; yang dirangkai adalah salinan yang sudah dibuka di perangkat ini.
 */
import { formatDayLong, type StoryScene } from '@sehari/core';
import { useEffect, useRef, useState } from 'react';
import { mediaUrl } from '@/lib/media';
import { Doodle } from '@/ui/kit';
import type { WrappedCtx } from './Wrapped';

type Film = Extract<StoryScene, { type: 'film' }>;

const W = 720;
const H = 1280;
const TITLE = 2.8;
const SHOT = 2.4;
const FADE = 0.6;
const END = 3.2;

export const filmDuration = (n: number) => TITLE + n * SHOT + END;

interface Loaded {
  img: HTMLImageElement;
  caption?: string;
  day: string;
  who: string;
}

async function loadShots(f: Film, name: (id: string) => string): Promise<Loaded[]> {
  const out: Loaded[] = [];
  for (const s of f.shots) {
    try {
      const url = await mediaUrl(s.media);
      const img = new Image();
      img.src = url;
      await img.decode();
      out.push({ img, caption: s.caption, day: s.day, who: name(s.userId) });
    } catch {
      // Foto yang gagal dibuka dilewati saja.
    }
  }
  return out;
}

const ease = (x: number) => 0.5 - Math.cos(Math.PI * Math.min(1, Math.max(0, x))) / 2;

function paper(g: CanvasRenderingContext2D) {
  g.fillStyle = '#f7f3ea';
  g.fillRect(0, 0, W, H);
  g.strokeStyle = 'rgba(42,20,214,0.07)';
  g.lineWidth = 2;
  for (let y = 40; y < H; y += 48) {
    g.beginPath();
    g.moveTo(0, y);
    g.lineTo(W, y);
    g.stroke();
  }
}

function centerText(g: CanvasRenderingContext2D, text: string, y: number, font: string, color: string, maxW = W - 120) {
  g.font = font;
  g.fillStyle = color;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  const words = text.split(' ');
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    const t = cur ? `${cur} ${w}` : w;
    if (g.measureText(t).width > maxW && cur) {
      lines.push(cur);
      cur = w;
    } else cur = t;
  }
  if (cur) lines.push(cur);
  const lh = parseInt(font.match(/(\d+)px/)?.[1] ?? '40', 10) * 1.25;
  lines.forEach((l, i) => g.fillText(l, W / 2, y + (i - (lines.length - 1) / 2) * lh));
}

function drawShot(g: CanvasRenderingContext2D, s: Loaded, p: number, i: number) {
  // Ken Burns: perbesar pelan & geser ke arah yang berganti-ganti.
  const z = 1.06 + 0.1 * p;
  const dir = i % 2 ? 1 : -1;
  const ir = s.img.naturalWidth / s.img.naturalHeight;
  const cr = W / H;
  let dw = W;
  let dh = H;
  if (ir > cr) dw = H * ir;
  else dh = W / ir;
  dw *= z;
  dh *= z;
  const dx = (W - dw) / 2 + dir * 30 * (p - 0.5);
  const dy = (H - dh) / 2 - 20 * (p - 0.5);
  g.drawImage(s.img, dx, dy, dw, dh);
  const grad = g.createLinearGradient(0, H * 0.55, 0, H);
  grad.addColorStop(0, 'rgba(0,0,0,0)');
  grad.addColorStop(1, 'rgba(0,0,0,0.62)');
  g.fillStyle = grad;
  g.fillRect(0, 0, W, H);
  if (s.caption) centerText(g, s.caption, H - 230, '700 54px Caveat, cursive', '#ffffff', W - 100);
  g.font = '26px "IBM Plex Mono", monospace';
  g.fillStyle = 'rgba(255,255,255,0.85)';
  g.textAlign = 'center';
  g.fillText(`${s.who} · ${formatDayLong(s.day, false)}`.toLowerCase(), W / 2, H - 120);
}

/** Gambar satu frame pada waktu t (detik). */
function frame(g: CanvasRenderingContext2D, t: number, shots: Loaded[], f: Film) {
  const total = filmDuration(shots.length);
  g.globalAlpha = 1;
  if (t < TITLE) {
    paper(g);
    const a = ease(t / 0.8);
    g.globalAlpha = a;
    centerText(g, f.label.toLowerCase(), H / 2 - 120, '28px "IBM Plex Mono", monospace', '#2a14d6');
    centerText(g, f.title, H / 2, '600 84px "Fraunces Variable", Georgia, serif', '#2a14d6');
    centerText(g, `${shots.length} potong hari, dipilih bersama`, H / 2 + 110, '700 44px Caveat, cursive', '#1d1d3a');
    g.globalAlpha = 1;
    return;
  }
  const st = t - TITLE;
  const i = Math.floor(st / SHOT);
  if (i < shots.length) {
    const p = (st - i * SHOT) / SHOT;
    drawShot(g, shots[i]!, p, i);
    // Memudar dari potongan sebelumnya.
    const into = st - i * SHOT;
    if (into < FADE) {
      g.globalAlpha = 1 - ease(into / FADE);
      if (i > 0) drawShot(g, shots[i - 1]!, 1, i - 1);
      else paper(g);
      g.globalAlpha = 1;
    }
    return;
  }
  const et = t - (total - END);
  paper(g);
  g.globalAlpha = Math.min(1, ease(et / 0.6));
  if (shots.length) drawShot(g, shots[shots.length - 1]!, 1, shots.length - 1);
  g.globalAlpha = Math.min(1, ease(et / 0.9));
  paper(g);
  centerText(g, 'Bab ini selesai.', H / 2 - 60, '600 64px "Fraunces Variable", Georgia, serif', '#2a14d6');
  centerText(g, 'Halaman berikutnya masih kosong, dan itu kabar baik.', H / 2 + 40, '700 46px Caveat, cursive', '#1d1d3a', W - 160);
  if (f.song) centerText(g, `lagu tema: ${f.song.title} — ${f.song.artist}`.toLowerCase(), H - 180, '24px "IBM Plex Mono", monospace', '#2a14d6');
  centerText(g, 'sehari', H - 110, '700 40px Caveat, cursive', 'rgba(42,20,214,0.6)');
  g.globalAlpha = 1;
}

/** Musik kotak musik: arpeggio pentatonik lembut sepanjang film. */
function musicBox(ac: AudioContext, out: AudioNode, seconds: number) {
  const master = ac.createGain();
  master.gain.value = 0.18;
  master.connect(out);
  const scale = [0, 2, 4, 7, 9, 12, 14, 16];
  const base = 523.25; // C5
  const chords = [0, 9, 5, 7]; // C, A, F, G (dalam semiton dari C)
  const beat = 0.42;
  const t0 = ac.currentTime + 0.15;
  for (let k = 0; k * beat < seconds - 0.5; k++) {
    const chord = chords[Math.floor(k / 8) % chords.length]!;
    const step = scale[[0, 2, 4, 5, 4, 2, 1, 3][k % 8]!]!;
    const freq = base * Math.pow(2, (chord + step) / 12) / (chord > 5 ? 2 : 1);
    const t = t0 + k * beat;
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.type = 'sine';
    o.frequency.value = freq;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.9, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.001, t + 1.4);
    o.connect(g);
    g.connect(master);
    o.start(t);
    o.stop(t + 1.5);
  }
  master.gain.setValueAtTime(0.18, t0 + seconds - 1.2);
  master.gain.linearRampToValueAtTime(0.0001, t0 + seconds);
}

function pickMime(): string | null {
  if (typeof MediaRecorder === 'undefined') return null;
  for (const m of ['video/mp4;codecs=avc1', 'video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm']) {
    try {
      if (MediaRecorder.isTypeSupported(m)) return m;
    } catch {
      // abaikan
    }
  }
  return null;
}

export function FilmScene({ s, ctx }: { s: Film; ctx: WrappedCtx }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [shots, setShots] = useState<Loaded[] | null>(null);
  const [mode, setMode] = useState<'idle' | 'loading' | 'playing' | 'recording'>('idle');
  const [progress, setProgress] = useState(0);
  const [video, setVideo] = useState<{ url: string; blob: Blob; ext: string } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const stopRef = useRef<() => void>(() => {});
  const mime = pickMime();
  const seconds = Math.round(filmDuration(s.shots.length));

  useEffect(() => () => stopRef.current(), []);
  useEffect(() => () => {
    if (video) URL.revokeObjectURL(video.url);
  }, [video]);

  const ensureShots = async (): Promise<Loaded[]> => {
    if (shots) return shots;
    setMode('loading');
    const l = await loadShots(s, ctx.name);
    setShots(l);
    return l;
  };

  /** Putar (dan rekam bila diminta) film di canvas. */
  const run = async (record: boolean) => {
    setErr(null);
    stopRef.current();
    try {
      await document.fonts?.ready;
      const list = await ensureShots();
      if (list.length < 2) throw new Error('Fotonya belum bisa dibuka di perangkat ini.');
      const cv = canvas.current!;
      const g = cv.getContext('2d')!;
      const total = filmDuration(list.length);
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      const ac = AC ? new AC() : null;
      const dest = ac && record ? ac.createMediaStreamDestination() : null;
      if (ac) {
        await ac.resume().catch(() => {});
        const out = ac.createGain();
        out.connect(ac.destination);
        if (dest) out.connect(dest);
        musicBox(ac, out, total);
      }
      let rec: MediaRecorder | null = null;
      const chunks: Blob[] = [];
      if (record && mime) {
        const stream = cv.captureStream(30);
        dest?.stream.getAudioTracks().forEach((tr) => stream.addTrack(tr));
        rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 4_000_000 });
        rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
        rec.start(250);
      }
      setMode(record ? 'recording' : 'playing');
      const start = performance.now();
      let raf = 0;
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        cancelAnimationFrame(raf);
        void ac?.close().catch(() => {});
        if (rec && rec.state !== 'inactive') {
          rec.onstop = () => {
            const blob = new Blob(chunks, { type: mime ?? 'video/webm' });
            setVideo({ url: URL.createObjectURL(blob), blob, ext: (mime ?? '').includes('mp4') ? 'mp4' : 'webm' });
          };
          rec.stop();
        }
        setMode('idle');
        setProgress(0);
      };
      stopRef.current = finish;
      const tick = () => {
        const t = (performance.now() - start) / 1000;
        frame(g, Math.min(t, total), list, s);
        setProgress(Math.min(1, t / total));
        if (t >= total) return finish();
        raf = requestAnimationFrame(tick);
      };
      // Jaring pengaman: perekaman tetap berhenti walau rAF diperlambat.
      window.setTimeout(finish, (total + 1.5) * 1000);
      tick();
    } catch (e) {
      setErr((e as Error).message || 'Filmnya belum bisa diputar.');
      setMode('idle');
    }
  };

  const share = async () => {
    if (!video) return;
    const file = new File([video.blob], `sehari-${s.title.toLowerCase().replace(/\s+/g, '-')}.${video.ext}`, { type: video.blob.type });
    const nav = navigator as Navigator & { canShare?: (d: { files: File[] }) => boolean };
    if (nav.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title: s.title }).catch(() => {});
      return;
    }
    const a = document.createElement('a');
    a.href = video.url;
    a.download = file.name;
    a.click();
  };

  return (
    <div className="fm" data-no-tap>
      <div className="wr-kicker" style={{ color: '#c9c2ff' }}>
        {s.label.toLowerCase()}
      </div>
      <h2 className="fm-title">{s.title}</h2>
      <p className="fm-sub">
        {s.shots.length} potong hari · ±{seconds} detik{s.song ? ` · lagu tema “${s.song.title}”` : ''}
      </p>
      <div className="fm-screen" hidden={!!video && mode === 'idle'}>
        <canvas ref={canvas} width={W} height={H} className={mode === 'idle' && !video ? 'fm-hidden' : ''} />
        {mode === 'idle' && !video ? (
          <div className="fm-poster">
            <Doodle id="kamera" size={56} color="#fff" />
            <span>dirangkai di perangkatmu</span>
          </div>
        ) : null}
        {mode === 'recording' || mode === 'playing' ? (
          <div className="fm-progress">
            <i style={{ transform: `scaleX(${progress})` }} />
          </div>
        ) : null}
      </div>
      {video && mode === 'idle' ? <video className="fm-video" src={video.url} controls playsInline /> : null}
      <div className="fm-actions">
        {mode === 'idle' ? (
          <>
            <button className="btn auto" onClick={() => void run(false)} data-testid="film-play">
              ▶ putar film
            </button>
            {mime ? (
              <button className="btn ghost auto fm-ghost" onClick={() => void run(true)} data-testid="film-record">
                {video ? 'buat ulang video' : 'simpan jadi video'}
              </button>
            ) : null}
          </>
        ) : mode === 'loading' ? (
          <span className="tiny" style={{ color: '#fff' }}>membuka foto-foto…</span>
        ) : (
          <button className="btn ghost auto fm-ghost" onClick={() => stopRef.current()}>
            berhenti
          </button>
        )}
        {video && mode === 'idle' ? (
          <button className="btn auto" onClick={() => void share()} data-testid="film-share">
            bagikan / unduh
          </button>
        ) : null}
      </div>
      {mode === 'recording' ? <p className="tiny fm-note">Merekam… biarkan layar tetap terbuka sampai selesai.</p> : null}
      {!mime ? <p className="tiny fm-note">Perangkat ini belum bisa menyimpan video; filmnya tetap bisa diputar.</p> : null}
      {err ? <p className="tiny fm-note">{err}</p> : null}
    </div>
  );
}
