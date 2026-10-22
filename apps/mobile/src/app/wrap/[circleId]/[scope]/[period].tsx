/**
 * Wrap: Minggu Kita, Bulan Kita, Tahun Kita, dan Wrap Acara. Dirangkai di
 * perangkat dari isi yang sudah didekripsi, lalu diputar seperti Story.
 */
import { COPY, songTally, type WrapScope } from '@sehari/core';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMe } from '@/lib/data';
import { CardView, type StoryCard, type StoryCtx, tintFor } from '@/features/story/cards';
import { EndScreen } from '@/features/story/EndScreen';
import { type StoryPage, StoryPlayer } from '@/features/story/StoryPlayer';
import { useWrapData } from '@/features/story/wrapData';
import { Doodle } from '@/ui/Doodle';
import { Button, ErrorNote, Growing, Header, Txt } from '@/ui/kit';
import { SPACE, useTheme } from '@/ui/theme';

const QUIET_PREFIX: Record<WrapScope, string> = { week: 'Minggu ini', month: 'Bulan ini', year: 'Tahun ini', moment: 'Acara ini' };

function close(circleId: string) {
  if (router.canGoBack()) router.back();
  else router.replace(`/l/${circleId}`);
}

function Gentle({ doodle, title, body, circleId }: { doodle: string; title: string; body: string; circleId: string }) {
  const { c } = useTheme();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.paper }}>
      <Header />
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACE.xl, gap: SPACE.md }}>
        <Doodle id={doodle} size={96} />
        <Txt v="h2" ink center>
          {title}
        </Txt>
        <Txt soft center>
          {body}
        </Txt>
        <Button kind="ghost" title="kembali" onPress={() => close(circleId)} style={{ marginTop: SPACE.md }} />
      </View>
    </SafeAreaView>
  );
}

export default function WrapScreen() {
  const { circleId = '', scope = '', period = '' } = useLocalSearchParams<{ circleId: string; scope: string; period: string }>();
  const me = useMe();
  const { c } = useTheme();
  const state = useWrapData(circleId, scope, period);
  const [run, setRun] = useState(0);
  const [startAt, setStartAt] = useState(0);

  const ready = state.status === 'ready' ? state : null;
  const pages = useMemo<StoryPage[]>(() => {
    if (!ready) return [];
    const { wrap, circle, input, quiet, suggestedTitle } = ready;
    const s = wrap.scope;
    const slow = s === 'year';
    const members = new Map(circle.members.map((m) => [m.userId, m]));
    let cards: StoryCard[] = wrap.cards;
    if (quiet) {
      const text = COPY.wraps.quietWeek.replace('Minggu ini', QUIET_PREFIX[s]);
      const cover = wrap.cards[0]!;
      cards = [cover.type === 'cover' ? { ...cover, subtitle: 'Halaman yang tenang.' } : cover, ...wrap.cards.filter((x) => x.type === 'streak'), { type: 'quiet', text }, wrap.cards[wrap.cards.length - 1]!];
    }
    const base = slow ? Math.min(9000, Math.max(6500, Math.round(60_000 / cards.length))) : 6000;
    const durationFor = (card: StoryCard) => {
      if (card.type === 'lines') return slow ? Math.min(45_000, Math.max(10_000, card.lines.length * 2200)) : 8000;
      if (card.type === 'playlist' || card.type === 'photos' || card.type === 'chapters') return base + 1500;
      if (card.type === 'cover') return base - 1000;
      return base;
    };
    const ctxBase: Omit<StoryCtx, 'playing' | 'duration'> = {
      meId: me.user.id,
      circleId: circle.id,
      scope: s,
      label: wrap.label,
      name: (id) => (id === me.user.id ? 'kamu' : (members.get(id)?.penName ?? 'seseorang')),
      doodleOf: (id) => members.get(id)?.doodle ?? 'tunas',
      suggestedTitle,
      memberDoodles: input.members.map((m) => members.get(m.userId)?.doodle ?? 'tunas'),
    };
    const out: StoryPage[] = cards.map((card, i) => ({
      key: `${card.type}-${i}`,
      duration: durationFor(card),
      tint: tintFor(card, c),
      render: ({ playing, duration }) => <CardView card={card} ctx={{ ...ctxBase, playing, duration }} />,
    }));
    const songs = songTally(input.drops);
    out.push({
      key: 'end',
      duration: null,
      interactive: true,
      tint: c.paper,
      render: ({ go }) => (
        <EndScreen
          wrap={wrap}
          songs={songs}
          onBack={() => go(-1)}
          onReplay={() => {
            setStartAt(0);
            setRun((r) => r + 1);
          }}
          onClose={() => close(circleId)}
        />
      ),
    });
    return out;
  }, [ready, me.user.id, c, circleId]);

  if (state.status === 'loading') {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: c.paper, justifyContent: 'center' }}>
        <Growing label="merangkai hari-hari…" />
      </SafeAreaView>
    );
  }
  if (state.status === 'invalid') {
    return <Gentle doodle="peta" title="Halaman ini tidak ditemukan" body="Mungkin periodenya belum ada, atau lingkaran ini bukan milikmu." circleId={circleId} />;
  }
  if (state.status === 'locked') {
    return state.reason === 'memorial' ? (
      <Gentle
        doodle="lilin"
        title="Kapsul kenangan"
        body={`Lingkaran ini sudah dikunci sebagai kenangan. Wrap tidak lagi dirangkai di sini; semua harinya tetap utuh dan bisa dibuka pelan-pelan dari ${state.circle.name}.`}
        circleId={circleId}
      />
    ) : (
      <Gentle doodle="daun-kering" title="Arsip sudah dibekukan" body={COPY.modes.split.done} circleId={circleId} />
    );
  }
  if (state.status === 'error') {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: c.paper }}>
        <Header />
        <View style={{ padding: SPACE.md }}>
          <ErrorNote error={state.error} onRetry={state.retry} />
        </View>
      </SafeAreaView>
    );
  }

  return <StoryPlayer key={run} pages={pages} slow={state.wrap.scope === 'year'} startAt={startAt} onClose={() => close(circleId)} />;
}
