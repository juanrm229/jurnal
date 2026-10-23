import { describe, expect, it } from 'vitest';
import { buildTkDeck, TK_CARDS, tkPool } from '../src';

describe('Tentang Kita', () => {
  it('punya 500+ kartu dengan id unik dan isian yang lengkap', () => {
    expect(TK_CARDS.length).toBeGreaterThanOrEqual(500);
    expect(new Set(TK_CARDS.map((c) => c.id)).size).toBe(TK_CARDS.length);
    for (const c of TK_CARDS) {
      expect(c.text.length).toBeGreaterThan(10);
      expect(c.text).not.toMatch(/##|\|\|/);
      if (c.kind === 'dilema') expect(c.sides?.every((s) => s.length > 1)).toBe(true);
    }
    expect(TK_CARDS.filter((c) => c.kind === 'renung').length).toBeGreaterThanOrEqual(100);
  });

  it('urutan kartu sama untuk benih yang sama, dan naik dari level 1', () => {
    const opts = { rel: 'pasangan' as const, levels: [1, 2, 3] as (1 | 2 | 3)[], kinds: ['tanya', 'cermin', 'tebak', 'dilema', 'renung', 'liar'] as const, order: 'naik' as const, size: 24 };
    const a = buildTkDeck({ ...opts, kinds: [...opts.kinds] }, 'benih');
    const b = buildTkDeck({ ...opts, kinds: [...opts.kinds] }, 'benih');
    expect(a.map((c) => c.id)).toEqual(b.map((c) => c.id));
    expect(a).toHaveLength(24);
    expect(a.map((c) => c.level)).toEqual([...a.map((c) => c.level)].sort());
    expect(a.filter((c) => c.kind === 'renung').length).toBeLessThanOrEqual(8);
  });

  it('main sendirian tidak memakai kartu yang butuh orang lain', () => {
    const pool = tkPool('sendiri');
    expect(pool.length).toBeGreaterThan(200);
    expect(pool.every((c) => c.rel.length === 0 && ['tanya', 'renung', 'dilema'].includes(c.kind))).toBe(true);
  });
});
