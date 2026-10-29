import { type ComponentType, lazy, Suspense, useEffect } from 'react';
import { useKeyMaintenance } from './lib/data';
import { refreshPushToken } from './lib/push';
import { match, navigate, ParamsProvider, usePath } from './lib/router';
import { useSession } from './lib/session';
import { useThemeSync } from './lib/theme';
import { Growing } from './ui/kit';
import { TabBar } from './ui/TabBar';
import Landing from './pages/Landing';

const PAGES = import.meta.glob<{ default: ComponentType }>(['./pages/**/*.tsx', '!./pages/Landing.tsx']);
const Missing = () => <Growing label="halaman ini belum ada" />;
const page = (name: string) => lazy(() => PAGES[`./pages/${name}.tsx`]?.() ?? Promise.resolve({ default: Missing }));

/** [pola, komponen, butuh sesi siap?, tampilkan tab bar?] */
const ROUTES: [string, ComponentType, boolean, boolean][] = [
  ['/masuk', page('auth/Masuk'), false, false],
  ['/mulai/profil', page('auth/Profil'), false, false],
  ['/mulai/kunci', page('auth/Kunci'), false, false],
  ['/mulai/pulihkan', page('auth/Pulihkan'), false, false],
  ['/mulai/undang', page('auth/Undang'), true, false],
  ['/j/:token', page('Join'), false, false],
  ['/hari', page('Today'), true, false],
  ['/hari/:day', page('Today'), true, false],
  ['/lingkaran', page('circles/Circles'), true, true],
  ['/l/baru', page('circles/NewCircle'), true, false],
  ['/l/:id', page('circles/CircleHome'), true, false],
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
  ['/main', page('main/Ruang'), false, false],
  ['/main/titip', page('main/titip/Titip'), false, false],
  ['/main/titip/:code/tv', page('main/titip/Tv'), false, false],
  ['/main/titip/:code', page('main/titip/Meja'), false, false],
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
  ['/kartu', page('Kartu'), false, false],
  ['/tentang-kita', page('TentangKita'), false, false],
  ['/kenangan', page('Kenangan'), true, true],
  ['/wrap/:circleId/:scope/:period', page('Wrap'), true, false],
  ['/surat', page('letters/Letters'), true, false],
  ['/surat/tulis', page('letters/Write'), true, false],
  ['/surat/:id', page('letters/Read'), true, false],
  ['/aku', page('me/Me'), true, true],
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
  useEffect(() => void refreshPushToken(), []);
  return <>{children}</>;
}

export function App() {
  const { path } = usePath();
  const { status } = useSession();
  useThemeSync();

  if (path === '/' || path === '') return <Landing />;
  for (const [pattern, Comp, needsReady, tabs] of ROUTES) {
    const params = match(pattern, path);
    if (!params) continue;
    const body = (
      <ParamsProvider value={params}>
        <Suspense fallback={<Growing />}>
          <div key={pattern} className="route-in">
            <Comp />
          </div>
        </Suspense>
        {tabs && status === 'ready' ? <TabBar path={path} /> : null}
      </ParamsProvider>
    );
    return needsReady ? <Guard>{body}</Guard> : body;
  }
  return <Landing />;
}
