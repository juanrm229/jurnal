/** Tanaman Berdua: wajah dari api lingkaran, disiram kilasan & pelukan. */
import { benihTalk, formatDayLong, localParts, PLANT_STAGES, plantFor, type BenihMood, type PlantState } from '@sehari/core';
import { useMemo, useState } from 'react';
import { type CircleView, useMe, useToday } from '@/lib/data';
import { useFlashes } from '@/lib/flash';
import { playedMinutesToday } from '@/lib/play';
import { navigate } from '@/lib/router';
import { sound } from '@/lib/sound';
import { Benih } from '@/ui/Benih';
import { Avatar, Doodle, Flame, Sheet } from '@/ui/kit';

/** Hitung keadaan tanaman sebuah lingkaran (memakai kilasan hari ini). */
export function usePlant(circle: CircleView): PlantState {
  const me = useMe();
  const today = useToday();
  const { flashes } = useFlashes();
  const todays = flashes.filter((f) => f.wire.day === today && f.wire.circleIds.includes(circle.id));
  const name = (id: string) => (id === me.user.id ? 'kamu' : (circle.members.find((m) => m.userId === id)?.penName ?? 'teman'));
  const waterers = [...todays.map((f) => f.wire.authorId), ...todays.flatMap((f) => (f.wire.faces ?? []).map((x) => x.userId))];
  return plantFor({ streak: circle.streak, createdDay: circle.createdDay, today, wateredBy: waterers.map(name), flashesToday: todays.length });
}

export function PlantArt({ state, size = 150, mood, className }: { state: PlantState; size?: number; mood?: BenihMood; className?: string }) {
  // Benih yang baru ditanam belum punya alasan untuk layu.
  const health = state.togetherDays === 0 ? 'segar' : state.health;
  return <Benih stage={state.stage.key} health={health} watered={state.watered} visitors={state.visitors} mood={mood} size={size} className={className} />;
}

function skyTime(h: number) {
  if (h < 5 || h >= 19) return 'malam';
  if (h < 10) return 'pagi';
  if (h < 16) return 'siang';
  return 'senja';
}

/**
 * Kartu "kita": Si Benih di panggung kecilnya (langit ikut jam), celetukannya,
 * jalan menuju tahap berikutnya, tiga angka, dan siapa yang sudah menyegel.
 */
