/**
 * Satu renderer untuk setiap jenis kartu Wrap. Kertas, tinta, dan doodle
 * besar — seperti halaman buku harian yang dibalik satu per satu.
 */
import {
  COPY,
  dayName,
  formatDayLong,
  formatMonth,
  GENRES,
  getCity,
  MOODS,
  parseDay,
  monthName,
  type SongRef,
  type WrapCard,
  type WrapScope,
} from '@sehari/core';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { type ReactNode, useEffect, useRef, useState } from 'react';
import { Animated, Easing, type LayoutChangeEvent, Pressable, Text, View } from 'react-native';
import { Avatar } from '@/ui/Avatar';
import { Doodle } from '@/ui/Doodle';
import { Flame } from '@/ui/Flame';
import { Row, Sticky, Txt } from '@/ui/kit';
import { Photo } from '@/ui/media';
import { FONTS, RADIUS, SPACE, useTheme, withAlpha } from '@/ui/theme';

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
export function tintFor(card: StoryCard, c: ReturnType<typeof useTheme>['c']): string {
  switch (card.type) {
    case 'moment':
    case 'chapters':
      return c.paper;
    case 'stat':
    case 'motif':
      return c.sticky.yellow;
    case 'song':
    case 'playlist':
      return c.sticky.blue;
    case 'photos':
    case 'roles':
      return c.card;
    case 'streak':
    case 'bestDay':
      return c.sticky.peach;
    case 'words':
    case 'places':
      return c.sticky.green;
    case 'lines':
    case 'quiet':
      return c.aged;
    default:
      return c.paper;
  }
}

export function openSong(url: string) {
  void WebBrowser.openBrowserAsync(url).catch(() => {});
}

// ── Bagian kecil ────────────────────────────────────────────────────────────

function Kicker({ children }: { children: ReactNode }) {
  return (
    <Txt v="label" ink soft center style={{ marginBottom: SPACE.md }}>
      {typeof children === 'string' ? children.toLowerCase() : children}
    </Txt>
  );
}

function Big({ children, size = 34, hand, color, center = true }: { children: ReactNode; size?: number; hand?: boolean; color?: string; center?: boolean }) {
  const { c } = useTheme();
  return (
    <Text
      style={{
        fontFamily: hand ? FONTS.handBold : FONTS.mono,
        fontSize: size,
        lineHeight: Math.round(size * (hand ? 1.05 : 1.22)),
        color: color ?? c.ink,
        textAlign: center ? 'center' : 'left',
        letterSpacing: hand ? 0 : 0.5,
      }}>
      {children}
    </Text>
  );
}

/** Doodle raksasa samar di sudut, seperti coretan di pinggir buku. */
function Margin({ id, corner = 'br' }: { id: string; corner?: 'br' | 'tl' | 'bl' }) {
  const pos = corner === 'br' ? { right: -40, bottom: -30 } : corner === 'tl' ? { left: -50, top: 40 } : { left: -40, bottom: -20 };
  return (
    <View pointerEvents="none" style={{ position: 'absolute', ...pos, transform: [{ rotate: corner === 'br' ? '-12deg' : '14deg' }] }}>
      <Doodle id={id} size={260} opacity={0.12} strokeWidth={2} />
    </View>
  );
}

