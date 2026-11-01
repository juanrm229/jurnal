/**
 * Wrap: Minggu Kita, Bulan Kita, Tahun Kita, dan Wrap Acara. Dirangkai di
 * perangkat dari isi yang sudah didekripsi, lalu disajikan sebagai cerita yang
 * digulir adegan demi adegan (lihat pages/wrapped/Wrapped).
 */
import { buildWrapStory, COPY, songTally } from '@sehari/core';
import { useMemo } from 'react';
import { useMe } from '@/lib/data';
import { back, useParams } from '@/lib/router';
import { Doodle, ErrorNote, Header, Screen } from '@/ui/kit';
import { EndScreen } from './story/EndScreen';
import { useWrapData } from './story/wrapData';
import { PERSON_COLORS, Wrapped, type WrappedCtx } from './wrapped/Wrapped';

function close(circleId: string) {
  back(`/l/${circleId}`);
}

function Gentle({ doodle, title, body, circleId }: { doodle: string; title: string; body: string; circleId: string }) {
  return (
    <Screen>
      <Header backTo={`/l/${circleId}`} />
      <div className="col" style={{ alignItems: 'center', textAlign: 'center', gap: 16, padding: '12vh 8px 0' }}>
        <Doodle id={doodle} size={96} />
        <h1 className="h2" style={{ fontSize: 20 }}>{title}</h1>
        <p className="soft" style={{ margin: 0, maxWidth: 420 }}>{body}</p>
        <button className="btn ghost auto mt" onClick={() => close(circleId)}>
          kembali
        </button>
      </div>
    </Screen>
  );
}

/** Layar memuat yang selalu terlihat (tanpa animasi masuk). */
function Loading({ circleId }: { circleId: string }) {
  return (
    <Screen>
      <Header backTo={`/l/${circleId}`} />
      <div className="col" style={{ alignItems: 'center', textAlign: 'center', gap: 12, padding: '22vh 8px 0' }}>
        <Doodle id="amplop" size={72} />
        <p className="small" style={{ margin: 0 }}>merangkai hari-hari…</p>
        <p className="tiny soft" style={{ margin: 0, maxWidth: 300 }}>membuka setiap halaman di perangkatmu. isinya tidak pernah dikirim ke mana pun.</p>
      </div>
    </Screen>
  );
}

export default function WrapPage() {
  const { circleId = '', scope = '', period = '' } = useParams<{ circleId: string; scope: string; period: string }>();
  const me = useMe();
  const state = useWrapData(circleId, scope, period);
  const ready = state.status === 'ready' ? state : null;

  const view = useMemo(() => {
    if (!ready) return null;
    const { circle, input, wrap } = ready;
    const story = buildWrapStory(input);
    const members = new Map(circle.members.map((m) => [m.userId, m]));
    const order = story.people.map((p) => p.userId);
    const ctx: WrappedCtx = {
      meId: me.user.id,
      circleId: circle.id,
      name: (id) => (id === me.user.id ? 'kamu' : (members.get(id)?.penName ?? story.people.find((p) => p.userId === id)?.name ?? 'seseorang')),
      doodleOf: (id) => members.get(id)?.doodle ?? 'tunas',
      colorOf: (id) => PERSON_COLORS[Math.max(0, order.indexOf(id)) % PERSON_COLORS.length]!,
    };
    return { story, ctx, wrap, songs: songTally(input.drops) };
  }, [ready, me.user.id]);

  if (state.status === 'loading') return <Loading circleId={circleId} />;
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
  if (!view) return <Loading circleId={circleId} />;

  return (
    <Wrapped
      story={view.story}
      ctx={view.ctx}
      onClose={() => close(circleId)}
      end={(nav) => <EndScreen wrap={view.wrap} songs={view.songs} onBack={nav.back} onReplay={nav.toStart} onClose={() => close(circleId)} />}
    />
  );
}
