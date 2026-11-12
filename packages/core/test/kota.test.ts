import { describe, expect, it } from 'vitest';
import { KOTA_WILAYAH, kotaCekHubungan, kotaFree, kotaInside, kotaOpen, kotaOverlap, kotaPlot, kotaPlots } from '../src/kota';

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
});
