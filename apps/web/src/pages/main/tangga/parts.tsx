/**
 * Komponen ULAR TANGGA: papan (kotak, ular & tangga SVG bergaya doodle,
 * pion yang berjalan kotak demi kotak), dadu, kartu aksi, dan aturan.
 */
import { tangga } from '@sehari/core';
import { type CSSProperties, useEffect, useMemo, useRef, useState } from 'react';
import { PION, pusat, type View } from '@/lib/tangga';
import { Doodle } from '@/ui/kit';
import { PlayerFace } from '../../sidik/parts';

const WARNA_ULAR = ['#3aa865', '#d9473d', '#8b5cf6', '#e08a1e', '#2f6fd6', '#c2417a', '#4d7c0f', '#0e7490'];

/** Badan ular berliku dari kepala ke ekor. */
function jalurUlar(h: number, t: number, i: number) {
  const [x1, y1] = pusat(h);
  const [x2, y2] = pusat(t);
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  const gel = Math.max(1.5, len / 160);
  const amp = Math.min(34, 14 + len / 30);
  const pts: string[] = [];
  for (let k = 0; k <= 40; k++) {
    const u = k / 40;
    const w = Math.sin(u * Math.PI * gel * 2 + i) * amp * Math.sin(Math.PI * Math.min(1, u * 1.2));
    pts.push(`${(x1 + dx * u + nx * w).toFixed(1)},${(y1 + dy * u + ny * w).toFixed(1)}`);
  }
  return `M${pts.join(' L')}`;
}

function Ular({ h, t, i, putus, bayang }: { h: number; t: number; i: number; putus?: boolean; bayang?: boolean }) {
  const d = jalurUlar(h, t, i);
  const c = WARNA_ULAR[i % WARNA_ULAR.length]!;
  const [hx, hy] = pusat(h);
  return (
    <g className={`tg-ular ${putus ? 'putus' : ''} ${bayang ? 'bayang' : ''}`}>
      <path d={d} stroke="#16161a" strokeWidth={21} fill="none" strokeLinecap="round" strokeLinejoin="round" opacity={0.9} />
      <path d={d} stroke={c} strokeWidth={15} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <path d={d} stroke="#fff" strokeOpacity={0.45} strokeWidth={5} strokeDasharray="2 16" fill="none" strokeLinecap="round" />
      <ellipse cx={hx} cy={hy} rx={21} ry={17} fill={c} stroke="#16161a" strokeWidth={4} />
      <circle cx={hx - 8} cy={hy - 5} r={5} fill="#fff" stroke="#16161a" strokeWidth={2} />
      <circle cx={hx + 8} cy={hy - 5} r={5} fill="#fff" stroke="#16161a" strokeWidth={2} />
      <circle cx={hx - 7} cy={hy - 4} r={2} fill="#16161a" />
      <circle cx={hx + 9} cy={hy - 4} r={2} fill="#16161a" />
      <path d={`M${hx - 3},${hy + 16} l3,12 l3,-12`} stroke="#d9473d" strokeWidth={3} fill="none" />
      {putus ? <path d={`M${hx - 30},${hy - 30} l60,60 M${hx + 30},${hy - 30} l-60,60`} stroke="#16161a" strokeWidth={8} strokeLinecap="round" /> : null}
    </g>
  );
}

function Tangga({ b, t, bayang }: { b: number; t: number; bayang?: boolean }) {
  const [x1, y1] = pusat(b);
  const [x2, y2] = pusat(t);
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const nx = (-dy / len) * 17;
  const ny = (dx / len) * 17;
  const anak = Math.max(2, Math.floor(len / 42));
  return (
    <g className={`tg-tangga ${bayang ? 'bayang' : ''}`}>
      {[1, -1].map((s) => (
        <g key={s}>
          <line x1={x1 + nx * s} y1={y1 + ny * s} x2={x2 + nx * s} y2={y2 + ny * s} stroke="#16161a" strokeWidth={11} strokeLinecap="round" />
          <line x1={x1 + nx * s} y1={y1 + ny * s} x2={x2 + nx * s} y2={y2 + ny * s} stroke="#c58a4a" strokeWidth={6} strokeLinecap="round" />
        </g>
      ))}
      {Array.from({ length: anak }, (_, k) => {
        const u = (k + 0.7) / (anak + 0.4);
        const cx = x1 + dx * u;
        const cy = y1 + dy * u;
        return <line key={k} x1={cx + nx} y1={cy + ny} x2={cx - nx} y2={cy - ny} stroke="#16161a" strokeWidth={7} strokeLinecap="round" />;
      })}
    </g>
  );
}