function Center({ children, style }: { children: ReactNode; style?: object }) {
  return <View style={[{ flex: 1, justifyContent: 'center', paddingHorizontal: SPACE.lg, gap: SPACE.sm }, style]}>{children}</View>;
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
  const { c } = useTheme();
  return (
    <Center style={{ alignItems: 'center' }}>
      <Margin id={ctx.scope === 'year' ? 'rak-buku' : 'bintang'} corner="tl" />
      <Doodle id={card.doodle} size={170} strokeWidth={2.2} />
      <View style={{ height: SPACE.md }} />
      <Txt v="label" ink soft center>
        {SCOPE_WORD[ctx.scope]} · {ctx.label.toLowerCase()}
      </Txt>
      <Big size={card.title.length > 22 ? 32 : 42}>{card.title}</Big>
      <Txt v="hand" center style={{ fontSize: 28, lineHeight: 32, color: c.text }}>
        {card.subtitle}
      </Txt>
      {ctx.suggestedTitle ? (
        <Txt v="tiny" soft center style={{ marginTop: SPACE.sm }}>
          bab ini belum diberi judul. mungkin: “{ctx.suggestedTitle}”?
        </Txt>
      ) : null}
      <Row gap={6} style={{ marginTop: SPACE.lg, justifyContent: 'center', flexWrap: 'wrap' }}>
        {ctx.memberDoodles.slice(0, 12).map((d, i) => (
          <Avatar key={`${d}${i}`} doodle={d} size={38} sealed />
        ))}
      </Row>
    </Center>
  );
}

function Stat({ card }: { card: Of<'stat'> }) {
  const { c } = useTheme();
  return (
    <Center style={{ alignItems: 'center' }}>
      <Margin id="rumput" />
      <Doodle id={card.doodle} size={120} />
      <Big size={card.value.length > 6 ? 72 : 96}>{card.value}</Big>
      <Txt v="hand" center style={{ fontSize: 32, lineHeight: 36, color: c.text }}>
        {card.label}
      </Txt>
      {card.note ? (
        <Txt v="small" soft center>
          {card.note}
        </Txt>
      ) : null}
    </Center>
  );
}

function Moment({ card, ctx }: { card: Of<'moment'>; ctx: StoryCtx }) {
  const { c } = useTheme();
  const d = card.drop;
  const photo = d.media?.mime.startsWith('image/') ? d.media : undefined;
  return (
    <Center>
      <Kicker>{card.title}</Kicker>
      <Sticky color="yellow" tilt={-2}>
        <Row style={{ justifyContent: 'space-between', marginBottom: SPACE.sm }}>
          <Row gap={6}>
            <Doodle id={ctx.doodleOf(d.userId)} size={22} />
            <Txt v="small" ink>
              {ctx.name(d.userId)}
            </Txt>
          </Row>
          <Txt v="tiny" soft>
            {dayName(d.day)}, {formatDayLong(d.day, false)}
          </Txt>
        </Row>
        {photo ? <Photo media={photo} height={220} style={{ marginBottom: SPACE.sm, maxHeight: 300 }} /> : null}
        {d.text ? (
          <Txt v="hand" style={{ fontSize: photo ? 24 : 30, lineHeight: photo ? 28 : 34, color: c.text }} numberOfLines={photo ? 4 : 9}>
            {d.text}
          </Txt>
        ) : null}
        {d.song ? (
          <Pressable onPress={() => openSong(d.song!.url)} style={{ marginTop: SPACE.sm }}>
            <Row gap={6}>
              <Doodle id="ui-lagu" size={20} />
              <Txt v="small" ink numberOfLines={1} style={{ flex: 1 }}>
                {d.song.title} — {d.song.artist}
              </Txt>
            </Row>
          </Pressable>
        ) : null}
        {!d.text && !photo && !d.song ? (
          <Txt v="hand" style={{ color: c.text }}>
            satu hal kecil yang dipeluk bersama
          </Txt>
        ) : null}
      </Sticky>
      <Row gap={8} style={{ justifyContent: 'center', marginTop: SPACE.lg }}>
        <Doodle id="ui-peluk" size={30} />
        <Txt v="h2" ink>
          dipeluk {card.hugs} kali
        </Txt>
      </Row>
    </Center>
  );
}

