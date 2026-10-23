/**
 * Satu surat, dibuka di perangkat dan ditulis tangan di selembar kertas
 * bergaris yang baru saja dikeluarkan dari amplopnya.
 */
import { getCity } from '@sehari/core';
import { useQueryClient } from '@tanstack/react-query';
import { type CSSProperties, useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';
import { memberName, qk, useCircles, useMe } from '@/lib/data';
import { navigate, useParams } from '@/lib/router';
import { Doodle, Empty, Growing, Header, Screen } from '@/ui/kit';
import { openSong, Photo } from '../story/cards';
import { formatWhen, KIND_DOODLE, KIND_LABEL, milestoneName, stickyColorFor, tiltFor, travelled, useAllLetters } from '../story/letters';

export default function Read() {
  const { id = '' } = useParams<{ id: string }>();
  const me = useMe();
  const qc = useQueryClient();
  const { circles } = useCircles();
  const { inbox, outbox, open } = useAllLetters();
  const letter = inbox.data?.find((l) => l.id === id) ?? outbox.data?.find((l) => l.id === id);
  const p = letter ? open.get(letter.id) : undefined;
  const marked = useRef(false);
  // Surat "buka kalau…": penerima memutuskan sendiri kapan membukanya.
  const [sure, setSure] = useState(false);
  const waiting = !!letter && letter.kind === 'when' && !letter.openedAt && letter.toUserId === me.user.id && !sure;

  // Datang langsung dari notifikasi: tandai terbuka sekali.
  useEffect(() => {
    if (!letter || letter.openedAt || !letter.deliveredAt || (letter.fromUserId === me.user.id && letter.kind !== 'when') || waiting || marked.current) return;
    marked.current = true;
    api
      .post(`/letters/${letter.id}/open`)
      .then(() => qc.invalidateQueries({ queryKey: qk.letters('inbox') }))
      .catch(() => {});
  }, [letter, me.user.id, qc, waiting]);

  if (inbox.isLoading || outbox.isLoading) {
    return (
      <Screen>
        <Header backTo="/surat" />
        <Growing label="membuka amplop…" />
      </Screen>
    );
  }
  if (!letter) {
    return (
      <Screen>
        <Header backTo="/surat" />
        <Empty
          doodle="surat-botol"
          title="Surat ini belum bisa ditemukan."
          body="Mungkin ia masih di perjalanan."
          action={
            <button className="btn ghost auto" onClick={() => navigate('/surat', { replace: true })}>
              ke kotak surat
            </button>
          }
        />
      </Screen>
    );
  }

  const mine = letter.fromUserId === me.user.id;
  const sender = mine ? (letter.toUserId === me.user.id ? 'kamu, dari masa lalu' : 'kamu') : memberName(circles, letter.fromUserId, me.user.id);
  const recipient =
    letter.toUserId === me.user.id ? 'dirimu sendiri' : letter.toUserId ? memberName(circles, letter.toUserId, me.user.id) : `seluruh ${circles.find((x) => x.id === letter.circleId)?.name ?? 'lingkaran'}`;
  const city = getCity(p?.writtenInCityId);
  const trip = p && letter.kind === 'lost' ? travelled(p.writtenAt, letter.deliveredAt, me.user.tz) : null;
  const photos = p?.media?.filter((m) => m.mime.startsWith('image/')) ?? [];

  return (
    <Screen>
      <Header title={KIND_LABEL[letter.kind].toLowerCase()} sub={mine ? `untuk ${recipient}` : `dari ${sender}`} backTo="/surat" />
      <div style={{ height: 16 }} />
      {waiting ? (
        <div className="card col" style={{ alignItems: 'center', textAlign: 'center', gap: 12 }}>
          <Doodle id="amplop" size={56} className="breathe" />
          <p className="hand" style={{ fontSize: 30, margin: 0, color: 'var(--text)' }}>{p?.envelopeNote ?? 'buka kalau…'}</p>
          <p className="small soft" style={{ margin: 0 }}>Sudah waktunya? {mine ? 'Ini surat dari dirimu sendiri.' : `${sender} akan tahu amplop ini sudah dibuka.`}</p>
          <div className="row" style={{ gap: 8, width: '100%' }}>
            <button className="btn ghost grow" onClick={() => navigate('/surat')}>
              nanti saja
            </button>
            <button className="btn grow" onClick={() => setSure(true)}>
              buka sekarang
            </button>
          </div>
        </div>
      ) : !p ? (
        <div className="card col" style={{ alignItems: 'center', textAlign: 'center' }}>
          <Doodle id="ui-gembok" size={36} />
          <span className="soft">{letter.envelope ? 'Surat ini tidak bisa dibuka dengan kunci di perangkat ini.' : 'Surat ini masih di perjalanan.'}</span>
        </div>
      ) : (
        <>
          {p.envelopeNote ? (
            <div className="letter-envelope-tab fade">
              <Doodle id="amplop" size={22} />
              <span className="hand" style={{ fontSize: 24, color: 'var(--text)' }}>{p.envelopeNote}</span>
            </div>
          ) : null}
          <article
            className="letter-paper unfold"
            style={{ '--lp': `var(--sticky-${stickyColorFor(letter.id)})`, '--tilt': `${tiltFor(letter.id) * 0.3 - 0.6}deg` } as CSSProperties}
            data-testid="letter-body">
            <div className="letter-paper-head">
              <span className="tiny">
                {formatWhen(p.writtenAt, me.user.tz)}
                {city ? ` · ${city.name}` : ''}
              </span>
              <span className="letter-postmark">
                <Doodle id={KIND_DOODLE[letter.kind]} size={26} />
              </span>
            </div>
            <div className="letter-body-text hand">{p.text}</div>
            {photos.map((m, i) => (
              <div key={m.id} className="letter-photo" style={{ '--r': `${i % 2 ? 2 : -2}deg` } as CSSProperties}>
                <span className="letter-tape" />
                <Photo media={m} style={{ borderRadius: 2 }} />
              </div>
            ))}
            {p.song ? (
              <button className="letter-song row" onClick={() => openSong(p.song!.url)}>
                <Doodle id="ui-lagu" size={22} />
                <span className="small ink grow story-ellipsis" style={{ textAlign: 'left' }}>
                  {p.song.title} — {p.song.artist}
                </span>
              </button>
            ) : null}
            <div className="letter-sign hand">— {sender}</div>
          </article>
          <div className="col center mt-lg" style={{ alignItems: 'center', gap: 4 }}>
            {trip ? <span className="small ink">{`Ditulis ${formatWhen(p.writtenAt, me.user.tz)}, lalu ${trip}.`}</span> : null}
            {letter.kind === 'milestone' && milestoneName(letter.milestoneDays) ? (
              <span className="small ink">{`Dikunci untuk petak ${milestoneName(letter.milestoneDays)}, hari ke-${letter.milestoneDays}.`}</span>
            ) : null}
            {mine && !letter.deliveredAt ? (
              <span className="small soft">
                {letter.kind === 'lost'
                  ? 'Masih dalam perjalanan. Kapan sampainya, biar jadi rahasia jalan.'
                  : `Masih terkunci${letter.deliverOn ? ` sampai ${formatWhen(`${letter.deliverOn}T12:00:00Z`, 'UTC')}` : ''}.`}
              </span>
            ) : null}
          </div>
        </>
      )}
      <div style={{ height: 40 }} />
      {!mine && letter.circleId ? (
        <button
          className="btn soft"
          onClick={() => navigate(`/surat/tulis?${new URLSearchParams({ kind: 'lost', circleId: letter.circleId!, to: letter.fromUserId }).toString()}`)}>
          <Doodle id="surat-botol" size={22} color="currentColor" />
          balas dengan surat tersesat
        </button>
      ) : null}
    </Screen>
  );
}
