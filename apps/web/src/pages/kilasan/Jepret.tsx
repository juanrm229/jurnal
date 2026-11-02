/**
 * Jepret: kilasan foto. Kamera belakang lalu kamera depan, digabung menjadi
 * satu foto (wajahmu di pojok), seperti melihat dua sisi satu detik yang sama.
 * Kamera depan tidak menjepret diam-diam: ada hitung mundur 3-2-1 yang terlihat,
 * rana bisa ditekan kapan pun kamu sudah siap, dan selfie boleh dilewati.
 * Kalau kamera tidak bisa dibuka, pilih foto dari galeri.
 */
import { useEffect, useRef, useState } from 'react';
import { defaultFlashCircles, flashTargets, useSendFlash } from '@/lib/flash';
import { useCircles } from '@/lib/data';
import { back, navigate } from '@/lib/router';
import { Doodle, useToast } from '@/ui/kit';

type Stage = 'starting' | 'back' | 'front' | 'review' | 'nocam';

const MAX = 1600;

function stop(stream: MediaStream | null) {
  stream?.getTracks().forEach((t) => t.stop());
}

async function open(facing: 'environment' | 'user'): Promise<MediaStream> {
  return navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: facing }, width: { ideal: 1920 }, height: { ideal: 1440 } }, audio: false });
}

function grab(video: HTMLVideoElement, mirror: boolean): HTMLCanvasElement {
  const w = video.videoWidth || 1280;
  const h = video.videoHeight || 960;
  const k = Math.min(1, MAX / Math.max(w, h));
  const c = document.createElement('canvas');
  c.width = Math.round(w * k);
  c.height = Math.round(h * k);
  const g = c.getContext('2d')!;
  if (mirror) {
    g.translate(c.width, 0);
    g.scale(-1, 1);
  }
  g.drawImage(video, 0, 0, c.width, c.height);
  return c;
}

/** Gabungkan foto utama dan swafoto kecil di pojok kiri atas, bertepi putih. */
function compose(main: HTMLCanvasElement, inset: HTMLCanvasElement | null): HTMLCanvasElement {
  if (!inset) return main;
  const c = document.createElement('canvas');
  c.width = main.width;
  c.height = main.height;
  const g = c.getContext('2d')!;
  g.drawImage(main, 0, 0);
  const iw = Math.round(main.width * 0.3);
  const ih = Math.round((iw * inset.height) / inset.width);
  const m = Math.round(main.width * 0.035);
  const r = Math.round(iw * 0.12);
  const border = Math.max(4, Math.round(main.width * 0.008));
  const path = (x: number, y: number, w: number, h: number, rad: number) => {
    g.beginPath();
    g.moveTo(x + rad, y);
    g.arcTo(x + w, y, x + w, y + h, rad);
    g.arcTo(x + w, y + h, x, y + h, rad);
    g.arcTo(x, y + h, x, y, rad);
    g.arcTo(x, y, x + w, y, rad);
    g.closePath();
  };
  g.save();
  g.shadowColor = 'rgba(0,0,0,0.35)';
  g.shadowBlur = border * 3;
  g.fillStyle = '#fff';
  path(m - border, m - border, iw + border * 2, ih + border * 2, r + border);
  g.fill();
  g.restore();
  g.save();
  path(m, m, iw, ih, r);
  g.clip();
  g.drawImage(inset, m, m, iw, ih);
  g.restore();
  return c;
}

/** Tunggu sampai video punya gambar nyata (ukuran > 0 dan sudah diputar). */
function framesReady(v: HTMLVideoElement | null, timeout: number): Promise<boolean> {
  return new Promise((resolve) => {
    if (!v) return resolve(false);
    const t0 = performance.now();
    const check = () => {
      if (v.readyState >= 2 && v.videoWidth > 0 && !v.paused) return resolve(true);
      if (performance.now() - t0 > timeout) return resolve(false);
      window.setTimeout(check, 100);
    };
    check();
  });
}

const toBlob = (c: HTMLCanvasElement) => new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('Foto gagal dibuat.'))), 'image/jpeg', 0.88));

