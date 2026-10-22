/**
 * Kotak surat: yang sudah sampai, yang masih di perjalanan, dan kapsul waktu
 * yang ditujukan kepadaku.
 */
import { COPY, formatClock, formatDayLong, getCity, type LetterWire, MOODS } from '@sehari/core';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { api } from '@/lib/api';
import { memberName, type OpenDrop, qk, useCircles, useInbox, useMe, useOpenDrops } from '@/lib/data';
import { navigate } from '@/lib/router';
import { Doodle, Empty, ErrorNote, Growing, Header, MoodDot, Screen, Section, Sticky } from '@/ui/kit';
import { openSong, Photo } from '../story/cards';
import { Envelope } from '../story/Envelope';
import { formatWhen, KIND_DOODLE, KIND_LABEL, milestoneName, stickyColorFor, tiltFor, useAllLetters } from '../story/letters';

type Tab = 'inbox' | 'outbox';

export default function Letters() {
  const me = useMe();
  const qc = useQueryClient();
  const { circles } = useCircles();
  const { inbox, outbox, open } = useAllLetters();
  const capsules = useInbox();
  const capsuleDrops = useOpenDrops(capsules.data?.drops);
  const [tab, setTab] = useState<Tab>('inbox');

  const name = (id: string) => memberName(circles, id, me.user.id);
  const circleName = (id: string | null) => circles.find((x) => x.id === id)?.name ?? 'lingkaran';
  const from = (l: LetterWire) => (l.fromUserId === me.user.id ? 'kamu, dari masa lalu' : name(l.fromUserId));
  const to = (l: LetterWire) => (l.toUserId === me.user.id ? 'dirimu sendiri' : l.toUserId ? name(l.toUserId) : `seluruh ${circleName(l.circleId)}`);

  const openLetter = async (l: LetterWire) => {
    try {
      await api.post(`/letters/${l.id}/open`);
    } catch {
      // Tetap boleh dibaca; tanda terbuka dicoba lagi di halaman surat.
    }
    void qc.invalidateQueries({ queryKey: qk.letters('inbox') });
    navigate(`/surat/${l.id}`);
  };

  const list = tab === 'inbox' ? inbox : outbox;
  const letters = list.data ?? [];
  const unopened = (inbox.data ?? []).filter((l) => !l.openedAt).length;

  return (
    <Screen>
      <Header
        title="kotak surat"
        sub={unopened ? `${unopened} amplop belum dibuka` : undefined}
      />

      <div className="row" style={{ marginTop: 8 }}>
        <button className={`pill${tab === 'inbox' ? ' active' : ''}`} onClick={() => setTab('inbox')} data-testid="tab-inbox">
          {`sampai${inbox.data?.length ? ` · ${inbox.data.length}` : ''}`}
        </button>
        <button className={`pill${tab === 'outbox' ? ' active' : ''}`} onClick={() => setTab('outbox')} data-testid="tab-outbox">
          {`terkirim${outbox.data?.length ? ` · ${outbox.data.length}` : ''}`}
        </button>
      </div>

      <div style={{ height: 16 }} />
      {list.isLoading ? (
        <Growing />
      ) : list.error ? (
        <ErrorNote error={list.error} onRetry={() => void list.refetch()} />
      ) : letters.length === 0 ? (
        tab === 'inbox' ? (
          <Empty doodle="surat-botol" title="Belum ada surat yang sampai." body="Surat Tersesat datang di waktu yang tidak bisa ditebak. Mungkin justru saat paling dibutuhkan." />
        ) : (
          <Empty doodle="amplop" title="Belum ada surat yang kamu kirim." body="Tulis satu untuk seseorang, atau untuk dirimu bertahun-tahun lagi." />
        )
      ) : (
        <div className="col" style={{ gap: 28, padding: '0 4px' }}>
          {letters.map((l, i) => {
            const p = open.get(l.id);
            if (tab === 'inbox' && !l.openedAt) {
              return (
                <div key={l.id} className="rise" style={{ animationDelay: `${i * 0.06}s` }}>
                  <Envelope testID={`envelope-${l.id}`} note={p?.envelopeNote} from={from(l)} doodle={KIND_DOODLE[l.kind]} tilt={tiltFor(l.id) * 0.5} onOpen={() => openLetter(l)} />
                </div>
              );
            }
            const status =
              tab === 'inbox'
                ? `dari ${from(l)}`
                : l.deliveredAt
                  ? `sudah sampai${l.kind === 'lost' ? '' : ` · ${formatWhen(l.deliveredAt, me.user.tz)}`}`
                  : l.kind === 'lost'
                    ? 'dalam perjalanan'
                    : l.kind === 'milestone'
                      ? `terbuka di petak ${milestoneName(l.milestoneDays) ?? '…'}${l.deliverOn ? ` · ${formatDayLong(l.deliverOn)}` : ''}`
                      : `terbuka ${l.deliverOn ? formatDayLong(l.deliverOn) : 'nanti'}`;
            return (
              <button key={l.id} className="letter-note rise" style={{ animationDelay: `${i * 0.06}s` }} onClick={() => navigate(`/surat/${l.id}`)} data-testid={`letter-${l.id}`}>
                <Sticky color={stickyColorFor(l.id)} tilt={tiltFor(l.id)}>
                  <div className="row between">
                    <span className="row gap-sm">
                      <Doodle id={KIND_DOODLE[l.kind]} size={20} />
                      <span className="label" style={{ color: 'inherit', opacity: 0.7 }}>
                        {KIND_LABEL[l.kind].toLowerCase()}
                      </span>
                    </span>
                    {tab === 'outbox' && !l.deliveredAt ? <Doodle id={l.kind === 'lost' ? 'surat-botol' : 'ui-gembok'} size={18} style={{ opacity: 0.7 }} /> : null}
                  </div>
                  {p?.envelopeNote ? (
                    <div className="tiny" style={{ opacity: 0.7, marginTop: 6 }}>
                      di amplop: “{p.envelopeNote}”
                    </div>
                  ) : null}
                  <div className="hand letter-clamp" style={{ fontSize: 25, lineHeight: 1.16, color: 'inherit', marginTop: 6 }}>
                    {p ? p.text || 'tanpa kata, hanya isi amplop' : 'Tidak bisa dibuka dengan kunci di perangkat ini.'}
                  </div>
                  <div className="tiny" style={{ opacity: 0.75, marginTop: 8 }}>
                    {tab === 'outbox' ? `untuk ${to(l)} · ` : ''}
                    {status}
                  </div>
                  {tab === 'outbox' && l.kind === 'lost' && !l.deliveredAt ? (
                    <div className="tiny" style={{ opacity: 0.6, marginTop: 2 }}>
                      tak ada yang tahu kapan ia sampai, termasuk kamu.
                    </div>
                  ) : null}
                </Sticky>
              </button>
            );
          })}
        </div>
      )}

      {tab === 'inbox' && (capsules.data?.locked.length || capsuleDrops.length) ? (
        <Section title="kapsul waktu untukku">
          <div className="col">
            {capsules.data?.locked.map((d) => (
              <div key={d.id} className="card flat row" style={{ borderStyle: 'dashed', borderColor: 'var(--ink-soft)', gap: 12 }} data-testid={`capsule-locked-${d.id}`}>
                <Doodle id="ui-gembok" size={28} className="breathe" />
                <div className="grow">
                  <div className="small ink">{COPY.drop.timeCapsuleUntil(d.unlockOn ? formatDayLong(d.unlockOn) : '…')}</div>
                  <div className="tiny soft">dari {name(d.authorId)} · isinya menunggu dengan sabar</div>
                </div>
              </div>
            ))}
            {capsuleDrops.map((d) => (
              <CapsuleDrop key={d.wire.id} drop={d} author={name(d.wire.authorId)} meta={d.wire.unlockOn ? `terbuka ${formatDayLong(d.wire.unlockOn)}` : 'hanya untukmu'} />
            ))}
          </div>
        </Section>
      ) : null}

      <div style={{ height: 40 }} />
      <button className="btn" onClick={() => navigate('/surat/tulis')} data-testid="compose-letter">
        <Doodle id="pena" size={20} color="currentColor" />
        tulis surat
      </button>
    </Screen>
  );
}

