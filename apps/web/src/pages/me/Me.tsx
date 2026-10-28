import { getCity, zoneLabel } from '@sehari/core';
import { useEffect, useState } from 'react';
import { useMe } from '@/lib/data';
import { navigate } from '@/lib/router';
import { useSession } from '@/lib/session';
import { currentTheme, INKS, PAPERS } from '@/lib/theme';
import { Avatar, Doodle, ListLink, Toggle, useToast } from '@/ui/kit';
import { sound, useSoundPrefs } from '@/lib/sound';
import { pushState, subscribePush } from '@/lib/push';
import { useInstall } from '@/lib/install';

export default function Me() {
  const me = useMe();
  const { signOut } = useSession();
  const toast = useToast();
  const install = useInstall();
  const city = getCity(me.user.cityId);
  const t = currentTheme();
  const [push, setPush] = useState<'on' | 'off' | 'unsupported' | 'denied'>('off');
  useEffect(() => void pushState().then(setPush), []);

  return (
    <main className="screen">
      <h1 className="display ink mt" style={{ margin: '12px 0 12px' }}>aku</h1>
      <button className="card row" style={{ width: '100%', textAlign: 'left', gap: 14 }} onClick={() => navigate('/aku/profil')}>
        <Avatar doodle={me.user.doodle} size={58} sealed />
        <span className="grow">
          <span className="title ink" style={{ display: 'block' }}>{me.user.penName}</span>
          <span className="tiny soft">{city ? `${city.name} · ` : ''}{zoneLabel(me.user.tz)}</span>
        </span>
        <Doodle id="ui-panah-kanan" size={16} />
      </button>

      <button className="card row mt" style={{ width: '100%', textAlign: 'left', gap: 14 }} onClick={() => navigate('/aku/tema')}>
        <span className="row" style={{ gap: 4 }}>
          <span style={{ width: 26, height: 26, borderRadius: '50%', background: t.ink, border: '2px solid var(--card)' }} />
          <span style={{ width: 26, height: 26, borderRadius: '50%', background: PAPERS.find((p) => p.id === t.paper)?.color, border: '1.5px solid var(--ink-soft)', marginLeft: -10 }} />
        </span>
        <span className="grow">
          <span className="ink" style={{ display: 'block' }}>tema tinta & kertas</span>
          <span className="tiny soft">{INKS.find((i) => i.id === t.ink)?.name ?? 'tinta'} di {PAPERS.find((p) => p.id === t.paper)?.name}</span>
        </span>
        <Doodle id="ui-palet" size={26} />
      </button>

      <SoundSettings />

      <section className="section">
        <span className="label">pengaturan</span>
        <ListLink icon="ui-jam" title="pengingat menyegel" sub={me.user.settings.sunsetSeal ? 'saat senja di kotamu' : `pukul ${me.user.settings.sealHour}.00`} onClick={() => navigate('/aku/pengaturan')} />
        <ListLink
          icon="bunga-lonceng"
          title="notifikasi di perangkat ini"
          sub={push === 'on' ? 'aktif' : push === 'denied' ? 'diblokir di pengaturan peramban' : push === 'unsupported' ? 'tidak didukung peramban ini (di iPhone: pasang ke layar utama dulu)' : 'mati — ketuk untuk menyalakan'}
          onClick={async () => {
            if (push === 'on' || push === 'unsupported') return;
            try {
              await subscribePush();
              setPush('on');
              toast('Notifikasi menyala.');
            } catch (e) {
              toast((e as Error).message);
              setPush(await pushState());
            }
          }}
          right={<span className={`pill ${push === 'on' ? 'active' : ''}`}>{push === 'on' ? 'nyala' : 'mati'}</span>}
        />
        <ListLink icon="matahari" title="jejak otomatis" sub="cuaca, kota — semua opsional" onClick={() => navigate('/aku/jejak')} />
        <ListLink icon="ui-gembok" title="keamanan & perangkat" sub="kode pemulihan, tautkan perangkat baru" onClick={() => navigate('/aku/keamanan')} />
        <ListLink icon="kunci" title="privasi & data" sub="E2EE, AI, ekspor, hapus akun" onClick={() => navigate('/aku/privasi')} />
      </section>
      <section className="section">
        <span className="label">lainnya</span>
        {!install.installed && (install.canPrompt || install.ios) ? (
          <ListLink
            icon="hp"
            title="pasang Sehari di layar utama"
            sub={install.canPrompt ? 'jadi aplikasi: layar penuh, bisa luring, ada pintasan' : 'Safari → tombol Bagikan → Tambah ke Layar Utama'}
            onClick={() => (install.canPrompt ? void install.prompt() : toast('Di Safari: ketuk tombol Bagikan, lalu “Tambah ke Layar Utama”.'))}
          />
        ) : null}
        <ListLink icon="ui-ide" title="panduan & video tutorial" sub="semua fitur, dijelaskan langkah demi langkah" onClick={() => navigate('/panduan')} />
        <ListLink icon="gelembung-kata" title="tentang kita" sub="kartu ngobrol: pasangan, pdkt, sahabat, renungan" onClick={() => navigate('/tentang-kita')} />
        <ListLink icon="amplop" title="kartu ucapan" sub="tulis pesan, taruh foto, kirim ke WhatsApp" onClick={() => navigate('/kartu')} />
        <ListLink icon="kartu" title="dek kartu tematik" sub="Rindu, Perantau, Ramadan, …" onClick={() => navigate('/aku/dek')} />
        <ListLink icon="lilin" title="bantuan & dukungan" sub="kalau hari terasa terlalu berat" onClick={() => navigate('/bantuan')} />
        <ListLink icon="ui-bendera-lapor" title="diblokir" onClick={() => navigate('/aku/blokir')} />
        <ListLink icon="tunas" title="tentang sehari" sub="halaman depan" onClick={() => navigate('/')} />
      </section>
      <button
        className="btn ghost mt-lg"
        onClick={async () => {
          await signOut();
          navigate('/', { replace: true });
        }}>
        keluar
      </button>
      <p className="tiny soft center mt">sehari · semua fitur gratis untuk kita</p>
    </main>
  );
}

function SoundSettings() {
  const p = useSoundPrefs();
  return (
    <section className="section">
      <span className="label">suara</span>
      <div className="card" style={{ padding: '6px 16px' }}>
        <Toggle label="musik latar" hint="piano & pad pelan yang dibangkitkan di perangkatmu — tidak ada yang diunduh" value={p.music} onChange={(v) => sound.set({ music: v })} />
        <Toggle label="efek suara" hint="ketukan, desir kertas, cap lilin — tipis sekali" value={p.sfx} onChange={(v) => { sound.set({ sfx: v }); if (v) sound.play('chime'); }} />
        <Toggle label="suara mengetik" hint="detak halus seperti mesin tik saat menulis" value={p.typing} onChange={(v) => sound.set({ typing: v })} />
        <label className="row" style={{ padding: '10px 0', gap: 12 }}>
          <span className="small" style={{ minWidth: 64 }}>volume</span>
          <input type="range" min={0} max={1} step={0.05} value={p.volume} onChange={(e) => sound.set({ volume: Number(e.target.value) })} onPointerUp={() => sound.play('soft')} style={{ flex: 1, accentColor: 'var(--ink)' }} aria-label="volume" />
        </label>
      </div>
    </section>
  );
}
