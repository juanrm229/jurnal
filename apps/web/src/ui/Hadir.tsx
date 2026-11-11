/**
 * Yang hadir: avatar orang terdekat di pojok kanan atas halaman hari ini.
 * Garis putus-putus berarti dia belum menyegel; titik lak berarti sudah.
 * Diketuk, ia membuka jepret, kangen, kilasan, dan "buka bersama".
 */
import { useState } from 'react';
import type { CircleView } from '@/lib/data';
import { useFlashes } from '@/lib/flash';
import { Link } from '@/lib/router';
import { FlashStrip } from '@/pages/kilasan/FlashStrip';
import { Avatar, Doodle, Sheet } from './kit';

export function Hadir({ circles, meId, day, today }: { circles: CircleView[]; meId: string; day: string; today: string }) {
  const [open, setOpen] = useState(false);
  const { flashes } = useFlashes();
  const isToday = day === today;
  // Satu wajah per orang, walau ia ada di beberapa lingkaran.
  const people = new Map<string, { doodle: string; name: string; sealed: boolean }>();
  for (const c of circles)
    for (const m of c.others) {
      const prev = people.get(m.userId);
      people.set(m.userId, { doodle: m.doodle, name: m.penName, sealed: (prev?.sealed ?? false) || (isToday && !!c.todaySealed[m.userId]) });
    }
  const faces = [...people.values()];
  const fresh = isToday && flashes.some((f) => f.wire.authorId !== meId && f.wire.day === today);

  if (!circles.length)
    return (
      <Link to="/l/baru" className="hadir" aria-label="ajak seseorang" title="ajak seseorang">
        <span className="hadir-invite">
          <Doodle id="ui-tambah" size={16} />
        </span>
      </Link>
    );
  if (!faces.length) return null;

  return (
    <>
      <button type="button" className="hadir" onClick={() => setOpen(true)} aria-label={`bersama ${faces.map((f) => f.name).join(', ')}`} data-testid="open-hadir">
        {faces.slice(0, 2).map((f) => (
          <span key={f.name + f.doodle} className={`hadir-face ${f.sealed ? 'sealed' : ''}`} title={`${f.name}${f.sealed ? ' · sudah menyegel' : ''}`}>
            <Avatar doodle={f.doodle} size={28} />
          </span>
        ))}
        {faces.length > 2 ? <span className="hadir-more">+{faces.length - 2}</span> : null}
        {fresh ? <span className="hadir-new" aria-label="ada kilasan baru" /> : null}
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} title="bersama">
        <div className="hadir-sheet">
          {isToday ? <FlashStrip /> : null}
          {circles.map((c) => {
            const done = c.active.filter((m) => c.todaySealed[m.userId]).length;
            return (
              <Link key={c.id} to={`/l/${c.id}/hari/${day}`} className="hadir-row" onClick={() => setOpen(false)}>
                <Doodle id={c.doodle} size={34} />
                <span className="grow">
                  <b>buka bersama {c.name}</b>
                  <span className="tiny soft">{isToday ? (done === c.active.length ? 'semua sudah menyegel' : `${done} dari ${c.active.length} sudah menyegel`) : 'halaman berdampingan'}</span>
                  <span className="faces">
                    {c.active.map((m) => (
                      <Avatar key={m.userId} doodle={m.doodle} size={24} sealed={isToday && c.todaySealed[m.userId]} dim={isToday && !c.todaySealed[m.userId]} title={m.penName} />
                    ))}
                  </span>
                </span>
                <Doodle id="ui-panah-kanan" size={16} />
              </Link>
            );
          })}
        </div>
      </Sheet>
    </>
  );
}
