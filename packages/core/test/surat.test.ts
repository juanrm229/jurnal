import { describe, expect, it } from 'vitest';
import { surat } from '../src';

const { act, newGame, join, tick, viewFor, fullDeck, JENIS, TOTAL, targetFor } = surat;
const P = (id: string) => ({ id, name: id, avatar: 'kucing', guest: true });

function meja(n: number, seed = 7) {
  const g = newGame('ABCD', P('a'), 0, seed);
  for (let i = 1; i < n; i++) join(g, P(String.fromCharCode(97 + i)));
  return g;
}

/** Mainkan sampai selesai: semua kursi dijadikan bot, jam dimajukan. */
function sampaiAkhir(g: surat.Game, now = 0) {
  for (const p of g.players) p.bot = true;
  let guard = 0;
  while (g.phase !== 'akhir' && guard++ < 20000) {
    now += 3000;
    if (g.phase === 'jeda') now += surat.JEDA_MS;
    tick(g, now);
    cek(g);
  }
  return guard;
}

/** Invarian: 21 kartu selalu lengkap dan tiap pemain yang bertahan memegang 1–3 kartu. */
function cek(g: surat.Game) {
  if (g.phase !== 'main') return;
  const ids = [...g.deck, ...g.terbuka, ...(g.sisih ? [g.sisih] : []), ...g.players.flatMap((p) => [...p.hand, ...p.buang])].map((c) => c.id).sort((a, b) => a - b);
  expect(ids).toEqual(fullDeck().map((c) => c.id));
  for (const p of g.players) {
    if (p.out) expect(p.hand.length).toBe(0);
    else expect(p.hand.length).toBeGreaterThanOrEqual(1);
  }
}

