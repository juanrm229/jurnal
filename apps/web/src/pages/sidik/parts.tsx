/**
 * Komponen SIDIK: tombol tahan, timer, kartu peran (tahan / goyang untuk
 * membuka), papan tersangka dengan catatan pribadi, daftar petunjuk, dan
 * siaran ulang di akhir.
 */
import { sidik } from '@sehari/core';
import { type CSSProperties, type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { type View, vibrate } from '@/lib/sidik';
import { store } from '@/lib/storage';
import { Doodle } from '@/ui/kit';

export const roleInfo = (r: sidik.RoleId | null | undefined) => (r ? sidik.ROLES[r] : null);

const FACES = ['wajah-senyum', 'wajah-ngantuk', 'wajah-tertawa', 'wajah-sedih', 'kucing', 'burung', 'kelinci', 'landak', 'bebek', 'katak', 'siput', 'kepik', 'ikan', 'lebah', 'kupu-kupu', 'capung'];
/** Doodle wajah tersangka, tetap untuk nama yang sama. */
export const faceOf = (name: string) => FACES[[...name].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7) % FACES.length]!;

export function PlayerFace({ avatar, size = 40, dim }: { avatar: string; size?: number; dim?: boolean }) {
  const st = { width: size, height: size, opacity: dim ? 0.45 : 1 } as CSSProperties;
  return avatar.startsWith('data:') ? (
    <img className="sd-face" src={avatar} alt="" style={st} />
  ) : (
    <span className="sd-face" style={st}>
      <Doodle id={avatar || 'tunas'} size={size * 0.62} color="currentColor" />
    </span>
  );
}

export function Timer({ secs, total }: { secs: number | null; total?: number }) {
  if (secs === null) return null;
  const pct = total ? Math.max(0, Math.min(1, secs / total)) : 1;
  return (
    <span className={`sd-timer ${secs <= 10 ? 'hot' : ''}`} style={{ '--p': pct } as CSSProperties}>
      <b>{secs >= 60 ? `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}` : secs}</b>
    </span>
  );
}

/** Tahan untuk mengonfirmasi: semua pemain melakukan gerakan yang sama di malam hari. */
export function HoldButton({ label, onDone, ms = 1400, disabled, done }: { label: ReactNode; onDone: () => void; ms?: number; disabled?: boolean; done?: boolean }) {
  const [p, setP] = useState(0);
  const raf = useRef(0);
  const start = useRef(0);
  const begin = () => {
    if (disabled || done) return;
    start.current = performance.now();
    vibrate(15);
    const loop = () => {
      const x = Math.min(1, (performance.now() - start.current) / ms);
      setP(x);
      if (x >= 1) {
        vibrate([40, 40, 40]);
        onDone();
        return;
      }
      raf.current = requestAnimationFrame(loop);
    };
    raf.current = requestAnimationFrame(loop);
  };
  const end = () => {
    cancelAnimationFrame(raf.current);
    if (p < 1) setP(0);
  };
  useEffect(() => () => cancelAnimationFrame(raf.current), []);
  return (
    <button
      className={`sd-hold ${done ? 'done' : ''}`}
      disabled={disabled}
      style={{ '--p': done ? 1 : p } as CSSProperties}
      onPointerDown={begin}
      onPointerUp={end}
      onPointerLeave={end}
      onPointerCancel={end}
      onContextMenu={(e) => e.preventDefault()}>
      <span>{done ? 'terkirim ✓' : label}</span>
    </button>
  );
}

