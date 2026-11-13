/** Silsilah di atas peta: rumah-rumah yang tersambung, garis antar-alamat, dan generasi. */
import { KOTA_HUBUNGAN, kotaPlot } from '@sehari/core';
import { type CSSProperties, useLayoutEffect, useRef, useState } from 'react';
import { KOTA_IMG, kalimat, useSilsilah } from '@/lib/kota';
import { navigate, useParams } from '@/lib/router';
import { Doodle, Growing } from '@/ui/kit';

const KELUARGA = new Set(['anak', 'orangtua', 'saudara', 'pasangan', 'keturunan', 'leluhur']);
const WARNA = ['#c2371f', '#2a14d6', '#1f7a4d', '#b8860b', '#7b3fb8', '#0f6f8f', '#b2456e'];

export default function Silsilah() {
  const { id } = useParams<{ id: string }>();
  const q = useSilsilah(id);
  const box = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(358);
  useLayoutEffect(() => {
    if (box.current) setW(box.current.clientWidth);
  }, [q.data]);
  const t = q.data;
  if (!t) return q.isError ? <Growing label="rumah ini tidak ditemukan" /> : <Growing label="menelusuri garis keluarga…" />;
  const pts = new Map(t.claims.map((c) => [c.id, kotaPlot(c.plotId)]));
  const xs = [...pts.values()].filter(Boolean).map((p) => p!.x);
  const ys = [...pts.values()].filter(Boolean).map((p) => p!.y);
  // Ruang ekstra di kanan untuk label rumah.
  const b = { x0: Math.min(...xs) - 60, x1: Math.max(...xs) + 240, y0: Math.min(...ys) - 70, y1: Math.max(...ys) + 70 };
  const h = Math.min(440, Math.max(260, (w * (b.y1 - b.y0)) / (b.x1 - b.x0)));
  const s = Math.min(w / (b.x1 - b.x0), h / (b.y1 - b.y0), 3);
  const ox = w / 2 - ((b.x0 + b.x1) / 2) * s;
  const oy = h / 2 - ((b.y0 + b.y1) / 2) * s;
  const color = (cid: string) => WARNA[Math.max(0, t.claims.findIndex((c) => c.id === cid)) % WARNA.length]!;
  const root = t.claims.find((c) => c.id === id);
  // Tokoh pindahan dihitung sekali: salinannya disembunyikan bila tokoh asalnya ikut tampil.
  const lifes = t.tokoh.filter((x) => x.born && !(x.asal && t.tokoh.some((y) => y.id === x.asal)));
  const sama = t.sama ?? [];
  const y0 = Math.min(1900, ...lifes.map((x) => x.born!));
  const span = 2030 - y0;

  return (
    <main className="screen kota-silsilah">
      <header className="hdr">
        <button className="hdr-back" aria-label="kembali" onClick={() => navigate(`/kota/rumah/${id}`)}>
          <Doodle id="ui-kembali" size={20} />
        </button>
        <div className="hdr-text">
          <div className="hdr-title">Silsilah {root?.household ?? ''}</div>
          <div className="hdr-sub">
            {t.claims.length} rumah · {new Set(t.claims.map((c) => c.penName)).size} penulis
          </div>
        </div>
      </header>

      <div ref={box} className="ks-peta" style={{ height: h }}>
        <div className="ks-dunia" style={{ transform: `translate(${ox}px, ${oy}px) scale(${s})` }}>
          <img src={KOTA_IMG.sedang} alt="" aria-hidden draggable={false} />
          <svg viewBox="0 0 2000 1125" width={2000} height={1125} role="img" aria-label="garis hubungan antar-rumah di peta">
            {t.relations.map((r) => {
              const a = pts.get(r.fromClaimId);
              const c = pts.get(r.toClaimId);
              if (!a || !c) return null;
              const mx = (a.x + c.x) / 2;
              const my = (a.y + c.y) / 2 - Math.hypot(a.x - c.x, a.y - c.y) * 0.28;
              return (
                <path
                  key={r.id}
                  d={`M${a.x} ${a.y} Q${mx} ${my} ${c.x} ${c.y}`}
                  fill="none"
                  stroke={KELUARGA.has(r.type) ? '#c2371f' : '#2a14d6'}
                  strokeWidth={3 / s}
                  strokeDasharray={r.state === 'desas' ? `${6 / s} ${6 / s}` : undefined}
                  strokeLinecap="round"
                  className="ks-garis"
                />
              );
            })}
            {sama.map((x) => {
              const a = pts.get(x.a);
              const c = pts.get(x.b);
              if (!a || !c) return null;
              return (
                <g key={`${x.a}${x.b}`} className="ks-garis">
                  <line x1={a.x} y1={a.y} x2={c.x} y2={c.y} stroke="rgba(255,255,255,0.85)" strokeWidth={4 / s} strokeLinecap="round" />
                  <line x1={a.x} y1={a.y} x2={c.x} y2={c.y} stroke="#0b6b3a" strokeWidth={5 / s} strokeDasharray={`${0.1 / s} ${8 / s}`} strokeLinecap="round" />
                </g>
              );
            })}
            {t.claims.map((c) => {
              const p = pts.get(c.id);
              if (!p) return null;
              return (
                <g key={c.id} transform={`translate(${p.x} ${p.y})`} className="ks-simpul" onClick={() => navigate(`/kota/rumah/${c.id}`)}>
                  <circle r={(c.id === id ? 11 : 8) / s} fill={color(c.id)} stroke="#fff" strokeWidth={2.5 / s} />
                  <text x={13 / s} y={4 / s} fontSize={13 / s} strokeWidth={4 / s}>
                    {c.household} · {c.from}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      </div>
      <div className="ks-legenda tiny">
        <span>
          <i style={{ background: '#c2371f' }} /> keluarga
        </span>
        <span>
          <i style={{ background: '#2a14d6' }} /> kenalan, musuh, cinta
        </span>
        <span>
          <i className="putus" /> desas-desus
        </span>
        {sama.length ? (
          <span>
            <i className="titik" /> orang yang sama
          </span>
        ) : null}
      </div>

      {lifes.length ? (
        <section className="section">
          <span className="label">generasi</span>
          <div className="ks-generasi">
            {lifes
              .sort((a, b2) => a.born! - b2.born!)
              .map((x, i) => (
                <div key={x.id} className="ks-hidup" style={{ '--n': i } as CSSProperties}>
                  <span className="ks-nama">{x.name}</span>
                  <span className="ks-jalur">
                    <span style={{ left: `${((x.born! - y0) / span) * 100}%`, width: `${(((x.died ?? 2030) - x.born!) / span) * 100}%`, background: color(x.claimId) }} />
                  </span>
                </div>
              ))}
            <div className="ks-tahun tiny">
              <span>{y0}</span>
              <span>{Math.round((y0 + 2030) / 2)}</span>
              <span>2030</span>
            </div>
          </div>
        </section>
      ) : null}

      <section className="section">
        <span className="label">hubungan</span>
        <div className="col" style={{ gap: 8 }}>
          {t.relations.map((r) => {
            const k = kalimat(r, t, r.fromClaimId);
            return (
              <p key={r.id} className={`ks-kalimat ${r.state}`}>
                <b>{k.aku}</b> adalah {KOTA_HUBUNGAN[r.type].label} dari <b>{k.dia}</b>
                <span className="tiny soft"> · {r.state === 'kanon' ? 'kanon' : 'desas-desus'}</span>
              </p>
            );
          })}
          {sama.map((x) => (
            <p key={`${x.a}${x.b}`} className="ks-kalimat sama">
              <b>{x.tokoh}</b> tinggal di <b>{t.claims.find((c) => c.id === x.b)?.household}</b> dan <b>{t.claims.find((c) => c.id === x.a)?.household}</b>
              <span className="tiny soft"> · orang yang sama</span>
            </p>
          ))}
        </div>
      </section>
    </main>
  );
}
