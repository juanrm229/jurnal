import { COPY, formatClock, formatDayLong, getCity, type LockedDrop, MOODS, type ReactionKind, allowedReactions } from '@sehari/core';
import * as WebBrowser from 'expo-web-browser';
import { Pressable, View } from 'react-native';
import type { OpenDrop } from '@/lib/data';
import { Doodle } from './Doodle';
import { Card, Row, Txt } from './kit';
import { Photo, VoiceNote } from './media';
import { MoodDot } from './Mood';
import { RADIUS, SPACE, useTheme } from './theme';

export const KIND_DOODLE: Record<string, string> = {
  text: 'ui-teks',
  photo: 'ui-foto',
  screenshot: 'ui-foto',
  video: 'kamera',
  voice: 'ui-mikrofon',
  song: 'ui-lagu',
  idea: 'ui-ide',
  word: 'ui-kata',
  mood: 'ui-palet',
  answer: 'bulan',
  card: 'kartu',
  expedition: 'kompas',
  last_line: 'pena',
  silent: 'lilin',
  auto: 'matahari',
  blackout: 'buku',
  prologue: 'buku',
  epilogue: 'buku',
};

const REACTION_LABEL: Record<ReactionKind, { label: string; doodle: string }> = {
  hug: { label: COPY.reactions.peluk, doodle: 'ui-peluk' },
  me_too: { label: COPY.reactions.akuJuga, doodle: 'ui-aku-juga' },
  here: { label: 'aku di sini', doodle: 'ui-hati' },
  candle: { label: COPY.reactions.lilin, doodle: 'lilin' },
};

export function audienceLabel(d: OpenDrop['wire'], names: (id: string) => string, circleName: (id: string) => string): string {
  switch (d.audience) {
    case 'self':
      return COPY.drop.audience.onlyMe;
    case 'person':
      return COPY.drop.audience.onePerson(names(d.personId ?? ''));
    case 'time_capsule':
      return COPY.drop.timeCapsuleUntil(d.unlockOn ? formatDayLong(d.unlockOn) : '…');
    default:
      return d.circleIds.map(circleName).join(' · ') || COPY.drop.audience.circle;
  }
}

