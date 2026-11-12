/**
 * Meja cerita: menulis bagianmu, ruang baca setelah semua menyegel, dan
 * pengungkapan di akhir. Selalu menjawab satu hal: apa yang harus kulakukan sekarang.
 */
import { STORY_ROUNDS, STORY_WORDS, storyGiver, type StoryPartPayload, type StoryPartWire, storyPremise, storyRole, storySeat, type StoryWire } from '@sehari/core';
import { type CSSProperties, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { memberName, useCircles } from '@/lib/data';
import { navigate, useParams } from '@/lib/router';
import { useReady } from '@/lib/session';
import { sound } from '@/lib/sound';
import { sealPart, useOpenPart, useStory, useStoryCache, wordCount } from '@/lib/stories';
import { store } from '@/lib/storage';
import { newWorkId, saveWork } from '@/lib/works';
import { Avatar, Doodle, Growing, Header, useToast } from '@/ui/kit';

export default function Meja() {
  const { id } = useParams<{ id: string }>();
  const q = useStory(id);
  const st = q.data;
  if (!st) return q.isError ? <Growing label="cerita ini tidak ditemukan" /> : <Growing label="membuka meja…" />;
  return <Table st={st} />;
}

function Table({ st }: { st: StoryWire }) {
  const { me, identity } = useReady();
  const meId = me.user.id;
  const { circles } = useCircles();
  const circle = circles.find((c) => c.id === st.circleId);
  const premise = storyPremise(st.premise)!;
  const open = useOpenPart();
  const cache = useStoryCache();
  const toast = useToast();
  const name = (uid: string) => memberName(circles, uid, meId);
  const face = (uid: string) => (uid === meId ? me.user.doodle : (circle?.members.find((m) => m.userId === uid)?.doodle ?? 'tunas'));
  const idx = st.members.indexOf(meId);
  const partOf = (round: number, uid: string) => st.parts.find((p) => p.round === round && p.authorId === uid);
  const solo = st.members.length === 1;
  /** Jejak sah: disepakati semua penulis lain (sendirian: selalu sah). */
  const agreed = (p: StoryPartWire | undefined) => !!p && (solo || st.members.filter((m) => m !== p.authorId).every((m) => p.agrees.includes(m)));
  const run = async (f: () => Promise<StoryWire>) => {
    try {
      cache(await f());
    } catch (e) {
      toast((e as Error).message);
    }
  };

  const waktu = premise.rounds[Math.min(st.round, STORY_ROUNDS) - 1]!.waktu;
  const sealedNow = st.members.filter((m) => partOf(st.round, m)?.sealed);

  return (
    <main className="screen cerita meja" data-phase={st.phase}>
      <Header title={premise.title} sub={st.phase === 'done' ? 'seluruh cerita' : `putaran ${st.round} dari ${STORY_ROUNDS} · ${waktu}`} backTo="/cerita" />

      {st.phase !== 'done' ? (
        <div className="meja-orang" aria-label="penulis">
          {st.members.map((m, i) => {
            const on = st.phase === 'write' ? !!partOf(st.round, m)?.sealed : st.ready.includes(m);
            return (
              <span key={m} className={on ? 'on' : ''} style={{ '--n': i } as CSSProperties} title={on ? 'siap' : 'belum'}>
                <Avatar doodle={face(m)} size={30} />
                <b>{name(m)}</b>
              </span>
            );
          })}
          <i className="tiny soft">{st.phase === 'write' ? `${sealedNow.length} dari ${st.members.length} bagian siap` : `${st.ready.length} dari ${st.members.length} selesai membaca`}</i>
        </div>
      ) : null}

      {st.phase === 'write' ? (
        <Write
          key={st.round}
          st={st}
          mine={partOf(st.round, meId)}
          seat={storySeat(premise, st.round, idx, st.members.length)}
          role={storyRole(st.roles[meId])}
          handed={(() => {
            if (st.round === 1) return null;
            const giver = storyGiver(st.members, idx);
            const p = partOf(st.round - 1, giver);
            const t = agreed(p) ? open(p)?.trace : undefined;
            return { from: solo ? 'kamu sendiri, putaran lalu' : name(giver), trace: t, fakta: premise.fakta };
          })()}
          open={open}
          onSave={(payload, seal) => run(() => api.put<StoryWire>(`/stories/${st.id}/parts`, { round: st.round, envelope: sealPart(payload, circle, { id: meId, publicKey: identity.publicKey }), seal }))}
        />
      ) : null}

      {st.phase === 'read' ? (
        <>
          <p className="rupa-hand meja-judul">semua bagian sudah terbuka.</p>
          <p className="small soft" style={{ margin: '0 0 12px' }}>Baca bagian yang lain, lalu sepakati jejak yang masuk akal dipakai lagi. Jejak yang disepakati semua penulis jadi bahan putaran berikutnya.</p>
          <Parts st={st} round={st.round} premise={premise} open={open} name={name} face={face} meId={meId} agreed={agreed} onAgree={(p) => run(() => api.put<StoryWire>(`/stories/${st.id}/parts/${p.id}/agree`))} />
          <button className="btn meja-lanjut" disabled={st.ready.includes(meId)} onClick={() => run(() => api.post<StoryWire>(`/stories/${st.id}/ready`))} data-testid="cerita-lanjut">
            {st.ready.includes(meId) ? 'menunggu yang lain…' : st.round >= STORY_ROUNDS ? 'buka seluruh cerita' : `lanjut ke putaran ${st.round + 1}`}
          </button>
        </>
      ) : null}

      {st.phase === 'done' ? (
        <Reveal
          st={st}
          premise={premise}
          open={open}
          name={name}
          face={face}
          meId={meId}
          agreed={agreed}
          onBook={async (title, body) => {
            try {
              const w = await saveWork(newWorkId(), { v: 1, kind: 'cerpen', title, subtitle: 'Hidup Orang Lain', body, cover: { tone: 'tinta', doodle: premise.doodle } }, 'draft', [], { meId, publicKey: identity.publicKey, circles });
              navigate(`/karya/${w.id}/tulis`);
            } catch (e) {
              toast((e as Error).message);
            }
          }}
        />
      ) : null}
    </main>
  );
}

type Opener = (p: StoryPartWire | undefined) => StoryPartPayload | null;

function Write({ st, mine, seat, role, handed, open, onSave }: { st: StoryWire; mine: StoryPartWire | undefined; seat: ReturnType<typeof storySeat>; role: ReturnType<typeof storyRole>; handed: { from: string; trace?: StoryPartPayload['trace']; fakta: string[] } | null; open: Opener; onSave: (p: StoryPartPayload, seal: boolean) => Promise<void> }) {
  const key = `cerita.${st.id}.${st.round}`;
  const saved = open(mine) ?? store.json<StoryPartPayload>(key);
  const [text, setText] = useState(saved?.text ?? '');
  const [what, setWhat] = useState(saved?.trace?.what ?? '');
  const [knownBy, setKnownBy] = useState(saved?.trace?.knownBy ?? '');
  const [question, setQuestion] = useState(saved?.trace?.question ?? '');
  const [proof, setProof] = useState(saved?.proof ?? '');
  const [busy, setBusy] = useState(false);
  const [flip, setFlip] = useState(false);
  const payload: StoryPartPayload = { v: 1, text: text.trim(), trace: what.trim() ? { what: what.trim(), knownBy: knownBy.trim(), question: question.trim() } : undefined, proof: proof.trim() || undefined };
  // Draf disimpan di perangkat tiap ketikan, supaya tidak hilang kalau aplikasi tertutup.
  useEffect(() => {
    if (!mine?.sealed) store.set(key, JSON.stringify(payload));
  }, [text, what, knownBy, question, proof]);
  const n = wordCount(text);
  const sealed = !!mine?.sealed;
  const go = async (seal: boolean) => {
    setBusy(true);
    if (seal) {
      sound.play('seal');
      navigator.vibrate?.(20);
    }
    await onSave(payload, seal);
    setBusy(false);
  };

  return (
    <>
      <section className="kartu-prompt" data-testid="kartu-prompt">
        <span className="kp-tokoh rupa-hand">{seat.tokoh}</span>
        <p className="kp-posisi">{seat.posisi}</p>
        <dl>
          <dt>yang kamu tahu</dt>
          <dd>{seat.tahu.join(' ')}</dd>
          <dt>yang belum kamu tahu</dt>
          <dd>{seat.belumTahu}</dd>
          <dt>keputusanmu</dt>
          <dd className="kp-q">{seat.keputusan}</dd>
        </dl>
        {handed ? (
          <div className="kp-jejak" data-testid="jejak-masuk">
            <span className="tiny">jejak dari {handed.from}</span>
            {handed.trace ? (
              <>
                <b>{handed.trace.what}</b>
                {handed.trace.question ? <span className="rupa-hand">{handed.trace.question}</span> : null}
                {handed.trace.knownBy ? <span className="tiny soft">yang bisa tahu: {handed.trace.knownBy}</span> : null}
              </>
            ) : (
              <span className="small">Belum ada jejak yang disepakati. Pakai fakta pembuka: {handed.fakta.join(' ')}</span>
            )}
          </div>
        ) : null}
      </section>

      {role ? (
        <button className={`kartu-role ${flip ? 'flip' : ''}`} onClick={() => setFlip(!flip)} aria-expanded={flip} data-testid="kartu-role">
          <span className="kr-head">
            <Doodle id={role.doodle} size={30} />
            <span>
              <span className="tiny">kartu role-mu · hanya kamu yang lihat</span>
              <b>{role.name}</b>
            </span>
          </span>
          <span className="kr-row">
            <i>batasan</i>
            {role.batasan}
          </span>
          {flip ? (
            <>
              <span className="kr-row">
                <i>keuntungan</i>
                {role.keuntungan}
              </span>
              <span className="kr-row soft">
                <i>contoh</i>
                {role.contoh}
              </span>
            </>
          ) : (
            <span className="tiny soft">ketuk untuk melihat keuntungan dan contohnya</span>
          )}
        </button>
      ) : null}

      {sealed ? (
        <section className="meja-segel" data-testid="bagian-tersegel">
          <span className="meja-amplop">
            <Doodle id="amplop" size={72} draw />
            <i className="pair-lak" />
          </span>
          <p className="rupa-hand">bagianmu tersegel.</p>
          <p className="small soft">Yang lain hanya tahu bahwa satu bagian sudah siap. Isinya baru terbuka setelah semua menyegel.</p>
          <button className="btn ghost sm auto" disabled={busy} onClick={() => void go(false)} data-testid="tarik-segel">
            tarik segel untuk merevisi
          </button>
        </section>
      ) : (
        <section className="meja-tulis">
          <textarea className="meja-naskah" value={text} onChange={(e) => setText(e.target.value)} placeholder={`Tulis adegan ${seat.tokoh} di sini…`} rows={9} data-testid="naskah" />
          <span className={`tiny ${n >= STORY_WORDS.min && n <= STORY_WORDS.max ? 'ink' : 'soft'}`}>
            {n} kata · panduan {STORY_WORDS.min}–{STORY_WORDS.max}
          </span>
          <div className="meja-jejak">
            <span className="label">satu jejak yang kutinggalkan</span>
            <input className="field" value={what} maxLength={160} onChange={(e) => setWhat(e.target.value)} placeholder="benda, keputusan, atau kalimat. mis. kunci tertinggal di meja" data-testid="jejak-apa" />
            <input className="field" value={knownBy} maxLength={120} onChange={(e) => setKnownBy(e.target.value)} placeholder="siapa yang masuk akal mengetahuinya?" />
            <input className="field" value={question} maxLength={160} onChange={(e) => setQuestion(e.target.value)} placeholder="satu pertanyaan untuk penulis berikutnya" data-testid="jejak-tanya" />
            {role ? <input className="field" value={proof} maxLength={200} onChange={(e) => setProof(e.target.value)} placeholder="opsional: baris yang menunjukkan batasanmu dimainkan" /> : null}
          </div>
          <button className="segel-btn" disabled={busy || !text.trim()} onClick={() => void go(true)} data-testid="segel-bagian">
            <span className="lak">
              <Doodle id="tunas" size={26} color="currentColor" sw={3} />
            </span>
            segel bagianku
          </button>
          <p className="tiny soft center" style={{ margin: 0 }}>Drafmu tersimpan di perangkat ini. Setelah disegel, kamu masih bisa menariknya selama belum semua menyegel.</p>
        </section>
      )}
    </>
  );
}

function Parts({ st, round, premise, open, name, face, meId, agreed, onAgree, credits }: { st: StoryWire; round: number; premise: NonNullable<ReturnType<typeof storyPremise>>; open: Opener; name: (u: string) => string; face: (u: string) => string; meId: string; agreed: (p: StoryPartWire | undefined) => boolean; onAgree?: (p: StoryPartWire) => void; credits?: boolean }) {
  return (
    <div className="meja-bagian">
      {st.members.map((m, i) => {
        const p = st.parts.find((x) => x.round === round && x.authorId === m);
        const body = open(p);
        const seat = storySeat(premise, round, i, st.members.length);
        const role = credits ? storyRole(st.roles[m]) : undefined;
        if (!p) return null;
        return (
          <article key={m} className="bagian" style={{ '--n': i } as CSSProperties} data-testid="bagian">
            <header>
              <span className="rupa-hand">{seat.tokoh}</span>
              <span className="bagian-oleh">
                <Avatar doodle={face(m)} size={20} /> {name(m)}
                {role ? <em>{role.name}</em> : null}
              </span>
            </header>
            <p className="bagian-teks">{body ? body.text : 'Bagian ini belum bisa dibuka di perangkat ini.'}</p>
            {body?.trace ? (
              <div className={`bagian-jejak ${agreed(p) ? 'sah' : ''}`}>
                <span className="tiny">jejak{agreed(p) ? ' · disepakati' : ''}</span>
                <b>{body.trace.what}</b>
                {body.trace.question ? <span className="rupa-hand">{body.trace.question}</span> : null}
                {onAgree && m !== meId ? (
                  <button className={`pill sm ${p.agrees.includes(meId) ? 'active' : ''}`} onClick={() => onAgree(p)} data-testid="sepakat">
                    <Doodle id="ui-centang" size={14} color="currentColor" /> {p.agrees.includes(meId) ? 'kusepakati' : 'sepakati jejak ini'}
                  </button>
                ) : onAgree && st.members.length > 1 ? (
                  <span className="tiny soft">{p.agrees.length ? `disepakati ${p.agrees.map(name).join(', ')}` : 'menunggu disepakati'}</span>
                ) : null}
              </div>
            ) : null}
            {credits && body?.proof ? <p className="tiny soft bagian-bukti">batasan dimainkan di: “{body.proof}”</p> : null}
          </article>
        );
      })}
    </div>
  );
}

function Reveal({ st, premise, open, name, face, meId, agreed, onBook }: { st: StoryWire; premise: NonNullable<ReturnType<typeof storyPremise>>; open: Opener; name: (u: string) => string; face: (u: string) => string; meId: string; agreed: (p: StoryPartWire | undefined) => boolean; onBook: (title: string, body: string) => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  const rounds = premise.rounds.map((_, i) => i + 1);
  // Perjalanan jejak: satu dari tiap putaran, mendahulukan yang disepakati.
  const journey = rounds
    .map((r) => {
      const ps = st.parts.filter((p) => p.round === r);
      const p = ps.find((x) => agreed(x) && open(x)?.trace) ?? ps.find((x) => open(x)?.trace);
      return p ? { what: open(p)!.trace!.what, by: name(p.authorId) } : null;
    })
    .filter((x): x is { what: string; by: string } => !!x);
  const book = async () => {
    setBusy(true);
    const body = rounds
      .map((r) => {
        const head = `⁂ ${premise.rounds[r - 1]!.waktu}`;
        const scenes = st.members.map((m, i) => {
          const t = open(st.parts.find((p) => p.round === r && p.authorId === m))?.text;
          return t ? `${storySeat(premise, r, i, st.members.length).tokoh}\n\n${t}` : '';
        });
        return [head, ...scenes.filter(Boolean)].join('\n\n');
      })
      .join('\n\n');
    const credit = `\n\n—\nDitulis bersama oleh ${st.members.map((m) => (m === meId ? 'aku' : name(m))).join(', ')} lewat Hidup Orang Lain.`;
    await onBook(premise.title, body + credit);
    setBusy(false);
  };
  return (
    <>
      <p className="rupa-hand meja-judul">cerita ini selesai.</p>
      {journey.length ? (
        <section className="jejak-jalan" data-testid="jejak-jalan">
          <span className="label">perjalanan jejak</span>
          <ol>
            {journey.map((j, i) => (
              <li key={i} style={{ '--n': i } as CSSProperties}>
                <b>{j.what}</b>
                <span className="tiny soft">{j.by}</span>
              </li>
            ))}
          </ol>
        </section>
      ) : null}
      {rounds.map((r) => (
        <section key={r} className="section">
          <span className="label">{premise.rounds[r - 1]!.waktu}</span>
          <Parts st={st} round={r} premise={premise} open={open} name={name} face={face} meId={meId} agreed={agreed} credits />
        </section>
      ))}
      <button className="btn meja-lanjut" disabled={busy} onClick={() => void book()} data-testid="jadi-karya">
        <Doodle id="buku" size={20} color="currentColor" /> {busy ? 'merakit naskah…' : 'jadikan karya di rak'}
      </button>
      <p className="tiny soft center">Naskah dirakit sebagai draf Karya milikmu, lengkap dengan kredit. Kamu yang memutuskan kapan dan ke siapa ia diterbitkan.</p>
    </>
  );
}
