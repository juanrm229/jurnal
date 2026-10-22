/**
 * Kitab lingkaran: bab per bulan (judulnya dipilih bersama), adegan mingguan
 * dari pemegang pena, jilid tahunan dengan genre, prolog & epilog, dan
 * "Kalimat Terakhir" sebagai puisi panjang yang ditulis tanpa sadar.
 */
import {
  type ChapterWire,
  DECKS,
  findCard,
  formatDayLong,
  formatMonth,
  GENRES,
  isoWeek,
  kindToFit,
  monthKey,
  penHolderFor,
  prevMonth,
  type SceneWire,
  type VolumeWire,
  weekRange,
} from '@sehari/core';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import { type CircleView, openCircleText, sealCircleText, useCircle, useCircleRange, useMe, useOpenDrops, useToday } from '@/lib/data';
import { navigate, useParams } from '@/lib/router';
import { Doodle, ErrorNote, Growing, Header, Screen, Section } from '@/ui/kit';
import { Btn, ErrLine, errorText, GenreCover, genreById, LoreHero, nameIn, sortByTime, YearSwitch } from './board';
import { Ceremony, ceremonyOpen } from './Ceremony';
import { PrintBook, useBookOrders } from './PrintBook';

const drop = (params: Record<string, string>) => navigate('/hari?' + new URLSearchParams(params));

