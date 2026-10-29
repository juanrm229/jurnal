/**
 * Papan Inspirasi: moodboard lingkaran. Foto tampil seperti guntingan yang
 * melayang di atas kertas bertitik, tautan jadi kartu kecil, catatan jadi
 * sticky note. Rak "incaran" untuk barang yang ingin dibeli (dengan harga),
 * rak "ide" untuk apa saja yang menginspirasi.
 */
import { type CSSProperties, useEffect, useMemo, useRef, useState } from 'react';
import { addPin, deletePin, hostOf, type OpenPin, type PinPayload, type PinType, setPinDone, tiltFor, useBoard, useRefreshBoard } from '@/lib/board';
import { memberName, useCircle, useCircles, useMe } from '@/lib/data';
import { primeMedia, uploadPhoto, useMediaUrl } from '@/lib/media';
import { navigate, useParams, usePath } from '@/lib/router';
import { useSession } from '@/lib/session';
import { sound } from '@/lib/sound';
import { Avatar, Doodle, Empty, Growing, Header, Sheet, useToast } from '@/ui/kit';

type Filter = 'semua' | 'incaran' | 'ide' | 'sudah';
const COLORS = ['yellow', 'peach', 'green', 'blue'] as const;
const blank = (shelf: PinPayload['shelf'] = 'incaran'): PinPayload => ({ v: 1, type: 'photo', shelf, color: 'yellow' });

