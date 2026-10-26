/**
 * Versi cetak satu halaman jurnal: ditata ulang sebagai dokumen yang rapi
 * (bukan kanvas), lalu dicetak / disimpan sebagai PDF. Hanya ada saat mencetak.
 */
import { dayName, type DropPayload, formatDayLong, MOODS } from '@sehari/core';
import { createPortal } from 'react-dom';
import { Photo } from '@/pages/story/cards';

const pad = (n: number) => String(n).padStart(2, '0');

export function PrintSheet({ day, items, author, place, title }: { day: string; items: DropPayload[]; author: string; place?: string; title?: string }) {
  const body = items.filter((p) => p.kind !== 'last_line' && p.kind !== 'sticker');
  const last = items.find((p) => p.kind === 'last_line');
  const mood = items.find((p) => p.mood)?.mood;
  return createPortal(
    <article className="print-sheet">
      <header className="ps-head">
        <span className="ps-brand">sehari</span>
        <h1>
          {dayName(day)}, {formatDayLong(day, false)}
        </h1>
        <p>
          {[author, place, title].filter(Boolean).join(' · ')}
          {mood ? (
            <>
              {' · '}
              <span className="ps-mood" style={{ background: MOODS[mood]?.color }} /> {MOODS[mood]?.label}
            </>
          ) : null}
        </p>
      </header>
      {body.map((p, i) => (
        <section key={i} className="ps-item">
          {p.hour !== undefined ? <time>{`${pad(p.hour)}.${pad(p.minute ?? 0)}`}</time> : null}
          {p.prompt ? <p className="ps-prompt">{p.prompt}</p> : null}
          {p.media?.filter((m) => m.mime.startsWith('image/')).map((m) => <Photo key={m.id} media={m} className="ps-photo" />)}
          {p.text ? <p className={p.kind === 'photo' ? 'ps-caption' : 'ps-text'}>{p.text}</p> : null}
          {p.song ? (
            <p className="ps-song">
              ♪ {p.song.title} — {p.song.artist}
            </p>
          ) : null}
        </section>
      ))}
      {last?.text ? <blockquote className="ps-last">“{last.text}”</blockquote> : null}
      <footer className="ps-foot">ditulis di Sehari · disimpan {formatDayLong(new Date().toISOString().slice(0, 10), false)}</footer>
    </article>,
    document.body,
  );
}
