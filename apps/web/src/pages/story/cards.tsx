/**
 * Satu renderer untuk setiap jenis kartu Wrap. Kertas, tinta, dan doodle
 * besar — seperti halaman buku harian yang dibalik satu per satu.
 */
import { COPY, dayName, formatDayLong, formatMonth, GENRES, getCity, type MediaRef, monthName, MOODS, parseDay, type SongRef, type WrapCard, type WrapScope } from '@sehari/core';
import { type CSSProperties, type ReactNode, useLayoutEffect, useRef, useState } from 'react';
import { useMediaUrl } from '@/lib/media';
import { navigate } from '@/lib/router';
import { Avatar, Doodle, Sticky } from '@/ui/kit';

export type StoryCard = WrapCard | { type: 'quiet'; text: string };

export interface StoryCtx {
  meId: string;
  circleId: string;
  scope: WrapScope;
  label: string;
  name: (userId: string) => string;
  doodleOf: (userId: string) => string;
  /** Kartu ini sedang tampil dan tidak dijeda. */
  playing: boolean;
  /** Durasi tampil kartu ini (ms), untuk puisi yang menggulung sendiri. */
  duration: number;
  suggestedTitle?: string;
  memberDoodles: string[];
}

const SCOPE_WORD: Record<WrapScope, string> = { week: 'minggu kita', month: 'bulan kita', year: 'tahun kita', moment: 'wrap acara' };

export const PROVIDER_LABEL: Record<SongRef['provider'], string> = {
  spotify: 'Spotify',
  youtube_music: 'YouTube Music',
  youtube: 'YouTube',
  apple_music: 'Apple Music',
  lainnya: 'tautan',
};

/** Warna latar tiap kartu, supaya ceritanya terasa seperti kertas yang berganti. */
export function tintFor(card: StoryCard): string {
  switch (card.type) {
    case 'moment':
    case 'chapters':
      return 'var(--paper)';
    case 'stat':
    case 'motif':
      return 'var(--sticky-yellow)';
    case 'song':
    case 'playlist':
      return 'var(--sticky-blue)';
    case 'photos':
    case 'roles':
      return 'var(--card)';
    case 'streak':
    case 'bestDay':
      return 'var(--sticky-peach)';
    case 'words':
    case 'places':
      return 'var(--sticky-green)';
    case 'lines':
    case 'quiet':
      return 'var(--story-aged)';
    default:
      return 'var(--paper)';
  }
}

export function openSong(url: string) {
  window.open(url, '_blank', 'noopener,noreferrer');
}

/** Foto terenkripsi, dibuka di perangkat. */
export function Photo({ media, style, className }: { media: MediaRef; style?: CSSProperties; className?: string }) {
  const url = useMediaUrl(media);
  const ratio = media.width && media.height ? media.width / media.height : 4 / 3;
  return (
    <div className={['story-photo', className].filter(Boolean).join(' ')} style={{ aspectRatio: ratio, background: media.tint ?? 'var(--pill)', ...style }}>
      {url ? <img src={url} alt="foto" draggable={false} /> : <Doodle id="ui-foto" size={32} style={{ opacity: 0.6 }} />}
    </div>
  );
}

// ── Bagian kecil ────────────────────────────────────────────────────────────

function Kicker({ children }: { children: ReactNode }) {
  return <div className="label center story-kicker">{typeof children === 'string' ? children.toLowerCase() : children}</div>;
}

function Big({ children, size = 34, hand, color, left, style }: { children: ReactNode; size?: number; hand?: boolean; color?: string; left?: boolean; style?: CSSProperties }) {
  return (
    <div
      className="story-big"
      style={{
        fontFamily: hand ? 'var(--hand)' : 'var(--mono)',
        fontWeight: hand ? 700 : 400,
        fontSize: `min(${size}px, ${(size / 3.9).toFixed(1)}vw)`,
        lineHeight: hand ? 1.05 : 1.18,
        color: color ?? 'var(--ink)',
        textAlign: left ? 'left' : 'center',
        letterSpacing: hand ? 0 : '0.02em',
        ...style,
      }}>
      {children}
    </div>
  );
}

