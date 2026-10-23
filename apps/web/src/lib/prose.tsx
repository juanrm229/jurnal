/**
 * Markdown kecil untuk karya: # judul bagian, > kutipan, --- pemisah (❦),
 * **tebal**, *miring*. Dirender sebagai elemen React — tanpa HTML mentah.
 */
import { Fragment, type ReactNode } from 'react';

type Block = { t: 'h2' | 'h3' | 'quote' | 'p'; text: string } | { t: 'hr' };

export function parseBlocks(src: string): Block[] {
  const out: Block[] = [];
  let para: string[] = [];
  let quote: string[] = [];
  const flush = () => {
    if (para.length) out.push({ t: 'p', text: para.join('\n') });
    if (quote.length) out.push({ t: 'quote', text: quote.join('\n') });
    para = [];
    quote = [];
  };
  for (const raw of src.replace(/\r/g, '').split('\n')) {
    const line = raw.trimEnd();
    if (!line.trim()) {
      flush();
      continue;
    }
    if (/^(-{3,}|\*{3,}|❦|✦)$/.test(line.trim())) {
      flush();
      out.push({ t: 'hr' });
    } else if (/^##\s+/.test(line)) {
      flush();
      out.push({ t: 'h3', text: line.replace(/^##\s+/, '') });
    } else if (/^#\s+/.test(line)) {
      flush();
      out.push({ t: 'h2', text: line.replace(/^#\s+/, '') });
    } else if (/^>\s?/.test(line)) {
      if (para.length) {
        out.push({ t: 'p', text: para.join('\n') });
        para = [];
      }
      quote.push(line.replace(/^>\s?/, ''));
    } else {
      if (quote.length) {
        out.push({ t: 'quote', text: quote.join('\n') });
        quote = [];
      }
      para.push(line);
    }
  }
  flush();
  return out;
}

/** **tebal**, *miring* / _miring_, dan baris baru di dalam paragraf. */
export function inline(text: string): ReactNode {
  const lines = text.split('\n');
  return lines.map((ln, li) => (
    <Fragment key={li}>
      {li > 0 ? <br /> : null}
      {ln.split(/(\*\*[^*]+\*\*|\*[^*\s][^*]*\*|_[^_\s][^_]*_)/g).map((part, i) => {
        if (/^\*\*[^*]+\*\*$/.test(part)) return <strong key={i}>{part.slice(2, -2)}</strong>;
        if (/^(\*[^*].*\*|_.+_)$/.test(part)) return <em key={i}>{part.slice(1, -1)}</em>;
        return <Fragment key={i}>{part}</Fragment>;
      })}
    </Fragment>
  ));
}

export function Prose({ body, verse, dropCap = true }: { body: string; verse?: boolean; dropCap?: boolean }) {
  const blocks = parseBlocks(body);
  let firstP = true;
  return (
    <div className={`prose ${verse ? 'verse' : ''}`}>
      {blocks.map((b, i) => {
        if (b.t === 'hr') return <div key={i} className="ornament" aria-hidden>❦</div>;
        if (b.t === 'h2') return <h2 key={i}>{inline(b.text)}</h2>;
        if (b.t === 'h3') return <h3 key={i}>{inline(b.text)}</h3>;
        if (b.t === 'quote') return <blockquote key={i}>{inline(b.text)}</blockquote>;
        const cap = dropCap && firstP && !verse;
        firstP = false;
        return (
          <p key={i} className={cap ? 'drop-cap' : undefined}>
            {inline(b.text)}
          </p>
        );
      })}
    </div>
  );
}
