import { describe, expect, it } from 'vitest';
import { KOTA_WARGA_AWAL, KOTA_WILAYAH, kotaCekHubungan, kotaCekTeks, kotaFigurKini, kotaFree, kotaInside, kotaOpen, kotaOverlap, kotaPlot, kotaPlots } from '../src/kota';

describe('kota sangkala', () => {
  it('persil deterministik di dalam wilayah yang dibuka, dengan alamat', () => {
    for (const r of KOTA_WILAYAH.filter(kotaOpen)) {
      const ps = kotaPlots(r.id);
      expect(ps.length).toBeGreaterThan(40);
      expect(ps.every((p) => kotaInside([p.x, p.y], r.poly))).toBe(true);
      expect(new Set(ps.map((p) => p.address)).size).toBe(ps.length);
    }
    expect(kotaPlot('lorongsumbu.12')?.address).toMatch(/No\. \d+$/);
    expect(kotaPlots('pasirpengantin')).toEqual([]);
  });
  it('rentang lowong dan tumpang tindih', () => {
    expect(kotaOverlap({ from: 1950, to: 1980 }, { from: 1980, to: 1990 })).toBe(true);
    expect(kotaOverlap({ from: 1950, to: 1979 }, { from: 1980, to: 1990 })).toBe(false);
    expect(kotaFree([{ from: 1952, to: 1981 }, { from: 1995, to: 2030 }])).toEqual([{ from: 1900, to: 1951 }, { from: 1982, to: 1994 }]);
  });

  it('pemeriksaan hubungan: usia orang tua, wafat sebelum lahir, leluhur, dan masa yang bersinggungan', () => {
    const darmo = { name: 'Pak Darmo', born: 1921, died: 1979, from: 1952, to: 1981 };
    const laras = { name: 'Laras', born: 1977, from: 1998, to: 2030 };
    expect(kotaCekHubungan('anak', laras, darmo).every((c) => c.ok)).toBe(true);
    expect(kotaCekHubungan('anak', { ...laras, born: 1985 }, darmo).some((c) => !c.ok)).toBe(true);
    expect(kotaCekHubungan('orangtua', darmo, { ...laras, born: 1930 }).some((c) => !c.ok)).toBe(true);
    expect(kotaCekHubungan('leluhur', { name: 'Opa', born: 1890, from: 1930, to: 1972 }, laras).every((c) => c.ok)).toBe(true);
    expect(kotaCekHubungan('teman', { name: 'Kakek', born: 1880, died: 1930, from: 1900, to: 1930 }, laras).some((c) => !c.ok)).toBe(true);
    expect(kotaCekHubungan('saudara', laras, { name: 'Dina', from: 1952, to: 1981 })[0]!.warn).toBe(true);
  });

  it('penjaga konsistensi: tokoh rumah lain, figuran di luar masa hidupnya, dan saran mencatat perjumpaan', () => {
    const nama = [
      { name: 'Laras', kind: 'warga' as const, claimId: 'kLaras', household: 'Kos Laras', tokohId: 'tLaras', sapa: 'tertutup' as const },
      { name: 'Bu Tin', kind: 'warga' as const, claimId: 'kTin', household: 'Warung Bu Tin', tokohId: 'tTin', sapa: 'disapa' as const },
      { name: 'Dina', kind: 'warga' as const, claimId: 'kDarmo', household: 'Keluarga Darmo', tokohId: 'tDina' },
      { name: 'Mbah Tembang', kind: 'figur' as const, figurId: 'warga.tembang', born: 1911, died: 1984, julukan: 'pengemis yang selalu bernyanyi' },
    ];
    const teks = 'Dina melihat Laras di warung Bu Tin, sementara Mbah Tembang bernyanyi di tangga.';
    const o = { claimId: 'kDarmo', linked: [], desas: [], jumpa: [], year: 1979 };
    expect(kotaCekTeks(teks, nama, o).map((x) => [x.kind, x.term])).toEqual([['rumah-lain', 'Laras'], ['figur-jumpa', 'Mbah Tembang']]);
    expect(kotaCekTeks(teks, nama, { ...o, linked: ['tLaras'], jumpa: ['warga.tembang'] })).toEqual([]);
    expect(kotaCekTeks(teks, nama, { ...o, desas: ['laras'], year: 1990 }).map((x) => x.kind)).toEqual(['figur-waktu']);
  });

  it('lembar figuran berubah oleh perubahan besar yang sudah kanon', () => {
    const jamil = KOTA_WARGA_AWAL.find((f) => f.id === 'warga.jamil')!;
    const kini = kotaFigurKini(jamil, [{ kind: 'wafat', text: 'di tikungan', year: 2019 }, { kind: 'fakta', text: 'Sepedanya disimpan di kantor pos.' }]);
    expect(kini.died).toBe(2019);
    expect(kini.tetap.at(-1)).toBe('Sepedanya disimpan di kantor pos.');
    expect(jamil.died).toBeUndefined();
  });
});
