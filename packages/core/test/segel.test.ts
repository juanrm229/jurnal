/**
 * SEBELUM DISEGEL: tes mesin kasus, aturan, dan simulator keseimbangan.
 * Bot Restorasi menerbitkan bukti, mengaudit yang bertentangan, dan memakai
 * profesi informasi. Bot Revisi menyunting bukti penting dan memilih umpan.
 */
import { describe, expect, it } from 'vitest';
import { segel } from '../src';

type G = segel.Game;
const { newGame, join, act, tick, viewFor, generate, worlds, isHard, dimFor, PROFS, JINX, SCRIPTS, possible, chainItems, originTrue, timeOf } = segel;

function rng(seed: number) {
  let s = seed >>> 0;
  return () => ((s = (Math.imul(s ^ (s >>> 15), 2246822507) + 0x9e3779b9) >>> 0) / 4294967296);
}

function setup(n: number, seed: number, opts: Partial<segel.Opts> = {}): G {
  const g = newGame('ABCD', { id: 'p0', name: 'P0', avatar: 'tunas', guest: false }, 1_000_000, seed);
  for (let i = 1; i < n; i++) join(g, { id: `p${i}`, name: `P${i}`, avatar: 'tunas', guest: true });
  Object.assign(g.opts, opts);
  act(g, 'p0', { t: 'start' }, 1_000_000);
  return g;
}

describe('mesin kasus', () => {
  it('selalu menghasilkan satu dunia, dan bukti Restorasi saja sudah cukup', () => {
    const r = rng(11);
    for (const n of [2, 3, 4, 5, 6, 7, 8, 9, 11, 12, 14, 16]) {
      for (let i = 0; i < 15; i++) {
        const rev = Array.from({ length: segel.revisiFor(n) }, (_, k) => k);
        const k = generate(n, rev, r);
        const d = dimFor(n);
        const hard = k.reports.filter((x) => isHard(x.f));
        const ws = worlds(d, hard);
        expect(ws).toEqual([k.model.w]);
        expect(worlds(d, hard.filter((x) => !rev.includes(x.holder))).length).toBe(1);
        expect(worlds(d, hard.filter((x) => x.ch <= 2)).length).toBeGreaterThan(1);
        expect(k.reports.length).toBe(n * segel.perSeat(n) * 3);
      }
    }
  });

  it('kesaksian palsu tidak pernah lolos sebagai sumber, kamera jam liar butuh kalibrasi', () => {
    const k = generate(6, [0], rng(3));
    const d = dimFor(6);
    const sight = k.reports.find((x) => x.f.k === 'sight' && !x.f.kas)!;
    // Dibaca apa adanya (tanpa register jam), cuplikan tidak membatasi waktu.
    expect(worlds(d, [sight]).length).toBe(d.K * d.R * d.T);
    const calib = { f: { k: 'calib', dev: 0, off: k.model.devs[0]!.off } as segel.Fact };
    expect(possible(worlds(d, [sight, calib]), 't')).toEqual([k.model.w.t]);
  });

  it('36 profesi, 16 jinx, script hanya merujuk profesi yang ada', () => {
    expect(Object.keys(PROFS).length).toBe(36);
    expect(JINX.length).toBe(16);
    for (const s of SCRIPTS) for (const id of s.pool) expect(PROFS[id]).toBeTruthy();
    for (const j of JINX) expect(PROFS[j.a] && PROFS[j.b]).toBeTruthy();
  });
});