/** Kartu peran: tahan untuk mengintip, atau goyang HP. Lepas = tertutup lagi. */
export function RoleCard({ view, onSeen }: { view: View; onSeen?: () => void }) {
  const me = view.me!;
  const info = roleInfo(me.role);
  const [open, setOpen] = useState(false);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    let last = 0;
    const onMotion = (e: DeviceMotionEvent) => {
      const a = e.accelerationIncludingGravity;
      const m = Math.abs(a?.x ?? 0) + Math.abs(a?.y ?? 0) + Math.abs(a?.z ?? 0);
      if (m > 32 && Date.now() - last > 1200) {
        last = Date.now();
        setOpen(true);
        setSeen(true);
        vibrate(60);
        setTimeout(() => setOpen(false), 3500);
      }
    };
    window.addEventListener('devicemotion', onMotion);
    return () => window.removeEventListener('devicemotion', onMotion);
  }, []);
  useEffect(() => {
    if (seen) onSeen?.();
  }, [seen]);
  if (!info) return null;
  const allies = view.players.filter((p) => me.allies.includes(p.id));
  const culprit = me.culprit !== null ? view.suspects[me.culprit] : null;
  const myIntel = view.intel.filter((i) => i.to === me.id && i.round === 0);
  return (
    <div
      className={`sd-role ${open ? 'open' : ''} team-${info.team}`}
      onPointerDown={async () => {
        // iOS meminta izin sensor gerak sekali.
        const D = DeviceMotionEvent as unknown as { requestPermission?: () => Promise<string> };
        if (D.requestPermission) void D.requestPermission().catch(() => {});
        setOpen(true);
        setSeen(true);
        vibrate(30);
      }}
      onPointerUp={() => setOpen(false)}
      onPointerLeave={() => setOpen(false)}
      onPointerCancel={() => setOpen(false)}
      onContextMenu={(e) => e.preventDefault()}>
      <div className="sd-role-back">
        <Doodle id="segel-lilin" size={110} color="currentColor" />
        <span className="sd-seal">rahasia</span>
        <span className="sd-role-hint">tahan untuk membuka, atau goyangkan HP</span>
        <span className="tiny">jangan biarkan orang lain mengintip</span>
      </div>
      <div className="sd-role-front">
        <Doodle id={info.doodle} size={84} draw />
        <b className="sd-role-name">{info.name}</b>
        <span className="sd-role-team">{info.team === 'baik' ? 'tim detektif' : info.team === 'jahat' ? 'tim pelaku' : 'netral'}</span>
        <i className="sd-role-tag">{info.tagline}</i>
        <span className="sd-role-power">{info.power}</span>
        <span className="sd-role-goal">🎯 {info.goal}</span>
        {culprit ? (
          <span className="sd-secret">
            Pelakunya: <b>{culprit.name}</b> ({culprit.job})
          </span>
        ) : null}
        {allies.length ? <span className="sd-secret">Rekanmu: {allies.map((a) => a.name).join(', ')}</span> : null}
        {myIntel.map((i) => (
          <span key={i.id} className="sd-secret">
            {i.text}
          </span>
        ))}
      </div>
    </div>
  );
}

type Mark = '' | 'x' | '?' | '*';
const NEXT: Record<Mark, Mark> = { '': 'x', x: '?', '?': '*', '*': '' };

export function useNotes(code: string) {
  const key = `sidikNotes.${code}`;
  const [notes, setNotes] = useState<Record<number, Mark>>(() => store.json(key) ?? {});
  const cycle = (id: number) =>
    setNotes((n) => {
      const x = { ...n, [id]: NEXT[n[id] ?? ''] };
      store.set(key, JSON.stringify(x));
      return x;
    });
  const reset = () => {
    store.set(key, '{}');
    setNotes({});
  };
  return { notes, cycle, reset };
}

/** Fakta yang kamu ketahui: petunjukmu, laporan publik, dan bukti yang ditunjukkan. */
export function knownFacts(view: View) {
  return view.intel.filter((i) => i.fact && (i.to === view.me?.id || i.to === '*'));
}

