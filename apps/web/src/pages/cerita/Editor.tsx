/**
 * Editor naskah cerita: sorotan tinggal di dalam teks. Pilih potongan kalimat,
 * lalu jadikan jejak (merah) atau kalimat serah-terima (biru). Lapisan sorotan
 * digambar di belakang textarea transparan dengan huruf dan jarak yang sama,
 * jadi papan ketik bawaan HP tetap dipakai.
 */
import { storySentences } from '@sehari/core';
import { type ReactNode, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Doodle } from '@/ui/kit';

interface Props {
  value: string;
  onChange: (v: string) => void;
  line: string;
  trace: string;
  proof: string;
  onLine: (s: string) => void;
  onTrace: (s: string) => void;
  onProof?: (s: string) => void;
  placeholder: string;
  words: { min: number; max?: number };
  /** Kartu prompt ringkas yang tetap terlihat di mode fokus. */
  focusHead?: ReactNode;
}

/** Bungkus kemunculan pertama tiap tanda dalam teks dengan <mark>. */
function paint(text: string, marks: { s: string; cls: string }[]) {
  const spans: { at: number; end: number; cls: string }[] = [];
  for (const m of marks) {
    if (!m.s.trim()) continue;
    const at = text.indexOf(m.s);
    if (at >= 0 && !spans.some((x) => at < x.end && at + m.s.length > x.at)) spans.push({ at, end: at + m.s.length, cls: m.cls });
  }
  spans.sort((a, b) => a.at - b.at);
  const out: ReactNode[] = [];
  let i = 0;
  spans.forEach((x, k) => {
    out.push(text.slice(i, x.at));
    out.push(
      <mark key={k} className={x.cls}>
        {text.slice(x.at, x.end)}
      </mark>,
    );
    i = x.end;
  });
  out.push(text.slice(i) + '\n');
  return out;
}

export function StoryEditor({ value, onChange, line, trace, proof, onLine, onTrace, onProof, placeholder, words, focusHead }: Props) {
  const ta = useRef<HTMLTextAreaElement>(null);
  const [sel, setSel] = useState('');
  const [focus, setFocus] = useState(false);
  const [pick, setPick] = useState(false);
  const n = value.trim() ? value.trim().split(/\s+/).length : 0;
  const ok = n >= words.min && (!words.max || n <= words.max);

  // Tinggi mengikuti isi, supaya lapisan sorotan dan teks tidak pernah bergeser.
  useLayoutEffect(() => {
    const el = ta.current;
    if (!el) return;
    el.style.height = '0px';
    el.style.height = `${Math.max(focus ? window.innerHeight * 0.6 : 220, el.scrollHeight)}px`;
  }, [value, focus]);
  useEffect(() => {
    if (focus) ta.current?.focus();
    document.documentElement.classList.toggle('editor-fokus', focus);
    return () => document.documentElement.classList.remove('editor-fokus');
  }, [focus]);

  const readSel = () => {
    const el = ta.current;
    if (!el) return;
    setSel(el.selectionEnd > el.selectionStart ? value.slice(el.selectionStart, el.selectionEnd).trim() : '');
  };
  const use = (f: (s: string) => void) => {
    f(sel);
    setSel('');
    navigator.vibrate?.(8);
  };
  const sentences = storySentences(value);

  return (
    <div className={`seditor ${focus ? 'fokus' : ''}`}>
      {focus && focusHead ? <div className="seditor-head">{focusHead}</div> : null}
      <div className="seditor-paper">
        <div className="seditor-layer" aria-hidden>
          {paint(value, [
            { s: trace, cls: 'm-jejak' },
            { s: line, cls: 'm-serah' },
            { s: proof, cls: 'm-bukti' },
          ])}
        </div>
        <textarea
          ref={ta}
          className="seditor-input"
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          onSelect={readSel}
          onKeyUp={readSel}
          onMouseUp={readSel}
          onTouchEnd={() => setTimeout(readSel, 30)}
          spellCheck
          data-testid="naskah"
        />
      </div>
      <div className={`seditor-bar ${sel ? 'on' : ''}`}>
        {sel ? (
          <>
            <span className="seditor-sel">“{sel.length > 46 ? `${sel.slice(0, 46)}…` : sel}”</span>
            <button type="button" className="sb jejak" onMouseDown={(e) => e.preventDefault()} onClick={() => use(onTrace)} data-testid="jadi-jejak">
              jadikan jejak
            </button>
            <button type="button" className="sb serah" onMouseDown={(e) => e.preventDefault()} onClick={() => use(onLine)} data-testid="jadi-serah">
              serah-terima
            </button>
            {onProof ? (
              <button type="button" className="sb bukti" onMouseDown={(e) => e.preventDefault()} onClick={() => use(onProof)}>
                bukti role
              </button>
            ) : null}
          </>
        ) : (
          <>
            <span className={`seditor-n ${ok ? 'ok' : ''}`}>
              {n} kata · {words.max ? `${words.min}–${words.max}` : `minimal ${words.min}`}
            </span>
            <span className="seditor-hint">pilih potongan teks untuk menandainya</span>
            <button type="button" className="sb ghost" onClick={() => setPick(!pick)} aria-expanded={pick} disabled={!sentences.length}>
              kalimat
            </button>
            <button type="button" className="sb ghost" onClick={() => setFocus(!focus)} aria-pressed={focus} data-testid="mode-fokus">
              <Doodle id={focus ? 'ui-tutup' : 'buku-terbuka'} size={16} color="currentColor" /> {focus ? 'selesai' : 'fokus'}
            </button>
          </>
        )}
      </div>
      {pick && !sel ? (
        <div className="seditor-pick">
          <span className="tiny soft">ketuk satu kalimat untuk dijadikan serah-terima</span>
          {sentences.map((s, i) => (
            <button
              key={i}
              type="button"
              className={same(s, line) ? 'on' : ''}
              onClick={() => {
                onLine(s);
                setPick(false);
              }}>
              {s}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

const same = (a: string, b: string) => a.trim() === b.trim();
