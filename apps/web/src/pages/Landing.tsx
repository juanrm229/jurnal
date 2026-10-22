/**
 * Halaman depan. Bukan brosur — selembar jurnal yang bisa langsung dimainkan,
 * dan pengingat pelan bahwa hari ini tidak akan terulang.
 */
import { COPY, dayName, dayOfYear, daysInYear, type DropPayload, formatDayLong, type MoodCode, MOODS, type PageLayout } from '@sehari/core';
import { gardenDoodleFor, getScene, sceneToSvg } from '@sehari/doodles';
import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { Page, type PageItem } from '@/editor/Page';
import { Link, navigate } from '@/lib/router';
import { useSession } from '@/lib/session';
import { applyTheme, currentTheme, INKS, PAPERS, setTheme } from '@/lib/theme';
import { Scene } from '@/ui/art';
import { Doodle } from '@/ui/kit';

const localDay = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/** Sekali terlihat, tetap terlihat. */
function useInView<T extends Element>(margin = '-12% 0px') {
  const ref = useRef<T>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || seen) return;
    const io = new IntersectionObserver(([e]) => e?.isIntersecting && setSeen(true), { rootMargin: margin });
    io.observe(el);
    return () => io.disconnect();
  }, [seen, margin]);
  return [ref, seen] as const;
}

function Reveal({ children, className = '', delay = 0, as = 'div' }: { children: ReactNode; className?: string; delay?: number; as?: 'div' | 'section' }) {
  const [ref, seen] = useInView<HTMLDivElement>();
  const Tag = as;
  return (
    <Tag ref={ref} className={`reveal ${seen ? 'in' : ''} ${className}`} style={{ transitionDelay: `${delay}s` }}>
      {children}
    </Tag>
  );
}

/** Scene yang baru mulai menggambar saat masuk layar. */
function LazyScene({ id, speed, className }: { id: string; speed?: number; className?: string }) {
  const [ref, seen] = useInView<HTMLDivElement>('-8% 0px');
  return (
    <div ref={ref} className={className} style={{ minHeight: 40 }}>
      {seen ? <Scene id={id} speed={speed} /> : <div style={{ aspectRatio: getScene(id)?.viewBox.endsWith('320 480') ? '2/3' : '3/2' }} />}
    </div>
  );
}

function useCountdown() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  const end = new Date(now);
  end.setHours(24, 0, 0, 0);
  const s = Math.max(0, Math.floor((end.getTime() - now.getTime()) / 1000));
  const pad = (n: number) => String(n).padStart(2, '0');
  return { h: pad(Math.floor(s / 3600)), m: pad(Math.floor((s % 3600) / 60)), s: pad(s % 60), now };
}

const FLOAT: [string, number, number, number, number][] = [
  // id, kiri %, atas %, ukuran px, putar — di pinggir supaya tak menimpa teks
  ['kupu-kupu', 88, 8, 56, 14],
  ['bunga-matahari', 2, 88, 64, -12],
  ['hati-kecil', 58, 4, 30, 8],
  ['bulan', 94, 60, 40, -6],
  ['kilau', 46, 12, 26, 0],
  ['not-balok', 84, 92, 44, -10],
  ['kopi-susu', 40, 95, 46, 6],
  ['bintang-kecil', 70, 26, 26, 0],
  ['lebah', 60, 50, 36, -4],
  ['daun-kering', 96, 34, 36, 18],
];