export default function Inspirasi() {
  const { id = '' } = useParams<{ id: string }>();
  const { search } = usePath();
  const circle = useCircle(id);
  const { circles } = useCircles();
  const me = useMe();
  const { identity } = useSession();
  const toast = useToast();
  const { pins, isLoading } = useBoard(id);
  const refresh = useRefreshBoard(id);
  const [filter, setFilter] = useState<Filter>('semua');
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState<PinPayload>(blank());
  const [photo, setPhoto] = useState<{ file: File; url: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState<OpenPin | null>(null);
  const fileIn = useRef<HTMLInputElement>(null);
  const kolom = useKolom();

  // Dibagikan dari aplikasi lain (share target PWA): buka lembar tempel berisi tautannya.
  useEffect(() => {
    const url = search.get('url') || /https?:\/\/\S+/.exec(search.get('text') ?? '')?.[0];
    if (!url) return;
    setDraft({ ...blank(), type: 'link', url, title: search.get('title') ?? undefined });
    setAdding(true);
    navigate(`/l/${id}/inspirasi`, { replace: true });
  }, []);

  const shown = useMemo(
    () => pins.filter((p) => (filter === 'sudah' ? p.wire.doneAt : filter === 'semua' ? true : !p.wire.doneAt && p.data?.shelf === filter)),
    [pins, filter],
  );

  if (!circle) return <Growing />;
  const meCtx = identity ? { id: me.user.id, publicKey: identity.publicKey } : null;
  const name = (uid: string) => (uid === me.user.id ? 'kamu' : memberName(circles, uid, me.user.id));
  const count = (f: Filter) => pins.filter((p) => (f === 'sudah' ? p.wire.doneAt : f === 'semua' ? true : !p.wire.doneAt && p.data?.shelf === f)).length;

  const start = (type: PinType) => {
    setDraft({ ...blank(filter === 'ide' ? 'ide' : 'incaran'), type });
    setPhoto(null);
    setAdding(true);
    if (type === 'photo') requestAnimationFrame(() => fileIn.current?.click());
  };

  const save = async () => {
    if (!meCtx) return;
    setBusy(true);
    try {
      const data: PinPayload = {
        ...draft,
        title: draft.title?.trim() || undefined,
        note: draft.note?.trim() || undefined,
        url: draft.url?.trim() || undefined,
        price: draft.shelf === 'incaran' ? draft.price?.trim() || undefined : undefined,
      };
      if (data.type === 'photo' && photo) {
        data.media = await uploadPhoto(photo.file);
        primeMedia(data.media.id, photo.url);
      }
      await addPin(circle, data, meCtx);
      await refresh();
      sound.play('pop');
      setAdding(false);
    } catch (e) {
      toast((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const ready = draft.type === 'photo' ? !!photo : draft.type === 'link' ? !!draft.url?.trim() : !!(draft.note?.trim() || draft.title?.trim());

  return (
    <main className="screen rupa-board">
      <Header title="papan inspirasi" sub={circle.name} backTo={`/l/${id}`} />

      <section className="rb-hero">
        <h1 className="rupa-hand">yang bikin kita “wah”</h1>
        <p className="small ink-soft" style={{ margin: 0 }}>
          Tempel foto, tautan, dan catatan: barang incaran, tempat yang ingin dikunjungi, warna yang kalian suka. Semuanya terenkripsi.
        </p>
      </section>

      <div className="chip-row">
        {(['semua', 'incaran', 'ide', 'sudah'] as const).map((f) => (
          <button key={f} className={`pill sm ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
            {f} · {count(f)}
          </button>
        ))}
      </div>

      {isLoading ? (
        <Growing />
      ) : shown.length === 0 ? (
        <Empty
          doodle="kilau"
          title={filter === 'sudah' ? 'Belum ada yang dicentang.' : 'Papannya masih kosong.'}
          body={filter === 'sudah' ? 'Tandai “sudah” kalau incarannya terbeli atau idenya sudah dicoba.' : 'Mulai dari satu foto barang yang kamu incar, atau bagikan tautan dari aplikasi lain langsung ke Sehari.'}
          action={
            <button className="btn soft auto" onClick={() => start('photo')}>
              tempel foto pertama
            </button>
          }
        />
      ) : (
        // Kolom flex, bukan CSS `columns`: di Safari iOS multi-kolom + rotasi + animasi memotong kartu di kolom kedua.
        <div className="rb-masonry">
          {Array.from({ length: kolom }, (_, k) => (
            <div key={k} className="rb-kolom">
              {shown.map((p, i) => (i % kolom === k ? <PinCard key={p.wire.id} pin={p} i={i} onOpen={() => setOpen(p)} /> : null))}
            </div>
          ))}
        </div>
      )}

      <div className="rb-dock" role="toolbar" aria-label="tempel">
        <span className="rb-faces" aria-hidden>
          {circle.members.slice(0, 4).map((m) => (
            <Avatar key={m.userId} doodle={m.doodle} size={30} />
          ))}
        </span>
        <button className="rb-dock-btn" onClick={() => start('link')} aria-label="tempel tautan">
          <Doodle id="klip-kertas" size={20} color="currentColor" />
        </button>
        <button className="rb-dock-btn" onClick={() => start('note')} aria-label="tempel catatan">
          <Doodle id="pena" size={20} color="currentColor" />
        </button>
        <button className="rb-fab" onClick={() => start('photo')} aria-label="tempel foto" data-testid="pin-add">
          <Doodle id="ui-tambah" size={26} color="currentColor" />
        </button>
      </div>

      <input
        ref={fileIn}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = '';
          if (f) setPhoto({ file: f, url: URL.createObjectURL(f) });
        }}
      />

      <Sheet open={adding} onClose={() => setAdding(false)} title="tempel di papan">
        <div className="col" style={{ gap: 12 }}>
          <div className="seg">
            {(['photo', 'link', 'note'] as const).map((t) => (
              <button key={t} className={draft.type === t ? 'on' : ''} onClick={() => setDraft({ ...draft, type: t })}>
                {t === 'photo' ? 'foto' : t === 'link' ? 'tautan' : 'catatan'}
              </button>
            ))}
          </div>
          {draft.type === 'photo' ? (
            <button className="rb-drop" onClick={() => fileIn.current?.click()}>
              {photo ? <img className="rupa-cut" src={photo.url} alt="" /> : <span className="small ink-soft"><Doodle id="ui-foto" size={28} /> pilih foto</span>}
            </button>
          ) : null}
          {draft.type === 'link' ? <input className="field" inputMode="url" placeholder="https://…" value={draft.url ?? ''} onChange={(e) => setDraft({ ...draft, url: e.target.value })} /> : null}
          <input className="field" maxLength={80} placeholder={draft.type === 'note' ? 'judul (opsional)' : 'namanya, mis. “tas kanvas krem”'} value={draft.title ?? ''} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
          {draft.type === 'note' ? (
            <>
              <textarea className="field write-like" rows={3} maxLength={300} placeholder="tulis apa saja…" value={draft.note ?? ''} onChange={(e) => setDraft({ ...draft, note: e.target.value })} />
              <div className="row" style={{ gap: 8 }}>
                {COLORS.map((c) => (
                  <button key={c} className={`rb-swatch ${draft.color === c ? 'on' : ''}`} style={{ background: `var(--sticky-${c})` }} onClick={() => setDraft({ ...draft, color: c })} aria-label={c} />
                ))}
              </div>
            </>
          ) : (
            <input className="field" maxLength={200} placeholder="catatan kecil (opsional)" value={draft.note ?? ''} onChange={(e) => setDraft({ ...draft, note: e.target.value })} />
          )}
          <span className="label">masuk rak</span>
          <div className="seg">
            <button className={draft.shelf === 'incaran' ? 'on' : ''} onClick={() => setDraft({ ...draft, shelf: 'incaran' })}>
              incaran
            </button>
            <button className={draft.shelf === 'ide' ? 'on' : ''} onClick={() => setDraft({ ...draft, shelf: 'ide' })}>
              ide
            </button>
          </div>
          {draft.shelf === 'incaran' ? <input className="field" maxLength={30} placeholder="harga (opsional), mis. Rp120.000" value={draft.price ?? ''} onChange={(e) => setDraft({ ...draft, price: e.target.value })} /> : null}
          {draft.type === 'photo' ? <input className="field" inputMode="url" placeholder="tautan toko (opsional)" value={draft.url ?? ''} onChange={(e) => setDraft({ ...draft, url: e.target.value })} /> : null}
          <button className="btn" disabled={!ready || busy} onClick={() => void save()} data-testid="pin-save">
            {busy ? 'menempel…' : 'tempel'}
          </button>
        </div>
      </Sheet>

      <Sheet open={!!open} onClose={() => setOpen(null)} title={open?.data?.shelf === 'incaran' ? 'incaran' : 'inspirasi'}>
        {open ? (
          <div className="col" style={{ gap: 12 }}>
            {open.data?.media ? <PinPhoto pin={open} big /> : null}
            {open.data?.title ? <p className="rupa-hand" style={{ fontSize: 34, margin: 0 }}>{open.data.title}</p> : null}
            {open.data?.note ? <p className="serif-italic small" style={{ margin: 0 }}>{open.data.note}</p> : null}
            {open.data?.price ? <span className="rupa-tag auto">{open.data.price}</span> : null}
            <span className="tiny ink-soft">ditempel {name(open.wire.authorId)}</span>
            {open.data?.url ? (
              <a className="btn soft" href={open.data.url} target="_blank" rel="noreferrer">
                buka {hostOf(open.data.url)}
              </a>
            ) : null}
            <button
              className="btn"
              onClick={async () => {
                await setPinDone(open.wire.id, !open.wire.doneAt);
                await refresh();
                sound.play(open.wire.doneAt ? 'tap' : 'pop');
                setOpen(null);
              }}>
              {open.wire.doneAt ? 'batalkan tanda sudah' : open.data?.shelf === 'incaran' ? 'sudah dibeli' : 'sudah dicoba'}
            </button>
            {open.wire.authorId === me.user.id ? (
              <button
                className="btn ghost"
                onClick={async () => {
                  await deletePin(open.wire.id);
                  await refresh();
                  setOpen(null);
                }}>
                lepas dari papan
              </button>
            ) : null}
          </div>
        ) : null}
      </Sheet>
    </main>
  );
}

function PinPhoto({ pin, big }: { pin: OpenPin; big?: boolean }) {
  const m = pin.data?.media;
  const url = useMediaUrl(m);
  const ar = m?.width && m?.height ? `${m.width} / ${m.height}` : '4 / 5';
  return url ? (
    <img className={`rupa-cut ${big ? 'big' : ''}`} src={url} alt={pin.data?.title ?? ''} style={{ aspectRatio: ar }} draggable={false} />
  ) : (
    <span className="rupa-cut ph" style={{ aspectRatio: ar, background: m?.tint ?? 'var(--ink-faint)' }} />
  );
}

function PinCard({ pin, i, onOpen }: { pin: OpenPin; i: number; onOpen: () => void }) {
  const d = pin.data;
  const style = { '--tilt': `${tiltFor(pin.wire.id)}deg`, animationDelay: `${Math.min(i, 12) * 0.04}s` } as CSSProperties;
  const done = !!pin.wire.doneAt;
  if (!d) return null;
  return (
    <button className={`rb-pin rise ${done ? 'done' : ''} t-${d.type}`} style={style} onClick={onOpen}>
      {d.type === 'photo' ? (
        <span className="rb-photo">
          <PinPhoto pin={pin} />
          {d.title ? <span className="rupa-chip">{d.title}</span> : null}
          {d.price ? <span className="rupa-tag">{d.price}</span> : null}
        </span>
      ) : d.type === 'link' ? (
        <span className="rb-link">
          <span className="row" style={{ gap: 8 }}>
            <span className="rb-link-ico">
              <Doodle id="klip-kertas" size={16} color="currentColor" />
            </span>
            <span className="tiny ink-soft rb-host">{hostOf(d.url ?? '')}</span>
          </span>
          <span className="small ink">{d.title || d.url}</span>
          {d.price ? <span className="rupa-tag">{d.price}</span> : null}
        </span>
      ) : (
        <span className="rb-note" style={{ background: `var(--sticky-${d.color ?? 'yellow'})` }}>
          {d.title ? <b className="small">{d.title}</b> : null}
          <span className="rupa-hand" style={{ fontSize: 24 }}>{d.note}</span>
        </span>
      )}
      {done ? <span className="rb-stamp">sudah ✓</span> : null}
    </button>
  );
}

/** Dua kolom di HP, tiga di layar lebar. */
function useKolom() {
  const q = '(min-width: 720px)';
  const [lebar, setLebar] = useState(() => typeof matchMedia !== 'undefined' && matchMedia(q).matches);
  useEffect(() => {
    const m = matchMedia(q);
    const on = () => setLebar(m.matches);
    m.addEventListener('change', on);
    return () => m.removeEventListener('change', on);
  }, []);
  return lebar ? 3 : 2;
}
