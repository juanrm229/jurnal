/**
 * Daftar Mimpi Bersama: hal-hal yang ingin dilakukan lingkaran ini suatu hari.
 * Satu ketukan menjadikannya janji temu; setelah terwujud, mimpi itu menyimpan
 * tautan ke cerita dan foto kencannya.
 */
import { DREAM_CATEGORIES, DREAM_IDEAS, DREAM_WHEN_LABEL, type DreamCategory, type DreamWhen } from '@sehari/core';
import { type CSSProperties, useMemo, useState } from 'react';
import { memberName, useCircle, useCircles, useMe } from '@/lib/data';
import { addDream, deleteDream, type DreamPayload, likeDream, type OpenDream, setDreamDone, useDreams, useRefreshDreams } from '@/lib/dreams';
import { Link, navigate, useParams } from '@/lib/router';
import { useSession } from '@/lib/session';
import { sound } from '@/lib/sound';
import { Avatar, Confetti, Doodle, Empty, Growing, Header, Sheet, useToast } from '@/ui/kit';

type Filter = 'belum' | 'terwujud' | DreamCategory;
const WHENS: DreamWhen[] = ['segera', 'tahun-ini', 'suatu-hari'];
const catOf = (id: DreamCategory | undefined) => DREAM_CATEGORIES.find((c) => c.id === id) ?? DREAM_CATEGORIES[5]!;

