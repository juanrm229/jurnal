/** Kota Sehari: data kota, patok, dan potongan peta untuk sampul rumah. */
import { KOTA_HUBUNGAN, type KotaClaimWire, type KotaKabarWire, type KotaSuratWire, type KotaJalanWire, type KotaFigurDetail, type KotaFigurWire, type KotaNamaWire, type KotaPeristiwaDetail, type KotaPeristiwaWire, type KotaRelasiWire, type KotaTautanWire, type KotaWire, kotaPlot, type NaskahCanonPayload, type NaskahEntry, type NaskahScenePayload, type NaskahWire, naskahChrono, naskahKacamata } from '@sehari/core';
import { useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './api';
import { store } from './storage';

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

export function useWargaKota() {
  return useQuery({ queryKey: ['kota', 'warga'], queryFn: () => api.get<KotaFigurWire[]>('/kota/warga'), staleTime: 60_000 });
}
export function useFigur(id: string) {
  return useQuery({ queryKey: ['kota', 'warga', id], queryFn: () => api.get<KotaFigurDetail>(`/kota/warga/${id}`) });
}
/** Indeks nama kota untuk penjaga konsistensi di studio. */
export function useNamaKota(enabled: boolean) {
  return useQuery({ queryKey: ['kota', 'nama'], queryFn: () => api.get<KotaNamaWire[]>('/kota/nama'), enabled, staleTime: 120_000 });
}
export const masaHidup = (f: { born?: number; died?: number }) => (f.born ? `${f.born}–${f.died ?? ''}` : f.died ? `wafat ${f.died}` : '');

/** Tokoh yang dipegang penonton di naskah rumah kota milik orang lain (null = bukan pemegang). */
export function usePegangan(ms: { id: string; ownerId: string; visibility: string } | undefined, meId: string | undefined): Set<string> | null {
  const tamu = !!ms && ms.visibility === 'kota' && ms.ownerId !== meId;
  const rumah = useRumahNaskah(ms?.id ?? '', tamu);
  const t = useTautan(tamu ? (rumah.data?.id ?? '') : '');
  if (!tamu) return null;
  return new Set((t.data?.pegang ?? []).filter((x) => x.requesterId === meId && x.state === 'pegang').map((x) => x.tokohId));
}

/** Nama penulis di naskah: nama pena kota untuk rumah kota, nama lingkaran untuk naskah biasa. */
export function usePena(m: { ms: { id: string; visibility: string }; meId: string; who: (u: string) => string }) {
  const kota = m.ms.visibility === 'kota';
  const rumah = useRumahNaskah(m.ms.id, kota);
  const t = useTautan(kota ? (rumah.data?.id ?? '') : '');
  return (u: string) => (!kota ? m.who(u) : u === m.meId ? 'kamu' : rumah.data?.ownerId === u ? rumah.data.penName : (t.data?.pegang?.find((x) => x.requesterId === u)?.penName ?? m.who(u)));
}

/** Kabar kota 60 hari terakhir; "belum dibaca" diingat di perangkat ini. */
export function useKabar() {
  return useQuery({ queryKey: ['kota', 'kabar'], queryFn: () => api.get<KotaKabarWire[]>('/kota/kabar'), staleTime: 60_000 });
}
const LIHAT = 'kota.kabar.lihat';
export const kabarDilihat = () => store.get(LIHAT) ?? '';
export const tandaiKabar = (at: string) => store.set(LIHAT, at);

/** Surat dari Sangkala (ketukan dan permintaan pegang) untuk Kotak Surat. */
export function useSuratKota() {
  return useQuery({ queryKey: ['kota', 'surat'], queryFn: () => api.get<KotaSuratWire[]>('/kota/surat'), staleTime: 30_000 });
}
/** "pukul 14.20" hari ini, "besok pukul 08.05", atau tanggal. */
export function waktuTiba(iso: string) {
  const d = new Date(iso);
  const kini = new Date();
  const jam = `${String(d.getHours()).padStart(2, '0')}.${String(d.getMinutes()).padStart(2, '0')}`;
  const hari = Math.round((new Date(d.toDateString()).getTime() - new Date(kini.toDateString()).getTime()) / 86_400_000);
  return hari === 0 ? `pukul ${jam}` : hari === 1 ? `besok pukul ${jam}` : hari === -1 ? `kemarin pukul ${jam}` : `${d.getDate()}/${d.getMonth() + 1} pukul ${jam}`;
}

/**
 * Ingatan tokoh pindahan dari rumah-rumahnya yang lain (isi rumah kota terbuka):
 * yang ia tahu atau kira di sana sampai tahun adegan. Dipakai Kacamata dan untuk
 * meredam peringatan "belum tahu" atas hal yang sebenarnya sudah ia ketahui.
 */
export function useIngatan(rumah: { id: string; msId: string; household: string; to: number }[], kunci: string, tahun: number | null) {
  const qs = useQueries({ queries: rumah.map((c) => ({ queryKey: ['kota', 'ingatan', c.msId], queryFn: () => api.get<NaskahWire>(`/naskah/${c.msId}`), staleTime: 60_000 })) });
  return rumah.flatMap((c, i) => {
    const w = qs[i]?.data;
    if (!w) return [];
    const plain = (env: unknown) => (env && typeof env === 'object' && 'plain' in env ? (env as { plain: unknown }).plain : null);
    const entri = w.canon.map((e) => ({ id: e.id, p: plain(e.envelope) as NaskahCanonPayload | null })).filter((e): e is NaskahEntry => !!e.p);
    const adegan = w.scenes.map((x) => ({ id: x.id, chapter: x.chapter, order: x.order, p: plain(x.envelope) as NaskahScenePayload | null }));
    const diri = entri.find((e) => e.p.kind === 'tokoh' && (e.id === kunci || e.p.asal?.tokohId === kunci));
    if (!diri) return [];
    const v = naskahKacamata(diri.id, `${Math.min(tahun ?? c.to, c.to)}~9999`, entri, naskahChrono(adegan));
    return [{ id: c.id, household: c.household, tahu: v.tahu, mengira: v.mengira }];
  });
}

/** Jalan-jalan di satu wilayah pada satu tahun. */
export function useJalan(wilayah: string, tahun: number) {
  return useQuery({ queryKey: ['kota', 'jalan', wilayah, tahun], queryFn: () => api.get<KotaJalanWire>(`/kota/jalan?wilayah=${encodeURIComponent(wilayah)}&tahun=${tahun}`), staleTime: 60_000 });
}