export default function Jepret() {
  const toast = useToast();
  const { circles } = useCircles();
  const targets = flashTargets(circles);
  const send = useSendFlash();
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const mainShot = useRef<HTMLCanvasElement | null>(null);
  const fileIn = useRef<HTMLInputElement>(null);
  const [stage, setStage] = useState<Stage>('starting');
  const [dual, setDual] = useState(true);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [chosen, setChosen] = useState<string[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [flashFx, setFlashFx] = useState(false);
  const [count, setCount] = useState<number | null>(null);
  const [backThumb, setBackThumb] = useState<string | null>(null);
  const frontRun = useRef(0);
  const picked = chosen ?? defaultFlashCircles(circles);

  const start = async (facing: 'environment' | 'user', next: Stage) => {
    stop(stream.current);
    try {
      const s = await open(facing);
      stream.current = s;
      if (video.current) {
        video.current.srcObject = s;
        await video.current.play().catch(() => {});
      }
      setStage(next);
    } catch {
      stop(stream.current);
      stream.current = null;
      setStage('nocam');
    }
  };

  useEffect(() => {
    if (typeof navigator.mediaDevices?.getUserMedia !== 'function') setStage('nocam');
    else void start('environment', 'back');
    return () => stop(stream.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
  }, [preview]);

  const finish = async (canvas: HTMLCanvasElement) => {
    frontRun.current++;
    setCount(null);
    setBackThumb(null);
    stop(stream.current);
    stream.current = null;
    const b = await toBlob(canvas);
    setBlob(b);
    setPreview(URL.createObjectURL(b));
    setStage('review');
  };

  const blink = () => {
    setFlashFx(true);
    window.setTimeout(() => setFlashFx(false), 260);
  };

  /** Jepret kamera depan sekarang (dari hitung mundur atau dari rana). */
  const shootFront = () => {
    const v = video.current;
    if (!v || !mainShot.current || stage !== 'front') return;
    blink();
    if (v.readyState < 2 || !v.videoWidth) return finish(mainShot.current);
    return finish(compose(mainShot.current, grab(v, true)));
  };

  const shoot = async () => {
    const v = video.current;
    if (!v) return;
    if (stage === 'front') return shootFront();
    if (stage !== 'back') return;
    blink();
    mainShot.current = grab(v, false);
    if (!dual) return finish(mainShot.current);
    setBackThumb(mainShot.current.toDataURL('image/jpeg', 0.6));
    const run = ++frontRun.current;
    await start('user', 'front');
    // Tunggu kamera depan benar-benar mengalirkan gambar (di iPhone bisa lebih
    // dari sedetik). Kalau tidak siap dalam 5 detik, pakai foto belakang saja.
    const ready = await framesReady(video.current, 5000);
    if (run !== frontRun.current) return;
    if (!video.current || !ready) return finish(mainShot.current);
    // Hitung mundur yang terlihat, supaya sempat merapikan wajah.
    for (const n of [3, 2, 1]) {
      setCount(n);
      await new Promise((r) => window.setTimeout(r, 900));
      if (run !== frontRun.current) return;
    }
    setCount(null);
    const fv = video.current;
    if (!fv || !mainShot.current) return;
    blink();
    return finish(compose(mainShot.current, grab(fv, true)));
  };

  const skipFront = () => {
    if (mainShot.current) void finish(mainShot.current);
  };

  const fromFile = (f: File | undefined) => {
    if (!f) return;
    setBlob(f);
    setPreview(URL.createObjectURL(f));
    setStage('review');
  };

  const retake = () => {
    frontRun.current++;
    setCount(null);
    setBlob(null);
    setPreview(null);
    mainShot.current = null;
    if (typeof navigator.mediaDevices?.getUserMedia === "function") void start('environment', 'back');
    else setStage('nocam');
  };

  const submit = async () => {
    if (!blob || busy) return;
    setBusy(true);
    try {
      await send('snap', picked, { photo: blob, caption });
      toast('kilasan terkirim');
      navigate('/kilasan', { replace: true });
    } catch (e) {
      toast((e as Error).message);
      setBusy(false);
    }
  };

  return (
    <main className="jp">
      <header className="jp-top">
        <button className="icon-btn jp-icon" aria-label="tutup" onClick={() => back('/hari')}>
          <Doodle id="ui-tutup" size={22} color="#fff" />
        </button>
        <span className="jp-title">kilasan</span>
        {stage === 'back' ? (
          <button className={`jp-dual${dual ? ' on' : ''}`} onClick={() => setDual((d) => !d)} aria-pressed={dual}>
            {dual ? 'dua kamera' : 'satu kamera'}
          </button>
        ) : (
          <span style={{ width: 40 }} />
        )}
      </header>

      {stage === 'review' && preview ? (
        <div className="jp-review">
          <div className="jp-polaroid">
            <img src={preview} alt="kilasanmu" />
            <input
              className="jp-caption"
              value={caption}
              maxLength={80}
              placeholder="tulis sedikit… (boleh kosong)"
              onChange={(e) => setCaption(e.target.value)}
            />
          </div>
          {targets.length > 1 ? (
            <div className="jp-to">
              <span className="tiny">kirim ke</span>
              <div className="row wrap" style={{ gap: 6, justifyContent: 'center' }}>
                {targets.map((c) => {
                  const on = picked.includes(c.id);
                  return (
                    <button key={c.id} className={`pill${on ? ' active' : ''}`} onClick={() => setChosen(on ? picked.filter((x) => x !== c.id) : [...picked, c.id])}>
                      {c.name}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : targets.length === 0 ? (
            <p className="small" style={{ color: '#fff', textAlign: 'center' }}>Kamu belum punya lingkaran aktif untuk dikirimi kilasan.</p>
          ) : null}
          <div className="jp-actions">
            <button className="btn ghost auto jp-ghost" onClick={retake} disabled={busy}>
              ulangi
            </button>
            <button className="btn auto" onClick={submit} disabled={busy || !picked.length || !targets.length} data-testid="flash-send">
              {busy ? 'mengirim…' : 'kirim kilasan'}
            </button>
          </div>
          <p className="tiny jp-note">Kilasan langsung terlihat lingkaranmu, dan otomatis menempel di halaman hari ini.</p>
        </div>
      ) : stage === 'nocam' ? (
        <div className="jp-nocam">
          <Doodle id="kamera" size={72} color="#fff" />
          <p>Kamera belum bisa dibuka di sini. Pilih foto saja, ya.</p>
          <button className="btn auto" onClick={() => fileIn.current?.click()}>
            pilih / ambil foto
          </button>
        </div>
      ) : (
        <div className="jp-cam">
          <video ref={video} playsInline muted autoPlay className={stage === 'front' ? 'mirror' : ''} />
          {stage === 'front' && backThumb ? <img className="jp-backthumb" src={backThumb} alt="" /> : null}
          {stage === 'front' && count ? (
            <div className="jp-count" key={count} aria-live="polite">
              {count}
            </div>
          ) : null}
          {stage === 'front' ? <div className="jp-hint">{count ? 'sudah siap? tekan rana' : 'membuka kamera depan…'}</div> : null}
          {stage === 'starting' ? <div className="jp-hint">membuka kamera…</div> : null}
          {flashFx ? <div className="jp-flash" /> : null}
        </div>
      )}

      {stage === 'back' || stage === 'front' || stage === 'starting' ? (
        <footer className="jp-bottom">
          <button className="jp-side" onClick={() => fileIn.current?.click()} aria-label="dari galeri">
            <Doodle id="ui-foto" size={24} color="#fff" />
          </button>
          <button className="jp-shutter" onClick={shoot} disabled={stage !== 'back' && !(stage === 'front' && count)} aria-label="jepret" data-testid="flash-shutter">
            <span />
          </button>
          {stage === 'front' ? (
            <button className="jp-side jp-skip" onClick={skipFront} aria-label="lewati selfie" data-testid="flash-skip-front">
              lewati
            </button>
          ) : (
            <span style={{ width: 48 }} />
          )}
        </footer>
      ) : null}
      <input ref={fileIn} type="file" accept="image/*" hidden onChange={(e) => fromFile(e.target.files?.[0])} />
    </main>
  );
}