export function PlantCard({ circle }: { circle: CircleView }) {
  const me = useMe();
  const today = useToday();
  const p = usePlant(circle);
  const ann = p.anniversary;
  const s = circle.streak;
  const members = circle.members.filter((m) => m.state !== 'left');
  const hour = localParts(me.user.tz).hour;
  const talk = useMemo(
    () =>
      benihTalk(p, {
        hour,
        seed: `${circle.id}:${today}`,
        sealedByMe: !!circle.todaySealed[me.user.id],
        playedMinutes: playedMinutesToday(),
        waitingFor: circle.others.filter((m) => !circle.todaySealed[m.userId]).map((m) => m.penName),
      }),
    [p.stage.key, p.health, p.watered, p.visitors, p.togetherDays, hour, circle.id, today, circle.todaySealed, me.user.id],
  );
  const [n, setN] = useState(0);
  const [poke, setPoke] = useState(0);
  const [stages, setStages] = useState(false);
  const line = talk.lines[n % talk.lines.length]!;
  const span = p.next ? p.next.from - p.stage.from : 1;
  const done = p.next ? Math.min(1, (p.togetherDays - p.stage.from) / span) : 1;
  const tap = () => {
    setN((x) => x + 1);
    setPoke((x) => x + 1);
    sound.play('pop');
    navigator.vibrate?.(10);
  };
  return (
    <section className="card kt" data-testid="plant">
      <div className="kt-hero" data-time={skyTime(hour)}>
        {skyTime(hour) === 'malam' ? <span className="kt-stars" aria-hidden /> : null}
        <span className="kt-orb" aria-hidden />
        <span className="kt-hill" aria-hidden />
        <button className="kt-plant" onClick={tap} aria-label="ketuk Si Benih" data-testid="benih">
          <PlantArt key={poke} state={p} size={132} mood={talk.mood} className={poke ? 'poke' : undefined} />
        </button>
        <p key={n} className="kt-bubble" aria-live="polite" data-testid="benih-line">
          {line}
          <small>— si {p.stage.name}{n === 0 ? ' · ketuk aku' : ''}</small>
        </p>
      </div>
      <div className="kt-head">
        <div className="kt-title">
          <span className="pl-name hand">{p.stage.name}</span>
          <span className="label">tanaman kita</span>
        </div>
        <button className="kt-grow" onClick={() => setStages(true)} aria-label="lihat perjalanan tumbuh">
          <span className="kt-bar" aria-hidden>
            <i style={{ width: `${Math.round(done * 100)}%` }} />
          </span>
          <span className="kt-next">
            {p.next && p.toNext !== undefined ? (
              <>
                <b>{p.toNext}</b> hari lagi → {p.next.name}
              </>
            ) : (
              'sudah setinggi-tingginya'
            )}
          </span>
        </button>
        <p className="small kt-line">{p.line}</p>
      </div>
      <div className="kt-stats">
        <div>
          <b>{p.sinceDays}</b>
          <span>hari bersama</span>
        </div>
        <div title={`terpanjang ${s.longest} hari`}>
          <span className="kt-flame">
            <Flame level={s.flame} days={s.current} size={22} />
          </span>
          <span>hari api</span>
        </div>
        <div className={ann.inDays === 0 ? 'today' : ''}>
          <b>{ann.inDays === 0 ? '🎉' : ann.inDays}</b>
          <span>{ann.inDays === 0 ? `hari jadi ke-${ann.years}` : 'ke hari jadi'}</span>
        </div>
      </div>
      <p className="tiny soft kt-sub">
        {p.togetherDays} hari disegel berdua sejak {formatDayLong(circle.createdDay)} · api terpanjang {s.longest}
        {s.next ? ` · ${s.next.remaining} hari lagi ke ${s.next.name}` : ''}
      </p>
      <div className="kt-foot">
        <div className="kt-members">
          {members.map((m) => (
            <span key={m.userId} className="kt-member" title={circle.todaySealed[m.userId] ? 'sudah menyegel hari ini' : 'belum menyegel'}>
              <Avatar doodle={m.doodle} size={30} sealed={circle.todaySealed[m.userId]} dim={m.state === 'remembered'} />
              <span className="tiny">{m.userId === me.user.id ? 'kamu' : m.penName}</span>
            </span>
          ))}
        </div>
        {!p.watered && circle.status === 'active' ? (
          <button className="btn sm auto ghost" onClick={() => navigate('/kilasan/jepret')}>
            <Doodle id="penyiram" size={16} color="currentColor" /> siram
          </button>
        ) : null}
      </div>
      <Sheet open={stages} onClose={() => setStages(false)} title="perjalanan tumbuh">
        <p className="small soft" style={{ margin: '0 0 12px' }}>
          Ia tumbuh dari hari yang kalian segel bersama. Tidak pernah mati, paling jauh merajuk.
        </p>
        <div className="kt-stages">
          {PLANT_STAGES.map((st) => {
            const reached = p.togetherDays >= st.from;
            return (
              <div key={st.key} className={`kt-stage ${st.key === p.stage.key ? 'now' : ''} ${reached ? '' : 'locked'}`}>
                <Benih stage={st.key} size={96} locked={!reached} />
                <span className="hand">{reached ? st.name : '???'}</span>
                <span className="tiny soft">{st.key === p.stage.key ? 'sekarang' : st.from === 0 ? 'hari pertama' : `${st.from} hari bersama`}</span>
              </div>
            );
          })}
        </div>
      </Sheet>
    </section>
  );
}

/** Tanaman mini untuk daftar lingkaran. */
export function PlantMini({ circle }: { circle: CircleView }) {
  const p = usePlant(circle);
  return (
    <span className="pl-mini" title={`${p.stage.name} · ${p.togetherDays} hari disegel berdua`}>
      <PlantArt state={p} size={46} />
    </span>
  );
}