describe('aturan', () => {
  it('audit asal memberi salinan sumber bercap; suntingan mengubah salinan pemegang saja', () => {
    const g = setup(6, 5);
    act(g, 'p0', { t: 'ready' }, 1_000_100);
    for (const p of g.players) act(g, p.id, { t: 'ready' }, 1_000_200);
    for (const p of g.players) act(g, p.id, { t: 'ready' }, 1_000_300);
    expect(g.phase).toBe('aksi');
    const rev = g.players.find((p) => p.kubu === 'revisi')!;
    const target = g.reports.find((r) => r.ch === 1 && timeOf(r.f) !== null && g.players[r.holder]!.id !== rev.id)!;
    const holder = g.players[target.holder]!;
    const auditor = g.players.find((p) => p.id !== holder.id && p.id !== rev.id)!;
    for (const p of g.players) {
      if (p.id === rev.id) act(g, p.id, { t: 'aksi', main: { k: 'tinta', rid: target.id, edit: 'jam', v: timeOf(target.f) === 0 ? 1 : -1 } }, 1_000_400);
      else if (p.id === auditor.id) act(g, p.id, { t: 'aksi', main: { k: 'audit', rid: target.id } }, 1_000_400);
      else act(g, p.id, { t: 'aksi', main: { k: 'diam' } }, 1_000_400);
    }
    expect(g.phase).toBe('runding');
    const hc = g.copies[holder.id]!.find((c) => c.rid === target.id && c.via === 'bagi')!;
    expect(originTrue(g, hc)).toBe(false);
    const ac = g.copies[auditor.id]!.find((c) => c.rid === target.id && c.via === 'audit')!;
    expect(ac.stamp).toBe(true);
    expect(originTrue(g, ac)).toBe(true);
    expect(auditor.lensa).toBe(0);
    expect(rev.tinta).toBe(1);
    // Pemegang tidak melihat riwayat suntingan.
    const v = viewFor(g, holder.id, 1_000_500);
    expect(v.mine!.copies.find((c) => c.rid === target.id)!.hist).toBeUndefined();
    // Revisi tahu dunia aktual; Restorasi tidak.
    expect(viewFor(g, rev.id, 1).mine!.revisi).toBeTruthy();
    expect(viewFor(g, holder.id, 1).mine!.revisi).toBeNull();
  });

  it('putusan benar dengan rantai lemah tetap kalah; rantai lengkap menang', () => {
    for (const publishAll of [false, true]) {
      const g = setup(5, 21);
      let t = 1_000_000;
      const next = () => (t += 1000);
      while (g.phase !== 'end') {
        const ph = g.phase;
        for (const p of g.players) {
          try {
            if (ph === 'intro' || ph === 'peran' || ph === 'runding') act(g, p.id, { t: 'ready' }, next());
            else if (ph === 'aksi') {
              const c = g.copies[p.id]!.find((c) => !c.hidden && c.via === 'bagi' && !g.board.some((b) => b.by === p.id && b.c.rid === c.rid));
              act(g, p.id, { t: 'aksi', main: publishAll && c ? { k: 'terbit', cid: c.cid } : { k: 'diam' } }, next());
            } else if (ph === 'segel') act(g, p.id, { t: 'teori', v: g.model!.w }, next());
            else if (ph === 'pulih') act(g, p.id, { t: 'tarik', rids: [] }, next());
            else if (ph === 'vonis') act(g, p.id, { t: 'vonis', v: g.model!.w }, next());
            else if (ph === 'tebak') act(g, p.id, { t: 'tebak', pid: '' }, next());
          } catch {
            /* fase sudah maju */
          }
        }
        tick(g, next() + 999_999);
      }
      expect(g.result!.anchors).toEqual({ p: g.model!.w.p, r: g.model!.w.r, t: g.model!.w.t });
      const full = worlds(dimFor(5), chainItems(g)).length === 1;
      expect(g.result!.winner).toBe(full ? 'restorasi' : 'revisi');
      if (!publishAll) expect(g.result!.reason).toBe('lemah');
    }
  });
});

// ── Simulator ───────────────────────────────────────────────────────────────

type Sim = { lies: Record<string, segel.Fact[]>; r: () => number };

/**
 * Keyakinan bot Restorasi. Pemain manusia saling bercerita, jadi bot memakai
 * salinan bercap, salinan sendiri, papan, lalu cerita lisan pemain lain
 * (Restorasi jujur, Revisi berbohong). Bukti ditambahkan berlapis; yang
 * membuat kontradiksi dilewati.
 */
