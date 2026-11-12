/** Langkah dibuka dan ditinjau: lipatan, tafsir, handshake fakta, sanggahan, tirai, serah-terima. */
import { STORY_DECK, type StoryFactPayload, type StoryPartWire, storySentences } from '@sehari/core';
import { type CSSProperties, useState } from 'react';
import { newDropId } from '@/lib/data';
import { sound } from '@/lib/sound';
import { Avatar, Doodle, Sheet } from '@/ui/kit';
import type { Fact, StoryModel } from './kit';

const REASON = { fakta: 'fakta', pengetahuan: 'pengetahuan tokoh', sebab: 'sebab-akibat' } as const;
const RESOLVE = {
  'dua-perspektif': ['dua perspektif', 'Peristiwanya disepakati; motif dan tafsir tinggal di adegan masing-masing.'],
  'adegan-antara': ['adegan di antaranya', 'Ada kejadian penghubung yang belum ditulis. Muncul sebagai opsi di kartumu berikutnya.'],
  'pilih-fakta': ['pilih fakta atau cabang', 'Kelompok memilih satu versi lewat handshake, atau yang lain jadi jalan lain.'],
  misteri: ['misteri disengaja', 'Dibiarkan terbuka; prompt yang bergantung padanya menunggu.'],
} as const;

/** Lipatan: satu kalimat serah-terima per penulis; adegan terlipat di antaranya. */
export function Lipatan({ m, round, parts, openAll }: { m: StoryModel; round: number; parts: StoryPartWire[]; openAll?: boolean }) {
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const hidden = m.st.mode === 'kejutan' && m.st.phase !== 'done';
  const all = openAll ?? parts.every((p) => open[p.id]);
  return (
    <div className="lipatan" data-testid="lipatan">
      {parts.map((p, i) => {
        const h = m.handoffOf(p);
        const scene = m.sceneOf(p);
        const isOpen = all || open[p.id];
        return (
          <div key={p.id} className={`lip ${isOpen && scene ? 'buka' : ''}`} style={{ '--n': i } as CSSProperties}>
            <button
              type="button"
              className="lip-tutup"
              disabled={!scene || hidden}
              onClick={() => {
                setOpen({ ...open, [p.id]: !open[p.id] });
                sound.play('turn');
              }}
              aria-expanded={!!isOpen}>
              {isOpen && scene ? (
                <span className="lip-adegan">{scene.text}</span>
              ) : (
                <span className="lip-garis" aria-hidden>
                  <i />
                  <i />
                  <i />
                </span>
              )}
            </button>
            <div className="lip-pita">
              <span className="lip-oleh">
                <Avatar doodle={m.face(p.authorId)} size={18} /> {h?.tokoh ?? 'tokoh'} · {m.name(p.authorId)}
                {h?.waktu ? ` · ${h.waktu}` : ''}
              </span>
              <span className="lip-kalimat">{h?.line ?? '…'}</span>
            </div>
          </div>
        );
      })}
      {hidden ? <p className="tiny soft center">Mode kejutan: adegan penuh terbuka di pengungkapan.</p> : null}
      {!hidden && round ? (
        <button className="unfold-all" onClick={() => setOpen(Object.fromEntries(parts.map((p) => [p.id, !all])))} data-testid="buka-lipatan">
          {all ? 'lipat lagi' : 'buka semua lipatan'}
        </button>
      ) : null}
    </div>
  );
}

