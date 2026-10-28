/**
 * SEUMUR: tes aturan dan simulasi tingkat kesulitan. Bot "merasakan" usia
 * kartu dengan salah kira acak, lalu meletakkan sesuai rasa itu, seperti
 * meja yang hening menunggu giliran.
 */
import { describe, expect, it } from 'vitest';
import { seumur } from '../src';

type G = seumur.Game;
const { newGame, join, act, tick, viewFor, momenOf, MOMEN, BAB } = seumur;

function setup(n: number, seed: number): G {
  const g = newGame('SMUR', { id: 'p0', name: 'P0', avatar: 'tunas', guest: false }, 1_000_000, seed);
  for (let i = 1; i < n; i++) join(g, { id: `p${i}`, name: `P${i}`, avatar: 'tunas', guest: true });
  act(g, 'p0', { t: 'start' }, 1_000_000);
  for (const p of g.players) act(g, p.id, { t: 'ready' }, 1_000_001);
  return g;
}
const fokusAll = (g: G) => g.players.forEach((p) => act(g, p.id, { t: 'fokus', tahan: true }, 1));

describe('dek', () => {
  it('cukup kartu di setiap bab dan doodle unik per id', () => {
    expect(MOMEN.length).toBeGreaterThanOrEqual(200);
    for (const b of BAB) expect(MOMEN.filter((m) => m.usia >= b.dari && m.usia <= b.sampai).length).toBeGreaterThanOrEqual(36);
    expect(new Set(MOMEN.map((m) => m.id)).size).toBe(MOMEN.length);
  });
});

describe('aturan', () => {
  it('fokus bersama membagikan kartu; usia tidak terlihat di tangan', () => {
    const g = setup(3, 1);
    expect(g.phase).toBe('fokus');
    act(g, 'p0', { t: 'fokus', tahan: true }, 1);
    expect(g.phase).toBe('fokus');
    fokusAll(g);
    expect(g.phase).toBe('main');
    const v = viewFor(g, 'p1', 1);
    expect(v.mine!.tangan).toHaveLength(1);
    expect(JSON.stringify(v.mine!.tangan)).not.toContain('usia');
    // Kartu orang lain tidak bocor.
    expect(JSON.stringify(v)).not.toContain(g.players[0]!.tangan[0]!);
  });

  it('meletakkan kartu lebih tua saat ada yang lebih muda memadamkan lilin', () => {
    const g = setup(2, 3);
    fokusAll(g);
    const [a, b] = g.players;
    const ua = momenOf(a!.tangan[0]!)!.usia;
    const ub = momenOf(b!.tangan[0]!)!.usia;
    const older = ua > ub ? a! : b!;
    if (ua === ub) return;
    const lilin = g.lilin;
    act(g, older.id, { t: 'letak', kartu: older.tangan[0]! }, 2);
    expect(g.lilin).toBe(lilin - 1);
    expect(g.garis.filter((x) => x.terlambat)).toHaveLength(1);
    expect(g.phase).toBe('fokus');
  });

  it('napas dalam membuka kartu termuda setiap tangan', () => {
    const g = setup(3, 5);
    fokusAll(g);
    for (const p of g.players) act(g, p.id, { t: 'napas', tahan: true }, 2);
    expect(g.napas).toBe(0);
    expect(g.terbuka).toHaveLength(3);
  });
});

// ── Simulasi ────────────────────────────────────────────────────────────────

function gauss(r: () => number) {
  return Math.sqrt(-2 * Math.log(r() || 1e-9)) * Math.cos(2 * Math.PI * r());
}
function rng(seed: number) {
  let s = seed >>> 0;
  return () => ((s = (Math.imul(s ^ (s >>> 15), 2246822507) + 0x9e3779b9) >>> 0) / 4294967296);
}

/** Satu kehidupan dimainkan bot dengan salah kira sigma tahun. */
function life(n: number, seed: number, sigma: number) {
  const g = setup(n, seed);
  const r = rng(seed * 7 + 3);
  let t = 2_000_000;
  for (let guard = 0; guard < 500 && g.phase !== 'akhir'; guard++) {
    if (g.phase === 'fokus') fokusAll(g);
    else if (g.phase === 'main') {
      const feel = g.players.flatMap((p) => p.tangan.map((id) => ({ p: p.id, id, f: momenOf(id)!.usia + gauss(r) * sigma })));
      feel.sort((a, b) => a.f - b.f);
      const next = feel[0]!;
      act(g, next.p, { t: 'letak', kartu: next.id }, ++t);
    } else if (g.phase === 'jeda') {
      for (const p of g.players) act(g, p.id, { t: 'renung', jawab: 'sudah' }, ++t);
      for (const p of g.players) act(g, p.id, { t: 'ready' }, ++t);
    } else tick(g, (t += 1e9));
  }
  return g;
}

describe('kesulitan', () => {
  it('meja yang peka sering utuh, meja yang asal sering berhenti', () => {
    const lines: string[] = [];
    for (const n of [2, 3, 4, 6, 8, 10]) {
      const res = [1.5, 3, 5].map((sigma) => {
        let utuh = 0;
        let usiaSum = 0;
        const N = 40;
        for (let s = 0; s < N; s++) {
          const g = life(n, 100 + s * 13 + n, sigma);
          expect(g.phase).toBe('akhir');
          if (g.selesai === 'utuh') utuh++;
          usiaSum += g.selesai === 'utuh' ? 90 : g.berhentiUsia!;
        }
        return `σ${sigma}: utuh ${Math.round((utuh / N) * 100)}% rata ${Math.round(usiaSum / N)}th`;
      });
      lines.push(`${n} orang · ${res.join(' · ')}`);
    }
    console.log(lines.join('\n'));
  }, 60_000);
});