export default function Landing() {
  const { status } = useSession();
  const signedIn = status === 'ready';
  const day = localDay();
  const n = dayOfYear(day);
  const total = daysInYear(Number(day.slice(0, 4)));
  const cd = useCountdown();
  const [install, setInstall] = useState<null | { prompt: () => void }>(null);

  useEffect(() => {
    const f = (e: Event) => {
      e.preventDefault();
      setInstall(e as unknown as { prompt: () => void });
    };
    window.addEventListener('beforeinstallprompt', f);
    return () => window.removeEventListener('beforeinstallprompt', f);
  }, []);

  const start = () => navigate(signedIn ? '/hari' : '/masuk');
  const cta = signedIn ? 'buka halaman hari ini' : 'mulai halaman pertama';

  return (
    <div className="landing">
      <nav className="l-nav">
        <Link to="/" className="row">
          <Doodle id="tunas" size={30} draw />
          <span className="h2">sehari</span>
        </Link>
        <div className="row">
          <a href="#coba" className="pill hide-sm">coba</a>
          <a href="#tinta" className="pill hide-sm">tinta</a>
          <button className="pill active" onClick={start}>{signedIn ? 'jurnalku' : 'masuk'}</button>
        </div>
      </nav>

      {/* 1 — Hari ini cuma terjadi sekali */}
      <header className="l-hero">
        <div className="l-float" aria-hidden>
          {FLOAT.map(([id, x, y, s, r], i) => (
            <span key={id} style={{ left: `${x}%`, top: `${y}%`, transform: `rotate(${r}deg)`, animationDelay: `${i * 0.4}s` }}>
              <Doodle id={id} size={s} draw={0.4 + i * 0.12} />
            </span>
          ))}
        </div>
        <div className="l-hero-inner">
          <p className="l-kicker">
            {dayName(day)}, {formatDayLong(day)} · hari ke-{n} dari {total}
          </p>
          <h1 className="l-title">
            <span className="ln" style={{ animationDelay: '.2s' }}>hari ini</span>
            <span className="ln" style={{ animationDelay: '.9s' }}>cuma terjadi</span>
            <span className="ln hand-under" style={{ animationDelay: '1.6s' }}>
              sekali.
              <svg viewBox="0 0 300 30" aria-hidden className="draw" preserveAspectRatio="none">
                <path d="M4 20 C 70 8, 150 26, 296 10" pathLength={1} stroke="currentColor" strokeWidth={4} fill="none" strokeLinecap="round" style={{ animationDelay: '2.3s' }} />
              </svg>
            </span>
          </h1>
          <div className="l-clock" aria-label="waktu tersisa hari ini">
            <span>{cd.h}</span>:<span>{cd.m}</span>:<span className="tick">{cd.s}</span>
          </div>
          <p className="l-clock-cap">lagi, lalu hari ini jadi kemarin — untuk selamanya.</p>
          <p className="l-lead">
            Sehari adalah kapsul waktu kecil yang kamu isi bersama orang-orang yang kamu pilih. Satu foto, satu kalimat, satu warna. Malamnya disegel. Lalu dibuka berdampingan.
          </p>
          <div className="row l-cta">
            <button className="btn auto" onClick={start}>
              {cta} <Doodle id="ui-panah-kanan" size={18} color="currentColor" />
            </button>
            <a href="#coba" className="btn ghost auto">coba dulu di sini</a>
          </div>
          <p className="tiny soft">gratis · tanpa iklan · terenkripsi end-to-end · bisa dipasang di layar utama</p>
        </div>
        <div className="l-hero-art">
          <Scene id="senja-laut" speed={0.8} />
        </div>
      </header>

      {/* 2 — Halaman yang bisa dimainkan */}
      <section id="coba" className="l-sec">
        <Reveal className="l-head">
          <span className="label">coba sekarang</span>
          <h2 className="l-h2">halaman ini milikmu.</h2>
          <p className="soft">Seret fotonya. Putar dari sudut. Ketuk kertas kosong untuk menulis. Tempel fotomu sendiri — tidak ada yang terkirim ke mana pun.</p>
        </Reveal>
        <Playground />
      </section>

      {/* 3 — Dua jendela */}
      <section className="l-sec l-two">
        <Reveal className="l-head">
          <span className="label">bersama, tapi tanpa saling mengintip</span>
          <h2 className="l-h2">kalian menulis di dua jendela.</h2>
          <p className="soft">Dia tidak bisa melihat halamanmu sebelum kamu menyegelnya, dan sebaliknya. Saat keduanya sudah tersegel, kapsul terbuka berdampingan — seperti membaca surat yang ditulis di hari yang sama, dari dua kota.</p>
        </Reveal>
        <TwoWindows />
      </section>

      {/* 4 — Tahun yang lewat */}
      <section className="l-sec">
        <Reveal className="l-head">
          <span className="label">{new Date().getFullYear()}</span>
          <h2 className="l-h2">
            sudah {n - 1} hari berlalu tahun ini.
            <br />
            <span className="ink">berapa yang kamu ingat?</span>
          </h2>
        </Reveal>
        <YearGrid n={n} total={total} />
        <Reveal className="l-head" delay={0.2}>
          <p className="soft">Setiap hari yang disegel menumbuhkan satu tanaman. Hari yang terlewat hanya jadi kabut — tidak ada yang dihukum. Di akhir tahun, taman ini berubah jadi kitab kalian, bahkan bisa dicetak.</p>
        </Reveal>
      </section>

      {/* 5 — Tinta */}
      <section id="tinta" className="l-sec">
        <Reveal className="l-head">
          <span className="label">tintamu, warnamu</span>
          <h2 className="l-h2">semua doodle ikut warnamu.</h2>
          <p className="soft">Pilih tinta dan kertas. Seluruh halaman — termasuk ratusan doodle tangan di dalamnya — berganti seketika.</p>
        </Reveal>
        <InkPicker signedIn={signedIn} />
      </section>

      {/* 6 — Fitur sebagai catatan tempel */}
      <section className="l-sec">
        <Reveal className="l-head">
          <span className="label">di dalam kapsul</span>
          <h2 className="l-h2">hal-hal kecil yang jadi besar.</h2>
        </Reveal>
        <div className="l-notes">
          {NOTES.map((x, i) => (
            <Reveal key={x.t} delay={(i % 3) * 0.08}>
              <div className="sticky l-note" style={{ background: `var(--sticky-${x.c})`, transform: `rotate(${x.r}deg)` }}>
                <Doodle id={x.d} size={44} />
                <div className="h2">{x.t}</div>
                <p className="small">{x.b}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* 7 — Privasi */}
      <section className="l-sec l-split">
        <LazyScene id="amplop-segel" className="l-split-art" />
        <Reveal className="l-head" delay={0.1}>
          <span className="label">rahasia tetap rahasia</span>
          <h2 className="l-h2">kami tidak bisa membaca satu huruf pun.</h2>
          <p className="soft">Kunci dibuat di perangkatmu. Isi jurnal, foto, dan suara dienkripsi sebelum meninggalkan HP-mu, dan hanya bisa dibuka oleh orang yang kamu pilih. Tidak ada pengikut, tidak ada “terakhir dilihat”, tidak ada tanda dibaca.</p>
          <p className="tiny soft">{COPY.privacy.limitsClosing}</p>
        </Reveal>
      </section>

      {/* 8 — Surat */}
      <section className="l-sec">
        <Reveal>
          <div className="l-letter">
            <Doodle id="pin-papan" size={34} className="l-letter-pin" />
            {COPY.onboarding.letter.map((p, i) => (
              <p key={i} className={i === 0 || i === COPY.onboarding.letter.length - 1 ? 'hand l-letter-hand' : ''}>
                {p}
              </p>
            ))}
          </div>
        </Reveal>
        <div className="col center" style={{ alignItems: 'center', marginTop: 40, gap: 14 }}>
          <LazyScene id="taman-tahun" speed={1.4} className="l-garden-art" />
          <button className="btn auto l-big" onClick={start}>
            {cta} <Doodle id="ui-panah-kanan" size={20} color="currentColor" />
          </button>
          {install ? (
            <button className="pill" onClick={() => install.prompt()}>
              <Doodle id="hp" size={18} color="currentColor" /> pasang di layar utama
            </button>
          ) : (
            <p className="tiny soft">Di HP: buka menu peramban → “Tambahkan ke Layar Utama” supaya terasa seperti aplikasi.</p>
          )}
        </div>
      </section>

      <footer className="l-foot">
        <Doodle id="tunas" size={22} />
        <span className="tiny soft">sehari · dibuat pelan-pelan untuk orang-orang tersayang</span>
        <Link to="/bantuan" className="tiny">bantuan</Link>
      </footer>
    </div>
  );
}

const NOTES = [
  { t: 'tulis di mana saja', b: 'Selembar kertas utuh. Foto boleh menimpa tulisan, stiker boleh miring.', d: 'pena', c: 'yellow', r: -2 },
  { t: 'segel saat senja', b: 'Pengingat datang saat matahari terbenam di kotamu. Tahan lilin, dan hari ini tersimpan.', d: 'segel-lilin', c: 'peach', r: 1.5 },
  { t: 'suara & lagu', b: 'Rekam tawa, hujan, atau “selamat tidur”. Tempel lagu yang diputar berulang hari ini.', d: 'kaset', c: 'blue', r: -1 },
  { t: 'surat ke masa depan', b: 'Tulis untuk dia — terbuka setahun lagi, atau di hari ulang tahunnya.', d: 'surat-botol', c: 'green', r: 2 },
  { t: 'kartu & pertanyaan malam', b: 'Satu pertanyaan kecil tiap hari. Jawaban kalian baru terlihat setelah keduanya menjawab.', d: 'kartu', c: 'yellow', r: 1 },
  { t: 'ruang hening', b: 'Hari yang berat boleh cuma berisi lilin. Teman bisa menyalakan lilin balik — tanpa perlu kata.', d: 'lilin', c: 'blue', r: -2.5 },
  { t: 'papan, kitab, langit', b: 'Lelucon internal, rasi bintang dari hari-hari kalian, kamus kata-kata yang cuma kalian paham.', d: 'buku-terbuka', c: 'peach', r: 2 },
  { t: 'wrap tahunan', b: 'Akhir tahun, cerita kalian diputar seperti story — dihitung di perangkat, bukan di server.', d: 'kembang-api', c: 'green', r: -1.5 },
  { t: 'lingkaran kecil', b: 'Berdua, atau 3–8 orang. Teman kos, keluarga pilihan, geng sejak SMA.', d: 'tangan-bergandeng', c: 'yellow', r: 1.2 },
] as const;

// ── Halaman demo ────────────────────────────────────────────────────────────

function sceneUrl(id: string) {
  const s = getScene(id);
  if (!s) return undefined;
  const ink = getComputedStyle(document.documentElement).getPropertyValue('--ink').trim() || '#2A14D6';
  const svg = sceneToSvg(s, { color: ink.startsWith('color-mix') ? '#9c8cff' : ink, width: 600 }).replace('<svg ', '<svg style="background:#f4f1ea" ');
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function demoItems(): PageItem[] {
  const base = (kind: DropPayload['kind'], layout: PageLayout, extra: Partial<DropPayload> = {}): PageItem => ({
    id: `demo-${Math.random().toString(36).slice(2)}`,
    authorId: 'tamu',
    payload: { v: 1, kind, hour: 21, minute: 14, tz: 'Asia/Jakarta', layout, ...extra },
    audience: 'circle',
    circleIds: [],
    mediaIds: [],
    reactions: [],
    footnotes: [],
  });
  return [
    { ...base('photo', { x: 470, y: 210, w: 460, rot: 4, z: 3 }, { text: 'hujan, lagi. dari jendela kos.', media: [{ id: 'demo', key: '', mime: 'image/svg+xml', width: 480, height: 320 }] }), localUrl: sceneUrl('hujan-jendela') },
    base('text', { x: 60, y: 250, w: 470, rot: -1.5, z: 2 }, { text: 'kita batal pergi gara-gara hujan.\ntapi malah ngobrol sampai jam dua.', style: { font: 'hand', size: 46 } }),
    base('mood', { x: 70, y: 540, w: 360, rot: -2, z: 1 }, { mood: 'tenang' as MoodCode }),
    base('sticker', { x: 380, y: 160, w: 120, rot: -14, z: 5 }, { sticker: 'payung-terbuka', style: { fill: '#BFDBFE' } }),
    base('sticker', { x: 830, y: 760, w: 110, rot: 10, z: 6 }, { sticker: 'teh-panas', style: { fill: '#FED7AA' } }),
    base('sticker', { x: 90, y: 700, w: 90, rot: 0, z: 6 }, { sticker: 'hati-garis', style: { fill: '#FBCFE8' } }),
    base('text', { x: 120, y: 820, w: 640, rot: 0, z: 4 }, { text: 'satu hal yang ingin kuingat: suara tawamu waktu listriknya mati.', style: { font: 'mono', size: 30 } }),
  ];
}

function Playground() {
  const [items, setItems] = useState<PageItem[]>(() => demoItems());
  const [sel, setSel] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const zTop = () => items.reduce((m, x) => Math.max(m, x.payload.layout?.z ?? 0), 0) + 1;
  const patch = (id: string, f: (p: DropPayload) => DropPayload) => setItems((xs) => xs.map((x) => (x.id === id ? { ...x, payload: f(x.payload) } : x)));
  const add = (kind: DropPayload['kind'], layout: Omit<PageLayout, 'z'>, extra: Partial<DropPayload> = {}, localUrl?: string) => {
    const id = `demo-${Math.random().toString(36).slice(2)}`;
    setItems((xs) => [...xs, { id, authorId: 'tamu', payload: { v: 1, kind, hour: 0, minute: 0, tz: 'Asia/Jakarta', layout: { ...layout, z: zTop() }, ...extra }, audience: 'circle', circleIds: [], mediaIds: [], reactions: [], footnotes: [], localUrl }]);
    return id;
  };
  const files = (fs: File[], x = 300, y = 300) => {
    for (const [i, f] of fs.slice(0, 4).entries()) {
      const img = new Image();
      const url = URL.createObjectURL(f);
      img.onload = () =>
        add('photo', { x: x + i * 30, y: y + i * 30, w: 420, rot: (Math.random() - 0.5) * 8 }, { media: [{ id: url, key: '', mime: f.type, width: img.width, height: img.height }] }, url);
      img.src = url;
    }
  };
  const fileRef = useRef<HTMLInputElement>(null);
  const stickers = useMemo(() => ['bunga-matahari', 'kupu-kupu', 'kilau', 'kucing-tidur', 'kereta', 'bulan', 'wajah-tertawa', 'martabak'], []);

  return (
    <div className="l-play">
      <Page
        items={items}
        editable
        viewerId="tamu"
        selectedId={sel}
        editingId={editing}
        minHeight={1000}
        onSelect={(id) => {
          setSel(id);
          if (editing && id !== editing) setEditing(null);
        }}
        onLayout={(id, l) => patch(id, (p) => ({ ...p, layout: l }))}
        onEdit={(id) => {
          const it = items.find((x) => x.id === id);
          if (it && ['text', 'idea'].includes(it.payload.kind)) setEditing(id);
        }}
        onText={(id, t) => patch(id, (p) => ({ ...p, text: t }))}
        onEndEdit={(id) => {
          setEditing(null);
          const it = items.find((x) => x.id === id);
          if (it && !it.payload.text?.trim()) setItems((xs) => xs.filter((x) => x.id !== id));
        }}
        onCreateAt={(x, y) => {
          const id = add('text', { x, y, w: 520, rot: 0 }, { text: '', style: { font: 'hand', size: 42 } });
          setSel(id);
          setEditing(id);
        }}
        onFiles={(fs, x, y) => files(fs, x, y)}
        head={
          <div className="row between" style={{ alignItems: 'flex-start' }}>
            <div>
              <div className="hand" style={{ fontSize: 'clamp(26px, 5.6vw, 52px)' }}>{dayName(localDay())}, {formatDayLong(localDay(), false).toLowerCase()}</div>
              <div className="tiny ink-soft">halaman percobaan · tidak disimpan</div>
            </div>
            <Doodle id="tunas" size="clamp(40px, 8vw, 70px)" className="sway" />
          </div>
        }
        renderTools={(it) => (
          <>
            {it.payload.kind === 'text' ? <button onClick={() => patch(it.id, (p) => ({ ...p, style: { ...p.style, font: p.style?.font === 'hand' ? 'mono' : 'hand' } }))}>{it.payload.style?.font === 'hand' ? 'mesin tik' : 'tulisan tangan'}</button> : null}
            <button onClick={() => patch(it.id, (p) => ({ ...p, layout: { ...p.layout!, z: zTop() } }))}>ke depan</button>
            <button onClick={() => { setItems((xs) => xs.filter((x) => x.id !== it.id)); setSel(null); }}>hapus</button>
          </>
        )}
      />
      <div className="l-play-tools">
        <button className="pill" onClick={() => fileRef.current?.click()}>
          <Doodle id="ui-foto" size={18} color="currentColor" /> tempel fotomu
        </button>
        {stickers.map((s) => (
          <button key={s} className="pill" aria-label={`stiker ${s}`} onClick={() => setSel(add('sticker', { x: 200 + Math.random() * 500, y: 300 + Math.random() * 400, w: 130, rot: (Math.random() - 0.5) * 24 }, { sticker: s, style: { fill: ['#FDE68A', '#FBCFE8', '#BFDBFE', '#BBF7D0', '#FED7AA', '#DDD6FE'][Math.floor(Math.random() * 6)] } }))}>
            <Doodle id={s} size={22} />
          </button>
        ))}
        <button className="pill" onClick={() => setItems(demoItems())}>ulang</button>
      </div>
      <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={(e) => { files([...(e.target.files ?? [])]); e.target.value = ''; }} />
    </div>
  );
}

// ── Dua jendela ─────────────────────────────────────────────────────────────

function TwoWindows() {
  const [ref, seen] = useInView<HTMLDivElement>('-25% 0px');
  return (
    <div ref={ref} className={`l-windows ${seen ? 'in' : ''}`}>
      <div className="l-win left">
        <div className="tiny ink-soft">kamu · jakarta · 21.40</div>
        <div className="hand">tadi lihat kucing tidur di atas motor orang. langsung ingat kamu.</div>
        <Doodle id="kucing-tidur" size={70} />
        <div className="washi" style={{ background: MOODS.tenang.color, height: 16, width: '70%' }} />
      </div>
      <div className="l-seal">
        <span className="wax-dot">
          <Doodle id="tunas" size={34} color="var(--on-ink)" sw={3} />
        </span>
        <span className="tiny ink">terbuka bersama · 22.15</span>
      </div>
      <div className="l-win right">
        <div className="tiny ink-soft">dia · yogyakarta · 22.15</div>
        <div className="hand">hari ini capek. tapi ada es teh gratis dari ibu warung.</div>
        <Doodle id="es-teh" size={70} />
        <div className="washi" style={{ background: MOODS.lelah.color, height: 16, width: '55%' }} />
      </div>
    </div>
  );
}

// ── Tahun ───────────────────────────────────────────────────────────────────

function YearGrid({ n, total }: { n: number; total: number }) {
  const [ref, seen] = useInView<HTMLDivElement>('-10% 0px');
  const year = new Date().getFullYear();
  const cells = useMemo(() => Array.from({ length: total }, (_, i) => (i < n - 1 ? gardenDoodleFor(`${year}:${i}`).id : null)), [n, total, year]);
  return (
    <div ref={ref} className={`l-year ${seen ? 'in' : ''}`} aria-label={`${n - 1} dari ${total} hari sudah lewat`}>
      {cells.map((id, i) =>
        i === n - 1 ? (
          <span key={i} className="cell today" title="hari ini">
            <Doodle id="tunas" size="100%" className="breathe" />
          </span>
        ) : id ? (
          <span key={i} className="cell past" style={{ transitionDelay: `${Math.min(2.4, i * 0.006)}s` }}>
            <Doodle id={id} size="100%" sw={3} />
          </span>
        ) : (
          <span key={i} className="cell future" />
        ),
      )}
    </div>
  );
}

// ── Tinta ───────────────────────────────────────────────────────────────────

function InkPicker({ signedIn }: { signedIn: boolean }) {
  const [t, setT] = useState(currentTheme);
  const pick = (next: typeof t) => {
    setT(next);
    if (signedIn) setTheme(next);
    else {
      setTheme(next, false);
      applyTheme(next);
    }
  };
  return (
    <Reveal>
      <div className="l-ink card">
        <div className="row wrap" style={{ gap: 12, justifyContent: 'center' }}>
          {INKS.map((i) => (
            <button key={i.id} className={`swatch ${t.ink === i.id ? 'on' : ''}`} style={{ background: i.id }} aria-label={i.name} title={i.name} onClick={() => pick({ ...t, ink: i.id })} />
          ))}
        </div>
        <div className="row wrap" style={{ gap: 8, justifyContent: 'center' }}>
          {PAPERS.map((p) => (
            <button key={p.id} className={`pill ${t.paper === p.id ? 'active' : ''}`} onClick={() => pick({ ...t, paper: p.id })}>
              <span className="paper-dot" style={{ background: p.color }} /> {p.name}
            </button>
          ))}
        </div>
        <div className="l-ink-row" aria-hidden>
          {['bunga-matahari', 'kucing', 'sepeda', 'bulan', 'kopi-susu', 'surat-botol', 'kupu-kupu', 'kereta'].map((id, i) => (
            <Doodle key={`${id}-${t.ink}-${t.paper}`} id={id} size={54} draw={i * 0.08} />
          ))}
        </div>
      </div>
    </Reveal>
  );
}
