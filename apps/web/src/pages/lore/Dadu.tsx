/**
 * Dadu Kenangan: sekali seminggu, lempar dadu untuk membuka satu hari acak
 * dari masa lalu lingkaran. Kebetulan membuat mengingat terasa seperti hadiah.
 */
import { COPY, dayName, type DiceRoll, formatDayLong, relativeDay } from '@sehari/core';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { api } from '@/lib/api';
import { useCircle, useCircleDay, useMe, useOpenDrops, useToday } from '@/lib/data';
import { navigate, useParams } from '@/lib/router';
import { Doodle, ErrorNote, Growing, Header, Screen, Sticky } from '@/ui/kit';
import { Btn, ErrLine, errorText, LockedMini, MiniDrop, nameIn, sortByTime } from './board';

const ROLL_MS = 1300;

export default function Dadu() {
  const { id } = useParams<{ id: string }>();
  const me = useMe();
  const today = useToday();
  const qc = useQueryClient();
  const circle = useCircle(id);
  const q = useQuery({ queryKey: ['dice', id], queryFn: () => api.get<DiceRoll | null>(`/circles/${id}/dice`), enabled: !!circle });
  const [rolling, setRolling] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const roll = async () => {
    setErr(null);
    setRolling(true);
    try {
      const [r] = await Promise.all([api.post<DiceRoll>(`/circles/${id}/dice`), new Promise((res) => window.setTimeout(res, ROLL_MS))]);
      qc.setQueryData(['dice', id], r);
    } catch (e) {
      setErr(errorText(e));
    } finally {
      setRolling(false);
    }
  };

  if (!circle || q.isLoading)
    return (
      <Screen>
        <Header title="dadu kenangan" backTo={`/l/${id}`} />
        <Growing />
      </Screen>
    );
  const r = q.data;

  return (
    <Screen>
      <Header title="dadu kenangan" sub={circle.name} backTo={`/l/${id}`} />
      {q.error ? <ErrorNote error={q.error} onRetry={() => void q.refetch()} /> : null}

      <div className="lore-dice-stage">
        {!r ? (
          <>
            <Doodle id="bintang-kecil" size={22} className="lore-float a" />
            <Doodle id="kilau" size={18} className="lore-float b" />
            <Doodle id="bintang-tiga" size={26} className="lore-float c" />
          </>
        ) : null}
        <span className={`lore-dice ${rolling ? 'rolling' : !r ? 'idle' : 'landed'}`}>
          <Doodle id="dadu" size={r ? 100 : 150} sw={2} draw />
        </span>
        <span className="lore-dice-shadow" style={{ width: r ? 74 : 112 }} />
      </div>

      {!r ? (
        <div className="col">
          <p className="small soft center" style={{ margin: 0 }}>
            Sekali seminggu, satu lemparan untuk seluruh lingkaran. Dadu memilih satu hari lama secara acak.
          </p>
          <div style={{ height: 8 }} />
          <Btn icon="ui-dadu" loading={rolling} onClick={() => void roll()}>
            {COPY.memories.diceRoll.toLowerCase()}
          </Btn>
          <ErrLine center>{err}</ErrLine>
        </div>
      ) : r.day ? (
        <Revealed circleId={id} day={r.day} rolledBy={nameIn(circle, r.rolledBy, me.user.id)} today={today} names={(u) => nameIn(circle, u, me.user.id)} />
      ) : (
        <div className="card col center" style={{ alignItems: 'center' }}>
          <Doodle id="jam-pasir" size={48} draw className="sway" />
          <div className="h2 center">belum ada hari lama untuk dibuka</div>
          <p className="small soft center" style={{ margin: 0 }}>
            Dadu hanya membuka hari yang sudah lewat seminggu atau lebih. Hari-hari ini sedang menua pelan-pelan; minggu depan coba lagi.
          </p>
        </div>
      )}
      {r ? <p className="tiny soft center mt-lg">dadu bisa dilempar lagi minggu depan</p> : null}
    </Screen>
  );
}

function Revealed({ circleId, day, rolledBy, today, names }: { circleId: string; day: string; rolledBy: string; today: string; names: (u: string) => string }) {
  const q = useCircleDay(circleId, day);
  const drops = sortByTime(useOpenDrops(q.data?.drops));
  return (
    <div className="col gap-lg rise">
      <Sticky color="yellow" tilt={-1.2}>
        <div className="tiny" style={{ letterSpacing: '0.14em', opacity: 0.7 }}>dadu jatuh di</div>
        <div className="hand" style={{ fontSize: 40, color: 'inherit' }}>
          {dayName(day)}, {formatDayLong(day)}
        </div>
        <div className="tiny" style={{ opacity: 0.75 }}>
          {relativeDay(day, today)} · dilempar {rolledBy}
        </div>
      </Sticky>
      {q.isLoading ? <Growing /> : null}
      {q.error ? <ErrorNote error={q.error} onRetry={() => void q.refetch()} /> : null}
      {drops.map((d, i) => (
        <MiniDrop key={d.wire.id} drop={d} author={names(d.wire.authorId)} tilt={i % 2 ? 0.4 : -0.4} />
      ))}
      {q.data?.locked.length ? <LockedMini locked={q.data.locked[0]!} author={`${q.data.locked.length} hal masih tertutup`} /> : null}
      {q.data && !drops.length && !q.data.locked.length ? (
        <p className="small soft center" style={{ margin: 0 }}>Halaman hari itu sepi. Kadang hari yang paling tenang justru yang paling ingin diulang.</p>
      ) : null}
      <Btn kind="soft" icon="buku-terbuka" onClick={() => navigate(`/l/${circleId}/hari/${day}`)}>
        buka halaman lengkapnya
      </Btn>
    </div>
  );
}
