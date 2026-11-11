/**
 * Niat Pagi: satu pikiran baik saat bangun, ditulis tangan di halaman yang
 * lapang. Niat-niat hari sebelumnya melayang samar di pinggir kartu. Saat
 * menyegel, niat pagi ditampilkan lagi sebagai pengingat.
 */
import { formatDayShort } from '@sehari/core';
import { type CSSProperties, useState } from 'react';
import { store } from '@/lib/storage';
import { Doodle, Sheet } from '@/ui/kit';

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

export function NiatCard({ day, onSave, onSkip, compact }: { day: string; onSave: (text: string) => void; onSkip: () => void; /** Kertas sudah berisi: cukup penanda kecil di tepi atas. */ compact?: boolean }) {
  const [text, setText] = useState('');
  const past = niatHistory().filter((x) => x.day !== day);
  const h = new Date().getHours();
  const send = () => text.trim() && onSave(text.trim());
  // Catatan tempel di atas kertas; lembar tulisnya baru terbuka saat diketuk.
  const [open, setOpen] = useState(false);
  return (
    <>
      {compact ? (
        <button className="niat-tab" onClick={() => setOpen(true)} data-testid="niat-open" data-paper="1">
          <Doodle id="matahari-kecil" size={14} color="currentColor" />
          <span>niat {greeting(h).replace('.', '')}?</span>
        </button>
      ) : (
        <div className="niat-note" aria-label="niat pagi" data-paper="1">
          <button className="niat-note-main" onClick={() => setOpen(true)} data-testid="niat-open">
            <small>niat {greeting(h).replace('.', '')}</small>
            <span className="rupa-hand">satu pikiran baik untuk hari ini?</span>
            <span className="niat-note-go">tanam</span>
          </button>
          <button className="niat-note-x" onClick={onSkip} aria-label="lewati niat hari ini">
            <Doodle id="ui-tutup" size={12} color="currentColor" />
          </button>
        </div>
      )}
      <Sheet open={open} onClose={() => setOpen(false)} title="niat hari ini">
        <NiatForm past={past} h={h} text={text} setText={setText} send={send} />
        <button className="btn ghost sm" style={{ marginTop: 12 }} onClick={onSkip}>
          lewati hari ini
        </button>
      </Sheet>
    </>
  );
}

function NiatForm({ past, h, text, setText, send }: { past: NiatNote[]; h: number; text: string; setText: (t: string) => void; send: () => void }) {
  return (
    <section className="niat" aria-label="niat pagi">
      {past.slice(0, 4).map((n, i) => (
        <span key={n.day} className="niat-float" style={{ ...SPOTS[i], animationDelay: `${i * 0.6}s` }} aria-hidden>
          <b>{formatDayShort(n.day)}</b>
          {n.text.slice(0, 46)}
        </span>
      ))}
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
