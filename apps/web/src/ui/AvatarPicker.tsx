/** Pilih wajahmu: doodle + warna latar, atau foto sendiri dari galeri. */
import type { Me } from '@sehari/core';
import { DOODLES } from '@sehari/doodles';
import { useMemo, useRef, useState } from 'react';
import { api } from '@/lib/api';
import { Avatar, AVATAR_BG, Doodle, parseAvatar, useToast } from './kit';

const CATS = [
  { id: 'makhluk', label: 'makhluk' },
  { id: 'bunga', label: 'bunga' },
  { id: 'tanaman', label: 'tanaman' },
  { id: 'buah', label: 'buah' },
  { id: 'makanan', label: 'jajan' },
  { id: 'perasaan', label: 'rasa' },
  { id: 'cuaca', label: 'langit' },
  { id: 'benda', label: 'benda' },
  { id: 'perjalanan', label: 'jalan' },
] as const;

const BG_COLOR: Record<string, string> = {
  kertas: 'var(--card)',
  kuning: 'var(--sticky-yellow)',
  persik: 'var(--sticky-peach)',
  hijau: 'var(--sticky-green)',
  biru: 'var(--sticky-blue)',
  tinta: 'var(--ink)',
};

/** Potong tengah jadi persegi 320px JPEG. */
async function squareJpeg(file: Blob): Promise<Uint8Array> {
  const bmp = await createImageBitmap(file);
  const side = Math.min(bmp.width, bmp.height);
  const c = document.createElement('canvas');
  c.width = c.height = 320;
  c.getContext('2d')!.drawImage(bmp, (bmp.width - side) / 2, (bmp.height - side) / 2, side, side, 0, 0, 320, 320);
  const blob = await new Promise<Blob>((r) => c.toBlob((b) => r(b!), 'image/jpeg', 0.86));
  return new Uint8Array(await blob.arrayBuffer());
}

export function AvatarPicker({ value, onChange, onUploaded }: { value: string; onChange: (v: string) => void; onUploaded?: (me: Me) => void }) {
  const toast = useToast();
  const cur = parseAvatar(value);
  const [cat, setCat] = useState<string>('makhluk');
  const [busy, setBusy] = useState(false);
  const file = useRef<HTMLInputElement>(null);
  const list = useMemo(() => DOODLES.filter((d) => d.category === cat).map((d) => d.id), [cat]);
  const set = (doodle: string, bg = cur.photo ? 'kertas' : cur.bg) => onChange(bg === 'kertas' ? doodle : `${doodle}|${bg}`);

  const upload = async (f: File) => {
    setBusy(true);
    try {
      const me = await api.upload<Me>('/me/avatar', await squareJpeg(f), 'image/jpeg');
      onChange(me.user.doodle);
      onUploaded?.(me);
      toast('Foto profil tersimpan.');
    } catch (e) {
      toast((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="avatar-picker">
      <div className="row" style={{ gap: 16, alignItems: 'center' }}>
        <span className="avatar-preview" key={value}>
          <Avatar doodle={value} size={96} sealed />
        </span>
        <div className="col" style={{ gap: 8, flex: 1 }}>
          <button type="button" className="btn soft sm" disabled={busy} onClick={() => file.current?.click()}>
            <Doodle id="ui-foto" size={18} color="currentColor" /> {busy ? 'mengunggah…' : 'pakai foto dari galeri'}
          </button>
          {cur.photo ? (
            <button type="button" className="btn ghost sm" onClick={() => set('tunas', 'kuning')}>
              kembali ke doodle
            </button>
          ) : (
            <div className="row" style={{ gap: 6 }} role="radiogroup" aria-label="warna latar">
              {AVATAR_BG.map((b) => (
                <button key={b} type="button" role="radio" aria-checked={cur.bg === b} aria-label={b} className={`bg-dot ${cur.bg === b ? 'on' : ''}`} style={{ background: BG_COLOR[b] }} onClick={() => set(cur.doodle, b)} />
              ))}
            </div>
          )}
        </div>
      </div>
      {cur.photo ? <p className="tiny soft">Foto profil tidak dienkripsi seperti isi jurnal; hanya terlihat oleh orang yang melihat profilmu.</p> : null}
      <div className="chip-row mt">
        {CATS.map((c) => (
          <button key={c.id} type="button" className={`pill sm ${cat === c.id ? 'active' : ''}`} onClick={() => setCat(c.id)}>
            {c.label}
          </button>
        ))}
      </div>
      <div className="avatar-grid">
        {list.map((d) => (
          <button key={d} type="button" aria-label={d} aria-pressed={!cur.photo && cur.doodle === d} className={!cur.photo && cur.doodle === d ? 'on' : ''} style={{ background: BG_COLOR[cur.photo ? 'kertas' : cur.bg] }} onClick={() => set(d)}>
            <Doodle id={d} size="70%" color={!cur.photo && cur.bg === 'tinta' ? 'var(--on-ink)' : undefined} />
          </button>
        ))}
      </div>
      <input ref={file} type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) void upload(f); }} />
    </div>
  );
}
