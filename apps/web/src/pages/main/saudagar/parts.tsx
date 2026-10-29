/**
 * Komponen SAUDAGAR: papan 11×11 (petak, pemilik, rumah/hotel, pion),
 * kartu akta properti dengan tabel sewa, dan aturan lengkap.
 */
import { saudagar as S } from '@sehari/core';
import type { CSSProperties, ReactNode } from 'react';
import { letak, rp, sisi, type View, WARNA_PEMAIN } from '@/lib/saudagar';
import { Doodle } from '@/ui/kit';

const IKON: Partial<Record<S.Petak['jenis'], string>> = { start: 'panah-lengkung', penjara: 'ui-gembok', parkir: 'motor', kepenjara: 'tanda-seru', kesempatan: 'tanda-tanya', dana: 'kado', pajak: 'stempel', transport: 'kereta', utilitas: 'lampu' };
export const ikonPetak = (p: S.Petak) => (p.i === 15 ? 'kapal' : p.i === 25 ? 'pesawat' : p.i === 35 ? 'angkot' : p.i === 28 ? 'hujan' : p.jenis === 'kota' ? null : (IKON[p.jenis] ?? null));
export const warnaPetak = (p: S.Petak) => (p.jenis === 'kota' ? S.WARNA_GRUP[p.grup] : null);
const singkat = (n: string) => n.replace('Pelabuhan Tanjung Perak', 'Pelabuhan').replace('Bandara Ngurah Rai', 'Bandara').replace('Terminal Pulo Gebang', 'Terminal').replace('Stasiun Gambir', 'Stasiun').replace('Pajak Penghasilan', 'Pajak').replace('Pajak Barang Mewah', 'Pajak Mewah').replace('Masuk Penjara', 'Ke Penjara');

export function Papan({ v, onPetak, sorot, children }: { v: View; onPetak?: (i: number) => void; sorot?: number | null; children?: ReactNode }) {
  const warnaOf = (pid: string | null) => (pid ? WARNA_PEMAIN[v.players.findIndex((p) => p.id === pid) % WARNA_PEMAIN.length] : undefined);
  return (
    <div className="sg-papan">
      {S.PETAK.map((p) => {
        const [r, c] = letak(p.i);
        const m = v.milik[p.i]!;
        const w = warnaPetak(p);
        const ik = ikonPetak(p);
        const pion = v.players.filter((x) => !x.bangkrut && x.pos === p.i);
        const sudut = p.i % 10 === 0;
        return (
          <button
            key={p.i}
            className={`sg-petak sisi-${sisi(p.i)} ${sudut ? 'sudut' : ''} ${m.gadai ? 'gadai' : ''} ${sorot === p.i ? 'sorot' : ''}`}
            style={{ gridRow: r, gridColumn: c, '--g': w ?? 'transparent', '--o': warnaOf(m.owner) ?? 'transparent' } as CSSProperties}
            onClick={() => onPetak?.(p.i)}
            data-petak={p.i}
          >
            {w ? <span className="sg-strip" /> : null}
            {ik ? <Doodle id={ik} size={sudut ? 18 : 12} color="currentColor" /> : null}
            <span className="sg-nama">{sudut ? p.nama : singkat(p.nama)}</span>
            {'harga' in p ? <span className="sg-harga">{m.owner ? '' : p.harga}</span> : null}
            {m.rumah ? <span className={`sg-rumah ${m.rumah === 5 ? 'hotel' : ''}`}>{m.rumah === 5 ? 'H' : '▪'.repeat(m.rumah)}</span> : null}
            {m.owner ? <span className="sg-milik" /> : null}
            {pion.length ? (
              <span className="sg-pion-wadah">
                {pion.map((x) => (
                  <i key={x.id} className={`sg-pion ${v.giliran === x.id ? 'giliran' : ''} ${x.penjara >= 0 ? 'bui' : ''}`} style={{ '--c': warnaOf(x.id) } as CSSProperties} title={x.name} />
                ))}
              </span>
            ) : null}
          </button>
        );
      })}
      <div className="sg-tengah">{children}</div>
    </div>
  );
}

