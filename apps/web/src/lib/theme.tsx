/**
 * Tema: warna tinta doodle & warna kertas bisa diganti. Disimpan di perangkat
 * dan (bila masuk) di pengaturan akun supaya sama di semua perangkat.
 */
import { useEffect } from 'react';
import { api } from './api';
import { useSession } from './session';
import { store } from './storage';

export const INKS = [
  { id: '#2A14D6', name: 'tinta biru' },
  { id: '#B3361F', name: 'merah bata' },
  { id: '#2F6B3A', name: 'hijau lumut' },
  { id: '#0E6E8C', name: 'biru laut' },
  { id: '#6A2FB8', name: 'ungu senja' },
  { id: '#C2337A', name: 'merah jambu' },
  { id: '#6B4226', name: 'coklat kopi' },
  { id: '#222226', name: 'arang' },
] as const;

export const PAPERS = [
  { id: 'putih', name: 'putih', color: '#F7F7F4', dark: false },
  { id: 'abu', name: 'abu kertas', color: '#E6E6E8', dark: false },
  { id: 'krem', name: 'krem', color: '#F1EBDD', dark: false },
  { id: 'tua', name: 'kertas tua', color: '#E9DFC8', dark: false },
  { id: 'malam', name: 'malam', color: '#0B0B0E', dark: true },
] as const;

export interface ThemeChoice {
  ink: string;
  paper: string;
}

export function applyTheme(t: ThemeChoice) {
  const paper = PAPERS.find((p) => p.id === t.paper) ?? PAPERS[0];
  const root = document.documentElement;
  // Tinta gelap di kertas malam diterangkan supaya tetap terbaca.
  const ink = paper.dark ? `color-mix(in srgb, ${t.ink} 55%, #ffffff)` : t.ink;
  root.style.setProperty('--ink', ink);
  root.style.setProperty('--paper', paper.color);
  root.dataset.dark = paper.dark ? '1' : '0';
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', paper.color);
}

export function currentTheme(): ThemeChoice {
  return store.json<ThemeChoice>('theme') ?? { ink: INKS[0].id, paper: 'putih' };
}

export function setTheme(t: ThemeChoice, sync = true) {
  store.set('theme', JSON.stringify(t));
  applyTheme(t);
  if (sync) void api.patch('/me', { settings: { ink: t.ink, paper: t.paper } }).catch(() => {});
}

/** Terapkan tema dari akun bila berbeda dengan perangkat. */
export function useThemeSync() {
  const { me } = useSession();
  useEffect(() => {
    const s = me?.user.settings;
    if (s?.ink && s.paper) {
      const local = currentTheme();
      if (local.ink !== s.ink || local.paper !== s.paper) setTheme({ ink: s.ink, paper: s.paper }, false);
    }
  }, [me?.user.settings.ink, me?.user.settings.paper]);
}
