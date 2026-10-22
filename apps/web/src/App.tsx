import { type ComponentType, lazy, Suspense, useEffect } from 'react';
import { useKeyMaintenance } from './lib/data';
import { match, navigate, ParamsProvider, usePath } from './lib/router';
import { useSession } from './lib/session';
import { useThemeSync } from './lib/theme';
import { Growing } from './ui/kit';
import { TabBar } from './ui/TabBar';
import Landing from './pages/Landing';

const page = (f: () => Promise<{ default: ComponentType }>) => lazy(f);

/** [pola, komponen, butuh sesi siap?, tampilkan tab bar?] */
const ROUTES: [string, ComponentType, boolean, boolean][] = [
  ['/masuk', page(() => import('./pages/auth/Masuk')), false, false],
  ['/mulai/profil', page(() => import('./pages/auth/Profil')), false, false],
  ['/mulai/kunci', page(() => import('./pages/auth/Kunci')), false, false],
  ['/mulai/pulihkan', page(() => import('./pages/auth/Pulihkan')), false, false],
  ['/mulai/undang', page(() => import('./pages/auth/Undang')), true, false],
  ['/j/:token', page(() => import('./pages/Join')), false, false],
  ['/hari', page(() => import('./pages/Today')), true, true],
  ['/hari/:day', page(() => import('./pages/Today')), true, false],
  ['/lingkaran', page(() => import('./pages/circles/Circles')), true, true],
  ['/l/baru', page(() => import('./pages/circles/NewCircle')), true, false],
  ['/l/:id', page(() => import('./pages/circles/CircleHome')), true, false],
  ['/l/:id/hari/:day', page(() => import('./pages/circles/Together')), true, false],
  ['/l/:id/undang', page(() => import('./pages/circles/Invite')), true, false],
  ['/l/:id/atur', page(() => import('./pages/circles/CircleSettings')), true, false],
  ['/l/:id/papan', page(() => import('./pages/lore/Papan')), true, false],
  ['/l/:id/kitab', page(() => import('./pages/lore/Kitab')), true, false],
  ['/l/:id/langit', page(() => import('./pages/lore/Langit')), true, false],
  ['/l/:id/lemari', page(() => import('./pages/lore/Lemari')), true, false],
  ['/l/:id/dadu', page(() => import('./pages/lore/Dadu')), true, false],
  ['/l/:id/ekspedisi', page(() => import('./pages/lore/Ekspedisi')), true, false],
  ['/l/:id/kamus', page(() => import('./pages/lore/Kamus')), true, false],
  ['/l/:id/puisi', page(() => import('./pages/lore/Puisi')), true, false],
  ['/kenangan', page(() => import('./pages/Kenangan')), true, true],
  ['/wrap/:circleId/:scope/:period', page(() => import('./pages/Wrap')), true, false],
  ['/surat', page(() => import('./pages/letters/Letters')), true, false],
  ['/surat/tulis', page(() => import('./pages/letters/Write')), true, false],
  ['/surat/:id', page(() => import('./pages/letters/Read')), true, false],
  ['/aku', page(() => import('./pages/me/Me')), true, true],
  ['/aku/tema', page(() => import('./pages/me/Tema')), false, false],
  ['/aku/keamanan', page(() => import('./pages/me/Keamanan')), true, false],
  ['/bantuan', page(() => import('./pages/Bantuan')), false, false],
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
          <Comp />
        </Suspense>
        {tabs && status === 'ready' ? <TabBar path={path} /> : null}
      </ParamsProvider>
    );
    return needsReady ? <Guard>{body}</Guard> : body;
  }
  return <Landing />;
}
