/**
 * Satu janji temu dari awal sampai jadi kenangan:
 * rencana → ikut? → harapan rahasia → sampai → kita ketemu → cerita & foto → struk.
 */
import type { MeetRsvp } from '@sehari/core';
import { useEffect, useState } from 'react';
import { memberName, useCircles, useMe } from '@/lib/data';
import { uploadPhoto, useMediaUrl } from '@/lib/media';
import { setDreamDone, useDreams } from '@/lib/dreams';
import { addMeetEntry, arriveMeet, countdown, download, type EntryPayload, fmtWhen, icsFor, mapUrl, metMeet, rsvpMeet, updateMeet, useMeet, useRefreshMeets } from '@/lib/meets';
import { Link, navigate, useParams, usePath } from '@/lib/router';
import { useReady } from '@/lib/session';
import { sound } from '@/lib/sound';
import { Avatar, Confetti, Doodle, Growing, Header, Sheet, useToast } from '@/ui/kit';
import { useNow } from './Janji';
import { receiptFrom, ReceiptView } from './Receipt';

const RSVP: { v: MeetRsvp; label: string }[] = [
  { v: 'yes', label: 'ikut' },
  { v: 'maybe', label: 'mungkin' },
  { v: 'no', label: 'tidak bisa' },
];

export default function JanjiDetail() {
  const { id } = useParams<{ id: string }>();
  const { search } = usePath();
  const me = useMe();
  const { identity } = useReady();
  const { circles } = useCircles();
  const toast = useToast();
  const refresh = useRefreshMeets();
  const q = useMeet(id);
  const now = useNow(15_000);
  const [sheet, setSheet] = useState<null | 'receipt' | 'story' | 'wish' | 'note'>(search.get('baru') ? 'receipt' : null);
  const [celebrate, setCelebrate] = useState(false);
  const [story, setStory] = useState({ title: '', text: '', rating: 0, best: '', next: '' });
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);

  // ?baru=1 hanya untuk membuka struk sekali setelah janji dibuat.
  useEffect(() => {
    if (search.get('baru')) history.replaceState(history.state, '', `/janji/${id}`);
  }, []);

  const m = q.meet;
  const dreamQ = useDreams(m?.wire.circleId);
  const dream = dreamQ.dreams.find((d) => d.wire.meetId === id);
  if (q.isLoading || !m) return <Growing label="membuka janji…" />;
  if (!m.plan) return <main className="screen"><p className="center">Janji ini tidak bisa dibuka di perangkat ini.</p></main>;
  const circle = circles.find((c) => c.id === m.wire.circleId);
  const plan = m.plan;
  const name = (uid: string) => (uid === me.user.id ? 'kamu' : memberName(circles, uid, me.user.id));
  const doodleOf = (uid: string) => circle?.members.find((x) => x.userId === uid)?.doodle ?? 'tunas';
  const mine = m.wire.members.find((x) => x.userId === me.user.id);
  const start = new Date(m.wire.startsAt).getTime();
  const phase = m.wire.status === 'cancelled' ? 'batal' : now < start - 2 * 3600_000 ? 'nanti' : now < start + 10 * 3600_000 ? 'sekarang' : 'sesudah';
  const metCount = m.wire.members.filter((x) => x.metAt).length;
  const going = m.wire.members.filter((x) => x.rsvp !== 'no');
  const meCtx = { id: me.user.id, publicKey: identity.publicKey };

  const act = async (f: () => Promise<unknown>, s?: Parameters<typeof sound.play>[0]) => {
    try {
      await f();
      if (s) sound.play(s);
      await q.refetch();
      void refresh();
    } catch (e) {
      toast((e as Error).message);
    }
  };

  const entry = async (data: EntryPayload, mediaIds: string[] = []) => {
    if (!circle) return;
    setBusy(true);
    await act(() => addMeetEntry(m.wire.id, data.kind, data, circle, meCtx, mediaIds), 'pop');
    setBusy(false);
  };

  const photos = async (files: File[]) => {
    if (!circle) return;
    setBusy(true);
    try {
      const refs = [];
      for (const f of files.slice(0, 10)) refs.push(await uploadPhoto(f));
      await addMeetEntry(m.wire.id, 'photo', { kind: 'photo', media: refs }, circle, meCtx, refs.map((r) => r.id));
      sound.play('pop');
      await q.refetch();
    } catch (e) {
      toast((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const wishes = m.entries.filter((e) => e.data?.kind === 'wish');
  const myWish = wishes.find((e) => e.wire.authorId === me.user.id);
  const memories = m.entries.filter((e) => e.data && e.data.kind !== 'wish');

  return (
    <main className="screen janji-detail">
      <Header
        title="janji temu"
        sub={circle?.name}
        backTo="/janji"
        right={
          <Link to={`/janji/${m.wire.id}/ubah`} className="icon-btn" aria-label="ubah">
            <Doodle id="pena" size={20} />
          </Link>
        }
      />
      {celebrate ? <Confetti count={28} /> : null}

      {/* Tiket */}
      <section className={`ticket ${phase}`}>
        <div className="ticket-top">
          <span className="eyebrow">{phase === 'nanti' ? countdown(m.wire.startsAt, now) : phase === 'sekarang' ? 'hari ini' : phase === 'batal' ? 'dibatalkan' : metCount >= 2 ? 'sudah bertemu' : 'sudah lewat'}</span>
          <h1 className="ticket-title">{plan.title}</h1>
          <p className="ticket-when">{fmtWhen(m.wire.startsAt)}</p>
        </div>
        <div className="ticket-cut" aria-hidden />
        <dl className="ticket-rows">
          <div>
            <dt>
              <Doodle id="ui-lokasi" size={18} /> di mana
            </dt>
            <dd>
              {plan.place.name}
              {plan.place.address ? <span className="tiny soft"> · {plan.place.address}</span> : null}
              <a className="tiny" href={mapUrl(plan.place)} target="_blank" rel="noreferrer">
                {' '}
                buka peta ↗
              </a>
            </dd>
          </div>
          {plan.activity ? (
            <div>
              <dt>
                <Doodle id="sepeda" size={18} /> ngapain
              </dt>
              <dd>{plan.activity}</dd>
            </div>
          ) : null}
          {plan.food ? (
            <div>
              <dt>
                <Doodle id="martabak" size={18} /> makan
              </dt>
              <dd>{plan.food}</dd>
            </div>
          ) : null}
          {plan.dress ? (
            <div>
              <dt>
                <Doodle id="kacamata" size={18} /> dresscode
              </dt>
              <dd>{plan.dress}</dd>
            </div>
          ) : null}
          {plan.challenge ? (
            <div>
              <dt>
                <Doodle id="bintang-kecil" size={18} /> misi
              </dt>
              <dd>{plan.challenge}</dd>
            </div>
          ) : null}
          {plan.question ? (
            <div>
              <dt>
                <Doodle id="gelembung-kata" size={18} /> obrolan
              </dt>
              <dd className="serif-italic">“{plan.question}”</dd>
            </div>
          ) : null}
          {plan.budget ? (
            <div>
              <dt>
                <Doodle id="kado" size={18} /> budget
              </dt>
              <dd>{plan.budget}</dd>
            </div>
          ) : null}
          {plan.notes ? (
            <div>
              <dt>
                <Doodle id="pena" size={18} /> catatan
              </dt>
              <dd style={{ whiteSpace: 'pre-wrap' }}>{plan.notes}</dd>
            </div>
          ) : null}
        </dl>
        <div className="ticket-actions">
          <button className="pill" onClick={() => setSheet('receipt')}>
            <Doodle id="tiket" size={16} color="currentColor" /> struk
          </button>
          <button className="pill" onClick={() => download(`janji-${m.wire.id.slice(-6)}.ics`, new Blob([icsFor(m)], { type: 'text/calendar' }))}>
            <Doodle id="ui-kalender" size={16} color="currentColor" /> ke kalender
          </button>
        </div>
      </section>

      {/* Siapa ikut */}
      <section className="section">
        <span className="label">siapa ikut</span>
        <div className="people-row">
          {m.wire.members.map((x) => (
            <div key={x.userId} className={`person ${x.metAt ? 'met' : x.arrivedAt ? 'here' : ''}`}>
              <Avatar doodle={doodleOf(x.userId)} size={46} sealed={!!x.metAt} dim={x.rsvp === 'no'} />
              <span className="tiny">{name(x.userId)}</span>
              <span className="tiny soft">{x.metAt ? 'ketemu ✓' : x.arrivedAt ? 'sudah sampai' : x.rsvp === 'yes' ? 'ikut' : x.rsvp === 'maybe' ? 'mungkin' : x.rsvp === 'no' ? 'tidak bisa' : '…'}</span>
            </div>
          ))}
        </div>
        {phase !== 'sesudah' && phase !== 'batal' ? (
          <div className="seg mt" role="radiogroup" aria-label="ikut?">
            {RSVP.map((r) => (
              <button key={r.v} role="radio" aria-checked={mine?.rsvp === r.v} className={mine?.rsvp === r.v ? 'on' : ''} onClick={() => void act(() => rsvpMeet(m.wire.id, r.v), 'soft')}>
                {r.label}
              </button>
            ))}
          </div>
        ) : null}
      </section>

      {/* Di tempat */}
      {phase === 'sekarang' || (phase === 'sesudah' && metCount < 2 && now < start + 48 * 3600_000) ? (
        <section className="meet-now">
          <div className="meet-now-stamp" data-met={metCount >= 2 ? '1' : '0'}>
            {metCount >= 2 ? (
              <>
                <span className="stamp-big">KETEMU</span>
                <span className="tiny">{fmtWhen(m.wire.members.filter((x) => x.metAt).map((x) => x.metAt!).sort()[1]!, { hour: '2-digit', minute: '2-digit' })}</span>
              </>
            ) : (
              <>
                <Doodle id="tangan-bergandeng" size={56} className="breathe" />
                <span className="small">sudah di tempat? tandai bersama — tidak wajib.</span>
              </>
            )}
          </div>
          <div className="row" style={{ gap: 8 }}>
            {!mine?.arrivedAt && !mine?.metAt ? (
              <button className="btn soft grow" onClick={() => void act(() => arriveMeet(m.wire.id), 'soft')}>
                aku sudah sampai
              </button>
            ) : null}
            <button
              className={`btn grow ${mine?.metAt ? 'soft' : ''}`}
              onClick={() =>
                void act(async () => {
                  const r = await metMeet(m.wire.id, !mine?.metAt);
                  if (!mine?.metAt && r.members.filter((x) => x.metAt).length >= 2) {
                    setCelebrate(true);
                    sound.play('seal');
                    setTimeout(() => setCelebrate(false), 2600);
                  }
                })
              }>
              {mine?.metAt ? 'batalkan tanda' : metCount >= 1 ? 'kita ketemu ✓' : 'tandai: kita ketemu'}
            </button>
          </div>
          {metCount === 1 && !mine?.metAt ? <p className="tiny ink center">{name(m.wire.members.find((x) => x.metAt)!.userId)} sudah menandai. Giliranmu.</p> : null}
          <button
            className="btn ghost mt"
            onClick={() => {
              const players = going.map((x) => (x.userId === me.user.id ? me.user.penName : name(x.userId)));
              navigate(`/tentang-kita?r=${circle?.kind === 'duo' ? 'pasangan' : 'sahabat'}&p=${encodeURIComponent(players.join(','))}`);
            }}>
            <Doodle id="gelembung-kata" size={18} color="currentColor" /> taruh HP di meja: main Tentang Kita
          </button>
        </section>
      ) : null}

      {/* Mimpi yang diwujudkan janji ini */}
      {dream?.data ? (
        <section className="section">
          <div className={`card row mimpi-link ${dream.wire.doneAt ? 'done' : ''}`} style={{ gap: 12 }}>
            <Doodle id={dream.wire.doneAt ? 'bintang' : 'kompas'} size={32} className="breathe" />
            <span className="grow" style={{ minWidth: 0 }}>
              <span className="tiny ink-soft" style={{ display: 'block' }}>{dream.wire.doneAt ? 'mimpi yang terwujud di janji ini' : 'janji ini mewujudkan mimpi'}</span>
              <span className="h2 ink">{dream.data.title}</span>
            </span>
            {!dream.wire.doneAt && phase !== 'nanti' && phase !== 'batal' ? (
              <button
                className="btn sm auto"
                onClick={() =>
                  void act(async () => {
                    await setDreamDone(dream.wire.id, true);
                    await dreamQ.refetch();
                    setCelebrate(true);
                    setTimeout(() => setCelebrate(false), 2600);
                  }, 'seal')
                }>
                terwujud ✦
              </button>
            ) : null}
          </div>
        </section>
      ) : null}

      {/* Kapsul harapan */}
      {phase !== 'batal' ? (
        <section className="section">
          <span className="label">kapsul harapan</span>
          <p className="tiny soft">Tulis satu harapan untuk janji ini. Harapan semua orang baru terbuka setelah kalian saling menandai “ketemu”.</p>
          <div className="col" style={{ gap: 8 }}>
            {m.wire.revealed
              ? wishes.map((w) => (
                  <div key={w.wire.id} className="wish open">
                    <span className="note-by">{name(w.wire.authorId)}</span>
                    <p className="serif-italic">{w.data?.kind === 'wish' ? w.data.text : ''}</p>
                  </div>
                ))
              : null}
            {!m.wire.revealed && myWish ? (
              <div className="wish">
                <span className="note-by">harapanmu</span>
                <p className="serif-italic">{myWish.data?.kind === 'wish' ? myWish.data.text : ''}</p>
              </div>
            ) : null}
            {!m.wire.revealed && m.wire.hiddenWishes ? (
              <div className="wish sealed">
                <Doodle id="amplop" size={26} className="breathe" />
                <span className="small">{m.wire.hiddenWishes} harapan tersegel menunggu kalian bertemu</span>
              </div>
            ) : null}
            {!myWish ? (
              <button className="btn soft" onClick={() => { setText(''); setSheet('wish'); }}>
                <Doodle id="surat-botol" size={18} color="currentColor" /> tulis harapan
              </button>
            ) : null}
          </div>
        </section>
      ) : null}

      {/* Sesudahnya: cerita & foto */}
      {phase === 'sekarang' || phase === 'sesudah' ? (
        <section className="section">
          <span className="label">cerita kita</span>
          <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
            <button className="btn soft grow" onClick={() => setSheet('story')}>
              <Doodle id="pena" size={18} color="currentColor" /> tulis cerita
            </button>
            <label className={`btn soft grow ${busy ? 'disabled' : ''}`}>
              <Doodle id="ui-foto" size={18} color="currentColor" /> {busy ? 'mengunggah…' : 'tambah foto'}
              <input type="file" accept="image/*" multiple hidden onChange={(e) => { const f = [...(e.target.files ?? [])]; e.target.value = ''; if (f.length) void photos(f); }} />
            </label>
            <button className="btn soft grow" onClick={() => { setText(''); setSheet('note'); }}>
              <Doodle id="gelembung-kata" size={18} color="currentColor" /> catatan kecil
            </button>
          </div>
          <div className="memories">
            {memories.length === 0 ? <p className="tiny soft">Belum ada cerita. Bagaimana rasanya tadi?</p> : null}
            {memories.map((e, i) =>
              e.data?.kind === 'photo' ? (
                <div key={e.wire.id} className="memory-photos">
                  {e.data.media.map((ref, j) => (
                    <Polaroid key={ref.id} mref={ref} tilt={((i + j) % 2 ? 1 : -1) * (1.5 + ((i * 7 + j) % 3))} by={name(e.wire.authorId)} />
                  ))}
                </div>
              ) : e.data?.kind === 'story' ? (
                <article key={e.wire.id} className="memory-story">
                  <span className="note-by">{name(e.wire.authorId)} bercerita</span>
                  {e.data.title ? <h3 className="serif-title">{e.data.title}</h3> : null}
                  {e.data.rating ? <div className="hearts" aria-label={`${e.data.rating} dari 5`}>{'♥'.repeat(e.data.rating)}<span>{'♥'.repeat(5 - e.data.rating)}</span></div> : null}
                  <p className="memory-text">{e.data.text}</p>
                  {e.data.best ? (
                    <p className="small">
                      <b>momen terbaik:</b> {e.data.best}
                    </p>
                  ) : null}
                  {e.data.next ? (
                    <p className="small">
                      <b>lain kali:</b> {e.data.next}
                    </p>
                  ) : null}
                </article>
              ) : e.data?.kind === 'note' ? (
                <div key={e.wire.id} className="sticky memory-note" style={{ background: ['var(--sticky-yellow)', 'var(--sticky-peach)', 'var(--sticky-green)', 'var(--sticky-blue)'][i % 4], transform: `rotate(${i % 2 ? 1.5 : -1.5}deg)` }}>
                  <span className="note-by">{name(e.wire.authorId)}</span>
                  <p className="hand" style={{ fontSize: 24, margin: 0 }}>{e.data.text}</p>
                </div>
              ) : null,
            )}
          </div>
        </section>
      ) : null}

      {phase === 'nanti' ? (
        <div className="row mt-lg" style={{ justifyContent: 'center', gap: 8 }}>
          <Link to={`/janji/acak?ganti=${m.wire.id}`} className="pill">
            <Doodle id="ui-dadu" size={16} color="currentColor" /> acak ulang rencana
          </Link>
          {m.wire.creatorId === me.user.id ? (
            <button
              className="pill"
              onClick={() => {
                if (circle && confirm('Batalkan janji ini?')) void act(() => updateMeet(m.wire.id, circle, { status: 'cancelled' }, meCtx)).then(() => navigate('/janji'));
              }}>
              batalkan
            </button>
          ) : null}
        </div>
      ) : null}

      <Sheet open={sheet === 'receipt'} onClose={() => setSheet(null)} title="struk janji">
        <ReceiptView data={receiptFrom(m, going.map((x) => (x.userId === me.user.id ? (me.user.penName ?? 'kamu') : name(x.userId))), circle?.name ?? 'sehari')} />
      </Sheet>

      <Sheet open={sheet === 'wish' || sheet === 'note'} onClose={() => setSheet(null)} title={sheet === 'wish' ? 'kapsul harapan' : 'catatan kecil'}>
        <div className="col">
          <textarea className="field serif-italic" rows={4} value={text} maxLength={600} autoFocus placeholder={sheet === 'wish' ? 'semoga hari itu kita…' : 'yang lucu, yang manis, yang tidak boleh lupa'} onChange={(e) => setText(e.target.value)} />
          <button className="btn" disabled={!text.trim() || busy} onClick={() => { const k = sheet as 'wish' | 'note'; setSheet(null); void entry({ kind: k, text: text.trim() }); }}>
            {sheet === 'wish' ? 'segel harapan' : 'tempel'}
          </button>
        </div>
      </Sheet>

      <Sheet open={sheet === 'story'} onClose={() => setSheet(null)} title="cerita hari itu">
        <div className="col">
          <input className="field" value={story.title} placeholder="judul (boleh kosong)" onChange={(e) => setStory({ ...story, title: e.target.value })} />
          <div className="row" style={{ gap: 4 }} role="radiogroup" aria-label="rasa">
            <span className="small soft" style={{ marginRight: 6 }}>rasanya</span>
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} className={`heart-btn ${story.rating >= n ? 'on' : ''}`} aria-label={`${n}`} data-sound="pop" onClick={() => setStory({ ...story, rating: n })}>
                ♥
              </button>
            ))}
          </div>
          <textarea className="field write-like" rows={7} value={story.text} placeholder="ceritakan dari awal: siapa yang telat, apa yang lucu, apa yang bikin hangat…" onChange={(e) => setStory({ ...story, text: e.target.value })} />
          <input className="field" value={story.best} placeholder="momen terbaik" onChange={(e) => setStory({ ...story, best: e.target.value })} />
          <input className="field" value={story.next} placeholder="lain kali kita…" onChange={(e) => setStory({ ...story, next: e.target.value })} />
          <button
            className="btn"
            disabled={!story.text.trim() || busy}
            onClick={() => {
              setSheet(null);
              void entry({ kind: 'story', title: story.title.trim() || undefined, text: story.text.trim(), rating: story.rating || undefined, best: story.best.trim() || undefined, next: story.next.trim() || undefined });
              setStory({ title: '', text: '', rating: 0, best: '', next: '' });
            }}>
            simpan cerita
          </button>
        </div>
      </Sheet>
    </main>
  );
}

function Polaroid({ mref, tilt, by }: { mref: import('@sehari/core').MediaRef; tilt: number; by: string }) {
  const url = useMediaUrl(mref);
  return (
    <figure className="memory-polaroid" style={{ transform: `rotate(${tilt}deg)` }}>
      {url ? <img src={url} alt="" /> : <div className="ph" style={{ background: mref.tint ?? 'var(--pill)' }} />}
      <figcaption className="hand">{by}</figcaption>
    </figure>
  );
}
