/**
 * Dinding Photobox lingkaran: setiap strip yang ditempel di halaman hari
 * (dan sudah dibuka bersama) digantung berjajar dengan selotip, dari yang
 * terbaru. Dari sini juga bisa langsung membuka booth berdua.
 */
import { addDays, formatDayLong } from '@sehari/core';
import { type CSSProperties, useMemo, useState } from 'react';
import { tiltFor } from '@/lib/board';
import { memberName, type OpenDrop, useCircle, useCircleRange, useCircles, useMe, useOpenDrops, useToday } from '@/lib/data';
import { useMediaUrl } from '@/lib/media';
import { Link, navigate, useParams } from '@/lib/router';
import { Doodle, Empty, Growing, Header, Sheet } from '@/ui/kit';

export default function StripWall() {
  const { id = '' } = useParams<{ id: string }>();
  const circle = useCircle(id);
  const { circles } = useCircles();
  const me = useMe();
  const today = useToday();
  const q = useCircleRange(id, addDays(today, -399), today, !!circle);
  const drops = useOpenDrops(q.data?.drops);
  const [open, setOpen] = useState<OpenDrop | null>(null);
  const strips = useMemo(() => drops.filter((d) => d.payload?.tags?.includes('photobox')).sort((a, b) => b.wire.day.localeCompare(a.wire.day)), [drops]);
  if (!circle) return <Growing />;
  return (
    <main className="screen pb-screen">
      <Header title="dinding photobox" sub={circle.name} backTo={`/l/${id}`} />
      <div className="pb-wall-cta">
        <button className="pb-mode duo" onClick={() => navigate(`/photobox?berdua=${id}`)} data-testid="wall-duo">
          <span className="pb-mode-art">
            <span className="pb-mini-strip a" />
            <span className="pb-mini-heart">♥</span>
            <span className="pb-mini-strip b" />
          </span>
          <span className="pb-mode-name">photobox berdua</span>
          <span className="tiny soft">dia langsung dapat notifikasi</span>
        </button>
        <Link to="/photobox" className="btn soft">
          <Doodle id="kamera" size={18} color="currentColor" /> photobox sendiri
        </Link>
      </div>
      {q.isLoading ? (
        <Growing label="menggantung strip…" />
      ) : strips.length === 0 ? (
        <Empty doodle="kamera" title="Dindingnya masih kosong." body="Tempel strip photobox ke halaman hari ini. Setelah hari itu dibuka bersama, stripnya tergantung di sini." />
      ) : (
        <div className="pb-wall">
          {strips.map((d, i) => (
            <button key={d.wire.id} className="pb-wall-item rise" style={{ '--tilt': `${tiltFor(d.wire.id, 3)}deg`, animationDelay: `${Math.min(i, 10) * 0.05}s` } as CSSProperties} onClick={() => setOpen(d)}>
              <span className="tape" />
              <Strip d={d} />
              <span className="tiny soft">{formatDayLong(d.wire.day, false)}</span>
            </button>
          ))}
        </div>
      )}
      <Sheet open={!!open} onClose={() => setOpen(null)} title="strip hari itu">
        {open ? (
          <div className="col" style={{ gap: 12, alignItems: 'center' }}>
            <Strip d={open} big />
            <span className="tiny soft">
              ditempel {memberName(circles, open.wire.authorId, me.user.id)} · <Link to={`/l/${id}/hari/${open.wire.day}`}>{formatDayLong(open.wire.day)}</Link>
            </span>
          </div>
        ) : null}
      </Sheet>
    </main>
  );
}

function Strip({ d, big }: { d: OpenDrop; big?: boolean }) {
  const m = d.payload?.media?.[0];
  const url = useMediaUrl(m);
  const ar = m?.width && m?.height ? `${m.width} / ${m.height}` : '1 / 3';
  return url ? <img className={`pb-wall-strip ${big ? 'big' : ''}`} src={url} alt="strip" style={{ aspectRatio: ar }} /> : <span className="pb-wall-strip ph" style={{ aspectRatio: ar, background: m?.tint }} />;
}
