/**
 * Komponen SEUMUR: lingkaran napas bersama, lilin, kartu momen, garis hidup,
 * dan gulungan akhir. Gaya Sehari (kertas, tinta, doodle) di bawah langit
 * yang berubah warna mengikuti bab kehidupan.
 */
import { type CSSProperties, type ReactNode, useEffect, useRef, useState } from 'react';
import { napasFase, NAPAS_MS, type View } from '@/lib/seumur';
import { vibrate } from '@/lib/sidik';
import { Doodle } from '@/ui/kit';
import { PlayerFace } from '../sidik/parts';

export const nameIn = (v: Pick<View, 'players'>, id: string) => v.players.find((p) => p.id === id)?.name ?? '';
export const faceIn = (v: Pick<View, 'players'>, id: string) => v.players.find((p) => p.id === id)?.avatar ?? 'tunas';

/** Lingkaran napas, disinkronkan dengan jam server: semua HP bernapas bersama. */
export function Napas({ serverNow, size = 220, getar = false, children, aktif, teks = true }: { serverNow: () => number; size?: number; getar?: boolean; children?: ReactNode; aktif?: boolean; teks?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const [fase, setFase] = useState<'tarik' | 'tahan' | 'hembus'>('tarik');
  const lastFase = useRef('');
  useEffect(() => {
    let raf = 0;
    const loop = () => {
      const f = napasFase(serverNow());
      ref.current?.style.setProperty('--s', String(0.78 + f.skala * 0.3));
      if (f.fase !== lastFase.current) {
        lastFase.current = f.fase;
        setFase(f.fase);
        if (getar && f.fase === 'hembus') vibrate(18);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [getar]);
  return (
    <div className={`sm-napas ${aktif ? 'aktif' : ''}`} ref={ref} style={{ width: size, height: size, '--siklus': `${NAPAS_MS}ms` } as CSSProperties}>
      <span className="sm-napas-halo" />
      <span className="sm-napas-ring" />
      <span className="sm-napas-isi">{children ?? (teks ? <i>{fase === 'tarik' ? 'tarik napas' : fase === 'tahan' ? 'tahan' : 'hembuskan'}</i> : null)}</span>
    </div>
  );
}

export function Lilin({ n, max }: { n: number; max: number }) {
  return (
    <div className="sm-lilin" aria-label={`${n} dari ${max} lilin menyala`}>
      {Array.from({ length: max }, (_, i) => (
        <span key={i} className={`sm-lilin-satu ${i < n ? 'nyala' : 'padam'}`} style={{ '--d': `${(i * 0.37) % 1}s` } as CSSProperties}>
          <span className="sm-api" />
          <span className="sm-asap" />
          <span className="sm-batang" />
        </span>
      ))}
    </div>
  );
}

export interface KartuData {
  id: string;
  teks: string;
  doodle: string;
}

export function Kartu({ k, usia, by, terlambat, kecil, menyala, children, v }: { k: KartuData; usia?: number; by?: string; terlambat?: boolean; kecil?: boolean; menyala?: boolean; children?: ReactNode; v?: Pick<View, 'players'> }) {
  return (
    <article className={`sm-kartu ${kecil ? 'kecil' : ''} ${terlambat ? 'telat' : ''} ${menyala ? 'menyala' : ''}`} data-id={k.id}>
      <span className="sm-jepit" aria-hidden />
      <Doodle id={k.doodle} size={kecil ? 26 : 40} color="currentColor" draw={!kecil} />
      <p>{k.teks}</p>
      {usia !== undefined ? <b className="sm-usia">{usia}</b> : null}
      {by && v ? (
        <span className="sm-oleh">
          <PlayerFace avatar={faceIn(v, by)} size={16} /> {nameIn(v, by)}
          {terlambat ? ' · datang terlambat' : ''}
        </span>
      ) : null}
      {children}
    </article>
  );
}

/** Kartu di tangan: tahan untuk meletakkan. */
export function KartuTangan({ k, onLetak, disabled, ms = 900 }: { k: KartuData; onLetak: () => void; disabled?: boolean; ms?: number }) {
  const [p, setP] = useState(0);
  const raf = useRef(0);
  const t0 = useRef(0);
  const done = useRef(false);
  const begin = () => {
    if (disabled) return;
    done.current = false;
    t0.current = performance.now();
    vibrate(10);
    const loop = () => {
      const x = Math.min(1, (performance.now() - t0.current) / ms);
      setP(x);
      if (x >= 1 && !done.current) {
        done.current = true;
        vibrate([30, 40, 30]);
        onLetak();
        return;
      }
      raf.current = requestAnimationFrame(loop);
    };
    raf.current = requestAnimationFrame(loop);
  };
  const end = () => {
    cancelAnimationFrame(raf.current);
    if (!done.current) setP(0);
  };
  useEffect(() => () => cancelAnimationFrame(raf.current), []);
  return (
    <button className="sm-tangan" style={{ '--p': p } as CSSProperties} onPointerDown={begin} onPointerUp={end} onPointerLeave={end} onPointerCancel={end} onContextMenu={(e) => e.preventDefault()} disabled={disabled} data-testid="sm-kartu-tangan">
      <Kartu k={k}>
        <span className="sm-tahan-isi" />
      </Kartu>
      <span className="sm-tahan-label">{p > 0 ? 'terus tahan…' : 'tahan untuk meletakkan'}</span>
    </button>
  );
}

/** Garis hidup: momen yang sudah diletakkan, dari lahir ke senja. */
export function GarisHidup({ v, sorot }: { v: View; sorot?: number }) {
  const box = useRef<HTMLDivElement>(null);
  const last = v.kejadian?.kartu;
  useEffect(() => {
    const el = box.current?.querySelector(`[data-id="${last}"]`) as HTMLElement | null;
    if (el && box.current) box.current.scrollTo({ left: el.offsetLeft - box.current.clientWidth / 2 + el.clientWidth / 2, behavior: 'smooth' });
    else if (box.current) box.current.scrollTo({ left: box.current.scrollWidth, behavior: 'smooth' });
  }, [v.kejadian?.n, v.garis.length]);
  return (
    <div className="sm-garis" ref={box}>
      <div className="sm-garis-isi">
        <span className="sm-lahir">lahir</span>
        {v.garis.map((g, i) => (
          <div key={g.id} className={`sm-garis-titik ${i % 2 ? 'bawah' : 'atas'} ${sorot === i ? 'sorot' : ''} ${g.id === last ? 'baru' : ''}`} data-id={g.id}>
            <Kartu k={g} usia={g.usia} by={g.by} terlambat={g.terlambat} kecil v={v} />
          </div>
        ))}
        <span className="sm-senja">…</span>
      </div>
    </div>
  );
}

/** Wajah pemain dengan sisa kartu (titik) dan tanda menahan. */
export function Meja({ v, mode }: { v: View; mode?: 'fokus' | 'napas' }) {
  return (
    <div className="sm-meja">
      {v.players.map((p) => (
        <span key={p.id} className={`sm-orang ${mode === 'fokus' && p.fokus ? 'tahan' : ''} ${mode === 'napas' && p.napas ? 'tahan' : ''} ${p.id === v.me ? 'aku' : ''}`}>
          <PlayerFace avatar={p.avatar} size={34} />
          <span className="tiny">{p.name}</span>
          <span className="sm-sisa">{'•'.repeat(p.kartu)}</span>
        </span>
      ))}
    </div>
  );
}
