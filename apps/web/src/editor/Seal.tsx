/**
 * Upacara segel: kalimat terakhir, warna hari, lalu tahan tombol lilin.
 * Halaman masuk amplop, tutupnya terlipat, lilin dicap — dan hari ini selesai.
 */
import { COPY, type MoodCode, MOODS, type SealResult } from '@sehari/core';
import { useEffect, useRef, useState } from 'react';
import { type CircleView, nowParts, useSeal } from '@/lib/data';
import { useReady } from '@/lib/session';
import { sound } from '@/lib/sound';
import { Confetti, Doodle, MoodPicker, Toggle } from '@/ui/kit';

const MILESTONE: Record<string, { name: string; line: string; doodle: string }> = {
  gerbang: { ...COPY.streak.milestone7, doodle: 'rumah' },
  jembatan: { ...COPY.streak.milestone30, doodle: 'peta' },
  mercusuar: { ...COPY.streak.milestone100, doodle: 'lampu' },
  pelabuhan: { ...COPY.streak.milestone365, doodle: 'surat-botol' },
};

const HOLD_MS = 1200;

export function SealCeremony({ day, circles, onClose, onSealed, onOpen }: { day: string; circles: CircleView[]; onClose: () => void; onSealed: () => void; onOpen: (circleId: string) => void }) {
  const { me } = useReady();
  const seal = useSeal();
  const [line, setLine] = useState('');
  const [mood, setMood] = useState<MoodCode | undefined>();
  const [priv, setPriv] = useState(false);
  const [phase, setPhase] = useState<'write' | 'closing' | 'done'>('write');
  const [result, setResult] = useState<SealResult | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const hold = useRef<{ t0: number; raf: number } | null>(null);

  useEffect(() => () => cancelAnimationFrame(hold.current?.raf ?? 0), []);

  const go = async () => {
    setErr(null);
    setPhase('closing');
    navigator.vibrate?.(30);
    try {
      const t = nowParts(me.user.tz);
      const has = line.trim().length > 0 || !!mood;
      const [res] = await Promise.all([
        seal.mutateAsync({
          day,
          lastLine: has
            ? {
                day,
                audience: priv || !circles.length ? 'self' : 'circle',
                circleIds: priv ? [] : circles.map((c) => c.id),
                payload: { v: 1, kind: 'last_line', text: line.trim() || undefined, mood, ...t, tz: me.user.tz, cityId: me.user.cityId ?? undefined },
              }
            : undefined,
        }),
        new Promise((r) => setTimeout(r, 2300)),
      ]);
      setResult(res);
      setPhase('done');
      sound.play('seal');
      navigator.vibrate?.([20, 60, 40]);
      onSealed();
    } catch (e) {
      setErr((e as Error).message);
      setPhase('write');
    }
  };

  const start = () => {
    const t0 = performance.now();
    const tick = () => {
      const p = Math.min(1, (performance.now() - t0) / HOLD_MS);
      setProgress(p);
      if (p >= 1) {
        hold.current = null;
        void go();
        return;
      }
      hold.current = { t0, raf: requestAnimationFrame(tick) };
    };
    hold.current = { t0, raf: requestAnimationFrame(tick) };
  };
  const stop = () => {
    if (!hold.current) return;
    cancelAnimationFrame(hold.current.raf);
    hold.current = null;
    setProgress(0);
  };

  const milestone = result?.circles.find((x) => x.milestone)?.milestone;

  return (
    <div className="seal-overlay" role="dialog" aria-modal aria-label={COPY.seal.cta}>
      <div style={{ width: 'min(460px, 100%)' }} className="col gap-lg">
        {phase === 'write' ? (
          <button className="icon-btn" style={{ alignSelf: 'flex-end' }} aria-label="tutup" onClick={onClose}>
            <Doodle id="ui-tutup" size={22} />
          </button>
        ) : null}

        <div className={`envelope ${phase !== 'write' ? 'closing stamped' : ''}`}>
          <div className="back" />
          <div className="letter">
            <div style={{ padding: '10% 9%' }}>
              <div className="tiny ink-soft">{day}</div>
              <div className="hand" style={{ fontSize: 26, lineHeight: 1.15, marginTop: 6, color: 'var(--text)' }}>{line || 'kalimat terakhir hari ini…'}</div>
              {mood ? <div className="washi" style={{ marginTop: 10, height: 14, width: '60%', background: MOODS[mood].color }} /> : null}
            </div>
          </div>
          <svg className="front" viewBox="0 0 340 234" preserveAspectRatio="none" aria-hidden>
            <path d="M2 232 L170 120 L338 232 Z" fill="color-mix(in srgb, var(--ink) 12%, var(--card))" stroke="var(--ink)" strokeWidth="2" strokeLinejoin="round" />
            <path d="M2 4 L150 140 M338 4 L190 140" stroke="var(--ink)" strokeWidth="1.5" opacity=".35" />
          </svg>
          <svg className="flap" viewBox="0 0 340 145" preserveAspectRatio="none" aria-hidden>
            <path d="M2 2 L170 142 L338 2 Z" fill="color-mix(in srgb, var(--ink) 16%, var(--card))" stroke="var(--ink)" strokeWidth="2" strokeLinejoin="round" />
          </svg>
          <div className="wax">
            <Doodle id="tunas" size="62%" color="var(--on-ink)" sw={3} />
          </div>
        </div>

        {phase === 'write' ? (
          <>
            <div className="col gap-sm rise">
              <span className="label">{COPY.seal.lastLinePrompt.toLowerCase()}</span>
              <input className="field hand" style={{ fontSize: 28 }} value={line} maxLength={200} onChange={(e) => setLine(e.target.value)} placeholder={COPY.seal.lastLinePlaceholder} autoFocus />
              <span className="tiny soft">Setahun lagi, kalimat-kalimat ini menjadi puisi panjang yang kalian tulis tanpa sadar.</span>
            </div>
            <div className="col gap-sm rise" style={{ animationDelay: '.08s' }}>
              <span className="label">warna hari ini</span>
              <MoodPicker value={mood} onChange={setMood} compact />
            </div>
            {circles.length ? <Toggle label="kalimat terakhir hanya untukku" value={priv} onChange={setPriv} /> : null}
            {err ? <div className="small" style={{ color: 'var(--danger, #b3261e)' }}>{err}</div> : null}
            <div className="col center" style={{ alignItems: 'center', gap: 10 }}>
              <button
                className="hold-btn"
                aria-label="tahan untuk menyegel"
                onPointerDown={start}
                onPointerUp={stop}
                onPointerLeave={stop}
                onPointerCancel={stop}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') void go();
                }}
                onContextMenu={(e) => e.preventDefault()}>
                <svg className="ring" viewBox="0 0 100 100" aria-hidden>
                  <circle cx="50" cy="50" r="46" fill="none" stroke="var(--ink)" strokeOpacity=".18" strokeWidth="3" />
                  <circle cx="50" cy="50" r="46" fill="none" stroke="var(--ink)" strokeWidth="3.5" strokeLinecap="round" pathLength={1} strokeDasharray="1" strokeDashoffset={1 - progress} />
                </svg>
                <Doodle id="segel-lilin" size={58} color="var(--on-ink)" sw={2.6} style={{ transform: `scale(${1 + progress * 0.15})` }} />
              </button>
              <span className="small ink-soft">tahan untuk menyegel</span>
            </div>
          </>
        ) : null}

        {phase === 'closing' ? <div className="center hand ink fade" style={{ fontSize: 30 }}>menutup amplop…</div> : null}

        {phase === 'done' && result ? <Confetti /> : null}
        {phase === 'done' && result ? (
          <div className="col gap-lg rise">
            <div className="center">
              <div className="title ink">{COPY.seal.sealed}</div>
              {line ? <div className="hand" style={{ fontSize: 28 }}>“{line}”</div> : null}
            </div>
            {milestone ? (
              <div className="sticky" style={{ background: 'var(--sticky-yellow)', textAlign: 'center' }}>
                <Doodle id={MILESTONE[milestone]!.doodle} size={52} draw />
                <div className="h2 ink">{MILESTONE[milestone]!.name}</div>
                <div className="small">{MILESTONE[milestone]!.line}</div>
              </div>
            ) : null}
            {result.circles.map((r) => {
              const c = circles.find((x) => x.id === r.circleId);
              if (!c) return null;
              const waiting = c.others.filter((m) => !c.todaySealed[m.userId] && m.userId !== me.user.id);
              return (
                <button key={r.circleId} className="card row between" style={{ textAlign: 'left', width: '100%' }} onClick={() => onOpen(r.circleId)}>
                  <span>
                    <span className="h2 ink" style={{ display: 'block' }}>{c.name}</span>
                    <span className="small soft">
                      {r.allSealed ? COPY.seal.opened : c.kind === 'duo' && waiting[0] ? COPY.seal.waitingPartner(waiting[0].penName) : COPY.seal.circleProgress(c.active.length - waiting.length, c.active.length)}
                    </span>
                  </span>
                  <span className="row gap-sm">
                    <Doodle id="ui-api" size={22} className="breathe" />
                    <span className="h2 ink">{r.streak.current}</span>
                  </span>
                </button>
              );
            })}
            <button className="btn" onClick={onClose}>selesai</button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

