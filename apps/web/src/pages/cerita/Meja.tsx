/**
 * Meja cerita: menulis bagianmu, ruang baca setelah semua menyegel, dan
 * pengungkapan di akhir. Selalu menjawab satu hal: apa yang harus kulakukan sekarang.
 */
import {
  STORY_DECK,
  STORY_FORMATS,
  STORY_FREE,
  STORY_WORDS,
  storyBabak,
  storyFormat,
  storyGiver,
  type StoryMeta,
  type StoryPartPayload,
  type StoryPartWire,
  type StoryPremise,
  storyPremise,
  storyRole,
  type StorySeat,
  storySeat,
  type StoryWire,
} from '@sehari/core';
import { type CSSProperties, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { api } from '@/lib/api';
import { memberName, newDropId, useCircles } from '@/lib/data';
import { navigate, useParams } from '@/lib/router';
import { useReady } from '@/lib/session';
import { sound } from '@/lib/sound';
import { sealPart, useOpenAny, useOpenPart, useStory, useStoryCache, wordCount } from '@/lib/stories';
import { store } from '@/lib/storage';
import { newWorkId, saveWork } from '@/lib/works';
import { Avatar, Doodle, Growing, Header, Sheet, useToast } from '@/ui/kit';

const REASON = { fakta: 'fakta', pengetahuan: 'pengetahuan tokoh', sebab: 'sebab-akibat' } as const;
type Reason = keyof typeof REASON;
type Opener = (p: StoryPartWire | undefined) => StoryPartPayload | null;

export default function Meja() {
  const { id } = useParams<{ id: string }>();
  const q = useStory(id);
  const st = q.data;
  if (!st) return q.isError ? <Growing label="cerita ini tidak ditemukan" /> : <Growing label="membuka meja…" />;
  return <Table st={st} />;
}

/** Premis siap pakai, atau premis buatan sendiri yang dibuka dari amplopnya. */
function usePremise(st: StoryWire): StoryPremise {
  const openAny = useOpenAny();
  if (st.premise !== STORY_FREE) return storyPremise(st.premise)!;
  const m = openAny<StoryMeta>(st.meta);
  return { id: STORY_FREE, title: m?.title ?? 'cerita kalian', doodle: 'pena', pitch: m?.pitch ?? '', fakta: m?.fakta ?? [], rounds: [], tokoh: m?.tokoh ?? [] } as StoryPremise & { tokoh: string[] };
}

function Table({ st }: { st: StoryWire }) {
  const { me, identity } = useReady();
  const meId = me.user.id;
  const { circles } = useCircles();
  const circle = circles.find((c) => c.id === st.circleId);
  const premise = usePremise(st);
  const open = useOpenPart();
  const openAny = useOpenAny();
  const cache = useStoryCache();
  const toast = useToast();
  const name = (uid: string) => memberName(circles, uid, meId);
  const face = (uid: string) => (uid === meId ? me.user.doodle : (circle?.members.find((m) => m.userId === uid)?.doodle ?? 'tunas'));
  const idx = st.members.indexOf(meId);
  const n = st.members.length;
  const main = st.parts.filter((p) => p.world === 'a');
  const partOf = (round: number, uid: string) => main.find((p) => p.round === round && p.authorId === uid);
  const solo = n === 1;
  /** Jejak sah: disepakati semua penulis lain (sendirian: selalu sah). */
  const agreed = (p: StoryPartWire | undefined) => !!p && (solo || st.members.filter((m) => m !== p.authorId).every((m) => p.agrees.includes(m)));
  /** Kursi tetap dari premis; gelombang di luar premis jadi gelombang bebas. */
  const fixed = (round: number, i: number) => (round <= premise.rounds.length ? storySeat(premise, round, i, n) : null);
  const tokohList = [...new Set([...((premise as { tokoh?: string[] }).tokoh ?? []), ...premise.rounds.flatMap((r) => r.seats.map((s) => s.tokoh))])];
  const waktuOf = (round: number) => premise.rounds[round - 1]?.waktu ?? `gelombang ${round}`;
  const fmt = STORY_FORMATS[storyFormat(st.rounds)];
  const babak = st.rounds > 3 ? ` · babak ${storyBabak(st.rounds, st.round) + 1}` : '';
  const seal = (value: unknown) => sealPart(value, circle, { id: meId, publicKey: identity.publicKey });
  const run = async (f: () => Promise<StoryWire>) => {
    try {
      cache(await f());
    } catch (e) {
      toast((e as Error).message);
    }
  };
  const sealedNow = st.members.filter((m) => partOf(st.round, m)?.sealed);
  const iSealed = sealedNow.includes(meId);
  const [noteFor, setNoteFor] = useState<StoryPartWire | null>(null);

  // Jejak masuk: dari penulis sebelumku; kalau ia dilewati, jejak sah lain dari gelombang lalu.
  const handed = (() => {
    if (st.round === 1) return null;
    const giver = storyGiver(st.members, idx);
    const prev = main.filter((p) => p.round === st.round - 1);
    const p = [prev.find((x) => x.authorId === giver), ...prev].find((x) => agreed(x) && open(x)?.trace);
    return { from: !p ? '' : solo ? 'kamu sendiri, gelombang lalu' : name(p.authorId), trace: p ? open(p)?.trace : undefined, fakta: premise.fakta };
  })();

  return (
    <main className="screen cerita meja" data-phase={st.phase}>
      <Header title={premise.title} sub={st.phase === 'done' ? `${fmt.name} · selesai` : `${fmt.name} · gelombang ${st.round} dari ${st.rounds}${babak} · ${waktuOf(st.round)}`} backTo="/cerita" />

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
          <i className="tiny soft">{st.phase === 'write' ? `${sealedNow.length} dari ${n} bagian siap` : `${st.ready.length} dari ${n} selesai membaca`}</i>
        </div>
      ) : null}

      {st.phase === 'write' ? (
        <>
          <Write
            key={st.round}
            st={st}
            mine={partOf(st.round, meId)}
            seat={fixed(st.round, idx)}
            tokohList={tokohList}
            waktu={waktuOf(st.round)}
            role={storyRole(st.roles[meId])}
            handed={handed}
            open={open}
            onSave={(payload, s) => run(() => api.put<StoryWire>(`/stories/${st.id}/parts`, { round: st.round, envelope: seal(payload), seal: s }))}
          />
          {iSealed && n > 1 && sealedNow.length < n ? (
            <section className="meja-lewati" data-testid="lewati">
              <p className="small soft">
                Menunggu {st.members.filter((m) => !sealedNow.includes(m)).map(name).join(', ')}. Tidak ada tenggat. Kalau semua yang sudah menyegel setuju, gelombang ini bisa lanjut tanpa bagian mereka.
              </p>
              <button className={`pill ${st.skips.includes(meId) ? 'active' : ''}`} disabled={st.skips.includes(meId)} onClick={() => run(() => api.post<StoryWire>(`/stories/${st.id}/skip`))} data-testid="usul-lewati">
                {st.skips.includes(meId) ? `kamu setuju · ${st.skips.length} dari ${sealedNow.length}` : 'setuju lanjut tanpa mereka'}
              </button>
            </section>
          ) : null}
        </>
      ) : null}

      {st.phase === 'read' ? (
        <>
          <p className="rupa-hand meja-judul">{st.mode === 'kejutan' ? 'jejak-jejaknya sudah terbuka.' : 'semua bagian sudah terbuka.'}</p>
          <p className="small soft" style={{ margin: '0 0 12px' }}>
            {st.mode === 'kejutan' ? 'Adegan penuh menunggu pengungkapan. Sepakati jejak yang masuk akal dipakai lagi.' : 'Baca bagian yang lain, lalu sepakati jejak yang masuk akal dipakai lagi.'} Jejak yang disepakati semua penulis jadi bahan gelombang berikutnya. Ada yang janggal? Sanggah bagiannya.
          </p>
          <Parts st={st} round={st.round} fixed={fixed} open={open} openAny={openAny} name={name} face={face} meId={meId} agreed={agreed} hideText={st.mode === 'kejutan'} onAgree={(p) => run(() => api.put<StoryWire>(`/stories/${st.id}/parts/${p.id}/agree`))} onNote={setNoteFor} />
          <button className="btn meja-lanjut" disabled={st.ready.includes(meId) || !partOf(st.round, meId)} onClick={() => run(() => api.post<StoryWire>(`/stories/${st.id}/ready`))} data-testid="cerita-lanjut">
            {!partOf(st.round, meId) ? 'gelombang ini dilanjutkan tanpa bagianmu' : st.ready.includes(meId) ? 'menunggu yang lain…' : st.round >= st.rounds ? 'buka seluruh cerita' : `lanjut ke gelombang ${st.round + 1}`}
          </button>
        </>
      ) : null}

      {st.phase === 'done' ? (
        <Reveal
          st={st}
          premise={premise}
          fixed={fixed}
          waktuOf={waktuOf}
          open={open}
          openAny={openAny}
          name={name}
          face={face}
          meId={meId}
          agreed={agreed}
          onNote={setNoteFor}
          onBranch={(round, payload) => run(() => api.put<StoryWire>(`/stories/${st.id}/branch`, { round, envelope: seal(payload) }))}
          onBook={async (title, body) => {
            try {
              const w = await saveWork(newWorkId(), { v: 1, kind: st.rounds > 3 ? 'catatan' : 'cerpen', title, subtitle: 'Hidup Orang Lain', body, cover: { tone: 'tinta', doodle: premise.doodle } }, 'draft', [], { meId, publicKey: identity.publicKey, circles });
              navigate(`/karya/${w.id}/tulis`);
            } catch (e) {
              toast((e as Error).message);
            }
          }}
        />
      ) : null}

      <NoteSheet part={noteFor} onClose={() => setNoteFor(null)} onSend={(reason, text) => run(() => api.post<StoryWire>(`/stories/${st.id}/parts/${noteFor!.id}/notes`, { id: newDropId(), reason, envelope: seal({ v: 1, text }) })).then(() => setNoteFor(null))} />
    </main>
  );
}

