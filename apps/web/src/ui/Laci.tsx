/**
 * Laci: pencarian untuk semua yang ada di Sehari. Ketik untuk mencari, atau
 * jelajahi per ruang. Dibuka dari ikon cari di pojok kanan atas dan Ctrl/⌘+K. Pencarian berjalan di perangkat (hanya nama fitur
 * dan lingkaran yang sudah terbuka di sini).
 */
import { type CSSProperties, useEffect, useMemo, useRef, useState } from 'react';
import { useCircles, useToday } from '@/lib/data';
import { navigate } from '@/lib/router';
import { store } from '@/lib/storage';
import { Doodle, Sheet } from './kit';

interface Item {
  to: string;
  label: string;
  hint: string;
  icon: string;
  group: string;
  /** Kata lain yang orang mungkin ketik. */
  keys?: string;
}

const EVENT = 'sehari:laci';
export const openLaci = () => window.dispatchEvent(new Event(EVENT));

const BASE: Item[] = [
  { group: 'menulis', to: '/hari', label: 'halaman hari ini', hint: 'tulis, tempel, segel', icon: 'ui-hari-ini', keys: 'jurnal today segel tulis' },
  { group: 'menulis', to: '/karya', label: 'karya', hint: 'esai, cerpen, puisi', icon: 'pena', keys: 'tulisan panjang cerita' },
  { group: 'menulis', to: '/kota', label: 'kota sangkala', hint: 'patok rumah, tulis tokoh dan keluarganya', icon: 'rumah', keys: 'kota peta dunia worldbuilding rumah patok musim novel naskah kanon tokoh studio menulis cerita' },
  { group: 'menulis', to: '/kota/meja', label: 'meja tulis kota', hint: 'rumah-rumahmu, tokohmu, jatah musim', icon: 'buku-terbuka', keys: 'naskah studio tokoh rumahku meja tulis' },
  { group: 'menulis', to: '/kota/kabar', label: 'kabar kota', hint: 'yang terjadi di Sangkala belakangan ini', icon: 'surat-terbuka', keys: 'berita kabar koran kota feed' },
  { group: 'menulis', to: '/surat', label: 'kotak surat', hint: 'surat tersesat & kapsul waktu', icon: 'surat-botol', keys: 'letter masa depan wasiat' },
  { group: 'menulis', to: '/surat/tulis', label: 'tulis surat', hint: 'untuk nanti, atau untuk tersesat', icon: 'amplop', keys: 'kirim kapsul' },
  { group: 'menulis', to: '/kartu', label: 'kartu ucapan', hint: 'hias lalu kirim ke WhatsApp', icon: 'amplop', keys: 'ulang tahun selamat wa' },
  { group: 'menulis', to: '/susulan', label: 'susulan dari galeri', hint: 'isi hari yang terlewat dengan fotonya', icon: 'ui-foto', keys: 'foto lama terlewat' },

  { group: 'momen', to: '/kilasan', label: 'kilasan', hint: 'cuplikan siang hari', icon: 'kamera', keys: 'foto cepat bereal' },
  { group: 'momen', to: '/kilasan/jepret', label: 'jepret sekarang', hint: 'menyiram tanaman kalian', icon: 'kamera', keys: 'kamera foto siram kangen' },
  { group: 'momen', to: '/photobox', label: 'photobox', hint: 'strip foto, sendiri atau berdua', icon: 'bingkai-polaroid', keys: 'photobooth strip selfie' },
  { group: 'momen', to: '/janji', label: 'janji temu', hint: 'kencan & kumpul kecil', icon: 'tangan-bergandeng', keys: 'date kencan ketemu jadwal' },
  { group: 'momen', to: '/janji/acak', label: 'bingung mau ke mana?', hint: 'mesin acak ide kencan', icon: 'ui-dadu', keys: 'random ide date' },
  { group: 'momen', to: '/kenangan', label: 'rak & kenangan', hint: 'taman setahun & Wrap', icon: 'ui-kenangan', keys: 'memori wrapped kalender taman' },

  { group: 'momen', to: '/kepo', label: 'si kepo', hint: 'temuan pola dari jurnalmu', icon: 'ui-cari', keys: 'statistik insight pola kebiasaan analisis' },

  { group: 'main', to: '/cerita', label: 'hidup orang lain', hint: 'satu cerita, ditulis bergantian', icon: 'pena', keys: 'cerita cerpen menulis bersama game role novel' },
  { group: 'main', to: '/main', label: 'Ruang Main', hint: 'semua permainan', icon: 'dadu', keys: 'game permainan' },
  { group: 'main', to: '/sidik', label: 'SIDIK', hint: 'detektif, ada yang berbohong', icon: 'ui-cari', keys: 'game detektif' },
  { group: 'main', to: '/main/titip', label: 'Titip Surat', hint: 'kartu deduksi', icon: 'amplop', keys: 'game love letter' },
  { group: 'main', to: '/main/satu', label: 'Kartu Satu', hint: 'tumpuk, salip, habiskan', icon: 'kartu', keys: 'game uno' },
  { group: 'main', to: '/main/tangga', label: 'Ular Tangga', hint: 'dua dadu & kartu aksi', icon: 'ui-dadu', keys: 'game' },
  { group: 'main', to: '/main/saudagar', label: 'Saudagar', hint: 'lelang & kota-kota Indonesia', icon: 'rumah', keys: 'game monopoli' },
  { group: 'main', to: '/main/petasan', label: 'Kucing Petasan', hint: 'ambil kartu dan berdoa', icon: 'kucing', keys: 'game exploding kittens' },
  { group: 'main', to: '/main/kembang', label: 'Kembang Api', hint: 'kooperatif', icon: 'kembang-api', keys: 'game hanabi' },
  { group: 'main', to: '/tentang-kita', label: 'tentang kita', hint: '580+ kartu ngobrol', icon: 'gelembung-kata', keys: 'pertanyaan deep talk pdkt' },

  { group: 'aku', to: '/aku/tema', label: 'tema tinta & kertas', hint: 'warna, dan kertas ikut senja', icon: 'ui-palet', keys: 'gelap dark mode warna malam' },
  { group: 'aku', to: '/aku/profil', label: 'profil', hint: 'nama pena & avatar', icon: 'ui-aku', keys: 'nama foto' },
  { group: 'aku', to: '/aku/pengaturan', label: 'pengingat & notifikasi', hint: 'kapan diingatkan menyegel', icon: 'ui-jam', keys: 'notif alarm senja' },
  { group: 'aku', to: '/aku/keamanan', label: 'keamanan & perangkat', hint: 'kode pemulihan, tautkan HP', icon: 'ui-gembok', keys: 'kunci qr login' },
  { group: 'aku', to: '/aku/privasi', label: 'privasi & data', hint: 'ekspor, hapus akun', icon: 'kunci', keys: 'e2ee unduh' },
  { group: 'aku', to: '/aku/dek', label: 'dek kartu', hint: 'kartu harian tematik', icon: 'kartu' },
  { group: 'aku', to: '/panduan', label: 'panduan', hint: 'semua fitur, langkah demi langkah', icon: 'ui-ide', keys: 'tutorial bantuan cara help' },
  { group: 'aku', to: '/bantuan', label: 'bantuan & dukungan', hint: 'kalau hari terasa terlalu berat', icon: 'lilin', keys: 'darurat konseling' },
];

