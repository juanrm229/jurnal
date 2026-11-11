/** Tanaman Berdua: wajah dari api lingkaran, disiram kilasan & pelukan. */
import { benihTalk, localParts, PLANT_STAGES, plantFor, type BenihMood, type PlantState } from '@sehari/core';
import { type CSSProperties, useMemo, useState } from 'react';
import { type CircleView, useMe, useToday } from '@/lib/data';
import { useFlashes } from '@/lib/flash';
import { playedMinutesToday } from '@/lib/play';
import { navigate } from '@/lib/router';
import { sound } from '@/lib/sound';
import { Benih } from '@/ui/Benih';
import { Doodle, Sheet } from '@/ui/kit';

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

/**
 * Si Benih di beranda Kita: tokohnya di kiri, celetukannya dan jalan menuju
 * tahap berikutnya di kanan. Angka-angka pindah ke bawah judul layar.
 */
export function PlantCard({ circle }: { circle: CircleView }) {
  const me = useMe();
  const today = useToday();
  const p = usePlant(circle);
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
    <section className="card bh" data-testid="plant">
      <button className="bh-pot" onClick={tap} aria-label="ketuk Si Benih" data-testid="benih">
        <PlantArt key={poke} state={p} size={104} mood={talk.mood} className={poke ? 'poke' : undefined} />
      </button>
      <div className="bh-body">
        <p key={n} className="bh-say" aria-live="polite" data-testid="benih-line">
          “{line}”
        </p>
        <button className="bh-grow" onClick={() => setStages(true)} aria-label="lihat perjalanan tumbuh">
          <span className="bh-bar" aria-hidden>
            <i style={{ '--w': `${Math.round(done * 100)}%` } as CSSProperties} />
          </span>
          <span className="tiny soft">
            si {p.stage.name}
            {p.next && p.toNext !== undefined ? (
              <>
                {' '}
                · <b className="ink">{p.toNext}</b> hari lagi jadi {p.next.name}
              </>
            ) : (
              ' · sudah setinggi-tingginya'
            )}
          </span>
        </button>
        {!p.watered && circle.status === 'active' ? (
          <button className="bh-water" onClick={() => navigate('/kilasan/jepret')}>
            <Doodle id="penyiram" size={16} color="currentColor" /> siram dengan jepretan
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