function Write({ st, mine, seat, tokohList, waktu, role, handed, open, onSave }: { st: StoryWire; mine: StoryPartWire | undefined; seat: StorySeat | null; tokohList: string[]; waktu: string; role: ReturnType<typeof storyRole>; handed: { from: string; trace?: StoryPartPayload['trace']; fakta: string[] } | null; open: Opener; onSave: (p: StoryPartPayload, seal: boolean) => Promise<void> }) {
  const key = `cerita.${st.id}.${st.round}`;
  const saved = open(mine) ?? store.json<StoryPartPayload>(key);
  const [text, setText] = useState(saved?.text ?? '');
  const [what, setWhat] = useState(saved?.trace?.what ?? '');
  const [knownBy, setKnownBy] = useState(saved?.trace?.knownBy ?? '');
  const [question, setQuestion] = useState(saved?.trace?.question ?? '');
  const [proof, setProof] = useState(saved?.proof ?? '');
  const [tokoh, setTokoh] = useState(saved?.seat?.tokoh ?? '');
  const [kapan, setKapan] = useState(saved?.seat?.waktu ?? '');
  const [busy, setBusy] = useState(false);
  const [flip, setFlip] = useState(false);
  const free = !seat;
  const payload: StoryPartPayload = {
    v: 1,
    text: text.trim(),
    trace: what.trim() ? { what: what.trim(), knownBy: knownBy.trim(), question: question.trim() } : undefined,
    proof: proof.trim() || undefined,
    seat: free ? { tokoh: tokoh.trim() || 'tanpa nama', waktu: kapan.trim() } : undefined,
  };
  // Draf disimpan di perangkat tiap ketikan, supaya tidak hilang kalau aplikasi tertutup.
  useEffect(() => {
    if (!mine?.sealed) store.set(key, JSON.stringify(payload));
  }, [text, what, knownBy, question, proof, tokoh, kapan]);
  const words = wordCount(text);
  const sealed = !!mine?.sealed;
  const go = async (s: boolean) => {
    setBusy(true);
    if (s) {
      sound.play('seal');
      navigator.vibrate?.(20);
    }
    await onSave(payload, s);
    setBusy(false);
  };

  return (
    <>
      <section className="kartu-prompt" data-testid="kartu-prompt">
        {seat ? (
          <>
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
          </>
        ) : (
          <>
            <span className="kp-tokoh rupa-hand">{tokoh || 'tokohmu'}</span>
            <p className="kp-posisi">Gelombang bebas: pilih tokoh dan waktunya sendiri. Ingat batas pengetahuan tokohmu, dan tinggalkan satu keputusan untuk orang lain.</p>
            {!sealed ? (
              <div className="col" style={{ gap: 8 }}>
                <div className="row wrap" style={{ gap: 6 }}>
                  {tokohList.map((t) => (
                    <button key={t} className={`pill sm ${tokoh === t ? 'active' : ''}`} onClick={() => setTokoh(t)}>
                      {t}
                    </button>
                  ))}
                </div>
                <input className="field" value={tokoh} maxLength={40} onChange={(e) => setTokoh(e.target.value)} placeholder="atau tokoh baru" data-testid="tokoh-bebas" />
                <input className="field" value={kapan} maxLength={60} onChange={(e) => setKapan(e.target.value)} placeholder={`kapan? mis. ${waktu === `gelombang ${st.round}` ? 'dua tahun kemudian' : waktu}`} />
              </div>
            ) : null}
          </>
        )}
        {handed ? (
          <div className="kp-jejak" data-testid="jejak-masuk">
            {handed.trace ? (
              <>
                <span className="tiny">jejak dari {handed.from}</span>
                <b>{handed.trace.what}</b>
                {handed.trace.question ? <span className="rupa-hand">{handed.trace.question}</span> : null}
                {handed.trace.knownBy ? <span className="tiny soft">yang bisa tahu: {handed.trace.knownBy}</span> : null}
              </>
            ) : (
              <span className="small">Belum ada jejak yang disepakati. Pakai fakta pembuka: {handed.fakta.join(' ') || 'premis kalian.'}</span>
            )}
          </div>
        ) : null}
      </section>

      {role ? (
        <button className={`kartu-role ${flip ? 'flip' : ''}`} onClick={() => setFlip(!flip)} aria-expanded={flip} data-testid="kartu-role">
          <span className="kr-head">
            <Doodle id={role.doodle} size={30} />
            <span>
              <span className="tiny">kartu role-mu · {role.tier} · hanya kamu yang lihat</span>
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
                <i>keuntungan · {role.kind.replace('-', ' ')}</i>
                {role.keuntungan}
              </span>
              <span className="kr-row soft">
                <i>contoh</i>
                {role.contoh}
              </span>
              <span className="kr-row soft">
                <i>latihan</i>
                {role.latihan}
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
          <textarea className="meja-naskah" value={text} onChange={(e) => setText(e.target.value)} placeholder={`Tulis adegan ${seat?.tokoh ?? (tokoh || 'tokohmu')} di sini…`} rows={9} data-testid="naskah" />
          <span className={`tiny ${words >= STORY_WORDS.min && (st.rounds > 3 || words <= STORY_WORDS.max) ? 'ink' : 'soft'}`}>
            {words} kata · panduan {st.rounds > 3 ? `minimal ${STORY_WORDS.min}` : `${STORY_WORDS.min}–${STORY_WORDS.max}`}
          </span>
          <div className="meja-jejak">
            <span className="label">satu jejak yang kutinggalkan</span>
            <input className="field" value={what} maxLength={160} onChange={(e) => setWhat(e.target.value)} placeholder="benda, keputusan, atau kalimat. mis. kunci tertinggal di meja" data-testid="jejak-apa" />
            <input className="field" value={knownBy} maxLength={120} onChange={(e) => setKnownBy(e.target.value)} placeholder="siapa yang masuk akal mengetahuinya?" />
            <input className="field" value={question} maxLength={160} onChange={(e) => setQuestion(e.target.value)} placeholder="satu pertanyaan untuk penulis berikutnya" data-testid="jejak-tanya" />
            {role ? <input className="field" value={proof} maxLength={200} onChange={(e) => setProof(e.target.value)} placeholder="opsional: baris yang menunjukkan batasanmu dimainkan" /> : null}
          </div>
          <button className="segel-btn" disabled={busy || !text.trim() || (free && !tokoh.trim())} onClick={() => void go(true)} data-testid="segel-bagian">
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

interface PartsProps {
  st: StoryWire;
  round: number;
  fixed: (round: number, i: number) => StorySeat | null;
  open: Opener;
  openAny: ReturnType<typeof useOpenAny>;
  name: (u: string) => string;
  face: (u: string) => string;
  meId: string;
  agreed: (p: StoryPartWire | undefined) => boolean;
  world?: string;
  hideText?: boolean;
  credits?: boolean;
  onAgree?: (p: StoryPartWire) => void;
  onNote?: (p: StoryPartWire) => void;
}

/** Nama tokoh sebuah bagian: dari kursi premis, atau yang dipilih penulisnya. */
const tokohOf = (st: StoryWire, p: StoryPartWire, body: StoryPartPayload | null, fixed: PartsProps['fixed']) => body?.seat?.tokoh ?? fixed(p.round, st.members.indexOf(p.authorId))?.tokoh ?? 'tokoh';

function Parts({ st, round, fixed, open, openAny, name, face, meId, agreed, world = 'a', hideText, credits, onAgree, onNote }: PartsProps) {
  const rolesAt = (uid: string) => (credits ? storyRole(([...st.rolesLog, st.roles][storyBabak(st.rounds, round)] ?? st.roles)[uid]) : undefined);
  const list = st.parts.filter((x) => x.round === round && x.world === world);
  return (
    <div className="meja-bagian">
      {list.map((p, i) => {
        const m = p.authorId;
        const body = open(p);
        const role = rolesAt(m);
        const notes = st.notes.filter((x) => x.partId === p.id);
        return (
          <article key={p.id} className="bagian" style={{ '--n': i } as CSSProperties} data-testid="bagian">
            <header>
              <span className="rupa-hand">{tokohOf(st, p, body, fixed)}</span>
              <span className="bagian-oleh">
                <Avatar doodle={face(m)} size={20} /> {name(m)}
                {role ? <em>{role.name}</em> : null}
              </span>
            </header>
            {body?.seat?.waktu ? <span className="tiny soft">{body.seat.waktu}</span> : null}
            {hideText && m !== meId ? (
              <p className="bagian-teks bagian-tutup">Adegan ini terbuka di pengungkapan.</p>
            ) : (
              <p className="bagian-teks">{body ? body.text : 'Bagian ini belum bisa dibuka di perangkat ini.'}</p>
            )}
            {body?.trace ? (
              <div className={`bagian-jejak ${agreed(p) ? 'sah' : ''}`}>
                <span className="tiny">{world === 'a' ? `jejak${agreed(p) ? ' · disepakati' : ''}` : 'keputusan yang berubah'}</span>
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
            {notes.length ? (
              <ul className="bagian-sanggah">
                {notes.map((x) => (
                  <li key={x.id}>
                    <span className="tiny">
                      {name(x.authorId)} · {REASON[x.reason]}
                    </span>
                    {openAny<{ text: string }>(x.envelope)?.text ?? '…'}
                  </li>
                ))}
              </ul>
            ) : null}
            {onNote && m !== meId && world === 'a' ? (
              <button className="bagian-sanggah-btn tiny" onClick={() => onNote(p)} data-testid="sanggah">
                sanggah bagian ini
              </button>
            ) : null}
          </article>
        );
      })}
    </div>
  );
}

function NoteSheet({ part, onClose, onSend }: { part: StoryPartWire | null; onClose: () => void; onSend: (r: Reason, text: string) => Promise<void> }) {
  const [reason, setReason] = useState<Reason>('fakta');
  const [text, setText] = useState('');
  useEffect(() => {
    if (part) setText('');
  }, [part?.id]);
  return (
    <Sheet open={!!part} onClose={onClose} title="sanggah">
      <div className="col" style={{ gap: 12 }}>
        <p className="small soft" style={{ margin: 0 }}>Tawarkan satu pertanyaan atau alternatif kalimat. Penulisnya tetap yang memutuskan perubahan pada prosanya.</p>
        <div className="row wrap" style={{ gap: 6 }}>
          {(Object.keys(REASON) as Reason[]).map((r) => (
            <button key={r} className={`pill ${reason === r ? 'active' : ''}`} onClick={() => setReason(r)}>
              {REASON[r]}
            </button>
          ))}
        </div>
        <textarea className="field" rows={3} maxLength={400} value={text} onChange={(e) => setText(e.target.value)} placeholder="mis. Dari mana Dina tahu Bapak yang menyalakan lampu?" data-testid="sanggah-isi" />
        <button className="btn" disabled={!text.trim()} onClick={() => void onSend(reason, text.trim())} data-testid="sanggah-kirim">
          kirim sanggahan
        </button>
      </div>
    </Sheet>
  );
}

interface RevealProps {
  st: StoryWire;
  premise: StoryPremise;
  fixed: PartsProps['fixed'];
  waktuOf: (round: number) => string;
  open: Opener;
  openAny: ReturnType<typeof useOpenAny>;
  name: (u: string) => string;
  face: (u: string) => string;
  meId: string;
  agreed: (p: StoryPartWire | undefined) => boolean;
  onNote: (p: StoryPartWire) => void;
  onBranch: (round: number, p: StoryPartPayload) => Promise<void>;
  onBook: (title: string, body: string) => Promise<void>;
}

function Reveal({ st, premise, fixed, waktuOf, open, openAny, name, face, meId, agreed, onNote, onBranch, onBook }: RevealProps) {
  const [busy, setBusy] = useState(false);
  const [branch, setBranch] = useState(false);
  const [printing, setPrinting] = useState(false);
  const rounds = Array.from({ length: st.rounds }, (_, i) => i + 1);
  const main = st.parts.filter((p) => p.world === 'a');
  const branches = st.parts.filter((p) => p.world !== 'a');
  // Perjalanan jejak: satu dari tiap gelombang, mendahulukan yang disepakati.
  // Jejak berpindah tangan: tiap gelombang mendahulukan penulis yang berbeda dari gelombang sebelumnya.
  const journey: { what: string; by: string; round: number }[] = [];
  let lastBy = '';
  for (const r of rounds) {
    const ps = main.filter((p) => p.round === r && open(p)?.trace).sort((x, y) => Number(agreed(y)) - Number(agreed(x)) || Number(x.authorId === lastBy) - Number(y.authorId === lastBy));
    const p = ps[0];
    if (!p) continue;
    lastBy = p.authorId;
    journey.push({ what: open(p)!.trace!.what, by: name(p.authorId), round: r });
  }
  const scenesOf = (r: number) =>
    main
      .filter((p) => p.round === r)
      .map((p) => {
        const b = open(p);
        return b ? { tokoh: tokohOf(st, p, b, fixed), waktu: b.seat?.waktu, text: b.text, by: p.authorId } : null;
      })
      .filter((x): x is NonNullable<typeof x> => !!x);
  const credit = `Ditulis bersama oleh ${st.members.map((m) => (m === meId ? 'aku' : name(m))).join(', ')} lewat Hidup Orang Lain.`;
  const book = async () => {
    setBusy(true);
    const body = rounds
      .map((r) => [`⁂ ${waktuOf(r)}`, ...scenesOf(r).map((s) => `${s.tokoh}${s.waktu ? ` · ${s.waktu}` : ''}\n\n${s.text}`)].join('\n\n'))
      .join('\n\n');
    await onBook(premise.title, `${body}\n\n—\n${credit}`);
    setBusy(false);
  };
  useEffect(() => {
    if (!printing) return;
    const t = window.setTimeout(() => {
      window.print();
      setPrinting(false);
    }, 120);
    return () => window.clearTimeout(t);
  }, [printing]);

  return (
    <>
      <p className="rupa-hand meja-judul">cerita ini selesai.</p>
      {premise.pitch ? <p className="small soft" style={{ margin: '0 0 12px' }}>{premise.pitch}</p> : null}
      <Awards st={st} main={main} branches={branches} journey={journey} open={open} name={name} face={face} meId={meId} agreed={agreed} />

      {rounds.map((r) => (
        <section key={r} className="section">
          <span className="label">
            {st.rounds > 3 && (r - 1) % STORY_FORMATS[storyFormat(st.rounds)].babak === 0 ? `babak ${storyBabak(st.rounds, r) + 1} · ` : ''}
            {waktuOf(r)}
          </span>
          <Parts st={st} round={r} fixed={fixed} open={open} openAny={openAny} name={name} face={face} meId={meId} agreed={agreed} credits onNote={onNote} />
          {branches.some((b) => b.round === r) ? (
            <div className="jalan-lain">
              <span className="label">jalan lain</span>
              <Parts st={st} round={r} world="b" fixed={fixed} open={open} openAny={openAny} name={name} face={face} meId={meId} agreed={() => false} />
            </div>
          ) : null}
        </section>
      ))}

      <div className="col meja-lanjut" style={{ gap: 10 }}>
        <button className="btn" disabled={busy} onClick={() => void book()} data-testid="jadi-karya">
          <Doodle id="buku" size={20} color="currentColor" /> {busy ? 'merakit naskah…' : 'jadikan karya di rak'}
        </button>
        <div className="row" style={{ gap: 8 }}>
          <button className="btn soft grow" onClick={() => setBranch(true)} data-testid="jalan-lain">
            <Doodle id="peta" size={18} /> tulis jalan lain
          </button>
          <button className="btn soft grow" onClick={() => setPrinting(true)} data-testid="cetak">
            <Doodle id="ui-unduh" size={18} /> cetak / PDF
          </button>
        </div>
      </div>
      <p className="tiny soft center">Naskah dirakit sebagai draf Karya milikmu, lengkap dengan kredit. Kamu yang memutuskan kapan dan ke siapa ia diterbitkan.</p>

      <BranchSheet open={branch} rounds={rounds} waktuOf={waktuOf} onClose={() => setBranch(false)} onSend={async (r, p) => { await onBranch(r, p); setBranch(false); }} />

      {printing
        ? createPortal(
            <div className="print-sheet">
              <header className="ps-head">
                <div className="ps-brand">Hidup Orang Lain · Sehari</div>
                <h1>{premise.title}</h1>
                <p>{credit}</p>
              </header>
              {rounds.map((r) => (
                <section key={r}>
                  <p className="ps-prompt">⁂ {waktuOf(r)}</p>
                  {scenesOf(r).map((s, i) => (
                    <div key={i} className="ps-item">
                      <time>
                        {s.tokoh}
                        {s.waktu ? ` · ${s.waktu}` : ''} · {s.by === meId ? 'aku' : name(s.by)}
                      </time>
                      <p className="ps-text">{s.text}</p>
                    </div>
                  ))}
                </section>
              ))}
              <p className="ps-foot">dicetak dari Sehari</p>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

function BranchSheet({ open, rounds, waktuOf, onClose, onSend }: { open: boolean; rounds: number[]; waktuOf: (r: number) => string; onClose: () => void; onSend: (r: number, p: StoryPartPayload) => Promise<void> }) {
  const [round, setRound] = useState(rounds[0] ?? 1);
  const [what, setWhat] = useState('');
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  return (
    <Sheet open={open} onClose={onClose} title="jalan lain">
      <div className="col" style={{ gap: 12 }}>
        <p className="small soft" style={{ margin: 0 }}>Satu keputusan yang berubah, satu detail bersama yang tetap berlaku, dan satu akibat yang terlihat. Fakta sebelum percabangan tetap berlaku.</p>
        <span className="label">bercabang di</span>
        <div className="row wrap" style={{ gap: 6 }}>
          {rounds.map((r) => (
            <button key={r} className={`pill sm ${round === r ? 'active' : ''}`} onClick={() => setRound(r)}>
              {waktuOf(r)}
            </button>
          ))}
        </div>
        <input className="field" value={what} maxLength={160} onChange={(e) => setWhat(e.target.value)} placeholder="keputusan yang berubah. mis. Dina meminta sopir berhenti" data-testid="cabang-apa" />
        <textarea className="meja-naskah" rows={6} value={text} onChange={(e) => setText(e.target.value)} placeholder="tulis adegan di dunia yang lain…" data-testid="cabang-isi" />
        <button
          className="btn"
          disabled={busy || !text.trim() || !what.trim()}
          onClick={async () => {
            setBusy(true);
            await onSend(round, { v: 1, text: text.trim(), trace: { what: what.trim(), knownBy: '', question: '' } });
            setBusy(false);
            setText('');
            setWhat('');
          }}
          data-testid="cabang-kirim">
          simpan jalan lain
        </button>
      </div>
    </Sheet>
  );
}

/** Kartu berikutnya di kelompok yang sama: hadiah untuk cerita berikutnya. */
function nextCard(id: string) {
  const i = STORY_DECK.findIndex((r) => r.id === id);
  const group = Math.floor(i / 8);
  return STORY_DECK[group * 8 + ((i % 8) + 1) % 8];
}

/** Penghargaan bersama dan potret tiap penulis, hanya dari hal yang benar-benar ada di cerita. */
function Awards({ st, main, branches, journey, open, name, face, meId, agreed }: { st: StoryWire; main: StoryPartWire[]; branches: StoryPartWire[]; journey: { what: string; by: string; round: number }[]; open: Opener; name: (u: string) => string; face: (u: string) => string; meId: string; agreed: (p: StoryPartWire | undefined) => boolean }) {
  const awards: { title: string; doodle: string; body: string }[] = [];
  const sah = main.filter((p) => agreed(p) && open(p)?.trace);
  if (journey.length >= 2) awards.push({ title: 'Satu Benda, Banyak Kehidupan', doodle: 'kunci', body: `${journey[0]!.what} → ${journey[journey.length - 1]!.what}` });
  const note = st.notes[0];
  if (note) awards.push({ title: 'Sanggahan yang Membuka Adegan', doodle: 'gelembung-kata', body: `${name(note.authorId)} mempertanyakan ${REASON[note.reason]} di bagian ${name(main.find((p) => p.id === note.partId)?.authorId ?? '')}.` });
  if (branches.length) awards.push({ title: 'Jalan Pulang yang Lain', doodle: 'peta', body: open(branches[0])?.trace?.what ?? 'Satu keputusan berubah, dan dunianya ikut berubah.' });
  const allRoles = [...st.rolesLog, st.roles];
  const writers = st.members.map((m) => {
    const mine = main.filter((p) => p.authorId === m);
    const words = mine.reduce((a, p) => a + wordCount(open(p)?.text ?? ''), 0);
    const kept = sah.filter((p) => p.authorId === m).length;
    const roles = [...new Set(allRoles.map((r) => r[m]).filter(Boolean))].map((id) => storyRole(id)!).filter(Boolean);
    const last = roles[roles.length - 1];
    return { m, parts: mine.length, words, kept, roles, gift: last ? nextCard(last.id) : undefined };
  });
  return (
    <>
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
      {awards.length ? (
        <section className="section">
          <span className="label">penghargaan</span>
          <div className="col" style={{ gap: 8 }}>
            {awards.map((a, i) => (
              <div key={a.title} className="award" style={{ '--n': i } as CSSProperties} data-testid="penghargaan">
                <Doodle id={a.doodle} size={30} draw={0.3 + i * 0.2} />
                <span>
                  <b>{a.title}</b>
                  <span className="small">{a.body}</span>
                </span>
              </div>
            ))}
          </div>
        </section>
      ) : null}
      <section className="section">
        <span className="label">potret penulis</span>
        <div className="potret">
          {writers.map((w, i) => (
            <div key={w.m} className="card potret-k" style={{ '--n': i } as CSSProperties} data-testid="potret">
              <span className="row" style={{ gap: 8 }}>
                <Avatar doodle={face(w.m)} size={28} />
                <b>{name(w.m)}</b>
              </span>
              <span className="tiny soft">
                {w.parts} bagian · {w.words} kata · {w.kept} jejak dipakai lagi
              </span>
              {w.roles.length ? <span className="tiny">{w.roles.map((r) => r.name).join(' → ')}</span> : null}
              {w.m === meId && w.gift ? (
                <span className="potret-hadiah">
                  <i>kartu untuk cerita berikutnya</i>
                  <b>{w.gift.name}</b>
                  <span className="tiny">{w.gift.batasan}</span>
                </span>
              ) : null}
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
