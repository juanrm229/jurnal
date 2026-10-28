/**
 * SIDIK: tes aturan + simulator keseimbangan. Bot detektif membagikan petunjuk
 * apa adanya; bot jahat berbohong dengan fakta palsu yang masuk akal. Laporan,
 * audit peretas, dan saksi diberi bobot. Target: detektif menang ±40–60%.
 */
import { describe, expect, it } from 'vitest';
import { sidik } from '../src';

type G = sidik.Game;
const { newGame, join, act, tick, viewFor, holds, teamOf } = sidik;

function setup(n: number, seed: number): { g: G; t: number } {
  const t = 1_000_000;
  const g = newGame('ABCD', { id: 'p0', name: 'P0', avatar: 'tunas', guest: false }, t, seed);
  for (let i = 1; i < n; i++) join(g, { id: `p${i}`, name: `P${i}`, avatar: 'tunas', guest: true });
  act(g, 'p0', { t: 'start' }, t);
  return { g, t };
}

function rng(seed: number) {
  let s = seed >>> 0;
  return () => ((s = (Math.imul(s ^ (s >>> 15), 2246822507) + 0x9e3779b9) >>> 0) / 4294967296);
}

/** Satu permainan penuh dengan bot. Mengembalikan pemenang. */
function playBot(n: number, seed: number) {
  const { g } = setup(n, seed);
  let t = 1_000_000;
  const r = rng(seed * 7 + 1);
  const ids = g.players.map((p) => p.id);
  const evil = new Set(g.players.filter((p) => teamOf(p.role) === 'jahat').map((p) => p.id));
  const goodIds = ids.filter((id) => !evil.has(id));
  type Claim = { f: sidik.Fact; w: number; from?: string; round: number; only?: number[] };
  const claims: Claim[] = [];
  const fakeFor = (): sidik.Fact => {
    const cul = g.suspects[g.culprit]!;
    const decoys = g.suspects.filter((s) => !s.out && s.id !== cul.id);
    for (let i = 0; i < 20; i++) {
      const d = decoys[Math.floor(r() * decoys.length)]!;
      const c = Math.floor(r() * 4);
      if (d.attrs[c] !== cul.attrs[c]) return r() < 0.6 ? { c, v: cul.attrs[c]!, neg: true } : { c, v: d.attrs[c]!, neg: false };
    }
    return { c: 0, v: cul.attrs[0]!, neg: true };
  };
  const score = (s: sidik.Suspect) => claims.reduce((m, c) => m + (c.only ? (c.only.includes(s.id) ? 0 : c.w) : holds(c.f, s) ? 0 : c.w), 0);

  // Saksi membagikan pasangannya.
  for (const p of g.players.filter((x) => x.role === 'saksi')) {
    const it = g.intel.find((i) => i.to === p.id && i.kind === 'saksi')!;
    const names = g.suspects.filter((s) => it.text.includes(s.name)).map((s) => s.id);
    claims.push({ f: { c: 0, v: 0, neg: false }, w: 2, round: 0, only: names });
  }

  for (let guard = 0; guard < 60 && g.phase !== 'end'; guard++) {
    const ph = g.phase;
    if (ph === 'intro' || ph === 'role' || ph === 'dawn' || ph === 'day') {
      if (ph === 'day') {
        // Semua membagikan petunjuk ronde ini.
        const round = g.round;
        const audits = g.intel.filter((i) => i.round === round && i.kind === 'audit');
        for (const id of goodIds) {
          const mine = g.intel.filter((i) => i.to === id && i.round === round && i.fact && (i.kind === 'selidik' || i.kind === 'magang' || i.kind === 'cctv'));
          for (const it of mine) {
            const pl = g.players.find((p) => p.id === id)!;
            const audited = audits.find((a) => a.text.includes(pl.name));
            const w = audited ? (audited.text.includes('DIPALSUKAN') ? 0 : 1.6) : it.kind === 'magang' ? 0.5 : it.kind === 'cctv' ? 2 : 1;
            claims.push({ f: it.fact!, w, from: id, round });
            act(g, id, { t: 'show', id: it.id }, t);
          }
        }
        // Pemain jahat tidak menunjukkan bukti; mereka hanya mengaku (bobotnya kecil).
        for (const id of evil) claims.push({ f: fakeFor(), w: 0.35, from: id, round });
        for (const it of g.intel.filter((i) => i.to === '*' && i.round === round && i.fact)) claims.push({ f: it.fact!, w: 1.5, round });
      }
      for (const id of ids) act(g, id, { t: 'ready' }, t);
    } else if (ph === 'night') {
      for (const p of g.players) {
        const others = ids.filter((x) => x !== p.id);
        const tgt = others[Math.floor(r() * others.length)];
        act(g, p.id, { t: 'night', place: Math.floor(r() * 4), target: p.role === 'penyusup' ? goodIds.filter((x) => x !== p.id)[Math.floor(r() * (goodIds.length - (evil.has(p.id) ? 0 : 1)))] ?? tgt : tgt, target2: others[(others.indexOf(tgt!) + 1) % others.length], pick: p.role === 'peniru' ? (r() < 0.6 ? 0 : undefined) : p.role === 'kakitangan' ? Math.floor(r() * 4) : 0 }, t);
      }
    } else if (ph === 'vote') {
      const alive = g.suspects.filter((s) => !s.out);
      const ranked = [...alive].filter((s) => score(s) >= 1.4).sort((a, b) => score(b) - score(a) || r() - 0.5);
      for (const p of g.players) {
        if (evil.has(p.id)) {
          const rest = ranked.filter((s) => s.id !== g.culprit).map((s) => s.id);
          act(g, p.id, { t: 'vote', ids: [g.culprit, ...rest] }, t);
        } else act(g, p.id, { t: 'vote', ids: ranked.map((s) => s.id) }, t);
      }
    } else if (ph === 'accuse') {
      const alive = g.suspects.filter((s) => !s.out);
      const best = [...alive].sort((a, b) => score(a) - score(b) || r() - 0.5);
      // Paranoia: curigai rekan kalau ada petunjuk yang bertabrakan (bot sederhana).
      const traitor = g.players.find((p) => p.role === 'penyusup')?.id;
      for (const p of g.players) {
        const sus = n <= 3 && !evil.has(p.id) ? (r() < (traitor ? 0.45 : 0.15) ? ids.filter((x) => x !== p.id)[Math.floor(r() * (n - 1))]! : '') : undefined;
        act(g, p.id, { t: 'accuse', id: evil.has(p.id) ? (best.find((s) => s.id !== g.culprit) ?? best[0]!).id : best[0]!.id, traitor: sus }, t);
      }
    } else if (ph === 'hunt') {
      const pen = g.players.find((p) => p.role === 'penyusup')!;
      const goods = g.players.filter((p) => !evil.has(p.id));
      const forensik = goods.find((p) => p.role === 'forensik')!;
      const pDetect = Math.min(0.35, 1.3 / goods.length);
      const notF = goods.filter((x) => x.id !== forensik.id);
      act(g, pen.id, { t: 'hunt', target: r() < pDetect ? forensik.id : notF[Math.floor(r() * notF.length)]!.id }, t);
    } else {
      t += 120_000;
      tick(g, t);
    }
  }
  return g.result!;
}

