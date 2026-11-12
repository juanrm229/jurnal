/**
 * Editor adegan dengan Kacamata Tokoh. Saat menulis dari sudut pandang seorang
 * tokoh, studio menandai hal yang belum ia ketahui pada waktu itu dan kata yang
 * belum ada di zamannya. Lapisan sorotan digambar di belakang textarea.
 */
import {
  NASKAH_SORT_RE,
  type NaskahCanonPayload,
  type NaskahScenePayload,
  type NaskahVersionWire,
  type NaskahWarning,
  naskahChrono,
  naskahKacamata,
  naskahMentions,
  naskahWarnings,
  naskahYear,
  kotaDariKota,
  kotaRegion,
} from '@sehari/core';
import { type CSSProperties, type ReactNode, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { api } from '@/lib/api';
import { tanggal, useAlmanak, useRumahNaskah } from '@/lib/kota';
import { firstLine, type NaskahModel, povColor, type Scene, useNaskah, useNaskahModel } from '@/lib/naskah';
import { navigate, useParams } from '@/lib/router';
import { Avatar, Doodle, Growing, Header, Sheet, useToast } from '@/ui/kit';
import { KanonForm, sceneLabel } from './Kanon';

export default function Adegan() {
  const { id, sid } = useParams<{ id: string; sid: string }>();
  const q = useNaskah(id);
  const m = useNaskahModel(q.data);
  const s = m?.scenes.find((x) => x.id === sid);
  if (!m) return q.isError ? <Growing label="naskah ini tidak ditemukan" /> : <Growing label="membuka naskah…" />;
  if (!s?.p) return <Growing label="adegan ini belum bisa dibaca" />;
  return <Editor key={s.id} m={m} s={s} />;
}

type Span = { at: number; end: number; cls: string };

function paint(text: string, spans: Span[]): ReactNode[] {
  const list = [...spans].sort((a, b) => a.at - b.at || b.end - a.end);
  const out: ReactNode[] = [];
  let i = 0;
  list.forEach((x, k) => {
    if (x.at < i) return;
    out.push(text.slice(i, x.at));
    out.push(
      <mark key={k} className={x.cls}>
        {text.slice(x.at, x.end)}
      </mark>,
    );
    i = x.end;
  });
  out.push(`${text.slice(i)}\n`);
  return out;
}

function Editor({ m, s }: { m: NaskahModel; s: Scene }) {
  const toast = useToast();
  const mine = s.authorId === m.meId;
  const p0 = s.p!;
  const [text, setText] = useState(p0.text);
  const [title, setTitle] = useState(p0.title ?? '');
  const [pov, setPov] = useState(p0.pov);
  const [label, setLabel] = useState(p0.when.label);
  const [sort, setSort] = useState(p0.when.sort);
  const [peristiwa, setPeristiwa] = useState(p0.peristiwa ?? '');
  const [saksi, setSaksi] = useState<'mengalami' | 'mendengar'>(p0.saksi ?? 'mengalami');
  const kota = m.ms.visibility === 'kota';
  const rumah = useRumahNaskah(m.ms.id, kota);
  const almanak = useAlmanak(kota);
  const [saved, setSaved] = useState<'ok' | 'saving' | 'dirty'>('ok');
  const [sel, setSel] = useState('');
  const [lens, setLens] = useState(true);
  const [peek, setPeek] = useState(false);
  const [kanon, setKanon] = useState<NaskahCanonPayload | null>(null);
  const [versions, setVersions] = useState(false);
  const [dismissed, setDismissed] = useState<string[]>([]);
  const ta = useRef<HTMLTextAreaElement>(null);
  const sortOk = !sort.trim() || NASKAH_SORT_RE.test(sort.trim());

  // Kacamata dihitung dari payload yang sedang disunting, bukan yang terakhir tersimpan.
  const chrono = useMemo(() => {
    const scenes = m.scenes.map((x) => (x.id === s.id ? { ...x, p: { ...p0, pov, when: { label, sort: sortOk ? sort.trim() : '' } } } : x));
    return naskahChrono(scenes);
  }, [m, s.id, pov, label, sort, sortOk]);
  const at = chrono[s.id]!;
  const view = useMemo(() => naskahKacamata(pov, at, m.canon, chrono), [pov, at, m.canon, chrono]);
  const warnings = useMemo(() => naskahWarnings(text, pov, at, m.canon, chrono, naskahYear(sortOk ? sort : '')), [text, pov, at, m.canon, chrono, sort, sortOk]);
  const shown = warnings.filter((w) => !dismissed.includes(`${w.kind}:${w.term.toLowerCase()}`));
  const tahun = naskahYear(sortOk ? sort : '') ?? rumah.data?.from ?? null;
  const kanonKota = (almanak.data ?? []).filter((e) => e.state === 'kanon');
  const dariKota = rumah.data && tahun ? kotaDariKota(kanonKota, rumah.data.regionId, tahun) : null;
  const spans: Span[] = [
    ...shown.map((w) => ({ at: w.at, end: w.end, cls: w.kind === 'belum' ? 'w-belum' : 'w-zaman' })),
    ...naskahMentions(text, view.tahu).map((x) => ({ ...x, cls: 'm-tahu' })),
    ...naskahMentions(text, view.mengira).map((x) => ({ ...x, cls: 'm-kira' })),
  ];

  // Simpan otomatis, terenkripsi, sedikit setelah berhenti mengetik.
  const payload = (): NaskahScenePayload => ({ v: 1, title: title.trim() || undefined, pov, when: { label: label.trim(), sort: sortOk ? sort.trim() : '' }, text, peristiwa: peristiwa || undefined, saksi: peristiwa ? saksi : undefined });
  const first = useRef(true);
  useEffect(() => {
    if (!mine) return;
    if (first.current) {
      first.current = false;
      return;
    }
    setSaved('dirty');
    const t = setTimeout(async () => {
      setSaved('saving');
      try {
        await m.put(`/scenes/${s.id}`, { envelope: m.seal(payload()) });
        setSaved('ok');
      } catch (e) {
        toast((e as Error).message);
        setSaved('dirty');
      }
    }, 1200);
    return () => clearTimeout(t);
  }, [text, title, pov, label, sort, peristiwa, saksi]);

  useLayoutEffect(() => {
    const el = ta.current;
    if (!el) return;
    el.style.height = '0px';
    el.style.height = `${Math.max(260, el.scrollHeight)}px`;
  }, [text]);

  const readSel = () => {
    const el = ta.current;
    if (!el) return;
    setSel(el.selectionEnd > el.selectionStart ? text.slice(el.selectionStart, el.selectionEnd).trim() : '');
  };
  const discover = async (w: NaskahWarning) => {
    if (!w.entry) return;
    const e = w.entry.p;
    const known = [...e.known.filter((k) => k.who !== pov), { who: pov, how: 'tahu' as const, since: s.id }];
    try {
      await m.put(`/canon/${w.entry.id}`, { envelope: m.seal({ ...e, known }) });
      toast(`${m.nameOf(pov)} kini tahu soal ${e.kind === 'fakta' ? 'itu' : e.name}, mulai adegan ini.`);
    } catch (err) {
      toast((err as Error).message);
    }
  };
  const order = m.scenes.filter((x) => x.p);
  const idx = order.findIndex((x) => x.id === s.id);
  const prev = order[idx - 1];
  const next = order[idx + 1];
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;

  return (
    <main className="screen naskah-adegan">
      <Header
        title={m.nameOf(pov)}
        sub={`bab ${s.chapter} · ${mine ? (s.status === 'draf' ? 'draf milikmu' : `terbit · v${s.version}`) : `oleh ${m.who(s.authorId)}`}`}
        backTo={`/naskah/${m.ms.id}`}
        right={
          <button className={`nk-lensa-btn ${lens ? 'on' : ''}`} onClick={() => setLens(!lens)} aria-pressed={lens} aria-label="kacamata tokoh" data-testid="nk-lensa">
            <Doodle id="kacamata" size={18} color="currentColor" />
          </button>
        }
      />

      {mine ? (
        <section className="nk-meta">
          <div className="row wrap" style={{ gap: 6 }} role="group" aria-label="sudut pandang">
            {m.tokoh.map((t) => (
              <button key={t.id} className={`nk-pov ${pov === t.id ? 'on' : ''}`} style={{ '--pov': povColor(m, t.id) } as CSSProperties} onClick={() => setPov(t.id)} data-testid={`nk-pov-${t.p.name}`}>
                {t.p.name}
              </button>
            ))}
          </div>
          <div className="nk-kapan">
            <input className="field" value={label} maxLength={80} onChange={(e) => setLabel(e.target.value)} placeholder="kapan? mis. subuh, hari kedua banjir" data-testid="nk-kapan" />
            <input className={`field ${sortOk ? '' : 'salah'}`} value={sort} maxLength={16} onChange={(e) => setSort(e.target.value)} placeholder="1979-02-15 06:10" inputMode="numeric" aria-label="tanggal cerita untuk garis waktu" data-testid="nk-tanggal" />
          </div>
          {!sortOk ? <span className="tiny nk-salah">Tulis tanggal sebagai 1979, 1979-02, 1979-02-15, atau 1979-02-15 06:10.</span> : null}
          <input className="field nk-judul-adegan" value={title} maxLength={80} onChange={(e) => setTitle(e.target.value)} placeholder="judul adegan (opsional)" />
          {kota && kanonKota.length ? (
            <div className="nk-saksi">
              <select className="field" value={peristiwa} onChange={(e) => setPeristiwa(e.target.value)} aria-label="kesaksian untuk peristiwa kota" data-testid="nk-peristiwa">
                <option value="">bukan kesaksian peristiwa kota</option>
                {[...kanonKota]
                  .sort((a, b) => Math.abs(a.year - (tahun ?? a.year)) - Math.abs(b.year - (tahun ?? b.year)))
                  .map((e) => (
                    <option key={e.id} value={e.id}>
                      {tanggal(e)} · {e.title}
                    </option>
                  ))}
              </select>
              {peristiwa ? (
                <div className="row" style={{ gap: 6 }}>
                  {(['mengalami', 'mendengar'] as const).map((k) => (
                    <button key={k} className={`pill sm ${saksi === k ? 'active' : ''}`} onClick={() => setSaksi(k)}>
                      {k}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
        </section>
      ) : (
        <p className="nk-baca-meta tiny soft">
          <Avatar doodle={m.face(s.authorId)} size={18} /> {m.who(s.authorId)} · {label || 'tanpa waktu'}
          {title ? ` · ${title}` : ''}
        </p>
      )}

      <article className="nk-kertas">
        <div className="seditor-paper nk-paper">
          <div className="seditor-layer" aria-hidden>
            {paint(text, lens ? spans : [])}
          </div>
          <textarea
            ref={ta}
            className="seditor-input"
            value={text}
            readOnly={!mine}
            placeholder={`Tulis dari kepala ${m.nameOf(pov)}…`}
            onChange={(e) => setText(e.target.value)}
            onSelect={readSel}
            onKeyUp={readSel}
            onMouseUp={readSel}
            onTouchEnd={() => setTimeout(readSel, 30)}
            spellCheck
            data-testid="nk-teks"
          />
        </div>
        <div className={`seditor-bar ${sel ? 'on' : ''}`}>
          {sel && mine ? (
            <>
              <span className="seditor-sel">“{sel.length > 40 ? `${sel.slice(0, 40)}…` : sel}”</span>
              <button
                type="button"
                className="sb serah"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  setKanon({ v: 1, kind: sel.split(/\s+/).length > 4 ? 'fakta' : 'benda', name: sel, aliases: [], known: [{ who: pov, how: 'tahu', since: s.id }], since: s.id });
                  setSel('');
                }}
                data-testid="nk-jadi-kanon">
                jadikan kanon
              </button>
            </>
          ) : (
            <>
              <span className="seditor-n ok">{words} kata</span>
              <span className="seditor-hint">{mine ? (saved === 'ok' ? (m.pub ? 'tersimpan' : 'tersimpan, terenkripsi') : saved === 'saving' ? 'menyimpan…' : 'belum tersimpan') : 'hanya baca · beri saran lewat catatan'}</span>
            </>
          )}
        </div>
      </article>

      {lens && shown.length ? (
        <section className="nk-coretan" aria-label="catatan pinggir">
          {shown.map((w, i) => (
            <div key={`${w.kind}-${w.at}-${i}`} className={`nk-coret ${w.kind}`}>
              <svg width="20" height="20" viewBox="0 0 22 22" aria-hidden="true">
                <path d="M4 2 C 4 12, 8 16, 18 18 M14 14 L18 18 L13 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
              <div className="grow">
                {w.kind === 'belum' ? (
                  <p>
                    {m.nameOf(pov)} belum tahu soal {w.entry!.p.kind === 'fakta' ? `“${firstLine(w.entry!.p.name, 60)}”` : w.term}.
                    {w.first ? ` ${m.nameOf(w.first.who)} tahu${w.first.since ? ` sejak ${sceneLabel(m, m.scenes.find((x) => x.id === w.first!.since))}` : ''}.` : ''}
                  </p>
                ) : (
                  <p>
                    {naskahYear(sort)}: {w.note}.
                  </p>
                )}
                <div className="row wrap" style={{ gap: 6 }}>
                  {w.kind === 'belum' && mine ? (
                    <button className="pill sm" onClick={() => void discover(w)} data-testid="nk-penemuan">
                      ia mengetahuinya di adegan ini
                    </button>
                  ) : null}
                  <button className="pill sm ghost" onClick={() => setDismissed([...dismissed, `${w.kind}:${w.term.toLowerCase()}`])}>
                    biarkan
                  </button>
                </div>
              </div>
            </div>
          ))}
        </section>
      ) : null}

      {lens ? (
        <section className="nk-kacamata" data-testid="nk-kacamata">
          <div className="row" style={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
            <b>Kacamata {m.nameOf(pov)}</b>
            <span className="tiny">{label || 'waktu belum ditentukan'}</span>
          </div>
          <dl>
            <dt>tahu</dt>
            <dd>{view.tahu.length ? view.tahu.map((e) => e.p.name).join(' · ') : <i>belum ada yang dicatat</i>}</dd>
            <dt>mengira</dt>
            <dd className="kira">{view.mengira.length ? view.mengira.map((e) => e.p.name).join(' · ') : <i>—</i>}</dd>
            <dt>belum tahu</dt>
            <dd>
              {view.belum.length ? (
                peek ? (
                  view.belum.map((e) => e.p.name).join(' · ')
                ) : (
                  <button className="nk-sensor" onClick={() => setPeek(true)} aria-label={`${view.belum.length} hal tersensor, ketuk untuk mengintip`}>
                    {view.belum.slice(0, 4).map((e) => (
                      <span key={e.id} style={{ width: `${Math.min(90, 24 + e.p.name.length * 4)}px` }} />
                    ))}
                    <em>intip</em>
                  </button>
                )
              ) : (
                <i>tidak ada</i>
              )}
            </dd>
            {dariKota ? (
              <>
                <dt>dari kota</dt>
                <dd>
                  {dariKota.mengalami.length || dariKota.mendengar.length ? (
                    <>
                      {dariKota.mengalami.slice(0, 3).map((e) => (
                        <button key={e.id} className="nk-kota-peristiwa" onClick={() => navigate(`/kota/peristiwa/${e.id}`)}>
                          {e.title} <i>({tanggal(e)}, mengalami)</i>
                        </button>
                      ))}
                      {dariKota.mendengar.slice(0, 2).map((e) => (
                        <button key={e.id} className="nk-kota-peristiwa dengar" onClick={() => navigate(`/kota/peristiwa/${e.id}`)}>
                          {e.title} <i>({tanggal(e)}, mendengar dari {kotaRegion(e.regions[0] ?? '')?.name ?? 'kota'})</i>
                        </button>
                      ))}
                    </>
                  ) : (
                    <i>belum ada peristiwa sebelum {tahun}</i>
                  )}
                </dd>
              </>
            ) : null}
          </dl>
          <span className="tiny nk-kacamata-catat">Dihitung dari Kanon. Tandai kata di naskah lalu “jadikan kanon” untuk menambah yang diketahui tokoh.</span>
        </section>
      ) : null}

      <div className="nk-aksi">
        {mine ? (
          s.status === 'draf' ? (
            <button className="btn" disabled={saved !== 'ok' || !text.trim()} onClick={() => void m.put(`/scenes/${s.id}`, { status: 'terbit' }).then(() => toast('Adegan terbit ke naskah bersama.'))} data-testid="nk-terbit">
              terbitkan ke naskah
            </button>
          ) : (
            <button className="btn soft" onClick={() => setVersions(true)} data-testid="nk-versi">
              riwayat versi · v{s.version}
            </button>
          )
        ) : (
          <button className="btn soft" onClick={() => setVersions(true)}>
            riwayat versi · v{s.version}
          </button>
        )}
        <div className="row" style={{ gap: 8 }}>
          <button className="btn ghost grow" disabled={!prev} onClick={() => prev && navigate(`/naskah/${m.ms.id}/a/${prev.id}`, { replace: true })}>
            ← sebelumnya
          </button>
          <button className="btn ghost grow" disabled={!next} onClick={() => next && navigate(`/naskah/${m.ms.id}/a/${next.id}`, { replace: true })}>
            berikutnya →
          </button>
        </div>
        {mine ? (
          <button
            className="btn ghost nk-hapus"
            onClick={async () => {
              if (!confirm('Hapus adegan ini? Riwayat versinya ikut terhapus.')) return;
              await m.del(`/scenes/${s.id}`);
              navigate(`/naskah/${m.ms.id}`, { replace: true });
            }}>
            hapus adegan
          </button>
        ) : null}
      </div>

      <Sheet open={!!kanon} onClose={() => setKanon(null)} title="jadikan kanon">
        {kanon ? <KanonForm key={kanon.name} m={m} init={kanon} onDone={() => setKanon(null)} /> : null}
      </Sheet>
      <Sheet open={versions} onClose={() => setVersions(false)} title="riwayat versi">
        {versions ? <Versi m={m} s={s} onRestore={mine ? (t) => setText(t) : undefined} /> : null}
      </Sheet>
    </main>
  );
}

function Versi({ m, s, onRestore }: { m: NaskahModel; s: Scene; onRestore?: (t: string) => void }) {
  const [list, setList] = useState<NaskahVersionWire[] | null>(null);
  useEffect(() => {
    void api.get<NaskahVersionWire[]>(`/naskah/${m.ms.id}/scenes/${s.id}/versions`).then(setList);
  }, [s.id]);
  if (!list) return <Growing label="membuka riwayat…" />;
  if (!list.length) return <p className="small soft">Versi tersimpan saat adegan diterbitkan.</p>;
  return (
    <div className="col" style={{ gap: 8 }}>
      {list.map((v) => {
        const p = m.unwrap<NaskahScenePayload>(v.envelope);
        return (
          <div key={v.id} className="card nk-versi">
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <b>v{v.version}</b>
              <span className="tiny soft">{new Date(v.createdAt).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
            </div>
            <p className="small">{firstLine(p?.text, 160)}</p>
            {onRestore && p ? (
              <button className="pill sm" onClick={() => onRestore(p.text)}>
                pulihkan teks ini
              </button>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
