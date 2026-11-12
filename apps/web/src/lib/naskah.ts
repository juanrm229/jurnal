/** Studio Naskah: data dan model bersama. Isi dibuka di perangkat. */
import {
  type NaskahCanonPayload,
  type NaskahEntry,
  type NaskahMeta,
  type NaskahScenePayload,
  type NaskahBentuk,
  type NaskahWorkPayload,
  type NaskahWire,
  naskahChrono,
} from '@sehari/core';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { api } from './api';
import { memberName, newDropId, useCircles } from './data';
import { useReady } from './session';
import { sealPart, useOpenAny } from './stories';

export const nk = { all: ['naskah'] as const, one: (id: string) => ['naskah', id] as const };
export const newNaskahId = () => `n${newDropId().slice(1)}`;

export function useNaskahList() {
  return useQuery({ queryKey: nk.all, queryFn: () => api.get<NaskahWire[]>('/naskah'), refetchInterval: 60_000 });
}
export function useNaskah(id: string) {
  return useQuery({ queryKey: nk.one(id), queryFn: () => api.get<NaskahWire>(`/naskah/${id}`), refetchInterval: 15_000, enabled: !!id });
}
export function useNaskahCache() {
  const qc = useQueryClient();
  return (ms: NaskahWire) => {
    qc.setQueryData(nk.one(ms.id), ms);
    void qc.invalidateQueries({ queryKey: nk.all });
  };
}

export interface Work {
  id: string;
  authorId: string;
  bentuk: NaskahBentuk;
  order: number;
  p: NaskahWorkPayload;
}

export interface Scene {
  id: string;
  authorId: string;
  workId: string | null;
  chapter: number;
  order: number;
  status: 'draf' | 'terbit';
  version: number;
  updatedAt: string;
  p: NaskahScenePayload | null;
}

/** Model satu naskah: semua amplop dibuka, kronologi dihitung, nama tokoh siap dipakai. */
export function useNaskahModel(ms: NaskahWire | undefined) {
  const { me, identity } = useReady();
  const { circles } = useCircles();
  const open = useOpenAny();
  const cache = useNaskahCache();
  const meId = me.user.id;
  return useMemo(() => {
    if (!ms) return null;
    const circle = circles.find((c) => c.id === ms.circleId);
    // Rumah di Kota menyimpan isi terbuka ({ plain }); naskah privat terenkripsi.
    const pub = ms.visibility !== 'privat';
    const unwrap = <T,>(env: unknown): T | null => (env && typeof env === 'object' && 'plain' in env ? ((env as { plain: T }).plain ?? null) : open<T>(env as never));
    const meta = unwrap<NaskahMeta>(ms.meta) ?? { v: 1, title: 'naskah tanpa judul' };
    const scenes: Scene[] = ms.scenes.map((x) => ({ ...x, p: unwrap<NaskahScenePayload>(x.envelope) }));
    const canon: NaskahEntry[] = ms.canon.map((x) => ({ id: x.id, p: unwrap<NaskahCanonPayload>(x.envelope)! })).filter((x) => !!x.p);
    const chrono = naskahChrono(scenes);
    const works: Work[] = ms.works.map((w) => ({ id: w.id, authorId: w.authorId, bentuk: w.bentuk, order: w.order, p: unwrap<NaskahWorkPayload>(w.envelope) ?? { v: 1, title: 'karya' } }));
    /** Adegan sebuah karya; null = kisah lepas (adegan tanpa karya). */
    const scenesOf = (workId: string | null) => scenes.filter((s) => (s.workId ?? null) === workId);
    const workOf = (s: Scene) => works.find((w) => w.id === s.workId) ?? null;
    const tokoh = canon.filter((e) => e.p.kind === 'tokoh');
    const nameOf = (cid: string | undefined) => canon.find((e) => e.id === cid)?.p.name ?? 'tanpa tokoh';
    const chapters = [...new Set(scenes.map((s) => s.chapter))].sort((a, b) => a - b);
    const seal = (v: unknown) => (pub ? { plain: v } : sealPart(v, circle, { id: meId, publicKey: identity.publicKey }));
    const canWrite = ms.members.includes(meId);
    const call = async (f: () => Promise<NaskahWire>) => {
      const next = await f();
      cache(next);
      return next;
    };
    const post = (path: string, body?: unknown) => call(() => api.post<NaskahWire>(`/naskah/${ms.id}${path}`, body));
    const put = (path: string, body?: unknown) => call(() => api.put<NaskahWire>(`/naskah/${ms.id}${path}`, body));
    const del = (path: string) => call(() => api.del<NaskahWire>(`/naskah/${ms.id}${path}`));
    const who = (uid: string) => memberName(circles, uid, meId);
    const face = (uid: string) => (uid === meId ? me.user.doodle : (circle?.members.find((m) => m.userId === uid)?.doodle ?? 'tunas'));
    return { ms, meta, scenes, canon, chrono, tokoh, nameOf, chapters, seal, post, put, del, who, face, meId, circle, pub, canWrite, unwrap, works, scenesOf, workOf };
  }, [ms, circles, open, meId]);
}
export type NaskahModel = NonNullable<ReturnType<typeof useNaskahModel>>;

/** Warna tetap per tokoh, supaya sudut pandang mudah dikenali di daftar dan garis waktu. */
const POV_COLORS = ['#2a14d6', '#c2371f', '#1f7a4d', '#b8860b', '#7b3fb8', '#0f6f8f', '#b2456e', '#5a5a14'];
export const povColor = (m: NaskahModel, cid: string | undefined) => {
  const i = m.tokoh.findIndex((t) => t.id === cid);
  return i < 0 ? '#8a8a92' : POV_COLORS[i % POV_COLORS.length]!;
};

export const firstLine = (t: string | undefined, n = 90) => {
  const s = (t ?? '').trim().replace(/\s+/g, ' ');
  return s.length > n ? `${s.slice(0, n)}…` : s;
};

const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
/** "1979-02-14" → "Rabu, 14 Februari 1979"; tanggal sebagian tetap dibaca seadanya. */
export function tglPanjang(sort: string | undefined): string {
  const m = sort?.match(/^(\d{4})(?:-(\d{2}))?(?:-(\d{2}))?/);
  if (!m) return '';
  const [, y, mo, d] = m;
  if (d) return `${HARI[new Date(Number(y), Number(mo) - 1, Number(d)).getDay()]}, ${Number(d)} ${BULAN[Number(mo) - 1]} ${y}`;
  if (mo) return `${BULAN[Number(mo) - 1]} ${y}`;
  return y!;
}
