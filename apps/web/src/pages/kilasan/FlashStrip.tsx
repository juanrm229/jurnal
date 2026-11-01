/** Baris kilasan di atas halaman hari ini: jepret, kangen, dan kilasan teman terbaru. */
import { useState } from 'react';
import { useCircles, useMe, useToday } from '@/lib/data';
import { type Flash, flashTargets, useFlashes } from '@/lib/flash';
import { useMediaUrl } from '@/lib/media';
import { Link, navigate } from '@/lib/router';
import { Avatar, Doodle } from '@/ui/kit';
import { KangenSheet } from './Kilasan';

function Thumb({ f, doodle, name }: { f: Flash; doodle: string; name: string }) {
  const url = useMediaUrl(f.flash === 'snap' ? f.payload!.media?.[0] : undefined);
  return (
    <Link to={`/kilasan?id=${f.wire.id}`} className="fs-item" aria-label={`kilasan dari ${name}`}>
      <span className={`fs-ring${f.flash === 'kangen' ? ' kangen' : ''}`}>
        {f.flash === 'snap' && url ? <img src={url} alt="" /> : f.flash === 'kangen' ? <Doodle id="hati-dua" size={30} /> : <Avatar doodle={doodle} size={44} />}
        <span className="fs-av">
          <Avatar doodle={doodle} size={20} />
        </span>
      </span>
      <span className="fs-name">{name}</span>
    </Link>
  );
}

export function FlashStrip() {
  const me = useMe();
  const today = useToday();
  const { circles } = useCircles();
  const { flashes } = useFlashes();
  const [kangen, setKangen] = useState(false);
  if (!flashTargets(circles).length) return null;
  const members = new Map(circles.flatMap((c) => c.members).map((m) => [m.userId, m]));
  const friends = flashes.filter((f) => f.wire.authorId !== me.user.id && f.wire.day === today).slice(0, 12);
  return (
    <section className="fs" aria-label="kilasan">
      <button className="fs-item" onClick={() => navigate('/kilasan/jepret')} data-testid="strip-jepret">
        <span className="fs-ring add">
          <Doodle id="kamera" size={26} />
        </span>
        <span className="fs-name">jepret</span>
      </button>
      <button className="fs-item" onClick={() => setKangen(true)} data-testid="strip-kangen">
        <span className="fs-ring add soft">
          <Doodle id="hati-dua" size={26} />
        </span>
        <span className="fs-name">kangen</span>
      </button>
      {friends.map((f) => {
        const m = members.get(f.wire.authorId);
        return <Thumb key={f.wire.id} f={f} doodle={m?.doodle ?? 'tunas'} name={m?.penName ?? 'teman'} />;
      })}
      <Link to="/kilasan" className="fs-item">
        <span className="fs-ring more">
          <Doodle id="ui-panah-kanan" size={22} />
        </span>
        <span className="fs-name">{friends.length ? 'semua' : 'kilasan'}</span>
      </Link>
      <KangenSheet open={kangen} onClose={() => setKangen(false)} />
    </section>
  );
}