const CIRCLE: { path: (day: string) => string; label: string; hint: string; icon: string; keys?: string }[] = [
  { path: (d) => `/hari/${d}`, label: 'buka hari ini bersama', hint: 'halaman berdampingan', icon: 'buku-terbuka', keys: 'baca halaman dia' },
  { path: () => '', label: 'beranda', hint: 'tanaman, pertanyaan, minggu ini', icon: 'tunas', keys: 'tanaman benih api streak pertanyaan kuis tinta hilang tukar pena bendera putih baikan rahasia' },
  { path: () => '/papan', label: 'papan tahun', hint: '365 petak', icon: 'peta' },
  { path: () => '/kitab', label: 'kitab', hint: 'bab, adegan, jilid', icon: 'buku', keys: 'buku cetak' },
  { path: () => '/langit', label: 'langit', hint: 'rasi bintang kalian', icon: 'ui-bintang-rasi' },
  { path: () => '/lemari', label: 'lemari benda', hint: 'token kenangan', icon: 'kunci' },
  { path: () => '/ekspedisi', label: 'ekspedisi', hint: 'misi 7 hari', icon: 'kompas' },
  { path: () => '/kamus', label: 'kamus & motif', hint: 'bahasa kalian sendiri', icon: 'ui-kata' },
  { path: () => '/puisi', label: 'puisi temuan', hint: 'hitamkan kata seminggu', icon: 'pena' },
  { path: () => '/dadu', label: 'dadu kenangan', hint: 'sekali seminggu', icon: 'dadu' },
  { path: () => '/mimpi', label: 'mimpi', hint: 'daftar ingin bersama', icon: 'bulan', keys: 'bucket list wishlist' },
  { path: () => '/inspirasi', label: 'inspirasi', hint: 'ide untuk kalian', icon: 'ui-ide' },
  { path: () => '/lagu', label: 'lagu', hint: 'OST lingkaran', icon: 'ui-lagu', keys: 'musik playlist spotify' },
  { path: () => '/rol', label: 'rol minggu ini', hint: '5 foto favorit', icon: 'kamera' },
  { path: () => '/photobox', label: 'dinding strip', hint: 'strip photobox kalian', icon: 'bingkai-polaroid' },
  { path: () => '/undang', label: 'undang', hint: 'QR & tautan', icon: 'ui-qr', keys: 'invite ajak' },
  { path: () => '/atur', label: 'pengaturan lingkaran', hint: 'anggota, mode, julukan', icon: 'ui-pengaturan' },
];

