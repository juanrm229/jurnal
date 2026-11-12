/** Rak karya: satu Kanon, banyak karya (kisah, cerpen, novel, jurnal tokoh, surat). */
import { NASKAH_BENTUK, NASKAH_BENTUK_IDS, type NaskahBentuk, type NaskahWorkPayload } from '@sehari/core';
import { type CSSProperties, useState } from 'react';
import { type NaskahModel, newNaskahId, povColor, type Work } from '@/lib/naskah';
import { navigate } from '@/lib/router';
import { Doodle, Sheet, useToast } from '@/ui/kit';

export const LEPAS = 'lepas';

/** Deretan buku di atas susunan: pilih karya yang sedang dikerjakan. */
export function RakKarya({ m, sel, onSel }: { m: NaskahModel; sel: string; onSel: (id: string) => void }) {
  const [baru, setBaru] = useState(false);
  const lepas = m.scenesOf(null);
  return (
    <div className="nk-rak" role="tablist" aria-label="rak karya">
      {lepas.length || !m.works.length ? (
        <button role="tab" aria-selected={sel === LEPAS} className={`nk-buku kisah ${sel === LEPAS ? 'on' : ''}`} onClick={() => onSel(LEPAS)} data-testid="nk-karya-lepas">
          <span className="nk-buku-punggung" aria-hidden />
          <b>kisah lepas</b>
          <span className="tiny">{lepas.length} adegan</span>
        </button>
      ) : null}
      {m.works.map((w, i) => (
        <button key={w.id} role="tab" aria-selected={sel === w.id} className={`nk-buku ${w.bentuk} ${sel === w.id ? 'on' : ''}`} style={{ '--n': i, '--warna': w.p.tokoh ? povColor(m, w.p.tokoh) : undefined } as CSSProperties} onClick={() => onSel(w.id)} data-testid={`nk-karya-${w.bentuk}`}>
          <span className="nk-buku-punggung" aria-hidden />
          <span className="nk-buku-jenis">{NASKAH_BENTUK[w.bentuk].label}</span>
          <b>{w.p.title}</b>
          <span className="tiny">
            {m.scenesOf(w.id).length} {w.bentuk === 'jurnal' ? 'entri' : w.bentuk === 'surat' ? 'surat' : 'adegan'}
          </span>
        </button>
      ))}
      {m.canWrite && (m.ms.visibility !== 'kota' || m.ms.ownerId === m.meId) ? (
        <button className="nk-buku tambah" onClick={() => setBaru(true)} data-testid="nk-karya-baru">
          <Doodle id="pena" size={22} color="currentColor" />
          <b>karya baru</b>
        </button>
      ) : null}
      <Sheet open={baru} onClose={() => setBaru(false)} title="karya baru">
        {baru ? (
          <KaryaBaru
            m={m}
            onDone={(id) => {
              setBaru(false);
              onSel(id);
            }}
          />
        ) : null}
      </Sheet>
    </div>
  );
}

function KaryaBaru({ m, onDone }: { m: NaskahModel; onDone: (id: string) => void }) {
  const toast = useToast();
  const [bentuk, setBentuk] = useState<NaskahBentuk>('novel');
  const [title, setTitle] = useState('');
  const [sinopsis, setSinopsis] = useState('');
  const [tokoh, setTokoh] = useState(m.tokoh[0]?.id ?? '');
  const [busy, setBusy] = useState(false);
  const perluTokoh = bentuk === 'jurnal' || bentuk === 'surat';
  const nama = m.nameOf(tokoh);
  const saran = bentuk === 'jurnal' ? `Jurnal ${nama}` : bentuk === 'surat' ? `Surat-surat ${nama}` : '';
  return (
    <div className="col" style={{ gap: 12 }}>
      <div className="nk-bentuk">
        {NASKAH_BENTUK_IDS.map((b) => (
          <button key={b} className={bentuk === b ? 'on' : ''} onClick={() => setBentuk(b)} data-testid={`nk-bentuk-${b}`}>
            <Doodle id={NASKAH_BENTUK[b].doodle} size={22} color="currentColor" />
            <b>{NASKAH_BENTUK[b].label}</b>
            <span className="tiny">{NASKAH_BENTUK[b].hint}</span>
          </button>
        ))}
      </div>
      {perluTokoh ? (
        m.tokoh.length ? (
          <div className="row wrap" style={{ gap: 6 }}>
            <span className="tiny soft">{bentuk === 'jurnal' ? 'buku harian milik' : 'surat-surat dari'}</span>
            {m.tokoh.map((t) => (
              <button key={t.id} className={`pill sm ${tokoh === t.id ? 'active' : ''}`} onClick={() => setTokoh(t.id)}>
                {t.p.name}
              </button>
            ))}
          </div>
        ) : (
          <p className="tiny soft">Tambahkan tokoh di Kanon dulu.</p>
        )
      ) : null}
      <input className="field" value={title} maxLength={90} onChange={(e) => setTitle(e.target.value)} placeholder={saran || 'judul karya'} data-testid="nk-karya-judul" />
      <textarea className="field" rows={2} value={sinopsis} maxLength={600} onChange={(e) => setSinopsis(e.target.value)} placeholder="sinopsis singkat (opsional)" />
      <button
        className="btn"
        disabled={busy || (perluTokoh && !tokoh) || !(title.trim() || saran)}
        onClick={async () => {
          setBusy(true);
          try {
            const id = newNaskahId();
            const p: NaskahWorkPayload = { v: 1, title: (title.trim() || saran).slice(0, 90), sinopsis: sinopsis.trim() || undefined, tokoh: perluTokoh ? tokoh : undefined };
            await m.post('/works', { id, bentuk, envelope: m.seal(p), order: (m.works.at(-1)?.order ?? 0) + 1 });
            onDone(id);
          } catch (e) {
            toast((e as Error).message);
            setBusy(false);
          }
        }}
        data-testid="nk-karya-buat">
        {busy ? 'menyiapkan…' : `mulai ${NASKAH_BENTUK[bentuk].label}`}
      </button>
    </div>
  );
}

/** Judul bab (novel/cerpen) yang bisa disunting langsung. */
export function JudulBab({ m, w, ch, edit }: { m: NaskahModel; w: Work | null; ch: number; edit: boolean }) {
  const toast = useToast();
  const cur = w?.p.bab?.[String(ch)] ?? '';
  const [v, setV] = useState(cur);
  if (!w || (w.bentuk !== 'novel' && w.bentuk !== 'cerpen')) return <h3 className="nk-bab-h">bab {ch}</h3>;
  if (!edit) return <h3 className="nk-bab-h">{cur ? <><span className="nk-bab-n">bab {ch}</span> {cur}</> : `bab ${ch}`}</h3>;
  return (
    <input
      className="field nk-bab-in"
      value={v}
      maxLength={80}
      placeholder={`judul bab ${ch}`}
      onChange={(e) => setV(e.target.value)}
      onBlur={async () => {
        if (v.trim() === cur) return;
        try {
          await m.put(`/works/${w.id}`, { envelope: m.seal({ ...w.p, bab: { ...(w.p.bab ?? {}), [String(ch)]: v.trim() } }) });
        } catch (e) {
          toast((e as Error).message);
        }
      }}
    />
  );
}

export const bacaUrl = (m: NaskahModel, sel: string) => `/naskah/${m.ms.id}/baca/${sel}`;
export const keBaca = (m: NaskahModel, sel: string) => navigate(bacaUrl(m, sel));
