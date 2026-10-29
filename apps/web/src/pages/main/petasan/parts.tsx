/**
 * Komponen KUCING PETASAN: kartu (depan & belakang) dan aturan lengkap.
 */
import { petasan as K } from '@sehari/core';
import type { CSSProperties } from 'react';
import { Doodle } from '@/ui/kit';

export function KartuP({ j, pilih, mati, onClick, kecil, testid }: { j: K.Jenis; pilih?: boolean; mati?: boolean; onClick?: () => void; kecil?: boolean; testid?: string }) {
  const k = K.KARTU[j];
  const El = onClick ? 'button' : 'div';
  return (
    <El className={`kp-kartu ${kecil ? 'kecil' : ''} ${pilih ? 'pilih' : ''} ${mati ? 'mati' : ''} ${j === 'petasan' ? 'bahaya' : ''}`} style={{ '--k': k.warna } as CSSProperties} onClick={onClick} disabled={onClick ? mati : undefined} data-j={j} data-testid={testid}>
      <span className="kp-pita">{k.kucing ? 'kucing' : j === 'petasan' ? 'awas!' : j === 'siram' ? 'penjinak' : 'aksi'}</span>
      <span className="kp-gambar">
        {k.kucing || j === 'petasan' ? <Doodle id="kucing" size={kecil ? 22 : 34} color="currentColor" /> : null}
        <Doodle id={k.doodle} size={kecil ? 18 : k.kucing || j === 'petasan' ? 22 : 36} color="currentColor" />
      </span>
      <b>{k.nama}</b>
    </El>
  );
}

export function BelakangP({ n, onClick, aktif }: { n: number; onClick?: () => void; aktif?: boolean }) {
  const El = onClick ? 'button' : 'div';
  return (
    <El className={`kp-belakang ${aktif ? 'aktif' : ''}`} onClick={onClick} data-testid={onClick ? 'kp-ambil' : undefined}>
      <Doodle id="kucing" size={36} color="currentColor" />
      <span>kucing petasan</span>
      <b>{n}</b>
    </El>
  );
}

export function AturanPetasan() {
  return (
    <div className="ts-aturan">
      <p className="small">
        <b>Tujuan.</b> Jangan meledak. Di tumpukan ada Kucing Petasan sebanyak pemain dikurangi satu. Yang terakhir selamat menang.
      </p>
      <p className="small">
        <b>Persiapan.</b> Setiap orang memegang 1 Siram Air dan 4 kartu acak. Untuk 6–10 orang dipakai dua dek.
      </p>
      <p className="small">
        <b>Giliran.</b> Mainkan kartu sebanyak yang kamu mau (atau tidak sama sekali), lalu akhiri giliran dengan mengambil satu kartu dari tumpukan. Kalau yang terambil Kucing Petasan dan kamu tidak punya Siram Air, kamu meledak.
      </p>
      <p className="small">
        <b>Siram Air.</b> Jinakkan petasan, lalu selipkan kembali ke tumpukan di posisi mana pun yang kamu mau, diam-diam. Taruh di paling atas untuk pemain berikutnya, kalau tega.
      </p>
      <p className="small">
        <b>Ogah!</b> Setelah setiap aksi ada beberapa detik untuk membatalkannya dengan Ogah!, oleh siapa saja. Ogah! bisa dibalas Ogah! lagi.
      </p>
      <p className="small">
        <b>Kombo.</b> Dua kartu kembar (termasuk kucing): curi satu kartu acak dari pemain lain. Tiga kembar: sebut satu kartu; kalau dia punya, harus diberikan. Lima kartu berbeda: ambil satu kartu apa saja dari buangan.
      </p>
      <span className="sd-label">kartu</span>
      <div className="st-aturan-list">
        {K.JENIS.filter((j) => !K.KARTU[j].kucing).map((j) => (
          <span key={j}>
            <b>
              {K.KARTU[j].nama} ×{K.KARTU[j].jumlah}
            </b>{' '}
            {K.KARTU[j].efek}
          </span>
        ))}
        <span>
          <b>5 jenis kucing ×4</b> Kucing Oren, Kucing Garong, Kucing Belang Tiga, Kucing Kampung, Kucing Anggora. Tidak berguna sendirian; mainkan berpasangan.
        </span>
      </div>
    </div>
  );
}