function believe(g: G, pid: string, sim: Sim): segel.Item[] {
  const d = g.model!.dim;
  const hard = (f: segel.Fact) => isHard(f) || f.k === 'vantage';
  const own = (g.copies[pid] ?? []).filter((c) => !c.hidden && hard(c.f));
  const pub = g.board.filter((b) => !b.bantah && !b.umpan && hard(b.c.f)).map((b) => b.c);
  const others = g.players.filter((p) => p.id !== pid);
  // Cerita yang bisa dibuktikan dengan menerbitkan salinan didahulukan dari klaim kosong.
  const verbal: segel.Item[] = others.flatMap((p) => (p.kubu === 'revisi' ? [] : (g.copies[p.id] ?? []).filter((c) => !c.hidden && hard(c.f)).map((c) => ({ f: c.f, blur: c.blur }))));
  const lies: segel.Item[] = others.flatMap((p) => (sim.lies[p.id] ?? []).map((f) => ({ f })));
  if (g.coop) {
    const team = g.players.flatMap((p) => (g.copies[p.id] ?? []).filter((c) => !c.hidden && hard(c.f)));
    const L: segel.Item[][] = [
      [...team, ...pub].filter((c) => c.stamp).map((c) => ({ f: c.f, blur: c.blur })),
      pub.filter((c) => !c.stamp).map((c) => ({ f: c.f, blur: c.blur })),
      team.filter((c) => !c.stamp).map((c) => ({ f: c.f, blur: c.blur })),
    ];
    const use: segel.Item[] = [];
    for (const l of L) for (const it of l) if (worlds(d, [...use, it]).length > 0) use.push(it);
    return use;
  }
  const layers: segel.Item[][] = [
    [...own, ...pub].filter((c) => c.stamp).map((c) => ({ f: c.f, blur: c.blur })),
    own.filter((c) => !c.stamp).map((c) => ({ f: c.f, blur: c.blur })),
    pub.filter((c) => !c.stamp).map((c) => ({ f: c.f, blur: c.blur })),
    // Klaim lisan jujur dan bohong terdengar sama; urutannya acak.
    [...verbal, ...lies].map((x) => ({ x, k: sim.r() })).sort((a, b) => a.k - b.k).map((o) => o.x),
  ];
  const use: segel.Item[] = [];
  for (const L of layers) for (const it of L) if (worlds(d, [...use, it]).length > 0) use.push(it);
  return use;
}

function conflictRid(g: G, pid: string): string | null {
  const d = g.model!.dim;
  const own = (g.copies[pid] ?? []).filter((c) => !c.hidden && isHard(c.f));
  const pub = g.board.filter((b) => !b.bantah && !b.umpan && isHard(b.c.f)).map((b) => b.c);
  const all = [...own, ...pub];
  if (worlds(d, all).length > 0) return null;
  const raw = all.filter((c) => !c.stamp && !own.some((o) => o.rid === c.rid && o.stamp));
  for (const c of raw) if (worlds(d, all.filter((x) => x !== c)).length > 0) return c.rid;
  return raw[0]?.rid ?? null;
}

/** Bukti mentah penopang: kalau dibuang, kesimpulan berubah. Itu yang layak diaudit. */
function pivotal(g: G, pid: string, sim: Sim): string | null {
  const d = g.model!.dim;
  const own = (g.copies[pid] ?? []).filter((c) => !c.hidden);
  const stamped = new Set(own.filter((c) => c.stamp).map((c) => c.rid));
  for (const b of g.board) if (b.c.stamp) stamped.add(b.c.rid);
  const pool = [...own, ...g.board.filter((b) => !b.bantah && !b.umpan).map((b) => b.c)].filter((c) => isHard(c.f) && !stamped.has(c.rid) && !g.reports.find((r) => r.id === c.rid)?.out);
  const base = worlds(d, believe(g, pid, sim));
  const key = (ws: segel.World[]) => ws.map((w) => `${w.p}${w.r}${w.t}`).join();
  let best: string | null = null;
  let bestGain = 0;
  for (const c of pool) {
    const without = believe(g, pid, sim).filter((i) => !(i.f === c.f));
    const ws = worlds(d, without);
    const gain = key(ws) === key(base) ? 0 : ws.length - base.length;
    if (gain > bestGain) {
      bestGain = gain;
      best = c.rid;
    }
  }
  return best;
}

