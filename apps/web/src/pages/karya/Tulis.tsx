/**
 * Ruang tulis: selembar kertas lebar untuk esai, cerpen, puisi, catatan,
 * surat, dan fragmen. Simpan otomatis (terenkripsi), mode fokus, pemantik,
 * dan terbitkan ke lingkaran — atau simpan hanya untuk diri sendiri.
 */
import { randomWritingPrompt, WRITING_PROMPTS, type WorkStatus } from '@sehari/core';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useKeyboardInset } from '@/editor/dock';
import { api } from '@/lib/api';
import { useCircles } from '@/lib/data';
import { Prose } from '@/lib/prose';
import { back, navigate, useParams, usePath } from '@/lib/router';
import { useReady } from '@/lib/session';
import { store } from '@/lib/storage';
import { countWords, COVERS, KIND_INFO, KINDS, newWorkId, readingMinutes, saveWork, useWork, wk, type WorkKind, type WorkPayload } from '@/lib/works';
import { Doodle, Growing, Sheet, useToast } from '@/ui/kit';
import { Cover, TONES } from './Cover';

const PLACEHOLDER: Record<WorkKind, string> = {
  esai: 'Mulailah dari sesuatu yang kecil dan nyata. Sebuah benda, sebuah kalimat yang pernah kamu dengar, sebuah pagi…',
  cerpen: 'Seseorang sedang menunggu sesuatu. Siapa dia, dan apa yang terjadi kalau yang ditunggu tidak datang?',
  puisi: 'tulis baris pertama.\nbiarkan baris kedua datang sendiri.',
  catatan: 'Hari ini…',
  surat: 'Untuk kamu,\n\n',
  fragmen: 'sepotong saja.',
};

const COVER_DOODLES = ['pena', 'buku-terbuka', 'bulan', 'bintang', 'amplop', 'kertas-sobek', 'bunga-matahari', 'mawar', 'daun-kering', 'hujan', 'senja', 'kereta', 'kucing-tidur', 'cangkir', 'lilin', 'kunci', 'kompas', 'surat-botol', 'lentera', 'kupu-kupu', 'jendela', 'lampu-tidur', 'gitar', 'teratai'];

type Size = 's' | 'm' | 'l';
const SIZES: Record<Size, number> = { s: 17, m: 19, l: 22 };

const blank = (kind: WorkKind): WorkPayload => ({ v: 1, kind, title: '', body: '', cover: { tone: kind === 'puisi' ? 'malam' : kind === 'cerpen' ? 'merah-bata' : kind === 'esai' ? 'krem' : kind === 'surat' ? 'senja' : 'tinta' } });

