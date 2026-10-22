import { COPY, MOMENT_TIERS } from '@sehari/core';
import { useEffect, useState } from 'react';
import { createInvite } from '@/lib/circles';
import { useCircle, useMe } from '@/lib/data';
import { navigate, useParams } from '@/lib/router';
import { shareOrCopy } from '@/lib/share';
import { QR } from '@/ui/art';
import { Doodle, Growing, Header, useToast } from '@/ui/kit';

export default function Invite() {
  const { id } = useParams<{ id: string }>();
  const me = useMe();
  const toast = useToast();
  const circle = useCircle(id);
  const [url, setUrl] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!circle || url) return;
    const max = circle.kind === 'duo' ? 1 : circle.kind === 'moment' ? MOMENT_TIERS[circle.moment?.tier ?? 'coba'].maxGuests : 8 - circle.active.length;
    createInvite(circle, { maxUses: Math.max(1, max), hours: circle.kind === 'moment' ? 24 * 14 : 48 })
      .then((r) => setUrl(r.url))
      .catch((e) => setErr((e as Error).message));
  }, [circle?.id]);

  if (!circle) return <Growing />;
  return (
    <main className="screen">
      <Header title="undang" sub={circle.name} backTo={`/l/${id}`} />
      <div className="col center" style={{ alignItems: 'center', gap: 16 }}>
        <Doodle id={circle.kind === 'moment' ? 'kado' : 'amplop'} size={60} draw />
        <p>{circle.kind === 'moment' ? 'Pasang QR ini di meja tamu, atau kirim tautannya ke grup acara.' : COPY.onboarding.invite.body}</p>
        <div className="card" style={{ padding: 20 }}>{url ? <QR value={url} /> : err ? <span>{err}</span> : <Growing label="menyiapkan undangan…" />}</div>
        <p className="tiny soft">Kunci lingkaran ikut di bagian akhir tautan (setelah #), yang tidak pernah dikirim ke server. Siapa pun yang memegang tautan bisa bergabung, jadi kirim hanya ke orang yang kamu pilih. Berlaku {circle.kind === 'moment' ? '14 hari' : '48 jam'}.</p>
        {url ? (
          <div className="col" style={{ width: '100%' }}>
            <button className="btn" onClick={() => void shareOrCopy(COPY.onboarding.invite.shareText(me.user.penName ?? 'Seseorang'), url).then((r) => r === 'copied' && toast('Tautan disalin.'))}>
              <Doodle id="ui-bagikan" size={20} color="currentColor" /> {COPY.onboarding.invite.cta.toLowerCase()}
            </button>
            <button className="btn soft" onClick={() => navigator.clipboard.writeText(url).then(() => toast('Tautan disalin.'))}>salin tautan</button>
            <a className="btn soft" href={`https://wa.me/?text=${encodeURIComponent(`${COPY.onboarding.invite.shareText(me.user.penName ?? 'Seseorang')} ${url}`)}`} target="_blank" rel="noreferrer">kirim lewat WhatsApp</a>
            <button className="btn ghost" onClick={() => navigate(`/l/${id}`, { replace: true })}>selesai</button>
          </div>
        ) : null}
      </div>
    </main>
  );
}
