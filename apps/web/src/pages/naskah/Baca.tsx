/**
 * Mode baca sebuah karya. Novel, cerpen, dan kisah dibaca seperti buku; jurnal
 * tokoh seperti buku harian; surat seperti bundel surat. Pembaca hanya melihat
 * yang sudah terbit; penulis juga melihat drafnya sendiri.
 */
import { NASKAH_BENTUK, naskahKilas } from '@sehari/core';
import { type CSSProperties, useEffect, useState } from 'react';
import { useRumahNaskah } from '@/lib/kota';
import { type NaskahModel, type Scene, tglPanjang, useNaskah, useNaskahModel } from '@/lib/naskah';
import { navigate, useParams } from '@/lib/router';
import { store } from '@/lib/storage';
import { Doodle, Growing } from '@/ui/kit';
import { LEPAS } from './Karya';

export default function Baca() {
  const { id, wid } = useParams<{ id: string; wid: string }>();
  const q = useNaskah(id);
  const m = useNaskahModel(q.data);
  if (!m) return q.isError ? <Growing label="karya ini tidak ditemukan" /> : <Growing label="membuka buku…" />;
  return <Buku m={m} wid={wid} />;
}

const paras = (t: string) => t.split(/\n+/).map((x) => x.trim()).filter(Boolean);

