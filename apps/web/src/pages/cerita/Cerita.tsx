/**
 * Hidup Orang Lain: daftar cerita dan membuka cerita baru. Satu orang menulis
 * apa yang terjadi, orang lain menulis apa yang ia kira terjadi.
 */
import { STORY_MAX_WRITERS, STORY_PREMISES, STORY_ROUNDS, storyPremise, type StoryWire } from '@sehari/core';
import { type CSSProperties, useState } from 'react';
import { api } from '@/lib/api';
import { memberName, useCircles, useMe } from '@/lib/data';
import { Link, navigate } from '@/lib/router';
import { newStoryId, useStories } from '@/lib/stories';
import { Avatar, Doodle, Header, Sheet, useToast } from '@/ui/kit';

const PHASE: Record<string, string> = { write: 'menulis', read: 'ruang baca', done: 'selesai' };

export default function Cerita() {
  const me = useMe();
  const toast = useToast();
  const { circles } = useCircles();
  const stories = useStories();
  const live = circles.filter((c) => c.status === 'active' && c.me?.state === 'active' && c.kind !== 'moment');
  const [open, setOpen] = useState(false);
  const [premise, setPremise] = useState(STORY_PREMISES[0]!.id);
  const [circleId, setCircleId] = useState<string | null>(null);
  const [picked, setPicked] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const circle = live.find((c) => c.id === circleId);

  const chooseCircle = (id: string | null) => {
    setCircleId(id);
    const c = live.find((x) => x.id === id);
    setPicked(c ? c.others.slice(0, STORY_MAX_WRITERS - 1).map((m) => m.userId) : []);
  };
  const create = async () => {
    setBusy(true);
    try {
      const st = await api.post<StoryWire>('/stories', { id: newStoryId(), circleId, premise, members: [me.user.id, ...picked] });
      navigate(`/cerita/${st.id}`);
    } catch (e) {
      toast((e as Error).message);
      setBusy(false);
    }
  };
  const mine = (st: StoryWire) => {
    if (st.phase === 'done') return 'baca seluruh cerita';
    if (st.phase === 'read') return st.ready.includes(me.user.id) ? 'menunggu yang lain selesai membaca' : 'giliranmu: baca dan sepakati jejak';
    const p = st.parts.find((x) => x.round === st.round && x.authorId === me.user.id);
    return p?.sealed ? 'menunggu bagian yang lain' : 'giliranmu menulis';
  };

  return (
    <main className="screen cerita">
      <Header title="hidup orang lain" sub="satu cerita, ditulis dari beberapa kepala" backTo="/main" />
      <section className="cerita-hero">
        <p className="rupa-hand">Kamu menulis apa yang terjadi. Orang lain menulis apa yang ia kira terjadi.</p>
        <p className="small soft">Tiga putaran. Tiap bagian disegel, baru terbuka setelah semua selesai, dan meninggalkan satu jejak untuk penulis berikutnya.</p>
        <button className="btn" onClick={() => setOpen(true)} data-testid="cerita-baru">
          <Doodle id="pena" size={20} color="currentColor" /> buka cerita baru
        </button>
      </section>

      {stories.data?.length ? (
        <section className="section">
          <span className="label">cerita kalian</span>
          <div className="col" style={{ gap: 10 }}>
            {stories.data.map((st, i) => {
              const p = storyPremise(st.premise);
              const todo = mine(st).startsWith('giliranmu');
              return (
                <Link key={st.id} to={`/cerita/${st.id}`} className={`card cerita-item ${todo ? 'todo' : ''}`} style={{ '--n': i } as CSSProperties}>
                  <Doodle id={p?.doodle ?? 'buku'} size={34} />
                  <span className="grow" style={{ minWidth: 0 }}>
                    <b>{p?.title ?? 'cerita'}</b>
                    <span className="tiny soft">
                      {st.phase === 'done' ? 'selesai' : `putaran ${st.round} dari ${STORY_ROUNDS} · ${PHASE[st.phase]}`} · {st.members.length === 1 ? 'sendiri' : st.members.map((m) => memberName(circles, m, me.user.id)).join(', ')}
                    </span>
                    <span className={`tiny ${todo ? 'cerita-todo' : 'soft'}`}>{mine(st)}</span>
                  </span>
                  <Doodle id="ui-panah-kanan" size={16} />
                </Link>
              );
            })}
          </div>
        </section>
      ) : null}

      <Sheet open={open} onClose={() => setOpen(false)} title="cerita baru">
        <div className="col" style={{ gap: 14 }}>
          <span className="label">pilih pembuka</span>
          <div className="col" style={{ gap: 8 }}>
            {STORY_PREMISES.map((p) => (
              <button key={p.id} className={`card cerita-premis ${premise === p.id ? 'on' : ''}`} onClick={() => setPremise(p.id)} data-testid={`premis-${p.id}`}>
                <Doodle id={p.doodle} size={32} />
                <span className="grow">
                  <b>{p.title}</b>
                  <span className="tiny soft">{p.pitch}</span>
                </span>
              </button>
            ))}
          </div>
          <span className="label">menulis dengan siapa</span>
          <div className="row wrap" style={{ gap: 6 }}>
            <button className={`pill ${circleId === null ? 'active' : ''}`} onClick={() => chooseCircle(null)}>
              sendiri
            </button>
            {live.map((c) => (
              <button key={c.id} className={`pill ${circleId === c.id ? 'active' : ''}`} onClick={() => chooseCircle(c.id)} data-testid={`cerita-l-${c.id}`}>
                <Doodle id={c.doodle} size={16} color="currentColor" /> {c.name}
              </button>
            ))}
          </div>
          {circle ? (
            <div className="row wrap" style={{ gap: 8 }}>
              {circle.others.map((m) => {
                const on = picked.includes(m.userId);
                return (
                  <button key={m.userId} className={`pill ${on ? 'active' : ''}`} disabled={!on && picked.length >= STORY_MAX_WRITERS - 1} onClick={() => setPicked(on ? picked.filter((x) => x !== m.userId) : [...picked, m.userId])}>
                    <Avatar doodle={m.doodle} size={20} /> {m.penName}
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="tiny soft" style={{ margin: 0 }}>Sendiri: kamu memegang semua tokoh bergantian, dan menerima jejakmu sendiri dari putaran sebelumnya.</p>
          )}
          <button className="btn" disabled={busy || (!!circle && !picked.length)} onClick={() => void create()} data-testid="cerita-mulai">
            {busy ? 'membagikan kartu…' : 'bagikan kartu dan mulai'}
          </button>
          <p className="tiny soft center" style={{ margin: 0 }}>Tiap penulis mendapat satu kartu role: satu batasan dan satu keuntungan.</p>
        </div>
      </Sheet>
    </main>
  );
}
