/**
 * Meja cerita. Satu garis kemajuan enam langkah di atas, satu kalimat "apa yang
 * harus kulakukan sekarang", lalu meja (kartu, menulis, lipatan, ruang baca,
 * penutupan) atau Peta Cerita.
 */
import { STORY_FORMATS, storyBabak, storyFormat, type StoryWire } from '@sehari/core';
import { type CSSProperties, useState } from 'react';
import { useParams } from '@/lib/router';
import { useStory } from '@/lib/stories';
import { Avatar, Doodle, Growing, Header } from '@/ui/kit';
import { Akhir } from './Akhir';
import { Baca } from './Baca';
import { STEPS, stepOf, useStoryModel } from './kit';
import { Peta } from './Peta';
import { Riset } from './Riset';
import { Tulis } from './Tulis';

export default function Meja() {
  const { id } = useParams<{ id: string }>();
  const q = useStory(id);
  if (!q.data) return q.isError ? <Growing label="cerita ini tidak ditemukan" /> : <Growing label="membuka meja…" />;
  return <Table st={q.data} />;
}

function Table({ st }: { st: StoryWire }) {
  const m = useStoryModel(st);
  const [tab, setTab] = useState<'meja' | 'peta' | 'riset'>('meja');
  const step = stepOf(m);
  const fmt = STORY_FORMATS[storyFormat(st.rounds)];
  const babak = st.rounds > 3 ? ` · babak ${storyBabak(st.rounds, st.round) + 1}` : '';
  const pending = m.facts.filter((f) => (f.state === 'usul' || f.state === 'tunda') && !f.agrees.includes(m.meId)).length;
  const openQ = st.research.filter((x) => x.shared && x.status !== 'terjawab' && m.open<{ kind: string }>(x.envelope)?.kind === 'tanya').length;
  const done = (u: string) => (st.phase === 'write' ? !!m.main.find((p) => p.round === st.round && p.authorId === u)?.sealed : st.phase === 'read' ? st.ready.includes(u) : true);

  return (
    <main className="screen cerita meja2" data-phase={st.phase}>
      <Header title={m.premise.title} sub={st.phase === 'done' ? `${fmt.name} · selesai` : `${fmt.name} · gelombang ${st.round} dari ${st.rounds}${babak}`} backTo="/cerita" />

      <section className="kemajuan" aria-label="kemajuan gelombang">
        <ol className="rel">
          {STEPS.map((s, i) => (
            <li key={s} className={i < step ? 'lewat' : i === step ? 'kini' : ''} style={{ '--n': i } as CSSProperties}>
              <i />
              <span>{s}</span>
            </li>
          ))}
        </ol>
        <p className="langkah-kini rupa-hand" key={m.nextAction()} data-testid="tindakan">
          {m.nextAction()}
        </p>
        <div className="meja-orang">
          {st.members.map((u, i) => (
            <span key={u} className={done(u) ? 'on' : ''} style={{ '--n': i } as CSSProperties} title={m.name(u)}>
              <Avatar doodle={m.face(u)} size={26} />
              <b>{m.name(u)}</b>
            </span>
          ))}
        </div>
      </section>

      {m.palette.garis.length || m.palette.tirai.length ? (
        <p className="palet-pita tiny">
          {m.palette.garis.length ? <span>jangan ada: {m.palette.garis.join(', ')}</span> : null}
          {m.palette.tirai.length ? <span>di luar layar: {m.palette.tirai.join(', ')}</span> : null}
        </p>
      ) : null}

      <nav className="meja-tab" role="tablist">
        <button role="tab" aria-selected={tab === 'meja'} className={tab === 'meja' ? 'on' : ''} onClick={() => setTab('meja')}>
          <Doodle id="pena" size={16} color="currentColor" /> meja
        </button>
        <button role="tab" aria-selected={tab === 'peta'} className={tab === 'peta' ? 'on' : ''} onClick={() => setTab('peta')} data-testid="tab-peta">
          <Doodle id="peta" size={16} color="currentColor" /> peta
          {pending ? <em>{pending}</em> : null}
        </button>
        <button role="tab" aria-selected={tab === 'riset'} className={tab === 'riset' ? 'on' : ''} onClick={() => setTab('riset')} data-testid="tab-riset">
          <Doodle id="kacamata" size={16} color="currentColor" /> riset
          {openQ ? <em className="soft">{openQ}</em> : null}
        </button>
      </nav>

      <div key={`${tab}-${st.phase}-${st.round}`} className="meja-isi">
        {tab === 'peta' ? <Peta m={m} /> : tab === 'riset' ? <Riset m={m} /> : st.phase === 'write' ? <Tulis m={m} /> : st.phase === 'read' ? <Baca m={m} /> : <Akhir m={m} />}
      </div>
    </main>
  );
}
