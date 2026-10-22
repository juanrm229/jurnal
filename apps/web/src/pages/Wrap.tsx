/**
 * Wrap: Minggu Kita, Bulan Kita, Tahun Kita, dan Wrap Acara. Dirangkai di
 * perangkat dari isi yang sudah didekripsi, lalu diputar seperti Story.
 */
import { COPY, songTally, type WrapScope } from '@sehari/core';
import { useMemo, useState } from 'react';
import { useMe } from '@/lib/data';
import { back, useParams } from '@/lib/router';
import { Doodle, ErrorNote, Growing, Header, Screen } from '@/ui/kit';
import { CardView, type StoryCard, type StoryCtx, tintFor } from './story/cards';
import { EndScreen } from './story/EndScreen';
import { type StoryPage, StoryPlayer } from './story/StoryPlayer';
import { useWrapData } from './story/wrapData';

const QUIET_PREFIX: Record<WrapScope, string> = { week: 'Minggu ini', month: 'Bulan ini', year: 'Tahun ini', moment: 'Acara ini' };

function close(circleId: string) {
  back(`/l/${circleId}`);
}

function Gentle({ doodle, title, body, circleId }: { doodle: string; title: string; body: string; circleId: string }) {
  return (
    <Screen>
      <Header backTo={`/l/${circleId}`} />
      <div className="col rise" style={{ alignItems: 'center', textAlign: 'center', gap: 16, padding: '12vh 8px 0' }}>
        <Doodle id={doodle} size={96} draw />
        <h1 className="h2" style={{ fontSize: 20 }}>{title}</h1>
        <p className="soft" style={{ margin: 0, maxWidth: 420 }}>{body}</p>
        <button className="btn ghost auto mt" onClick={() => close(circleId)}>
          kembali
        </button>
      </div>
    </Screen>
  );
}

export default function WrapPage() {
  const { circleId = '', scope = '', period = '' } = useParams<{ circleId: string; scope: string; period: string }>();
  const me = useMe();
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
      cards = [
        cover.type === 'cover' ? { ...cover, subtitle: 'Halaman yang tenang.' } : cover,
        ...wrap.cards.filter((x) => x.type === 'streak'),
        { type: 'quiet', text },
        wrap.cards[wrap.cards.length - 1]!,
      ];
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
      tint: tintFor(card),
      render: ({ playing, duration }) => <CardView card={card} ctx={{ ...ctxBase, playing, duration }} />,
    }));
    const songs = songTally(input.drops);
    out.push({
      key: 'end',
      duration: null,
      interactive: true,
      tint: 'var(--paper)',
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
  }, [ready, me.user.id, circleId]);

  if (state.status === 'loading') {
    return (
      <Screen>
        <div style={{ paddingTop: '30vh' }}>
          <Growing label="merangkai hari-hari…" />
        </div>
      </Screen>
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
      <Screen>
        <Header backTo={`/l/${circleId}`} />
        <ErrorNote error={state.error} onRetry={state.retry} />
      </Screen>
    );
  }

  return <StoryPlayer key={run} pages={pages} slow={state.wrap.scope === 'year'} startAt={startAt} onClose={() => close(circleId)} />;
}