const GROUPS: Record<string, string> = { menulis: 'menulis', momen: 'momen', main: 'main bareng', aku: 'aku & pengaturan' };
const RECENT = 'laciRecent';

function Row({ it, onGo, n = 0 }: { it: Item; onGo: (it: Item) => void; n?: number }) {
  return (
    <button className="laci-item" style={{ '--n': Math.min(n, 12) } as CSSProperties} onClick={() => onGo(it)}>
      <span className="laci-ico">
        <Doodle id={it.icon} size={24} />
      </span>
      <span className="laci-text">
        <span className="laci-label">{it.label}</span>
        <span className="laci-hint">{it.hint}</span>
      </span>
    </button>
  );
}

/** Dipasang sekali di App (hanya saat sesi siap). */
export function Laci() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [sel, setSel] = useState<string | null>(null);
  /** Ruang yang sedang dijelajahi: id lingkaran, atau kunci GROUPS. */
  const [room, setRoom] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const { circles } = useCircles();
  const today = useToday();

  useEffect(() => {
    const show = () => {
      setQ('');
      setRoom(null);
      setOpen(true);
    };
    const key = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        show();
      }
    };
    window.addEventListener(EVENT, show);
    window.addEventListener('keydown', key);
    return () => {
      window.removeEventListener(EVENT, show);
      window.removeEventListener('keydown', key);
    };
  }, []);
  useEffect(() => {
    // Di layar lebar langsung siap diketik; di HP papan ketik tidak menutupi laci.
    if (open && window.matchMedia('(min-width: 720px)').matches) input.current?.focus();
  }, [open]);

  const mine = useMemo(() => circles.filter((c) => c.me && c.me.state === 'active'), [circles]);
  const circle = mine.find((c) => c.id === sel) ?? mine[0];
  const circleItems = (cid: string, name: string): Item[] =>
    CIRCLE.map((f) => ({ to: `/l/${cid}${f.path(today)}`, label: f.label, hint: mine.length > 1 ? `${f.hint} · ${name}` : f.hint, icon: f.icon, group: name, keys: `${f.keys ?? ''} ${name}` }));

  const all = useMemo(() => [...mine.flatMap((c) => circleItems(c.id, c.name)), ...BASE], [mine, today]);
  const needle = q.trim().toLowerCase();
  const found = needle
    ? all
        .map((it) => {
          const label = it.label.toLowerCase();
          const hay = `${label} ${it.hint} ${it.keys ?? ''} ${it.group}`.toLowerCase();
          const ok = needle.split(/\s+/).every((w) => hay.includes(w));
          return { it, score: !ok ? -1 : label.startsWith(needle) ? 3 : label.includes(needle) ? 2 : 1 };
        })
        .filter((x) => x.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 14)
        .map((x) => x.it)
    : [];
  const recent = (store.json<string[]>(RECENT) ?? []).map((to) => all.find((x) => x.to === to)).filter((x): x is Item => !!x);

  const go = (it: Item) => {
    store.set(RECENT, JSON.stringify([it.to, ...(store.json<string[]>(RECENT) ?? []).filter((x) => x !== it.to)].slice(0, 4)));
    setOpen(false);
    navigate(it.to);
  };

  return (
    <Sheet open={open} onClose={() => setOpen(false)} title="cari">
      <div className="laci" data-testid="laci">
        <label className="laci-search">
          <Doodle id="ui-cari" size={20} />
          <input
            ref={input}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && found[0] && go(found[0])}
            placeholder="cari apa saja: kitab, photobox, tema…"
            aria-label="cari fitur"
            enterKeyHint="go"
            data-testid="laci-input"
          />
        </label>
        {needle ? (
          found.length ? (
            <div className="laci-grid">{found.map((it, n) => <Row key={it.to} it={it} onGo={go} n={n} />)}</div>
          ) : (
            <p className="small soft center" style={{ margin: '18px 0' }}>
              Tidak ada yang bernama “{q.trim()}” di laci. Coba kata lain, misalnya “foto” atau “main”.
            </p>
          )
        ) : (
          <>
            {recent.length ? (
              <>
                <span className="label">baru dibuka</span>
                <div className="laci-grid">{recent.map((it, n) => <Row key={it.to} it={it} onGo={go} n={n} />)}</div>
              </>
            ) : null}
            <span className="label">jelajahi</span>
            <div className="laci-rooms" role="tablist" aria-label="jelajahi ruang">
              {mine.map((c) => (
                <button key={c.id} role="tab" aria-selected={room === c.id} className={`pill ${room === c.id ? 'active' : ''}`} onClick={() => { setSel(c.id); setRoom(room === c.id ? null : c.id); }}>
                  <Doodle id={c.doodle} size={16} color="currentColor" /> {c.name}
                </button>
              ))}
              {Object.entries(GROUPS).map(([g, title]) => (
                <button key={g} role="tab" aria-selected={room === g} className={`pill ${room === g ? 'active' : ''}`} onClick={() => setRoom(room === g ? null : g)} data-testid={`laci-room-${g}`}>
                  {title}
                </button>
              ))}
            </div>
            {room && circle && room === circle.id ? (
              <div className="laci-grid" key={room}>{circleItems(circle.id, circle.name).map((it, n) => <Row key={it.to} it={it} onGo={go} n={n} />)}</div>
            ) : room && GROUPS[room] ? (
              <div className="laci-grid" key={room}>{BASE.filter((x) => x.group === room).map((it, n) => <Row key={it.to} it={it} onGo={go} n={n} />)}</div>
            ) : null}
          </>
        )}
      </div>
    </Sheet>
  );
}
