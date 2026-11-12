/**
 * Ruang Penelitian: pertanyaan riset, kartu sumber, keputusan dunia, dan
 * moodboard. Privat sampai dibagikan; keputusan bisa diusulkan jadi fakta Peta.
 * Kartu riset privat hanya disegel untuk pemiliknya; saat dibagikan, disegel
 * ulang untuk lingkaran.
 */
import type { StoryResearchPayload, StoryResearchWire } from '@sehari/core';
import { type CSSProperties, useState } from 'react';
import { api } from '@/lib/api';
import { uploadPhoto, useMediaUrl } from '@/lib/media';
import { useReady } from '@/lib/session';
import { newStoryId, sealPart } from '@/lib/stories';
import { Avatar, Doodle, Sheet, useToast } from '@/ui/kit';
import type { StoryModel } from './kit';

type Kind = StoryResearchPayload['kind'];
const KINDS: Record<Kind, { name: string; doodle: string; hint: string }> = {
  tanya: { name: 'pertanyaan', doodle: 'kacamata', hint: 'Yang perlu kalian ketahui supaya adegan terasa benar.' },
  sumber: { name: 'sumber', doodle: 'buku-terbuka', hint: 'Buku, artikel, wawancara, atau pengamatan, dengan rujukan halaman atau menit.' },
  keputusan: { name: 'keputusan dunia', doodle: 'peta-lipat', hint: 'Aturan dunia cerita. Tandai asalnya: sumber, pengamatan, perkiraan, atau fiksi.' },
  mood: { name: 'moodboard', doodle: 'kamera', hint: 'Gambar, warna, dan suasana. Hanya rujukan rasa, bukan fakta.' },
};
const ORIGIN = { sumber: 'dari sumber', observasi: 'pengamatan', perkiraan: 'perkiraan', fiksi: 'fiksi kita' } as const;
const STATUS = { terbuka: 'terbuka', terjawab: 'terjawab', diperdebatkan: 'diperdebatkan' } as const;

interface Item {
  w: StoryResearchWire;
  r: StoryResearchPayload;
}

export function Riset({ m }: { m: StoryModel }) {
  const { st, meId } = m;
  const [filter, setFilter] = useState<Kind | 'semua'>('semua');
  const [add, setAdd] = useState<Kind | null>(null);
  const items: Item[] = st.research.map((w) => ({ w, r: m.open<StoryResearchPayload>(w.envelope)! })).filter((x) => !!x.r);
  const shown = items.filter((x) => filter === 'semua' || x.r.kind === filter);
  const moods = shown.filter((x) => x.r.kind === 'mood');
  const rest = shown.filter((x) => x.r.kind !== 'mood');

  return (
    <div className="riset">
      <section className="riset-hero">
        <p className="rupa-hand">Riset membuat tokoh terdengar benar. Simpan di sini apa yang kamu cari, temukan, dan putuskan.</p>
        <p className="tiny soft">Kartumu privat sampai kamu membagikannya ke meja.</p>
      </section>

      <div className="riset-tambah" role="group" aria-label="tambah kartu riset">
        {(Object.keys(KINDS) as Kind[]).map((k, i) => (
          <button key={k} className="riset-new" style={{ '--n': i } as CSSProperties} onClick={() => setAdd(k)} data-testid={`riset-baru-${k}`}>
            <Doodle id={KINDS[k].doodle} size={26} />
            <span>{KINDS[k].name}</span>
          </button>
        ))}
      </div>

      {items.length ? (
        <nav className="riset-filter row wrap" style={{ gap: 6 }}>
          {(['semua', ...Object.keys(KINDS)] as (Kind | 'semua')[]).map((k) => {
            const n = k === 'semua' ? items.length : items.filter((x) => x.r.kind === k).length;
            return n || k === 'semua' ? (
              <button key={k} className={`pill sm ${filter === k ? 'active' : ''}`} onClick={() => setFilter(k)}>
                {k === 'semua' ? 'semua' : KINDS[k].name} <em>{n}</em>
              </button>
            ) : null;
          })}
        </nav>
      ) : (
        <p className="small soft center" style={{ marginTop: 18 }}>
          Belum ada riset. Mulai dari satu pertanyaan.
        </p>
      )}

      {moods.length ? (
        <div className="moodboard" data-testid="moodboard">
          {moods.map((x, i) => (
            <MoodTile key={x.w.id} m={m} x={x} i={i} />
          ))}
        </div>
      ) : null}

      <div className="col riset-list" style={{ gap: 10 }}>
        {rest.map((x, i) => (
          <ResearchCard key={x.w.id} m={m} x={x} i={i} mine={x.w.authorId === meId} />
        ))}
      </div>

      <Sheet open={!!add} onClose={() => setAdd(null)} title={add ? `kartu ${KINDS[add].name}` : ''}>
        {add ? <ResearchForm m={m} kind={add} onDone={() => setAdd(null)} /> : null}
      </Sheet>
    </div>
  );
}