/** Akta properti: harga, tabel sewa, biaya bangun, nilai gadai. */
export function Akta({ i, v }: { i: number; v: View }) {
  const p = S.PETAK[i]!;
  const m = v.milik[i]!;
  const owner = v.players.find((x) => x.id === m.owner);
  if (!S.isMilikan(p))
    return (
      <div className="sg-akta lain">
        <Doodle id={ikonPetak(p) ?? 'bintang'} size={40} />
        <b>{p.nama}</b>
        <p className="small">
          {p.jenis === 'pajak'
            ? `Bayar ${rp(p.jumlah)}${v.opts.parkir ? ' (masuk jackpot Parkir Bebas)' : ''}.`
            : p.jenis === 'start'
              ? `Setiap melewati: terima ${rp(S.GAJI)}${v.opts.startDobel ? `; berhenti tepat di sini: ${rp(S.GAJI * 2)}` : ''}.`
              : p.jenis === 'penjara'
                ? 'Kalau hanya lewat atau mampir, aman. Yang dipenjara bisa bayar denda, memakai kartu bebas, atau mencoba dadu kembar (paling banyak 3 kali).'
                : p.jenis === 'parkir'
                  ? v.opts.parkir
                    ? `Jackpot sekarang: ${rp(v.pot)}. Berhenti di sini untuk mengambilnya.`
                    : 'Istirahat. Tidak terjadi apa-apa.'
                  : p.jenis === 'kepenjara'
                    ? 'Langsung ke penjara, tidak melewati Mulai.'
                    : `Ambil kartu ${p.nama}.`}
        </p>
      </div>
    );
  const w = warnaPetak(p);
  return (
    <div className={`sg-akta ${m.gadai ? 'gadai' : ''}`} style={{ '--g': w ?? '#16161a' } as CSSProperties}>
      <div className="sg-akta-kepala">
        <span className="tiny">{p.jenis === 'kota' ? `akta tanah · ${S.NAMA_GRUP[p.grup]}` : p.jenis === 'transport' ? 'transportasi' : 'utilitas'}</span>
        <b>{p.nama}</b>
      </div>
      {p.jenis === 'kota' ? (
        <table>
          <tbody>
            {['sewa', 'satu grup', '1 rumah', '2 rumah', '3 rumah', '4 rumah', 'hotel'].map((label, k) => {
              const n = k === 0 ? p.sewa[0]! : k === 1 ? p.sewa[0]! * 2 : p.sewa[k - 1]!;
              const aktif = m.owner && (k === 0 ? m.rumah === 0 : k === 1 ? false : m.rumah === k - 1);
              return (
                <tr key={label} className={aktif ? 'aktif' : ''}>
                  <td>{label}</td>
                  <td>{rp(n)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      ) : p.jenis === 'transport' ? (
        <table>
          <tbody>
            {[1, 2, 3, 4].map((n) => (
              <tr key={n}>
                <td>punya {n}</td>
                <td>{rp(25 * 2 ** (n - 1))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="small">Punya satu: 4 × angka dadu. Punya keduanya (PLN & PDAM): 10 × angka dadu.</p>
      )}
      <div className="sg-akta-bawah tiny">
        <span>harga {rp(p.harga)}</span>
        {p.jenis === 'kota' ? <span>bangun {rp(p.bangun)}/rumah</span> : null}
        <span>gadai {rp(p.harga / 2)}</span>
      </div>
      <p className="tiny center">
        {owner ? (
          <>
            milik <b style={{ color: WARNA_PEMAIN[v.players.indexOf(owner) % WARNA_PEMAIN.length] }}>{owner.id === v.me?.id ? 'kamu' : owner.name}</b>
            {m.gadai ? ' · tergadai' : m.rumah ? ` · ${m.rumah === 5 ? 'hotel' : `${m.rumah} rumah`}` : ''}
          </>
        ) : (
          'belum dimiliki'
        )}
      </p>
    </div>
  );
}

export function AturanSaudagar({ opts }: { opts?: S.Opts }) {
  return (
    <div className="ts-aturan">
      <p className="small">
        <b>Tujuan.</b> Jadi satu-satunya yang tidak bangkrut. Setiap orang mulai dengan {rp(opts?.modal ?? 1500)}; melewati Mulai menerima {rp(S.GAJI)}.
      </p>
      <p className="small">
        <b>Giliran.</b> Lempar dua dadu dan jalan. Dadu kembar: lempar lagi; kembar tiga kali berturut-turut langsung masuk penjara.
      </p>
      <p className="small">
        <b>Membeli.</b> Berhenti di properti tanpa pemilik: beli seharga di akta, atau tolak dan properti itu dilelang ke semua pemain (termasuk kamu). Tawaran tertinggi menang; setiap tawaran baru menambah waktu.
      </p>
      <p className="small">
        <b>Sewa.</b> Berhenti di properti orang lain: bayar sewa. Menguasai satu grup warna melipatgandakan sewa kota tanpa bangunan. Transportasi: 25, 50, 100, 200 sesuai jumlah yang dimiliki. PLN & PDAM: 4 atau 10 kali angka dadu. Properti tergadai tidak menarik sewa.
      </p>
      <p className="small">
        <b>Membangun.</b> Kuasai satu grup warna tanpa ada yang tergadai, lalu bangun rumah secara merata (selisih paling banyak satu antarkota). Empat rumah bisa ditingkatkan menjadi hotel. Bank hanya punya {S.STOK_RUMAH} rumah dan {S.STOK_HOTEL} hotel; kalau habis, tunggu ada yang menjual. Bangunan dijual kembali ke bank seharga separuhnya.
      </p>
      <p className="small">
        <b>Gadai.</b> Properti tanpa bangunan di grupnya bisa digadai untuk separuh harganya, dan ditebus dengan tambahan bunga 10%.
      </p>
      <p className="small">
        <b>Penjara.</b> Masuk karena petak Masuk Penjara, kartu, atau kembar tiga kali. Keluar dengan membayar {rp(S.DENDA_PENJARA)}, kartu bebas penjara, atau dadu kembar. Setelah tiga kali gagal, wajib bayar dan jalan. Di penjara tetap boleh menarik sewa, membangun, dan bertukar.
      </p>
      <p className="small">
        <b>Tukar.</b> Kapan saja, tawarkan properti, uang, dan kartu bebas penjara ke pemain lain. Grup yang masih ada bangunannya tidak bisa ditukar. Penerima properti tergadai membayar bunga 10%.
      </p>
      <p className="small">
        <b>Bangkrut.</b> Kalau tagihan tidak sanggup dibayar walau sudah menjual bangunan dan menggadai, kamu bangkrut. Utang ke pemain: semua asetmu jatuh kepadanya. Utang ke bank: propertimu dilelang ulang.
      </p>
      <span className="sd-label">aturan rumahan (bisa dinyalakan)</span>
      <div className="st-aturan-list">
        <span className={opts && !opts.parkir ? 'mati' : ''}>
          <b>Jackpot Parkir Bebas</b> Pajak dan denda terkumpul di tengah; yang berhenti di Parkir Bebas mengambil semuanya.
        </span>
        <span className={opts && !opts.startDobel ? 'mati' : ''}>
          <b>Start dobel</b> Berhenti tepat di Mulai menerima dua kali lipat.
        </span>
        <span className={opts && opts.lelang ? 'mati' : ''}>
          <b>Tanpa lelang</b> Properti yang ditolak tetap milik bank.
        </span>
        <span className={opts && !opts.batas ? 'mati' : ''}>
          <b>Batas waktu</b> Saat waktu habis, kekayaan terbesar (uang + properti + bangunan) menang.
        </span>
      </div>
    </div>
  );
}
