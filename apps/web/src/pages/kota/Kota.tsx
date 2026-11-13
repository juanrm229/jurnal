/**
 * Kota Sangkala: peta ilustrasi yang bisa digeser dan dicubit. Wilayah diketuk
 * untuk didekati; saat cukup dekat, persil muncul. Penggeser zaman menua-kan
 * peta dan menampilkan rumah yang hidup pada tahun itu.
 */
import {
  KOTA_WILAYAH,
  KOTA_TAHUN,
  type KotaClaimWire,
  type KotaFigurWire,
  kotaFigurHidup,
  kotaTitikFigur,
  type KotaPlot,
  type KotaRegion,
  kotaBBox,
  kotaFree,
  kotaInside,
  kotaOpen,
  kotaPlots,
  kotaPeristiwaPada,
  kotaRegion,
} from '@sehari/core';
import { type CSSProperties, type PointerEvent as RPointerEvent, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { KOTA_IMG, kabarDilihat, liveAt, masaHidup, tanggal, useAlmanak, useKabar, useKota, useWargaKota } from '@/lib/kota';
import { navigate } from '@/lib/router';
import { store } from '@/lib/storage';
import { Doodle, Sheet } from '@/ui/kit';

const W = 2000;
const H = 1125;
/** Persil muncul mulai skala ini (piksel layar per satuan peta). */
const PLOT_AT = 1.7;

type View = { x: number; y: number; s: number };

export default function Kota() {
  const kota = useKota();
  const almanak = useAlmanak();
  // Peta mengingat posisi, zoom, dan tahun terakhir selama sesi ini.
  const saved = (() => {
    try {
      return JSON.parse(sessionStorage.getItem('kota.view') ?? 'null') as (View & { year: number }) | null;
    } catch {
      return null;
    }
  })();
  const [year, setYear] = useState(saved?.year ?? 2026);
  const yearRef = useRef(year);
  yearRef.current = year;
  const [scale, setScale] = useState(1);
  const [region, setRegion] = useState<KotaRegion | null>(null);
  const [plot, setPlot] = useState<KotaPlot | null>(null);
  const [intro, setIntro] = useState(() => !store.get('kota.intro'));
  const box = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const view = useRef<View>({ x: 0, y: 0, s: 1 });
  const size = useRef({ w: 390, h: 700 });
  const claims = kota.data?.claims ?? [];
  const kabar = useKabar();
  // Warga kota hadir di peta pada masa hidupnya, di tempat mereka biasa ditemui.
  const wargaQ = useWargaKota();
  const [figur, setFigur] = useState<KotaFigurWire | null>(null);
  const figurHidup = (wargaQ.data ?? [])
    .filter((f) => f.state === 'kanon' && kotaFigurHidup(f, year))
    .flatMap((f) => {
      const p = kotaTitikFigur(f);
      return p ? [{ f, p }] : [];
    });
  // Lampu jendela: di kertas malam (atau senja), peta ikut gelap dan rumah yang penulisnya
  // menulis dalam 24 jam terakhir menyala. Bisa juga diintip kapan saja.
  const malamOtomatis = typeof document !== 'undefined' && (document.documentElement.dataset.dark === '1' || ['malam', 'senja'].includes(document.documentElement.dataset.sky ?? ''));
  const [malam, setMalam] = useState(malamOtomatis);
  const menyala = claims.filter((c) => c.state === 'aktif' && c.menyala);
  const kabarBaru = !!kabar.data?.[0] && kabar.data[0].at > kabarDilihat();
  const openRegions = KOTA_WILAYAH.filter(kotaOpen);
  const plots = useMemo(() => openRegions.flatMap((r) => kotaPlots(r.id)), []);
  const byPlot = useMemo(() => {
    const m = new Map<string, KotaClaimWire[]>();
    for (const c of claims) m.set(c.plotId, [...(m.get(c.plotId) ?? []), c]);
    return m;
  }, [claims]);

  const minS = () => Math.max(size.current.w / W, size.current.h / H);
  const clamp = (v: View): View => {
    const s = Math.min(Math.max(v.s, minS()), Math.max(minS() * 3, 4.2));
    const x = Math.min(0, Math.max(size.current.w - W * s, v.x));
    const y = Math.min(0, Math.max(size.current.h - H * s, v.y));
    return { x, y, s };
  };
  const apply = (v: View, animate = false) => {
    view.current = clamp(v);
    const el = inner.current;
    if (!el) return;
    el.style.transition = animate ? 'transform 650ms cubic-bezier(0.2, 0.8, 0.2, 1)' : 'none';
    el.style.transform = `translate3d(${view.current.x}px, ${view.current.y}px, 0) scale(${view.current.s})`;
  };
  const commit = () => {
    setScale(view.current.s);
    try {
      sessionStorage.setItem('kota.view', JSON.stringify({ ...view.current, year: yearRef.current }));
    } catch {
      /* penyimpanan sesi tidak tersedia */
    }
  };
  /** Dekati sebuah kotak di peta. */
  const focus = (r: KotaRegion) => {
    const { w, h } = size.current;
    const b = kotaBBox(r.poly);
    const fit = Math.min((w * 0.85) / (b.x1 - b.x0), (h * 0.6) / (b.y1 - b.y0));
    // Wilayah yang dibuka didekati sampai persilnya terlihat; pusatnya di label wilayah.
    const s = clamp({ ...view.current, s: kotaOpen(r) ? Math.max(fit, PLOT_AT * 1.12) : fit }).s;
    const [cx, cy] = r.label;
    apply({ s, x: w / 2 - cx * s, y: h * 0.45 - cy * s }, true);
    setTimeout(commit, 660);
  };

  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const fit = () => {
      size.current = { w: el.clientWidth, h: el.clientHeight };
      const s = minS();
      // Awal: Bantaran Kali di tengah, wilayah pertama yang dibuka.
      if (saved) apply(saved);
      else apply({ s: s * 1.15, x: size.current.w / 2 - 760 * s * 1.15, y: size.current.h / 2 - 540 * s * 1.15 });
      commit();
    };
    fit();
    const ro = new ResizeObserver(() => {
      size.current = { w: el.clientWidth, h: el.clientHeight };
      apply(view.current);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Geser satu jari, cubit dua jari, gulir roda. Ketukan pendek memilih persil atau wilayah.
  const pts = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<{ moved: number; t: number; pinch?: { d: number; s: number; mx: number; my: number } } | null>(null);
  const local = (e: { clientX: number; clientY: number }) => {
    const r = box.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  const down = (e: RPointerEvent) => {
    box.current!.setPointerCapture(e.pointerId);
    pts.current.set(e.pointerId, local(e));
    if (pts.current.size === 1) gesture.current = { moved: 0, t: Date.now() };
    if (pts.current.size === 2) {
      const [a, b] = [...pts.current.values()];
      gesture.current = { moved: 99, t: 0, pinch: { d: Math.hypot(a!.x - b!.x, a!.y - b!.y), s: view.current.s, mx: (a!.x + b!.x) / 2, my: (a!.y + b!.y) / 2 } };
    }
  };
  const move = (e: RPointerEvent) => {
    const prev = pts.current.get(e.pointerId);
    if (!prev || !gesture.current) return;
    const p = local(e);
    pts.current.set(e.pointerId, p);
    const v = view.current;
    if (pts.current.size === 1) {
      gesture.current.moved += Math.abs(p.x - prev.x) + Math.abs(p.y - prev.y);
      apply({ ...v, x: v.x + p.x - prev.x, y: v.y + p.y - prev.y });
    } else if (pts.current.size === 2 && gesture.current.pinch) {
      const [a, b] = [...pts.current.values()];
      const g = gesture.current.pinch;
      const s = clamp({ ...v, s: (g.s * Math.hypot(a!.x - b!.x, a!.y - b!.y)) / g.d }).s;
      const mx = (a!.x + b!.x) / 2;
      const my = (a!.y + b!.y) / 2;
      const wx = (mx - v.x) / v.s;
      const wy = (my - v.y) / v.s;
      apply({ s, x: mx - wx * s, y: my - wy * s });
    }
  };
  const up = (e: RPointerEvent) => {
    const g = gesture.current;
    pts.current.delete(e.pointerId);
    if (pts.current.size) return;
    gesture.current = null;
    commit();
    if (g && g.moved < 8 && Date.now() - g.t < 500) tap(local(e));
  };
  const wheel = (e: React.WheelEvent) => {
    const p = local(e);
    const v = view.current;
    const s = clamp({ ...v, s: v.s * Math.exp(-e.deltaY * 0.0016) }).s;
    const wx = (p.x - v.x) / v.s;
    const wy = (p.y - v.y) / v.s;
    apply({ s, x: p.x - wx * s, y: p.y - wy * s });
    clearTimeout((wheel as unknown as { t?: number }).t);
    (wheel as unknown as { t?: number }).t = window.setTimeout(commit, 120);
  };
  const tap = (p: { x: number; y: number }) => {
    const v = view.current;
    const w: [number, number] = [(p.x - v.x) / v.s, (p.y - v.y) / v.s];
    // Warga kota lebih dulu: penandanya kecil dan berdiri di atas rumah-rumah.
    const dekat = figurHidup.map((f) => ({ f, d: Math.hypot(f.p[0] - w[0], f.p[1] - w[1]) })).sort((a, b) => a.d - b.d)[0];
    if (dekat && dekat.d < 14 / v.s) {
      setPlot(null);
      setFigur(dekat.f.f);
      navigator.vibrate?.(6);
      return;
    }
    if (v.s >= PLOT_AT) {
      let best: KotaPlot | null = null;
      let bd = 16 / v.s;
      for (const q of plots) {
        const d = Math.hypot(q.x - w[0], q.y - w[1]);
        if (d < bd) {
          bd = d;
          best = q;
        }
      }
      if (best) {
        setRegion(null);
        setPlot(best);
        navigator.vibrate?.(6);
        return;
      }
    }
    const r = KOTA_WILAYAH.find((x) => kotaInside(w, x.poly));
    setPlot(null);
    setRegion(r ?? null);
  };

  const sepia = Math.max(0, Math.min(1, (2026 - year) / 126));
  const lbl = 15 / scale;
  const showPlots = scale >= PLOT_AT;

  return (
    <main className="kota" data-testid="kota">
      <div ref={box} className="kp-view" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onWheel={wheel}>
        <div ref={inner} className="kp-world" style={{ width: W, height: H, backgroundImage: `url(${KOTA_IMG.kecil})` }}>
          <img className="kp-img" src={KOTA_IMG.sedang} alt="Peta ilustrasi Kota Sangkala" draggable={false} style={{ filter: `sepia(${(sepia * 0.7).toFixed(2)}) saturate(${(1 - sepia * 0.3).toFixed(2)})` }} />
          {scale > 1.25 ? <img className="kp-img" src={KOTA_IMG.besar} alt="" aria-hidden draggable={false} style={{ filter: `sepia(${(sepia * 0.7).toFixed(2)}) saturate(${(1 - sepia * 0.3).toFixed(2)})` }} /> : null}
          {malam ? <div className="kp-malam" aria-hidden /> : null}
          <svg className="kp-svg" viewBox={`0 0 ${W} ${H}`} width={W} height={H} aria-hidden>
            <defs>
              <radialGradient id="kp-lampu">
                <stop offset="0%" stopColor="#fff6c8" stopOpacity="1" />
                <stop offset="25%" stopColor="#ffd56b" stopOpacity="0.85" />
                <stop offset="100%" stopColor="#ffb13b" stopOpacity="0" />
              </radialGradient>
              <pattern id="kp-kosong" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(35)">
                <rect width="10" height="10" fill="#efe6cf" fillOpacity="0.55" />
                <path d="M0 5 H10" stroke="#a08a5c" strokeOpacity="0.45" strokeWidth="1.2" />
              </pattern>
            </defs>
            {KOTA_WILAYAH.map((r) => {
              const open = kotaOpen(r);
              const sel = region?.id === r.id;
              const pts = r.poly.map((p) => p.join(',')).join(' ');
              return (
                <g key={r.id}>
                  {year < r.since ? <polygon points={pts} fill="url(#kp-kosong)" /> : null}
                  <polygon points={pts} className={`kp-reg ${open ? 'buka' : ''} ${sel ? 'pilih' : ''}`} style={{ strokeWidth: (sel ? 3 : open ? 2 : 0) / scale }} />
                </g>
              );
            })}
            {showPlots
              ? plots.map((q) => {
                  const cs = byPlot.get(q.id) ?? [];
                  const live = cs.find((c) => liveAt(c, year));
                  const cls = live ? (live.mine ? 'milikku' : 'huni') : cs.some((c) => c.state === 'aktif') ? 'lain' : 'lowong';
                  return <circle key={q.id} cx={q.x} cy={q.y} r={(cls === 'lowong' ? 2.4 : 3.8) / scale + (cls === 'lowong' ? 0.9 : 1.6)} className={`kp-persil ${cls} ${plot?.id === q.id ? 'pilih' : ''}`} style={{ strokeWidth: 1.4 / scale }} />;
                })
              : claims
                  .filter((c) => liveAt(c, year))
                  .map((c) => {
                    const q = plots.find((x) => x.id === c.plotId);
                    return q ? <circle key={c.id} cx={q.x} cy={q.y} r={7 / scale} className={`kp-rumah ${c.mine ? 'milikku' : ''}`} style={{ strokeWidth: 2 / scale }} /> : null;
                  })}
            {malam
              ? menyala.map((c) => {
                  const q = plots.find((x) => x.id === c.plotId);
                  return q ? (
                    <g key={`l${c.id}`} className="kp-lampu" data-testid="kota-lampu">
                      <circle cx={q.x} cy={q.y} r={24 / Math.sqrt(scale)} fill="url(#kp-lampu)" />
                      <circle cx={q.x} cy={q.y} r={1.6 / Math.sqrt(scale)} fill="#fffbe6" />
                    </g>
                  ) : null;
                })
              : null}
            {figurHidup.map(({ f, p }) => (
              <g key={f.id} transform={`translate(${p[0]} ${p[1]})`} className={`kp-figur ${figur?.id === f.id ? 'pilih' : ''}`} data-testid="kota-figur">
                <rect x={-7 / scale} y={-7 / scale} width={14 / scale} height={14 / scale} rx={2.5 / scale} transform="rotate(45)" style={{ strokeWidth: 1.6 / scale }} />
                <text y={4 / scale} style={{ fontSize: 10 / scale }}>
                  {f.name.replace(/^(dr\.|Pak|Bu|Mbah|Wak|Ma|Bang|Koh|Nyai|Cik|Mbok|Kapten|Mang|Babah|Nenek|Mamak|Mandor|Oom|Ki|Teh|Sinyo|Mbak|Bu Guru|Pak Mantri)\s+/i, '').slice(0, 1)}
                </text>
              </g>
            ))}
            {plot ? <circle cx={plot.x} cy={plot.y} r={14 / scale} className="kp-cincin" style={{ strokeWidth: 2.4 / scale }} /> : null}
            {KOTA_WILAYAH.map((r) => (
              <text key={r.id} x={r.label[0]} y={r.label[1]} className={`kp-label ${kotaOpen(r) ? 'buka' : ''}`} style={{ fontSize: lbl * (kotaOpen(r) ? 1.25 : 1), strokeWidth: lbl / 3.2, opacity: showPlots && !kotaOpen(r) ? 0.4 : 1 }}>
                {r.name}
              </text>
            ))}
          </svg>
        </div>
      </div>

      <header className="kp-head">
        <button className="kp-glass kp-back" aria-label="kembali" onClick={() => navigate('/main')}>
          <Doodle id="ui-kembali" size={20} />
        </button>
        <div className="kp-glass kp-title">
          <span className="kp-musim">{malam ? `malam di Sangkala · ${menyala.length} jendela menyala` : 'kota sehari · musim 1'}</span>
          <b>Kota Sangkala</b>
        </div>
        <button className="kp-glass kp-almanak kp-kabar" onClick={() => navigate('/kota/kabar')} aria-label={kabarBaru ? 'kabar kota, ada yang baru' : 'kabar kota'} data-testid="kota-kabar">
          <Doodle id="surat-terbuka" size={18} color="currentColor" />
          {kabarBaru ? <span className="kp-titik" aria-hidden /> : null}
        </button>
        <button className="kp-glass kp-almanak" onClick={() => navigate('/kota/almanak')} aria-label="almanak kota" data-testid="kota-almanak">
          <Doodle id="buku-terbuka" size={18} color="currentColor" />
        </button>
        <button className="kp-glass kp-rumahku" onClick={() => navigate('/kota/meja')} aria-label="meja tulis: rumah, tokoh, dan jatahmu" title="meja tulis" data-testid="kota-rumahku">
          <Doodle id="pena" size={20} color="currentColor" />
        </button>
      </header>

      <section className="kp-glass kp-zaman" aria-label="penggeser zaman">
        <div className="kp-zaman-top">
          <b>{year}</b>
          <button className={`kp-malam-btn ${malam ? 'on' : ''}`} onClick={() => setMalam(!malam)} aria-pressed={malam} aria-label={malam ? 'kembali ke siang' : 'lihat kota di malam hari'} data-testid="kota-malam">
            {malam ? '☾' : '☼'}
          </button>
          <span className="tiny">
            {claims.filter((c) => liveAt(c, year)).length} rumah hidup tahun ini · {showPlots ? 'ketuk persil' : 'ketuk wilayah bergaris'}
          </span>
        </div>
        <input className="kp-range" type="range" min={KOTA_TAHUN.min} max={2026} value={year} onChange={(e) => setYear(Number(e.target.value))} onPointerUp={() => setTimeout(commit, 0)} aria-label="tahun" data-testid="kota-tahun" />
        <div className="kp-zaman-ticks tiny">
          <span>1900</span>
          <span>1940</span>
          <span>1980</span>
          <span>sekarang</span>
        </div>
        {(() => {
          const kanon = (almanak.data ?? []).filter((e) => e.state === 'kanon');
          const now = kotaPeristiwaPada(kanon, year)[0] ?? [...kanon].filter((e) => e.year <= year).sort((a, b) => b.year - a.year)[0];
          return now ? (
            <button key={now.id} className="kp-peristiwa" onClick={() => navigate(`/kota/peristiwa/${now.id}`)} data-testid="kota-peristiwa">
              <span className={`kp-peristiwa-titik ${now.year === year ? 'kini' : ''}`} aria-hidden />
              <span className="grow">
                <b>{now.title}</b>
                <span className="tiny">
                  {tanggal(now)} · {now.regions.length ? now.regions.map((r) => kotaRegion(r)?.name).join(', ') : 'seluruh kota'}
                  {now.testimonies ? ` · ${now.testimonies} kesaksian` : ''}
                </span>
              </span>
              <Doodle id="ui-panah-kanan" size={14} />
            </button>
          ) : null;
        })()}
      </section>

      {intro ? (
        <div className="kp-intro" role="dialog" aria-label="selamat datang di Kota Sangkala">
          <div className="kp-intro-card">
            <span className="kp-musim">musim 1 · tiga wilayah dibuka</span>
            <h2>Kota yang ditulis warganya.</h2>
            <p>Sangkala: kalimat yang menyimpan tahun. Patok satu rumah yang tergambar di Lorong Sumbu, Kampung Tiang Seribu, atau Gang Tujuh Lonceng, pada rentang tahun yang kamu pilih, lalu hidupkan keluarganya lewat adegan. Satu alamat bisa punya penghuni berbeda dari zaman ke zaman.</p>
            <button
              className="btn"
              onClick={() => {
                store.set('kota.intro', '1');
                setIntro(false);
                focus(kotaRegion('lorongsumbu')!);
              }}
              data-testid="kota-mulai">
              jelajahi kota
            </button>
          </div>
        </div>
      ) : null}

      <Sheet open={!!region} onClose={() => setRegion(null)} title={region?.name}>
        {region ? <RegionSheet r={region} claims={claims} year={year} onFocus={() => (focus(region), setRegion(null))} /> : null}
      </Sheet>
      <Sheet open={!!figur} onClose={() => setFigur(null)} title={figur?.name}>
        {figur ? (
          <div className="col kp-figur-kartu" style={{ gap: 8 }}>
            {figur.julukan ? <span className="rj-julukan">{figur.julukan}</span> : null}
            <span className="tiny soft">
              {figur.tempat} · {kotaRegion(figur.region)?.name} · {masaHidup(figur)}
            </span>
            <p className="small" style={{ margin: 0, fontFamily: 'var(--serif)', lineHeight: 1.5 }}>
              {figur.ciri}
            </p>
            <span className="tiny soft">
              Pada {year} ia {figur.born ? `berumur ${year - figur.born} tahun` : 'ada di sini'}. {figur.jumpa ? `${figur.jumpa} rumah pernah menuliskan perjumpaan dengannya.` : 'Belum ada rumah yang menuliskan perjumpaan dengannya.'}
            </span>
            <button className="btn soft" onClick={() => navigate(`/kota/warga/${figur.id}`)} data-testid="kota-figur-lembar">
              buka lembar warganya
            </button>
          </div>
        ) : null}
      </Sheet>
      <Sheet open={!!plot} onClose={() => setPlot(null)} title={plot?.address}>
        {plot ? <PlotSheet p={plot} claims={byPlot.get(plot.id) ?? []} sisa={kota.data ? kota.data.me.patok.maks - kota.data.me.patok.pakai : 0} punya={(kota.data?.me.patok.pakai ?? 0) > 0} /> : null}
      </Sheet>
    </main>
  );
}

function RegionSheet({ r, claims, year, onFocus }: { r: KotaRegion; claims: KotaClaimWire[]; year: number; onFocus: () => void }) {
  const open = kotaOpen(r);
  const here = claims.filter((c) => c.regionId === r.id && c.state === 'aktif');
  return (
    <div className="col" style={{ gap: 12 }}>
      <p className="kp-watak">{r.watak}</p>
      <div className="row wrap" style={{ gap: 6 }}>
        <span className={`kp-tag ${open ? 'buka' : ''}`}>{open ? 'dibuka musim ini' : r.musim === null ? 'segera dibuka' : `dibuka musim ${r.musim}`}</span>
        <span className="kp-tag">dihuni sejak {r.since < 1900 ? 'dulu sekali' : r.since}</span>
        {open ? (
          <span className="kp-tag">
            {here.length} rumah · {kotaPlots(r.id).length} persil
          </span>
        ) : null}
      </div>
      {year < r.since ? <p className="tiny soft">Pada {year}, wilayah ini belum dihuni.</p> : null}
      {year >= r.since ? (
        <button className="btn soft" onClick={() => navigate(`/kota/jalan/${r.id}?tahun=${year}`)} data-testid="kota-jalan">
          jalan-jalan di sini, tahun {year}
        </button>
      ) : null}
      {open ? (
        <button className="btn" onClick={onFocus} data-testid="kota-dekati">
          dekati dan lihat persilnya
        </button>
      ) : (
        <p className="small soft">Wilayah ini belum bisa dipatok. Ceritanya masih bisa disebut dari rumah-rumah di wilayah yang dibuka.</p>
      )}
    </div>
  );
}

function PlotSheet({ p, claims, sisa, punya }: { p: KotaPlot; claims: KotaClaimWire[]; sisa: number; punya: boolean }) {
  const r = kotaRegion(p.region)!;
  const live = claims.filter((c) => c.state === 'aktif').sort((a, b) => a.from - b.from);
  const free = kotaFree(live, Math.max(KOTA_TAHUN.min, r.since));
  const span = KOTA_TAHUN.max - KOTA_TAHUN.min;
  const pct = (y: number) => `${((y - KOTA_TAHUN.min) / span) * 100}%`;
  return (
    <div className="col" style={{ gap: 12 }}>
      <span className="tiny soft">{r.name}</span>
      <div className="kp-lapis" aria-label="lapisan zaman persil ini">
        {r.since > KOTA_TAHUN.min ? <span className="kp-lapis-k kosong" style={{ left: 0, width: pct(r.since) }} /> : null}
        {live.map((c) => (
          <span key={c.id} className={`kp-lapis-k ${c.mine ? 'milikku' : 'huni'}`} style={{ left: pct(c.from), width: `calc(${pct(c.to + 1)} - ${pct(c.from)})` } as CSSProperties} title={`${c.household} ${c.from}–${c.to}`} />
        ))}
      </div>
      <div className="kp-lapis-ticks tiny soft">
        <span>1900</span>
        <span>1965</span>
        <span>2030</span>
      </div>
      {live.length ? (
        <div className="col" style={{ gap: 8 }}>
          {live.map((c) => (
            <button key={c.id} className="card kp-penghuni" onClick={() => navigate(`/kota/rumah/${c.id}`)} data-testid="kota-penghuni">
              <span className="grow">
                <b>{c.household}</b>
                <span className="tiny soft">
                  {c.from}–{c.to} · oleh {c.penName} · {c.scenes} adegan
                </span>
              </span>
              <Doodle id="ui-panah-kanan" size={16} />
            </button>
          ))}
        </div>
      ) : (
        <p className="small soft">Belum pernah ada yang tinggal di sini. Alamat ini menunggu keluarga pertamanya.</p>
      )}
      {claims.some((c) => c.state === 'terbengkalai') ? <p className="tiny soft">Ada bekas penghuni yang pergi tanpa cerita. Kini tinggal desas-desus.</p> : null}
      {free.length ? (
        sisa > 0 ? (
          <button className="btn" onClick={() => navigate(`/kota/patok/${p.id}`)} data-testid="kota-patok">
            {punya ? 'patok rumah keluarga di sini' : 'patok persil ini'} · lowong {free.map((f) => `${f.from}–${f.to === KOTA_TAHUN.max ? 'kini' : f.to}`).join(', ')}
          </button>
        ) : (
          <p className="tiny soft">Jatah 3 patok musim ini sudah terpakai. Lepaskan salah satu rumahmu untuk mematok di sini.</p>
        )
      ) : (
        <p className="tiny soft">Semua zaman di alamat ini sudah dihuni.</p>
      )}
    </div>
  );
}
