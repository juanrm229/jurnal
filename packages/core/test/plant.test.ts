import { describe, expect, it } from 'vitest';
import { nextAnniversary, plantFor } from '../src';

const cov = (counts = false) => ({ day: '2026-11-01', active: 2, sealed: counts ? 2 : 0, frozen: 0, fraction: counts ? 1 : 0, counts });
const streak = (togetherDays: number, current: number, warmth: number, today = cov()) => ({ togetherDays, current, warmth, today });

describe('tanaman berdua', () => {
  it('tumbuh mengikuti hari yang disegel bersama', () => {
    expect(plantFor({ streak: streak(0, 0, 0), createdDay: '2026-11-01', today: '2026-11-01' }).stage.key).toBe('benih');
    expect(plantFor({ streak: streak(7, 7, 1), createdDay: '2026-10-01', today: '2026-11-01' }).stage.key).toBe('kuncup');
    const p = plantFor({ streak: streak(31, 3, 0.8), createdDay: '2026-09-01', today: '2026-11-01' });
    expect(p.stage.key).toBe('matahari');
    expect(p.next?.key).toBe('pohon');
    expect(p.toNext).toBe(69);
    expect(plantFor({ streak: streak(400, 0, 0.9), createdDay: '2025-01-01', today: '2026-11-01' }).stage.key).toBe('pohon-lampu');
  });

  it('layu pelan kalau lama tidak disiram, tapi segar lagi begitu disiram', () => {
    expect(plantFor({ streak: streak(20, 0, 0.1), createdDay: '2026-09-01', today: '2026-11-01' }).health).toBe('layu');
    expect(plantFor({ streak: streak(20, 0, 0.3), createdDay: '2026-09-01', today: '2026-11-01' }).health).toBe('haus');
    const w = plantFor({ streak: streak(20, 0, 0.1), createdDay: '2026-09-01', today: '2026-11-01', wateredBy: ['Raya', 'Raya'] });
    expect(w.health).toBe('segar');
    expect(w.line).toBe('Sudah disiram hari ini oleh Raya.');
    expect(plantFor({ streak: streak(20, 4, 0.9, cov(true)), createdDay: '2026-09-01', today: '2026-11-01' }).line).toMatch(/^Hari ini disegel bersama/);
  });

  it('hari bersama & hari jadi', () => {
    const p = plantFor({ streak: streak(5, 5, 1), createdDay: '2026-10-01', today: '2026-11-01' });
    expect(p.sinceDays).toBe(32);
    expect(nextAnniversary('2026-10-01', '2026-11-01')).toEqual({ years: 1, inDays: 334 });
    expect(nextAnniversary('2025-11-01', '2026-11-01')).toEqual({ years: 1, inDays: 0 });
    expect(nextAnniversary('2024-02-29', '2026-03-01')).toEqual({ years: 3, inDays: 364 });
  });
});