export function Baca({ m }: { m: StoryModel }) {
  const { st, meId, main } = m;
  const parts = main.filter((p) => p.round === st.round);
  const [factFor, setFactFor] = useState<{ part?: StoryPartWire; revise?: Fact } | null>(null);
  const [noteFor, setNoteFor] = useState<StoryPartWire | null>(null);
  const pending = m.facts.filter((f) => f.state === 'usul' || f.state === 'tunda');
  const newSah = m.sah.filter((f) => f.round === st.round);
  const wrote = parts.some((p) => p.authorId === meId);

  return (
    <div className="baca">
      <p className="rupa-hand meja-judul">{st.mode === 'kejutan' ? 'lipatannya terbuka sebagian.' : 'lipatannya siap dibuka.'}</p>
      <Lipatan m={m} round={st.round} parts={parts} />

      {pending.length ? (
        <section className="section">
          <span className="label">fakta menunggu kesepakatan</span>
          <div className="col" style={{ gap: 8 }}>
            {pending.map((f) => (
              <FactCard key={f.id} m={m} f={f} onRevise={() => setFactFor({ revise: f })} />
            ))}
          </div>
        </section>
      ) : null}

      <section className="section">
        <span className="label">tinjau tiap bagian</span>
        <div className="col" style={{ gap: 12 }}>
          {parts.map((p, i) => (
            <Tinjau key={p.id} m={m} p={p} n={i} onFact={() => setFactFor({ part: p })} onNote={() => setNoteFor(p)} />
          ))}
        </div>
      </section>

      <SerahMap m={m} newSah={newSah} />

      <button className="btn meja-lanjut" disabled={st.ready.includes(meId) || !wrote} onClick={() => void m.run(() => m.post('/ready'))} data-testid="cerita-lanjut">
        {!wrote ? 'gelombang ini dilanjutkan tanpa bagianmu' : st.ready.includes(meId) ? 'menunggu yang lain…' : st.round >= st.rounds ? 'buka seluruh cerita' : `lanjut ke gelombang ${st.round + 1}`}
      </button>

      <FactSheet m={m} target={factFor} onClose={() => setFactFor(null)} />
      <NoteSheet m={m} part={noteFor} onClose={() => setNoteFor(null)} />
    </div>
  );
}