/** Kartu ringkas satu Drop kapsul waktu yang sudah terbuka. */
function CapsuleDrop({ drop, author, meta }: { drop: OpenDrop; author: string; meta: string }) {
  const p = drop.payload;
  if (!p) {
    return (
      <div className="card row">
        <Doodle id="ui-gembok" size={22} style={{ opacity: 0.6 }} />
        <span className="small soft">Tidak bisa dibuka dengan kunci di perangkat ini.</span>
      </div>
    );
  }
  const city = getCity(p.cityId);
  const photos = p.media?.filter((m) => m.mime.startsWith('image/')) ?? [];
  return (
    <div className="card col" data-testid={`drop-${drop.wire.id}`}>
      <div className="row between">
        <span className="row gap-sm wrap">
          <Doodle id="jam-pasir" size={20} />
          <span className="small ink">{author}</span>
          <span className="tiny soft">
            {formatDayLong(drop.wire.day, false)} · {formatClock(p.hour, p.minute)}
            {city ? ` · ${city.name}` : ''}
          </span>
        </span>
        {p.mood ? (
          <span className="row gap-sm">
            <MoodDot mood={p.mood} />
            <span className="tiny soft">{MOODS[p.mood]?.label}</span>
          </span>
        ) : null}
      </div>
      {photos.map((m) => (
        <Photo key={m.id} media={m} style={{ borderRadius: 16, maxHeight: 360 }} />
      ))}
      {p.text ? <div className="hand" style={{ fontSize: 26, color: 'var(--text)', whiteSpace: 'pre-wrap' }}>{p.text}</div> : null}
      {p.song ? (
        <button className="row story-plain" style={{ width: '100%' }} onClick={() => openSong(p.song!.url)}>
          <Doodle id="ui-lagu" size={20} />
          <span className="small ink grow story-ellipsis" style={{ textAlign: 'left' }}>
            {p.song.title} — {p.song.artist}
          </span>
        </button>
      ) : null}
      <span className="tiny soft">{meta}</span>
    </div>
  );
}
