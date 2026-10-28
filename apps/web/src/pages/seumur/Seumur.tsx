/**
 * SEUMUR: beranda. Main bersama, Seumur Harian, rekor, almanak, dan garis
 * hidupku. Langit pagi, satu lingkaran napas, dan sedikit kata.
 */
import { seumur } from '@sehari/core';
import { useState } from 'react';
import { almanak, createMeja, garisku, harian, rekor, tanggalWIB } from '@/lib/seumur';
import { navigate } from '@/lib/router';
import { useSession } from '@/lib/session';
import { profile } from '@/lib/sidik';
import { Doodle, Header, Sheet, useToast } from '@/ui/kit';
import { Napas } from './parts';

export default function SeumurBeranda() {
  const toast = useToast();
  const session = useSession();
  const [code, setCode] = useState('');
  const [name, setName] = useState(profile.get()?.name ?? session.me?.user.penName ?? '');
  const [ask, setAsk] = useState(false);
  const [busy, setBusy] = useState(false);
  const [lihat, setLihat] = useState<null | 'almanak' | 'garisku'>(null);
  const r = rekor.get();
  const alm = almanak.get();
  const lived = garisku.get();
  const tgl = tanggalWIB();
  const hariIni = harian.get(tgl);
  const streak = harian.streak(tgl);

  const create = async () => {
    if (!name.trim()) return setAsk(true);
    setBusy(true);
    try {
      const p = { name: name.trim(), avatar: profile.get()?.avatar ?? 'kucing' };
      profile.set(p);
      const v = await createMeja(p);
      navigate(`/seumur/${v.code}`);
    } catch (e) {
      toast((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="screen sm-screen sm-beranda" data-langit="subuh">
      <div className="sm-langit" aria-hidden />
      <Header title="Seumur" sub="satu kehidupan, tanpa kata" backTo="/hari" />
      <section className="sm-hero">
        <Napas serverNow={() => Date.now()} size={200}>
          <span className="sm-hero-judul">seumur.</span>
        </Napas>
        <p className="sm-puisi kecil">Susun satu kehidupan bersama, dari tangis pertama sampai malam yang tenang. Tanpa bicara. Hanya rasa, napas, dan waktu.</p>
      </section>

      <div className="sd-home-actions">
        <button className="btn sd-cta" disabled={busy} onClick={() => void create()} data-testid="sm-create">
          <Doodle id="lilin" size={20} color="currentColor" /> main bersama
        </button>
        <div className="sd-joincode">
          <input className="field" value={code} maxLength={4} placeholder="KODE" onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z]/g, ''))} />
          <button className="btn soft" disabled={code.length !== 4} onClick={() => navigate(`/seumur/${code}`)}>
            duduk
          </button>
        </div>
        <p className="tiny soft center">2–10 orang · 20–40 menit · satu HP per orang</p>
      </div>

      <button className="sm-harian-kartu" onClick={() => navigate('/seumur/harian')} data-testid="sm-harian">
        <span className="sd-tape" />
        <Doodle id="matahari-kecil" size={34} color="currentColor" />
        <span className="grow">
          <b>Seumur Harian</b>
          <span className="tiny" style={{ display: 'block' }}>
            {hariIni ? `Hari ini: ${'★'.repeat(hariIni.bintang)}${'☆'.repeat(3 - hariIni.bintang)} · streak ${streak} hari` : `Delapan momen baru untuk diurutkan sendiri${streak ? ` · streak ${streak} hari` : ''}`}
          </span>
        </span>
        <Doodle id="ui-panah-kanan" size={18} color="currentColor" />
      </button>

      <section className="sm-rekor">
        <button onClick={() => setLihat('almanak')}>
          <b>{Object.keys(alm).length}</b>
          <span className="tiny">dari {seumur.MOMEN.length} momen di almanak</span>
        </button>
        <button onClick={() => setLihat('garisku')}>
          <b>{Object.keys(lived).length}</b>
          <span className="tiny">momen di garis hidupku</span>
        </button>
        <div>
          <b>{r.utuh}</b>
          <span className="tiny">kehidupan utuh dari {r.kehidupan}</span>
        </div>
      </section>

      <section className="section">
        <span className="label">cara bermain</span>
        <ol className="sd-how">
          {(
            [
              ['kartu', 'Momen di tanganmu.', 'Setiap kartu adalah satu momen hidup. Usianya tersembunyi, bahkan darimu.'],
              ['ui-hening', 'Hening.', 'Tidak boleh bicara atau memberi kode. Hanya tatapan dan napas.'],
              ['jam-pasir', 'Letakkan.', 'Saat kamu merasa waktunya tiba, tahan kartumu. Garis hidup bertambah satu momen, satu nada.'],
              ['lilin', 'Lilin.', 'Kalau masih ada momen yang lebih muda di tangan seseorang, satu lilin padam.'],
              ['bulan', 'Empat bab.', 'Pagi, Siang, Sore, Malam. Di antaranya, berhenti sejenak untuk merenung.'],
            ] as const
          ).map(([d, t, x]) => (
            <li key={t}>
              <Doodle id={d} size={32} />
              <span>
                <b>{t}</b> {x}
              </span>
            </li>
          ))}
        </ol>
      </section>

      <Sheet open={ask} onClose={() => setAsk(false)} title="nama panggilanmu">
        <div className="col" style={{ gap: 10 }}>
          <input className="field" maxLength={24} value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          <button className="btn" disabled={!name.trim()} onClick={() => (setAsk(false), void create())}>
            buka meja
          </button>
        </div>
      </Sheet>
      <Sheet open={lihat === 'almanak'} onClose={() => setLihat(null)} title="almanak">
        <div className="sm-almanak">
          {seumur.BAB.map((b) => {
            const ms = seumur.MOMEN.filter((m) => m.usia >= b.dari && m.usia <= b.sampai);
            return (
              <div key={b.id}>
                <span className="sd-label">
                  {b.nama} · {ms.filter((m) => m.id in alm).length}/{ms.length}
                </span>
                {ms.map((m) =>
                  m.id in alm ? (
                    <span key={m.id} className="sm-almanak-baris">
                      <b>{m.usia}</b> {m.teks}
                    </span>
                  ) : (
                    <span key={m.id} className="sm-almanak-baris kosong">
                      <b>··</b> belum ditemukan
                    </span>
                  ),
                )}
              </div>
            );
          })}
        </div>
      </Sheet>
      <Sheet open={lihat === 'garisku'} onClose={() => setLihat(null)} title="garis hidupku">
        <div className="sm-almanak">
          {Object.keys(lived).length ? (
            Object.entries(lived)
              .map(([id, u]) => ({ m: seumur.momenOf(id)!, u }))
              .filter((x) => x.m)
              .sort((a, b) => (a.u ?? a.m.usia) - (b.u ?? b.m.usia))
              .map(({ m, u }) => (
                <span key={m.id} className="sm-almanak-baris">
                  <b>{u ?? '·'}</b> {m.teks} <span className="tiny soft">(kebanyakan orang: {m.usia})</span>
                </span>
              ))
          ) : (
            <p className="small soft">Tandai momen yang sudah kamu alami di Seumur Harian. Pelan-pelan, garis hidupmu terbentuk di sini.</p>
          )}
        </div>
      </Sheet>
    </main>
  );
}
