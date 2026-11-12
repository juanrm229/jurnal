/**
 * Tema: warna tinta doodle & warna kertas bisa diganti. Disimpan di perangkat
 * dan (bila masuk) di pengaturan akun supaya sama di semua perangkat.
 */
import { getCity, type PaperPhase, paperPhase, sunsetUtc, todayIn } from '@sehari/core';
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
  /** Kertas Ikut Senja: menghangat menjelang matahari terbenam, menggelap sesudahnya. Disimpan di perangkat. */
  auto?: boolean;
}

/** Di mana pengguna berada, untuk menghitung senja. Diisi saat sesi siap. */
let sky: { where: { lat: number; lon: number } | null; tz: string } | null = null;

export function phaseNow(): PaperPhase {
  return paperPhase(new Date(), sky?.where, sky?.tz ?? Intl.DateTimeFormat().resolvedOptions().timeZone);
}

/** Jam matahari terbenam hari ini di kota pengguna, mis. "17.48". */
export function sunsetLabel(): string | null {
  if (!sky?.where) return null;
  const t = sunsetUtc(todayIn(sky.tz), sky.where.lat, sky.where.lon);
  return t ? new Intl.DateTimeFormat('id-ID', { timeZone: sky.tz, hour: '2-digit', minute: '2-digit' }).format(t) : null;
}

const DUSK_TINT = [0xf4, 0xb7, 0x8a] as const;
function mixHex(hex: string, [r, g, b]: readonly [number, number, number], amount: number) {
  const n = parseInt(hex.slice(1), 16);
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v, i) => Math.round(v * (1 - amount) + [r, g, b][i]! * amount));
  return `#${c.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

export function applyTheme(t: ThemeChoice) {
  const chosen = PAPERS.find((p) => p.id === t.paper) ?? PAPERS[0];
  const phase: PaperPhase = t.auto && !chosen.dark ? phaseNow() : 'siang';
  const night = PAPERS.find((p) => p.dark)!;
  const paper = phase === 'malam' ? night : chosen;
  const color = phase === 'senja' ? mixHex(chosen.color, DUSK_TINT, 0.26) : paper.color;
  const root = document.documentElement;
  // Tinta gelap di kertas malam diterangkan supaya tetap terbaca.
  const tinta = /^#[0-9a-f]{6}$/i.test(t.ink) ? t.ink : INKS[0].id;
  const ink = paper.dark ? `color-mix(in srgb, ${tinta} 55%, #ffffff)` : tinta;
  root.style.setProperty('--ink', ink);
  root.style.setProperty('--paper', color);
  root.dataset.dark = paper.dark ? '1' : '0';
  root.dataset.sky = t.auto ? phase : '';
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', color);
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
      if (local.ink !== s.ink || local.paper !== s.paper) setTheme({ ...local, ink: s.ink, paper: s.paper }, false);
    }
  }, [me?.user.settings.ink, me?.user.settings.paper]);
  // Kertas Ikut Senja: tahu kota pengguna, lalu periksa langit tiap menit.
  useEffect(() => {
    const city = getCity(me?.user.cityId);
    sky = me ? { where: city ? { lat: city.lat, lon: city.lon } : null, tz: me.user.tz } : null;
    const tick = () => {
      const t = currentTheme();
      if (t.auto) applyTheme(t);
    };
    tick();
    const id = window.setInterval(tick, 60_000);
    document.addEventListener('visibilitychange', tick);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', tick);
    };
  }, [me?.user.cityId, me?.user.tz]);
}