function useSeal(m: StoryModel) {
  const { identity } = useReady();
  return (v: unknown, shared: boolean) => sealPart(v, shared ? m.circle : undefined, { id: m.meId, publicKey: identity.publicKey });
}

function Owner({ m, x }: { m: StoryModel; x: Item }) {
  const seal = useSeal(m);
  const solo = m.n === 1;
  return (
    <span className="riset-owner">
      {x.w.authorId === m.meId ? (
        <>
          {!solo ? (
            x.w.shared ? (
              <span className="tiny soft">dibagikan</span>
            ) : (
              <button className="pill sm" onClick={() => void m.run(() => m.put(`/research/${x.w.id}`, { shared: true, envelope: seal(x.r, true) }))} data-testid="riset-bagikan">
                bagikan ke meja
              </button>
            )
          ) : null}
          <button className="serah-x" aria-label="hapus kartu" onClick={() => void m.run(() => api.del(`/stories/${m.st.id}/research/${x.w.id}`))}>
            ×
          </button>
        </>
      ) : (
        <span className="tiny soft row" style={{ gap: 4 }}>
          <Avatar doodle={m.face(x.w.authorId)} size={18} /> {m.name(x.w.authorId)}
        </span>
      )}
    </span>
  );
}

function ResearchCard({ m, x, i, mine }: { m: StoryModel; x: Item; i: number; mine: boolean }) {
  const { r, w } = x;
  const k = KINDS[r.kind];
  const seal = useSeal(m);
  const factRound = m.st.phase === 'write' ? m.st.round - 1 : m.st.round;
  return (
    <article className={`card riset-card k-${r.kind} ${w.shared ? '' : 'privat'}`} style={{ '--n': i } as CSSProperties} data-testid="riset-kartu">
      <header className="row" style={{ gap: 8 }}>
        <Doodle id={k.doodle} size={20} />
        <span className="tiny soft grow">{k.name}{!w.shared && m.n > 1 ? ' · hanya kamu' : ''}</span>
        <Owner m={m} x={x} />
      </header>
      <h4>{r.title}</h4>
      {r.kind === 'sumber' ? (
        <>
          {r.quote ? <blockquote className="riset-kutip">“{r.quote}”</blockquote> : null}
          <p className="tiny soft">
            {[r.creator, r.date, r.locator].filter(Boolean).join(' · ')}
            {r.url ? (
              <>
                {' · '}
                <a href={r.url} target="_blank" rel="noreferrer noopener">
                  buka
                </a>
              </>
            ) : null}
          </p>
        </>
      ) : null}
      {r.kind === 'keputusan' && r.origin ? <span className={`riset-asal o-${r.origin}`}>{ORIGIN[r.origin]}</span> : null}
      {r.note ? <p className="small">{r.note}</p> : null}
      {r.link ? <p className="tiny soft">untuk {r.link}</p> : null}
      {r.kind === 'tanya' ? (
        <div className="row wrap riset-status" style={{ gap: 6 }}>
          {(Object.keys(STATUS) as (keyof typeof STATUS)[]).map((s) => (
            <button key={s} className={`pill sm s-${s} ${w.status === s ? 'active' : ''}`} disabled={!w.shared && !mine} onClick={() => w.status !== s && void m.run(() => m.put(`/research/${w.id}`, { status: s }))}>
              {STATUS[s]}
            </button>
          ))}
        </div>
      ) : null}
      {r.kind === 'keputusan' && mine ? (
        m.facts.some((f) => f.state !== 'diganti' && f.f.sentence === r.title) ? (
          <span className="tiny soft">sudah ada di Peta sebagai fakta dunia</span>
        ) : factRound >= 1 ? (
          <button
            className="btn ghost sm"
            onClick={async () => {
              const ok = await m.run(() => m.post('/facts', { id: newStoryId(), round: factRound, envelope: m.seal({ v: 1, sentence: r.title, scope: 'dunia', knows: [], believes: [] }), supersedes: null }));
              if (ok && !w.shared && m.n > 1) await m.run(() => m.put(`/research/${w.id}`, { shared: true, envelope: seal(r, true) }));
            }}
            data-testid="riset-jadi-fakta">
            <Doodle id="peta" size={16} color="currentColor" /> usulkan jadi fakta dunia di Peta
          </button>
        ) : (
          <span className="tiny soft">Bisa diusulkan jadi fakta setelah gelombang pertama dibuka.</span>
        )
      ) : null}
    </article>
  );
}

function MoodTile({ m, x, i }: { m: StoryModel; x: Item; i: number }) {
  const url = useMediaUrl(x.r.media as never);
  const tint = x.r.media?.tint;
  return (
    <figure className={`mood-tile ${x.w.shared ? '' : 'privat'}`} style={{ '--n': i, '--rot': `${((i * 37) % 7) - 3}deg`, background: tint } as CSSProperties}>
      {url ? <img src={url} alt={x.r.title} /> : <span className="mood-ph" />}
      <figcaption>
        <span className="grow">{x.r.title}</span>
        <Owner m={m} x={x} />
      </figcaption>
    </figure>
  );
}