function Song({ card, ctx }: { card: Of<'song'>; ctx: StoryCtx }) {
  const { c } = useTheme();
  const s = card.song;
  const by = card.byUserIds.map(ctx.name);
  return (
    <Center style={{ alignItems: 'center' }}>
      <Margin id="gitar" />
      <Kicker>{card.title}</Kicker>
      <View style={{ width: 210, height: 210, borderRadius: 105, backgroundColor: c.text, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
        {[0.92, 0.78, 0.64].map((r) => (
          <View key={r} style={{ position: 'absolute', width: 210 * r, height: 210 * r, borderRadius: 105 * r, borderWidth: 1, borderColor: withAlpha('#FFFFFF', 0.14) }} />
        ))}
        <View style={{ width: 92, height: 92, borderRadius: 46, backgroundColor: c.sticky.yellow, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
          {s.artworkUrl ? <Image source={{ uri: s.artworkUrl }} style={{ width: 92, height: 92 }} contentFit="cover" /> : <Doodle id="ui-lagu" size={44} />}
        </View>
      </View>
      <View style={{ height: SPACE.md }} />
      <Big size={s.title.length > 18 ? 28 : 36}>{s.title}</Big>
      <Txt center>{s.artist}</Txt>
      <Txt v="small" soft center style={{ marginTop: SPACE.xs }}>
        muncul {card.count} kali{by.length ? ` · dibawa ${by.join(', ')}` : ''}
      </Txt>
      <Pressable onPress={() => openSong(s.url)} accessibilityRole="link" style={{ marginTop: SPACE.md, borderWidth: 1, borderColor: c.ink, borderRadius: 999, paddingHorizontal: 16, paddingVertical: 8 }}>
        <Txt v="small" ink>
          buka di {PROVIDER_LABEL[s.provider] ?? 'tautan'}
        </Txt>
      </Pressable>
      <Txt v="tiny" soft center style={{ marginTop: SPACE.sm }}>
        lagu tampil sebagai kartu, tidak diputar di sini.
      </Txt>
    </Center>
  );
}

function Palette({ card }: { card: Of<'palette'> }) {
  const { c } = useTheme();
  const total = card.moods.reduce((a, m) => a + m.count, 0) || 1;
  return (
    <Center>
      <Kicker>{card.title}</Kicker>
      <View style={{ height: 360, borderRadius: RADIUS.lg, overflow: 'hidden', borderWidth: 6, borderColor: c.card }}>
        {card.moods.map((m) => (
          <View key={m.mood} style={{ flex: m.count, backgroundColor: m.color, justifyContent: 'center', paddingHorizontal: SPACE.md, minHeight: 34 }}>
            <Row style={{ justifyContent: 'space-between' }}>
              <Row gap={8}>
                <Doodle id={MOODS[m.mood]?.doodle ?? 'tunas'} size={22} color="#FFFFFF" />
                <Text style={{ fontFamily: FONTS.handBold, fontSize: 24, color: '#FFFFFF' }}>{m.label}</Text>
              </Row>
              <Text style={{ fontFamily: FONTS.mono, fontSize: 13, color: '#FFFFFF' }}>{Math.round((m.count / total) * 100)}%</Text>
            </Row>
          </View>
        ))}
      </View>
      <Txt v="small" soft center style={{ marginTop: SPACE.md }}>
        {total} warna dititipkan
      </Txt>
    </Center>
  );
}

function Photos({ card, ctx }: { card: Of<'photos'>; ctx: StoryCtx }) {
  const { c } = useTheme();
  const [w, setW] = useState(0);
  const n = card.items.length;
  const cols = n === 1 ? 1 : n <= 4 ? 2 : 3;
  const gap = SPACE.sm;
  const cell = w ? Math.floor((w - gap * (cols - 1)) / cols) : 0;
  const shown = card.items.slice(0, cols === 1 ? 1 : cols === 2 ? 4 : 9);
  return (
    <Center>
      <Kicker>{card.title}</Kicker>
      <View onLayout={(e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width)} style={{ flexDirection: 'row', flexWrap: 'wrap', gap, justifyContent: 'center' }}>
        {cell > 0 &&
          shown.map((it, i) => (
            <View
              key={it.dropId}
              style={{
                width: cell,
                backgroundColor: c.cardEdge,
                padding: 6,
                paddingBottom: 4,
                borderRadius: 4,
                transform: [{ rotate: `${(i % 2 ? 2 : -2) * (cols === 1 ? 0.6 : 1)}deg` }],
                shadowColor: '#000',
                shadowOpacity: 0.12,
                shadowRadius: 8,
                shadowOffset: { width: 0, height: 4 },
                elevation: 3,
              }}>
              <Photo media={it.media} style={{ aspectRatio: cols === 1 ? 0.9 : 1, borderRadius: 2, maxHeight: undefined }} />
              <Txt v="hand" center numberOfLines={1} style={{ fontSize: cols === 3 ? 18 : 22, lineHeight: 26 }}>
                {ctx.name(it.userId)}
              </Txt>
            </View>
          ))}
      </View>
    </Center>
  );
}

function Words({ card }: { card: Of<'words'> }) {
  const { c } = useTheme();
  const max = Math.max(...card.words.map((w) => w.count), 1);
  return (
    <Center>
      <Margin id="ui-kata" />
      <Kicker>{card.title}</Kicker>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', gap: 10 }}>
        {card.words.map((w, i) => {
          const size = 20 + Math.round((w.count / max) * 30);
          return (
            <View key={w.word} style={{ transform: [{ rotate: `${((i * 7) % 9) - 4}deg` }], paddingHorizontal: 4 }}>
              <Text style={{ fontFamily: i % 3 === 0 ? FONTS.handBold : FONTS.mono, fontSize: i % 3 === 0 ? size + 6 : size * 0.8, color: i % 2 ? c.text : c.ink }}>{w.word}</Text>
            </View>
          );
        })}
      </View>
      <Txt v="small" soft center style={{ marginTop: SPACE.lg }}>
        {COPY.wraps.topWord(card.words[0]?.word ?? '')}
      </Txt>
    </Center>
  );
}

/** Peta kecil Indonesia: titik per kota, tanpa koordinat lebih detail dari nama kota. */
function Places({ card }: { card: Of<'places'> }) {
  const { c } = useTheme();
  const [w, setW] = useState(0);
  const H = 170;
  const cities = card.cities.map((x) => ({ ...x, city: getCity(x.cityId) })).filter((x) => x.city);
  const inId = cities.filter((x) => x.city!.country === 'ID');
  const max = Math.max(...cities.map((x) => x.days), 1);
  const px = (lon: number) => ((lon - 94.5) / (141.5 - 94.5)) * w;
  const py = (lat: number) => ((6.5 - lat) / (6.5 + 11.5)) * H;
  return (
    <Center>
      <Margin id="peta" />
      <Kicker>{card.title}</Kicker>
      {inId.length ? (
        <View onLayout={(e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width)} style={{ height: H, borderRadius: RADIUS.md, borderWidth: 1.5, borderStyle: 'dashed', borderColor: c.inkSoft, backgroundColor: withAlpha(c.card, 0.6), marginBottom: SPACE.md }}>
          {w > 0 &&
            inId.map((x) => {
              const r = 8 + Math.round((x.days / max) * 12);
              return (
                <View key={x.cityId} style={{ position: 'absolute', left: px(x.city!.lon) - r / 2, top: py(x.city!.lat) - r / 2, alignItems: 'center' }}>
                  <View style={{ width: r, height: r, borderRadius: r / 2, backgroundColor: c.ink, opacity: 0.85 }} />
                </View>
              );
            })}
          {w > 0 &&
            inId.slice(0, 6).map((x) => (
              <Text
                key={`${x.cityId}-l`}
                numberOfLines={1}
                style={{ position: 'absolute', left: Math.min(Math.max(px(x.city!.lon) - 40, 2), w - 82), top: py(x.city!.lat) + 10, width: 80, textAlign: 'center', fontFamily: FONTS.hand, fontSize: 17, color: c.text }}>
                {x.city!.name}
              </Text>
            ))}
        </View>
      ) : null}
      <View style={{ gap: 6 }}>
        {cities.slice(0, 6).map((x) => (
          <Row key={x.cityId} style={{ justifyContent: 'space-between' }}>
            <Row gap={8} style={{ flex: 1 }}>
              <Doodle id="ui-lokasi" size={20} />
              <Txt numberOfLines={1} style={{ flex: 1 }}>
                {x.city!.name}
                <Txt v="tiny" soft>
                  {'  '}
                  {x.city!.province}
                </Txt>
              </Txt>
            </Row>
            <Txt v="small" ink>
              {x.days} hari
            </Txt>
          </Row>
        ))}
      </View>
      <Txt v="tiny" soft center style={{ marginTop: SPACE.md }}>
        hanya nama kota, tidak pernah titik persis.
      </Txt>
    </Center>
  );
}

function Streak({ card, ctx }: { card: Of<'streak'>; ctx: StoryCtx }) {
  const { c } = useTheme();
  const level = card.current >= 30 ? 'bright' : card.current >= 7 ? 'warm' : card.current > 0 ? 'dim' : 'fog';
  return (
    <Center style={{ alignItems: 'center' }}>
      <Kicker>{card.title}</Kicker>
      <Flame level={level} days={card.current} size={110} showLabel={false} />
      <Big size={88}>{card.current}</Big>
      <Txt v="hand" center style={{ fontSize: 28, color: c.text }}>
        {card.current ? 'hari berturut-turut, bersama' : COPY.streak.dim}
      </Txt>
      <Row gap={SPACE.lg} style={{ marginTop: SPACE.md, justifyContent: 'center' }}>
        <View style={{ alignItems: 'center' }}>
          <Txt v="h2" ink>
            {card.longest}
          </Txt>
          <Txt v="tiny" soft>
            terpanjang
          </Txt>
        </View>
        <View style={{ alignItems: 'center' }}>
          <Txt v="h2" ink>
            {card.togetherDays}
          </Txt>
          <Txt v="tiny" soft>
            hari bersama
          </Txt>
        </View>
      </Row>
      <Row gap={14} style={{ marginTop: SPACE.lg, justifyContent: 'center', flexWrap: 'wrap' }}>
        {card.perMember.map((m) => (
          <View key={m.userId} style={{ alignItems: 'center', width: 64 }}>
            <Avatar doodle={ctx.doodleOf(m.userId)} size={40} sealed={m.days > 0} />
            <Txt v="tiny" ink numberOfLines={1}>
              {ctx.name(m.userId)}
            </Txt>
            <Txt v="tiny" soft>
              {m.days} hari
            </Txt>
          </View>
        ))}
      </Row>
      <Txt v="tiny" soft center style={{ marginTop: SPACE.sm }}>
        bukan lomba. semua yang ikut, ikut menjaga.
      </Txt>
    </Center>
  );
}

/** Kalimat terakhir. Untuk Tahun Kita: puisi panjang yang menggulung pelan sendiri. */
function Lines({ card, ctx }: { card: Of<'lines'>; ctx: StoryCtx }) {
  const { c } = useTheme();
  const long = ctx.scope === 'year';
  const [box, setBox] = useState(0);
  const [content, setContent] = useState(0);
  const y = useRef(new Animated.Value(0)).current;
  const at = useRef(0);
  useEffect(() => {
    const id = y.addListener(({ value }) => (at.current = value));
    return () => y.removeListener(id);
  }, [y]);
  const travel = Math.max(0, content - box + 40);
  useEffect(() => {
    if (!long || !ctx.playing || travel <= 0) return;
    const lead = 1200;
    const remaining = Math.max(0, ctx.duration - lead * 2) * (1 - Math.min(1, -at.current / travel));
    const a = Animated.sequence([
      Animated.delay(at.current === 0 ? lead : 0),
      Animated.timing(y, { toValue: -travel, duration: Math.max(200, remaining), easing: Easing.linear, useNativeDriver: true }),
    ]);
    a.start();
    return () => a.stop();
  }, [long, ctx.playing, ctx.duration, travel, y]);

  const body = card.lines.map((l, i) => (
    <View key={`${l.day}${l.userId}${i}`} style={{ marginBottom: long ? SPACE.md : SPACE.sm }}>
      <Txt v="hand" style={{ fontSize: long ? 27 : 25, lineHeight: long ? 31 : 29, color: c.text }}>
        {l.text}
      </Txt>
      <Txt v="tiny" soft>
        — {ctx.name(l.userId)}, {formatDayLong(l.day, false)}
      </Txt>
    </View>
  ));

  return (
    <View style={{ flex: 1, paddingHorizontal: SPACE.lg, paddingTop: SPACE.lg }}>
      <Kicker>{card.title}</Kicker>
      <View style={{ flex: 1, overflow: 'hidden', borderLeftWidth: 1.5, borderLeftColor: withAlpha(c.danger, 0.35), paddingLeft: SPACE.md }} onLayout={(e) => setBox(e.nativeEvent.layout.height)}>
        <Animated.View style={{ transform: [{ translateY: long ? y : 0 }] }} onLayout={(e) => setContent(e.nativeEvent.layout.height)}>
          {body}
          {long ? (
            <Txt v="tiny" soft center style={{ marginTop: SPACE.md }}>
              {card.lines.length} kalimat, satu jilid.
            </Txt>
          ) : null}
        </Animated.View>
      </View>
    </View>
  );
}

function BestDay({ card, ctx }: { card: Of<'bestDay'>; ctx: StoryCtx }) {
  const { c } = useTheme();
  const p = parseDay(card.day);
  return (
    <Center style={{ alignItems: 'center' }}>
      <Margin id="matahari" />
      <Kicker>{card.title}</Kicker>
      <View style={{ backgroundColor: c.cardEdge, borderRadius: RADIUS.md, width: 200, overflow: 'hidden', alignItems: 'center', transform: [{ rotate: '-3deg' }] }}>
        <View style={{ backgroundColor: c.ink, alignSelf: 'stretch', paddingVertical: 8 }}>
          <Text style={{ fontFamily: FONTS.mono, color: c.onInk, textAlign: 'center', letterSpacing: 2 }}>{monthName(p.month).toLowerCase()}</Text>
        </View>
        <Big size={96}>{p.day}</Big>
        <Txt v="small" soft style={{ marginBottom: SPACE.md }}>
          {dayName(card.day)}
        </Txt>
      </View>
      <Txt v="hand" center style={{ fontSize: 28, marginTop: SPACE.lg, color: c.text }}>
        {card.reason}
      </Txt>
      <Pressable
        onPress={() => router.push(`/l/${ctx.circleId}/hari/${card.day}`)}
        accessibilityRole="link"
        style={{ marginTop: SPACE.md, borderWidth: 1, borderColor: c.ink, borderRadius: 999, paddingHorizontal: 16, paddingVertical: 8 }}>
        <Txt v="small" ink>
          buka hari itu
        </Txt>
      </Pressable>
    </Center>
  );
}

function Roles({ card, ctx }: { card: Of<'roles'>; ctx: StoryCtx }) {
  const { c } = useTheme();
  const colors = ['yellow', 'green', 'peach', 'blue'] as const;
  return (
    <Center>
      <Kicker>{card.title}</Kicker>
      <View style={{ gap: SPACE.md }}>
        {card.items.slice(0, 4).map((r, i) => (
          <Sticky key={r.userId} color={colors[i % 4]} tilt={i % 2 ? 1.5 : -1.5} pin={false}>
            <Row gap={12}>
              <Avatar doodle={ctx.doodleOf(r.userId)} size={42} />
              <View style={{ flex: 1 }}>
                <Txt v="hand" style={{ fontSize: 28, lineHeight: 30, color: c.text }}>
                  {r.role}
                </Txt>
                <Txt v="small" ink>
                  {ctx.name(r.userId)}
                </Txt>
                <Txt v="tiny" soft>
                  {r.reason}
                </Txt>
              </View>
            </Row>
          </Sticky>
        ))}
      </View>
      <Txt v="tiny" soft center style={{ marginTop: SPACE.md }}>
        julukan, bukan peringkat.
      </Txt>
    </Center>
  );
}

function Chapters({ card }: { card: Of<'chapters'> }) {
  const { c } = useTheme();
  return (
    <Center>
      <Margin id="buku" />
      <Kicker>{card.title}</Kicker>
      <View style={{ gap: 10 }}>
        {card.items.map((it, i) => (
          <Row key={it.month} gap={8} style={{ alignItems: 'flex-end' }}>
            <Txt v="tiny" soft style={{ width: 26 }}>
              {String(i + 1).padStart(2, '0')}
            </Txt>
            <Txt v="hand" numberOfLines={2} style={{ fontSize: 24, lineHeight: 26, color: c.text, flexShrink: 1 }}>
              {it.title}
            </Txt>
            <View style={{ flex: 1, minWidth: 16, borderBottomWidth: 1.5, borderStyle: 'dotted', borderColor: c.inkSoft, marginBottom: 6 }} />
            <Txt v="tiny" ink>
              {formatMonth(it.month).split(' ')[0]?.toLowerCase()}
            </Txt>
          </Row>
        ))}
      </View>
    </Center>
  );
}

function Motif({ card }: { card: Of<'motif'> }) {
  const { c } = useTheme();
  return (
    <Center style={{ alignItems: 'center' }}>
      <Margin id="pena" />
      <Kicker>{card.title}</Kicker>
      <Big hand size={card.word.length > 10 ? 64 : 86}>
        “{card.word}”
      </Big>
      <Txt v="hand" center style={{ fontSize: 26, color: c.text, marginTop: SPACE.sm }}>
        muncul lagi dan lagi, di {card.days} hari
      </Txt>
      <Txt v="tiny" soft center style={{ marginTop: SPACE.md }}>
        seperti dalam novel: hal yang terus kembali.
      </Txt>
    </Center>
  );
}

function CoverPattern({ pattern, color }: { pattern: string; color: string }) {
  const items = Array.from({ length: 12 });
  if (pattern === 'garis' || pattern === 'gelombang')
    return (
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'space-around' }}>
        {items.map((_, i) => (
          <View key={i} style={{ height: 1.5, backgroundColor: color, opacity: 0.25, borderRadius: pattern === 'gelombang' ? 4 : 0, marginHorizontal: pattern === 'gelombang' ? (i % 2) * 10 : 0 }} />
        ))}
      </View>
    );
  if (pattern === 'titik' || pattern === 'bintang')
    return (
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, flexDirection: 'row', flexWrap: 'wrap', padding: 10, gap: 18, opacity: 0.3 }}>
        {Array.from({ length: 48 }).map((_, i) => (
          <View key={i} style={{ width: pattern === 'bintang' && i % 5 === 0 ? 5 : 3, height: pattern === 'bintang' && i % 5 === 0 ? 5 : 3, borderRadius: 3, backgroundColor: color }} />
        ))}
      </View>
    );
  if (pattern === 'kotak')
    return (
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, flexDirection: 'row', flexWrap: 'wrap', opacity: 0.2 }}>
        {Array.from({ length: 30 }).map((_, i) => (
          <View key={i} style={{ width: '20%', aspectRatio: 1, borderWidth: 0.75, borderColor: color }} />
        ))}
      </View>
    );
  return null;
}