function botMain(g: G, p: segel.Player, sim: Sim): segel.Main {
  const { r } = sim;
  const d = g.model!.dim;
  const vis = g.reports.filter((x) => !x.out && !x.umpan && x.ch <= Math.min(3, g.bab));
  const mine = (g.copies[p.id] ?? []).filter((c) => !c.hidden);
  const onBoard = (rid: string) => g.board.some((b) => b.c.rid === rid && !b.bantah);
  const value = (f: segel.Fact) => (['sight', 'door', 'locks', 'mount', 'calib', 'found'].includes(f.k) ? 3 : f.k === 'alibi' ? 2 : isHard(f) ? 1 : 0);
  const ok = (m: segel.Main) => {
    try {
      segel.validateMain(g, p, m);
      return true;
    } catch {
      return false;
    }
  };
  if (p.kubu === 'revisi') {
    const opts = segel.editOptions(g, { maxCh: Math.min(3, g.bab) }).filter((o) => g.players[g.reports.find((x) => x.id === o.rid)!.holder]?.kubu !== 'revisi' && !onBoard(o.rid));
    const best = [...opts].sort((a, b) => b.score - a.score || r() - 0.5);
    for (const o of best) {
      if (o.score < 1) break;
      const cur = timeOf(g.copies[g.players[g.reports.find((x) => x.id === o.rid)!.holder]!.id]!.find((c) => c.rid === o.rid && c.via === 'bagi')!.f);
      if (p.tinta > 0) {
        const m: segel.Main = o.kind === 'jam' ? { k: 'tinta', rid: o.rid, edit: 'jam', v: o.v - (cur ?? 0) } : { k: 'tinta', rid: o.rid, edit: 'label', r: o.v };
        if (ok(m)) return m;
      }
      if (!p.used && PROFS[p.prof!].edit) {
        const m: segel.Main | null = p.prof === 'penggeser_jam' && o.kind === 'jam' ? { k: 'profesi', rid: o.rid, v: o.v - (cur ?? 0) } : p.prof === 'pengganti_label' && o.kind === 'label' ? { k: 'profesi', rid: o.rid, r: o.v } : p.prof === 'pengabur_rentang' ? { k: 'profesi', rid: o.rid } : null;
        if (m && ok(m)) return m;
      }
    }
    const herring = mine.find((c) => (c.f.k === 'witness' || c.f.k === 'trace') && !onBoard(c.rid));
    if (herring) return { k: 'terbit', cid: herring.cid };
    const harmless = mine.find((c) => c.via === 'bagi' && !onBoard(c.rid) && !isHard(c.f));
    if (harmless) return { k: 'terbit', cid: harmless.cid };
    return { k: 'diam' };
  }
  const bad = conflictRid(g, p.id) ?? pivotal(g, p.id, sim);
  if (bad && p.lensa >= 1 && ok({ k: 'audit', rid: bad })) return { k: 'audit', rid: bad };
  const stampedMine = mine.find((c) => c.stamp && isHard(c.f) && !g.board.some((b) => b.c.rid === c.rid && b.c.stamp));
  if (stampedMine && r() < 0.6) return { k: 'terbit', cid: stampedMine.cid };
  const pub = mine.filter((c) => (isHard(c.f) || c.f.k === 'vantage') && !onBoard(c.rid)).sort((a, b) => Number(b.stamp) - Number(a.stamp) || value(b.f) - value(a.f));
  if (!p.used && r() < 0.5) {
    const pr = p.prof!;
    const witness = vis.find((x) => x.f.k === 'witness');
    const sight = vis.find((x) => x.f.k === 'sight' && !x.f.kas);
    const timeRep = vis.filter((x) => timeOf(x.f) !== null);
    const cands: (segel.Main | null)[] = [
      pr === 'penyetel_jam' ? { k: 'profesi', dev: 0 } : null,
      pr === 'pembaca_label' && sight ? { k: 'profesi', rid: sight.id } : null,
      pr === 'juru_peta' || pr === 'pencatat_jejak' ? { k: 'profesi', x: Math.floor(r() * d.K) } : null,
      pr === 'penghitung_langkah' ? { k: 'profesi', r: Math.floor(r() * d.R) } : null,
      pr === 'pembaca_kekosongan' ? { k: 'profesi', r: Math.floor(r() * d.R), t: Math.floor(r() * d.T) } : null,
      pr === 'penguji_sudut' && witness ? { k: 'profesi', rid: witness.id } : null,
      pr === 'pengasah_lensa' ? { k: 'profesi', pl: g.players.find((x) => x.id !== p.id)!.id } : null,
      ['penjaga_segel', 'penerawang_tinta', 'pemulih', 'pencetak_karbon', 'pemetik_menit'].includes(pr) && timeRep.length ? { k: 'profesi', rid: timeRep[Math.floor(r() * timeRep.length)]!.id } : null,
    ];
    for (const m of cands) if (m && ok(m)) return m;
  }
  if (pub[0]) return { k: 'terbit', cid: pub[0].cid };
  const unstamped = g.board.filter((b) => !b.c.stamp && isHard(b.c.f));
  if (p.lensa >= 1 && unstamped.length && r() < 0.6) return { k: 'audit', rid: unstamped[Math.floor(r() * unstamped.length)]!.c.rid };
  return { k: 'diam' };
}