export function Board({
  view,
  notes,
  onNote,
  selected,
  onSelect,
  off,
  showHits = true,
}: {
  view: View;
  notes: Record<number, Mark>;
  onNote?: (id: number) => void;
  selected?: number[];
  onSelect?: (id: number) => void;
  off?: Set<string>;
  showHits?: boolean;
}) {
  const facts = useMemo(() => knownFacts(view).filter((i) => !off?.has(i.id)), [view.intel, off]);
  const st = view.story;
  return (
    <div className="sd-board">
      {view.suspects.map((s) => {
        const hits = showHits ? facts.filter((f) => !sidik.holds(f.fact!, s)).length : 0;
        const mark = notes[s.id] ?? '';
        const sel = selected?.includes(s.id);
        const isCulprit = view.culprit === s.id || (view.me?.culprit === s.id && view.phase !== 'end');
        return (
          <button
            key={s.id}
            className={`sd-sus ${s.out ? 'out' : ''} ${sel ? 'sel' : ''} m-${mark === '*' ? 'star' : mark === 'x' ? 'x' : mark === '?' ? 'q' : 'none'} ${isCulprit ? 'culprit' : ''}`}
            disabled={!!s.out && !onNote}
            onClick={() => (onSelect && !s.out ? onSelect(s.id) : onNote?.(s.id))}>
            <PlayerFace avatar={faceOf(s.name)} size={40} />
            <b className="sd-sus-name">{s.name}</b>
            <span className="sd-sus-job">{s.job}</span>
            <span className="sd-sus-traits">
              {s.attrs.map((v, c) => (
                <span key={c} title={st.cats[c]!.name}>
                  {st.cats[c]!.traits[v]!.label}
                </span>
              ))}
            </span>
            {hits ? <span className="sd-hits">{hits}✕</span> : null}
            {mark ? <span className="sd-mark">{mark === 'x' ? '✗' : mark === '?' ? '?' : '★'}</span> : null}
            {s.out ? <span className="sd-stamp">DICORET</span> : null}
            {isCulprit ? <span className="sd-culprit-tag">pelaku</span> : null}
          </button>
        );
      })}
    </div>
  );
}

const KIND: Partial<Record<sidik.Intel['kind'], [string, string]>> = {
  selidik: ['ui-cari', 'petunjukmu'],
  kosong: ['awan', 'nihil'],
  forensik: ['kacamata', 'laporan forensik'],
  magang: ['tunas', 'petunjuk magang'],
  saksi: ['bintang-mata', 'kesaksian'],
  audit: ['laptop', 'hasil retas'],
  psikolog: ['gelembung-kata', 'hasil baca'],
  cctv: ['kamera', 'rahasia'],
  surat: ['amplop', 'untuk semua'],
  event: ['petir', 'kejadian'],
  gagal: ['payung-terbuka', 'gagal'],
  bukti: ['klip-kertas', 'bukti ditunjukkan'],
};

