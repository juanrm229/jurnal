/**
 * Kamus Lingkaran & Motif: bahasa kalian sendiri. Kandidat dihitung di
 * perangkat dari tulisan yang sudah dibuka, dan hanya *ditawarkan* — tidak
 * pernah ditambahkan otomatis. Istilah, arti, dan motif disimpan terenkripsi.
 */
import { addDays, dictionaryCandidates, type DictionaryWire, motifCandidates, type MotifWire } from '@sehari/core';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { api } from '@/lib/api';
import { openCircleText, sealCircleText, useCircle, useCircleRange, useMe, useOpenDrops, useToday } from '@/lib/data';
import { useParams } from '@/lib/router';
import { Doodle, ErrorNote, Growing, Header, Screen, Section } from '@/ui/kit';
import { authoredTexts, Btn, ErrLine, errorText, LoreHero, nameIn } from './board';

export default function Kamus() {
  const { id } = useParams<{ id: string }>();
  const me = useMe();
  const today = useToday();
  const qc = useQueryClient();
  const circle = useCircle(id);
  const year = Number(today.slice(0, 4));
  const yearStart = `${year}-01-01`;
  const recent = addDays(today, -119);
  // Satu rentang (≤400 hari) untuk kamus (120 hari terakhir) dan motif (tahun ini), tidak sebelum lingkaran lahir.
  const earliest = yearStart < recent ? yearStart : recent;
  const from = circle && circle.createdDay > earliest ? circle.createdDay : earliest;
  const range = useCircleRange(id, from, today, !!circle);
  const opened = useOpenDrops(range.data?.drops);
  const dict = useQuery({ queryKey: ['dictionary', id], queryFn: () => api.get<DictionaryWire[]>(`/circles/${id}/dictionary`), enabled: !!circle });
  const motifs = useQuery({ queryKey: ['motifs', id], queryFn: () => api.get<MotifWire[]>(`/circles/${id}/motifs`), enabled: !!circle });

  const [term, setTerm] = useState('');
  const [meaning, setMeaning] = useState('');
  const [motif, setMotif] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const entries = useMemo(
    () =>
      circle
        ? (dict.data ?? []).map((d) => ({ ...d, term: openCircleText(circle, d.termEnc), meaning: openCircleText(circle, d.meaningEnc, '') })).sort((a, b) => a.term.localeCompare(b.term))
        : [],
    [dict.data, circle],
  );
  const yearMotifs = useMemo(() => (circle ? (motifs.data ?? []).filter((m) => m.year === year).map((m) => ({ ...m, term: openCircleText(circle, m.termEnc) })) : []), [motifs.data, circle, year]);
  const texts = useMemo(() => authoredTexts(opened), [opened]);
  const dictSugg = useMemo(() => dictionaryCandidates(texts.filter((t) => t.day >= recent), entries.map((e) => e.term)), [texts, entries, recent]);
  const motifSugg = useMemo(() => motifCandidates(texts.filter((t) => t.day >= yearStart), yearMotifs.map((m) => m.term), 4), [texts, yearMotifs, yearStart]);

  if (!circle)
    return (
      <Screen>
        <Header title="kamus & motif" backTo={`/l/${id}`} />
        <Growing />
      </Screen>
    );

  const run = async (key: string, fn: () => Promise<unknown>, after: () => void) => {
    setBusy(key);
    setErr(null);
    try {
      await fn();
      after();
    } catch (e) {
      setErr(errorText(e));
    } finally {
      setBusy(null);
    }
  };

  const addEntry = () =>
    run(
      'dict',
      () => api.post(`/circles/${id}/dictionary`, { termEnc: sealCircleText(circle, term.trim()), meaningEnc: sealCircleText(circle, meaning.trim()) }),
      () => {
        setTerm('');
        setMeaning('');
        void qc.invalidateQueries({ queryKey: ['dictionary', id] });
      },
    );
  const delEntry = (did: string) => run(`del-${did}`, () => api.del(`/circles/${id}/dictionary/${did}`), () => void qc.invalidateQueries({ queryKey: ['dictionary', id] }));
  const addMotif = (t: string) =>
    run(
      'motif',
      () => api.post(`/circles/${id}/motifs`, { year, termEnc: sealCircleText(circle, t.trim().toLowerCase()) }),
      () => {
        setMotif('');
        void qc.invalidateQueries({ queryKey: ['motifs', id] });
      },
    );
  const delMotif = (mid: string) => run(`del-${mid}`, () => api.del(`/circles/${id}/motifs/${mid}`), () => void qc.invalidateQueries({ queryKey: ['motifs', id] }));

  return (
    <Screen>
      <Header title="kamus & motif" sub={circle.name} backTo={`/l/${id}`} />
      <LoreHero doodle="gelembung-kata" title="bahasa kalian sendiri" sub="Kata-kata yang hanya kalian yang paham, dan hal-hal yang terus muncul seperti motif dalam novel." />

      <Section title="kamus lingkaran">
        {dict.error ? <ErrorNote error={dict.error} onRetry={() => void dict.refetch()} /> : null}
        {dict.isLoading ? (
          <Growing />
        ) : entries.length ? (
          <div className="card lore-dict">
            {entries.map((e) => (
              <div key={e.id} className="lore-dict-entry">
                <div className="grow">
                  <div className="row" style={{ gap: 8, alignItems: 'baseline' }}>
                    <span className="lore-dict-term">{e.term}</span>
                    <span className="tiny ink-soft" style={{ fontStyle: 'italic' }}>n.</span>
                  </div>
                  {e.meaning ? <div className="small">{e.meaning}</div> : null}
                  <div className="tiny soft">dicatat {nameIn(circle, e.addedBy, me.user.id)}</div>
                </div>
                {e.addedBy === me.user.id ? (
                  <button className="icon-btn" aria-label={`hapus ${e.term}`} disabled={busy === `del-${e.id}`} onClick={() => void delEntry(e.id)}>
                    <Doodle id="ui-hapus" size={18} />
                  </button>
                ) : null}
              </div>
            ))}
          </div>
        ) : (
          <div className="card flat col center" style={{ alignItems: 'center' }}>
            <Doodle id="ui-kata" size={44} draw />
            <p className="small soft center" style={{ margin: 0 }}>Kamusnya masih kosong. Istilah pertama biasanya lahir dari lelucon yang terlalu sering diulang.</p>
          </div>
        )}

        <div className="card col" style={{ marginTop: 12 }}>
          <label className="col gap-sm">
            <span className="label">istilah</span>
            <input className="field" value={term} onChange={(e) => setTerm(e.target.value)} placeholder="misalnya: gaskeun" maxLength={60} />
          </label>
          <label className="col gap-sm">
            <span className="label">artinya buat kita</span>
            <textarea className="field" style={{ minHeight: 70 }} value={meaning} onChange={(e) => setMeaning(e.target.value)} placeholder="kata sakti sebelum mi instan tengah malam" maxLength={300} />
          </label>
          <Btn disabled={!term.trim()} loading={busy === 'dict'} onClick={() => void addEntry()} icon="pena">
            catat di kamus
          </Btn>
        </div>

        {dictSugg.length ? (
          <div className="col" style={{ marginTop: 16, gap: 6 }}>
            <span className="label">kata yang sering kalian pakai</span>
            <div className="row wrap" style={{ gap: 6 }}>
              {dictSugg.map((w) => (
                <button key={w.word} className={`pill ${term === w.word ? 'active' : ''}`} onClick={() => setTerm(w.word)}>
                  {`${w.word} · ${w.days} hari`}
                </button>
              ))}
            </div>
            <span className="tiny soft">Dihitung di perangkatmu dari 120 hari terakhir. Hanya tawaran; tidak ada yang masuk kamus tanpa kalian.</span>
          </div>
        ) : null}
      </Section>

      <Section title={`motif ${year}`}>
        {yearMotifs.length ? (
          <div className="row wrap" style={{ gap: 8 }}>
            {yearMotifs.map((m, i) => (
              <span key={m.id} className="lore-motif" style={{ transform: `rotate(${(i % 3) - 1}deg)` }}>
                <span className="hand" style={{ fontSize: 24 }}>{m.term}</span>
                {m.addedBy === me.user.id ? (
                  <button className="icon-btn" style={{ padding: 2 }} aria-label={`hapus motif ${m.term}`} onClick={() => void delMotif(m.id)}>
                    <Doodle id="ui-tutup" size={14} />
                  </button>
                ) : null}
              </span>
            ))}
          </div>
        ) : (
          <p className="small soft" style={{ margin: 0 }}>Belum ada motif tahun ini. Hujan, kopi, satu lagu, kata “pulang” — apa yang terus kembali di cerita kalian?</p>
        )}

        {motifSugg.map((w, i) => (
          <div key={w.word} className="sticky row" style={{ background: 'var(--sticky-yellow)', transform: `rotate(${i % 2 ? -0.5 : 0.5}deg)`, marginTop: 12 }}>
            <span className="small grow">
              Kata “{w.word}” sering muncul, di {w.days} hari berbeda. Jadikan motif?
            </span>
            <button className="btn soft sm auto" disabled={busy === 'motif'} onClick={() => void addMotif(w.word)}>
              jadikan
            </button>
          </div>
        ))}

        <div className="row" style={{ marginTop: 16, alignItems: 'stretch' }}>
          <input className="field grow" value={motif} onChange={(e) => setMotif(e.target.value)} placeholder="tandai motif sendiri…" maxLength={40} onKeyDown={(e) => e.key === 'Enter' && motif.trim() && void addMotif(motif)} />
          <Btn className="auto" disabled={!motif.trim()} loading={busy === 'motif'} onClick={() => void addMotif(motif)}>
            tandai
          </Btn>
        </div>
        <p className="tiny soft" style={{ marginTop: 6 }}>motif utama tahun ini muncul di Tahun Kita</p>
      </Section>

      <ErrLine style={{ marginTop: 16 }}>{err}</ErrLine>
      {range.isLoading ? <p className="tiny soft center mt">membaca halaman-halaman lama untuk mencari tawaran…</p> : null}
    </Screen>
  );
}