function botVote(g: G, p: segel.Player, sim: Sim): segel.Theory {
  const d = g.model!.dim;
  if (p.kubu === 'revisi') return g.model!.decoy;
  const ws = worlds(d, believe(g, p.id, sim));
  const prev = g.phase === 'vonis' && g.voteRound > 1 ? g.tally[g.tally.length - 1] : undefined;
  const best = (a: segel.Anchor, n: number) => {
    const c = Array(n).fill(0) as number[];
    for (const w of ws) c[w[a]]!++;
    // Putaran ulang: ikut nilai terbanyak sebelumnya bila masih mungkin menurut keyakinannya.
    const t = prev?.[a];
    if (t) {
      const top = Object.entries(t).sort((x, y) => y[1] - x[1])[0];
      if (top && c[Number(top[0])]! > 0) return Number(top[0]);
    }
    return c.indexOf(Math.max(...c));
  };
  return { p: best('p', d.K), r: best('r', d.R), t: best('t', d.T) };
}

/** Kebohongan lisan Revisi: fakta palsu yang cocok dengan dunia umpan. */
function makeLies(g: G): Record<string, segel.Fact[]> {
  const m = g.model!;
  const out: Record<string, segel.Fact[]> = {};
  for (const p of g.players.filter((x) => x.kubu === 'revisi')) {
    out[p.id] = [
      { k: 'alibi', x: m.w.p, t: m.w.t, at: 0 },
      { k: 'door', r: m.decoy.r, t: m.decoy.t, once: true },
    ];
  }
  return out;
}

