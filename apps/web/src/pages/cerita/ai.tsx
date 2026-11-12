/**
 * AI cloud untuk meja cerita: opt-in, hanya bila semua anggota lingkaran
 * setuju. AI menawarkan; penulis memilih. Sebelum tombol ditekan, aplikasi
 * mengatakan teks apa yang akan dikirim.
 */
import type { StoryAiContinuity, StoryAiSummary, StoryAiTrace } from '@sehari/core';
import { type CSSProperties, type ReactNode, useState } from 'react';
import { api } from '@/lib/api';
import { Doodle } from '@/ui/kit';
import type { StoryModel } from './kit';

export function storyScenes(m: StoryModel) {
  const ps = [...m.main].sort((a, b) => a.round - b.round || m.st.members.indexOf(a.authorId) - m.st.members.indexOf(b.authorId)).filter((p) => m.sceneOf(p)?.text);
  return {
    parts: ps,
    scenes: ps.map((p) => ({ tokoh: m.tokohOf(p).slice(0, 60), waktu: (m.handoffOf(p)?.waktu ?? m.waktuOf(p.round)).slice(0, 80), text: (m.sceneOf(p)?.text ?? '').slice(0, 6000) })),
    facts: m.sah.map((f) => f.f.sentence).slice(0, 60),
  };
}

/** Pemanggil kecil dengan status sibuk dan pesan galat yang ramah. */
export function useAi<T>(m: StoryModel, path: string) {
  const [busy, setBusy] = useState(false);
  const [out, setOut] = useState<T | null>(null);
  const [err, setErr] = useState('');
  const run = async (body: unknown) => {
    setBusy(true);
    setErr('');
    try {
      setOut(await api.post<T>(`/stories/${m.st.id}/ai/${path}`, body));
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return { busy, out, err, run, clear: () => setOut(null) };
}

export function AiButton({ busy, onClick, children, testid }: { busy: boolean; onClick: () => void; children: ReactNode; testid?: string }) {
  return (
    <button className="btn ghost ai-btn" disabled={busy} onClick={onClick} data-testid={testid}>
      <Doodle id="bintang-tiga" size={16} color="currentColor" /> {busy ? 'AI sedang membaca…' : children}
    </button>
  );
}

export const AiNote = ({ what }: { what: string }) => <p className="tiny soft ai-note">{what} dikirim ke AI cloud untuk permintaan ini saja, di luar enkripsi ujung-ke-ujung. Tidak disimpan di server.</p>;

/** Usulan jejak dari naskah yang sedang ditulis. */
export function AiJejak({ m, text, tokoh, onPick }: { m: StoryModel; text: string; tokoh: string; onPick: (u: StoryAiTrace['usulan'][number]) => void }) {
  const ai = useAi<StoryAiTrace>(m, 'jejak');
  if (!m.st.aiOk || text.trim().split(/\s+/).length < 30) return null;
  return (
    <div className="ai-jejak">
      <AiButton busy={ai.busy} onClick={() => ai.run({ text: text.slice(0, 6000), tokoh: tokoh || 'tokoh', tokohs: m.tokohs.filter((t) => t !== tokoh).slice(0, 30) })} testid="ai-jejak">
        usulkan jejak dari naskahku
      </AiButton>
      {ai.err ? <span className="tiny ai-err">{ai.err}</span> : null}
      {ai.out ? (
        ai.out.usulan.length ? (
          <ul className="ai-usulan">
            {ai.out.usulan.map((u, i) => (
              <li key={i} style={{ '--n': i } as CSSProperties}>
                <button
                  onClick={() => {
                    onPick(u);
                    ai.clear();
                  }}
                >
                  <b>“{u.potongan}”</b>
                  <span className="tiny soft">
                    {u.tahu.length ? `bisa tahu: ${u.tahu.join(', ')} · ` : ''}
                    {u.pertanyaan}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <span className="tiny soft">AI tidak menemukan jejak yang jelas. Pilih sendiri dari naskah.</span>
        )
      ) : (
        <AiNote what="Naskah adeganmu" />
      )}
    </div>
  );
}

/** Cek kesinambungan semantik di Peta. */
export function AiKesinambungan({ m }: { m: StoryModel }) {
  const ai = useAi<StoryAiContinuity>(m, 'kesinambungan');
  const s = storyScenes(m);
  if (!m.st.aiOk || s.scenes.length < 2) return null;
  const label = (n: number) => {
    const p = s.parts[n - 1];
    return p ? `${m.tokohOf(p)}, gelombang ${p.round}` : `adegan ${n}`;
  };
  return (
    <section className="section ai-cek">
      <span className="label">kesinambungan · dibaca AI</span>
      {ai.out ? (
        ai.out.temuan.length ? (
          <ul className="cek">
            {ai.out.temuan.map((t, i) => (
              <li key={i}>
                {t.masalah} <span className="tiny soft">({t.adegan.map(label).join(' · ')})</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="small soft">Tidak ada yang bertabrakan. Perbedaan tafsir antartokoh dibiarkan, karena itu memang ceritanya.</p>
        )
      ) : (
        <AiNote what={`${s.scenes.length} adegan yang sudah terbuka untukmu`} />
      )}
      {ai.err ? <span className="tiny ai-err">{ai.err}</span> : null}
      <AiButton busy={ai.busy} onClick={() => ai.run({ scenes: s.scenes, facts: s.facts })} testid="ai-cek">
        {ai.out ? 'cek lagi' : 'cek kesinambungan dengan AI'}
      </AiButton>
    </section>
  );
}

/** Rangkuman kejadian dan dua sinopsis di penutupan. */
export function AiRangkuman({ m }: { m: StoryModel }) {
  const ai = useAi<StoryAiSummary>(m, 'rangkuman');
  const s = storyScenes(m);
  if (!m.st.aiOk || !s.scenes.length) return null;
  return (
    <section className="section ai-rangkum">
      <span className="label">rangkuman & sinopsis · dibantu AI</span>
      {ai.out ? (
        <div className="col" style={{ gap: 12 }}>
          {ai.out.kejadian.length ? (
            <ol className="ai-kejadian">
              {ai.out.kejadian.map((k, i) => (
                <li key={i} className={k.jenis} style={{ '--n': i } as CSSProperties}>
                  <span>{k.peristiwa}</span>
                  <span className="tiny soft">{k.jenis === 'diyakini' ? `diyakini ${k.tokoh}` : 'terjadi'} · adegan {k.adegan}</span>
                </li>
              ))}
            </ol>
          ) : null}
          {ai.out.sampul ? (
            <figure className="ai-sinopsis sampul">
              <figcaption className="tiny soft">untuk sampul, tanpa bocoran</figcaption>
              <p className="rupa-hand">{ai.out.sampul}</p>
            </figure>
          ) : null}
          {ai.out.satuHalaman ? (
            <figure className="ai-sinopsis">
              <figcaption className="tiny soft">satu halaman, untuk editor</figcaption>
              <p className="small">{ai.out.satuHalaman}</p>
            </figure>
          ) : null}
        </div>
      ) : (
        <>
          <p className="small soft">Garis kejadian yang memisahkan apa yang terjadi dari apa yang hanya diyakini tokoh, plus sinopsis sampul dan satu halaman.</p>
          <AiNote what="Semua adegan cerita ini" />
        </>
      )}
      {ai.err ? <span className="tiny ai-err">{ai.err}</span> : null}
      <AiButton busy={ai.busy} onClick={() => ai.run({ scenes: s.scenes, facts: s.facts })} testid="ai-rangkum">
        {ai.out ? 'susun ulang' : 'susun rangkuman'}
      </AiButton>
    </section>
  );
}