export default function Kitab() {
  const { id } = useParams<{ id: string }>();
  const me = useMe();
  const today = useToday();
  const circle = useCircle(id);
  const thisYear = Number(today.slice(0, 4));
  const [year, setYear] = useState(thisYear);
  const chapters = useQuery({ queryKey: ['chapters', id], queryFn: () => api.get<ChapterWire[]>(`/circles/${id}/chapters`), enabled: !!circle });

  if (!circle)
    return (
      <Screen>
        <Header title="kitab" backTo={`/l/${id}`} />
        <Growing />
      </Screen>
    );
  const minYear = Number(circle.createdDay.slice(0, 4));
  const ceremonyMonths = [monthKey(today), prevMonth(monthKey(today))].filter((m) => ceremonyOpen(m, today) && m >= monthKey(circle.createdDay));
  const list = [...(chapters.data ?? [])].sort((a, b) => (a.month < b.month ? 1 : -1));

  return (
    <Screen>
      <Header title="kitab" sub={circle.name} backTo={`/l/${id}`} />
      <div className="lore-kitab-hero card">
        <div className="lore-kitab-spine" aria-hidden />
        <LoreHero
          doodle="buku-terbuka"
          size={84}
          title="kitab yang kalian tulis bersama"
          sub={
            <span className="row wrap" style={{ justifyContent: 'center', gap: 6 }}>
              {['hari jadi halaman', 'minggu jadi adegan', 'bulan jadi bab', 'tahun jadi jilid'].map((t, i) => (
                <span key={t} className="lore-tag" style={{ transform: `rotate(${i % 2 ? 1.5 : -1.5}deg)` }}>
                  {t}
                </span>
              ))}
            </span>
          }
        />
      </div>

      {/* ── Bab ── */}
      <Section title="bab">
        {ceremonyMonths.map((m) => (
          <div key={m} style={{ marginBottom: 16 }}>
            <Ceremony circle={circle} month={m} chapter={chapters.data?.find((x) => x.month === m)} meId={me.user.id} />
          </div>
        ))}
        {chapters.error ? <ErrorNote error={chapters.error} onRetry={() => void chapters.refetch()} /> : null}
        {chapters.isLoading ? (
          <Growing />
        ) : list.length ? (
          <div className="card lore-toc">
            {list.map((ch) => {
              const title = ch.titleEnc ? openCircleText(circle, ch.titleEnc) : null;
              return (
                <button key={ch.month} className="lore-toc-row" onClick={() => navigate(`/wrap/${id}/month/${ch.month}`)}>
                  <span className="lore-toc-month">
                    <span className="tiny ink-soft" style={{ display: 'block' }}>bab</span>
                    <span className="small ink">
                      {formatMonth(ch.month).split(' ')[0]!.slice(0, 3).toLowerCase()} {ch.month.slice(2, 4)}
                    </span>
                  </span>
                  <span className="grow" style={{ textAlign: 'left' }}>
                    {title ? (
                      <span className="hand" style={{ fontSize: 26, display: 'block' }}>{title}</span>
                    ) : (
                      <span className="small soft" style={{ display: 'block' }}>{ch.month === monthKey(today) ? 'sedang ditulis…' : 'belum berjudul'}</span>
                    )}
                    <span className="tiny soft">
                      {formatMonth(ch.month)}
                      {!title && ch.proposals.length ? ` · ${ch.proposals.length} usulan` : ''}
                    </span>
                  </span>
                  <Doodle id="ui-panah-kanan" size={16} style={{ opacity: 0.6 }} />
                </button>
              );
            })}
          </div>
        ) : (
          <div className="card flat col center" style={{ alignItems: 'center' }}>
            <Doodle id="pena" size={40} draw />
            <span className="small soft">Bab pertama sedang ditulis. Judulnya dipilih bersama di akhir bulan.</span>
          </div>
        )}
        {!ceremonyMonths.length ? (
          <p className="tiny soft center" style={{ marginTop: 8 }}>
            Upacara Tutup Bab dibuka tiga hari terakhir setiap bulan, sampai tanggal tujuh bulan berikutnya.
          </p>
        ) : null}
      </Section>

      {/* ── Adegan ── */}
      {circle.kind !== 'moment' ? <SceneSection circle={circle} meId={me.user.id} ownedDecks={me.ownedDecks} today={today} /> : null}

      {/* ── Jilid ── */}
      <Section title="jilid & genre">
        <YearSwitch year={year} min={minYear} max={thisYear} onChange={setYear} />
        <div style={{ height: 8 }} />
        <VolumeSection circle={circle} year={year} meId={me.user.id} />
      </Section>

      <Section title="prolog & epilog">
        <div className="row" style={{ gap: 10 }}>
          <button className="card press lore-write" onClick={() => drop({ prompt: `Prolog jilid ${year}: bagaimana cerita kita dimulai?`, kind: 'prologue', circleId: id })}>
            <Doodle id="pena" size={34} />
            <span className="hand" style={{ fontSize: 26 }}>prolog</span>
            <span className="tiny soft">bagaimana cerita kita dimulai?</span>
          </button>
          <button className="card press lore-write" onClick={() => drop({ prompt: `Epilog jilid ${year}: kalau tahun ini satu buku, apa isi halaman terakhirnya?`, kind: 'epilogue', circleId: id })}>
            <Doodle id="buku" size={34} />
            <span className="hand" style={{ fontSize: 26 }}>epilog</span>
            <span className="tiny soft">apa isi halaman terakhirnya?</span>
          </button>
        </div>
        <p className="tiny soft center" style={{ marginTop: 8 }}>epilog biasanya ditulis di malam tahun baru, tapi boleh kapan saja</p>
      </Section>

      <Section title="tahun kita">
        <button className="card press row" style={{ gap: 12 }} onClick={() => navigate(`/wrap/${id}/year/${year}`)}>
          <Doodle id="rak-buku" size={40} />
          <span className="grow">
            <span className="ink" style={{ display: 'block' }}>Tahun Kita {year}</span>
            <span className="tiny soft">jilid {year} dibuka bersama di Malam Buka Kapsul</span>
          </span>
          <Doodle id="ui-panah-kanan" size={16} style={{ opacity: 0.6 }} />
        </button>
        <PrintEntry circle={circle} year={year} meId={me.user.id} />
      </Section>

      <LastLines circle={circle} year={year} today={today} meId={me.user.id} />
    </Screen>
  );
}

// ── Cetak jilid ─────────────────────────────────────────────────────────────