/** Satu bagian di ruang baca: tafsirku, maksud penulis, sanggahan, fakta, tirai, tebak role. */
function Tinjau({ m, p, n, onFact, onNote }: { m: StoryModel; p: StoryPartWire; n: number; onFact: () => void; onNote: () => void }) {
  const { st, meId } = m;
  const own = p.authorId === meId;
  const h = m.handoffOf(p);
  const scene = m.sceneOf(p);
  const source = scene?.text ?? h?.line ?? '';
  const sentences = storySentences(source);
  const myRead = m.reads.find((r) => r.partId === p.id && r.readerId === meId && r.kind === 'tafsir');
  const others = m.reads.filter((r) => r.partId === p.id && r.kind === 'tafsir' && r.readerId !== meId);
  const myGuess = m.reads.find((r) => r.partId === p.id && r.readerId === meId && r.kind === 'tebak');
  const intent = m.open<{ text: string }>(p.intent)?.text;
  const notes = st.notes.filter((x) => x.partId === p.id);
  const [quote, setQuote] = useState('');
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);

  const sendRead = async () => {
    setBusy(true);
    await m.run(() => m.post(`/parts/${p.id}/reads`, { id: newDropId(), kind: 'tafsir', envelope: m.seal({ v: 1, quote: quote || undefined, text: text.trim() }) }));
    setBusy(false);
  };

  return (
    <article className="tinjau" style={{ '--n': n } as CSSProperties} data-testid="bagian">
      <header>
        <span className="rupa-hand">{h?.tokoh ?? 'tokoh'}</span>
        <span className="bagian-oleh">
          <Avatar doodle={m.face(p.authorId)} size={20} /> {own ? 'kamu' : m.name(p.authorId)}
          {p.perk ? <em>memakai keuntungan role</em> : null}
        </span>
      </header>

      {h?.trace ? (
        <div className="bagian-jejak">
          <span className="tiny">jejak{h.trace.knows.length ? ` · untuk ${h.trace.knows.join(', ')}` : ' · belum punya penerima'}</span>
          <b>{h.trace.what}</b>
          {h.trace.question ? <span className="rupa-hand">{h.trace.question}</span> : null}
        </div>
      ) : null}

      {!own ? (
        myRead ? (
          <div className="side-by">
            <div className="sb-a">
              <i>yang kutangkap</i>
              {myRead.r!.quote ? <q>{myRead.r!.quote}</q> : null}
              {myRead.r!.text}
            </div>
            <div className="sb-b">
              <i>yang ingin {m.name(p.authorId)} simpulkan</i>
              {intent ?? <span className="soft">Penulisnya tidak menitipkan maksud. Tafsirmu jadi satu-satunya bacaan.</span>}
            </div>
          </div>
        ) : (
          <div className="tafsir" data-testid="tafsir">
            <span className="tiny soft">ketuk kalimat yang paling membentuk tafsirmu</span>
            <div className="tafsir-kal">
              {sentences.map((s, i) => (
                <button key={i} className={quote === s ? 'on' : ''} onClick={() => setQuote(quote === s ? '' : s)}>
                  {s}
                </button>
              ))}
            </div>
            <textarea className="field" rows={2} maxLength={400} value={text} onChange={(e) => setText(e.target.value)} placeholder="apa yang kamu tangkap?" data-testid="tafsir-isi" />
            <button className="btn sm" disabled={busy || !text.trim()} onClick={() => void sendRead()} data-testid="tafsir-kirim">
              kirim tafsirku, lalu lihat maksud penulis
            </button>
          </div>
        )
      ) : (
        <div className="tafsir-masuk">
          {others.length ? (
            others.map((r) => (
              <div key={r.id} className="side-by">
                <div className="sb-a">
                  <i>yang ditangkap {m.name(r.readerId)}</i>
                  {r.r!.quote ? <q>{r.r!.quote}</q> : null}
                  {r.r!.text}
                </div>
                <div className="sb-b">
                  <i>yang ingin kamu simpulkan</i>
                  {intent ?? <span className="soft">tidak kamu titipkan</span>}
                </div>
              </div>
            ))
          ) : (
            <span className="tiny soft">Belum ada yang menulis tafsir untuk bagianmu.</span>
          )}
        </div>
      )}

      {st.mode === 'kejutan' && !own ? (
        <div className="tebak">
          <span className="tiny soft">tebak kartu role yang membentuk bagian ini</span>
          <select
            className="field"
            value={myGuess?.r?.role ?? ''}
            onChange={(e) => void m.run(() => m.post(`/parts/${p.id}/reads`, { id: myGuess?.id ?? newDropId(), kind: 'tebak', envelope: m.seal({ v: 1, text: '', role: e.target.value }) }))}
            data-testid="tebak">
            <option value="">pilih kartu…</option>
            {STORY_DECK.filter((r) => st.deck === 'lengkap' || r.tier === 'awal').map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      {notes.length ? (
        <ul className="bagian-sanggah">
          {notes.map((x) => (
            <li key={x.id}>
              <span className="tiny">
                {m.name(x.authorId)} · {REASON[x.reason]}
                {x.resolution ? ` · ${RESOLVE[x.resolution][0]}` : ''}
              </span>
              {m.open<{ text: string }>(x.envelope)?.text ?? '…'}
              {own && !x.resolution ? (
                <span className="resolve">
                  {(Object.keys(RESOLVE) as (keyof typeof RESOLVE)[]).map((k) => (
                    <button key={k} className="pill sm" title={RESOLVE[k][1]} onClick={() => void m.run(() => m.put(`/notes/${x.id}`, { resolution: k }))} data-testid={`jalan-${k}`}>
                      {RESOLVE[k][0]}
                    </button>
                  ))}
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}

      <div className="tinjau-act">
        <button className="pill sm" onClick={onFact} data-testid="usul-fakta">
          <Doodle id="ui-centang" size={14} color="currentColor" /> usulkan fakta
        </button>
        {!own ? (
          <>
            <button className="pill sm" onClick={onNote} data-testid="sanggah">
              sanggah
            </button>
            <button className={`pill sm ${p.veiledByMe ? 'active' : ''}`} onClick={() => void m.run(() => m.post(`/parts/${p.id}/veil`))} title="minta, tanpa nama, agar satu adegan dibuat terjadi di luar layar" data-testid="tirai">
              tirai
            </button>
          </>
        ) : p.veils ? (
          <span className="tiny" style={{ color: 'var(--lak)' }}>
            {p.veils} orang meminta satu adegan di sini dibuat terjadi di luar layar.
          </span>
        ) : null}
      </div>
    </article>
  );
}

export function FactCard({ m, f, onRevise }: { m: StoryModel; f: Fact; onRevise?: () => void }) {
  const mine = f.agrees.includes(m.meId);
  const settled = f.state === 'sah' || f.state === 'diganti';
  return (
    <div className={`fakta ${f.state}`} data-testid="fakta">
      <span className="fakta-top">
        {f.supersedes ? 'revisi · ' : ''}
        {f.f.mystery ? 'misteri disengaja' : f.f.scope}
        {f.f.waktu ? ` · ${f.f.waktu}` : ''} · {f.state === 'sah' ? 'disepakati' : f.state === 'tunda' ? 'ditunda' : f.state === 'diganti' ? 'diganti revisi' : `${f.agrees.length} dari ${m.n} setuju`}
      </span>
      <p className="fakta-kal">{f.f.sentence}</p>
      {f.f.knows.length || f.f.believes.length ? (
        <span className="fakta-tahu">
          {f.f.knows.map((t) => (
            <span key={t} className="chip">
              {t}
            </span>
          ))}
          {f.f.believes.map((t) => (
            <span key={t} className="chip kira">
              {t} · mengira
            </span>
          ))}
        </span>
      ) : null}
      {!settled ? (
        <span className="fakta-act">
          <button className={`pill sm ${mine ? 'active' : ''}`} disabled={mine} onClick={() => void m.run(() => m.put(`/facts/${f.id}`, { vote: 'setuju' }))} data-testid="setuju">
            setuju
          </button>
          {onRevise ? (
            <button className="pill sm" onClick={onRevise} data-testid="revisi">
              revisi
            </button>
          ) : null}
          <button className={`pill sm ${f.defers.includes(m.meId) ? 'active' : ''}`} onClick={() => void m.run(() => m.put(`/facts/${f.id}`, { vote: 'tunda' }))}>
            tunda
          </button>
          {f.authorId === m.meId ? (
            <button className="pill sm" onClick={() => void m.run(() => m.put(`/facts/${f.id}`, { vote: 'batal' }))}>
              tarik
            </button>
          ) : null}
        </span>
      ) : null}
    </div>
  );
}

function FactSheet({ m, target, onClose }: { m: StoryModel; target: { part?: StoryPartWire; revise?: Fact } | null; onClose: () => void }) {
  const h = target?.part ? m.handoffOf(target.part) : null;
  const base = target?.revise?.f;
  const [form, setForm] = useState<StoryFactPayload | null>(null);
  const f: StoryFactPayload = form ?? { v: 1, sentence: base?.sentence ?? h?.trace?.what ?? '', scope: base?.scope ?? 'lokal', waktu: base?.waktu ?? h?.waktu ?? m.waktuOf(m.st.round), knows: base?.knows ?? [...new Set([...(h ? [h.tokoh] : []), ...(h?.trace?.knows ?? [])])], believes: base?.believes ?? [], mystery: base?.mystery };
  const set = (x: Partial<StoryFactPayload>) => setForm({ ...f, ...x });
  const cycle = (t: string) => {
    if (f.knows.includes(t)) set({ knows: f.knows.filter((x) => x !== t), believes: [...f.believes, t] });
    else if (f.believes.includes(t)) set({ believes: f.believes.filter((x) => x !== t) });
    else set({ knows: [...f.knows, t] });
  };
  const close = () => {
    setForm(null);
    onClose();
  };
  return (
    <Sheet open={!!target} onClose={close} title={target?.revise ? 'revisi fakta' : 'usulkan fakta'}>
      <div className="col" style={{ gap: 12 }}>
        <p className="small soft" style={{ margin: 0 }}>Satu kalimat yang boleh dipakai lagi di gelombang berikutnya. Persetujuan melekat pada kalimat ini; mengubahnya berarti usulan baru.</p>
        <textarea className="field" rows={2} maxLength={240} value={f.sentence} onChange={(e) => set({ sentence: e.target.value })} placeholder="mis. Kunci disimpan di laci meja depan, terbungkus kuitansi." data-testid="fakta-kal" />
        <div className="row wrap" style={{ gap: 6 }}>
          <button className={`pill sm ${f.scope === 'lokal' ? 'active' : ''}`} onClick={() => set({ scope: 'lokal' })}>
            lokal
          </button>
          <button className={`pill sm ${f.scope === 'dunia' ? 'active' : ''}`} onClick={() => set({ scope: 'dunia' })}>
            berlaku untuk seluruh dunia cerita
          </button>
          <button className={`pill sm ${f.mystery ? 'active' : ''}`} onClick={() => set({ mystery: !f.mystery })}>
            misteri disengaja
          </button>
        </div>
        <input className="field" value={f.waktu ?? ''} maxLength={60} onChange={(e) => set({ waktu: e.target.value })} placeholder="kapan di waktu cerita" />
        {!f.mystery ? (
          <>
            <span className="tiny soft">ketuk tokoh: tahu → mengira → tidak tahu</span>
            <div className="row wrap" style={{ gap: 6 }}>
              {m.tokohs.map((t) => (
                <button key={t} className={`pill sm ${f.knows.includes(t) ? 'active' : f.believes.includes(t) ? 'kira' : ''}`} onClick={() => cycle(t)} data-testid={`fk-${t}`}>
                  {t}
                  {f.believes.includes(t) ? ' · mengira' : ''}
                </button>
              ))}
            </div>
          </>
        ) : null}
        <button
          className="btn"
          disabled={!f.sentence.trim()}
          onClick={async () => {
            const ok = await m.run(() => m.post('/facts', { id: newDropId(), round: target?.part?.round ?? m.st.round, envelope: m.seal({ ...f, sentence: f.sentence.trim() }), supersedes: target?.revise?.id ?? null }));
            if (ok) close();
          }}
          data-testid="fakta-kirim">
          {target?.revise ? 'usulkan revisi' : 'usulkan fakta'}
        </button>
      </div>
    </Sheet>
  );
}

function NoteSheet({ m, part, onClose }: { m: StoryModel; part: StoryPartWire | null; onClose: () => void }) {
  const [reason, setReason] = useState<keyof typeof REASON>('pengetahuan');
  const [text, setText] = useState('');
  return (
    <Sheet open={!!part} onClose={onClose} title="sanggah">
      <div className="col" style={{ gap: 12 }}>
        <p className="small soft" style={{ margin: 0 }}>Tawarkan satu pertanyaan, alternatif kalimat, atau adegan. Sanggahan tidak memblokir cerita; penulisnya yang memilih jalan keluarnya.</p>
        <div className="row wrap" style={{ gap: 6 }}>
          {(Object.keys(REASON) as (keyof typeof REASON)[]).map((r) => (
            <button key={r} className={`pill ${reason === r ? 'active' : ''}`} onClick={() => setReason(r)}>
              {REASON[r]}
            </button>
          ))}
        </div>
        <textarea className="field" rows={3} maxLength={400} value={text} onChange={(e) => setText(e.target.value)} placeholder="mis. Dari mana Tetangga tahu isinya kertas?" data-testid="sanggah-isi" />
        <button
          className="btn"
          disabled={!text.trim()}
          onClick={async () => {
            const ok = await m.run(() => m.post(`/parts/${part!.id}/notes`, { id: newDropId(), reason, envelope: m.seal({ v: 1, text: text.trim() }) }));
            if (ok) {
              setText('');
              onClose();
            }
          }}
          data-testid="sanggah-kirim">
          kirim sanggahan
        </button>
      </div>
    </Sheet>
  );
}

/** Ke mana jejak dan fakta gelombang ini mengalir di gelombang berikutnya. */
function SerahMap({ m, newSah }: { m: StoryModel; newSah: Fact[] }) {
  const { st, main } = m;
  if (st.round >= st.rounds) return null;
  const flows = main
    .filter((p) => p.round === st.round)
    .map((p) => ({ p, h: m.handoffOf(p) }))
    .filter((x) => x.h?.trace);
  if (!flows.length && !newSah.length) return null;
  return (
    <section className="section serah-map" data-testid="serah-map">
      <span className="label">dibawa ke gelombang {st.round + 1}</span>
      {flows.map(({ p, h }) => (
        <div key={p.id} className="flow-row">
          <span className="flow-dari">{h!.tokoh}</span>
          <span className="flow-apa">“{h!.trace!.what}”</span>
          <span className="flow-ke">{h!.trace!.knows.length ? h!.trace!.knows.join(', ') : <i>tersensor untuk semua</i>}</span>
        </div>
      ))}
      {newSah.map((f) => (
        <div key={f.id} className="flow-row fakta-row">
          <span className="flow-dari">fakta</span>
          <span className="flow-apa">{f.f.sentence}</span>
          <span className="flow-ke">{f.f.mystery ? 'misteri' : f.f.knows.join(', ') || 'tidak ada yang tahu'}</span>
        </div>
      ))}
    </section>
  );
}