/** Posisi pion yang ditampilkan: mengikuti jalur gerak dari log, kotak demi kotak. */
function usePosisiTampil(v: View) {
  const [tampil, setTampil] = useState<Record<string, number>>(() => Object.fromEntries(v.players.map((p) => [p.id, p.pos])));
  const lastN = useRef(v.log.at(-1)?.n ?? 0);
  const antre = useRef<{ pid: string; ke: number; ms: number }[]>([]);
  const jalan = useRef(false);
  useEffect(() => {
    const baru = v.log.filter((e) => e.n > lastN.current);
    lastN.current = v.log.at(-1)?.n ?? lastN.current;
    for (const e of baru) {
      if (e.t !== 'gerak' || !e.jalur) continue;
      e.jalur.forEach((s, i) => antre.current.push({ pid: e.by!, ke: s, ms: e.lewat && i === e.jalur!.length - 1 ? 650 : 170 }));
    }
    // Jaga-jaga: posisi akhir selalu sama dengan server (mis. setelah Tukar Tempat atau mulai ulang).
    const putar = () => {
      const x = antre.current.shift();
      if (!x) {
        jalan.current = false;
        setTampil(Object.fromEntries(v.players.map((p) => [p.id, p.pos])));
        return;
      }
      jalan.current = true;
      setTampil((t) => ({ ...t, [x.pid]: x.ke }));
      setTimeout(putar, x.ms);
    };
    if (!jalan.current) putar();
  }, [v.rev]);
  return tampil;
}

