import { describe, expect, it } from 'vitest';
import { hanabi as H } from '../src';

const P = (id: string) => ({ id, name: id, avatar: 'kucing', guest: true });
function meja(n: number, opts: Partial<H.Opts> = {}, seed = 5) {
  const g = H.newGame('ABCD', P('a'), 0, seed);
  for (let i = 1; i < n; i++) H.join(g, P(String.fromCharCode(97 + i)));
  g.opts = { ...g.opts, ...opts };
  H.act(g, 'a', { t: 'mulai' }, 0);
  return g;
}
const cur = (g: H.Game) => g.players[g.giliran]!;
const next = (g: H.Game) => g.players[(g.giliran + 1) % g.players.length]!;
let uid = 500;
const K = (w: H.Warna, n: number): H.Card => ({ id: uid++, w, n });
function beri(g: H.Game, p: H.Game['players'][number], cs: H.Card[]) {
  p.hand = cs;
  p.tahu = Object.fromEntries(cs.map((c) => [c.id, { warna: H.warnaMain(g.opts), angka: [1, 2, 3, 4, 5], sentuh: false, tanda: false }]));
}

describe('Kembang Api (Hanabi)', () => {
  it('dek resmi 50 kartu; varian warna keenam 60/55; tangan 5 atau 4 kartu', () => {
    expect(H.fullDeck({ warna6: 'tidak' }).length).toBe(50);
    expect(H.fullDeck({ warna6: 'biasa' }).length).toBe(60);
    expect(H.fullDeck({ warna6: 'langka' }).length).toBe(55);
    expect(meja(3).players.every((p) => p.hand.length === 5)).toBe(true);
    expect(meja(4).players.every((p) => p.hand.length === 4)).toBe(true);
    expect(meja(2).deck.length).toBe(40);
  });

  it('petunjuk: menunjuk SEMUA kartu yang cocok, informasi negatif, menghabiskan token', () => {
    const g = meja(2);
    const b = next(g);
    beri(g, b, [K('m', 1), K('b', 1), K('m', 3), K('h', 2)]);
    expect(() => H.act(g, cur(g).id, { t: 'petunjuk', ke: b.id, warna: 'k' }, 0)).toThrow(/setidaknya/);
    H.act(g, cur(g).id, { t: 'petunjuk', ke: b.id, angka: 1 }, 0);
    expect(g.token).toBe(7);
    const [a1, b1, m3] = b.hand;
    expect(b.tahu[a1!.id]!.angka).toEqual([1]);
    expect(b.tahu[b1!.id]!.angka).toEqual([1]);
    expect(b.tahu[m3!.id]!.angka).toEqual([2, 3, 4, 5]);
    expect(H.viewFor(g, b.id, 0).players.find((p) => p.id === b.id)!.hand[0]!.w).toBeNull();
  });

  it('mainkan benar menyalakan kembang api; salah membakar sumbu; 5 mengembalikan token', () => {
    const g = meja(2);
    const a = cur(g);
    beri(g, a, [K('m', 1), K('m', 3), K('k', 1)]);
    H.act(g, a.id, { t: 'mainkan', kartu: a.hand[0]!.id }, 0);
    expect(g.api.m).toBe(1);
    const b = cur(g);
    beri(g, b, [K('m', 3)]);
    H.act(g, b.id, { t: 'mainkan', kartu: b.hand[0]!.id }, 0);
    expect(g.sumbu).toBe(2);
    expect(g.buang.at(-1)!.n).toBe(3);
    g.api.h = 4;
    g.token = 5;
    const c = cur(g);
    beri(g, c, [K('h', 5)]);
    H.act(g, c.id, { t: 'mainkan', kartu: c.hand[0]!.id }, 0);
    expect(g.token).toBe(6);
  });

  it('tidak boleh membuang saat token penuh; buang mengembalikan token', () => {
    const g = meja(2);
    const a = cur(g);
    expect(() => H.act(g, a.id, { t: 'buang', kartu: a.hand[0]!.id }, 0)).toThrow(/penuh/);
    g.token = 3;
    H.act(g, a.id, { t: 'buang', kartu: a.hand[0]!.id }, 0);
    expect(g.token).toBe(4);
  });

  it('tiga sumbu terbakar: permainan berakhir dengan skor 0', () => {
    const g = meja(2);
    g.api.m = 2;
    for (let i = 0; i < 3; i++) {
      const p = cur(g);
      beri(g, p, [K('b', 4), K('k', 4)]);
      H.act(g, p.id, { t: 'mainkan', kartu: p.hand[0]!.id }, 0);
    }
    expect(g.phase).toBe('akhir');
    expect(g.skor).toBe(0);
  });

  it('tumpukan habis: setiap orang dapat satu giliran terakhir', () => {
    const g = meja(3);
    g.deck = g.deck.slice(0, 1);
    g.token = 0;
    const urutan: string[] = [];
    while (g.phase === 'main') {
      const p = cur(g);
      urutan.push(p.id);
      g.token = Math.min(g.token, 7);
      H.act(g, p.id, { t: 'buang', kartu: p.hand.at(-1)!.id }, 0);
    }
    expect(urutan.length).toBe(4);
    expect(g.sebab).toBe('habis');
  });

  it('pelangi: tersentuh oleh setiap petunjuk warna, tidak bisa disebut', () => {
    const g = meja(2, { warna6: 'pelangi' });
    const b = next(g);
    beri(g, b, [K('x', 2), K('m', 4), K('b', 1)]);
    expect(() => H.act(g, cur(g).id, { t: 'petunjuk', ke: b.id, warna: 'x' }, 0)).toThrow();
    H.act(g, cur(g).id, { t: 'petunjuk', ke: b.id, warna: 'm' }, 0);
    expect(g.log.at(-1)!.sentuh!.length).toBe(2);
    expect(b.tahu[b.hand[0]!.id]!.warna).toEqual(['m', 'x']);
  });

  it('atur urutan tangan sendiri', () => {
    const g = meja(2);
    const p = next(g);
    const ids = p.hand.map((c) => c.id).reverse();
    H.act(g, p.id, { t: 'atur', urutan: ids }, 0);
    expect(p.hand.map((c) => c.id)).toEqual(ids);
  });

  it('bot bermain dengan konvensi: skor rata-rata layak untuk 2–5 pemain', () => {
    for (const n of [2, 3, 4, 5]) {
      let total = 0;
      for (let s = 1; s <= 20; s++) {
        const g = meja(n, {}, s * 71 + n);
        for (const p of g.players) p.bot = true;
        let now = 0;
        for (let i = 0; i < 2000 && g.phase === 'main'; i++) H.tick(g, (now += 3000));
        expect(g.phase).toBe('akhir');
        total += g.skor!;
      }
      expect(total / 20).toBeGreaterThan(10);
    }
  });
});