function Buku({ m, wid }: { m: NaskahModel; wid: string }) {
  const w = wid === LEPAS ? null : (m.works.find((x) => x.id === wid) ?? null);
  const bentuk = w?.bentuk ?? 'kisah';
  const rumah = useRumahNaskah(m.ms.id, m.ms.visibility === 'kota');
  const [ukuran, setUkuran] = useState(() => Number(store.get('baca.ukuran')) || 18);
  const [maju, setMaju] = useState(0);
  useEffect(() => {
    const on = () => {
      const max = document.documentElement.scrollHeight - innerHeight;
      setMaju(max > 0 ? Math.min(1, scrollY / max) : 0);
    };
    addEventListener('scroll', on, { passive: true });
    return () => removeEventListener('scroll', on);
  }, []);
  const ganti = (d: number) => {
    const v = Math.max(15, Math.min(24, ukuran + d));
    setUkuran(v);
    store.set('baca.ukuran', String(v));
  };
  const list = m
    .scenesOf(w?.id ?? null)
    .filter((s) => s.p && (s.status === 'terbit' || s.authorId === m.meId))
    .sort(bentuk === 'jurnal' || bentuk === 'surat' ? (a, b) => m.chrono[a.id]!.localeCompare(m.chrono[b.id]!) : (a, b) => a.chapter - b.chapter || a.order - b.order);
  const chapters = [...new Set(list.map((s) => s.chapter))];
  const kilas = bentuk === 'jurnal' || bentuk === 'surat' ? {} : naskahKilas(list);
  const title = w?.p.title ?? (m.works.length ? 'Kisah lepas' : m.meta.title);
  const back = () => (history.length > 1 ? history.back() : navigate(rumah.data ? `/kota/rumah/${rumah.data.id}` : `/naskah/${m.ms.id}`));

  return (
    <main className={`nk-baca bentuk-${bentuk}`} style={{ '--ukuran': `${ukuran}px` } as CSSProperties}>
      <div className="nk-baca-maju" style={{ transform: `scaleX(${maju})` }} aria-hidden />
      <nav className="nk-baca-alat">
        <button onClick={back} aria-label="tutup buku">
          <Doodle id="ui-kembali" size={18} />
        </button>
        <span className="grow" />
        <button onClick={() => ganti(-1)} aria-label="perkecil huruf">
          A−
        </button>
        <button onClick={() => ganti(1)} aria-label="perbesar huruf">
          A+
        </button>
      </nav>

      <header className="nk-baca-sampul">
        <span className="nk-baca-jenis">{NASKAH_BENTUK[bentuk].label}</span>
        <h1>{title}</h1>
        {w?.p.sinopsis ? <p className="nk-baca-sinopsis">{w.p.sinopsis}</p> : null}
        <span className="nk-baca-oleh">
          {rumah.data ? `${rumah.data.household} · ditulis ${rumah.data.penName}` : m.ms.members.map((u) => m.who(u)).join(', ')}
        </span>
      </header>

      {!list.length ? <p className="nk-baca-kosong">Belum ada yang terbit di karya ini.</p> : null}

      {bentuk === 'jurnal' ? (
        <section className="nk-harian">
          {list.map((s) => (
            <article key={s.id} className="nk-hari">
              <header>
                <b>{tglPanjang(s.p!.when.sort) || s.p!.when.label || 'tanpa tanggal'}</b>
                {s.p!.when.label && tglPanjang(s.p!.when.sort) ? <span>{s.p!.when.label}</span> : null}
              </header>
              {paras(s.p!.text).map((t, i) => (
                <p key={i}>{t}</p>
              ))}
              <Kaki m={m} s={s} />
            </article>
          ))}
        </section>
      ) : bentuk === 'surat' ? (
        <section className="nk-bundel">
          {list.map((s, i) => (
            <article key={s.id} className="nk-surat" style={{ '--miring': `${((i * 37) % 5) - 2}deg` } as CSSProperties}>
              <span className="nk-surat-tgl">{s.p!.when.label || tglPanjang(s.p!.when.sort)}</span>
              <p className="nk-surat-salam">{s.p!.kepada ? `Kepada ${s.p!.kepada},` : 'Kepadamu,'}</p>
              {paras(s.p!.text).map((t, k) => (
                <p key={k}>{t}</p>
              ))}
              <p className="nk-surat-ttd">{m.nameOf(s.p!.pov)}</p>
              <Kaki m={m} s={s} />
            </article>
          ))}
        </section>
      ) : (
        chapters.map((ch) => (
          <section key={ch} className="nk-bab-baca">
            <h2>
              <span>bab {ch}</span>
              {w?.p.bab?.[String(ch)] ?? ''}
            </h2>
            {list
              .filter((s) => s.chapter === ch)
              .map((s, i) => (
                <article key={s.id} className="nk-adegan-baca">
                  {i ? <div className="nk-pemisah" aria-hidden>⁂</div> : null}
                  {kilas[s.id] ? <span className="nk-baca-kilas">kilas balik · {tglPanjang(kilas[s.id]!.ke) || kilas[s.id]!.ke}</span> : null}
                  <span className="nk-baca-pov">
                    {m.nameOf(s.p!.pov)}
                    {s.p!.when.label ? ` · ${s.p!.when.label}` : ''}
                  </span>
                  {paras(s.p!.text).map((t, k) => (
                    <p key={k}>{t}</p>
                  ))}
                  <Kaki m={m} s={s} />
                </article>
              ))}
          </section>
        ))
      )}
      <footer className="nk-baca-akhir">
        <Doodle id="pena" size={26} />
        <span>{list.length ? 'bersambung, selama penulisnya masih menulis' : ''}</span>
      </footer>
    </main>
  );
}

/** Catatan kaki kecil: draf, desas-desus, dan tautan ke editor untuk penulisnya. */
function Kaki({ m, s }: { m: NaskahModel; s: Scene }) {
  const draf = s.status === 'draf';
  const desas = s.p?.desas ?? [];
  if (!draf && !desas.length && s.authorId !== m.meId) return null;
  return (
    <span className="nk-baca-kaki">
      {draf ? <i>draf, hanya kamu yang melihat</i> : null}
      {desas.length ? <i>konon: {desas.join(', ')} di sini hanya desas-desus</i> : null}
      {s.authorId === m.meId ? (
        <button onClick={() => navigate(`/naskah/${m.ms.id}/a/${s.id}`)}>sunting</button>
      ) : null}
    </span>
  );
}
