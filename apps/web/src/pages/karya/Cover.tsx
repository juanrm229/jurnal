/** Sampul karya: seperti punggung & muka buku kecil di rak. */
import type { CSSProperties } from 'react';
import { type CoverTone, KIND_INFO, type WorkPayload } from '@/lib/works';
import { Doodle } from '@/ui/kit';

export const TONES: Record<CoverTone, { bg: string; fg: string; name: string }> = {
  tinta: { bg: 'var(--ink)', fg: 'var(--on-ink)', name: 'tinta' },
  malam: { bg: 'linear-gradient(160deg, #1b1b26, #0d0d14)', fg: '#E9DDBF', name: 'malam' },
  krem: { bg: 'linear-gradient(160deg, #f4ecdc, #e9dcc2)', fg: '#2b2418', name: 'krem' },
  'merah-bata': { bg: 'linear-gradient(160deg, #9a4231, #7a2f22)', fg: '#F6E7D6', name: 'merah bata' },
  lumut: { bg: 'linear-gradient(160deg, #47633f, #2f4529)', fg: '#EEF0DE', name: 'lumut' },
  senja: { bg: 'linear-gradient(165deg, #f6c08a, #d9707c 70%, #8f4f8a)', fg: '#2a1424', name: 'senja' },
  kabut: { bg: 'linear-gradient(160deg, #dfe5ea, #c3ccd4)', fg: '#1f2a33', name: 'kabut' },
  kertas: { bg: 'var(--card)', fg: 'var(--ink)', name: 'kertas' },
};

export function Cover({ work, author, size = 'md', style }: { work: WorkPayload | null; author?: string; size?: 'sm' | 'md' | 'lg'; style?: CSSProperties }) {
  const tone = TONES[work?.cover.tone ?? 'kertas'] ?? TONES.kertas;
  const info = KIND_INFO[work?.kind ?? 'catatan'];
  return (
    <div className={`cover cover-${size}`} style={{ background: tone.bg, color: tone.fg, ...style }}>
      <span className="cover-kind">{info.name}</span>
      <div className="cover-title">{work?.title || (work ? 'tanpa judul' : '…')}</div>
      {work?.subtitle ? <div className="cover-sub">{work.subtitle}</div> : null}
      <div className="cover-art">
        <Doodle id={work?.cover.doodle ?? info.doodle} size="100%" color="currentColor" sw={1.8} />
      </div>
      {author ? <span className="cover-author">{author}</span> : null}
    </div>
  );
}
