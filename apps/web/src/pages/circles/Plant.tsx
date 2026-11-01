/** Tanaman Berdua: wajah dari api lingkaran, disiram kilasan & pelukan. */
import { formatDayLong, plantFor, type PlantState } from '@sehari/core';
import type { CSSProperties } from 'react';
import { type CircleView, useMe, useToday } from '@/lib/data';
import { useFlashes } from '@/lib/flash';
import { navigate } from '@/lib/router';
import { Doodle } from '@/ui/kit';

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

export function PlantArt({ state, size = 150 }: { state: PlantState; size?: number }) {
  const pot = size * 0.5;
  return (
    <div className={`pl pl-${state.health}${state.watered ? ' watered' : ''}`} style={{ width: size, height: size * 1.1, '--pot': `${pot}px` } as CSSProperties} aria-hidden>
      <div className="pl-plant">
        {state.stage.parts.map((p, i) => (
          <span
            key={i}
            className="pl-part"
            style={{ width: pot * p.size, left: `calc(50% + ${p.x * pot * 0.6}px - ${(pot * p.size) / 2}px)`, bottom: pot * 0.62 + p.y * pot, transform: `rotate(${p.rot ?? 0}deg)`, '--i': i } as CSSProperties}>
            <Doodle id={p.doodle} size={pot * p.size} />
          </span>
        ))}
        {state.stage.key === 'benih' ? <span className="pl-seed" /> : null}
      </div>
      <div className="pl-pot">
        <span className="pl-soil" />
        <span className="pl-rim" />
      </div>
      {state.watered ? (
        <span className="pl-drops">
          <i />
          <i />
          <i />
        </span>
      ) : null}
      {state.visitors ? (
        <span className="pl-visitor">
          <Doodle id="kupu-kupu" size={pot * 0.34} />
        </span>
      ) : null}
    </div>
  );
}

/** Kartu tanaman di halaman lingkaran. */
export function PlantCard({ circle }: { circle: CircleView }) {
  const today = useToday();
  const p = usePlant(circle);
  const ann = p.anniversary;
  return (
    <section className="card pl-card" data-testid="plant">
      <PlantArt state={p} />
      <div className="pl-text">
        <span className="label">tanaman kita</span>
        <div className="pl-name hand">{p.stage.name}</div>
        <p className="small" style={{ margin: '2px 0 8px' }}>
          {p.line}
        </p>
        <div className="pl-facts">
          <span>
            <b>{p.sinceDays}</b> hari bersama sejak {formatDayLong(circle.createdDay)}
          </span>
          <span>
            <b>{p.togetherDays}</b> hari disegel berdua
          </span>
          {p.next && p.toNext !== undefined ? (
            <span>
              <b>{p.toNext}</b> hari lagi jadi {p.next.name}
            </span>
          ) : null}
          <span className={ann.inDays === 0 ? 'pl-ann today' : ''}>
            {ann.inDays === 0 ? (
              <>
                hari jadi ke-<b>{ann.years}</b> hari ini!
              </>
            ) : (
              <>
                hari jadi ke-{ann.years} dalam <b>{ann.inDays}</b> hari
              </>
            )}
          </span>
        </div>
        {!p.watered && circle.status === 'active' && today ? (
          <div className="row" style={{ gap: 6, marginTop: 10 }}>
            <button className="btn sm auto" onClick={() => navigate('/kilasan/jepret')}>
              <Doodle id="penyiram" size={18} color="currentColor" /> siram dengan kilasan
            </button>
          </div>
        ) : null}
      </div>
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
