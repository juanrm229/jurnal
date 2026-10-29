import { describe, expect, it } from 'vitest';
import { tangga } from '../src';

const { act, newGame, join, tick, viewFor, hitung, KLASIK, papanAcak, terpakai, KLASIK_OPTS, JENIUS_OPTS } = tangga;
const P = (id: string) => ({ id, name: id, avatar: 'kucing', guest: true });

function meja(n: number, opts: Partial<tangga.Opts> = {}, seed = 5) {
  const g = newGame('ABCD', P('a'), 0, seed);
  for (let i = 1; i < n; i++) join(g, P(String.fromCharCode(97 + i)));
  g.opts = { ...g.opts, ...opts };
  act(g, 'a', { t: 'mulai' }, 0);
  return g;
}
const giliran = (g: tangga.Game) => g.players[g.giliran]!;

function sampaiAkhir(g: tangga.Game) {
  for (const p of g.players) p.bot = true;
  let now = 0;
  let i = 0;
  while (g.phase !== 'akhir' && i++ < 20000) {
    now += 3000;
    tick(g, now);
  }
  return i;
}

describe('Ular Tangga', () => {
  it('pantul di 100, pas, dan bebas', () => {
    const p: tangga.Papan = { ular: [[98, 78]], tangga: [], kotakKartu: [], putus: [] };
    expect(hitung(p, 'pantul', 97, 5, false).ke).toBe(78); // 98 (pantul) lalu ular
    expect(hitung(p, 'pantul', 96, 6, false).ke).toBe(98 - 20);
    expect(hitung(p, 'pantul', 95, 5, false).ke).toBe(100);
    expect(hitung(p, 'pas', 97, 5, false).ke).toBe(97);
    expect(hitung(p, 'bebas', 97, 5, false).ke).toBe(100);
    expect(hitung(p, 'pantul', 93, 5, true)).toMatchObject({ ke: 98, penawar: true });
  });

  it('papan acak adil: ujung tidak bertumpuk, 1 dan 100 bebas, ada 8 kotak kartu', () => {
    for (let s = 1; s < 60; s++) {
      const p = papanAcak({ rng: s * 7919 }, true);
      const ujung = [...p.ular.flat(), ...p.tangga.flat(), ...p.kotakKartu];
      expect(new Set(ujung).size).toBe(ujung.length);
      expect(ujung).not.toContain(1);
      expect(ujung).not.toContain(100);
      expect(p.ular.every(([h, t]) => h > t)).toBe(true);
      expect(p.tangga.every(([b, t]) => t > b)).toBe(true);
      const baris = (x: number) => Math.floor((x - 1) / 10);
      expect([...p.ular, ...p.tangga].every(([a, b]) => baris(a) !== baris(b))).toBe(true);
      expect(p.kotakKartu.length).toBe(8);
      expect(terpakai(p).size).toBe(ujung.length + 1);
    }
  });

  it('klasik: satu dadu, papan klasik, tanpa dorong & kartu', () => {
    const g = meja(2, KLASIK_OPTS);
    expect(g.papan.tangga).toEqual(KLASIK.tangga);
    act(g, giliran(g).id, { t: 'lempar' }, 0);
    expect(g.dadu!.length).toBe(1);
    expect(() => act(g, giliran(g).id, { t: 'jalan', pakai: 0, dorong: 0, target: 'b' }, 0)).not.toThrow();
  });

  it('jenius: dua dadu, satu jalan satu dorong lawan ke kepala ular', () => {
    const g = meja(2, { ...JENIUS_OPTS, musim: false });
    const a = giliran(g);
    const b = g.players.find((x) => x !== a)!;
    g.papan = { ular: [[30, 5]], tangga: [], kotakKartu: [], putus: [] };
    b.pos = 27;
    a.pos = 20;
    act(g, a.id, { t: 'lempar' }, 0);
    g.dadu = [4, 3];
    act(g, a.id, { t: 'jalan', pakai: 0, dorong: 1, target: b.id }, 0);
    expect(a.pos).toBe(24);
    expect(b.pos).toBe(5);
    // Dorong hanya dari jarak dekat.
    expect(tangga.bisaDorong({ pos: 50, perisai: false, didorong: false }, 39)).toBe(false);
    expect(g.log.some((e) => e.t === 'gerak' && e.lewat === 'ular' && e.sebab === 'dorong')).toBe(true);
  });

  it('dadu kembar memberi giliran tambahan (paling banyak 2 kali)', () => {
    const g = meja(2, { ...JENIUS_OPTS, musim: false, kartu: false });
    g.papan = { ular: [], tangga: [], kotakKartu: [], putus: [] };
    const a = giliran(g);
    for (let i = 0; i < 3; i++) {
      act(g, a.id, { t: 'lempar' }, 0);
      g.dadu = [2, 2];
      act(g, a.id, { t: 'jalan', pakai: 0 }, 0);
    }
    expect(giliran(g)).not.toBe(a);
    expect(a.pos).toBe(6);
  });

  it('kartu: penawar otomatis, gergaji, perisai, ular peliharaan, tukar', () => {
    const g = meja(2, { ...JENIUS_OPTS, musim: false });
    const a = giliran(g);
    const b = g.players.find((x) => x !== a)!;
    g.papan = { ular: [[20, 3]], tangga: [], kotakKartu: [], putus: [] };
    a.pos = 18;
    a.kartu = ['penawar', 'perisai', 'ular'];
    act(g, a.id, { t: 'kartu', kartu: 'ular', kotak: 40 }, 0);
    expect(g.papan.ular).toContainEqual([40, 30]);
    expect(() => act(g, a.id, { t: 'kartu', kartu: 'perisai' }, 0)).toThrow(/Satu kartu/);
    act(g, a.id, { t: 'lempar' }, 0);
    g.dadu = [2, 1];
    act(g, a.id, { t: 'jalan', pakai: 0 }, 0);
    expect(a.pos).toBe(20);
    expect(a.kartu).not.toContain('penawar');
    // Giliran b: gergaji ular 40, lalu tukar dengan a.
    b.pos = 10;
    b.kartu = ['gergaji', 'tukar'];
    act(g, b.id, { t: 'kartu', kartu: 'gergaji', kotak: 40 }, 0);
    expect(g.papan.putus).toContain(40);
    expect(hitung(g.papan, 'pantul', 38, 2, false).ke).toBe(40);
  });

  it('musim memunculkan ular/tangga baru sesuai pengumuman', () => {
    const g = meja(2, JENIUS_OPTS, 11);
    const m = g.musim!;
    expect(m.ronde).toBe(1 + tangga.SIKLUS_MUSIM);
    for (const p of g.players) p.bot = true;
    let now = 0;
    while (g.ronde < m.ronde && g.phase === 'main') tick(g, (now += 3000));
    if (g.phase === 'main') expect([...g.papan.ular, ...g.papan.tangga]).toContainEqual([m.a, m.b]);
  });

  it('permainan penuh antar-bot selalu tuntas (2–6 pemain, kedua preset)', () => {
    for (const preset of [KLASIK_OPTS, JENIUS_OPTS])
      for (let n = 2; n <= 6; n++)
        for (let s = 1; s <= 4; s++) {
          const g = meja(n, preset, s * 13 + n);
          sampaiAkhir(g);
          expect(g.phase).toBe('akhir');
          expect(g.players.find((p) => p.id === g.pemenang)!.pos).toBe(100);
        }
  });

  it('privasi kartu', () => {
    const g = meja(3, JENIUS_OPTS);
    g.players[1]!.kartu = ['emas'];
    const v = viewFor(g, g.players[0]!.id, 0);
    expect(JSON.stringify(v.players)).not.toContain('emas');
    expect(viewFor(g, g.players[1]!.id, 0).me!.kartu).toEqual(['emas']);
  });
});
