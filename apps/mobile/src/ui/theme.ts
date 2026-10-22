/**
 * Estetika kertas, bukan layar: abu-abu kertas, tinta biru, huruf mesin tik,
 * dan tulisan tangan untuk hal-hal yang terasa pribadi.
 */
import { createContext, useContext } from 'react';

export interface Palette {
  paper: string;
  card: string;
  cardEdge: string;
  ink: string;
  inkSoft: string;
  text: string;
  textSoft: string;
  pill: string;
  onInk: string;
  danger: string;
  fog: string;
  sticky: { yellow: string; peach: string; green: string; blue: string };
  overlay: string;
  /** Halaman menguning (0..1 dicampur ke kartu). */
  aged: string;
}

export const LIGHT: Palette = {
  paper: '#E6E6E8',
  card: '#EEEEF0',
  cardEdge: '#F6F6F8',
  ink: '#2A14D6',
  inkSoft: '#A9A4E8',
  text: '#16161A',
  textSoft: '#6E6E78',
  pill: '#CFCBF3',
  onInk: '#FFFFFF',
  danger: '#C2410C',
  fog: '#B9B9C4',
  sticky: { yellow: '#FDEE8A', peach: '#F8C995', green: '#C6F0A8', blue: '#CFE3FF' },
  overlay: 'rgba(22,22,26,0.35)',
  aged: '#E9D9AE',
};

export const DARK: Palette = {
  paper: '#000000',
  card: '#121214',
  cardEdge: '#1C1C20',
  ink: '#B3ACFF',
  inkSoft: '#5D58A6',
  text: '#F1F1F4',
  textSoft: '#8A8A96',
  pill: '#24204F',
  onInk: '#0A0A0C',
  danger: '#FB923C',
  fog: '#3A3A44',
  sticky: { yellow: '#5C5320', peach: '#5C4022', green: '#2F4B22', blue: '#22344F' },
  overlay: 'rgba(0,0,0,0.6)',
  aged: '#3B3320',
};

export const FONTS = {
  mono: 'IBMPlexMono_400Regular',
  monoMedium: 'IBMPlexMono_500Medium',
  monoItalic: 'IBMPlexMono_400Regular_Italic',
  hand: 'Caveat_500Medium',
  handBold: 'Caveat_700Bold',
} as const;

export const SPACE = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 } as const;
export const RADIUS = { sm: 8, md: 16, lg: 28, xl: 40 } as const;
export const MAX_WIDTH = 520;

export interface Theme {
  dark: boolean;
  c: Palette;
}

export const ThemeContext = createContext<Theme>({ dark: false, c: LIGHT });
export const useTheme = () => useContext(ThemeContext);

/** Campur dua warna hex (t 0..1). */
export function mix(a: string, b: string, t: number): string {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const ch = (shift: number) => Math.round(((pa >> shift) & 255) * (1 - t) + ((pb >> shift) & 255) * t);
  return `#${[16, 8, 0].map((s) => ch(s).toString(16).padStart(2, '0')).join('')}`;
}

export function withAlpha(hex: string, alpha: number): string {
  const a = Math.round(alpha * 255).toString(16).padStart(2, '0');
  return `${hex}${a}`;
}
