/**
 * Niat Pagi: satu pikiran baik saat bangun, ditulis tangan di halaman yang
 * lapang. Niat-niat hari sebelumnya melayang samar di pinggir kartu. Saat
 * menyegel, niat pagi ditampilkan lagi sebagai pengingat.
 */
import { formatDayShort } from '@sehari/core';
import { type CSSProperties, useState } from 'react';
import { store } from '@/lib/storage';
import { Doodle } from '@/ui/kit';

export interface NiatNote {
  day: string;
  text: string;
}

const KEY = 'niat';
export const niatHistory = (): NiatNote[] => store.json<NiatNote[]>(KEY) ?? [];
export function rememberNiat(day: string, text: string) {
  const xs = [{ day, text }, ...niatHistory().filter((x) => x.day !== day)].slice(0, 14);
  store.set(KEY, JSON.stringify(xs));
}
export const skipNiat = (day: string) => store.set(`niatSkip.${day}`, '1');
export const niatSkipped = (day: string) => store.get(`niatSkip.${day}`) === '1';

const SPOTS: CSSProperties[] = [
  { top: '6%', left: '-4%', rotate: '-7deg' },
  { top: '14%', right: '-6%', rotate: '6deg' },
  { top: '48%', left: '-8%', rotate: '4deg' },
  { top: '56%', right: '-7%', rotate: '-5deg' },
];

function greeting(h: number) {
  if (h < 11) return 'pagi.';
  if (h < 15) return 'siang.';
  if (h < 18) return 'sore.';
  return 'malam.';
}

export function NiatCard({ day, onSave, onSkip }: { day: string; onSave: (text: string) => void; onSkip: () => void }) {
  const [text, setText] = useState('');
  const past = niatHistory().filter((x) => x.day !== day);
  const h = new Date().getHours();
  const send = () => text.trim() && onSave(text.trim());
  // Ringkas dulu: kertas hari ini tetap jadi hal pertama yang terlihat.
  const [open, setOpen] = useState(false);
  if (!open)
    return (
      <div className="niat-strip rise" aria-label="niat pagi">
        <button className="niat-strip-main" onClick={() => setOpen(true)} data-testid="niat-open">
          <Doodle id="matahari-kecil" size={24} />
          <span className="rupa-hand">{greeting(h)} satu pikiran baik untuk hari ini?</span>
          <span className="niat-strip-go">tanam</span>
        </button>
        <button className="icon-btn" onClick={onSkip} aria-label="lewati niat hari ini">
          <Doodle id="ui-tutup" size={14} />
        </button>
      </div>
    );
  return (
    <section className="niat rise" aria-label="niat pagi">
      {past.slice(0, 4).map((n, i) => (
        <span key={n.day} className="niat-float" style={{ ...SPOTS[i], animationDelay: `${i * 0.6}s` }} aria-hidden>
          <b>{formatDayShort(n.day)}</b>
          {n.text.slice(0, 46)}
        </span>
      ))}
      <div className="niat-top">
        <span className="rupa-hand niat-brand">sehari.</span>
        <button className="icon-btn" onClick={() => setOpen(false)} aria-label="ciutkan">
          <Doodle id="ui-tutup" size={16} />
        </button>
      </div>
      <div className="niat-ask">
        <Doodle id="panah-lengkung" size={44} className="niat-arrow" />
        <span className="rupa-hand">
          {greeting(h)} satu pikiran baik
          <br />
          untuk hari ini?
        </span>
      </div>
      <textarea
        className="niat-input rupa-hand"
        rows={2}
        maxLength={140}
        value={text}
        placeholder="pikiran pertama saat bangun = benih untuk seharian…"
        autoFocus
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            send();
          }
        }}
        data-testid="niat-input"
      />
      <div className="niat-foot">
        <span className="niat-days" aria-hidden>
          {past.slice(0, 3).reverse().map((n) => (
            <span key={n.day}>
              <Doodle id="tunas" size={20} />
              {formatDayShort(n.day)}
            </span>
          ))}
        </span>
        <button className="niat-go" disabled={!text.trim()} onClick={send} aria-label="tanam niat" data-testid="niat-save">
          <Doodle id="ui-panah-kanan" size={20} color="currentColor" />
        </button>
      </div>
    </section>
  );
}