export function IntelList({ view, round, onShow, off, onToggle }: { view: View; round?: number; onShow?: (id: string) => void; off?: Set<string>; onToggle?: (id: string) => void }) {
  const me = view.me?.id;
  const shown = new Set(view.intel.filter((i) => i.kind === 'bukti').map((i) => i.src));
  const list = view.intel.filter((i) => round === undefined || i.round === round).slice().reverse();
  if (!list.length) return <p className="small soft">Belum ada petunjuk.</p>;
  return (
    <div className="sd-intel">
      {list.map((i) => {
        const mine = i.to === me;
        const by = i.by ? view.players.find((p) => p.id === i.by)?.name : null;
        return (
          <div key={i.id} className={`sd-clue k-${i.kind} ${off?.has(i.id) ? 'off' : ''} ${i.truth === false ? 'fake' : i.truth === true ? 'real' : ''}`}>
            <span className="sd-clue-kind">
              <Doodle id={KIND[i.kind]?.[0] ?? 'ui-cari'} size={14} color="currentColor" />
              {!mine && i.to !== '*' && i.to !== 'jahat' ? `petunjuk ${view.players.find((p) => p.id === i.to)?.name ?? ''}` : (KIND[i.kind]?.[1] ?? i.kind)}
              {by ? ` · ${by}` : ''} · malam {i.round || '0'}
            </span>
            <span className="sd-clue-text">{i.text}</span>
            <span className="sd-clue-actions">
              {i.fact && onToggle ? (
                <button className="pill sm" onClick={() => onToggle(i.id)}>
                  {off?.has(i.id) ? 'abaikan ✓' : 'curigai palsu'}
                </button>
              ) : null}
              {mine && onShow && i.kind !== 'gagal' && !shown.has(i.id) ? (
                <button className="pill sm active" onClick={() => onShow(i.id)}>
                  <Doodle id="klip-kertas" size={14} color="currentColor" /> tunjukkan
                </button>
              ) : null}
              {mine && shown.has(i.id) ? <span className="tiny soft">sudah ditunjukkan</span> : null}
              {i.truth === false ? <b className="sd-fake">PALSU</b> : null}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/** Siaran ulang: semua yang terjadi diam-diam di malam hari, dibuka di akhir. */
export function Replay({ view }: { view: View }) {
  const st = view.story;
  const name = (id?: string) => (id === 'bayangan' ? 'bayangan' : view.players.find((p) => p.id === id)?.name ?? 'seseorang');
  const ICON: Record<sidik.LogItem['kind'], string> = { tamper: 'pena', shadow: 'kabut', blocked: 'payung-terbuka', burn: 'penyiram', shield: 'payung-terbuka', audit: 'laptop', forge: 'stempel', publish: 'kacamata', psy: 'gelembung-kata', event: 'petir' };
  const line = (l: sidik.LogItem) => {
    switch (l.kind) {
      case 'tamper':
        return `${name(l.by)} memalsukan petunjuk ${name(l.target)}${l.place !== undefined ? ` di ${st.places[l.place]!.name}` : ''}.`;
      case 'shadow':
        return `Bayangan memalsukan petunjuk ${name(l.target)}.`;
      case 'blocked':
        return `${name(l.by)} mencoba memalsukan petunjuk ${name(l.target)}, tapi dijaga.`;
      case 'burn':
        return `${name(l.by)} membersihkan ${st.places[l.place ?? 0]!.name}.`;
      case 'shield':
        return `${name(l.by)} menjaga ${name(l.target)}.`;
      case 'audit':
        return `${name(l.by)} meretas ${name(l.target)}: ${l.note}`;
      case 'forge':
        return `${name(l.by)} menerbitkan Laporan Forensik PALSU.`;
      case 'publish':
        return `${name(l.by)} menerbitkan Laporan Forensik.`;
      case 'psy':
        return `${name(l.by)}: ${l.note}`;
      case 'event':
        return `${l.note}`;
    }
  };
  const rounds = [...new Set(view.log.map((l) => l.round))].sort();
  return (
    <div className="sd-replay">
      {rounds.map((r) => (
        <div key={r} className="sd-replay-round">
          <span className="sd-replay-night">
            <Doodle id="bulan" size={22} color="currentColor" /> malam {r}
          </span>
          {view.log
            .filter((l) => l.round === r)
            .map((l, i) => (
              <span key={i} className={`sd-replay-line k-${l.kind}`} style={{ animationDelay: `${i * 0.12}s` }}>
                <Doodle id={ICON[l.kind]} size={20} color="currentColor" />
                <span>{line(l)}</span>
              </span>
            ))}
        </div>
      ))}
      {view.whispers.length ? (
        <div className="sd-replay-round">
          <span className="sd-replay-night">
            <Doodle id="gelembung-kata" size={22} color="currentColor" /> bisikan
          </span>
          {view.whispers.map((w, i) => (
            <span key={i} className="sd-replay-line">
              <Doodle id="amplop" size={20} color="currentColor" />
              <span>
                {name(w.from)} → {name(w.to)}: “{w.text}”
              </span>
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
