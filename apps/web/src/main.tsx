import '@fontsource/ibm-plex-mono/400.css';
import '@fontsource/ibm-plex-mono/500.css';
import '@fontsource/caveat/500.css';
import '@fontsource/caveat/700.css';
import '@fontsource-variable/fraunces/opsz.css';
import '@fontsource-variable/fraunces/opsz-italic.css';
import '@fontsource/literata/400.css';
import '@fontsource/literata/400-italic.css';
import '@fontsource/literata/600.css';
import './styles/base.css';
import './styles/page.css';
import './styles/lore.css';
import './styles/story.css';
import './styles/landing.css';
import './styles/ui.css';
import './styles/karya.css';
import './styles/motion.css';
import './styles/janji.css';
import './styles/tentang.css';
import './styles/rupa.css';
import './styles/photobox.css';
import './styles/polish.css';
import './styles/sidik.css';
import './styles/main.css';
import './styles/wrapped.css';
import './styles/kilasan.css';
import './styles/sistem.css';
import './styles/cerita.css';
import './styles/naskah.css';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Component, type ReactNode, StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './lib/install';
import { installGlobalSounds } from './lib/sound';
import { applyTheme, currentTheme } from './lib/theme';
import { SessionProvider } from './lib/session';
import { ToastHost } from './ui/kit';

applyTheme(currentTheme());
installGlobalSounds();

const qc = new QueryClient({
  defaultOptions: { queries: { staleTime: 20_000, refetchOnWindowFocus: true, retry: (n, e) => n < 2 && ![401, 403, 404].includes((e as { status?: number }).status ?? 0) } },
});

/** Penangkap galat terluar: apa pun yang gagal, jangan pernah layar kosong. */
class RootErrorBoundary extends Component<{ children: ReactNode }, { error: unknown }> {
  state = { error: null as unknown };
  static getDerivedStateFromError(error: unknown) {
    return { error };
  }
  componentDidCatch(error: unknown) {
    console.error('aplikasi gagal', error);
  }
  render() {
    if (!this.state.error) return this.props.children;
    const e = this.state.error as { message?: string; stack?: string };
    return (
      <main className="screen">
        <div className="col center" style={{ alignItems: 'center', textAlign: 'center', gap: 14, paddingTop: '18vh' }}>
          <h1 className="h2" style={{ fontSize: 20 }}>Ada yang gagal dimuat</h1>
          <p className="soft small" style={{ maxWidth: 340, margin: 0 }}>Coba muat ulang. Kalau masih begini, kirim tangkapan layar ini, ya.</p>
          <button className="btn auto" onClick={() => location.reload()}>muat ulang</button>
          <a className="tiny soft" href="/hari">ke halaman hari ini</a>
          <pre className="tiny soft" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', maxWidth: '92vw', textAlign: 'left' }}>
            {location.pathname}
            {'\n'}
            {String(e?.message ?? e)}
            {'\n'}
            {(e?.stack ?? '').split('\n').slice(0, 6).join('\n')}
          </pre>
        </div>
      </main>
    );
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
   <RootErrorBoundary>
    <QueryClientProvider client={qc}>
      <SessionProvider>
        <ToastHost>
          <App />
        </ToastHost>
      </SessionProvider>
    </QueryClientProvider>
   </RootErrorBoundary>
  </StrictMode>,
);

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => void navigator.serviceWorker.register('/sw.js'));
}
