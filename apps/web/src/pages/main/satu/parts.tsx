/**
 * Komponen KARTU SATU: kartu (depan & belakang), kursi pemain, pemilih warna,
 * dan lembar aturan (resmi + tongkrongan).
 */
import { satu } from '@sehari/core';
import type { CSSProperties, ReactNode } from 'react';
import { AKHIR, ATURAN, TUMPUK, type View, WARNA_HEX } from '@/lib/satu';
import { Doodle } from '@/ui/kit';
import { PlayerFace } from '../../sidik/parts';

const ikon = (t: satu.Jenis, size: number) =>
  t === 'skip' ? <Doodle id="lingkaran-coret" size={size} color="currentColor" sw={3} /> : t === 'rev' ? <Doodle id="panah-lengkung" size={size} color="currentColor" sw={3} /> : t === 'wild' ? <span className="st-roda" style={{ width: size, height: size }} /> : <b>{t}</b>;

export function KartuSatu({ c, kecil, mati, pilih, salip, onClick, putar, testid }: { c: satu.Card; kecil?: boolean; mati?: boolean; pilih?: boolean; salip?: boolean; onClick?: () => void; putar?: number; testid?: string }) {
  const El = onClick ? 'button' : 'div';
  const st = { '--w': c.w ? WARNA_HEX[c.w] : '#1d1d24', rotate: putar ? `${putar}deg` : undefined } as CSSProperties;
  return (
    <El className={`st-kartu ${c.w ? '' : 'hitam'} ${kecil ? 'kecil' : ''} ${mati ? 'mati' : ''} ${pilih ? 'pilih' : ''} ${salip ? 'salip' : ''}`} style={st} onClick={onClick} disabled={onClick ? mati : undefined} data-t={c.t} data-testid={testid}>
      <span className="st-sudut">{ikon(c.t, kecil ? 10 : 14)}</span>
      <span className="st-oval">{ikon(c.t, kecil ? 22 : 34)}</span>
      <span className="st-sudut bawah">{ikon(c.t, kecil ? 10 : 14)}</span>
      {salip ? <i className="st-salip-label">salip!</i> : null}
    </El>
  );
}

export function BelakangSatu({ n, onClick, aktif }: { n?: number; onClick?: () => void; aktif?: boolean }) {
  const El = onClick ? 'button' : 'div';
  return (
    <El className={`st-belakang ${aktif ? 'aktif' : ''}`} onClick={onClick} data-testid={onClick ? 'st-ambil-tumpukan' : undefined}>
      <span>satu</span>
      {n !== undefined ? <b>{n}</b> : null}
    </El>
  );
}

export function PilihWarna({ onPilih, judul = 'pilih warna' }: { onPilih: (w: satu.Warna) => void; judul?: string }) {
  return (
    <div className="st-pilih-warna">
      <span className="sd-label">{judul}</span>
      <div>
        {satu.WARNA.map((w) => (
          <button key={w} style={{ '--w': WARNA_HEX[w] } as CSSProperties} onClick={() => onPilih(w)} data-testid={`st-warna-${w}`}>
            {satu.NAMA_WARNA[w]}
          </button>
        ))}
      </div>
    </div>
  );
}

type P = View['players'][number];
export function Kursi({ p, v, me, onTangkap, children }: { p: P; v: View; me?: string | null; onTangkap?: () => void; children?: ReactNode }) {
  const giliran = v.giliran === p.id;
  return (
    <div className={`st-kursi ${giliran ? 'giliran' : ''} ${p.selesai ? 'selesai' : ''} ${p.id === me ? 'aku' : ''}`} data-testid={`st-kursi-${p.name}`}>
      <PlayerFace avatar={p.avatar} size={36} dim={!!p.selesai} />
      <span className="st-kursi-nama">
        <b>
          {p.name}
          {p.bot ? <em> bot</em> : null}
        </b>
        <span className="st-kursi-info">
          {p.selesai ? (
            <span className="st-badge">#{p.selesai} selesai</span>
          ) : (
            <>
              <span className="st-jumlah">
                {Array.from({ length: Math.min(p.kartu, 7) }, (_, i) => (
                  <i key={i} />
                ))}
                <b>{p.kartu}</b>
              </span>
              {p.satu && p.kartu <= 2 ? <span className="st-badge satu">SATU!</span> : null}
            </>
          )}
          {v.opts.akhir === 'skor' ? <span className="tiny soft">{p.skor} poin</span> : null}
        </span>
      </span>
      {p.rawan && onTangkap ? (
        <button className="st-tangkap" onClick={onTangkap} data-testid="st-tangkap">
          tangkap!
        </button>
      ) : null}
      {children}
    </div>
  );
}

export function AturanSatu({ opts }: { opts?: satu.Opts }) {
  return (
    <div className="ts-aturan">
      <p className="small">
        <b>Tujuan.</b> Habiskan kartu di tanganmu. 108 kartu: empat warna (0 satu lembar, 1–9 dua lembar), Lewati, Putar Balik, +2, serta kartu hitam Ganti Warna dan +4. Setiap orang mulai dengan 7 kartu.
      </p>
      <p className="small">
        <b>Giliran.</b> Mainkan kartu yang sama warnanya atau sama angka/simbolnya dengan kartu teratas, atau kartu hitam. Tidak bisa atau tidak mau? Ambil satu kartu; kalau cocok, boleh langsung dimainkan.
      </p>
      <p className="small">
        <b>Kartu aksi.</b> Lewati: pemain berikutnya kehilangan giliran. Putar Balik: arah berbalik (berdua sama dengan Lewati). +2: pemain berikutnya mengambil 2 dan kehilangan giliran. Ganti Warna: pilih warna. +4: pilih warna, pemain berikutnya mengambil 4 dan kehilangan giliran. Resmi, +4 hanya sah kalau kamu tidak punya kartu berwarna yang sedang berlaku. Kalau ditantang dan terbukti curang, kamu yang mengambil 4; kalau sah, penantang mengambil 6.
      </p>
      <p className="small">
        <b>Satu!</b> Saat kartumu tinggal satu, tekan SATU!. Lupa, lalu ketahuan sebelum pemain berikutnya bertindak? Ambil 2 kartu.
      </p>
      <p className="small">
        <b>Skor resmi.</b> Yang habis duluan mendapat poin dari kartu lawan: angka sesuai nilainya, kartu aksi 20, kartu hitam 50. Pertama mencapai 500 menang.
      </p>
      <span className="sd-label">aturan tongkrongan (bisa dinyalakan)</span>
      <div className="st-aturan-list">
        <span>
          <b>Tumpuk +2/+4</b> {TUMPUK[opts?.tumpuk ?? 'campur']}. Yang tidak bisa membalas mengambil semuanya.
        </span>
        {ATURAN.map((a) => (
          <span key={a.k} className={opts && !opts[a.k] ? 'mati' : ''}>
            <b>{a.nama}</b> {a.ket}
          </span>
        ))}
        <span>
          <b>Akhir permainan</b> {opts ? AKHIR[opts.akhir] : 'kumpulkan poin, satu ronde, atau cari yang kalah (main terus sampai tersisa satu orang)'}.
        </span>
      </div>
    </div>
  );
}