function Hand({ children, size = 28, style, className }: { children: ReactNode; size?: number; style?: CSSProperties; className?: string }) {
  return (
    <div className={['hand', className].filter(Boolean).join(' ')} style={{ fontSize: size, lineHeight: 1.15, color: 'var(--text)', ...style }}>
      {children}
    </div>
  );
}

/** Doodle raksasa samar di sudut, seperti coretan di pinggir buku. */
function Margin({ id, corner = 'br' }: { id: string; corner?: 'br' | 'tl' | 'bl' }) {
  const pos: CSSProperties = corner === 'br' ? { right: -40, bottom: -30 } : corner === 'tl' ? { left: -50, top: 40 } : { left: -40, bottom: -20 };
  return (
    <span className="story-margin-layer" aria-hidden>
      <span className="story-margin" style={{ ...pos, transform: `rotate(${corner === 'br' ? -12 : 14}deg)` }}>
        <Doodle id={id} size={260} sw={2} draw={0.3} />
      </span>
    </span>
  );
}

function Center({ children, align, style }: { children: ReactNode; align?: boolean; style?: CSSProperties }) {
  return (
    <div className={`story-center${align ? ' mid' : ''}`} style={style}>
      {children}
    </div>
  );
}

function OutlineLink({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button className="story-link" onClick={onClick}>
      {children}
    </button>
  );
}

// ── Renderer ────────────────────────────────────────────────────────────────

export function CardView({ card, ctx }: { card: StoryCard; ctx: StoryCtx }) {
  switch (card.type) {
    case 'cover':
      return <Cover card={card} ctx={ctx} />;
    case 'stat':
      return <Stat card={card} />;
    case 'moment':
      return <Moment card={card} ctx={ctx} />;
    case 'song':
      return <Song card={card} ctx={ctx} />;
    case 'palette':
      return <Palette card={card} />;
    case 'photos':
      return <Photos card={card} ctx={ctx} />;
    case 'words':
      return <Words card={card} />;
    case 'places':
      return <Places card={card} />;
    case 'streak':
      return <Streak card={card} ctx={ctx} />;
    case 'lines':
      return <Lines card={card} ctx={ctx} />;
    case 'bestDay':
      return <BestDay card={card} ctx={ctx} />;
    case 'roles':
      return <Roles card={card} ctx={ctx} />;
    case 'chapters':
      return <Chapters card={card} />;
    case 'motif':
      return <Motif card={card} />;
    case 'genre':
      return <GenreCard card={card} />;
    case 'playlist':
      return <Playlist card={card} />;
    case 'closing':
      return <Closing card={card} ctx={ctx} />;
    case 'quiet':
      return <Quiet card={card} />;
  }
}

type Of<T extends StoryCard['type']> = Extract<StoryCard, { type: T }>;

function Cover({ card, ctx }: { card: Of<'cover'>; ctx: StoryCtx }) {
  return (
    <Center align>
      <Margin id={ctx.scope === 'year' ? 'rak-buku' : 'bintang'} corner="tl" />
      <Doodle id={card.doodle} size={170} sw={2.2} draw />
      <div style={{ height: 16 }} />
      <div className="label center">
        {SCOPE_WORD[ctx.scope]} · {ctx.label.toLowerCase()}
      </div>
      <Big size={card.title.length > 22 ? 32 : 42} style={{ animationDelay: '.2s' }}>
        {card.title}
      </Big>
      <Hand className="center story-rise" style={{ animationDelay: '.5s' }}>
        {card.subtitle}
      </Hand>
      {ctx.suggestedTitle ? <div className="tiny soft center" style={{ marginTop: 8 }}>bab ini belum diberi judul. mungkin: “{ctx.suggestedTitle}”?</div> : null}
      <div className="row wrap" style={{ marginTop: 24, justifyContent: 'center', gap: 6 }}>
        {ctx.memberDoodles.slice(0, 12).map((d, i) => (
          <span key={`${d}${i}`} className="story-rise" style={{ animationDelay: `${0.7 + i * 0.08}s` }}>
            <Avatar doodle={d} size={38} sealed />
          </span>
        ))}
      </div>
    </Center>
  );
}

