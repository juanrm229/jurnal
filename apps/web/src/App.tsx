import { Component, type ComponentType, lazy, type ReactNode, Suspense, useEffect, useState } from 'react';
import { useKeyMaintenance } from './lib/data';
import { bersihkanLencana, refreshPushToken } from './lib/push';
import { match, navigate, ParamsProvider, usePath } from './lib/router';
import { isChunkError, reloadOnce } from './lib/reload';
import { useSession } from './lib/session';
import { trackPlay } from './lib/play';
import { useThemeSync } from './lib/theme';
import { Growing } from './ui/kit';
import { Laci } from './ui/Laci';
import { TabBar } from './ui/TabBar';
import Landing from './pages/Landing';

const PAGES = import.meta.glob<{ default: ComponentType }>(['./pages/**/*.tsx', '!./pages/Landing.tsx']);
const Missing = () => <Growing label="halaman ini belum ada" />;
const page = (name: string) =>
  lazy((): Promise<{ default: ComponentType }> => {
    const load = PAGES[`./pages/${name}.tsx`];
    if (!load) return Promise.resolve({ default: Missing });
    return load().catch((e: unknown) => {
      // Versi lama setelah deploy: muat ulang supaya mengambil versi baru.
      if (isChunkError(e) && reloadOnce()) return new Promise<never>(() => {});
      throw e;
    });
  });

if (typeof window !== 'undefined') {
  window.addEventListener('vite:preloadError', (e) => {
    if (reloadOnce()) e.preventDefault();
  });
}

/**
 * Pembungkus halaman yang memudar masuk. Animasi dimulai dari opacity 0; kalau
 * peramban tidak menjalankannya (pernah terjadi di iPhone), halaman tetap
 * tak terlihat. Jadi setelah sesaat animasinya dilepas dan halaman pasti tampil.
 */
function RouteIn({ children }: { children: ReactNode }) {
  const [settled, setSettled] = useState(false);
  useEffect(() => {
    const t = window.setTimeout(() => setSettled(true), 700);
    return () => window.clearTimeout(t);
  }, []);
  return <div className={settled ? undefined : 'route-in'}>{children}</div>;
}

/** Jangan pernah layar kosong: tangkap galat halaman dan tawarkan muat ulang. */
class PageErrorBoundary extends Component<{ children: ReactNode; resetKey: string }, { error: unknown }> {
  state = { error: null as unknown };
  static getDerivedStateFromError(error: unknown) {
    return { error };
  }
  componentDidCatch(error: unknown) {
    console.error('halaman gagal', error);
    if (isChunkError(error)) reloadOnce();
  }
  componentDidUpdate(prev: { resetKey: string }) {
    if (prev.resetKey !== this.props.resetKey && this.state.error) this.setState({ error: null });
  }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <main className="screen">
        <div className="col center" style={{ alignItems: 'center', textAlign: 'center', gap: 14, paddingTop: '22vh' }}>
          <h1 className="h2" style={{ fontSize: 20 }}>Halaman ini gagal dimuat</h1>
          <p className="soft small" style={{ maxWidth: 340, margin: 0 }}>Mungkin aplikasinya baru saja diperbarui. Muat ulang sekali, ya.</p>
          <button className="btn auto" onClick={() => location.reload()}>muat ulang</button>
          <a className="tiny soft" href="/hari">ke halaman hari ini</a>
          <pre className="tiny soft" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', maxWidth: '92vw', textAlign: 'left' }}>
            {location.pathname}
            {'\n'}
            {String((this.state.error as { message?: string })?.message ?? this.state.error)}
          </pre>
        </div>
      </main>
    );
  }
}