export function DropCard({
  drop,
  author,
  meta,
  viewerId,
  onReact,
  aged = 0,
  compact,
  narrow,
  onLongPress,
}: {
  drop: OpenDrop;
  author?: string;
  meta?: string;
  viewerId?: string;
  onReact?: (kind: ReactionKind, on: boolean) => void;
  aged?: number;
  compact?: boolean;
  /** Kolom sempit (Dua Sisi): teks utuh, reaksi berupa ikon. */
  narrow?: boolean;
  onLongPress?: () => void;
}) {
  const { c } = useTheme();
  const p = drop.payload;
  const w = drop.wire;
  if (!p) {
    return (
      <Card>
        <Row>
          <Doodle id="ui-gembok" size={22} opacity={0.6} />
          <Txt v="small" soft>
            Tidak bisa dibuka dengan kunci di perangkat ini.
          </Txt>
        </Row>
      </Card>
    );
  }
  const silent = p.kind === 'silent';
  const city = getCity(p.cityId);
  const tint = aged > 0 ? mixHex(c.card, c.aged, aged * 0.7) : silent ? c.paper : undefined;

  return (
    <Pressable onLongPress={onLongPress} delayLongPress={350} testID={`drop-${w.id}`}>
      <Card tint={tint} style={{ gap: SPACE.sm, ...(silent ? { borderColor: c.inkSoft, borderStyle: 'dashed' } : {}) }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <Row gap={6} style={{ flexShrink: 1, flexWrap: 'wrap' }}>
            <Doodle id={KIND_DOODLE[p.kind] ?? 'tunas'} size={20} />
            {author ? (
              <Txt v="small" ink>
                {author}
              </Txt>
            ) : null}
            <Txt v="tiny" soft>
              {formatClock(p.hour, p.minute)}
              {city && !compact && !narrow ? ` · ${city.name}` : ''}
            </Txt>
          </Row>
          {p.mood ? (
            <Row gap={4}>
              <MoodDot mood={p.mood} />
              {!compact && !narrow ? (
                <Txt v="tiny" soft>
                  {MOODS[p.mood]?.label}
                </Txt>
              ) : null}
            </Row>
          ) : null}
        </Row>

        {p.prompt ? (
          <Txt v="tiny" ink soft>
            “{p.prompt}”
          </Txt>
        ) : null}

        {silent ? (
          <Txt v="small" soft>
            {COPY.silentRoom.title} · {p.text ? p.text : 'tanpa kata'}
          </Txt>
        ) : p.kind === 'last_line' && p.text ? (
          <Txt v="hand">{p.text}</Txt>
        ) : p.kind === 'word' && p.text ? (
          <Txt v="title" ink>
            {p.text}
          </Txt>
        ) : p.text ? (
          <Txt numberOfLines={compact ? 3 : undefined}>{p.text}</Txt>
        ) : null}

        {p.kind === 'mood' && !p.text && p.mood ? (
          <View style={{ height: 36, borderRadius: RADIUS.sm, backgroundColor: MOODS[p.mood]?.color }} />
        ) : null}

        {p.media?.filter((m) => m.mime.startsWith('image/')).map((m) => <Photo key={m.id} media={m} />)}
        {p.media?.filter((m) => m.mime.startsWith('audio/')).map((m) => <VoiceNote key={m.id} media={m} />)}

        {p.song ? (
          <Pressable onPress={() => WebBrowser.openBrowserAsync(p.song!.url)} accessibilityRole="link" style={{ backgroundColor: c.pill, borderRadius: RADIUS.md, padding: 12 }}>
            <Row>
              <Doodle id="ui-lagu" size={22} />
              <View style={{ flex: 1 }}>
                <Txt v="small" ink numberOfLines={1}>
                  {p.song.title}
                </Txt>
                <Txt v="tiny" soft numberOfLines={1}>
                  {p.song.artist}
                </Txt>
              </View>
              <Doodle id="ui-panah-kanan" size={16} />
            </Row>
          </Pressable>
        ) : null}

        {p.kind === 'auto' ? (
          <Row style={{ flexWrap: 'wrap' }} gap={12}>
            {p.weather ? (
              <Row gap={4}>
                <Doodle id={p.weather.code === 'hujan' || p.weather.code === 'gerimis' || p.weather.code === 'badai' ? 'hujan' : p.weather.code === 'cerah' ? 'matahari' : 'awan'} size={20} />
                <Txt v="small">
                  {p.weather.label} · {Math.round(p.weather.tempC)}°
                </Txt>
              </Row>
            ) : null}
            {typeof p.steps === 'number' ? <Txt v="small">{p.steps.toLocaleString('id-ID')} langkah</Txt> : null}
          </Row>
        ) : null}

        {p.tags?.length ? (
          <Row gap={6} style={{ flexWrap: 'wrap' }}>
            {p.tags.map((t) => (
              <Txt key={t} v="tiny" ink soft>
                #{t}
              </Txt>
            ))}
          </Row>
        ) : null}

        {meta ? (
          <Txt v="tiny" ink soft>
            {meta}
          </Txt>
        ) : null}

        {onReact ? <Reactions drop={drop} viewerId={viewerId} onReact={onReact} iconsOnly={narrow} /> : null}
      </Card>
    </Pressable>
  );
}

function Reactions({ drop, viewerId, onReact, iconsOnly }: { drop: OpenDrop; viewerId?: string; onReact: (kind: ReactionKind, on: boolean) => void; iconsOnly?: boolean }) {
  const { c } = useTheme();
  const own = drop.wire.authorId === viewerId;
  const kinds = allowedReactions(drop.wire.kind);
  return (
    <Row gap={8} style={{ flexWrap: 'wrap', marginTop: 4 }}>
      {kinds.map((k) => {
        const by = drop.wire.reactions.filter((r) => r.kind === k);
        const mine = by.some((r) => r.userId === viewerId);
        if (own && by.length === 0) return null;
        return (
          <Pressable
            key={k}
            disabled={own}
            testID={`react-${k}-${drop.wire.id}`}
            onPress={() => onReact(k, !mine)}
            accessibilityRole="button"
            accessibilityState={{ selected: mine }}
            accessibilityLabel={REACTION_LABEL[k].label}
            style={{ borderRadius: 999, paddingHorizontal: iconsOnly ? 8 : 10, paddingVertical: 5, backgroundColor: mine ? c.ink : c.pill }}>
            <Row gap={4}>
              <Doodle id={REACTION_LABEL[k].doodle} size={16} color={mine ? c.onInk : c.ink} />
              {!iconsOnly || by.length > 1 ? (
                <Txt v="tiny" style={{ color: mine ? c.onInk : c.ink }}>
                  {iconsOnly ? '' : REACTION_LABEL[k].label}
                  {by.length > 1 ? ` ${by.length}` : ''}
                </Txt>
              ) : null}
            </Row>
          </Pressable>
        );
      })}
    </Row>
  );
}

/** Drop yang masih tertutup: seperti amplop bersegel. */
export function LockedCard({ locked, author }: { locked: LockedDrop; author: string }) {
  const { c } = useTheme();
  const text =
    locked.reason === 'time_capsule'
      ? COPY.drop.timeCapsuleUntil(locked.unlockOn ? formatDayLong(locked.unlockOn) : '…')
      : locked.reason === 'split'
        ? 'Arsip ini sudah dibekukan.'
        : locked.reason === 'secret_card'
          ? 'kartu rahasia · terbuka kalau kamu juga menjawab kartu yang sama'
        : 'tersegel · terbuka setelah kamu menyegel harimu';
  return (
    <View style={{ backgroundColor: c.card, borderRadius: RADIUS.md, padding: 14, borderWidth: 1, borderColor: c.cardEdge }}>
      <Row>
        <Doodle id={locked.reason === 'time_capsule' ? 'jam-pasir' : locked.reason === 'secret_card' ? 'kartu' : 'segel-lilin'} size={28} />
        <View style={{ flex: 1 }}>
          <Txt v="small" ink>
            {author}
          </Txt>
          <Txt v="tiny" soft>
            {text}
          </Txt>
        </View>
      </Row>
    </View>
  );
}

function mixHex(a: string, b: string, t: number) {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const ch = (s: number) => Math.round(((pa >> s) & 255) * (1 - t) + ((pb >> s) & 255) * t);
  return `#${[16, 8, 0].map((s) => ch(s).toString(16).padStart(2, '0')).join('')}`;
}
