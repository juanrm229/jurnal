/**
 * Meja tulis kota: semua penulisan dimulai dari peta. Halaman ini mengumpulkan
 * rumah-rumahmu (patok), tokoh-tokohmu, dan jatah musim (3 tokoh dalam 3 patok).
 * Naskah lama di luar kota tetap bisa dibuka di bagian arsip.
 */
import type { NaskahMeta } from '@sehari/core';
import { kotaPlot } from '@sehari/core';
import type { CSSProperties } from 'react';
import { useKota } from '@/lib/kota';
import { useNaskahList } from '@/lib/naskah';
import { navigate } from '@/lib/router';
import { useOpenAny } from '@/lib/stories';
import { Doodle, Growing, Header } from '@/ui/kit';

export default function Meja() {
  const kota = useKota();
  const list = useNaskahList();
  const open = useOpenAny();
  if (!kota.data) return <Growing label="merapikan meja…" />;
  const me = kota.data.me;
  const rumah = kota.data.claims.filter((c) => c.mine && c.state === 'aktif').sort((a, b) => a.from - b.from);
  const arsip = (list.data ?? []).filter((ms) => ms.visibility !== 'kota');
  const nama = (id: string) => kota.data!.claims.find((c) => c.id === id)?.household ?? 'rumah';

  return (
    <main className="screen meja-kota">
      <Header title="meja tulis" sub="semua kisah berawal dari sebuah alamat" backTo="/kota" />

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
                    {c.from}–{c.to} · {c.scenes} adegan terbit
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
              return (
                <button key={ms.id} className="card mj-arsip" onClick={() => navigate(`/naskah/${ms.id}`)} data-testid="naskah-item">
                  <span className="grow">
                    <b>{meta?.title ?? 'naskah'}</b>
                    <span className="tiny soft">
                      {ms.visibility === 'arsip' ? 'bekas rumah di kota' : 'naskah lama'} · {ms.scenes.filter((x) => x.status === 'terbit').length} adegan
                    </span>
                  </span>
                  <Doodle id="ui-panah-kanan" size={16} />
                </button>
              );
            })}
          </div>
        </section>
      ) : null}
    </main>
  );
}