export default function Mimpi() {
  const { id = '' } = useParams<{ id: string }>();
  const circle = useCircle(id);
  const { circles } = useCircles();
  const me = useMe();
  const { identity } = useSession();
  const toast = useToast();
  const { dreams, isLoading } = useDreams(id);
  const refresh = useRefreshDreams(id);
  const [filter, setFilter] = useState<Filter>('belum');
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState<DreamPayload>({ v: 1, title: '', cat: 'jalan', when: 'tahun-ini' });
  const [idea, setIdea] = useState(() => Math.floor(Math.random() * DREAM_IDEAS.length));
  const [busy, setBusy] = useState(false);
  const [party, setParty] = useState(false);
  const [open, setOpen] = useState<OpenDream | null>(null);

  const done = dreams.filter((d) => d.wire.doneAt);
  const shown = useMemo(() => {
    const xs = dreams.filter((d) => (filter === 'terwujud' ? d.wire.doneAt : filter === 'belum' ? !d.wire.doneAt : !d.wire.doneAt && d.data?.cat === filter));
    // Yang paling banyak "ikut mau" naik ke atas.
    return xs.sort((a, b) => b.wire.likes.length - a.wire.likes.length || a.wire.createdAt.localeCompare(b.wire.createdAt));
  }, [dreams, filter]);

  if (!circle) return <Growing />;
  const meCtx = identity ? { id: me.user.id, publicKey: identity.publicKey } : null;
  const name = (uid: string) => (uid === me.user.id ? 'kamu' : memberName(circles, uid, me.user.id));
  const doodleOf = (uid: string) => circle.members.find((m) => m.userId === uid)?.doodle ?? 'tunas';

  const save = async () => {
    if (!meCtx || !draft.title.trim()) return;
    setBusy(true);
    try {
      await addDream(circle, { ...draft, title: draft.title.trim(), note: draft.note?.trim() || undefined }, meCtx);
      await refresh();
      sound.play('pop');
      setAdding(false);
      setDraft({ v: 1, title: '', cat: draft.cat, when: draft.when });
      setFilter('belum');
    } catch (e) {
      toast((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const act = async (fn: () => Promise<unknown>) => {
    try {
      await fn();
      await refresh();
    } catch (e) {
      toast((e as Error).message);
    }
  };
  const nextIdea = () => {
    const i = (idea + 1 + Math.floor(Math.random() * 7)) % DREAM_IDEAS.length;
    setIdea(i);
    setDraft((d) => ({ ...d, title: DREAM_IDEAS[i]!.text, cat: DREAM_IDEAS[i]!.cat }));
    sound.play('tap');
  };
  const pct = dreams.length ? Math.round((done.length / dreams.length) * 100) : 0;

  return (
    <main className="screen mimpi">
      {party ? <Confetti count={34} /> : null}
      <Header title="daftar mimpi" sub={circle.name} backTo={`/l/${id}`} />

      <section className="mimpi-hero">
        <div className="mimpi-jar" style={{ '--fill': `${Math.max(6, pct)}%` } as CSSProperties} aria-hidden>
          <span className="mimpi-jar-lid" />
          <span className="mimpi-jar-fill" />
          {done.slice(0, 9).map((d, i) => (
            <span key={d.wire.id} className="mimpi-star" style={{ left: `${18 + ((i * 29) % 64)}%`, bottom: `${8 + ((i * 17) % 42)}%`, animationDelay: `${i * 0.3}s` }}>
              ✦
            </span>
          ))}
        </div>
        <div className="col" style={{ gap: 4 }}>
          <span className="mimpi-count">
            <b>{done.length}</b> dari {dreams.length || 0} terwujud
          </span>
          <span className="small ink-soft">{dreams.length ? 'Tiap mimpi yang terwujud jadi bintang di toples.' : 'Tulis hal-hal yang ingin kalian lakukan bersama, besar atau kecil.'}</span>
          <button className="btn mt auto" onClick={() => setAdding(true)} data-testid="dream-add">
            <Doodle id="ui-tambah" size={18} color="currentColor" /> tambah mimpi
          </button>
        </div>
      </section>

      <div className="chip-row mt">
        {(['belum', 'terwujud'] as const).map((f) => (
          <button key={f} className={`pill sm ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
            {f === 'belum' ? `belum · ${dreams.length - done.length}` : `terwujud · ${done.length}`}
          </button>
        ))}
        {DREAM_CATEGORIES.map((c) => (
          <button key={c.id} className={`pill sm ${filter === c.id ? 'active' : ''}`} onClick={() => setFilter(c.id)}>
            {c.name}
          </button>
        ))}
      </div>

      {isLoading ? (
        <Growing />
      ) : shown.length === 0 ? (
        <Empty
          doodle={filter === 'terwujud' ? 'bintang' : 'kompas'}
          title={filter === 'terwujud' ? 'Belum ada yang terwujud.' : 'Daftarnya masih kosong.'}
          body={filter === 'terwujud' ? 'Jadikan satu mimpi sebagai janji temu, lalu tandai terwujud setelah kalian melakukannya.' : 'Mulai dari yang sederhana: piknik di taman, hujan-hujanan, atau mengulang kencan pertama.'}
          action={
            filter !== 'terwujud' ? (
              <button className="btn soft auto" onClick={() => setAdding(true)}>
                tulis mimpi pertama
              </button>
            ) : undefined
          }
        />
      ) : (
        <div className="mimpi-list">
          {shown.map((d, i) => {
            const c = catOf(d.data?.cat);
            const mine = d.wire.likes.includes(me.user.id);
            return (
              <article key={d.wire.id} className={`mimpi-item rise ${d.wire.doneAt ? 'done' : ''}`} style={{ animationDelay: `${i * 0.04}s` }}>
                <button className="mimpi-main" onClick={() => setOpen(d)}>
                  <span className="mimpi-icon">
                    <Doodle id={d.wire.doneAt ? 'bintang' : c.doodle} size={26} />
                  </span>
                  <span className="grow" style={{ minWidth: 0 }}>
                    <span className="mimpi-title">{d.data?.title ?? 'mimpi terkunci'}</span>
                    <span className="tiny ink-soft">
                      {c.name}
                      {d.data?.when && !d.wire.doneAt ? ` · ${DREAM_WHEN_LABEL[d.data.when]}` : ''}
                      {d.wire.doneAt ? ` · terwujud ${new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(d.wire.doneAt))}` : ''}
                    </span>
                  </span>
                </button>
                <div className="mimpi-foot">
                  <span className="mimpi-likes">
                    {d.wire.likes.map((u) => (
                      <Avatar key={u} doodle={doodleOf(u)} size={22} title={name(u)} />
                    ))}
                  </span>
                  {!d.wire.doneAt ? (
                    <button className={`pill sm ${mine ? 'active' : ''}`} onClick={() => void act(() => likeDream(d.wire.id, !mine)).then(() => sound.play(mine ? 'tap' : 'pop'))} aria-pressed={mine}>
                      {mine ? 'aku juga mau ✓' : 'aku juga mau'}
                    </button>
                  ) : d.wire.meetId ? (
                    <Link to={`/janji/${d.wire.meetId}`} className="pill sm">
                      lihat ceritanya →
                    </Link>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      )}

      <Sheet open={adding} onClose={() => setAdding(false)} title="mimpi baru">
        <div className="col" style={{ gap: 12 }}>
          <div style={{ position: 'relative' }}>
            <textarea className="field write-like" rows={2} maxLength={120} value={draft.title} placeholder="suatu hari kita…" onChange={(e) => setDraft({ ...draft, title: e.target.value })} data-testid="dream-title" autoFocus />
            <button className="pill sm" style={{ position: 'absolute', right: 8, bottom: 10 }} onClick={nextIdea} data-sound="none">
              <Doodle id="ui-ide" size={14} color="currentColor" /> butuh ide?
            </button>
          </div>
          <span className="label">jenisnya</span>
          <div className="row wrap" style={{ gap: 6 }}>
            {DREAM_CATEGORIES.map((c) => (
              <button key={c.id} className={`pill sm ${draft.cat === c.id ? 'active' : ''}`} onClick={() => setDraft({ ...draft, cat: c.id })}>
                <Doodle id={c.doodle} size={14} color="currentColor" /> {c.name}
              </button>
            ))}
          </div>
          <span className="label">kapan kira-kira</span>
          <div className="seg">
            {WHENS.map((w) => (
              <button key={w} className={draft.when === w ? 'on' : ''} onClick={() => setDraft({ ...draft, when: w })}>
                {DREAM_WHEN_LABEL[w]}
              </button>
            ))}
          </div>
          <input className="field" maxLength={200} value={draft.note ?? ''} placeholder="catatan (opsional): kenapa ini penting?" onChange={(e) => setDraft({ ...draft, note: e.target.value })} />
          <button className="btn" disabled={!draft.title.trim() || busy} onClick={() => void save()} data-testid="dream-save">
            simpan ke daftar
          </button>
        </div>
      </Sheet>

      <Sheet open={!!open} onClose={() => setOpen(null)} title={open?.wire.doneAt ? 'sudah terwujud' : 'mimpi'}>
        {open ? (
          <div className="col" style={{ gap: 12 }}>
            <p className="mimpi-title big">{open.data?.title}</p>
            {open.data?.note ? <p className="serif-italic small" style={{ margin: 0 }}>{open.data.note}</p> : null}
            <span className="tiny ink-soft">
              ditulis {name(open.wire.authorId)} · {open.wire.likes.length} orang ingin mewujudkannya
            </span>
            {!open.wire.doneAt ? (
              <>
                <button
                  className="btn"
                  onClick={() => {
                    const d = open;
                    setOpen(null);
                    navigate(`/janji/baru?${new URLSearchParams({ circleId: id, title: d.data?.title ?? '', mimpi: d.wire.id })}`);
                  }}>
                  <Doodle id="tangan-bergandeng" size={18} color="currentColor" /> {open.wire.meetId ? 'buat janji lagi' : 'jadikan janji temu'}
                </button>
                {open.wire.meetId ? (
                  <Link to={`/janji/${open.wire.meetId}`} className="btn soft">
                    lihat janjinya
                  </Link>
                ) : null}
                <button
                  className="btn soft"
                  onClick={() => {
                    const d = open;
                    setOpen(null);
                    void act(() => setDreamDone(d.wire.id, true)).then(() => {
                      sound.play('seal');
                      setParty(true);
                      setTimeout(() => setParty(false), 2600);
                      setFilter('terwujud');
                    });
                  }}
                  data-testid="dream-done">
                  <Doodle id="bintang" size={18} color="currentColor" /> tandai terwujud
                </button>
              </>
            ) : (
              <>
                {open.wire.meetId ? (
                  <Link to={`/janji/${open.wire.meetId}`} className="btn">
                    lihat cerita & foto hari itu
                  </Link>
                ) : null}
                <button className="btn ghost" onClick={() => { const d = open; setOpen(null); void act(() => setDreamDone(d.wire.id, false)); }}>
                  belum, kembalikan ke daftar
                </button>
              </>
            )}
            {open.wire.authorId === me.user.id ? (
              <button className="btn ghost danger" onClick={() => { const d = open; setOpen(null); void act(() => deleteDream(d.wire.id)); }}>
                hapus mimpi
              </button>
            ) : null}
          </div>
        ) : null}
      </Sheet>
    </main>
  );
}