export function Papan({ v, sorot, pilihKotak, onKotak }: { v: View; sorot?: number[]; pilihKotak?: (s: number) => boolean; onKotak?: (s: number) => void }) {
  const tampil = usePosisiTampil(v);
  const p = v.papan;
  const susun = useMemo(() => {
    // Urutan visual grid: baris atas (91–100, kanan ke kiri) sampai baris bawah.
    const out: number[] = [];
    for (let r = 9; r >= 0; r--) {
      const row = Array.from({ length: 10 }, (_, c) => r * 10 + c + 1);
      out.push(...(r % 2 === 0 ? row : row.reverse()));
    }
    return out;
  }, []);
  const di: Record<number, View['players']> = {};
  for (const pl of v.players) {
    const s = tampil[pl.id] ?? pl.pos;
    if (s > 0) (di[s] ??= []).push(pl);
  }
  const lahir = v.players.filter((pl) => (tampil[pl.id] ?? pl.pos) === 0);
  return (
    <div className="tg-papan-wadah">
      <div className="tg-papan">
        <div className="tg-kotak-grid">
          {susun.map((s) => {
            const bisa = pilihKotak?.(s);
            return (
              <button key={s} className={`tg-kotak ${(Math.floor((s - 1) / 10) + s) % 2 ? 'b' : 'a'} ${sorot?.includes(s) ? 'sorot' : ''} ${bisa ? 'bisa' : ''} ${s === 100 ? 'finis' : ''}`} disabled={!bisa} onClick={() => bisa && onKotak?.(s)} data-kotak={s}>
                <span>{s}</span>
                {p.kotakKartu.includes(s) ? <Doodle id="kartu" size={18} color="currentColor" className="tg-ikon-kartu" /> : null}
                {s === 100 ? <Doodle id="bendera" size={26} color="currentColor" className="tg-ikon-kartu" /> : null}
              </button>
            );
          })}
        </div>
        <svg className="tg-svg" viewBox="0 0 1000 1000" aria-hidden>
          {p.tangga.map(([b, t]) => (
            <Tangga key={`t${b}`} b={b} t={t} />
          ))}
          {v.musim ? (v.musim.jenis === 'ular' ? <Ular h={v.musim.a} t={v.musim.b} i={7} bayang /> : <Tangga b={v.musim.a} t={v.musim.b} bayang />) : null}
          {p.ular.map(([h, t], i) => (
            <Ular key={`u${h}`} h={h} t={t} i={i} putus={p.putus.includes(h)} />
          ))}
        </svg>
        {Object.entries(di).map(([s, ps]) => {
          const [x, y] = pusat(Number(s));
          return ps.map((pl, k) => {
            const idx = v.players.findIndex((q) => q.id === pl.id);
            const off = ps.length > 1 ? [(k % 2 ? 1 : -1) * 14, (k >> 1 ? 1 : -1) * 14] : [0, 0];
            return (
              <span key={pl.id} className={`tg-pion ${v.giliran === pl.id ? 'giliran' : ''}`} style={{ left: `${x / 10}%`, top: `${y / 10}%`, translate: `calc(-50% + ${off[0]}%) calc(-50% + ${off[1]}%)`, '--c': PION[idx % PION.length] } as CSSProperties} data-testid={`tg-pion-${pl.name}`}>
                <PlayerFace avatar={pl.avatar} size={26} />
              </span>
            );
          });
        })}
      </div>
      {lahir.length ? (
        <div className="tg-lahir">
          <span className="tiny soft">belum masuk papan:</span>
          {lahir.map((pl) => (
            <span key={pl.id} className="tg-pion diam" style={{ '--c': PION[v.players.findIndex((q) => q.id === pl.id) % PION.length] } as CSSProperties}>
              <PlayerFace avatar={pl.avatar} size={22} />
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

const TITIK: Record<number, number[]> = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };
export function Dadu({ n, kocok, peran, onClick, kecil }: { n: number; kocok?: boolean; peran?: 'jalan' | 'dorong' | null; onClick?: () => void; kecil?: boolean }) {
  const [tampil, setTampil] = useState(n);
  useEffect(() => {
    if (!kocok) return setTampil(n);
    let k = 0;
    const t = setInterval(() => {
      setTampil(1 + Math.floor(Math.random() * 6));
      if (++k > 9) (clearInterval(t), setTampil(n));
    }, 70);
    return () => clearInterval(t);
  }, [n, kocok]);
  const El = onClick ? 'button' : 'span';
  return (
    <El className={`tg-dadu ${kocok ? 'kocok' : ''} ${peran ?? ''} ${kecil ? 'kecil' : ''}`} onClick={onClick} data-testid="tg-dadu">
      {Array.from({ length: 9 }, (_, i) => (
        <i key={i} className={TITIK[tampil]?.includes(i) ? 'on' : ''} />
      ))}
      {peran ? <em>{peran}</em> : null}
    </El>
  );
}

export function KartuAksi({ id, onClick, mati }: { id: tangga.KartuId; onClick?: () => void; mati?: boolean }) {
  const k = tangga.KARTU[id];
  const El = onClick ? 'button' : 'div';
  return (
    <El className={`tg-kartu ${mati ? 'mati' : ''}`} onClick={onClick} disabled={onClick ? mati : undefined} data-testid={`tg-kartu-${id}`}>
      <Doodle id={k.doodle} size={26} color="currentColor" />
      <b>{k.nama}</b>
    </El>
  );
}

export function AturanTangga() {
  return (
    <div className="ts-aturan">
      <p className="small">
        <b>Tujuan.</b> Sampai di kotak 100 lebih dulu. Tangga membawamu naik, kepala ular membuatmu turun ke ekornya. Harus pas di 100: kalau lebih, pionmu memantul mundur sisa langkahnya.
      </p>
      <p className="small">
        <b>Klasik.</b> Satu dadu, papan klasik. Dapat 6, jalan lagi.
      </p>
      <p className="small">
        <b>Jenius.</b> Lempar dua dadu. Satu dadu untuk jalanmu, dadu lainnya boleh untuk <b>mendorong lawan</b> yang berjarak paling jauh {tangga.JARAK_DORONG} kotak dari tempatmu mendarat. Dorong dia ke kepala ular, tapi hati-hati: salah hitung, dia malah naik tangga atau sampai di 100. Setiap orang hanya bisa didorong sekali per ronde. Dadu kembar: jalan lagi (paling banyak dua kali).
      </p>
      <p className="small">
        <b>Kotak kartu.</b> Berhenti di kotak bergambar kartu untuk mendapat kartu aksi (paling banyak {tangga.MAX_KARTU}). Satu kartu per giliran, dimainkan sebelum melempar.
      </p>
      <p className="small">
        <b>Musim.</b> Setiap {tangga.SIKLUS_MUSIM} ronde muncul ular atau tangga baru. Bayangannya sudah terlihat di papan sebelum muncul, jadi kamu bisa bersiap.
      </p>
      <span className="sd-label">kartu aksi</span>
      <div className="st-aturan-list">
        {Object.values(tangga.KARTU).map((k) => (
          <span key={k.id}>
            <b>
              {k.nama} ×{k.jumlah}
            </b>{' '}
            {k.efek}
          </span>
        ))}
      </div>
    </div>
  );
}