describe('SIDIK: aturan', () => {
  it('permainan selesai untuk 2–16 pemain, tanpa galat', () => {
    for (let n = 2; n <= 16; n++) for (let s = 1; s <= 5; s++) expect(playBot(n, n * 100 + s).winner).toMatch(/baik|jahat/);
  });

  it('pelaku tidak bocor ke detektif biasa, tapi diketahui tim jahat', () => {
    const { g } = setup(8, 42);
    const det = g.players.find((p) => p.role === 'detektif')!;
    const pen = g.players.find((p) => p.role === 'penyusup')!;
    expect(viewFor(g, det.id, 0).me!.culprit).toBeNull();
    expect(viewFor(g, pen.id, 0).me!.culprit).toBe(g.culprit);
    // Detektif tidak melihat peran orang lain; penyusup melihat sesama tim jahat.
    expect(viewFor(g, det.id, 0).players.filter((p) => p.role).length).toBe(1);
    expect(viewFor(g, pen.id, 0).players.filter((p) => p.team === 'jahat').length).toBe(g.players.filter((p) => teamOf(p.role) === 'jahat').length);
    // Kebenaran petunjuk tidak pernah dikirim sebelum permainan selesai.
    expect(viewFor(g, det.id, 0).intel.every((i) => i.truth === undefined)).toBe(true);
  });

  it('mencoret pelaku = pelaku lolos', () => {
    const { g } = setup(5, 7);
    let t = 1_000_000;
    for (const p of g.players) act(g, p.id, { t: 'ready' }, t);
    for (const p of g.players) act(g, p.id, { t: 'ready' }, t);
    for (const p of g.players) act(g, p.id, { t: 'night', place: 0 }, t);
    for (const p of g.players) act(g, p.id, { t: 'ready' }, t);
    for (const p of g.players) act(g, p.id, { t: 'ready' }, t);
    expect(g.phase).toBe('vote');
    for (const p of g.players) act(g, p.id, { t: 'vote', ids: [g.culprit] }, t);
    expect(g.phase).toBe('end');
    expect(g.result).toMatchObject({ winner: 'jahat', reason: 'tercoret' });
    t += 1;
  });

  it('mode paranoia 2 orang: kadang ada pengkhianat, kadang bayangan', () => {
    const kinds = new Set<string>();
    for (let s = 1; s <= 40; s++) {
      const { g } = setup(2, s);
      kinds.add(g.shadow ? 'bayangan' : g.players.some((p) => p.role === 'penyusup') ? 'pengkhianat' : '?');
    }
    expect([...kinds].sort()).toEqual(['bayangan', 'pengkhianat']);
  });
});

describe('SIDIK: keseimbangan', () => {
  it('detektif menang di kisaran sehat untuk tiap jumlah pemain', () => {
    const rows: Record<string, string> = {};
    const rates: number[] = [];
    for (const n of [2, 3, 4, 5, 6, 7, 8, 10, 12, 15]) {
      let good = 0;
      const reasons: Record<string, number> = {};
      const N = 400;
      for (let s = 0; s < N; s++) {
        const res = playBot(n, 9000 + n * 1000 + s);
        if (res.winner === 'baik') good++;
        reasons[res.reason] = (reasons[res.reason] ?? 0) + 1;
      }
      rows[`${n} pemain`] = `${Math.round((good / N) * 100)}% detektif · ${Object.entries(reasons)
        .map(([k, v]) => `${k} ${Math.round((v / N) * 100)}%`)
        .join(', ')}`;
      rates.push(good / N);
    }
    console.log('\nKeseimbangan SIDIK (bot):\n' + Object.entries(rows).map(([k, v]) => `  ${k.padEnd(10)} ${v}`).join('\n'));
    for (const x of rates) {
      expect(x).toBeGreaterThan(0.35);
      expect(x).toBeLessThan(0.7);
    }
  }, 120_000);
});
