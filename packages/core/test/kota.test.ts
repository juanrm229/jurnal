import { describe, expect, it } from 'vitest';
import { KOTA_LIRIH, kotaFree, kotaInside, kotaOpen, kotaOverlap, kotaPlot, kotaPlots } from '../src/kota';

describe('kota lirih', () => {
  it('persil deterministik di dalam wilayah yang dibuka, dengan alamat', () => {
    for (const r of KOTA_LIRIH.filter(kotaOpen)) {
      const ps = kotaPlots(r.id);
      expect(ps.length).toBeGreaterThan(40);
      expect(ps.every((p) => kotaInside([p.x, p.y], r.poly))).toBe(true);
      expect(new Set(ps.map((p) => p.address)).size).toBe(ps.length);
    }
    expect(kotaPlot('bantaran.12')?.address).toMatch(/No\. \d+$/);
    expect(kotaPlots('pantai')).toEqual([]);
  });
  it('rentang lowong dan tumpang tindih', () => {
    expect(kotaOverlap({ from: 1950, to: 1980 }, { from: 1980, to: 1990 })).toBe(true);
    expect(kotaOverlap({ from: 1950, to: 1979 }, { from: 1980, to: 1990 })).toBe(false);
    expect(kotaFree([{ from: 1952, to: 1981 }, { from: 1995, to: 2030 }])).toEqual([{ from: 1900, to: 1951 }, { from: 1982, to: 1994 }]);
  });
});
