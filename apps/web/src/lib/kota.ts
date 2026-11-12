/** Kota Sehari: data kota, patok, dan potongan peta untuk sampul rumah. */
import { KOTA_HUBUNGAN, type KotaClaimWire, type KotaPeristiwaDetail, type KotaPeristiwaWire, type KotaRelasiWire, type KotaTautanWire, type KotaWire, kotaPlot } from '@sehari/core';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './api';

export const kk = { all: ['kota'] as const, one: (id: string) => ['kota', id] as const };

export function useKota() {
  return useQuery({ queryKey: kk.all, queryFn: () => api.get<KotaWire>('/kota'), refetchInterval: 60_000 });
}
export function useKotaClaim(id: string) {
  return useQuery({ queryKey: kk.one(id), queryFn: () => api.get<KotaClaimWire>(`/kota/claims/${id}`) });
}
export function useKotaRefresh() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: kk.all });
}

export const KOTA_IMG = { kecil: '/kota/sangkala-kecil.webp', sedang: '/kota/sangkala-2k.webp', besar: '/kota/sangkala-4k.webp' };

/** Gaya latar untuk menampilkan potongan peta di sekitar sebuah persil. */
export function kotaCrop(plotId: string, w: number, h: number, zoom = 3) {
  const p = kotaPlot(plotId);
  const x = p?.x ?? 1000;
  const y = p?.y ?? 560;
  return {
    backgroundImage: `url(${KOTA_IMG.besar}), url(${KOTA_IMG.sedang})`,
    backgroundSize: `${2000 * zoom}px ${1125 * zoom}px, ${2000 * zoom}px ${1125 * zoom}px`,
    backgroundPosition: `${-(x * zoom - w / 2)}px ${-(y * zoom - h / 2)}px, ${-(x * zoom - w / 2)}px ${-(y * zoom - h / 2)}px`,
  };
}

/** Potongan peta di sekitar sebuah titik peta. */
export function kotaCropAt(x: number, y: number, w: number, h: number, zoom = 2) {
  return {
    backgroundImage: `url(${KOTA_IMG.besar}), url(${KOTA_IMG.sedang})`,
    backgroundSize: `${2000 * zoom}px ${1125 * zoom}px, ${2000 * zoom}px ${1125 * zoom}px`,
    backgroundPosition: `${-(x * zoom - w / 2)}px ${-(y * zoom - h / 2)}px, ${-(x * zoom - w / 2)}px ${-(y * zoom - h / 2)}px`,
  };
}

/** Rumah yang hidup pada tahun tertentu. */
export const liveAt = (c: KotaClaimWire, year: number) => c.state === 'aktif' && c.from <= year && year <= c.to;

export function useTautan(claimId: string) {
  return useQuery({ queryKey: ['kota', claimId, 'tautan'], queryFn: () => api.get<KotaTautanWire>(`/kota/claims/${claimId}/tautan`), enabled: !!claimId });
}
export function useSilsilah(claimId: string) {
  return useQuery({ queryKey: ['kota', claimId, 'silsilah'], queryFn: () => api.get<KotaTautanWire>(`/kota/silsilah/${claimId}`) });
}

/** Kalimat hubungan dilihat dari sebuah rumah: "Laras adalah anak dari Pak Darmo". */
export function kalimat(r: KotaRelasiWire, t: KotaTautanWire, dari: string) {
  const name = (id: string) => t.tokoh.find((x) => x.id === id)?.name ?? 'seseorang';
  const house = (id: string) => t.claims.find((x) => x.id === id)?.household ?? 'rumah yang sudah pergi';
  const mine = r.fromClaimId === dari;
  const type = r.type;
  return mine
    ? { aku: name(r.fromTokoh), dia: name(r.toTokoh), jenis: KOTA_HUBUNGAN[type].label, rumah: house(r.toClaimId), rumahId: r.toClaimId }
    : { aku: name(r.toTokoh), dia: name(r.fromTokoh), jenis: KOTA_HUBUNGAN[KOTA_HUBUNGAN[type].balik].label, rumah: house(r.fromClaimId), rumahId: r.fromClaimId };
}

export function useAlmanak(enabled = true) {
  return useQuery({ queryKey: ['kota', 'almanak'], queryFn: () => api.get<KotaPeristiwaWire[]>('/kota/almanak'), enabled, staleTime: 60_000 });
}
export function usePeristiwa(id: string) {
  return useQuery({ queryKey: ['kota', 'peristiwa', id], queryFn: () => api.get<KotaPeristiwaDetail>(`/kota/peristiwa/${id}`) });
}
/** Rumah kota pemilik sebuah naskah (null kalau naskahnya bukan rumah di kota). */
export function useRumahNaskah(msId: string, enabled: boolean) {
  return useQuery({ queryKey: ['kota', 'naskah', msId], queryFn: () => api.get<KotaClaimWire>(`/kota/naskah/${msId}`), enabled, retry: false });
}
export const tanggal = (e: { year: number; month?: number; toYear?: number }) =>
  `${e.month ? `${['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'][e.month - 1]} ` : ''}${e.year}${e.toYear && e.toYear !== e.year ? `–${e.toYear}` : ''}`;
