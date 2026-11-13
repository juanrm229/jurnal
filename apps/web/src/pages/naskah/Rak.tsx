/**
 * Meja tulis kota: semua penulisan dimulai dari peta. Halaman ini mengumpulkan
 * rumah-rumahmu (patok), tokoh-tokohmu, dan jatah musim (3 tokoh dalam 3 patok).
 * Naskah lama di luar kota tetap bisa dibuka di bagian arsip.
 */
import type { NaskahMeta } from '@sehari/core';
import { KOTA_MUSIM, KOTA_PENA_RE, kotaPlot } from '@sehari/core';
import { useQueryClient } from '@tanstack/react-query';
import { type CSSProperties, useState } from 'react';
import { api } from '@/lib/api';
import { useMe } from '@/lib/data';
import { useKota, useKotaRefresh } from '@/lib/kota';
import { useNaskahList } from '@/lib/naskah';
import { navigate } from '@/lib/router';
import { useOpenAny } from '@/lib/stories';
import { Doodle, Growing, Header, useToast } from '@/ui/kit';

export default function Meja() {
  const kota = useKota();
  const list = useNaskahList();
  const open = useOpenAny();
  const meId = useMe().user.id;
  if (!kota.data) return <Growing label="merapikan meja…" />;
  const me = kota.data.me;
  const rumah = kota.data.claims.filter((c) => c.mine && c.state === 'aktif').sort((a, b) => a.from - b.from);
  const lowong = kota.data.claims.filter((c) => c.mine && c.state === 'terbengkalai');
  const arsip = (list.data ?? []).filter((ms) => ms.visibility !== 'kota' || lowong.some((c) => c.msId === ms.id));
  const nama = (id: string) => kota.data!.claims.find((c) => c.id === id)?.household ?? 'rumah';

  return (
    <main className="screen meja-kota">
      <Header title="meja tulis" sub="semua kisah berawal dari sebuah alamat" backTo="/kota" />

      {me.penName ? <NamaPena nama={me.penName} lama={me.penaLama ?? []} boleh={me.penaBolehGanti ?? null} /> : null}

      <section className="mj-jatah" aria-label="jatah musim ini">
        <div className="mj-jatah-k">
          <span className="mj-angka">
            {me.patok.pakai}
            <small>/{me.patok.maks}</small>
          </span>
          <span className="tiny">patok</span>
        </div>
        <div className="mj-jatah-k">
          <span className="mj-angka">
            {me.tokoh.pakai}
            <small>/{me.tokoh.maks}</small>
          </span>
          <span className="tiny">tokoh</span>
        </div>
        <p className="small mj-aturan">
          Tiap warga memegang paling banyak {me.tokoh.maks} tokoh dalam {me.patok.maks} patok. Tokohmu boleh pindah ke rumahmu yang lain, dan satu rumah boleh dihuni beberapa tokohmu bila mereka keluarga atau pernah tinggal di sana. Figuran rumah tidak memakai jatah.
        </p>
      </section>

      {rumah.length ? (
        <section className="section">
          <span className="label">rumahmu</span>
          <div className="col" style={{ gap: 10 }}>
            {rumah.map((c, i) => (
              <article key={c.id} className="mj-rumah" style={{ '--n': i } as CSSProperties} data-testid="meja-rumah">
                <button className="mj-rumah-isi" onClick={() => navigate(`/kota/rumah/${c.id}`)}>
                  <span className="kp-musim">
                    {c.kind === 'rumah' ? 'rumah utama' : 'rumah keluarga'} · {kotaPlot(c.plotId)?.address}
                  </span>
                  <b>{c.household}</b>
                  <span className="tiny soft">
                    {c.from}–{c.to} · {c.scenes} adegan terbit{c.musim !== KOTA_MUSIM ? ` · musim ${c.musim}, tidak memakai jatah` : ''}
                  </span>
                </button>
                <button className="btn sm" onClick={() => navigate(`/naskah/${c.msId}`)} data-testid="meja-tulis">
                  <Doodle id="pena" size={16} color="currentColor" /> tulis
                </button>
              </article>
            ))}
          </div>
        </section>
      ) : (
        <section className="mj-kosong">
          <Doodle id="rumah" size={44} />
          <p className="rupa-hand">Menulis di sini dimulai dari peta.</p>
          <p className="small soft">Pilih satu persil di Kota Sangkala, tentukan zamannya, dan beri nama tokoh pertamamu. Rumah itu jadi meja tulismu.</p>
        </section>
      )}

      {lowong.length ? (
        <section className="section">
          <span className="label">kembali lowong</span>
          {lowong.map((c) => (
            <div key={c.id} className="mj-lowong">
              <span className="grow small">
                <b>{c.household}</b> lewat masa fondasi tanpa adegan terbit. Naskahnya tetap di arsip; persilnya bisa kamu patok ulang bila belum diambil warga lain.
              </span>
              <button className="pill sm" onClick={() => navigate(`/kota/patok/${c.plotId}`)}>
                patok ulang
              </button>
            </div>
          ))}
        </section>
      ) : null}

      {me.tokohku.length ? (
        <section className="section">
          <span className="label">tokohmu</span>
          <div className="col" style={{ gap: 8 }}>
            {me.tokohku.map((t) => (
              <div key={t.id} className="mj-tokoh" data-testid="meja-tokoh">
                <span className="mj-tokoh-inisial" aria-hidden>
                  {t.name.slice(0, 1)}
                </span>
                <span className="grow">
                  <b>{t.name}</b>
                  <span className="tiny soft">
                    {t.born ? `${t.born}–${t.died ?? ''} · ` : ''}
                    {t.dipegang ? `figuran yang kamu pegang di ${t.household}` : `tinggal di ${t.rumah.map(nama).join(', ')}`}
                  </span>
                </span>
              </div>
            ))}
            {Array.from({ length: Math.max(0, me.tokoh.maks - me.tokoh.pakai) }, (_, i) => (
              <div key={`kosong${i}`} className="mj-tokoh kosong" aria-hidden>
                <span className="mj-tokoh-inisial" />
                <span className="tiny soft">jatah tokoh yang belum dipakai</span>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <div className="ka-aksi">
        <button className="btn" onClick={() => navigate('/kota')} data-testid="meja-peta">
          <Doodle id="rumah" size={18} color="currentColor" /> {rumah.length ? (me.patok.pakai < me.patok.maks ? 'patok rumah keluarga di peta' : 'buka peta kota') : 'pilih persil di peta'}
        </button>
      </div>

      {arsip.length ? (
        <section className="section">
          <span className="label">arsip</span>
          <p className="tiny soft">Naskah lama dan bekas rumah. Hanya kamu dan rekan penulisnya yang membaca.</p>
          <div className="col" style={{ gap: 8 }}>
            {arsip.map((ms) => {
              const meta = ms.meta && 'plain' in ms.meta ? (ms.meta.plain as NaskahMeta) : open<NaskahMeta>(ms.meta);
              const milikku = ms.ownerId === meId;
              return (
                <div key={ms.id} className="card mj-arsip">
                  <button className="mj-arsip-buka" onClick={() => navigate(`/naskah/${ms.id}`)} data-testid="naskah-item">
                    <span className="grow">
                      <b>{meta?.title ?? 'naskah'}</b>
                      <span className="tiny soft">
                        {ms.visibility === 'arsip' ? 'bekas rumah di kota' : ms.visibility === 'kota' ? 'rumah yang kembali lowong' : 'naskah lama'} · {ms.scenes.filter((x) => x.status === 'terbit').length} adegan
                      </span>
                    </span>
                    <Doodle id="ui-panah-kanan" size={16} />
                  </button>
                  {milikku ? <HapusArsip id={ms.id} judul={meta?.title ?? 'naskah ini'} /> : null}
                </div>
              );
            })}
          </div>
        </section>
      ) : null}
    </main>
  );
}

/** Nama pena kota: bisa diganti sekali per 30 hari; nama lama tetap tercatat. */
function NamaPena({ nama, lama, boleh }: { nama: string; lama: string[]; boleh: string | null }) {
  const toast = useToast();
  const refresh = useKotaRefresh();
  const [ubah, setUbah] = useState(false);
  const [v, setV] = useState(nama);
  const [busy, setBusy] = useState(false);
  const tunggu = boleh && new Date(boleh) > new Date() ? new Date(boleh) : null;
  const ok = KOTA_PENA_RE.test(v.trim().toLowerCase()) && v.trim().toLowerCase() !== nama;
  return (
    <section className="mj-pena" aria-label="nama pena kota">
      <div className="row" style={{ justifyContent: 'space-between', gap: 8 }}>
        <span className="col" style={{ gap: 2, minWidth: 0 }}>
          <span className="tiny soft">menulis sebagai</span>
          <b className="mj-pena-nama">{nama}</b>
          {lama.length ? <span className="tiny soft">dulu: {lama.join(', ')}</span> : null}
        </span>
        {!ubah ? (
          <button className="pill sm" disabled={!!tunggu} onClick={() => setUbah(true)} data-testid="meja-ganti-pena">
            {tunggu ? `bisa diganti ${tunggu.getDate()}/${tunggu.getMonth() + 1}` : 'ganti nama pena'}
          </button>
        ) : null}
      </div>
      {ubah ? (
        <div className="col" style={{ gap: 8, marginTop: 10 }}>
          <input className="field" value={v} maxLength={24} autoCapitalize="off" onChange={(e) => setV(e.target.value.toLowerCase())} placeholder="nama pena baru" data-testid="meja-pena-baru" />
          <span className="tiny soft">Huruf kecil, angka, titik. Nama pena tampil di semua rumahmu; hanya bisa diganti sekali dalam 30 hari, dan nama lamamu tetap tercatat supaya pembaca bisa menelusurimu.</span>
          <div className="row" style={{ gap: 8 }}>
            <button className="btn ghost auto" onClick={() => (setUbah(false), setV(nama))}>
              batal
            </button>
            <button
              className="btn grow"
              disabled={!ok || busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await api.put('/kota/profil', { penName: v.trim().toLowerCase() });
                  toast(`Kini kamu menulis sebagai ${v.trim().toLowerCase()}.`);
                  setUbah(false);
                  void refresh();
                } catch (e) {
                  toast((e as Error).message);
                } finally {
                  setBusy(false);
                }
              }}
              data-testid="meja-pena-simpan">
              {busy ? 'menyimpan…' : 'simpan nama pena'}
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}

/** Hapus arsip untuk selamanya: adegan, kanon, dan versi ikut terhapus. */
function HapusArsip({ id, judul }: { id: string; judul: string }) {
  const toast = useToast();
  const qc = useQueryClient();
  return (
    <button
      className="mj-arsip-hapus"
      aria-label={`hapus ${judul}`}
      onClick={async () => {
        if (!confirm(`Hapus "${judul}" untuk selamanya? Semua adegan, kanon, dan versinya ikut terhapus dan tidak bisa dikembalikan.`)) return;
        try {
          await api.del(`/naskah/${id}`);
          toast('Arsip dihapus.');
          void qc.invalidateQueries({ queryKey: ['naskah'] });
          void qc.invalidateQueries({ queryKey: ['kota'] });
        } catch (e) {
          toast((e as Error).message);
        }
      }}
      data-testid="meja-hapus-arsip">
      hapus
    </button>
  );
}