function ResearchForm({ m, kind, onDone }: { m: StoryModel; kind: Kind; onDone: () => void }) {
  const seal = useSeal(m);
  const toast = useToast();
  const [f, setF] = useState<Partial<StoryResearchPayload>>({ origin: 'perkiraan' });
  const [shared, setShared] = useState(m.n === 1);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof StoryResearchPayload) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });
  const ok = !!f.title?.trim() && (kind !== 'mood' || !!file);
  const ph: Record<Kind, string> = { tanya: 'mis. Jam berapa warung kopi di stasiun buka?', sumber: 'judul sumber', keputusan: 'mis. Di kota ini, kereta terakhir berangkat 23.40.', mood: 'judul suasana' };
  const field = (k: keyof StoryResearchPayload, p: string, max = 200) => <input className="field" value={(f[k] as string) ?? ''} maxLength={max} onChange={set(k)} placeholder={p} />;

  return (
    <div className="col riset-form" style={{ gap: 10 }}>
      <p className="tiny soft">{KINDS[kind].hint}</p>
      <input className="field" value={f.title ?? ''} maxLength={200} onChange={set('title')} placeholder={ph[kind]} autoFocus data-testid="riset-judul" />
      {kind === 'sumber' ? (
        <>
          <div className="row" style={{ gap: 8 }}>
            {field('creator', 'penulis / narasumber', 120)}
            {field('date', 'tahun', 40)}
          </div>
          <div className="row" style={{ gap: 8 }}>
            {field('locator', 'hal. / menit', 60)}
            {field('url', 'tautan (opsional)', 500)}
          </div>
          <textarea className="field" rows={2} value={f.quote ?? ''} maxLength={600} onChange={set('quote')} placeholder="kutipan pendek yang penting" />
        </>
      ) : null}
      {kind === 'keputusan' ? (
        <div className="row wrap" style={{ gap: 6 }}>
          {(Object.keys(ORIGIN) as (keyof typeof ORIGIN)[]).map((o) => (
            <button key={o} className={`pill sm ${f.origin === o ? 'active' : ''}`} onClick={() => setF({ ...f, origin: o })}>
              {ORIGIN[o]}
            </button>
          ))}
        </div>
      ) : null}
      {kind === 'mood' ? (
        <label className="mood-pick">
          <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} data-testid="riset-foto" />
          <Doodle id="kamera" size={22} /> {file ? file.name : 'pilih gambar'}
        </label>
      ) : null}
      <textarea className="field" rows={2} value={f.note ?? ''} maxLength={800} onChange={set('note')} placeholder={kind === 'tanya' ? 'kenapa ini penting untuk cerita' : 'catatan'} />
      {m.tokohs.length ? (
        <div className="row wrap" style={{ gap: 6 }}>
          <span className="tiny soft">untuk</span>
          {m.tokohs.map((t) => (
            <button key={t} className={`pill sm ${f.link === t ? 'active' : ''}`} onClick={() => setF({ ...f, link: f.link === t ? undefined : t })}>
              {t}
            </button>
          ))}
        </div>
      ) : null}
      {m.n > 1 ? (
        <label className="serah-perk">
          <span className="grow">
            <b>bagikan ke meja</b>
            <span className="tiny soft">{shared ? 'Semua penulis bisa melihat dan menandai statusnya.' : 'Hanya kamu yang bisa membacanya.'}</span>
          </span>
          <button type="button" role="switch" aria-checked={shared} className="switch" onClick={() => setShared(!shared)} data-testid="riset-bagi" />
        </label>
      ) : null}
      <button
        className="btn"
        disabled={!ok || busy}
        onClick={async () => {
          setBusy(true);
          try {
            const media = kind === 'mood' && file ? await uploadPhoto(file) : undefined;
            const payload: StoryResearchPayload = {
              v: 1,
              kind,
              title: f.title!.trim(),
              note: f.note?.trim() || undefined,
              creator: f.creator?.trim() || undefined,
              date: f.date?.trim() || undefined,
              url: f.url?.trim() && /^https?:\/\//.test(f.url.trim()) ? f.url.trim() : undefined,
              locator: f.locator?.trim() || undefined,
              quote: f.quote?.trim() || undefined,
              origin: kind === 'keputusan' ? f.origin : undefined,
              link: f.link,
              media: media as StoryResearchPayload['media'],
            };
            if (await m.run(() => m.post('/research', { id: newStoryId(), envelope: seal(payload, shared), mediaIds: media ? [media.id] : [], shared }))) onDone();
          } catch (e) {
            toast((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
        data-testid="riset-simpan">
        {busy ? 'menyimpan…' : 'simpan kartu'}
      </button>
    </div>
  );
}
