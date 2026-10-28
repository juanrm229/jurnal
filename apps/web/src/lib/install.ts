/**
 * Pasang ke layar utama (PWA). Event `beforeinstallprompt` hanya datang sekali
 * saat halaman dimuat, jadi ditangkap sedini mungkin dan disimpan di sini.
 */
import { useEffect, useState } from 'react';

type Prompt = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };
let deferred: Prompt | null = null;
const subs = new Set<() => void>();
const ping = () => subs.forEach((f) => f());

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferred = e as Prompt;
    ping();
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
    ping();
  });
}

export const isStandalone = () => typeof window !== 'undefined' && (window.matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true);
export const isIos = () => typeof navigator !== 'undefined' && /iphone|ipad|ipod/i.test(navigator.userAgent);

export function useInstall() {
  const [, set] = useState(0);
  useEffect(() => {
    const f = () => set((n) => n + 1);
    subs.add(f);
    return () => void subs.delete(f);
  }, []);
  return {
    /** Bisa memasang langsung (Chrome/Edge/Android). */
    canPrompt: !!deferred,
    installed: isStandalone(),
    ios: isIos(),
    prompt: async () => {
      if (!deferred) return false;
      await deferred.prompt();
      const { outcome } = await deferred.userChoice;
      deferred = null;
      ping();
      return outcome === 'accepted';
    },
  };
}