/** [pola, komponen, butuh sesi siap?, tampilkan tab bar?] */
const ROUTES: [string, ComponentType, boolean, boolean][] = [
  ['/masuk', page('auth/Masuk'), false, false],
  ['/mulai/profil', page('auth/Profil'), false, false],
  ['/mulai/kunci', page('auth/Kunci'), false, false],
  ['/mulai/pulihkan', page('auth/Pulihkan'), false, false],
  ['/mulai/undang', page('auth/Undang'), true, false],
  ['/j/:token', page('Join'), false, false],
  ['/hari', page('Today'), true, true],
  ['/hari/:day', page('Today'), true, true],
  ['/lingkaran', page('circles/Circles'), true, true],
  ['/l/baru', page('circles/NewCircle'), true, false],
  ['/l/:id', page('circles/CircleHome'), true, true],
  ['/l/:id/hari/:day', page('circles/Together'), true, false],
  ['/l/:id/undang', page('circles/Invite'), true, false],
  ['/l/:id/atur', page('circles/CircleSettings'), true, false],
  ['/l/:id/papan', page('lore/Papan'), true, false],
  ['/l/:id/kitab', page('lore/Kitab'), true, false],
  ['/l/:id/langit', page('lore/Langit'), true, false],
  ['/l/:id/lemari', page('lore/Lemari'), true, false],
  ['/l/:id/dadu', page('lore/Dadu'), true, false],
  ['/l/:id/ekspedisi', page('lore/Ekspedisi'), true, false],
  ['/l/:id/kamus', page('lore/Kamus'), true, false],
  ['/l/:id/puisi', page('lore/Puisi'), true, false],
  ['/l/:id/mimpi', page('circles/Mimpi'), true, false],
  ['/l/:id/inspirasi', page('circles/Inspirasi'), true, false],
  ['/l/:id/lagu', page('circles/Lagu'), true, false],
  ['/bagikan', page('Bagikan'), true, false],
  ['/photobox', page('photobox/Photobox'), true, false],
  ['/main', page('main/Ruang'), false, true],
  ['/main/titip', page('main/titip/Titip'), false, false],
  ['/main/titip/:code/tv', page('main/titip/Tv'), false, false],
  ['/main/titip/:code', page('main/titip/Meja'), false, false],
  ['/main/satu', page('main/satu/Satu'), false, false],
  ['/main/tangga', page('main/tangga/Tangga'), false, false],
  ['/main/saudagar', page('main/saudagar/Saudagar'), false, false],
  ['/main/petasan', page('main/petasan/Petasan'), false, false],
  ['/main/kembang', page('main/kembang/Kembang'), false, false],
  ['/main/kembang/:code/tv', page('main/kembang/Tv'), false, false],
  ['/main/kembang/:code', page('main/kembang/Meja'), false, false],
  ['/main/petasan/:code/tv', page('main/petasan/Tv'), false, false],
  ['/main/petasan/:code', page('main/petasan/Meja'), false, false],
  ['/main/saudagar/:code/tv', page('main/saudagar/Tv'), false, false],
  ['/main/saudagar/:code', page('main/saudagar/Meja'), false, false],
  ['/main/tangga/:code/tv', page('main/tangga/Tv'), false, false],
  ['/main/tangga/:code', page('main/tangga/Meja'), false, false],
  ['/main/satu/:code/tv', page('main/satu/Tv'), false, false],
  ['/main/satu/:code', page('main/satu/Meja'), false, false],
  ['/sidik', page('sidik/Sidik'), false, false],
  ['/sidik/:code/tv', page('sidik/Tv'), false, false],
  ['/sidik/:code', page('sidik/Room'), false, false],
  ['/photobox/:id', page('photobox/Berdua'), true, false],
  ['/l/:id/photobox', page('circles/StripWall'), true, false],
  ['/karya', page('karya/Karya'), true, true],
  ['/karya/tulis', page('karya/Tulis'), true, false],
  ['/karya/:id/tulis', page('karya/Tulis'), true, false],
  ['/karya/:id', page('karya/Baca'), true, false],
  ['/janji', page('janji/Janji'), true, false],
  ['/janji/baru', page('janji/Form'), true, false],
  ['/janji/acak', page('janji/Acak'), true, false],
  ['/janji/:id/ubah', page('janji/Form'), true, false],
  ['/janji/:id', page('janji/Detail'), true, false],
  ['/cerita', page('cerita/Cerita'), true, false],
  ['/cerita/baru', page('cerita/Baru'), true, false],
  ['/cerita/:id', page('cerita/Meja'), true, false],
  ['/naskah', page('naskah/Rak'), true, false],
  ['/naskah/:id', page('naskah/Ruang'), true, false],
  ['/naskah/:id/a/:sid', page('naskah/Adegan'), true, false],
  ['/naskah/:id/baca/:wid', page('naskah/Baca'), true, false],
  ['/kota', page('kota/Kota'), true, false],
  ['/kota/meja', page('naskah/Rak'), true, false],
  ['/kota/patok/:plotId', page('kota/Patok'), true, false],
  ['/kota/rumah/:id', page('kota/Rumah'), true, false],
  ['/kota/ketuk/:id', page('kota/Ketuk'), true, false],
  ['/kota/silsilah/:id', page('kota/Silsilah'), true, false],
  ['/kota/almanak', page('kota/Almanak'), true, false],
  ['/kota/peristiwa/:id', page('kota/Peristiwa'), true, false],
  ['/kota/warga', page('kota/Warga'), true, false],
  ['/kota/warga/:id', page('kota/FigurPage'), true, false],
  ['/kartu', page('Kartu'), false, false],
  ['/tentang-kita', page('TentangKita'), false, false],
  ['/kenangan', page('Kenangan'), true, true],
  ['/kepo', page('Kepo'), true, false],
  ['/wrap/:circleId/:scope/:period', page('Wrap'), true, false],
  ['/kilasan', page('kilasan/Kilasan'), true, false],
  ['/l/:id/rol', page('circles/Rol'), true, false],
  ['/l/:id/rol/:week', page('circles/Rol'), true, false],
  ['/kilasan/jepret', page('kilasan/Jepret'), true, false],
  ['/susulan', page('kilasan/Susulan'), true, false],
  ['/surat', page('letters/Letters'), true, false],
  ['/surat/tulis', page('letters/Write'), true, false],
  ['/surat/:id', page('letters/Read'), true, false],
  ['/aku', page('me/Me'), true, false],
  ['/aku/tema', page('me/Tema'), false, false],
  ['/aku/keamanan', page('me/Keamanan'), true, false],
  ['/aku/profil', page('me/Profil'), true, false],
  ['/aku/privasi', page('me/Privasi'), true, false],
  ['/aku/jejak', page('me/Jejak'), true, false],
  ['/aku/blokir', page('me/Blokir'), true, false],
  ['/aku/pengaturan', page('me/Pengaturan'), true, false],
  ['/aku/dek', page('me/Dek'), true, false],
  ['/lapor', page('me/Lapor'), true, false],
  ['/bantuan', page('Bantuan'), false, false],
  ['/panduan', page('Panduan'), false, false],
];

