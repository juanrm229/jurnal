/**
 * Komponen KEMBANG API: kartu (terlihat & tersembunyi dengan catatan),
 * barisan kembang api, token & sumbu, dan aturan lengkap.
 */
import { hanabi as H } from '@sehari/core';
import type { CSSProperties } from 'react';
import { HEX, type View } from '@/lib/hanabi';
import { Doodle } from '@/ui/kit';

type KT = H.KartuTampil;
const gaya = (w: H.Warna | null) => ({ '--w': w ? HEX[w] : '#16161a' }) as CSSProperties;

/** Kartu: terbuka (milik orang lain) atau tertutup dengan catatan petunjuk (milikmu). */
export function KartuK({ c, warnaMain, sorot, pilih, onClick, kecil, testid }: { c: KT; warnaMain: H.Warna[]; sorot?: boolean; pilih?: boolean; onClick?: () => void; kecil?: boolean; testid?: string }) {
  const El = onClick ? 'button' : 'div';
  const t = c.tahu;
  const tahuW = t.warna.length === 1 ? t.warna[0]! : null;
  const tahuN = t.angka.length === 1 ? t.angka[0]! : null;
  const terbuka = c.w !== null;
  return (
    <El className={`kb-kartu ${terbuka ? 'buka' : 'tutup'} ${c.w === 'x' || tahuW === 'x' ? 'pelangi' : ''} ${t.sentuh ? 'sentuh' : ''} ${sorot ? 'sorot' : ''} ${pilih ? 'pilih' : ''} ${kecil ? 'kecil' : ''}`} style={gaya(terbuka ? c.w : tahuW)} onClick={onClick} data-testid={testid} data-kartu={c.id}>
      {terbuka ? (
        <>
          <b className="kb-n">{c.n}</b>
          <Doodle id="kembang-api" size={kecil ? 14 : 20} color="currentColor" />
        </>
      ) : (
        <>
          <b className="kb-n">{tahuN ?? '?'}</b>
          {t.warna.length > 1 && t.warna.length < warnaMain.length ? (
            <span className="kb-mungkin">
              {t.warna.map((w) => (
                <i key={w} style={gaya(w)} />
              ))}
            </span>
          ) : null}
          {t.angka.length > 1 && t.angka.length < 5 ? <span className="kb-angka">{t.angka.join('')}</span> : null}
        </>
      )}
      {terbuka && t.sentuh ? (
        <span className="kb-tahu" title="yang dia ketahui">
          {t.warna.length === 1 ? <i style={gaya(t.warna[0]!)} /> : null}
          {t.angka.length === 1 ? <b>{t.angka[0]}</b> : null}
        </span>
      ) : null}
    </El>
  );
}

export function Api({ v, letup }: { v: View; letup?: H.Warna | null }) {
  return (
    <div className="kb-api">
      {H.warnaMain(v.opts).map((w) => (
        <span key={w} className={`kb-api-tiang ${w === 'x' ? 'pelangi' : ''} ${letup === w ? 'letup' : ''}`} style={gaya(w)}>
          <span className="kb-api-ledak" aria-hidden>
            {v.api[w] ? <Doodle id="kembang-api" size={34} color="currentColor" /> : null}
          </span>
          <b>{v.api[w] || '·'}</b>
          <span className="tiny">{H.NAMA_WARNA[w]}</span>
        </span>
      ))}
    </div>
  );
}

export function Token({ v }: { v: View }) {
  return (
    <div className="kb-token">
      <span className="kb-titik" aria-label={`${v.token} token petunjuk`}>
        {Array.from({ length: H.TOKEN }, (_, i) => (
          <i key={i} className={i < v.token ? 'ada' : ''} />
        ))}
      </span>
      <span className="kb-sumbu" aria-label={`${v.sumbu} sumbu tersisa`}>
        {Array.from({ length: H.SUMBU }, (_, i) => (
          <Doodle key={i} id="petir-kecil" size={18} color={i < H.SUMBU - v.sumbu ? '#e23b3b' : 'var(--fog)'} />
        ))}
      </span>
      <span className="tiny">
        {v.deck} kartu · skor {H.skorOf(v.api)}/{H.skorMaks(v.opts)}
      </span>
    </div>
  );
}

export function AturanKembang() {
  return (
    <div className="ts-aturan">
      <p className="small">
        <b>Tujuan.</b> Bersama-sama, susun kembang api di setiap warna dari 1 sampai 5. Skor = jumlah kartu yang berhasil dinyalakan (maksimal 25).
      </p>
      <p className="small">
        <b>Yang aneh.</b> Kamu melihat kartu semua orang, kecuali kartumu sendiri. Kartumu hanya bisa diketahui lewat petunjuk teman.
      </p>
      <p className="small">
        <b>Giliran.</b> Pilih satu:
        <br />• <b>Beri petunjuk</b> (pakai 1 dari 8 token): sebut satu warna atau satu angka ke satu pemain, dan tunjukkan SEMUA kartunya yang cocok.
        <br />• <b>Buang</b> satu kartumu (token kembali satu; tidak bisa saat token penuh).
        <br />• <b>Mainkan</b> satu kartumu. Kalau tepat angka berikutnya di warnanya, kembang api menyala. Kalau salah, satu sumbu terbakar dan kartunya terbuang.
      </p>
      <p className="small">
        <b>Akhir.</b> Tiga sumbu terbakar: pertunjukan gagal (skor 0). Semua warna sampai 5: sempurna. Tumpukan habis: setiap orang mendapat satu giliran terakhir.
      </p>
      <p className="small">
        <b>Sebaran.</b> Setiap warna: tiga kartu 1, dua kartu 2, 3, 4, dan hanya satu kartu 5. Jangan sampai 5 terbuang! Menyelesaikan satu warna mengembalikan satu token.
      </p>
      <span className="sd-label">varian warna keenam</span>
      <div className="st-aturan-list">
        <span>
          <b>Biasa</b> Warna pelangi dengan 10 kartu, seperti warna lain (maks 30).
        </span>
        <span>
          <b>Langka</b> Pelangi hanya satu kartu tiap angka: setiap kartunya kritis.
        </span>
        <span>
          <b>Pelangi</b> Kartu pelangi tersentuh oleh SETIAP petunjuk warna, dan "pelangi" tidak bisa disebut.
        </span>
      </div>
    </div>
  );
}
