/**
 * Amplop tersegel. Saat diketuk: segel lilin lepas, tutup amplop terangkat,
 * lalu kertas surat naik keluar — seperti membuka surat, bukan notifikasi.
 */
import { type CSSProperties, useState } from 'react';
import { Doodle } from '@/ui/kit';

const W = 300;
const H = 176;
const FLAP = `M0 6 Q0 0 6 0 L${W - 6} 0 Q${W} 0 ${W} 6 L${W / 2} ${H * 0.6} Z`;
const POCKET = `M0 ${H * 0.3} L${W / 2} ${H * 0.62} L${W} ${H * 0.3} L${W} ${H - 6} Q${W} ${H} ${W - 6} ${H} L6 ${H} Q0 ${H} 0 ${H - 6} Z`;
const CREASE = `M2 ${H - 2} L${W * 0.42} ${H * 0.55} M${W - 2} ${H - 2} L${W * 0.58} ${H * 0.55}`;

/** Lama animasi sebelum `onOpen` dipanggil (ms). */
const OPEN_MS = 1250;

export function Envelope({
  note,
  from,
  doodle = 'amplop',
  tilt = 0,
  onOpen,
  testID,
}: {
  note?: string;
  from: string;
  doodle?: string;
  tilt?: number;
  /** Dipanggil setelah animasi; boleh async (mis. POST /open). */
  onOpen: () => Promise<void> | void;
  testID?: string;
}) {
  const [busy, setBusy] = useState(false);

  const open = () => {
    if (busy) return;
    setBusy(true);
    navigator.vibrate?.(12);
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.setTimeout(async () => {
      try {
        await onOpen();
      } finally {
        setBusy(false);
      }
    }, reduce ? 50 : OPEN_MS);
  };

  return (
    <button
      type="button"
      className={`env${busy ? ' open' : ''}`}
      style={{ '--tilt': `${tilt}deg` } as CSSProperties}
      onClick={open}
      data-testid={testID}
      aria-label={`buka surat dari ${from}`}>
      <span className="env-body">
        <span className="env-back" />
        <svg className="env-flap back" viewBox={`0 0 ${W} ${H * 0.62}`} preserveAspectRatio="none" aria-hidden>
          <path d={FLAP} vectorEffect="non-scaling-stroke" />
        </svg>
        <span className="env-paper" aria-hidden>
          {[0, 1, 2].map((i) => (
            <i key={i} style={{ width: `${80 - i * 18}%` }} />
          ))}
        </span>
        <svg className="env-pocket" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden>
          <path d={POCKET} className="fill" />
          <path d={CREASE} className="crease" vectorEffect="non-scaling-stroke" />
        </svg>
        <svg className="env-flap front" viewBox={`0 0 ${W} ${H * 0.62}`} preserveAspectRatio="none" aria-hidden>
          <path d={FLAP} vectorEffect="non-scaling-stroke" />
        </svg>
        <span className="env-wax" aria-hidden>
          <Doodle id="segel-lilin" size={34} color="var(--on-ink)" />
        </span>
        <span className="env-text">
          <span className="grow" style={{ minWidth: 0 }}>
            {note ? <span className="env-note">{note}</span> : null}
            <span className="tiny env-from">
              dari {from} · {busy ? 'membuka…' : 'ketuk untuk membuka'}
            </span>
          </span>
          <span className="env-stamp">
            <Doodle id={doodle} size={30} />
          </span>
        </span>
      </span>
    </button>
  );
}