function playBot(n: number, seed: number) {
  const g = setup(n, seed);
  const sim: Sim = { lies: makeLies(g), r: rng(seed * 13 + 5) };
  const { r } = sim;
  let t = 1_000_000;
  const next = () => (t += 500);
  let guard = 0;
  while (g.phase !== 'end' && guard++ < 200) {
    const ph = g.phase;
    const dl = g.deadline;
    for (const p of g.players) {
      if (g.phase !== ph || g.deadline !== dl) break;
      try {
        if (ph === 'intro' || ph === 'peran' || ph === 'runding') act(g, p.id, { t: 'ready' }, next());
        else if (ph === 'aksi') {
          if (g.coop) for (const c of (g.copies[p.id] ?? []).filter((c) => !c.hidden && !g.board.some((b) => b.c.rid === c.rid && (b.c.stamp || !c.stamp)))) act(g, p.id, { t: 'terbit', cid: c.cid }, next());
          act(g, p.id, { t: 'aksi', main: botMain(g, p, sim) }, next());
        } else if (ph === 'segel') {
          if (g.bab === 4 && p.kubu !== 'revisi') act(g, p.id, { t: 'lampir', cids: (g.copies[p.id] ?? []).filter((c) => !c.hidden && isHard(c.f)).map((c) => c.cid) }, next());
          act(g, p.id, { t: 'teori', v: botVote(g, p, sim) }, next());
        }
        else if (ph === 'pulih') {
          const pool = g.reports.filter((x) => !x.out && !x.umpan && isHard(x.f) && !g.board.some((b) => b.c.rid === x.id && b.c.stamp));
          const pickR = p.kubu === 'revisi' ? g.reports.filter((x) => x.herring && !x.umpan) : pool.sort(() => r() - 0.5);
          act(g, p.id, { t: 'tarik', rids: pickR.slice(0, 2).map((x) => x.id) }, next());
        } else if (ph === 'vonis') act(g, p.id, { t: 'vonis', v: botVote(g, p, sim) }, next());
        else if (ph === 'tebak') {
          const others = g.players.filter((x) => x.id !== p.id);
          act(g, p.id, { t: 'tebak', pid: others[Math.floor(r() * others.length)]!.id }, next());
        }
      } catch {
        /* abaikan */
      }
    }
    if (g.phase === ph && g.deadline === dl) tick(g, next() + 10_000_000);
  }
  return g;
}

describe('simulasi keseimbangan', () => {
  it('kedua kubu punya peluang di semua ukuran meja', () => {
    const lines: string[] = [];
    const rates: number[] = [];
    for (const n of [2, 3, 4, 5, 6, 7, 8, 10, 12, 16]) {
      let win = 0;
      const reasons: Record<string, number> = {};
      const N = 40;
      for (let s = 0; s < N; s++) {
        const g = playBot(n, 1000 + s * 7 + n);
        expect(g.phase).toBe('end');
        if (g.result!.winner === 'restorasi') win++;
        reasons[g.result!.reason] = (reasons[g.result!.reason] ?? 0) + 1;
      }
      lines.push(`${n} pemain: Restorasi ${Math.round((win / N) * 100)}% ${JSON.stringify(reasons)}`);
      rates.push(win / N);
    }
    console.log(lines.join('\n'));
    for (const x of rates) {
      expect(x).toBeGreaterThan(0.15);
      expect(x).toBeLessThan(0.97);
    }
  }, 120_000);
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const env = (globalThis as any).process?.env ?? {};
describe.skipIf(!env.DN)('debug', () => {
  it('trace', () => {
    const g = playBot(Number(env.DN ?? 6), Number(env.DS ?? 1013));
    const tm = segel.temaOf(g.temaId);
    console.log('world', segel.worldText(tm, g.model!.w), 'decoy', segel.worldText(tm, g.model!.decoy));
    console.log('result', JSON.stringify(g.result));
    console.log('edits', JSON.stringify(g.edits));
    console.log('board', g.board.map((b) => `${b.id}:${b.c.rid}${b.c.stamp ? '*' : ''}${originTrue(g, b.c) ? '' : '!'}`).join(' '));
    console.log('chain worlds', worlds(g.model!.dim, chainItems(g)).length);
    console.log('log', g.log.map((l) => `${l.bab}:${l.text}`).join('\n'));
    console.log('tally', JSON.stringify(g.tally));
  });
});