function PrintEntry({ circle, year, meId }: { circle: CircleView; year: number; meId: string }) {
  const [open, setOpen] = useState<null | { resume?: string }>(null);
  const orders = useBookOrders();
  const mine = (orders.data ?? []).filter((o) => o.circleId === circle.id && o.year === year);
  const resumable = mine.find((o) => o.status === 'paid' && (o.bookStatus === 'awaiting_file' || !o.bookStatus));
  const printing = mine.find((o) => o.bookStatus === 'printing' || o.bookStatus === 'shipped');
  useEffect(() => setOpen(null), [year]);

  if (open) return <div style={{ marginTop: 12 }}><PrintBook circle={circle} year={year} meId={meId} resumeOrderId={open.resume} onClose={() => setOpen(null)} /></div>;
  return (
    <div className="col" style={{ marginTop: 12 }}>
      {printing ? (
        <div className="sticky row" style={{ background: 'var(--sticky-green)', transform: 'rotate(-0.5deg)' }}>
          <Doodle id="kado" size={30} color="currentColor" />
          <span className="small grow">{printing.bookStatus === 'shipped' ? `Jilid ${year} sudah dikirim.` : `Jilid ${year} sedang dicetak.`}</span>
        </div>
      ) : null}
      {resumable ? (
        <Btn kind="soft" icon="ui-cetak" onClick={() => setOpen({ resume: resumable.id })}>
          lanjutkan pesanan cetak jilid {year}
        </Btn>
      ) : (
        <Btn kind="ghost" icon="ui-cetak" onClick={() => setOpen({})}>
          cetak jilid {year} jadi buku
        </Btn>
      )}
    </div>
  );
}

// ── Adegan (Pemegang Pena) ──────────────────────────────────────────────────