function Stat({ card }: { card: Of<'stat'> }) {
  return (
    <Center align>
      <Margin id="rumput" />
      <Doodle id={card.doodle} size={120} draw />
      <Big size={card.value.length > 6 ? 72 : 96} style={{ animationDelay: '.15s' }}>
        {card.value}
      </Big>
      <Hand size={32} className="center story-rise" style={{ animationDelay: '.4s' }}>
        {card.label}
      </Hand>
      {card.note ? <div className="small soft center">{card.note}</div> : null}
    </Center>
  );
}

function Moment({ card, ctx }: { card: Of<'moment'>; ctx: StoryCtx }) {
  const d = card.drop;
  const photo = d.media?.mime.startsWith('image/') ? d.media : undefined;
  return (
    <Center>
      <Kicker>{card.title}</Kicker>
      <div className="story-drop-in">
        <Sticky color="yellow" tilt={-2}>
          <div className="row between" style={{ marginBottom: 8 }}>
            <span className="row gap-sm">
              <Doodle id={ctx.doodleOf(d.userId)} size={22} />
              <span className="small ink">{ctx.name(d.userId)}</span>
            </span>
            <span className="tiny" style={{ opacity: 0.7 }}>
              {dayName(d.day)}, {formatDayLong(d.day, false)}
            </span>
          </div>
          {photo ? <Photo media={photo} style={{ marginBottom: 8, maxHeight: 300 }} /> : null}
          {d.text ? (
            <Hand size={photo ? 24 : 30} className="story-clamp" style={{ WebkitLineClamp: photo ? 4 : 9 } as CSSProperties}>
              {d.text}
            </Hand>
          ) : null}
          {d.song ? (
            <button className="row gap-sm story-plain" style={{ marginTop: 8, width: '100%' }} onClick={() => openSong(d.song!.url)}>
              <Doodle id="ui-lagu" size={20} />
              <span className="small ink grow" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textAlign: 'left' }}>
                {d.song.title} — {d.song.artist}
              </span>
            </button>
          ) : null}
          {!d.text && !photo && !d.song ? <Hand>satu hal kecil yang dipeluk bersama</Hand> : null}
        </Sticky>
      </div>
      <div className="row story-rise" style={{ justifyContent: 'center', marginTop: 24, animationDelay: '.6s' }}>
        <Doodle id="ui-peluk" size={30} className="breathe" />
        <span className="h2">dipeluk {card.hugs} kali</span>
      </div>
    </Center>
  );
}

function Song({ card, ctx }: { card: Of<'song'>; ctx: StoryCtx }) {
  const s = card.song;
  const by = card.byUserIds.map(ctx.name);
  return (
    <Center align>
      <Margin id="gitar" />
      <Kicker>{card.title}</Kicker>
      <div className={`story-vinyl${ctx.playing ? ' spinning' : ''}`} aria-hidden>
        <div className="story-vinyl-label">{s.artworkUrl ? <img src={s.artworkUrl} alt="" /> : <Doodle id="ui-lagu" size={44} />}</div>
      </div>
      <div style={{ height: 16 }} />
      <Big size={s.title.length > 18 ? 28 : 36}>{s.title}</Big>
      <div className="center">{s.artist}</div>
      <div className="small soft center" style={{ marginTop: 4 }}>
        muncul {card.count} kali{by.length ? ` · dibawa ${by.join(', ')}` : ''}
      </div>
      <OutlineLink onClick={() => openSong(s.url)}>buka di {PROVIDER_LABEL[s.provider] ?? 'tautan'}</OutlineLink>
      <div className="tiny soft center" style={{ marginTop: 8 }}>lagu tampil sebagai kartu, tidak diputar di sini.</div>
    </Center>
  );
}