export default function Tulis() {
  const { me, identity } = useReady();
  const { circles } = useCircles();
  const toast = useToast();
  const qc = useQueryClient();
  const params = useParams<{ id?: string }>();
  const { search } = usePath();
  const [id] = useState(() => params.id ?? newWorkId());
  const existing = useWork(params.id);
  const active = circles.filter((c) => c.status === 'active' && c.me?.state === 'active');

  const [work, setWork] = useState<WorkPayload | null>(() => (params.id ? null : blank((search.get('jenis') as WorkKind) || 'esai')));
  const [status, setStatus] = useState<WorkStatus>('draft');
  const [circleIds, setCircleIds] = useState<string[]>([]);
  const [saved, setSaved] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [mode, setMode] = useState<'write' | 'read'>('write');
  const [focus, setFocus] = useState(false);
  const [sheet, setSheet] = useState<null | 'publish' | 'prompt' | 'menu' | 'kind'>(null);
  const [size, setSize] = useState<Size>(() => (store.get('writeSize') as Size) || 'm');
  const [prompt, setPrompt] = useState(() => (search.get('jenis') ? randomWritingPrompt((search.get('jenis') as WorkKind) || 'esai') : null));
  const body = useRef<HTMLTextAreaElement>(null);
  const dirty = useRef(false);
  const timer = useRef(0);
  const kb = useKeyboardInset();

  // Muat karya yang sudah ada.
  useEffect(() => {
    if (!params.id || !existing.open || work) return;
    if (existing.open.wire.authorId !== me.user.id) return void navigate(`/karya/${params.id}`, { replace: true });
    if (existing.open.work) {
      setWork(existing.open.work);
      setStatus(existing.open.wire.status);
      setCircleIds(existing.open.wire.circleIds);
      setSaved('saved');
      if (existing.open.work.promptId) setPrompt(WRITING_PROMPTS.find((p) => p.id === existing.open!.work!.promptId) ?? null);
    }
  }, [existing.open]);

  const persist = async (w: WorkPayload, st: WorkStatus, cids: string[]) => {
    setSaved('saving');
    try {
      await saveWork(id, w, st, cids, { meId: me.user.id, publicKey: identity.publicKey, circles });
      dirty.current = false;
      setSaved('saved');
      store.del(`karya.${id}`);
      void qc.invalidateQueries({ queryKey: ['works'] });
      if (!params.id) history.replaceState(history.state, '', `/karya/${id}/tulis`);
      return true;
    } catch (e) {
      setSaved('error');
      toast((e as Error).message);
      return false;
    }
  };

  const update = (f: (w: WorkPayload) => WorkPayload) => {
    setWork((w) => {
      if (!w) return w;
      const next = f(w);
      dirty.current = true;
      store.set(`karya.${id}`, JSON.stringify(next));
      window.clearTimeout(timer.current);
      if (next.title.trim() || next.body.trim()) timer.current = window.setTimeout(() => void persist(next, status, circleIds), 1400);
      return next;
    });
  };

  // Jangan kehilangan tulisan saat tab ditutup.
  useEffect(() => {
    const f = (e: BeforeUnloadEvent) => {
      if (dirty.current) e.preventDefault();
    };
    window.addEventListener('beforeunload', f);
    return () => window.removeEventListener('beforeunload', f);
  }, []);

  // Tinggi textarea mengikuti isi.
  useLayoutEffect(() => {
    const el = body.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [work?.body, size, mode, focus]);

  if (!work) return existing.isError ? <main className="screen"><p>Karya tidak ditemukan.</p></main> : <Growing label="membuka naskah…" />;

  const info = KIND_INFO[work.kind];
  const words = countWords(work.body);

  /** Bungkus pilihan teks, atau tambahkan awalan di awal baris. */
  const format = (kind: 'bold' | 'italic' | 'h' | 'quote' | 'hr') => {
    const el = body.current;
    if (!el) return;
    const { selectionStart: a, selectionEnd: b, value } = el;
    let next = value;
    let caret = b;
    if (kind === 'bold' || kind === 'italic') {
      const m = kind === 'bold' ? '**' : '*';
      const sel = value.slice(a, b) || (kind === 'bold' ? 'tebal' : 'miring');
      next = value.slice(0, a) + m + sel + m + value.slice(b);
      caret = a + m.length + sel.length + m.length;
    } else if (kind === 'hr') {
      const ins = `${a > 0 && value[a - 1] !== '\n' ? '\n' : ''}\n❦\n\n`;
      next = value.slice(0, a) + ins + value.slice(b);
      caret = a + ins.length;
    } else {
      const ls = value.lastIndexOf('\n', a - 1) + 1;
      const pre = kind === 'h' ? '# ' : '> ';
      const has = value.startsWith(pre, ls);
      next = has ? value.slice(0, ls) + value.slice(ls + pre.length) : value.slice(0, ls) + pre + value.slice(ls);
      caret = b + (has ? -pre.length : pre.length);
    }
    update((w) => ({ ...w, body: next }));
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(caret, caret);
    });
  };

  const publish = async (st: WorkStatus) => {
    window.clearTimeout(timer.current);
    if (!work.title.trim() && !work.body.trim()) return toast('Tulis sesuatu dulu, ya.');
    setStatus(st);
    if (await persist(work, st, circleIds)) {
      setSheet(null);
      toast(st === 'published' ? (circleIds.length ? 'Karya terbit di lingkaranmu.' : 'Tersimpan di rak pribadimu.') : 'Disimpan sebagai draf.');
      if (st === 'published') navigate(`/karya/${id}`, { replace: true });
    }
  };

  const remove = async () => {
    if (!confirm('Hapus karya ini untuk selamanya?')) return;
    window.clearTimeout(timer.current);
    dirty.current = false;
    await api.del(`/works/${id}`).catch(() => {});
    store.del(`karya.${id}`);
    void qc.invalidateQueries({ queryKey: ['works'] });
    navigate('/karya', { replace: true });
  };

  return (
    <main className={`write-room ${focus ? 'focus' : ''}`} style={{ '--write-size': `${SIZES[size]}px` } as React.CSSProperties}>
      <header className="write-top">
        <button className="icon-btn" aria-label="kembali" onClick={() => { if (dirty.current) void persist(work, status, circleIds); back('/karya'); }}>
          <Doodle id="ui-kembali" size={22} />
        </button>
        <button className="pill sm" onClick={() => setSheet('kind')}>
          <Doodle id={info.doodle} size={16} color="currentColor" /> {info.name}
        </button>
        <span className="write-status tiny">
          {saved === 'saving' ? 'menyimpan…' : saved === 'saved' ? '✓ tersimpan' : saved === 'error' ? 'belum tersimpan' : ''}
        </span>
        <span className="grow" />
        <button className="icon-btn" aria-label={mode === 'write' ? 'baca' : 'tulis'} onClick={() => setMode(mode === 'write' ? 'read' : 'write')} title={mode === 'write' ? 'pratinjau baca' : 'kembali menulis'}>
          <Doodle id={mode === 'write' ? 'buku-terbuka' : 'pena'} size={22} />
        </button>
        <button className="icon-btn" aria-label="menu" onClick={() => setSheet('menu')}>
          <Doodle id="ui-titik-tiga" size={22} />
        </button>
        <button className="btn sm auto" onClick={() => setSheet('publish')}>
          {status === 'published' ? 'perbarui' : 'terbitkan'}
        </button>
      </header>

      {mode === 'read' ? (
        <article className="read-paper">
          <ReadHead work={work} author={me.user.penName ?? 'kamu'} words={words} />
          <Prose body={work.body} verse={!info.prose} />
        </article>
      ) : (
        <article className="write-paper">
          {prompt && !focus ? (
            <div className="prompt-chip" onClick={() => setSheet('prompt')}>
              <span className="eyebrow">pemantik</span>
              <span className="serif-italic">{prompt.body}</span>
            </div>
          ) : null}
          <textarea
            className="write-title"
            rows={1}
            value={work.title}
            placeholder="Judul"
            maxLength={140}
            onChange={(e) => update((w) => ({ ...w, title: e.target.value.replace(/\n/g, ' ') }))}
            onInput={(e) => {
              const t = e.currentTarget;
              t.style.height = 'auto';
              t.style.height = `${t.scrollHeight}px`;
            }}
          />
          <input className="write-sub" value={work.subtitle ?? ''} placeholder="anak judul (boleh kosong)" maxLength={160} onChange={(e) => update((w) => ({ ...w, subtitle: e.target.value || undefined }))} />
          {work.epigraph !== undefined ? (
            <textarea className="write-epigraph" rows={2} value={work.epigraph} placeholder="epigraf — kutipan pembuka, dan dari siapa" maxLength={400} onChange={(e) => update((w) => ({ ...w, epigraph: e.target.value }))} />
          ) : null}
          <div className="write-orn" aria-hidden>
            ❦
          </div>
          <textarea
            ref={body}
            className={`write-body ${info.prose ? '' : 'verse'}`}
            value={work.body}
            placeholder={PLACEHOLDER[work.kind]}
            spellCheck
            autoFocus={!params.id}
            onChange={(e) => update((w) => ({ ...w, body: e.target.value }))}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
                e.preventDefault();
                format('bold');
              } else if ((e.metaKey || e.ctrlKey) && e.key === 'i') {
                e.preventDefault();
                format('italic');
              } else if ((e.metaKey || e.ctrlKey) && e.key === 's') {
                e.preventDefault();
                void persist(work, status, circleIds);
              }
            }}
          />
          <div className="write-foot tiny soft">
            {words.toLocaleString('id-ID')} kata · {readingMinutes(words)} menit membaca
          </div>
        </article>
      )}

      {mode === 'write' ? (
        <nav className="write-tools" style={{ bottom: `calc(env(safe-area-inset-bottom) + 10px + ${kb}px)` }} onMouseDown={(e) => e.preventDefault()}>
          <button onClick={() => format('bold')} aria-label="tebal">
            <b>B</b>
          </button>
          <button onClick={() => format('italic')} aria-label="miring">
            <i style={{ fontFamily: 'var(--serif)' }}>I</i>
          </button>
          <button onClick={() => format('h')} aria-label="judul bagian">
            <span style={{ fontFamily: 'var(--serif-display)' }}>H</span>
          </button>
          <button onClick={() => format('quote')} aria-label="kutipan">
            <span style={{ fontFamily: 'var(--serif-display)', fontSize: 22, lineHeight: 0.6 }}>“</span>
          </button>
          <button onClick={() => format('hr')} aria-label="pemisah">
            ❦
          </button>
          <span className="sep" />
          <button onClick={() => { if (!prompt) setPrompt(randomWritingPrompt(work.kind)); setSheet('prompt'); }} aria-label="pemantik">
            <Doodle id="ui-ide" size={20} color="currentColor" />
          </button>
          <button className={focus ? 'on' : ''} onClick={() => setFocus(!focus)} aria-label="mode fokus">
            <Doodle id="lampu" size={20} color="currentColor" />
          </button>
        </nav>
      ) : null}

      <Sheet open={sheet === 'kind'} onClose={() => setSheet(null)} title="jenis karya">
        <div className="kind-grid">
          {KINDS.map((k) => (
            <button key={k} className={`kind-card ${k === work.kind ? 'on' : ''}`} onClick={() => { update((w) => ({ ...w, kind: k })); setSheet(null); }}>
              <Doodle id={KIND_INFO[k].doodle} size={32} />
              <span className="kind-name">{KIND_INFO[k].name}</span>
              <span className="tiny soft">{KIND_INFO[k].tagline}</span>
            </button>
          ))}
        </div>
      </Sheet>

      <Sheet open={sheet === 'prompt'} onClose={() => setSheet(null)} title="pemantik tulisan">
        {prompt ? (
          <div className="prompt-card-big">
            <span className="eyebrow">{KIND_INFO[prompt.kind as WorkKind]?.name ?? ''}</span>
            <div className="serif-title">{prompt.title}</div>
            <p className="serif-italic">{prompt.body}</p>
          </div>
        ) : null}
        <div className="row mt">
          <button className="btn soft grow" onClick={() => setPrompt(randomWritingPrompt(work.kind))}>
            tarik lagi
          </button>
          <button className="btn grow" onClick={() => { if (prompt) update((w) => ({ ...w, promptId: prompt.id })); setSheet(null); body.current?.focus(); }}>
            pakai ini
          </button>
        </div>
        {prompt ? (
          <button className="btn ghost mt" onClick={() => { setPrompt(null); update((w) => ({ ...w, promptId: undefined })); setSheet(null); }}>
            tanpa pemantik
          </button>
        ) : null}
      </Sheet>

      <Sheet open={sheet === 'menu'} onClose={() => setSheet(null)} title="naskah">
        <div className="col">
          <span className="label">ukuran huruf</span>
          <div className="row">
            {(['s', 'm', 'l'] as Size[]).map((s) => (
              <button key={s} className={`pill grow ${size === s ? 'active' : ''}`} onClick={() => { setSize(s); store.set('writeSize', s); }}>
                <span style={{ fontFamily: 'var(--serif)', fontSize: SIZES[s] - 3 }}>Aa</span>
              </button>
            ))}
          </div>
          <button className="btn soft mt" onClick={() => { update((w) => ({ ...w, epigraph: w.epigraph === undefined ? '' : undefined })); setSheet(null); }}>
            {work.epigraph === undefined ? 'tambah epigraf' : 'hapus epigraf'}
          </button>
          <button className="btn soft" onClick={() => { setFocus(true); setSheet(null); }}>
            mode fokus
          </button>
          <p className="tiny soft">Pintasan: **tebal**, *miring*, “# ” di awal baris untuk judul bagian, “&gt; ” untuk kutipan, ❦ untuk pemisah. Ctrl/⌘+S menyimpan.</p>
          <button className="btn ghost" style={{ color: 'var(--danger)' }} onClick={() => void remove()}>
            hapus karya
          </button>
        </div>
      </Sheet>

      <Sheet open={sheet === 'publish'} onClose={() => setSheet(null)} title="sampul & pembaca">
        <div className="publish">
          <div className="publish-cover">
            <Cover work={work} author={me.user.penName ?? undefined} size="lg" />
          </div>
          <div className="col" style={{ minWidth: 0 }}>
            <span className="label">warna sampul</span>
            <div className="row wrap" style={{ gap: 8 }}>
              {COVERS.map((t) => (
                <button key={t} className={`tone-dot ${work.cover.tone === t ? 'on' : ''}`} style={{ background: TONES[t].bg }} aria-label={TONES[t].name} title={TONES[t].name} onClick={() => update((w) => ({ ...w, cover: { ...w.cover, tone: t } }))} />
              ))}
            </div>
            <span className="label mt">gambar sampul</span>
            <div className="cover-doodles">
              {COVER_DOODLES.map((d) => (
                <button key={d} className={(work.cover.doodle ?? info.doodle) === d ? 'on' : ''} onClick={() => update((w) => ({ ...w, cover: { ...w.cover, doodle: d } }))} aria-label={d}>
                  <Doodle id={d} size={26} />
                </button>
              ))}
            </div>
          </div>
        </div>
        <span className="label mt">siapa yang boleh membaca</span>
        <div className="col" style={{ gap: 6 }}>
          <button className={`reader-opt ${circleIds.length === 0 ? 'on' : ''}`} onClick={() => setCircleIds([])}>
            <Doodle id="ui-gembok" size={22} />
            <span>
              <b>hanya aku</b>
              <span className="tiny soft">jurnal pribadi — tidak ada yang bisa membacanya selain kamu</span>
            </span>
          </button>
          {active.map((c) => {
            const on = circleIds.includes(c.id);
            return (
              <button key={c.id} className={`reader-opt ${on ? 'on' : ''}`} onClick={() => setCircleIds(on ? circleIds.filter((x) => x !== c.id) : [...circleIds, c.id])}>
                <Doodle id={c.doodle} size={22} />
                <span>
                  <b>{c.name}</b>
                  <span className="tiny soft">{c.active.length} orang</span>
                </span>
              </button>
            );
          })}
        </div>
        <div className="row mt-lg">
          <button className="btn soft grow" onClick={() => void publish('draft')}>
            simpan draf
          </button>
          <button className="btn grow" onClick={() => void publish('published')}>
            {circleIds.length ? 'terbitkan' : 'simpan ke rak'}
          </button>
        </div>
      </Sheet>
    </main>
  );
}

export function ReadHead({ work, author, words, date }: { work: WorkPayload; author: string; words: number; date?: string }) {
  return (
    <header className="read-head">
      <span className="eyebrow">{KIND_INFO[work.kind].name}</span>
      <h1 className="read-title">{work.title || 'Tanpa judul'}</h1>
      {work.subtitle ? <p className="read-sub">{work.subtitle}</p> : null}
      <p className="read-by">
        oleh <b>{author}</b>
        {date ? ` · ${date}` : ''} · {readingMinutes(words)} menit membaca
      </p>
      {work.epigraph ? <blockquote className="epigraph">{work.epigraph}</blockquote> : null}
      <div className="ornament" aria-hidden>
        ❦
      </div>
    </header>
  );
}
