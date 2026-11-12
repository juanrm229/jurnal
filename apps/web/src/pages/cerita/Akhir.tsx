/** Penutupan: pengungkapan, penghargaan, Wrapped, susunan edisi, templat buku, dan kapsul lanjutan. */
import { STORY_DECK, type StoryEdition, type StoryPartWire, storyRole, storySentences } from '@sehari/core';
import { type CSSProperties, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { namaBerkas, toDocx, toEpub, toMarkdown, unduh } from '@/lib/ekspor';
import { navigate } from '@/lib/router';
import { useReady } from '@/lib/session';
import { newWorkId, saveWork } from '@/lib/works';
import { Avatar, Doodle, Sheet } from '@/ui/kit';
import { AiRangkuman } from './ai';
import { Lipatan } from './Baca';
import type { StoryModel } from './kit';

const TEMPLATES = {
  'satu-jendela': ['Satu Jendela', 'Mengalir linear, transisi waktu yang jelas.'],
  'dua-sisi': ['Dua Sisi', 'Dua perspektif berdampingan; pembaca memilih pintu masuknya.'],
  arsip: ['Arsip Kehidupan', 'Adegan, jejak, dan fakta sebagai artefak yang disusun.'],
} as const;

const words = (s: string) => (s.trim() ? s.trim().split(/\s+/).length : 0);
const nextCard = (id: string) => {
  const i = STORY_DECK.findIndex((r) => r.id === id);
  if (i < 0) return undefined;
  const g = Math.floor(i / 8);
  return STORY_DECK[g * 8 + ((i % 8) + 1) % 8];
};

export function Akhir({ m }: { m: StoryModel }) {
  const { st, main, meId } = m;
  const rounds = Array.from({ length: st.rounds }, (_, i) => i + 1);
  const branches = st.parts.filter((p) => p.world !== 'a');
  const defaultEd: StoryEdition = { order: main.map((p) => p.id), ending: main.filter((p) => p.round === st.rounds).map((p) => p.id).slice(0, 1), template: 'satu-jendela' };
  const [draft, setDraft] = useState<StoryEdition | null>(null);
  const ed = draft ?? st.edition ?? defaultEd;
  const ordered = ed.order.map((id) => st.parts.find((p) => p.id === id)).filter((p): p is StoryPartWire => !!p);
  const approved = st.editionOk.includes(meId);
  const allOk = !!st.edition && st.voters.every((u) => st.editionOk.includes(u));
  const [branch, setBranch] = useState(false);
  const [kapsul, setKapsul] = useState(false);
  const [printing, setPrinting] = useState(false);
  const credit = `Ditulis bersama oleh ${st.members.map((u) => (u === meId ? 'aku' : m.name(u))).join(', ')} lewat Hidup Orang Lain.`;

  useEffect(() => {
    if (!printing) return;
    const t = window.setTimeout(() => {
      window.print();
      setPrinting(false);
    }, 150);
    return () => window.clearTimeout(t);
  }, [printing]);

  const move = (i: number, d: number) => {
    const o = [...ed.order];
    const j = i + d;
    if (j < 0 || j >= o.length) return;
    [o[i], o[j]] = [o[j]!, o[i]!];
    setDraft({ ...ed, order: o });
  };
  return (
    <div className="akhir">
      <p className="rupa-hand meja-judul">cerita ini selesai.</p>
      {m.premise.pitch ? <p className="small soft" style={{ margin: '0 0 8px' }}>{m.premise.pitch}</p> : null}

      <section className="section">
        <span className="label">pengungkapan</span>
        {rounds.map((r) => (
          <div key={r} className="ungkap-g">
            <span className="ungkap-w">{m.waktuOf(r)}</span>
            <Lipatan m={m} round={r} parts={main.filter((p) => p.round === r)} />
          </div>
        ))}
      </section>

      <RoleReveal m={m} />
      <Awards m={m} branches={branches} />
      <Wrapped m={m} />

      <section className="section edisi-susun" data-testid="edisi">
        <span className="label">susun edisi</span>
        <p className="small soft" style={{ margin: 0 }}>Urutan baca, ending, dan templat buku. Setiap perubahan meminta persetujuan ulang semua penulis.</p>
        <ol className="urutan">
          {ordered.map((p, i) => {
            const end = ed.ending.includes(p.id);
            return (
              <li key={p.id} className={end ? 'ending' : ''}>
                <span className="urutan-n">{i + 1}</span>
                <span className="grow" style={{ minWidth: 0 }}>
                  <b>{m.tokohOf(p)}</b>
                  <span className="tiny soft">
                    {p.world === 'a' ? m.waktuOf(p.round) : 'jalan lain'} · {m.name(p.authorId)}
                  </span>
                </span>
                <button className={`pill sm ${end ? 'active' : ''}`} onClick={() => setDraft({ ...ed, ending: end ? ed.ending.filter((x) => x !== p.id) : [...ed.ending, p.id].slice(-2) })}>
                  ending
                </button>
                <button className="icon-btn" aria-label="naikkan" disabled={i === 0} onClick={() => move(i, -1)}>
                  <Doodle id="ui-kembali" size={14} style={{ rotate: '90deg' }} />
                </button>
                <button className="icon-btn" aria-label="turunkan" disabled={i === ordered.length - 1} onClick={() => move(i, 1)}>
                  <Doodle id="ui-panah-kanan" size={14} style={{ rotate: '90deg' }} />
                </button>
              </li>
            );
          })}
          {branches
            .filter((b) => !ed.order.includes(b.id))
            .map((b) => (
              <li key={b.id} className="lampiran">
                <span className="grow">
                  jalan lain · {m.name(b.authorId)} · {m.waktuOf(b.round)}
                </span>
                <button className="pill sm" onClick={() => setDraft({ ...ed, order: [...ed.order, b.id] })}>
                  masukkan
                </button>
              </li>
            ))}
        </ol>
        <div className="tpl-pilih">
          {(Object.keys(TEMPLATES) as StoryEdition['template'][]).map((k) => (
            <button key={k} className={`tpl-k ${ed.template === k ? 'on' : ''}`} onClick={() => setDraft({ ...ed, template: k })} data-testid={`tpl-${k}`}>
              <span className={`tpl-art ${k}`} aria-hidden>
                <i />
                <i />
                <i />
              </span>
              <b>{TEMPLATES[k][0]}</b>
              <span className="tiny soft">{TEMPLATES[k][1]}</span>
            </button>
          ))}
        </div>
        <div className="row wrap" style={{ gap: 8 }}>
          {draft ? (
            <button className="btn auto" onClick={async () => (await m.run(() => m.put('/edition', draft))) && setDraft(null)} data-testid="edisi-usul">
              usulkan susunan ini
            </button>
          ) : st.edition && !approved ? (
            <button className="btn auto" onClick={() => void m.run(() => m.post('/edition/approve'))} data-testid="edisi-setuju">
              setujui edisi
            </button>
          ) : null}
          <span className="tiny soft" style={{ alignSelf: 'center' }}>
            {allOk ? 'disahkan semua penulis' : st.edition ? `${st.editionOk.filter((u) => st.voters.includes(u)).length} dari ${st.voters.length} menyetujui` : 'belum diusulkan'}
          </span>
        </div>
      </section>

      <Edisi m={m} ed={ed} ordered={ordered} />

      <AiRangkuman m={m} />

      <div className="col meja-lanjut" style={{ gap: 10 }}>
        <BookButton m={m} ordered={ordered} credit={credit} />
        <Ekspor m={m} ordered={ordered} credit={credit} />
        <div className="row" style={{ gap: 8 }}>
          <button className="btn soft grow" onClick={() => setBranch(true)} data-testid="jalan-lain">
            <Doodle id="peta" size={18} /> jalan lain
          </button>
          <button className="btn soft grow" onClick={() => setPrinting(true)} data-testid="cetak">
            <Doodle id="ui-unduh" size={18} /> cetak / PDF
          </button>
          <button className="btn soft grow" onClick={() => setKapsul(true)} data-testid="kapsul">
            <Doodle id="surat-botol" size={18} /> kapsul
          </button>
        </div>
      </div>

      <BranchSheet m={m} open={branch} onClose={() => setBranch(false)} />
      <Sheet open={kapsul} onClose={() => setKapsul(false)} title="kapsul lanjutan">
        <KapsulForm m={m} />
      </Sheet>
      {printing
        ? createPortal(
            <div className="print-sheet">
              <header className="ps-head">
                <div className="ps-brand">Hidup Orang Lain · Sehari</div>
                <h1>{m.premise.title}</h1>
                <p>{credit}</p>
              </header>
              {ordered.map((p) => (
                <div key={p.id} className="ps-item">
                  <time>
                    {m.tokohOf(p)} · {m.waktuOf(p.round)} · {m.name(p.authorId)}
                  </time>
                  <p className="ps-text">{m.sceneOf(p)?.text}</p>
                </div>
              ))}
              <p className="ps-foot">dicetak dari Sehari</p>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}

function Ekspor({ m, ordered, credit }: { m: StoryModel; ordered: StoryPartWire[]; credit: string }) {
  const naskah = () => ({
    title: m.premise.title,
    subtitle: 'Hidup Orang Lain',
    credit,
    chapters: ordered.map((p) => ({ heading: m.tokohOf(p), sub: [m.handoffOf(p)?.waktu ?? m.waktuOf(p.round), p.world === 'b' ? 'jalan lain' : ''].filter(Boolean).join(' · '), text: m.sceneOf(p)?.text ?? '' })),
  });
  const file = namaBerkas(m.premise.title);
  const go = (kind: 'md' | 'epub' | 'docx') => {
    const n = naskah();
    if (kind === 'md') unduh(new Blob([toMarkdown(n)], { type: 'text/markdown;charset=utf-8' }), `${file}.md`);
    if (kind === 'epub') unduh(new Blob([toEpub(n, m.st.id)], { type: 'application/epub+zip' }), `${file}.epub`);
    if (kind === 'docx') unduh(new Blob([toDocx(n)], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }), `${file}.docx`);
  };
  return (
    <div className="ekspor" role="group" aria-label="ekspor naskah">
      <span className="tiny soft">bawa pulang naskahnya, dirakit di perangkatmu</span>
      <div className="row" style={{ gap: 6 }}>
        {(['epub', 'docx', 'md'] as const).map((k) => (
          <button key={k} className="pill" onClick={() => go(k)} data-testid={`ekspor-${k}`}>
            <Doodle id={k === 'epub' ? 'buku-terbuka' : k === 'docx' ? 'kertas-sobek' : 'pena'} size={16} color="currentColor" /> {k === 'md' ? 'Markdown' : k.toUpperCase()}
          </button>
        ))}
      </div>
    </div>
  );
}

function BookButton({ m, ordered, credit }: { m: StoryModel; ordered: StoryPartWire[]; credit: string }) {
  const [busy, setBusy] = useState(false);
  const { me, identity } = useReady();
  return (
    <button
      className="btn"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        const body = ordered.map((p) => `${m.tokohOf(p)}${m.handoffOf(p)?.waktu ? ` · ${m.handoffOf(p)!.waktu}` : ''}\n\n${m.sceneOf(p)?.text ?? ''}`).join('\n\n⁂\n\n');
        try {
          const w = await saveWork(newWorkId(), { v: 1, kind: m.st.rounds > 3 ? 'catatan' : 'cerpen', title: m.premise.title, subtitle: 'Hidup Orang Lain', body: `${body}\n\n—\n${credit}`, cover: { tone: 'tinta', doodle: m.premise.doodle } }, 'draft', [], { meId: me.user.id, publicKey: identity.publicKey, circles: m.circles });
          navigate(`/karya/${w.id}/tulis`);
        } finally {
          setBusy(false);
        }
      }}
      data-testid="jadi-karya">
      <Doodle id="buku" size={20} color="currentColor" /> {busy ? 'merakit naskah…' : 'jadikan buku di rak'}
    </button>
  );
}


/** Kartu role semua penulis terbuka, dengan baris bukti dan tebakan pembaca. */
function RoleReveal({ m }: { m: StoryModel }) {
  const { st } = m;
  const babak = [...st.rolesLog, st.roles];
  return (
    <section className="section">
      <span className="label">kartu yang dipegang</span>
      <div className="role-ungkap">
        {st.members.map((u, i) => {
          const ids = [...new Set(babak.map((b) => b[u]).filter(Boolean))];
          const proofs = m.main.filter((p) => p.authorId === u).map((p) => m.handoffOf(p)?.proof).filter(Boolean);
          const guesses = m.reads.filter((r) => r.kind === 'tebak' && m.main.find((p) => p.id === r.partId)?.authorId === u);
          return (
            <div key={u} className="role-u" style={{ '--n': i } as CSSProperties} data-testid="role-ungkap">
              <span className="row" style={{ gap: 8 }}>
                <Avatar doodle={m.face(u)} size={26} />
                <b>{m.name(u)}</b>
              </span>
              {ids.map((id) => {
                const r = storyRole(id)!;
                return (
                  <span key={id} className="role-u-k">
                    <Doodle id={r.doodle} size={22} /> {r.name}
                  </span>
                );
              })}
              {proofs.length ? <q className="tiny">{proofs[0]}</q> : null}
              {guesses.map((g) => {
                const hit = ids.includes(g.r!.role ?? '');
                return (
                  <span key={g.id} className={`tiny ${hit ? 'tebak-ok' : 'soft'}`}>
                    {m.name(g.readerId)} menebak {storyRole(g.r!.role)?.name ?? '…'} {hit ? '· tepat' : ''}
                  </span>
                );
              })}
            </div>
          );
        })}
      </div>
    </section>
  );
}

/** Lima penghargaan; masing-masing hanya muncul kalau buktinya ada di cerita. */
function Awards({ m, branches }: { m: StoryModel; branches: StoryPartWire[] }) {
  const { st, main } = m;
  const out: { title: string; doodle: string; body: string; quote?: string }[] = [];
  const tr = main.map((p) => ({ p, h: m.handoffOf(p) })).filter((x) => x.h?.trace);
  for (const a of tr) {
    const b = tr.find((x) => x.p.round === a.p.round + 1 && a.h!.trace!.knows.some((k) => k.toLowerCase() === x.h!.tokoh.toLowerCase()));
    if (b) {
      out.push({ title: 'Satu Benda, Dua Kehidupan', doodle: 'kunci', body: `${a.h!.tokoh} meninggalkannya, ${b.h!.tokoh} memberinya hidup kedua.`, quote: `${a.h!.trace!.what} → ${b.h!.trace!.what}` });
      break;
    }
  }
  const teras = m.sah.find((f) => f.f.believes.length && f.f.knows.length);
  if (teras) out.push({ title: 'Orang yang Melihat dari Teras', doodle: 'ui-aku', body: `${teras.f.believes.join(', ')} mengira; ${teras.f.knows.join(', ')} tahu.`, quote: teras.f.sentence });
  outer: for (const a of main.filter((p) => p.round === 1)) {
    for (const s of storySentences(m.sceneOf(a)?.text ?? '').filter((x) => words(x) >= 5)) {
      const b = main.find((p) => p.round > 1 && p.authorId !== a.authorId && (m.sceneOf(p)?.text ?? '').toLowerCase().includes(s.toLowerCase()));
      if (b) {
        out.push({ title: 'Kalimat yang Sampai Belakangan', doodle: 'gelembung-kata', body: `Ditulis ${m.name(a.authorId)}, dibawa kembali ${m.name(b.authorId)} di ${m.waktuOf(b.round)}.`, quote: s });
        break outer;
      }
    }
  }
  const note = st.notes.find((x) => x.resolution === 'adegan-antara' || x.resolution === 'pilih-fakta');
  if (note) out.push({ title: 'Sanggahan yang Membuka Adegan', doodle: 'ui-ide', body: `${m.name(note.authorId)} bertanya, dan jawabannya jadi bagian cerita.`, quote: m.open<{ text: string }>(note.envelope)?.text });
  if (branches.length) out.push({ title: 'Jalan Pulang yang Lain', doodle: 'peta', body: `${m.name(branches[0]!.authorId)} menulis dunia tempat satu keputusan berubah.`, quote: m.open<{ trace?: { what: string } }>(branches[0]!.envelope)?.trace?.what });
  if (!out.length) return null;
  return (
    <section className="section">
      <span className="label">penghargaan</span>
      <div className="awards">
        {out.map((a, i) => (
          <div key={a.title} className="award" style={{ '--n': i } as CSSProperties} data-testid="penghargaan">
            <Doodle id={a.doodle} size={30} draw={0.3 + i * 0.2} />
            <span>
              <b>{a.title}</b>
              <span className="small">{a.body}</span>
              {a.quote ? <q className="small">{a.quote}</q> : null}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

/** Wrapped pribadi: hitungan dipisah dari pembacaan, hanya untuk pemiliknya. */
function Wrapped({ m }: { m: StoryModel }) {
  const { st, main, meId } = m;
  const mine = main.filter((p) => p.authorId === meId);
  const totalWords = mine.reduce((a, p) => a + words(m.sceneOf(p)?.text ?? ''), 0);
  const given = mine.map((p) => m.handoffOf(p)?.trace).filter(Boolean);
  const received = given.filter((t) => main.some((p) => p.authorId !== meId && t!.knows.some((k) => k.toLowerCase() === m.tokohOf(p).toLowerCase())));
  const factsSah = m.sah.filter((f) => f.authorId === meId).length;
  const tafsir = m.reads.filter((r) => r.readerId === meId && r.kind === 'tafsir').length;
  const tokohs = [...new Set(mine.map((p) => m.tokohOf(p)))];
  const roles = [...new Set([...st.rolesLog, st.roles].map((b) => b[meId]).filter(Boolean))].map((id) => storyRole(id)!);
  const gift = roles.length ? nextCard(roles[roles.length - 1]!.id) : undefined;
  const reading = received.length >= 2 ? 'Jejakmu paling sering dipakai lagi oleh orang lain: kamu menulis benda yang ingin dipegang.' : tafsir >= mine.length && tafsir > 0 ? 'Kamu membaca dengan teliti: tiap bagian orang lain kamu beri tafsir.' : tokohs.length > 1 ? `Kamu hidup sebagai ${tokohs.length} orang berbeda di cerita ini.` : 'Kamu menjaga satu tokoh dari awal sampai akhir.';
  return (
    <section className="section">
      <span className="label">wrapped-mu · hanya kamu yang lihat</span>
      <div className="wrapped-k" data-testid="potret">
        <div className="wk-angka">
          <span>
            <b>{mine.length}</b>bagian
          </span>
          <span>
            <b>{totalWords}</b>kata
          </span>
          <span>
            <b>{received.length}</b>jejak dipakai lagi
          </span>
          <span>
            <b>{factsSah}</b>fakta disahkan
          </span>
          <span>
            <b>{tafsir}</b>tafsir
          </span>
        </div>
        <p className="wk-baca">{reading}</p>
        {tokohs.length ? <span className="tiny soft">tokoh yang kamu tulis: {tokohs.join(' → ')}</span> : null}
        {roles.length ? <span className="tiny soft">kartu: {roles.map((r) => r.name).join(' → ')}</span> : null}
        {gift ? (
          <span className="potret-hadiah">
            <i>kartu untuk cerita berikutnya</i>
            <b>{gift.name}</b>
            <span className="tiny">{gift.batasan}</span>
          </span>
        ) : null}
      </div>
    </section>
  );
}

/** Pratinjau edisi sesuai templat yang dipilih. */
function Edisi({ m, ed, ordered }: { m: StoryModel; ed: StoryEdition; ordered: StoryPartWire[] }) {
  const counts = new Map<string, number>();
  for (const p of ordered) counts.set(m.tokohOf(p), (counts.get(m.tokohOf(p)) ?? 0) + 1);
  const pair = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 2).map((x) => x[0]);
  const [door, setDoor] = useState(0);
  return (
    <section className={`section edisi-pratinjau ${ed.template}`} data-testid="edisi-pratinjau">
      <span className="label">pratinjau · {TEMPLATES[ed.template][0]}</span>
      <h2 className="edisi-judul">{m.premise.title}</h2>
      {ed.template === 'dua-sisi' && pair.length === 2 ? (
        <>
          <div className="pintu">
            <span className="tiny soft">pintu pembaca: baca sebagai</span>
            {pair.map((t, i) => (
              <button key={t} className={`pill sm ${door === i ? 'active' : ''}`} onClick={() => setDoor(i)}>
                {t} dulu
              </button>
            ))}
          </div>
          <div className="dua-sisi">
            {[pair[door]!, pair[1 - door]!].map((t) => (
              <div key={t} className="sisi">
                <span className="sisi-nama rupa-hand">{t}</span>
                {ordered
                  .filter((p) => m.tokohOf(p) === t)
                  .map((p) => (
                    <p key={p.id}>
                      <small>{m.waktuOf(p.round)}</small>
                      {m.sceneOf(p)?.text}
                    </p>
                  ))}
              </div>
            ))}
          </div>
        </>
      ) : ed.template === 'arsip' ? (
        <div className="arsip">
          {ordered.map((p, i) => {
            const h = m.handoffOf(p);
            return (
              <div key={p.id} className={`arsip-k ${i % 3 === 1 ? 'nota' : i % 3 === 2 ? 'amplop' : ''}`} style={{ '--r': `${((i * 37) % 7) - 3}deg` } as CSSProperties}>
                <span className="tiny">
                  {h?.tokoh} · {m.waktuOf(p.round)}
                </span>
                <p>{m.sceneOf(p)?.text}</p>
                {h?.trace ? <span className="arsip-benda">{h.trace.what}</span> : null}
              </div>
            );
          })}
          {m.sah.map((f) => (
            <div key={f.id} className="arsip-k fakta-k">
              <span className="tiny">catatan · fakta</span>
              <p>{f.f.sentence}</p>
            </div>
          ))}
        </div>
      ) : (
        <div className="jendela">
          {ordered.map((p, i) => (
            <div key={p.id} className={ed.ending.includes(p.id) ? 'akhir-adegan' : ''}>
              {i === 0 || ordered[i - 1]!.round !== p.round ? <span className="jendela-w">⁂ {m.waktuOf(p.round)}</span> : null}
              <span className="jendela-t">{m.tokohOf(p)}</span>
              <p>{m.sceneOf(p)?.text}</p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function BranchSheet({ m, open, onClose }: { m: StoryModel; open: boolean; onClose: () => void }) {
  const rounds = Array.from({ length: m.st.rounds }, (_, i) => i + 1);
  const [round, setRound] = useState(1);
  const [what, setWhat] = useState('');
  const [text, setText] = useState('');
  return (
    <Sheet open={open} onClose={onClose} title="jalan lain">
      <div className="col" style={{ gap: 12 }}>
        <p className="small soft" style={{ margin: 0 }}>Satu keputusan yang berubah, satu detail bersama yang tetap berlaku, dan satu akibat yang terlihat. Fakta sebelum percabangan tetap berlaku.</p>
        <div className="row wrap" style={{ gap: 6 }}>
          {rounds.map((r) => (
            <button key={r} className={`pill sm ${round === r ? 'active' : ''}`} onClick={() => setRound(r)}>
              {m.waktuOf(r)}
            </button>
          ))}
        </div>
        <input className="field" value={what} maxLength={160} onChange={(e) => setWhat(e.target.value)} placeholder="keputusan yang berubah" data-testid="cabang-apa" />
        <textarea className="field" rows={6} value={text} onChange={(e) => setText(e.target.value)} placeholder="tulis adegan di dunia yang lain…" data-testid="cabang-isi" />
        <button
          className="btn"
          disabled={!text.trim() || !what.trim()}
          onClick={async () => {
            const ok = await m.run(() => m.put('/branch', { round, envelope: m.seal({ v: 1, text: text.trim(), trace: { what: what.trim(), knownBy: '', question: '' } }) }));
            if (ok) {
              setText('');
              setWhat('');
              onClose();
            }
          }}
          data-testid="cabang-kirim">
          simpan jalan lain
        </button>
      </div>
    </Sheet>
  );
}

/** Kapsul lanjutan: satu pertanyaan dan satu detail yang dibawa ke cerita baru. */
function KapsulForm({ m }: { m: StoryModel }) {
  const [q, setQ] = useState('');
  const detail = m.sah.at(-1)?.f.sentence ?? '';
  return (
    <div className="col" style={{ gap: 12 }}>
      <p className="small soft" style={{ margin: 0 }}>Segel satu pertanyaan yang masih punya daya. Cerita berikutnya dimulai dari situ, membawa fakta terakhir yang kalian sepakati.</p>
      <textarea className="field" rows={2} maxLength={200} value={q} onChange={(e) => setQ(e.target.value)} placeholder="mis. Siapa sebenarnya yang menyalakan lampu?" />
      {detail ? <span className="tiny soft">detail yang dibawa: “{detail}”</span> : null}
      <button className="btn" disabled={!q.trim()} onClick={() => navigate(`/cerita/baru?${new URLSearchParams({ judul: `${m.premise.title}: lanjutan`, tanya: q.trim(), fakta: detail, tokoh: m.tokohs.join(', ') })}`)}>
        mulai cerita lanjutan
      </button>
    </div>
  );
}
