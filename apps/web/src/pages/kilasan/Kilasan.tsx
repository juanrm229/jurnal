/**
 * Kilasan: cuplikan siang hari dari semua lingkaranmu. Foto kilat dan tanda
 * "kangen" yang langsung terlihat; cerita lengkapnya tetap menunggu segel.
 */
import { formatClock, MOODS } from '@sehari/core';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useCircles, useMe, useToday } from '@/lib/data';
import { defaultFlashCircles, FLASH_KEY, type Flash, flashTargets, useFlashes, useSendFlash } from '@/lib/flash';
import { useMediaUrl } from '@/lib/media';
import { Link, navigate, usePath } from '@/lib/router';
import { Avatar, Doodle, Empty, Growing, Header, Sheet, useToast } from '@/ui/kit';
import { FaceButton, FaceRow } from './Faces';

function FlashPhoto({ f }: { f: Flash }) {
  const ref = f.payload!.media?.[0];
  const url = useMediaUrl(ref);
  return (
    <div className="kl-photo" style={{ aspectRatio: ref?.width && ref.height ? ref.width / ref.height : 0.75, background: ref?.tint ?? 'var(--pill)' }}>
      {url ? <img src={url} alt="kilasan" draggable={false} /> : <Doodle id="ui-foto" size={36} style={{ opacity: 0.5 }} />}
    </div>
  );
}