function GenreCard({ card }: { card: Of<'genre'> }) {
  const { c } = useTheme();
  const g = GENRES.find((x) => x.name === card.genre);
  return (
    <Center style={{ alignItems: 'center' }}>
      <Kicker>{card.title}</Kicker>
      <View style={{ width: 230, height: 320, backgroundColor: c.ink, borderRadius: 6, borderTopLeftRadius: 2, borderBottomLeftRadius: 2, overflow: 'hidden', padding: SPACE.lg, justifyContent: 'space-between', transform: [{ rotate: '2deg' }] }}>
        <CoverPattern pattern={g?.cover.pattern ?? 'polos'} color={c.onInk} />
        <View style={{ position: 'absolute', left: 10, top: 0, bottom: 0, width: 2, backgroundColor: withAlpha('#FFFFFF', 0.25) }} />
        <Text style={{ fontFamily: FONTS.mono, fontSize: 11, letterSpacing: 2, color: c.onInk, opacity: 0.8 }}>SEHARI · JILID</Text>
        <View style={{ alignItems: 'center' }}>
          <Doodle id={g?.cover.doodle ?? 'buku'} size={96} color={c.onInk} />
        </View>
        <Text style={{ fontFamily: FONTS.handBold, fontSize: 32, lineHeight: 34, color: c.onInk }}>{card.genre}</Text>
      </View>
      {g?.blurb ? (
        <Txt v="hand" center style={{ fontSize: 24, marginTop: SPACE.lg, color: c.text }}>
          {g.blurb}
        </Txt>
      ) : null}
    </Center>
  );
}

