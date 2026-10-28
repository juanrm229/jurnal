/**
 * Seumur Harian: delapan momen yang sama untuk semua orang hari ini.
 * Urutkan dari lahir sampai senja, segel, lalu lihat usianya. Sesudahnya,
 * tandai momen yang sudah kamu alami: itu mengisi garis hidupmu sendiri.
 */
import { seumur } from '@sehari/core';
import { type CSSProperties, useMemo, useRef, useState } from 'react';
import { almanak, bintangHarian, bunyi, garisku, harian, laguKehidupan, momenHarian, nadaUsia, tanggalWIB, urutBenar } from '@/lib/seumur';
import { vibrate } from '@/lib/sidik';
import { Doodle, Header, useToast } from '@/ui/kit';
import { Kartu } from './parts';

export default function SeumurHarian() {
  const tgl = tanggalWIB();
  const toast = useToast();
  const hari = useMemo(() => momenHarian(tgl), [tgl]);
  const saved = harian.get(tgl);
  const [urut, setUrut] = useState<seumur.Momen[]>(() => (saved ? saved.urut.map((id) => seumur.momenOf(id)!) : hari));
  const [segel, setSegel] = useState(!!saved);
  const [lived, setLived] = useState(garisku.get());
  const [nyala, setNyala] = useState(-1);
  const benar = urutBenar(urut.map((m) => m.usia));
  const bintang = bintangHarian(benar, urut.length);

  // Seret untuk mengurutkan.
  const list = useRef<HTMLOListElement>(null);
  const drag = useRef<{ i: number; y0: number; h: number } | null>(null);
  const [dragI, setDragI] = useState<number | null>(null);
  const [dy, setDy] = useState(0);
  const down = (i: number, e: React.PointerEvent) => {
    if (segel) return;
    const el = (e.currentTarget as HTMLElement).closest('li')!;
    drag.current = { i, y0: e.clientY, h: el.getBoundingClientRect().height + 8 };
    setDragI(i);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    vibrate(8);
  };
  const move = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    let off = e.clientY - d.y0;
    if (off > d.h / 2 && d.i < urut.length - 1) {
      setUrut((u) => swap(u, d.i, d.i + 1));
      d.i++;
      d.y0 += d.h;
      off -= d.h;
      setDragI(d.i);
      vibrate(5);
    } else if (off < -d.h / 2 && d.i > 0) {
      setUrut((u) => swap(u, d.i, d.i - 1));
      d.i--;
      d.y0 -= d.h;
      off += d.h;
      setDragI(d.i);
      vibrate(5);
    }
    setDy(off);
  };
  const up = () => {
    drag.current = null;
    setDragI(null);
    setDy(0);
  };

  const kunci = () => {
    setSegel(true);
    const h = { urut: urut.map((m) => m.id), benar: urutBenar(urut.map((m) => m.usia)), bintang: bintangHarian(urutBenar(urut.map((m) => m.usia)), urut.length) };
    harian.set(tgl, h);
    almanak.add(h.urut);
    laguKehidupan(
      urut.map((m) => m.usia),
      (i) => setNyala(i),
      420,
    );
  };
  const tandai = (id: string, v: number | null | undefined) => {
    garisku.set(id, v);
    setLived(garisku.get());
  };
  const bagikan = async () => {
    const teks = `Seumur Harian ${tgl}\n${'★'.repeat(bintang)}${'☆'.repeat(3 - bintang)} · ${benar}/${urut.length} tersusun\n${location.origin}/seumur/harian`;
    try {
      if (navigator.share) await navigator.share({ text: teks });
      else {
        await navigator.clipboard.writeText(teks);
        toast('Disalin. Tempel di mana saja.');
      }
    } catch {}
  };

  return (
    <main className="screen sm-screen sm-harian-screen" data-langit="pagi">
      <div className="sm-langit" aria-hidden />
      <Header title="Seumur Harian" sub={new Date(`${tgl}T00:00:00`).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' })} backTo="/seumur" />
      <p className="sm-bisik">{segel ? 'Inilah usia yang tersimpan di setiap momen.' : 'Seret momen-momen ini dari lahir (atas) sampai senja (bawah). Tidak ada batas waktu. Bernapaslah.'}</p>
      <ol className={`sm-urut ${segel ? 'segel' : ''}`} ref={list}>
        {urut.map((m, i) => {
          const ok = segel && (i === 0 || urut[i - 1]!.usia <= m.usia);
          return (
            <li
              key={m.id}
              className={`${dragI === i ? 'seret' : ''} ${segel ? (ok ? 'ok' : 'salah') : ''} ${nyala === i ? 'nyala' : ''}`}
              style={dragI === i ? ({ transform: `translateY(${dy}px)` } as CSSProperties) : undefined}
            >
              <span className="sm-pegangan" onPointerDown={(e) => down(i, e)} onPointerMove={move} onPointerUp={up} onPointerCancel={up} aria-label="seret">
                <Doodle id="titik-titik" size={18} color="currentColor" />
              </span>
              <Kartu k={m} usia={segel ? m.usia : undefined} kecil />
              {segel ? (
                <div className="sm-alami">
                  {m.id in lived ? (
                    <span className="sm-alami-sudah">
                      sudah{lived[m.id] !== null ? ` · umur ${lived[m.id]}` : ''}
                      <input
                        className="field sm-umur"
                        inputMode="numeric"
                        placeholder="umur?"
                        defaultValue={lived[m.id] ?? ''}
                        onBlur={(e) => tandai(m.id, e.target.value ? Math.max(0, Math.min(120, Number(e.target.value))) : null)}
                      />
                      <button className="btn ghost sm" onClick={() => tandai(m.id, undefined)}>
                        batal
                      </button>
                    </span>
                  ) : (
                    <button className="pill sm" onClick={() => (tandai(m.id, null), bunyi(nadaUsia(m.usia), { vol: 0.08 }))}>
                      aku sudah mengalaminya
                    </button>
                  )}
                </div>
              ) : null}
            </li>
          );
        })}
      </ol>
      {segel ? (
        <div className="sm-harian-hasil rise">
          <b className="sm-bintang-hasil">
            {'★'.repeat(bintang)}
            <span className="soft">{'★'.repeat(3 - bintang)}</span>
          </b>
          <p>
            {benar} dari {urut.length} tersusun dalam urutan yang benar.
            <br />
            <span className="tiny soft">Streak: {harian.streak(tgl)} hari · kembali besok untuk delapan momen baru.</span>
          </p>
          <button className="btn soft" onClick={() => void bagikan()}>
            bagikan hasil
          </button>
        </div>
      ) : (
        <button className="btn sd-cta" onClick={kunci} data-testid="sm-harian-segel">
          segel urutanku
        </button>
      )}
    </main>
  );
}

function swap<T>(a: T[], i: number, j: number): T[] {
  const b = [...a];
  [b[i], b[j]] = [b[j]!, b[i]!];
  return b;
}