describe('Titip Surat', () => {
  it('dek 21 kartu, 10 jenis, target perangko 2019', () => {
    expect(TOTAL).toBe(21);
    expect(JENIS.map((j) => j.jumlah)).toEqual([2, 6, 2, 2, 2, 2, 2, 1, 1, 1]);
    expect([2, 3, 4, 5, 6].map(targetFor)).toEqual([6, 5, 4, 3, 3]);
  });

  it('persiapan: 1 disisihkan, 3 terbuka saat berdua, pemain pertama memegang 2', () => {
    const g = meja(2);
    act(g, 'a', { t: 'mulai' }, 0);
    expect(g.sisih).not.toBeNull();
    expect(g.terbuka.length).toBe(3);
    expect(g.deck.length).toBe(21 - 1 - 3 - 3);
    const g4 = meja(4);
    act(g4, 'a', { t: 'mulai' }, 0);
    expect(g4.terbuka.length).toBe(0);
    expect(g4.players[g4.giliran]!.hand.length).toBe(2);
  });

  it('Ibu wajib bila bersama Ayah atau Adik Usil', () => {
    const g = meja(3);
    act(g, 'a', { t: 'mulai' }, 0);
    const p = g.players[g.giliran]!;
    p.hand = [{ id: 19, v: 8 }, { id: 18, v: 7 }];
    expect(() => act(g, p.id, { t: 'main', kartu: 18, target: g.players.find((x) => x !== p)!.id }, 0)).toThrow(/Ibu/);
  });

  it('Teman Kepo yang benar menyingkirkan; Teman Kepo tidak boleh ditebak', () => {
    const g = meja(3);
    act(g, 'a', { t: 'mulai' }, 0);
    const p = g.players[g.giliran]!;
    const t = g.players.find((x) => x !== p)!;
    p.hand = [{ id: 2, v: 1 }, { id: 9, v: 2 }];
    t.hand = [{ id: 20, v: 9 }];
    expect(() => act(g, p.id, { t: 'main', kartu: 2, target: t.id, tebak: 1 }, 0)).toThrow();
    act(g, p.id, { t: 'main', kartu: 2, target: t.id, tebak: 9 }, 0);
    expect(t.out).toBe(true);
    expect(t.buang.at(-1)!.v).toBe(9);
  });

  it('Sahabat melindungi; Kepo tanpa sasaran dimainkan tanpa efek', () => {
    const g = meja(2);
    act(g, 'a', { t: 'mulai' }, 0);
    const p = g.players[g.giliran]!;
    const t = g.players.find((x) => x !== p)!;
    t.aman = true;
    p.hand = [{ id: 2, v: 1 }, { id: 9, v: 2 }];
    act(g, p.id, { t: 'main', kartu: 2 }, 0);
    expect(g.log.at(-1)!.hampa).toBe(true);
  });

  it('Adik Usil pada pemegang Dia menyingkirkannya; saat tumpukan habis ambil kartu sisihan', () => {
    const g = meja(3);
    act(g, 'a', { t: 'mulai' }, 0);
    const p = g.players[g.giliran]!;
    const t = g.players.find((x) => x !== p)!;
    p.hand = [{ id: 15, v: 5 }, { id: 9, v: 2 }];
    t.hand = [{ id: 20, v: 9 }];
    act(g, p.id, { t: 'main', kartu: 15, target: t.id }, 0);
    expect(t.out).toBe(true);
    const g2 = meja(3);
    act(g2, 'a', { t: 'mulai' }, 0);
    const q = g2.players[g2.giliran]!;
    q.hand = [{ id: 15, v: 5 }, { id: 9, v: 2 }];
    const sisih = g2.sisih!;
    g2.deck = [];
    act(g2, q.id, { t: 'main', kartu: 15, target: q.id }, 0);
    expect(q.hand[0]).toEqual(sisih);
    expect(g2.phase).toBe('jeda');
  });

  it('Tukang Pos: simpan 1, 2 ke bawah tumpukan sesuai urutan', () => {
    const g = meja(3);
    act(g, 'a', { t: 'mulai' }, 0);
    const p = g.players[g.giliran]!;
    p.hand = [{ id: 16, v: 6 }, { id: 9, v: 2 }];
    const [x, y] = g.deck.slice(0, 2);
    act(g, p.id, { t: 'main', kartu: 16 }, 0);
    expect(g.pending).toBe(p.id);
    act(g, p.id, { t: 'pos', simpan: x!.id, bawah: [y!.id, 9] }, 0);
    expect(p.hand).toEqual([x]);
    expect(g.deck.slice(-2).map((c) => c.id)).toEqual([y!.id, 9]);
  });

  it('Saingan: kartu lebih kecil keluar; Ayah menukar tangan & keduanya tahu', () => {
    const g = meja(3);
    act(g, 'a', { t: 'mulai' }, 0);
    const p = g.players[g.giliran]!;
    const t = g.players.find((x) => x !== p)!;
    p.hand = [{ id: 11, v: 3 }, { id: 18, v: 7 }];
    t.hand = [{ id: 13, v: 4 }];
    act(g, p.id, { t: 'main', kartu: 11, target: t.id }, 0);
    expect(t.out).toBe(true);
    const g2 = meja(3);
    act(g2, 'a', { t: 'mulai' }, 0);
    const a = g2.players[g2.giliran]!;
    const b = g2.players.find((x) => x !== a)!;
    a.hand = [{ id: 18, v: 7 }, { id: 2, v: 1 }];
    b.hand = [{ id: 20, v: 9 }];
    act(g2, a.id, { t: 'main', kartu: 18, target: b.id }, 0);
    expect(a.hand[0]!.v).toBe(9);
    expect(b.hand[0]!.v).toBe(1);
    expect(g2.ingat[b.id]![a.id]).toBe(9);
    expect(viewFor(g2, b.id, 0).me!.tahu).toContainEqual({ pid: a.id, v: 9 });
  });

  it('Pengagum Rahasia: bonus hanya bila satu-satunya yang bertahan', () => {
    const g = meja(3);
    act(g, 'a', { t: 'mulai' }, 0);
    const [a, b, c] = g.players;
    a!.buang = [{ id: 0, v: 0 }];
    a!.hand = [{ id: 2, v: 1 }];
    b!.hand = [{ id: 20, v: 9 }];
    c!.hand = [{ id: 3, v: 1 }];
    g.deck = [];
    g.giliran = 2;
    c!.hand.push({ id: 4, v: 1 });
    act(g, c!.id, { t: 'main', kartu: 4, target: a!.id, tebak: 5 }, 0);
    expect(g.hasil!.pemenang).toEqual([b!.id]);
    expect(g.hasil!.spy).toBe(a!.id);
    expect(a!.perangko).toBe(1);
  });

  it('privasi: kartu orang lain tidak bocor ke tampilan', () => {
    const g = meja(4);
    act(g, 'a', { t: 'mulai' }, 0);
    const v = viewFor(g, 'b', 0);
    expect(JSON.stringify(v.players)).not.toContain('"hand"');
    expect(v.me!.hand.length).toBeGreaterThan(0);
    expect(viewFor(g, null, 0).me).toBeNull();
  });

  it('permainan penuh antar-bot selalu tuntas dengan satu pemenang (2–6 pemain)', () => {
    for (let n = 2; n <= 6; n++)
      for (let seed = 1; seed <= 12; seed++) {
        const g = meja(n, seed * 97 + n);
        act(g, 'a', { t: 'mulai' }, 0);
        sampaiAkhir(g);
        expect(g.phase).toBe('akhir');
        const w = g.players.find((p) => p.id === g.pemenang)!;
        expect(w.perangko).toBeGreaterThanOrEqual(targetFor(n));
      }
  });

  it('bot pintar mengalahkan bot acak', () => {
    let menang = 0;
    for (let seed = 1; seed <= 60; seed++) {
      const g = meja(2, seed);
      act(g, 'a', { t: 'mulai' }, 0);
      for (const p of g.players) p.bot = true;
      let now = 0;
      let i = 0;
      while (g.phase !== 'akhir' && i++ < 5000) {
        now += 3000;
        if (g.phase === 'jeda') now += surat.JEDA_MS;
        const p = g.players[g.giliran]!;
        // Pemain "b" memainkan kartu acak yang sah.
        if (g.phase === 'main' && p.id === 'b' && !g.pending) {
          const opts = p.hand.filter((c) => c.v !== 9 && (!surat.mustIbu(p.hand) || c.v === 8));
          const c = opts[seed % opts.length] ?? p.hand[0]!;
          const tg = surat.sasaranFor(g, p.id, c.v);
          act(g, 'b', { t: 'main', kartu: c.id, target: tg.find((x) => x !== 'b') ?? tg[0], tebak: 9 - (i % 3) }, now);
        } else tick(g, now);
      }
      if (g.pemenang === 'a') menang++;
    }
    expect(menang).toBeGreaterThan(36);
  });
});