function SceneSection({ circle, meId, ownedDecks, today }: { circle: CircleView; meId: string; ownedDecks: string[]; today: string }) {
  const qc = useQueryClient();
  const week = isoWeek(today);
  const scenes = useQuery({ queryKey: ['scenes', circle.id], queryFn: () => api.get<SceneWire[]>(`/circles/${circle.id}/scenes`) });
  const scene = scenes.data?.find((s) => s.week === week);
  const holderId = scene?.penHolderId ?? penHolderFor(circle.active.map((m) => m.userId), week, circle.id);
  const iHold = holderId === meId;
  const savedTitle = scene?.titleEnc ? openCircleText(circle, scene.titleEnc) : '';
  const [title, setTitle] = useState('');
  const [offset, setOffset] = useState(0);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => setTitle(savedTitle), [savedTitle]);

  const pool = useMemo(() => {
    const fit = kindToFit(circle.kind);
    return DECKS.filter((d) => d.id === 'dasar' || ownedDecks.includes(d.id)).flatMap((d) => d.cards.filter((card) => !card.rare && (card.fit.includes('semua') || card.fit.includes(fit))));
  }, [circle.kind, ownedDecks]);
  const shown = pool.length ? Array.from({ length: Math.min(4, pool.length) }, (_, i) => pool[(offset + i * 7) % pool.length]!) : [];
  const chosen = scene?.cardId ? findCard(scene.cardId)?.card : undefined;
  const { start, end } = weekRange(week);
  const past = (scenes.data ?? []).filter((s) => s.week < week && s.titleEnc).slice(-4).reverse();
  const holder = circle.members.find((m) => m.userId === holderId);

  const put = async (body: { titleEnc?: string; cardId?: string }) => {
    setBusy(true);
    setErr(null);
    try {
      await api.put(`/circles/${circle.id}/scenes/${week}`, body);
      await qc.invalidateQueries({ queryKey: ['scenes', circle.id] });
    } catch (e) {
      setErr(errorText(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Section title="adegan minggu ini">
      <div className="card col lore-scene">
        <div className="row" style={{ gap: 12 }}>
          <span className="lore-pen-holder">
            <Doodle id={holder?.doodle ?? 'tunas'} size={30} />
            <span className="lore-pen-badge">
              <Doodle id="pena" size={18} color="var(--on-ink)" />
            </span>
          </span>
          <div className="grow">
            <div className="small">
              pena dipegang <span className="ink">{nameIn(circle, holderId ?? '', meId)}</span>
            </div>
            <div className="tiny soft">
              {formatDayLong(start, false)} – {formatDayLong(end)}
            </div>
          </div>
        </div>
        {iHold ? (
          <>
            <input className="field hand" style={{ fontSize: 26, padding: '8px 14px' }} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="judul adegan minggu ini…" maxLength={80} />
            <Btn disabled={!title.trim() || title.trim() === savedTitle} loading={busy} onClick={() => void put({ titleEnc: sealCircleText(circle, title.trim()) })}>
              {savedTitle ? 'ganti judul' : 'simpan judul'}
            </Btn>
            <span className="label" style={{ marginTop: 8 }}>kartu bersama minggu ini</span>
            <div className="col" style={{ gap: 6 }}>
              {shown.map((card) => {
                const on = scene?.cardId === card.id;
                return (
                  <button key={card.id} className={`lore-choice ${on ? 'on' : ''}`} aria-pressed={on} onClick={() => void put({ cardId: card.id })}>
                    <Doodle id={card.doodle ?? 'kartu'} size={26} />
                    <span className="grow" style={{ textAlign: 'left' }}>
                      <span className="small ink" style={{ display: 'block' }}>{card.title}</span>
                      <span className="tiny soft lore-clamp2">{card.body}</span>
                    </span>
                  </button>
                );
              })}
            </div>
            <Btn kind="ghost" className="sm" icon="ui-dadu" onClick={() => setOffset((o) => o + 1)}>
              kartu lain
            </Btn>
          </>
        ) : savedTitle ? (
          <div className="hand" style={{ fontSize: 30 }}>{savedTitle}</div>
        ) : (
          <p className="small soft" style={{ margin: 0 }}>Judul adegan minggu ini masih menunggu sang narator.</p>
        )}
        {chosen ? (
          <div className="sticky" style={{ background: 'var(--sticky-blue)', transform: 'rotate(0.6deg)', marginTop: 8 }}>
            <div className="row" style={{ alignItems: 'flex-start' }}>
              <Doodle id={chosen.doodle ?? 'kartu'} size={30} color="currentColor" />
              <div className="grow">
                <div className="tiny" style={{ opacity: 0.7 }}>kartu bersama · {chosen.title}</div>
                <div className="small">{chosen.body}</div>
              </div>
            </div>
            <button className="btn soft sm" style={{ marginTop: 10 }} onClick={() => drop({ prompt: chosen.body, cardId: chosen.id, circleId: circle.id })}>
              jawab kartu ini
            </button>
          </div>
        ) : null}
        <ErrLine>{err}</ErrLine>
        {past.length ? (
          <div className="col" style={{ gap: 2, marginTop: 6 }}>
            <span className="label">adegan sebelumnya</span>
            {past.map((s) => (
              <div key={s.week} className="row" style={{ gap: 8 }}>
                <span className="tiny soft" style={{ width: 70, flexShrink: 0 }}>{formatDayLong(weekRange(s.week).start, false)}</span>
                <span className="hand grow" style={{ fontSize: 22, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{openCircleText(circle, s.titleEnc)}</span>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </Section>
  );
}

// ── Jilid & Genre ───────────────────────────────────────────────────────────

function VolumeSection({ circle, year, meId }: { circle: CircleView; year: number; meId: string }) {
  const qc = useQueryClient();
  const volumes = useQuery({ queryKey: ['volumes', circle.id], queryFn: () => api.get<VolumeWire[]>(`/circles/${circle.id}/volumes`) });
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const vol = volumes.data?.find((v) => v.year === year);
  const genre = genreById(vol?.genreId);
  const myVote = vol?.genreVotes.find((v) => v.userId === meId)?.genreId;
  const tally = new Map<string, string[]>();
  for (const v of vol?.genreVotes ?? []) (tally.get(v.genreId) ?? tally.set(v.genreId, []).get(v.genreId)!).push(v.userId);

  const vote = async (genreId: string) => {
    setBusy(genreId);
    setErr(null);
    try {
      await api.put(`/circles/${circle.id}/volumes/${year}/genre`, { genreId });
      await qc.invalidateQueries({ queryKey: ['volumes', circle.id] });
    } catch (e) {
      setErr(errorText(e));
    } finally {
      setBusy(null);
    }
  };

  if (volumes.isLoading) return <Growing />;
  if (volumes.error) return <ErrorNote error={volumes.error} onRetry={() => void volumes.refetch()} />;

  return (
    <div className="col" style={{ gap: 10 }}>
      <div className="card row" style={{ alignItems: 'flex-start', gap: 16 }}>
        {genre ? (
          <span style={{ transform: 'rotate(-3deg)', flexShrink: 0 }}>
            <GenreCover genre={genre} width={78} height={104} />
          </span>
        ) : (
          <span className="lore-cover empty" style={{ width: 78, height: 104 }}>
            <Doodle id="buku" size={30} style={{ opacity: 0.5 }} />
          </span>
        )}
        <div className="grow col" style={{ gap: 2 }}>
          <span className="label">jilid {year}</span>
          <span className="hand" style={{ fontSize: 30 }}>{genre ? genre.name : 'genre belum dipilih'}</span>
          <span className="small soft">{genre ? genre.blurb : 'Pilih bersama: jilid ini mau jadi cerita macam apa? Genre bisa dipilih ulang sebelum dicetak.'}</span>
          {vol?.genreVotes.length ? (
            <span className="tiny soft" style={{ marginTop: 4 }}>
              {vol.genreVotes.length} dari {circle.active.length} sudah memilih
            </span>
          ) : null}
        </div>
      </div>
      <div className="lore-shelf-scroll">
        {GENRES.map((g, i) => {
          const votes = tally.get(g.id) ?? [];
          const mine = myVote === g.id;
          return (
            <button key={g.id} className={`lore-genre ${mine ? 'on' : ''}`} disabled={busy === g.id} onClick={() => void vote(g.id)} style={{ ['--tilt' as string]: `${(i % 3) - 1}deg` }}>
              <GenreCover genre={g} selected={mine} />
              <span className={`tiny ${mine ? 'ink' : ''} lore-clamp2`}>{g.name}</span>
              {votes.length ? <span className="tiny soft lore-clamp1">{votes.map((u) => nameIn(circle, u, meId)).join(', ')}</span> : null}
            </button>
          );
        })}
      </div>
      <ErrLine>{err}</ErrLine>
    </div>
  );
}

// ── Kalimat Terakhir ────────────────────────────────────────────────────────

function LastLines({ circle, year, today, meId }: { circle: CircleView; year: number; today: string; meId: string }) {
  const end = `${year}-12-31` < today ? `${year}-12-31` : today;
  const start = `${year}-01-01` > circle.createdDay ? `${year}-01-01` : circle.createdDay;
  const range = useCircleRange(circle.id, start, end, start <= end);
  const opened = useOpenDrops(range.data?.drops);
  const lines = sortByTime(opened.filter((d) => d.wire.kind === 'last_line' && d.payload?.text));
  let lastDay = '';

  return (
    <Section title="kalimat terakhir">
      <div className="card lore-poem-paper">
        <div className="label center" style={{ display: 'block' }}>puisi panjang yang ditulis tanpa sadar · {year}</div>
        <div style={{ height: 14 }} />
        {range.isLoading ? (
          <Growing />
        ) : lines.length === 0 ? (
          <div className="col center" style={{ alignItems: 'center' }}>
            <Doodle id="pena" size={44} draw className="sway" />
            <p className="small soft center" style={{ margin: 0 }}>Setiap kapsul ditutup dengan satu kalimat. Nanti kalimat-kalimat itu berbaris di sini jadi satu puisi.</p>
          </div>
        ) : (
          lines.map((d) => {
            const showDate = d.wire.day !== lastDay;
            lastDay = d.wire.day;
            return (
              <div key={d.wire.id} style={{ marginTop: showDate ? 12 : 0 }}>
                {showDate ? <div className="tiny soft">{formatDayLong(d.wire.day, false)}</div> : null}
                <div className="hand" style={{ fontSize: 25, lineHeight: 1.2 }}>
                  {d.payload!.text}
                  <span className="tiny soft" style={{ fontFamily: 'var(--mono)' }}>{`  — ${nameIn(circle, d.wire.authorId, meId)}`}</span>
                </div>
              </div>
            );
          })
        )}
        {lines.length ? <p className="tiny soft center" style={{ marginTop: 16, marginBottom: 0 }}>{lines.length} baris sejauh ini</p> : null}
      </div>
    </Section>
  );
}