function Palette({ card }: { card: Of<'palette'> }) {
  const total = card.moods.reduce((a, m) => a + m.count, 0) || 1;
  return (
    <Center>
      <Kicker>{card.title}</Kicker>
      <div className="story-palette">
        {card.moods.map((m, i) => (
          <div key={m.mood} className="story-band" style={{ flex: m.count, background: m.color, animationDelay: `${i * 0.12}s` }}>
            <span className="row">
              <Doodle id={MOODS[m.mood]?.doodle ?? 'tunas'} size={22} color="#ffffff" />
              <span style={{ fontFamily: 'var(--hand)', fontWeight: 700, fontSize: 24, color: '#fff' }}>{m.label}</span>
            </span>
            <span style={{ fontSize: 13, color: '#fff' }}>{Math.round((m.count / total) * 100)}%</span>
          </div>
        ))}
      </div>
      <div className="small soft center" style={{ marginTop: 16 }}>
        {total} warna dititipkan
      </div>
    </Center>
  );
}

function Photos({ card, ctx }: { card: Of<'photos'>; ctx: StoryCtx }) {
  const n = card.items.length;
  const cols = n === 1 ? 1 : n <= 4 ? 2 : 3;
  const shown = card.items.slice(0, cols === 1 ? 1 : cols === 2 ? 4 : 9);
  return (
    <Center>
      <Kicker>{card.title}</Kicker>
      <div className="story-photos" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, maxWidth: cols === 1 ? 320 : undefined }}>
        {shown.map((it, i) => (
          <div key={it.dropId} className="story-polaroid" style={{ '--r': `${(i % 2 ? 2 : -2) * (cols === 1 ? 0.6 : 1)}deg`, animationDelay: `${i * 0.12}s` } as CSSProperties}>
            <Photo media={it.media} style={{ aspectRatio: cols === 1 ? 0.9 : 1, borderRadius: 2 }} />
            <div className="hand center" style={{ fontSize: cols === 3 ? 18 : 22, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--text)' }}>
              {ctx.name(it.userId)}
            </div>
          </div>
        ))}
      </div>
    </Center>
  );
}

function Words({ card }: { card: Of<'words'> }) {
  const max = Math.max(...card.words.map((w) => w.count), 1);
  return (
    <Center>
      <Margin id="ui-kata" />
      <Kicker>{card.title}</Kicker>
      <div className="row wrap" style={{ justifyContent: 'center', gap: 10 }}>
        {card.words.map((w, i) => {
          const size = 20 + Math.round((w.count / max) * 30);
          const hand = i % 3 === 0;
          return (
            <span
              key={w.word}
              className="story-word"
              style={{
                '--r': `${((i * 7) % 9) - 4}deg`,
                animationDelay: `${i * 0.05}s`,
                fontFamily: hand ? 'var(--hand)' : 'var(--mono)',
                fontWeight: hand ? 700 : 400,
                fontSize: hand ? size + 6 : size * 0.8,
                color: i % 2 ? 'var(--text)' : 'var(--ink)',
              } as CSSProperties}>
              {w.word}
            </span>
          );
        })}
      </div>
      <div className="small soft center" style={{ marginTop: 24 }}>
        {COPY.wraps.topWord(card.words[0]?.word ?? '')}
      </div>
    </Center>
  );
}

