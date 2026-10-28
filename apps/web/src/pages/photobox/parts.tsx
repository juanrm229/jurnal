/**
 * Bagian bersama photobox: jendela kamera langsung, panggung booth (kartu pose,
 * hitung mundur, kilat), dan hasil strip yang "keluar dari mesin".
 */
import { type CSSProperties, type RefObject, useEffect, useMemo, useRef, useState } from 'react';
import { type FilterId, type RGB } from '@/lib/photobox/filters';
import { beep, grab, shutter, toBlob } from '@/lib/photobox/camera';
import type { Pose } from '@/lib/photobox/poses';
import { renderStrip, type StripInput, TEMPLATES, type TemplateId } from '@/lib/photobox/strips';
import { Doodle } from '@/ui/kit';

/** Jeda tiap jepretan: kartu pose → 3 → 2 → 1 → jepret. */
export const SHOT_MS = 5400;
const COUNT_AT = [1600, 2800, 4000];
const SNAP_AT = 5100;

export function LiveView({ video, ready, aspect, filter, ink, onCanvas, className }: { video: RefObject<HTMLVideoElement | null>; ready: boolean; aspect: number; filter: FilterId; ink: RGB; onCanvas?: (c: HTMLCanvasElement) => void; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const opts = useRef({ aspect, filter, ink });
  opts.current = { aspect, filter, ink };
  useEffect(() => {
    if (!ready) return;
    let raf = 0;
    let last = 0;
    const loop = (t: number) => {
      raf = requestAnimationFrame(loop);
      // ±24 fps cukup halus, dan hemat baterai untuk filter berat.
      if (t - last < 40 || !video.current || !ref.current) return;
      last = t;
      grab(video.current, opts.current.aspect, opts.current.filter === 'tinta' ? 400 : 480, opts.current.filter, opts.current.ink, ref.current);
    };
    raf = requestAnimationFrame(loop);
    if (ref.current) onCanvas?.(ref.current);
    return () => cancelAnimationFrame(raf);
  }, [ready]);
  return <canvas ref={ref} className={`pb-live ${className ?? ''}`} style={{ aspectRatio: String(aspect) }} />;
}

export function BoothStage({
  video,
  ready,
  aspect,
  filter,
  ink,
  poses,
  shots,
  startLocal,
  side,
  partner,
  onDone,
}: {
  video: RefObject<HTMLVideoElement | null>;
  ready: boolean;
  aspect: number;
  filter: FilterId;
  ink: RGB;
  poses: Pose[] | null;
  shots: number;
  startLocal: number;
  side?: 'left' | 'right';
  partner?: { name: string; url: string | null };
  onDone: (frames: HTMLCanvasElement[]) => void;
}) {
  const [now, setNow] = useState(Date.now());
  const [flash, setFlash] = useState(false);
  const taken = useRef<HTMLCanvasElement[]>([]);
  const [thumbs, setThumbs] = useState<string[]>([]);
  const fired = useRef(new Set<string>());

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const t = Date.now();
      setNow(t);
      const el = t - startLocal;
      const i = Math.floor(el / SHOT_MS);
      if (el < 0 || i >= shots) return;
      const p = el - i * SHOT_MS;
      COUNT_AT.forEach((at, k) => {
        const key = `${i}:c${k}`;
        if (p >= at && !fired.current.has(key)) {
          fired.current.add(key);
          beep(false);
        }
      });
      const key = `${i}:snap`;
      if (p >= SNAP_AT && !fired.current.has(key) && video.current) {
        fired.current.add(key);
        const c = grab(video.current, aspect, 1100, filter, ink);
        taken.current[i] = c;
        shutter();
        setFlash(true);
        setTimeout(() => setFlash(false), 260);
        setThumbs((x) => [...x, c.toDataURL('image/jpeg', 0.5)]);
        if (i === shots - 1) setTimeout(() => onDone(taken.current), 700);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [startLocal]);

  const el = now - startLocal;
  const i = Math.max(0, Math.min(shots - 1, Math.floor(el / SHOT_MS)));
  const p = el - i * SHOT_MS;
  const count = el < 0 ? Math.ceil(-el / 1000) : p < COUNT_AT[0]! ? null : p < COUNT_AT[1]! ? 3 : p < COUNT_AT[2]! ? 2 : p < SNAP_AT ? 1 : null;
  const pose = poses?.[i];
  const showPose = !!pose && el >= 0 && p < SNAP_AT;

  return (
    <div className="pb-stage">
      <div className="pb-booth">
        <div className="pb-curtain" aria-hidden />
        <div className="pb-view">
          <LiveView video={video} ready={ready} aspect={aspect} filter={filter} ink={ink} />
          {partner ? (
            <div className={`pb-pip ${side === 'right' ? 'left' : 'right'}`}>
              {partner.url ? <img src={partner.url} alt="" /> : <span className="tiny">menunggu…</span>}
              <span className="pb-pip-name">{partner.name}</span>
            </div>
          ) : null}
          {el < 0 ? (
            <div className="pb-ready">
              <span className="rupa-hand">siap-siap…</span>
              <b>{count}</b>
            </div>
          ) : null}
          {count && el >= 0 ? (
            <b key={`${i}-${count}`} className="pb-count">
              {count}
            </b>
          ) : null}
          {showPose ? (
            <div className={`pb-pose ${count ? 'small' : ''}`} key={`pose-${i}`}>
              <span className="pb-pose-emoji">{pose.emoji}</span>
              <span className="pb-pose-text">{pose.text}</span>
              {side && (side === 'left' ? pose.left : pose.right) ? <span className="pb-pose-side">kamu di {side === 'left' ? 'kiri' : 'kanan'}: {side === 'left' ? pose.left : pose.right}</span> : null}
            </div>
          ) : null}
          {flash ? <span className="pb-flash" /> : null}
        </div>
        <div className="pb-shots" aria-label="jepretan">
          {Array.from({ length: shots }, (_, k) => (
            <span key={k} className={`pb-shot ${k === i && el >= 0 ? 'now' : ''}`}>
              {thumbs[k] ? <img src={thumbs[k]} alt="" /> : <span>{k + 1}</span>}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

const dateLabel = (d = new Date()) => new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(d).toLowerCase();
const timeLabel = (d = new Date()) => new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit' }).format(d);

type Img = CanvasImageSource & { width: number; height: number };

export function StripResult({
  frames,
  names,
  cities,
  poses,
  template,
  onTemplate,
  ink,
  actions,
}: {
  frames: Img[][];
  names: string[];
  cities: string[];
  poses: string[];
  template: TemplateId;
  onTemplate: (t: TemplateId) => void;
  ink: string;
  actions: (blob: Blob, caption: string) => React.ReactNode;
}) {
  const [caption, setCaption] = useState('');
  const [url, setUrl] = useState<string | null>(null);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [round, setRound] = useState(0);
  const at = useMemo(() => new Date(), []);
  const seed = useMemo(() => String(Math.floor(Math.random() * 1e9)), []);

  useEffect(() => {
    let alive = true;
    const t = setTimeout(async () => {
      const c = document.createElement('canvas');
      const inp: StripInput = { frames, names, cities, poses, dateLabel: dateLabel(at), time: timeLabel(at), caption: caption.trim() || undefined, ink, seed };
      await renderStrip(c, template, inp);
      const b = await toBlob(c, 'image/jpeg', 0.92);
      if (!alive) return;
      setBlob(b);
      setUrl((old) => {
        if (old) URL.revokeObjectURL(old);
        return URL.createObjectURL(b);
      });
    }, caption ? 350 : 0);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [template, caption]);

  useEffect(() => setRound((r) => r + 1), [template]);

  return (
    <div className="pb-result">
      <div className="pb-machine" aria-hidden>
        <span className="pb-slot" />
        <span className="pb-machine-label">
          <Doodle id="kamera" size={18} color="currentColor" /> sehari photobox
        </span>
      </div>
      <div className="pb-out">
        {url ? <img key={round} src={url} alt="strip photobox" className={`pb-strip ${round <= 1 ? 'develop' : 'swap'}`} /> : <span className="pb-strip ph" />}
      </div>
      <div className="pb-panel">
        <span className="label">ganti desain, fotonya tetap</span>
        <div className="chip-row pb-tpls">
          {TEMPLATES.map((t) => (
            <button key={t.id} className={`pb-tpl ${template === t.id ? 'on' : ''}`} onClick={() => onTemplate(t.id)}>
              <span className="pb-tpl-sw" style={{ background: t.swatch } as CSSProperties} />
              <span className="tiny">{t.name}</span>
            </button>
          ))}
        </div>
        <input className="field hand pb-caption" maxLength={44} value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="tulis keterangan di strip…" />
        {blob ? actions(blob, caption) : null}
      </div>
    </div>
  );
}

export { dateLabel, timeLabel };
