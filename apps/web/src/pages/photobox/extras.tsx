/**
 * Tambahan photobox: penyunting aksesori (geser stiker emoji di layar kamera)
 * dan pemilih foto lama untuk mode "dulu & sekarang".
 */
import { useEffect, useRef, useState } from 'react';
import { PROP_SET, type Prop } from '@/lib/photobox/props';
import { sound } from '@/lib/sound';
import { Doodle } from '@/ui/kit';

export interface OldPhoto {
  url: string;
  img: ImageBitmap;
  year: number | null;
}

let sel: string | null = null;
const listeners = new Set<() => void>();
const setSel = (id: string | null) => {
  sel = id;
  listeners.forEach((f) => f());
};
function useSel() {
  const [, set] = useState(0);
  useEffect(() => {
    const f = () => set((n) => n + 1);
    listeners.add(f);
    return () => void listeners.delete(f);
  }, []);
  return sel;
}

export function PropsEditor({ props, onChange }: { props: Prop[]; onChange: (p: Prop[]) => void }) {
  const box = useRef<HTMLDivElement>(null);
  const drag = useRef<{ id: string; dx: number; dy: number } | null>(null);
  const selected = useSel();
  const move = (e: React.PointerEvent) => {
    const d = drag.current;
    const r = box.current?.getBoundingClientRect();
    if (!d || !r) return;
    const x = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width - d.dx));
    const y = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height - d.dy));
    onChange(props.map((p) => (p.id === d.id ? { ...p, x, y } : p)));
  };
  return (
    <div ref={box} className="pb-props" onPointerMove={move} onPointerUp={() => (drag.current = null)} onPointerDown={(e) => e.target === box.current && setSel(null)}>
      {props.map((p) => (
        <span
          key={p.id}
          className={`pb-prop ${selected === p.id ? 'on' : ''}`}
          style={{ left: `${p.x * 100}%`, top: `${p.y * 100}%`, fontSize: `${p.s * 100}cqw`, rotate: `${p.rot}deg` }}
          onPointerDown={(e) => {
            const r = box.current!.getBoundingClientRect();
            drag.current = { id: p.id, dx: (e.clientX - r.left) / r.width - p.x, dy: (e.clientY - r.top) / r.height - p.y };
            (e.currentTarget.parentElement as HTMLElement).setPointerCapture(e.pointerId);
            setSel(p.id);
          }}>
          {p.e}
        </span>
      ))}
    </div>
  );
}

PropsEditor.Tray = function Tray({ props, onChange }: { props: Prop[]; onChange: (p: Prop[]) => void }) {
  const selected = useSel();
  const cur = props.find((p) => p.id === selected);
  const upd = (f: (p: Prop) => Prop) => cur && onChange(props.map((p) => (p.id === cur.id ? f(p) : p)));
  return (
    <section className="section pb-tray">
      <span className="label">aksesori · ketuk untuk menaruh, geser di kamera</span>
      <div className="chip-row">
        {PROP_SET.map((e) => (
          <button
            key={e}
            className="pb-tray-e"
            onClick={() => {
              if (props.length >= 6) return;
              const id = `p${Date.now().toString(36)}`;
              onChange([...props, { id, e, x: 0.5, y: 0.36, s: 0.22, rot: 0 }]);
              setSel(id);
              sound.play('pop');
            }}>
            {e}
          </button>
        ))}
      </div>
      {cur ? (
        <div className="row pb-tray-tools">
          <span className="pb-tray-cur">{cur.e}</span>
          <button className="pill sm" onClick={() => upd((p) => ({ ...p, s: Math.max(0.08, p.s - 0.04) }))}>
            kecil
          </button>
          <button className="pill sm" onClick={() => upd((p) => ({ ...p, s: Math.min(0.6, p.s + 0.04) }))}>
            besar
          </button>
          <button className="pill sm" onClick={() => upd((p) => ({ ...p, rot: p.rot + 15 }))}>
            putar
          </button>
          <button
            className="pill sm"
            onClick={() => {
              onChange(props.filter((p) => p.id !== cur.id));
              setSel(null);
            }}>
            <Doodle id="ui-hapus" size={14} color="currentColor" /> lepas
          </button>
        </div>
      ) : props.length ? (
        <p className="tiny soft" style={{ margin: '6px 0 0' }}>Ketuk aksesori di kamera untuk mengubah ukuran atau melepasnya.</p>
      ) : null}
    </section>
  );
};

export function GhostPicker({ olds, onChange }: { olds: OldPhoto[]; onChange: (o: OldPhoto[]) => void }) {
  const inp = useRef<HTMLInputElement>(null);
  return (
    <div className="pb-ghostpick">
      <p className="small soft" style={{ margin: 0 }}>
        Pilih 2–4 foto lama (misalnya foto kalian tahun lalu). Fotonya muncul transparan di kamera supaya posenya bisa ditiru persis, lalu strip menyandingkan <b>dulu</b> dan <b>sekarang</b>.
      </p>
      <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
        {olds.map((o, i) => (
          <img key={i} src={o.url} alt="" className="pb-ghost-thumb" />
        ))}
        <button className="pb-ghost-add" onClick={() => inp.current?.click()}>
          <Doodle id="ui-foto" size={22} />
          <span className="tiny">{olds.length ? 'ganti' : 'pilih foto'}</span>
        </button>
      </div>
      <input
        ref={inp}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={async (e) => {
          const files = [...(e.target.files ?? [])].slice(0, 4);
          e.target.value = '';
          if (!files.length) return;
          olds.forEach((o) => URL.revokeObjectURL(o.url));
          const next = await Promise.all(
            files.map(async (f) => ({ url: URL.createObjectURL(f), img: await createImageBitmap(f, { imageOrientation: 'from-image' } as ImageBitmapOptions), year: f.lastModified ? new Date(f.lastModified).getFullYear() : null })),
          );
          onChange(next);
        }}
      />
    </div>
  );
}
