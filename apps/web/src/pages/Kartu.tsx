/** Kartu ucapan: tulis, pilih desain, taruh foto, lalu kirim ke WhatsApp atau unduh. */
import { useEffect, useMemo, useRef, useState } from 'react';
import { type CardDesign, type CardFormat, DESIGNS, FORMATS, type GreetingCard, loadPhoto, OCCASIONS, renderCard } from '@/lib/greeting';
import { useSession } from '@/lib/session';
import { sound } from '@/lib/sound';
import { store } from '@/lib/storage';
import { INKS } from '@/lib/theme';
import { Doodle, Header, useToast } from '@/ui/kit';

const DOODLE_CHOICES = ['hati-kecil', 'hati-dua', 'bunga-matahari', 'mawar', 'kupu-kupu', 'bulan', 'bintang', 'kilau', 'kue-ulang-tahun', 'kado', 'kembang-api', 'cangkir', 'kucing-tidur', 'surat-botol', 'payung-terbuka', 'pelukan', 'tunas', 'kereta', 'lilin', 'wajah-senyum'];

function download(name: string, blob: Blob) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

export default function Kartu() {
  const { me } = useSession();
  const toast = useToast();
  const canvas = useRef<HTMLCanvasElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [card, setCard] = useState<GreetingCard>(() => store.json<GreetingCard>('kartu.draf') ?? { design: 'surat', format: 'kotak', to: '', message: '', from: me?.user.penName ?? '', ink: INKS[0].id, doodles: ['hati-kecil'], occasion: 'tanpa-alasan' });
  const [photo, setPhoto] = useState<ImageBitmap | null>(null);
  const [busy, setBusy] = useState(false);
  const [lineIdx, setLineIdx] = useState(0);
  const occ = useMemo(() => OCCASIONS.find((o) => o.id === card.occasion), [card.occasion]);

  useEffect(() => {
    const t = window.setTimeout(() => {
      if (canvas.current) void renderCard(canvas.current, card, photo);
      store.set('kartu.draf', JSON.stringify(card));
    }, 120);
    return () => window.clearTimeout(t);
  }, [card, photo]);

  const set = <K extends keyof GreetingCard>(k: K, v: GreetingCard[K]) => setCard((c) => ({ ...c, [k]: v }));
  const blob = async () => {
    await renderCard(canvas.current!, card, photo);
    return new Promise<Blob>((r) => canvas.current!.toBlob((b) => r(b!), 'image/png'));
  };
  const name = `kartu-${(card.to || 'untukmu').toLowerCase().replace(/[^a-z0-9]+/g, '-')}.png`;

  const share = async () => {
    setBusy(true);
    try {
      const file = new File([await blob()], name, { type: 'image/png' });
      const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
      if (nav.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], text: card.to ? `Untuk ${card.to} 💌` : undefined }).catch(() => {});
      } else {
        // Peramban tanpa berbagi berkas: unduh gambarnya, lalu buka WhatsApp.
        download(name, file);
        toast('Gambar kartu sudah diunduh — lampirkan di WhatsApp.');
        window.open(`https://wa.me/?text=${encodeURIComponent(card.to ? `Untuk ${card.to}, ada kartu kecil dariku.` : 'Ada kartu kecil dariku.')}`, '_blank');
      }
      sound.play('chime');
    } finally {
      setBusy(false);
    }
  };

  const pickOccasion = (id: string) => {
    const o = OCCASIONS.find((x) => x.id === id)!;
    setLineIdx(0);
    setCard((c) => ({ ...c, occasion: id, doodles: o.doodles.slice(0, 2), message: c.message && !OCCASIONS.some((x) => x.lines.includes(c.message)) ? c.message : o.lines[0]! }));
  };

  return (
    <main className="screen kartu">
      <Header title="kartu ucapan" sub="tulis, hias, kirim" backTo="/aku" />

      <div className="kartu-stage">
        <canvas ref={canvas} className="kartu-canvas" style={{ aspectRatio: `${FORMATS.find((f) => f.id === card.format)!.w} / ${FORMATS.find((f) => f.id === card.format)!.h}` }} />
      </div>

      <div className="row mt" style={{ gap: 8 }}>
        <button className="btn grow wa" disabled={busy} onClick={() => void share()} data-sound="none">
          <Doodle id="ui-bagikan" size={20} color="currentColor" /> kirim ke WhatsApp
        </button>
        <button className="btn soft grow" disabled={busy} data-sound="chime" onClick={async () => download(name, await blob())}>
          <Doodle id="ui-unduh" size={20} color="currentColor" /> unduh
        </button>
      </div>

      <section className="section">
        <span className="label">desain</span>
        <div className="design-row">
          {DESIGNS.map((d) => (
            <button key={d.id} className={`design-chip ${card.design === d.id ? 'on' : ''}`} onClick={() => set('design', d.id as CardDesign)}>
              <span className="design-swatch" style={{ background: d.swatch }} />
              <span className="tiny">{d.name}</span>
            </button>
          ))}
        </div>
        <div className="seg mt">
          {FORMATS.map((f) => (
            <button key={f.id} className={card.format === f.id ? 'on' : ''} onClick={() => set('format', f.id as CardFormat)}>
              {f.name}
            </button>
          ))}
        </div>
      </section>

      <section className="section">
        <span className="label">untuk momen</span>
        <div className="chip-row">
          {OCCASIONS.map((o) => (
            <button key={o.id} className={`pill sm ${card.occasion === o.id ? 'active' : ''}`} onClick={() => pickOccasion(o.id)}>
              {o.name}
            </button>
          ))}
        </div>
      </section>

      <section className="section col" style={{ gap: 10 }}>
        <input className="field" value={card.to} maxLength={40} placeholder="untuk siapa? (mis. Bima)" onChange={(e) => set('to', e.target.value)} />
        <div style={{ position: 'relative' }}>
          <textarea className="field write-like" rows={5} maxLength={500} value={card.message} placeholder="tulis pesanmu…" onChange={(e) => set('message', e.target.value)} />
          {occ ? (
            <button
              className="pill sm"
              style={{ position: 'absolute', right: 8, bottom: 10 }}
              data-sound="pop"
              onClick={() => {
                const i = (lineIdx + 1) % occ.lines.length;
                setLineIdx(i);
                set('message', occ.lines[i]!);
              }}>
              <Doodle id="ui-ide" size={14} color="currentColor" /> contoh lain
            </button>
          ) : null}
        </div>
        <input className="field hand" style={{ fontSize: 24 }} value={card.from} maxLength={40} placeholder="dari (namamu)" onChange={(e) => set('from', e.target.value)} />
        <div className="row" style={{ gap: 8 }}>
          <button className="btn soft grow" onClick={() => fileRef.current?.click()}>
            <Doodle id="ui-foto" size={18} color="currentColor" /> {photo ? 'ganti foto' : 'taruh foto'}
          </button>
          {photo ? (
            <button className="btn ghost auto" onClick={() => setPhoto(null)}>
              hapus foto
            </button>
          ) : null}
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          hidden
          onChange={async (e) => {
            const f = e.target.files?.[0];
            e.target.value = '';
            if (f) {
              try {
                setPhoto(await loadPhoto(f));
                sound.play('pop');
              } catch {
                toast('Foto ini tidak bisa dibuka.');
              }
            }
          }}
        />
      </section>

      <section className="section">
        <span className="label">warna tinta</span>
        <div className="row wrap" style={{ gap: 10 }}>
          {INKS.map((i) => (
            <button key={i.id} className={`swatch ${card.ink === i.id ? 'on' : ''}`} style={{ background: i.id, width: 36, height: 36 }} aria-label={i.name} onClick={() => set('ink', i.id)} />
          ))}
        </div>
      </section>

      <section className="section">
        <span className="label">doodle (pilih sampai 3)</span>
        <div className="row wrap" style={{ gap: 6 }}>
          {DOODLE_CHOICES.map((d) => {
            const on = card.doodles.includes(d);
            return (
              <button
                key={d}
                className={`doodle-pick ${on ? 'on' : ''}`}
                aria-pressed={on}
                aria-label={d}
                onClick={() => set('doodles', on ? card.doodles.filter((x) => x !== d) : [...card.doodles, d].slice(-3))}>
                <Doodle id={d} size={28} />
              </button>
            );
          })}
        </div>
      </section>
      <p className="tiny soft center mt-lg">Kartu dibuat di perangkatmu — tidak ada yang dikirim ke server.</p>
    </main>
  );
}
