/**
 * Bagian bersama Ruang Main: formulir duduk (nama + wajah), kartu kode meja
 * (QR, undang WA, mode TV), dan kursi pemain. Dipakai semua permainan baru.
 */
import { useRef, useState } from 'react';
import { api } from '@/lib/api';
import { useCircles } from '@/lib/data';
import { compressImage } from '@/lib/media';
import { QR } from '@/ui/art';
import { Doodle, Header, useToast } from '@/ui/kit';
import { PlayerFace } from '../sidik/parts';

export const AVATARS = ['tunas', 'kucing', 'burung', 'ikan', 'kelinci', 'landak', 'bebek', 'katak', 'kupu-kupu', 'lebah', 'siput', 'kepik'];

export function DudukForm({ judul, ajakan, tombol, backTo, defaultName, avatar0, doodle, bisa, onJoin }: { judul: string; ajakan: string; tombol: string; backTo: string; defaultName: string; avatar0?: string; doodle: string; bisa: boolean; onJoin: (p: { name: string; avatar: string }) => void }) {
  const [name, setName] = useState(defaultName);
  const [avatar, setAvatar] = useState(avatar0 ?? AVATARS[Math.floor(Math.random() * AVATARS.length)]!);
  const file = useRef<HTMLInputElement>(null);
  return (
    <main className="screen sd-screen">
      <Header title={judul} backTo={backTo} />
      <section className="sd-join">
        <Doodle id={doodle} size={80} draw />
        <p className="sd-join-title">{ajakan}</p>
        <div className="sd-avatar-pick">
          <button className="sd-selfie" onClick={() => file.current?.click()} aria-label="ambil foto wajah">
            <PlayerFace avatar={avatar} size={84} />
            <span className="tiny sd-ico">
              <Doodle id="ui-foto" size={14} color="currentColor" /> foto wajah
            </span>
          </button>
          <div className="sd-avatars">
            {AVATARS.map((a) => (
              <button key={a} className={avatar === a ? 'on' : ''} onClick={() => setAvatar(a)}>
                <Doodle id={a} size={26} color="currentColor" />
              </button>
            ))}
          </div>
        </div>
        <input
          ref={file}
          type="file"
          accept="image/*"
          capture="user"
          hidden
          onChange={async (e) => {
            const f = e.target.files?.[0];
            e.target.value = '';
            if (!f) return;
            const c = await compressImage(f, 160);
            setAvatar(`data:image/jpeg;base64,${btoa(String.fromCharCode(...c.bytes))}`);
          }}
        />
        <input className="field sd-name" maxLength={24} value={name} placeholder="nama panggilanmu" onChange={(e) => setName(e.target.value)} autoFocus />
        <button className="btn sd-cta" disabled={!name.trim() || !bisa} onClick={() => onJoin({ name: name.trim(), avatar })} data-testid="rm-join">
          {tombol}
        </button>
        <p className="tiny soft center">Tidak perlu akun. Namamu hanya terlihat di meja ini.</p>
      </section>
    </main>
  );
}

const NAMA_GAME: Record<string, string> = { titip: 'Titip Surat', satu: 'Kartu Satu', tangga: 'Ular Tangga', saudagar: 'Saudagar', petasan: 'Kucing Petasan', kembang: 'Kembang Api', sidik: 'SIDIK' };

/** Kabari teman di lingkaran aktif lewat notifikasi: "Rani mengajak main Saudagar!" */
export function KabariLingkaran({ path }: { path: string }) {
  const { circles } = useCircles();
  const toast = useToast();
  const [sudah, setSudah] = useState<string[]>([]);
  const aktif = circles.filter((c) => c.status === 'active' && c.members.filter((m) => m.state === 'active').length > 1);
  if (!aktif.length) return null;
  const game = NAMA_GAME[path.split('/').filter(Boolean).at(-2) ?? ''] ?? 'game';
  return (
    <div className="rm-kabari">
      <span className="tiny soft">kabari lingkaran lewat notifikasi:</span>
      <div className="ts-pilih">
        {aktif.map((c) => (
          <button
            key={c.id}
            className={`pill sm ${sudah.includes(c.id) ? 'active' : ''}`}
            disabled={sudah.includes(c.id)}
            onClick={async () => {
              try {
                const r = await api.post<{ dikabari: number }>(`/circles/${c.id}/ajak-main`, { game, path });
                setSudah((x) => [...x, c.id]);
                toast(r.dikabari ? `${r.dikabari} orang di ${c.name} dikabari.` : 'Belum ada teman lain di lingkaran itu.');
              } catch (e) {
                toast((e as Error).message);
              }
            }}
            data-testid="rm-kabari"
          >
            <Doodle id="bunga-lonceng" size={14} color="currentColor" /> {sudah.includes(c.id) ? `${c.name} ✓` : c.name}
          </button>
        ))}
      </div>
    </div>
  );
}

export function KodeMeja({ code, path, ajak }: { code: string; path: string; ajak: string }) {
  const link = `${location.origin}${path}`;
  return (
    <div className="sd-code-card">
      <span className="tiny">kode meja</span>
      <b className="sd-code">{code}</b>
      <div className="sd-qr">
        <QR value={link} size={150} />
      </div>
      <div className="row" style={{ gap: 8 }}>
        <a className="btn sm soft grow" href={`https://wa.me/?text=${encodeURIComponent(`${ajak} Masuk pakai kode ${code}: ${link}`)}`} target="_blank" rel="noreferrer">
          undang lewat WA
        </a>
        <a className="btn sm soft grow" href={`${path}/tv`} target="_blank" rel="noreferrer">
          <Doodle id="laptop" size={16} color="currentColor" /> mode TV
        </a>
      </div>
      <KabariLingkaran path={path} />
    </div>
  );
}
