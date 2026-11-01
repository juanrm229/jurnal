/** Tanaman Berdua: wajah dari api lingkaran, disiram kilasan & pelukan. */
import { formatDayLong, plantFor, type PlantState } from '@sehari/core';
import type { CSSProperties } from 'react';
import { type CircleView, useMe, useToday } from '@/lib/data';
import { useFlashes } from '@/lib/flash';
import { navigate } from '@/lib/router';
import { Avatar, Doodle, Flame } from '@/ui/kit';

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

/**
 * Kartu "kita": tanaman (wajah api lingkaran) dan api bersama dalam satu kartu.
 * Atas: tanaman + nama tahap + satu kalimat. Tengah: tiga angka. Bawah: siapa
 * yang sudah menyegel hari ini.
 */
export function PlantCard({ circle }: { circle: CircleView }) {
  const me = useMe();
  const p = usePlant(circle);
  const ann = p.anniversary;
  const s = circle.streak;
  const members = circle.members.filter((m) => m.state !== 'left');
  return (
    <section className="card kt" data-testid="plant">
      <div className="kt-top">
        <PlantArt state={p} size={104} />
        <div className="kt-head">
          <span className="label">tanaman kita</span>
          <div className="pl-name hand">{p.stage.name}</div>
          <p className="small kt-line">{p.line}</p>
        </div>
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
        {p.next && p.toNext !== undefined ? ` · ${p.toNext} hari lagi jadi ${p.next.name}` : ''}
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
