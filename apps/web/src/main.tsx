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
import './styles/polish.css';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
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

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={qc}>
      <SessionProvider>
        <ToastHost>
          <App />
        </ToastHost>
      </SessionProvider>
    </QueryClientProvider>
  </StrictMode>,
);

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => void navigator.serviceWorker.register('/sw.js'));
}
