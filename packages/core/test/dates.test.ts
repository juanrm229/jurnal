import { describe, expect, it } from 'vitest';
import { countdownText, nextOccurrence, upcomingDates } from '../src';

describe('tanggal penting', () => {
  it('kejadian berikutnya, termasuk 29 Februari', () => {
    expect(nextOccurrence(11, 1, '2026-11-01')).toEqual({ date: '2026-11-01', inDays: 0, year: 2026 });
    expect(nextOccurrence(10, 31, '2026-11-01')).toMatchObject({ date: '2027-10-31', year: 2027 });
    expect(nextOccurrence(2, 29, '2026-02-01').date).toBe('2026-02-28');
    expect(nextOccurrence(2, 29, '2027-03-01').date).toBe('2028-02-29');
  });

  it('menggabungkan hari jadi, ulang tahun, dan tanggal sendiri, terdekat dulu', () => {
    const u = upcomingDates({
      today: '2026-11-01',
      circleCreatedDay: '2025-11-20',
      members: [{ userId: 'r', name: 'Raya', birthday: '11-05' }, { userId: 'j', name: 'Juan', birthday: null }],
      custom: [{ id: 'd1', title: 'pertama ketemu', month: 12, day: 24, year: 2024 }],
    });
    expect(u.map((d) => [d.title, d.inDays, d.nth])).toEqual([
      ['ulang tahun Raya', 4, undefined],
      ['hari jadi lingkaran', 19, 1],
      ['pertama ketemu', 53, 2],
    ]);
    // Lingkaran yang baru dibuat tahun ini: hari jadi ke-0 tidak ditampilkan.
    expect(upcomingDates({ today: '2026-11-01', circleCreatedDay: '2026-10-01' })).toHaveLength(1);
    expect(countdownText(0)).toBe('hari ini');
    expect(countdownText(12)).toBe('12 hari lagi');
  });
});
