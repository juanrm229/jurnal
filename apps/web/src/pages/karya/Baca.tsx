/** Membaca satu karya: tipografi buku, catatan pembaca, dan reaksi kecil. */
import { useEffect, useState } from 'react';
import { memberName, useCircles, useMe } from '@/lib/data';
import { Prose } from '@/lib/prose';
import { back, Link, useParams } from '@/lib/router';
import { useReady } from '@/lib/session';
import { addWorkNote, countWords, KIND_INFO, useReactWork, useWork, useWorkNotes } from '@/lib/works';
import { Avatar, Doodle, Growing, useToast } from '@/ui/kit';
import { Cover } from './Cover';
import { ReadHead } from './Tulis';

const REACTS = [
  { kind: 'hug', label: 'peluk', doodle: 'ui-peluk' },
  { kind: 'me_too', label: 'aku juga', doodle: 'ui-aku-juga' },
  { kind: 'here', label: 'kena di hati', doodle: 'ui-hati' },
  { kind: 'candle', label: 'lilin', doodle: 'lilin' },
] as const;

const fmt = (iso: string) => new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(iso));

export default function Baca() {
  const { id } = useParams<{ id: string }>();
  const me = useMe();
  const { identity } = useReady();
  const { circles } = useCircles();
  const toast = useToast();
  const q = useWork(id);
  const notes = useWorkNotes(id);
  const react = useReactWork(id);
  const [note, setNote] = useState('');
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const f = () => {
      const h = document.documentElement.scrollHeight - innerHeight;
      setProgress(h > 0 ? Math.min(1, scrollY / h) : 0);
    };
    f();
    addEventListener('scroll', f, { passive: true });
    return () => removeEventListener('scroll', f);
  }, [q.data]);

  if (q.isLoading) return <Growing label="membuka halaman…" />;
  const open = q.open;
  if (!open?.work) return <main className="screen"><p className="center">Karya ini tidak bisa dibuka di perangkat ini.</p></main>;
  const { wire, work } = open;
  const mine = wire.authorId === me.user.id;
  const author = mine ? (me.user.penName ?? 'kamu') : memberName(circles, wire.authorId, me.user.id);
  const authorDoodle = mine ? me.user.doodle : (circles.flatMap((c) => c.members).find((m) => m.userId === wire.authorId)?.doodle ?? 'tunas');
  const myReacts = wire.reactions.filter((r) => r.userId === me.user.id).map((r) => r.kind);
  const words = countWords(work.body);

  const send = async () => {
    if (!note.trim()) return;
    try {
      await addWorkNote(wire.id, note.trim(), wire.circleIds, { meId: me.user.id, publicKey: identity.publicKey, circles });
      setNote('');
      void notes.refetch();
    } catch (e) {
      toast((e as Error).message);
    }
  };

  return (
    <main className="read-room">
      <div className="read-progress" style={{ transform: `scaleX(${progress})` }} />
      <header className="write-top read-bar">
        <button className="icon-btn" aria-label="kembali" onClick={() => back('/karya')}>
          <Doodle id="ui-kembali" size={22} />
        </button>
        <span className="tiny soft">{KIND_INFO[work.kind].name}</span>
        <span className="grow" />
        {mine ? (
          <Link to={`/karya/${wire.id}/tulis`} className="pill sm">
            <Doodle id="pena" size={16} color="currentColor" /> sunting
          </Link>
        ) : null}
      </header>

      <div className="read-cover">
        <Cover work={work} author={author} size="lg" />
      </div>

      <article className="read-paper">
        <ReadHead work={work} author={author} words={words} date={fmt(wire.publishedAt ?? wire.updatedAt)} />
        <Prose body={work.body} verse={!KIND_INFO[work.kind].prose} />
        <div className="read-end" aria-hidden>
          <Doodle id={work.cover.doodle ?? KIND_INFO[work.kind].doodle} size={40} />
        </div>
      </article>

      <section className="read-after">
        <div className="row" style={{ gap: 12, justifyContent: 'center' }}>
          <Avatar doodle={authorDoodle} size={44} sealed />
          <div>
            <div className="serif-title" style={{ fontSize: 20 }}>{author}</div>
            <div className="tiny soft">{wire.circleIds.length ? `untuk ${circles.filter((c) => wire.circleIds.includes(c.id)).map((c) => c.name).join(' · ')}` : 'hanya untuk diri sendiri'}</div>
          </div>
        </div>

        {wire.circleIds.length ? (
          <>
            <div className="react-row">
              {REACTS.map((r) => {
                const on = myReacts.includes(r.kind);
                const n = wire.reactions.filter((x) => x.kind === r.kind).length;
                return (
                  <button key={r.kind} className={on ? 'on' : ''} onClick={() => react.mutate({ kind: r.kind, on: !on })}>
                    <Doodle id={r.doodle} size={22} color="currentColor" />
                    <span>{r.label}</span>
                    {n ? <i>{n}</i> : null}
                  </button>
                );
              })}
            </div>

            <div className="notes">
              <span className="eyebrow">catatan pembaca</span>
              {notes.notes.length === 0 ? <p className="tiny soft">Belum ada. Tinggalkan satu kalimat untuk penulisnya.</p> : null}
              {notes.notes.map((n) => (
                <div key={n.wire.id} className="note">
                  <span className="note-by">{n.wire.authorId === me.user.id ? 'kamu' : memberName(circles, n.wire.authorId, me.user.id)}</span>
                  <p className="serif-italic">{n.text}</p>
                </div>
              ))}
              <div className="row">
                <input className="field grow" value={note} maxLength={400} placeholder="bagian yang paling kena buatku…" onChange={(e) => setNote(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && void send()} />
                <button className="btn auto sm" disabled={!note.trim()} onClick={() => void send()}>
                  kirim
                </button>
              </div>
            </div>
          </>
        ) : null}
      </section>
    </main>
  );
}