/** Kirim "kangen" ke lingkaran pilihan, satu ketukan. */
export function KangenSheet({ open, onClose, preset }: { open: boolean; onClose: () => void; preset?: string[] }) {
  const toast = useToast();
  const { circles } = useCircles();
  const targets = flashTargets(circles);
  const send = useSendFlash();
  const [chosen, setChosen] = useState<string[] | null>(null);
  const [busy, setBusy] = useState(false);
  const picked = chosen ?? preset ?? defaultFlashCircles(circles);
  useEffect(() => {
    if (!open) setChosen(null);
  }, [open]);
  const go = async () => {
    setBusy(true);
    try {
      await send('kangen', picked);
      toast('terkirim: kamu sedang memikirkan mereka');
      onClose();
    } catch (e) {
      toast((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Sheet open={open} onClose={onClose} title="kirim kangen">
      <div className="col" style={{ alignItems: 'center', textAlign: 'center', gap: 12 }}>
        <Doodle id="hati-dua" size={64} className="breathe" />
        <p className="small" style={{ margin: 0, maxWidth: 320 }}>
          Mereka akan tahu kamu sedang memikirkan mereka. Tanpa kata, tanpa perlu dibalas. Paling banyak tiga kali sehari, supaya tetap istimewa.
        </p>
        {targets.length > 1 ? (
          <div className="row wrap" style={{ gap: 6, justifyContent: 'center' }}>
            {targets.map((c) => {
              const on = picked.includes(c.id);
              return (
                <button key={c.id} className={`pill${on ? ' active' : ''}`} onClick={() => setChosen(on ? picked.filter((x) => x !== c.id) : [...picked, c.id])}>
                  {c.name}
                </button>
              );
            })}
          </div>
        ) : null}
        <button className="btn auto" onClick={go} disabled={busy || !picked.length} data-testid="kangen-send">
          {busy ? 'mengirim…' : 'kirim kangen'}
        </button>
      </div>
    </Sheet>
  );
}

function FlashCard({ f, meId, focus }: { f: Flash; meId: string; focus: boolean }) {
  const { circles } = useCircles();
  const qc = useQueryClient();
  const toast = useToast();
  const [kangen, setKangen] = useState(false);
  const author = circles.flatMap((c) => c.members).find((m) => m.userId === f.wire.authorId);
  const circle = circles.find((c) => f.wire.circleIds.includes(c.id));
  const mine = f.wire.authorId === meId;
  const name = mine ? 'kamu' : (author?.penName ?? 'seseorang');
  const hugged = f.wire.reactions.some((r) => r.userId === meId && r.kind === 'hug');
  const hugs = f.wire.reactions.filter((r) => r.kind === 'hug' || r.kind === 'here' || r.kind === 'me_too').length;
  const p = f.payload!;
  const hug = async () => {
    try {
      if (hugged) await api.del(`/drops/${f.wire.id}/reactions/hug`);
      else await api.put(`/drops/${f.wire.id}/reactions/hug`);
      void qc.invalidateQueries({ queryKey: FLASH_KEY });
    } catch (e) {
      toast((e as Error).message);
    }
  };
  return (
    <article id={`k-${f.wire.id}`} className={`kl-card${f.flash === 'kangen' ? ' kangen' : ''}${focus ? ' focus' : ''}`}>
      <header className="kl-head">
        <Avatar doodle={author?.doodle ?? 'tunas'} size={32} />
        <div className="grow">
          <b>{name}</b>
          <div className="tiny soft">
            {formatClock(p.hour, p.minute)}
            {circle ? ` · ${circle.name}` : ''}
            {p.mood ? ` · ${MOODS[p.mood].label}` : ''}
          </div>
        </div>
      </header>
      {f.flash === 'snap' ? (
        <>
          <FlashPhoto f={f} />
          {p.text ? <p className="kl-caption">{p.text}</p> : null}
          <FaceRow faces={f.wire.faces ?? []} />
        </>
      ) : (
        <div className="kl-kangen">
          <Doodle id="hati-dua" size={56} className="breathe" />
          <span className="kl-kangen-text">{mine ? 'kamu mengirim kangen' : `${name} sedang memikirkanmu`}</span>
        </div>
      )}
      <footer className="kl-foot">
        {mine ? (
          <span className="tiny soft">{hugs ? `${hugs} pelukan untukmu` : 'terkirim'}</span>
        ) : (
          <>
            <button className={`pill${hugged ? ' active' : ''}`} onClick={hug} aria-pressed={hugged}>
              <Doodle id="ui-peluk" size={16} color="currentColor" /> {hugged ? 'dipeluk' : 'peluk'}
            </button>
            {f.flash === 'snap' ? <FaceButton dropId={f.wire.id} circleIds={f.wire.circleIds} faces={f.wire.faces ?? []} /> : null}
            <button className="pill" onClick={() => setKangen(true)}>
              <Doodle id="hati-kecil" size={16} color="currentColor" /> balas kangen
            </button>
          </>
        )}
      </footer>
      <KangenSheet open={kangen} onClose={() => setKangen(false)} preset={circle ? [circle.id] : undefined} />
    </article>
  );
}

export default function Kilasan() {
  const me = useMe();
  const today = useToday();
  const { search } = usePath();
  const focus = search.get('id');
  const { flashes, isLoading } = useFlashes();
  const [kangen, setKangen] = useState(false);

  useEffect(() => {
    if (!focus || !flashes.length) return;
    document.getElementById(`k-${focus}`)?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, [focus, flashes.length]);

  const todays = flashes.filter((f) => f.wire.day === today);
  const older = flashes.filter((f) => f.wire.day !== today);

  return (
    <main className="screen kl">
      <Header title="kilasan" sub="cuplikan siang hari" backTo="/hari" />
      <div className="kl-actions">
        <button className="kl-big" onClick={() => navigate('/kilasan/jepret')} data-testid="flash-open-camera">
          <Doodle id="kamera" size={34} color="#fff" />
          <span>jepret</span>
        </button>
        <button className="kl-big soft" onClick={() => setKangen(true)} data-testid="flash-kangen">
          <Doodle id="hati-dua" size={34} color="#9b2f52" />
          <span>kangen</span>
        </button>
      </div>
      <p className="tiny soft center" style={{ margin: '4px 0 14px' }}>
        Kilasan langsung terlihat lingkaranmu. Cerita lengkapnya tetap menunggu kalian menyegel halaman.
      </p>
      {isLoading ? (
        <Growing label="mengintip…" />
      ) : !flashes.length ? (
        <Empty doodle="kamera" title="Belum ada kilasan" body="Jepret satu hal kecil yang sedang terjadi. Tidak perlu bagus." action={<Link className="btn auto" to="/kilasan/jepret">jepret sekarang</Link>} />
      ) : (
        <>
          {todays.length ? <div className="label">hari ini</div> : null}
          <div className="kl-feed">
            {todays.map((f) => (
              <FlashCard key={f.wire.id} f={f} meId={me.user.id} focus={f.wire.id === focus} />
            ))}
          </div>
          {older.length ? <div className="label mt">kemarin</div> : null}
          <div className="kl-feed">
            {older.map((f) => (
              <FlashCard key={f.wire.id} f={f} meId={me.user.id} focus={f.wire.id === focus} />
            ))}
          </div>
        </>
      )}
      <KangenSheet open={kangen} onClose={() => setKangen(false)} />
    </main>
  );
}