/** Peta kecil Indonesia: titik per kota, tanpa koordinat lebih detail dari nama kota. */
function Places({ card }: { card: Of<'places'> }) {
  const cities = card.cities.map((x) => ({ ...x, city: getCity(x.cityId) })).filter((x) => x.city);
  const inId = cities.filter((x) => x.city!.country === 'ID');
  const max = Math.max(...cities.map((x) => x.days), 1);
  const px = (lon: number) => ((lon - 94.5) / (141.5 - 94.5)) * 100;
  const py = (lat: number) => ((6.5 - lat) / (6.5 + 11.5)) * 100;
  return (
    <Center>
      <Margin id="peta" />
      <Kicker>{card.title}</Kicker>
      {inId.length ? (
        <div className="story-map">
          {inId.map((x, i) => {
            const r = 8 + Math.round((x.days / max) * 12);
            return <span key={x.cityId} className="story-pin" style={{ left: `${px(x.city!.lon)}%`, top: `${py(x.city!.lat)}%`, width: r, height: r, animationDelay: `${0.2 + i * 0.1}s` }} />;
          })}
          {inId.slice(0, 6).map((x) => (
            <span key={`${x.cityId}-l`} className="story-pin-label" style={{ left: `clamp(42px, ${px(x.city!.lon)}%, calc(100% - 42px))`, top: `calc(${py(x.city!.lat)}% + 10px)` }}>
              {x.city!.name}
            </span>
          ))}
        </div>
      ) : null}
      <div className="col" style={{ gap: 6 }}>
        {cities.slice(0, 6).map((x) => (
          <div key={x.cityId} className="row between">
            <span className="row grow">
              <Doodle id="ui-lokasi" size={20} />
              <span className="grow" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {x.city!.name}
                <span className="tiny soft">{'  '}{x.city!.province}</span>
              </span>
            </span>
            <span className="small ink">{x.days} hari</span>
          </div>
        ))}
      </div>
      <div className="tiny soft center" style={{ marginTop: 16 }}>hanya nama kota, tidak pernah titik persis.</div>
    </Center>
  );
}