function Guard({ children }: { children: React.ReactNode }) {
  const { status } = useSession();
  useEffect(() => {
    if (status === 'signed_out') navigate('/masuk', { replace: true });
    else if (status === 'needs_profile') navigate('/mulai/profil', { replace: true });
    else if (status === 'needs_keys') navigate('/mulai/kunci', { replace: true });
    else if (status === 'needs_restore') navigate('/mulai/pulihkan', { replace: true });
  }, [status]);
  if (status !== 'ready') return <Growing label="membuka kapsul…" />;
  return <Ready>{children}</Ready>;
}

function Ready({ children }: { children: React.ReactNode }) {
  useKeyMaintenance();
  useEffect(() => {
    void refreshPushToken();
    bersihkanLencana();
    const lihat = () => document.visibilityState === 'visible' && bersihkanLencana();
    document.addEventListener('visibilitychange', lihat);
    return () => document.removeEventListener('visibilitychange', lihat);
  }, []);
  return <>{children}</>;
}

export function App() {
  const { path } = usePath();
  const { status } = useSession();
  useThemeSync();
  useEffect(() => {
    trackPlay(path);
    const vis = () => trackPlay(path);
    document.addEventListener('visibilitychange', vis);
    return () => document.removeEventListener('visibilitychange', vis);
  }, [path]);

  if (path === '/' || path === '') return <Landing />;
  for (const [pattern, Comp, needsReady, tabs] of ROUTES) {
    const params = match(pattern, path);
    if (!params) continue;
    const body = (
      <ParamsProvider value={params}>
        <PageErrorBoundary resetKey={path}>
          <Suspense fallback={<Growing />}>
            <RouteIn key={pattern}>
              <Comp />
            </RouteIn>
          </Suspense>
        </PageErrorBoundary>
        {tabs && status === 'ready' ? <TabBar path={path} /> : null}
        {(needsReady || tabs) && status === 'ready' ? <Laci /> : null}
      </ParamsProvider>
    );
    return needsReady ? <Guard>{body}</Guard> : body;
  }
  return <Landing />;
}
