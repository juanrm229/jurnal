/**
 * Komponen TITIP SURAT: kartu (depan & belakang), perangko, kursi pemain,
 * tumpukan, dan lembar aturan lengkap.
 */
import { surat } from '@sehari/core';
import type { CSSProperties, ReactNode } from 'react';
import type { View } from '@/lib/titip';
import { Doodle } from '@/ui/kit';
import { PlayerFace } from '../../sidik/parts';

const HUE = [275, 172, 205, 22, 128, 45, 352, 30, 318, 340];
export const hue = (v: number) => ({ '--h': HUE[v] } as CSSProperties);

export function Kartu({ v, kecil, mini, pilih, mati, onClick, children, testid }: { v: number; kecil?: boolean; mini?: boolean; pilih?: boolean; mati?: boolean; onClick?: () => void; children?: ReactNode; testid?: string }) {
  const j = surat.jenis(v);
  if (mini)
    return (
      <span className="ts-mini" style={hue(v)} title={j.nama}>
        <b>{v}</b>
        <Doodle id={j.doodle} size={14} color="currentColor" />
      </span>
    );
  const El = onClick ? 'button' : 'div';
  return (
    <El className={`ts-kartu ${kecil ? 'kecil' : ''} ${pilih ? 'pilih' : ''} ${mati ? 'mati' : ''}`} style={hue(v)} onClick={onClick} data-v={v} data-testid={testid}>
      <span className="ts-segel">{v}</span>
      <span className="ts-jumlah">×{j.jumlah}</span>
      <Doodle id={j.doodle} size={kecil ? 40 : 64} color="currentColor" draw={!kecil} />
      <b className="ts-nama">{j.nama}</b>
      {!kecil ? <span className="ts-efek">{j.singkat}</span> : null}
      {children}
    </El>
  );
}

export function Belakang({ kecil, n }: { kecil?: boolean; n?: number }) {
  return (
    <span className={`ts-belakang ${kecil ? 'kecil' : ''}`}>
      <Doodle id="gembok-hati" size={kecil ? 14 : 30} color="currentColor" />
      {n !== undefined ? <b>{n}</b> : null}
    </span>
  );
}

export function Perangko({ n, target }: { n: number; target: number }) {
  return (
    <span className="ts-perangko" aria-label={`${n} dari ${target} perangko`}>
      {Array.from({ length: Math.max(target, n) }, (_, i) => (
        <i key={i} className={i < n ? 'ada' : ''} />
      ))}
    </span>
  );
}

type P = View['players'][number];
export function Kursi({ p, v, me, onPick, bisa, children }: { p: P; v: View; me?: string | null; onPick?: () => void; bisa?: boolean; children?: ReactNode }) {
  const giliran = v.giliran === p.id || v.pending === p.id;
  const El = onPick ? 'button' : 'div';
  return (
    <El className={`ts-kursi ${giliran ? 'giliran' : ''} ${p.out ? 'keluar' : ''} ${p.aman ? 'aman' : ''} ${bisa ? 'bisa' : ''} ${p.id === me ? 'aku' : ''}`} onClick={onPick} disabled={onPick ? !bisa : undefined} data-testid={`ts-kursi-${p.name}`}>
      <span className="ts-kursi-atas">
        <PlayerFace avatar={p.avatar} size={38} dim={p.out} />
        <span className="ts-kursi-nama">
          <b>
            {p.name}
            {p.bot ? <em> bot</em> : null}
          </b>
          <Perangko n={p.perangko} target={v.target} />
        </span>
        <span className="ts-kursi-tangan">
          {p.out ? <span className="ts-badge">keluar</span> : p.aman ? <span className="ts-badge aman"><Doodle id="payung-terbuka" size={14} color="currentColor" /> aman</span> : Array.from({ length: p.kartu }, (_, i) => <Belakang key={i} kecil />)}
        </span>
      </span>
      {p.buang.length ? (
        <span className="ts-buang">
          {p.buang.map((x, i) => (
            <Kartu key={i} v={x} mini />
          ))}
        </span>
      ) : null}
      {children}
    </El>
  );
}

export function Aturan() {
  return (
    <div className="ts-aturan">
      <p className="small">
        <b>Tujuan.</b> Semua ingin suratnya sampai ke <i>Dia</i>. Titipkan lewat orang-orang di sekitarnya. Pemenang ronde mendapat 1 perangko. Kumpulkan perangko lebih dulu: berdua 6, bertiga 5, berempat 4, berlima atau berenam 3.
      </p>
      <p className="small">
        <b>Persiapan.</b> 21 kartu dikocok. Satu disisihkan tertutup. Kalau hanya berdua, tiga kartu lagi dibuka untuk dilihat semua. Setiap orang memegang satu kartu.
      </p>
      <p className="small">
        <b>Giliran.</b> Ambil satu kartu, lalu mainkan salah satu dari dua kartumu dan jalankan efeknya. Kartu yang dimainkan tetap terbuka di depanmu, jadi semua bisa menghitung apa yang sudah keluar.
      </p>
      <p className="small">
        <b>Akhir ronde.</b> Kalau tinggal satu orang, dia menang. Kalau tumpukan habis, yang bertahan membuka kartu: nilai tertinggi menang, dan kalau seri semua yang seri menang. Pemenang ronde jalan duluan di ronde berikutnya. Kalau dua orang mencapai target bersamaan, main satu ronde lagi.
      </p>
      <span className="sd-label">10 jenis kartu</span>
      <div className="ts-aturan-kartu">
        {surat.JENIS.map((j) => (
          <div key={j.v} className="ts-aturan-baris" style={hue(j.v)}>
            <span className="ts-segel">{j.v}</span>
            <Doodle id={j.doodle} size={30} color="currentColor" />
            <span>
              <b>
                {j.nama} <span className="tiny soft">×{j.jumlah}</span>
              </b>
              <span className="small">{j.efek}</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