function Streak({ card, ctx }: { card: Of<'streak'>; ctx: StoryCtx }) {
  const level = card.current >= 30 ? 'bright' : card.current >= 7 ? 'warm' : card.current > 0 ? 'dim' : 'fog';
  const icon = level === 'fog' ? 'kabut' : level === 'dim' ? 'ui-api-redup' : 'ui-api';
  return (
    <Center align>
      <Kicker>{card.title}</Kicker>
      <Doodle id={icon} size={110} draw className={level === 'bright' || level === 'warm' ? 'story-flicker' : undefined} color={level === 'fog' ? 'var(--fog)' : undefined} />
      <Big size={88}>{card.current}</Big>
      <Hand className="center">{card.current ? 'hari berturut-turut, bersama' : COPY.streak.dim}</Hand>
      <div className="row" style={{ marginTop: 16, justifyContent: 'center', gap: 24 }}>
        <div className="col" style={{ alignItems: 'center', gap: 0 }}>
          <span className="h2">{card.longest}</span>
          <span className="tiny soft">terpanjang</span>
        </div>
        <div className="col" style={{ alignItems: 'center', gap: 0 }}>
          <span className="h2">{card.togetherDays}</span>
          <span className="tiny soft">hari bersama</span>
        </div>
      </div>
      <div className="row wrap" style={{ marginTop: 24, justifyContent: 'center', gap: 14 }}>
        {card.perMember.map((m, i) => (
          <div key={m.userId} className="col story-rise" style={{ alignItems: 'center', width: 64, gap: 2, animationDelay: `${0.4 + i * 0.08}s` }}>
            <Avatar doodle={ctx.doodleOf(m.userId)} size={40} sealed={m.days > 0} />
            <span className="tiny ink" style={{ maxWidth: '100%', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {ctx.name(m.userId)}
            </span>
            <span className="tiny soft">{m.days} hari</span>
          </div>
        ))}
      </div>
      <div className="tiny soft center" style={{ marginTop: 8 }}>bukan lomba. semua yang ikut, ikut menjaga.</div>
    </Center>
  );
}

/** Kalimat terakhir. Untuk Tahun Kita: puisi panjang yang menggulung pelan sendiri. */
function Lines({ card, ctx }: { card: Of<'lines'>; ctx: StoryCtx }) {
  const long = ctx.scope === 'year';
  const box = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const [travel, setTravel] = useState(0);
  useLayoutEffect(() => {
    if (!long) return;
    const measure = () => setTravel(Math.max(0, (content.current?.offsetHeight ?? 0) - (box.current?.clientHeight ?? 0) + 40));
    measure();
    const ro = new ResizeObserver(measure);
    if (box.current) ro.observe(box.current);
    if (content.current) ro.observe(content.current);
    return () => ro.disconnect();
  }, [long]);
  const lead = 1200;
  const scroll: CSSProperties | undefined =
    long && travel > 0
      ? ({
          '--travel': `-${travel}px`,
          animation: `story-scroll ${Math.max(200, ctx.duration - lead * 2)}ms linear ${lead}ms forwards`,
          animationPlayState: ctx.playing ? 'running' : 'paused',
        } as CSSProperties)
      : undefined;
  return (
    <div className="story-lines">
      <Kicker>{card.title}</Kicker>
      <div ref={box} className={`story-lines-box${long ? '' : ' scroll'}`}>
        <div ref={content} style={scroll}>
          {card.lines.map((l, i) => (
            <div key={`${l.day}${l.userId}${i}`} className="story-rise" style={{ marginBottom: long ? 16 : 10, animationDelay: long ? undefined : `${i * 0.12}s` }}>
              <Hand size={long ? 27 : 25}>{l.text}</Hand>
              <div className="tiny soft">
                — {ctx.name(l.userId)}, {formatDayLong(l.day, false)}
              </div>
            </div>
          ))}
          {long ? <div className="tiny soft center" style={{ marginTop: 16 }}>{card.lines.length} kalimat, satu jilid.</div> : null}
        </div>
      </div>
    </div>
  );
}

function BestDay({ card, ctx }: { card: Of<'bestDay'>; ctx: StoryCtx }) {
  const p = parseDay(card.day);
  return (
    <Center align>
      <Margin id="matahari" />
      <Kicker>{card.title}</Kicker>
      <div className="story-calendar">
        <div className="story-calendar-head">{monthName(p.month).toLowerCase()}</div>
        <Big size={96}>{p.day}</Big>
        <div className="small soft" style={{ marginBottom: 16 }}>
          {dayName(card.day)}
        </div>
      </div>
      <Hand className="center story-rise" style={{ marginTop: 24, animationDelay: '.5s' }}>
        {card.reason}
      </Hand>
      <OutlineLink onClick={() => navigate(`/l/${ctx.circleId}/hari/${card.day}`)}>buka hari itu</OutlineLink>
    </Center>
  );
}

function Roles({ card, ctx }: { card: Of<'roles'>; ctx: StoryCtx }) {
  const colors = ['yellow', 'green', 'peach', 'blue'] as const;
  return (
    <Center>
      <Kicker>{card.title}</Kicker>
      <div className="col" style={{ gap: 18 }}>
        {card.items.slice(0, 4).map((r, i) => (
          <div key={r.userId} className="story-drop-in" style={{ animationDelay: `${i * 0.15}s` }}>
            <Sticky color={colors[i % 4]} tilt={i % 2 ? 1.5 : -1.5} style={{ padding: '18px 16px 14px' }}>
              <div className="row" style={{ gap: 12 }}>
                <Avatar doodle={ctx.doodleOf(r.userId)} size={42} />
                <div className="grow">
                  <Hand>{r.role}</Hand>
                  <div className="small ink">{ctx.name(r.userId)}</div>
                  <div className="tiny" style={{ opacity: 0.7 }}>{r.reason}</div>
                </div>
              </div>
            </Sticky>
          </div>
        ))}
      </div>
      <div className="tiny soft center" style={{ marginTop: 16 }}>julukan, bukan peringkat.</div>
    </Center>
  );
}

function Chapters({ card }: { card: Of<'chapters'> }) {
  return (
    <Center>
      <Margin id="buku" />
      <Kicker>{card.title}</Kicker>
      <div className="col" style={{ gap: 10 }}>
        {card.items.map((it, i) => (
          <div key={it.month} className="row story-rise" style={{ alignItems: 'flex-end', animationDelay: `${i * 0.1}s` }}>
            <span className="tiny soft" style={{ width: 26, flexShrink: 0 }}>
              {String(i + 1).padStart(2, '0')}
            </span>
            <Hand size={24} className="story-clamp" style={{ WebkitLineClamp: 2, flexShrink: 1 } as CSSProperties}>
              {it.title}
            </Hand>
            <span className="story-leader" />
            <span className="tiny ink">{formatMonth(it.month).split(' ')[0]?.toLowerCase()}</span>
          </div>
        ))}
      </div>
    </Center>
  );
}

function Motif({ card }: { card: Of<'motif'> }) {
  return (
    <Center align>
      <Margin id="pena" />
      <Kicker>{card.title}</Kicker>
      <Big hand size={card.word.length > 10 ? 64 : 86} style={{ animation: 'story-ink 1.2s ease both' }}>
        “{card.word}”
      </Big>
      <Hand size={26} className="center story-rise" style={{ marginTop: 8, animationDelay: '.6s' }}>
        muncul lagi dan lagi, di {card.days} hari
      </Hand>
      <div className="tiny soft center" style={{ marginTop: 16 }}>seperti dalam novel: hal yang terus kembali.</div>
    </Center>
  );
}

function GenreCard({ card }: { card: Of<'genre'> }) {
  const g = GENRES.find((x) => x.name === card.genre);
  return (
    <Center align>
      <Kicker>{card.title}</Kicker>
      <div className={`story-volume pattern-${g?.cover.pattern ?? 'polos'}`}>
        <span className="story-volume-spine" />
        <span className="tiny" style={{ letterSpacing: '0.2em', opacity: 0.8 }}>SEHARI · JILID</span>
        <span style={{ alignSelf: 'center' }}>
          <Doodle id={g?.cover.doodle ?? 'buku'} size={96} color="var(--on-ink)" draw={0.4} />
        </span>
        <span style={{ fontFamily: 'var(--hand)', fontWeight: 700, fontSize: 32, lineHeight: 1.05 }}>{card.genre}</span>
      </div>
      {g?.blurb ? (
        <Hand size={24} className="center story-rise" style={{ marginTop: 24, animationDelay: '.6s' }}>
          {g.blurb}
        </Hand>
      ) : null}
    </Center>
  );
}

function Playlist({ card }: { card: Of<'playlist'> }) {
  const shown = card.songs.slice(0, 9);
  return (
    <Center>
      <Kicker>{card.title}</Kicker>
      <div className="story-tracklist">
        {shown.map((s, i) => (
          <button key={`${s.title}${s.artist}`} className="row story-plain story-rise" style={{ gap: 10, width: '100%', textAlign: 'left', animationDelay: `${i * 0.07}s` }} onClick={() => openSong(s.url)}>
            <span className="tiny soft" style={{ width: 20 }}>
              {String(i + 1).padStart(2, '0')}
            </span>
            <span className="grow">
              <span className="small ink story-ellipsis">{s.title}</span>
              <span className="tiny soft story-ellipsis">{s.artist}</span>
            </span>
            <span className="tiny soft">×{s.count}</span>
          </button>
        ))}
      </div>
      {card.songs.length > shown.length ? <div className="tiny soft center" style={{ marginTop: 8 }}>+{card.songs.length - shown.length} lagu lagi di halaman akhir</div> : null}
    </Center>
  );
}

function Closing({ card, ctx }: { card: Of<'closing'>; ctx: StoryCtx }) {
  return (
    <Center align>
      <Margin id="senja" corner="bl" />
      <Doodle id={card.doodle} size={150} draw />
      <Hand size={34} className="center story-rise" style={{ marginTop: 24, animationDelay: '.6s' }}>
        {card.text}
      </Hand>
      <div className="tiny soft center story-rise" style={{ marginTop: 40, animationDelay: '1.2s' }}>
        {ctx.scope === 'year' ? 'ketuk untuk menyimpan, membagikan, dan menulis surat untuk tahun depan' : 'ketuk untuk menyimpan & membagikan'}
      </div>
    </Center>
  );
}

function Quiet({ card }: { card: Of<'quiet'> }) {
  return (
    <Center align>
      <Doodle id="kabut" size={160} color="var(--ink-soft)" draw className="story-drift" />
      <Hand size={30} className="center story-rise" style={{ marginTop: 24, animationDelay: '.6s' }}>
        {card.text}
      </Hand>
    </Center>
  );
}