function Playlist({ card }: { card: Of<'playlist'> }) {
  const { c } = useTheme();
  const shown = card.songs.slice(0, 9);
  return (
    <Center>
      <Kicker>{card.title}</Kicker>
      <View style={{ backgroundColor: withAlpha(c.card, 0.7), borderRadius: RADIUS.md, padding: SPACE.md, gap: 10 }}>
        {shown.map((s, i) => (
          <Pressable key={`${s.title}${s.artist}`} onPress={() => openSong(s.url)} accessibilityRole="link">
            <Row gap={10}>
              <Txt v="tiny" soft style={{ width: 20 }}>
                {String(i + 1).padStart(2, '0')}
              </Txt>
              <View style={{ flex: 1 }}>
                <Txt v="small" ink numberOfLines={1}>
                  {s.title}
                </Txt>
                <Txt v="tiny" soft numberOfLines={1}>
                  {s.artist}
                </Txt>
              </View>
              <Txt v="tiny" soft>
                ×{s.count}
              </Txt>
            </Row>
          </Pressable>
        ))}
      </View>
      {card.songs.length > shown.length ? (
        <Txt v="tiny" soft center style={{ marginTop: SPACE.sm }}>
          +{card.songs.length - shown.length} lagu lagi di halaman akhir
        </Txt>
      ) : null}
    </Center>
  );
}

function Closing({ card, ctx }: { card: Of<'closing'>; ctx: StoryCtx }) {
  const { c } = useTheme();
  return (
    <Center style={{ alignItems: 'center' }}>
      <Margin id="senja" corner="bl" />
      <Doodle id={card.doodle} size={150} />
      <Txt v="hand" center style={{ fontSize: 34, lineHeight: 38, color: c.text, marginTop: SPACE.lg }}>
        {card.text}
      </Txt>
      <Txt v="tiny" soft center style={{ marginTop: SPACE.xl }}>
        {ctx.scope === 'year' ? 'ketuk untuk menyimpan, membagikan, dan menulis surat untuk tahun depan' : 'ketuk untuk menyimpan & membagikan'}
      </Txt>
    </Center>
  );
}

function Quiet({ card }: { card: Of<'quiet'> }) {
  const { c } = useTheme();
  return (
    <Center style={{ alignItems: 'center' }}>
      <Doodle id="kabut" size={160} color={c.inkSoft} />
      <Txt v="hand" center style={{ fontSize: 30, lineHeight: 34, color: c.text, marginTop: SPACE.lg }}>
        {card.text}
      </Txt>
    </Center>
  );
}
