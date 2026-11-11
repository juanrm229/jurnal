import { describe, expect, it } from 'vitest';
import { benihTalk, paperPhase, plantFor, primbon } from '../src';

const cov = (counts = false) => ({ day: '2026-11-01', active: 2, sealed: counts ? 2 : 0, frozen: 0, fraction: counts ? 1 : 0, counts });
const plant = (together: number, current: number, warmth: number, extra: { wateredBy?: string[]; createdDay?: string } = {}) =>
  plantFor({ streak: { togetherDays: together, current, warmth, today: cov() }, createdDay: extra.createdDay ?? '2026-09-01', today: '2026-11-01', wateredBy: extra.wateredBy });

describe('si benih bawel', () => {
  it('merajuk saat layu, girang saat disiram, tidur saat malam', () => {
    expect(benihTalk(plant(20, 0, 0.1), { hour: 14, seed: 'a' }).mood).toBe('ngambek');
    expect(benihTalk(plant(20, 0, 0.3), { hour: 14, seed: 'a' }).mood).toBe('haus');
    expect(benihTalk(plant(20, 0, 0.1, { wateredBy: ['Raya'] }), { hour: 14, seed: 'a' }).mood).toBe('girang');
    const t = benihTalk(plant(20, 3, 0.9), { hour: 23, seed: 'a' });
    expect(t.mood).toBe('tidur');
    expect(t.lines[0]).toMatch(/^Zzz/);
  });

  it('cemburu pada Ruang Main dan berpesta di hari jadi', () => {
    const j = benihTalk(plant(20, 3, 0.9), { hour: 14, seed: 'a', playedMinutes: 25 });
    expect(j.mood).toBe('cemburu');
    expect(j.lines[0]).toContain('25 menit');
    expect(benihTalk(plant(20, 3, 0.9, { createdDay: '2025-11-01' }), { hour: 23, seed: 'a' }).mood).toBe('pesta');
  });

  it('celetukan tidak berulang dan urutannya tetap untuk benih yang sama', () => {
    const a = benihTalk(plant(8, 8, 1), { hour: 9, seed: 'x:2026-11-01' });
    const b = benihTalk(plant(8, 8, 1), { hour: 9, seed: 'x:2026-11-01' });
    expect(a.lines).toEqual(b.lines);
    expect(new Set(a.lines).size).toBe(a.lines.length);
    expect(a.lines.length).toBeGreaterThan(4);
  });
});

describe('primbon ngawur', () => {
  it('meramu kata dari halaman, dan tetap untuk benih yang sama', () => {
    const p = primbon(['Hari ini beli martabak di dekat stasiun, lalu kehujanan', 'martabak lagi, stasiun lagi'], 'u1:2026-11-01');
    expect(p.words).toHaveLength(2);
    expect(p.words.every((w) => ['martabak', 'stasiun', 'kehujanan', 'dekat', 'beli', 'lalu'].includes(w))).toBe(true);
    expect(p.text).toContain(p.words[0]!);
    expect(primbon(['Hari ini beli martabak di dekat stasiun, lalu kehujanan', 'martabak lagi, stasiun lagi'], 'u1:2026-11-01')).toEqual(p);
  });

  it('halaman tanpa tulisan tetap dapat ramalan', () => {
    const p = primbon([], 'u1:2026-11-02');
    expect(p.words).toEqual([]);
    expect(p.text.length).toBeGreaterThan(20);
    expect(p.text).not.toContain('undefined');
  });
});

describe('kertas ikut senja', () => {
  const jkt = { lat: -6.2, lon: 106.82 };
  // Jakarta 22 Okt 2026: matahari terbit ±05.27, terbenam ±17.48 WIB.
  const at = (h: number, m = 0) => new Date(Date.UTC(2026, 9, 22, h - 7, m));
  it('siang, senja, lalu malam sampai matahari terbit', () => {
    expect(paperPhase(at(4, 30), jkt, 'Asia/Jakarta')).toBe('malam');
    expect(paperPhase(at(9), jkt, 'Asia/Jakarta')).toBe('siang');
    expect(paperPhase(at(16, 50), jkt, 'Asia/Jakarta')).toBe('siang');
    expect(paperPhase(at(17, 30), jkt, 'Asia/Jakarta')).toBe('senja');
    expect(paperPhase(at(18, 5), jkt, 'Asia/Jakarta')).toBe('senja');
    expect(paperPhase(at(18, 30), jkt, 'Asia/Jakarta')).toBe('malam');
    expect(paperPhase(at(23, 50), jkt, 'Asia/Jakarta')).toBe('malam');
  });
  it('tanpa kota memakai jam setempat', () => {
    expect(paperPhase(at(12), null, 'Asia/Jakarta')).toBe('siang');
    expect(paperPhase(at(17, 30), null, 'Asia/Jakarta')).toBe('senja');
    expect(paperPhase(at(21), null, 'Asia/Jakarta')).toBe('malam');
  });
});
