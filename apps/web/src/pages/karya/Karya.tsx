/** Rak karya: esai, cerpen, puisi, catatan, surat, fragmen — milikku dan dari lingkaran. */
import { useState } from 'react';
import { memberName, useCircles, useMe } from '@/lib/data';
import { Link, navigate } from '@/lib/router';
import { countWords, excerpt, KIND_INFO, KINDS, type OpenWork, readingMinutes, useMyWorks, useWorkFeed, type WorkKind } from '@/lib/works';
import { Doodle, Growing, Sheet } from '@/ui/kit';
import { Cover } from './Cover';

const fmt = (iso: string) => new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(iso));

export default function Karya() {
  const me = useMe();
  const { circles } = useCircles();
  const mine = useMyWorks();
  const feed = useWorkFeed();
  const [tab, setTab] = useState<'mine' | 'feed'>('mine');
  const [kind, setKind] = useState<WorkKind | 'semua'>('semua');
  const [choosing, setChoosing] = useState(false);
  const list = (tab === 'mine' ? mine.works : feed.works).filter((w) => w.work && (kind === 'semua' || w.work.kind === kind));
  const drafts = mine.works.filter((w) => w.wire.status === 'draft').length;
  const words = mine.works.reduce((n, w) => n + (w.work ? countWords(w.work.body) : 0), 0);

  return (
    <main className="screen karya-screen">
      <header className="karya-head">
        <span className="eyebrow">ruang menulis</span>
        <h1 className="display-serif">Karya</h1>
        <p className="lede">
          Esai pribadi, cerpen, puisi, catatan panjang, surat — semua tulisanmu di satu rak. Terenkripsi, dan hanya dibaca orang yang kamu pilih.
        </p>
        <div className="karya-stats">
          <span>
            <b>{mine.works.length}</b> karya
          </span>
          <span>
            <b>{drafts}</b> draf
          </span>
          <span>
            <b>{words.toLocaleString('id-ID')}</b> kata
          </span>
        </div>
        <button className="btn auto mt" onClick={() => setChoosing(true)}>
          <Doodle id="pena" size={20} color="currentColor" /> tulis karya baru
        </button>
      </header>

      <div className="seg mt-lg" role="tablist">
        <button role="tab" aria-selected={tab === 'mine'} className={tab === 'mine' ? 'on' : ''} onClick={() => setTab('mine')}>
          rak milikku
        </button>
        <button role="tab" aria-selected={tab === 'feed'} className={tab === 'feed' ? 'on' : ''} onClick={() => setTab('feed')}>
          dari lingkaran {feed.works.length ? <i>{feed.works.length}</i> : null}
        </button>
      </div>
      <div className="chip-row mt">
        {(['semua', ...KINDS] as const).map((k) => (
          <button key={k} className={`pill sm ${kind === k ? 'active' : ''}`} onClick={() => setKind(k)}>
            {k === 'semua' ? 'semua' : KIND_INFO[k].name}
          </button>
        ))}
      </div>

      {(tab === 'mine' ? mine.isLoading : feed.isLoading) ? (
        <Growing label="membuka rak…" />
      ) : list.length === 0 ? (
        <div className="karya-empty">
          <Doodle id={tab === 'mine' ? 'rak-buku' : 'buku-terbuka'} size={84} draw />
          <p className="serif-italic">{tab === 'mine' ? 'Rakmu masih kosong. Setiap penulis mulai dari satu kalimat.' : 'Belum ada karya yang diterbitkan teman-temanmu.'}</p>
          {tab === 'mine' ? (
            <button className="btn soft auto" onClick={() => setChoosing(true)}>
              mulai menulis
            </button>
          ) : null}
        </div>
      ) : (
        <div className="shelf">
          {list.map((w, i) => (
            <ShelfItem key={w.wire.id} w={w} i={i} author={w.wire.authorId === me.user.id ? 'kamu' : memberName(circles, w.wire.authorId, me.user.id)} mine={w.wire.authorId === me.user.id} />
          ))}
        </div>
      )}

      <Sheet open={choosing} onClose={() => setChoosing(false)} title="mau menulis apa?">
        <div className="kind-grid">
          {KINDS.map((k) => (
            <button key={k} className="kind-card" onClick={() => navigate(`/karya/tulis?jenis=${k}`)}>
              <Doodle id={KIND_INFO[k].doodle} size={36} />
              <span className="kind-name">{KIND_INFO[k].name}</span>
              <span className="tiny soft">{KIND_INFO[k].tagline}</span>
            </button>
          ))}
        </div>
      </Sheet>
    </main>
  );
}

function ShelfItem({ w, i, author, mine }: { w: OpenWork; i: number; author: string; mine: boolean }) {
  const words = w.work ? countWords(w.work.body) : 0;
  const draft = w.wire.status === 'draft';
  return (
    <Link to={draft && mine ? `/karya/${w.wire.id}/tulis` : `/karya/${w.wire.id}`} className="shelf-item rise" style={{ animationDelay: `${Math.min(i, 10) * 0.04}s` }}>
      <Cover work={w.work} author={author} size="sm" />
      <div className="shelf-meta">
        <div className="shelf-title">{w.work?.title || 'tanpa judul'}</div>
        <div className="tiny soft">
          {draft ? <span className="badge">draf</span> : w.wire.circleIds.length ? <span className="badge pub">terbit</span> : <span className="badge">hanya aku</span>} {words} kata · {readingMinutes(words)} mnt · {fmt(w.wire.publishedAt ?? w.wire.updatedAt)}
        </div>
        <p className="shelf-excerpt">{w.work ? excerpt(w.work.body, 120) : ''}</p>
        {w.wire.reactions.length || w.wire.noteCount ? (
          <div className="tiny ink-soft">
            {w.wire.reactions.length ? `♥ ${w.wire.reactions.length}` : ''} {w.wire.noteCount ? `· ✎ ${w.wire.noteCount} catatan pembaca` : ''}
          </div>
        ) : null}
      </div>
    </Link>
  );
}
