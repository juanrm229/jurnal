/**
 * "Bingung mau ke mana?" — mesin slot kencan. Enam gulungan berputar:
 * tempat, kegiatan, makanan, misi kecil, obrolan, dresscode. Kunci yang
 * sudah pas, putar sisanya, lalu jadikan rencana.
 */
import { DATE_BUDGET_LABEL, DATE_TIME_LABEL, DATE_VIBE_LABEL, type DateBudget, type DateFilters, type DateIdea, type DateRoll, type DateTime, type DateVibe, rerollPart, rollDate } from '@sehari/core';
import { useEffect, useRef, useState } from 'react';
import { navigate, usePath } from '@/lib/router';
import { sound } from '@/lib/sound';
import { Doodle, Header } from '@/ui/kit';

const SLOTS: { k: keyof DateRoll; label: string; icon: string }[] = [
  { k: 'place', label: 'ke mana', icon: 'ui-lokasi' },
  { k: 'activity', label: 'ngapain', icon: 'sepeda' },
  { k: 'food', label: 'makan apa', icon: 'martabak' },
  { k: 'challenge', label: 'misi kecil', icon: 'bintang-kecil' },
  { k: 'question', label: 'obrolan', icon: 'gelembung-kata' },
  { k: 'dress', label: 'dresscode', icon: 'kacamata' },
];

export default function Acak() {
  const { search } = usePath();
  const replaceId = search.get('ganti');
  const [filters, setFilters] = useState<DateFilters>({});
  const [roll, setRoll] = useState<DateRoll>(() => rollDate());
  const [locked, setLocked] = useState<Set<keyof DateRoll>>(new Set());
  const [spinning, setSpinning] = useState<Set<keyof DateRoll>>(new Set());
  const [spins, setSpins] = useState(0);
  const timers = useRef<number[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const spin = () => {
    const open = SLOTS.map((s) => s.k).filter((k) => !locked.has(k));
    if (!open.length) return;
    setSpinning(new Set(open));
    setSpins((n) => n + 1);
    let next = roll;
    if (open.length === SLOTS.length) next = rollDate(filters);
    else for (const k of open) next = rerollPart(k, next, filters);
    // Gulungan berhenti satu per satu, seperti mesin slot.
    open.forEach((k, i) => {
      const t = window.setTimeout(() => {
        setRoll((r) => ({ ...r, [k]: next[k] }));
        setSpinning((s) => {
          const n = new Set(s);
          n.delete(k);
          return n;
        });
        sound.play(i === open.length - 1 ? 'chime' : 'tap');
      }, 520 + i * 260);
      timers.current.push(t);
    });
  };

  const toggleLock = (k: keyof DateRoll) => {
    sound.play('soft');
    setLocked((s) => {
      const n = new Set(s);
      n.has(k) ? n.delete(k) : n.add(k);
      return n;
    });
  };

  const usePlan = () => {
    const p = new URLSearchParams({
      place: roll.place.text,
      activity: roll.activity.text,
      food: roll.food.text,
      challenge: roll.challenge.text,
      question: roll.question.text,
      dress: roll.dress.text,
      ...(filters.budget ? { budget: DATE_BUDGET_LABEL[filters.budget] } : {}),
    });
    navigate(replaceId ? `/janji/${replaceId}/ubah?${p}` : `/janji/baru?${p}`);
  };

  const chip = <T extends string>(key: keyof DateFilters, value: T, label: string) => {
    const on = filters[key] === value;
    return (
      <button key={value} className={`pill sm ${on ? 'active' : ''}`} onClick={() => setFilters((f) => ({ ...f, [key]: on ? undefined : value }))}>
        {label}
      </button>
    );
  };

  return (
    <main className="screen acak">
      <Header title="bingung mau ke mana?" backTo="/janji" />
      <p className="lede center" style={{ margin: '0 auto 14px' }}>
        Putar mesinnya. Kunci yang sudah pas, putar sisanya. Ikuti saja — kadang rencana terbaik memang tidak direncanakan.
      </p>

      <div className="filters">
        <div className="chip-row">{(Object.keys(DATE_BUDGET_LABEL) as DateBudget[]).map((b) => chip('budget', b, DATE_BUDGET_LABEL[b]))}</div>
        <div className="chip-row">{(Object.keys(DATE_VIBE_LABEL) as DateVibe[]).map((v) => chip('vibe', v, DATE_VIBE_LABEL[v]))}</div>
        <div className="chip-row">
          {(Object.keys(DATE_TIME_LABEL) as DateTime[]).map((t) => chip('time', t, DATE_TIME_LABEL[t]))}
          {chip('setting', 'dalam', 'di dalam')}
          {chip('setting', 'luar', 'di luar')}
          {chip('fit', 'duo', 'berdua')}
          {chip('fit', 'grup', 'rame-rame')}
        </div>
      </div>

      <div className="slot-machine">
        <div className="slot-lights" aria-hidden>
          {Array.from({ length: 14 }, (_, i) => (
            <i key={i} style={{ animationDelay: `${i * 0.12}s` }} />
          ))}
        </div>
        {SLOTS.map((s) => (
          <Reel key={s.k} label={s.label} icon={s.icon} idea={roll[s.k]} spinning={spinning.has(s.k)} locked={locked.has(s.k)} onLock={() => toggleLock(s.k)} />
        ))}
      </div>

      <div className="col mt" style={{ gap: 8 }}>
        <button className="btn spin-btn" onClick={spin} disabled={spinning.size > 0} data-sound="none">
          <Doodle id="ui-dadu" size={24} color="currentColor" className={spinning.size ? 'spin' : ''} /> {spins ? 'putar lagi' : 'putar!'}
        </button>
        <button className="btn soft" onClick={usePlan} disabled={spinning.size > 0}>
          {replaceId ? 'ganti rencana dengan ini' : 'jadikan rencana'} <Doodle id="ui-panah-kanan" size={18} color="currentColor" />
        </button>
      </div>
      <p className="tiny soft center mt">ketuk gembok untuk mengunci satu gulungan</p>
    </main>
  );
}

function Reel({ label, icon, idea, spinning, locked, onLock }: { label: string; icon: string; idea: DateIdea; spinning: boolean; locked: boolean; onLock: () => void }) {
  return (
    <div className={`reel ${spinning ? 'spinning' : ''} ${locked ? 'locked' : ''}`}>
      <div className="reel-label">
        <Doodle id={icon} size={16} color="currentColor" /> {label}
      </div>
      <div className="reel-window">
        <div key={idea.id + String(spinning)} className="reel-text">
          {spinning ? <span className="reel-blur">· · · · ·</span> : idea.text}
        </div>
      </div>
      <button className="reel-lock" aria-pressed={locked} aria-label={locked ? 'buka kunci' : 'kunci'} onClick={onLock} data-sound="none">
        <Doodle id={locked ? 'ui-gembok' : 'ui-gembok-buka'} size={20} color="currentColor" />
      </button>
    </div>
  );
}
