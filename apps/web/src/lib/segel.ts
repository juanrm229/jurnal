/**
 * Klien SEBELUM DISEGEL. Memakai identitas tamu & kemampuan HP yang sama
 * dengan SIDIK (narator, getar, layar menyala, bunyi).
 */
import { segel } from '@sehari/core';
import { callGame, useGameRoom } from './sidik';
import { store } from './storage';

export type View = segel.View;
export type Tema = segel.Tema;

export const createMeja = (p: { name: string; avatar: string }) => callGame<View>('segel', 'POST', '/rooms', p);
export const joinMeja = (code: string, p: { name: string; avatar: string }) => callGame<View>('segel', 'POST', `/rooms/${code}/join`, p);
export const sendSegel = (code: string, action: segel.Action) => callGame<View>('segel', 'POST', `/rooms/${code}/act`, { action });
export const leaveMeja = (code: string) => callGame('segel', 'POST', `/rooms/${code}/leave`);
export const useMeja = (code: string, opts: { tv?: boolean } = {}) => useGameRoom<View>('segel', code, opts);

export const temaOfView = (v: Pick<View, 'tema'>) => segel.temaOf(v.tema ?? 'kedai');
export const dimOfView = (v: Pick<View, 'dim'>): segel.Dim => v.dim ?? { K: 4, R: 3, T: 3 };

/** Nilai jangkar dalam bahasa kasus. */
export function anchorLabel(tm: Tema, a: segel.Anchor, v: number | null | undefined) {
  if (v === null || v === undefined) return '—';
  return a === 'p' ? (tm.tokoh[v]?.name ?? '?') : a === 'r' ? (tm.jalur[v] ?? '?') : segel.slotTime(tm, v);
}

export interface SegelStats {
  games: number;
  wins: number;
  asRevisi: number;
  revisiWins: number;
  perfect: number;
}
export const segelStats = {
  get: (): SegelStats => store.json<SegelStats>('segelStats') ?? { games: 0, wins: 0, asRevisi: 0, revisiWins: 0, perfect: 0 },
  add(kubu: string, won: boolean, perfect: boolean) {
    const s = segelStats.get();
    s.games++;
    if (won) s.wins++;
    if (won && perfect) s.perfect++;
    if (kubu === 'revisi') {
      s.asRevisi++;
      if (won) s.revisiWins++;
    }
    store.set('segelStats', JSON.stringify(s));
  },
};

export const GELAR: [number, string, string][] = [
  [0, 'Juru Salin', 'pena'],
  [3, 'Penjaga Berkas', 'buku'],
  [8, 'Arsiparis', 'rak-buku'],
  [15, 'Penyegel', 'segel-lilin'],
  [25, 'Kurator Kebenaran', 'bintang'],
];
export const gelarOf = (wins: number) => [...GELAR].reverse().find(([m]) => wins >= m)!;
