/**
 * Hidup Orang Lain: daftar cerita. Kamu menulis apa yang terjadi; orang lain
 * menulis apa yang ia kira terjadi.
 */
import { STORY_FORMATS, STORY_FREE, storyFormat, type StoryMeta, storyPremise, type StoryWire } from '@sehari/core';
import type { CSSProperties } from 'react';
import { memberName, useCircles, useMe } from '@/lib/data';
import { Link, navigate } from '@/lib/router';
import { useOpenAny, useStories } from '@/lib/stories';
import { Doodle, Header } from '@/ui/kit';

const PHASE: Record<string, string> = { write: 'menulis', read: 'ruang baca', done: 'selesai' };

export default function Cerita() {
  const me = useMe();
  const { circles } = useCircles();
  const stories = useStories();
  const openAny = useOpenAny();
  const titleOf = (st: StoryWire) => (st.premise === STORY_FREE ? (openAny<StoryMeta>(st.meta)?.title ?? 'cerita kalian') : (storyPremise(st.premise)?.title ?? 'cerita'));
  const todo = (st: StoryWire) => {
    if (st.phase === 'done') return st.edition && !st.editionOk.includes(me.user.id) ? 'edisi menunggu persetujuanmu' : null;
    if (st.phase === 'read') {
      const vote = st.facts.some((f) => (f.state === 'usul' || f.state === 'tunda') && !f.agrees.includes(me.user.id));
      return vote ? 'fakta menunggu persetujuanmu' : st.ready.includes(me.user.id) ? null : 'lipatannya sudah bisa dibuka';
    }
    const p = st.parts.find((x) => x.round === st.round && x.authorId === me.user.id && x.world === 'a');
    return p?.sealed ? null : 'giliranmu menulis';
  };
  const list = stories.data ?? [];

  return (
    <main className="screen cerita">
      <Header title="hidup orang lain" sub="satu cerita, ditulis dari beberapa kepala" backTo="/main" />
      <section className="cerita-hero">
        <p className="rupa-hand">Kamu menulis apa yang terjadi. Orang lain menulis apa yang ia kira terjadi.</p>
        <p className="small soft">Tiap tokoh hanya tahu sebagian. Yang tidak ia tahu tampil tersensor di kartunya. Bagian disegel, dibuka sebagai lipatan, lalu disepakati jadi fakta yang dibawa ke gelombang berikutnya.</p>
        <button className="btn" onClick={() => navigate('/cerita/baru')} data-testid="cerita-baru">
          <Doodle id="pena" size={20} color="currentColor" /> siapkan meja baru
        </button>
      </section>

      {list.length ? (
        <section className="section">
          <span className="label">cerita kalian</span>
          <div className="col" style={{ gap: 10 }}>
            {list.map((st, i) => {
              const p = storyPremise(st.premise);
              const t = todo(st);
              const fmt = STORY_FORMATS[storyFormat(st.rounds)];
              return (
                <Link key={st.id} to={`/cerita/${st.id}`} className={`card cerita-item ${t ? 'todo' : ''}`} style={{ '--n': i } as CSSProperties}>
                  <Doodle id={p?.doodle ?? 'pena'} size={34} />
                  <span className="grow" style={{ minWidth: 0 }}>
                    <b>{titleOf(st)}</b>
                    <span className="tiny soft">
                      {fmt.name} · {st.phase === 'done' ? 'selesai' : `gelombang ${st.round} dari ${st.rounds} · ${PHASE[st.phase]}`} · {st.members.length === 1 ? 'sendiri' : st.members.map((m) => memberName(circles, m, me.user.id)).join(', ')}
                    </span>
                    {t ? <span className="tiny cerita-todo">{t}</span> : null}
                  </span>
                  <Doodle id="ui-panah-kanan" size={16} />
                </Link>
              );
            })}
          </div>
        </section>
      ) : stories.isSuccess ? (
        <p className="small soft center" style={{ marginTop: 32 }}>
          Belum ada cerita. Siapkan meja pertama kalian.
        </p>
      ) : null}
    </main>
  );
}
