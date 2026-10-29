import { describe, expect, it } from 'vitest';
import { petasan as K } from '../src';

const P = (id: string) => ({ id, name: id, avatar: 'kucing', guest: true });
function meja(n: number, seed = 4, opts: Partial<K.Opts> = {}) {
  const g = K.newGame('ABCD', P('a'), 0, seed);
  for (let i = 1; i < n; i++) K.join(g, P(String.fromCharCode(97 + i)));
  g.opts = { ...g.opts, ...opts };
  K.act(g, 'a', { t: 'mulai' }, 0);
  return g;
}
const cur = (g: K.Game) => g.players[g.giliran]!;
const next = (g: K.Game) => g.players[(g.giliran + 1) % g.players.length]!;
let uid = 1000;
const kartu = (j: K.Jenis): K.Card => ({ id: uid++, j });
/** Jalankan jendela Ogah! sampai habis. */
const tunggu = (g: K.Game, now = 10_000) => K.tick(g, now);

describe('Kucing Petasan', () => {
  it('dek resmi 56 kartu; pembagian: Siram Air + 4 kartu, petasan = pemain − 1', () => {
    expect(K.fullDeck().length).toBe(56);
    expect(K.fullDeck(2).length).toBe(112);
    for (const n of [2, 3, 5, 6, 10]) {
      const g = meja(n);
      expect(g.players.every((p) => p.hand.length === 5 && p.hand.some((c) => c.j === 'siram'))).toBe(true);
      expect(g.deck.filter((c) => c.j === 'petasan').length).toBe(n - 1);
      const siramDek = g.deck.filter((c) => c.j === 'siram').length;
      expect(siramDek).toBe(n === 2 ? 2 : (n > 5 ? 12 : 6) - n);
      expect(g.players.flatMap((p) => p.hand).some((c) => c.j === 'petasan')).toBe(false);
    }
  });

  it('kombo: dua kembar, tiga kembar, lima beda; kucing tunggal & Ogah! tunggal tidak sah', () => {
    expect(K.komboOf([{ j: 'oren' }])).toBeNull();
    expect(K.komboOf([{ j: 'ogah' }])).toBeNull();
    expect(K.komboOf([{ j: 'oren' }, { j: 'oren' }])).toBe('dua');
    expect(K.komboOf([{ j: 'serbu' }, { j: 'serbu' }])).toBe('dua');
    expect(K.komboOf([{ j: 'oren' }, { j: 'oren' }, { j: 'oren' }])).toBe('tiga');
    expect(K.komboOf([{ j: 'oren' }, { j: 'garong' }, { j: 'siram' }, { j: 'kabur' }, { j: 'serbu' }])).toBe('lima');
    expect(K.komboOf([{ j: 'oren' }, { j: 'garong' }])).toBeNull();
  });

  it('ambil petasan tanpa Siram Air: meledak; dengan Siram Air: sisipkan di posisi pilihan', () => {
    const g = meja(3);
    const p = cur(g);
    p.hand = [kartu('oren')];
    g.deck.unshift(kartu('petasan'));
    K.act(g, p.id, { t: 'ambil' }, 0);
    expect(p.out).toBe(true);
    const q = cur(g);
    q.hand = [kartu('siram')];
    const pt = kartu('petasan');
    g.deck.unshift(pt);
    K.act(g, q.id, { t: 'ambil' }, 0);
    expect(g.fase).toBe('jinak');
    K.act(g, q.id, { t: 'sisip', posisi: 2 }, 0);
    expect(g.deck[2]).toBe(pt);
    expect(q.out).toBe(false);
    expect(cur(g)).not.toBe(q);
  });

  it('Serbu!: pemain berikutnya 2 giliran; bertumpuk jadi 4', () => {
    const g = meja(3);
    const a = cur(g);
    const b = next(g);
    a.hand.push(kartu('serbu'));
    K.act(g, a.id, { t: 'main', kartu: [a.hand.at(-1)!.id] }, 0);
    tunggu(g);
    expect(cur(g)).toBe(b);
    expect(g.sisa).toBe(2);
    b.hand.push(kartu('serbu'));
    K.act(g, b.id, { t: 'main', kartu: [b.hand.at(-1)!.id] }, 10_000);
    tunggu(g, 20_000);
    expect(g.sisa).toBe(4);
  });

  it('Kabur hanya mengakhiri satu giliran dari serbuan', () => {
    const g = meja(3);
    g.sisa = 2;
    const a = cur(g);
    a.hand.push(kartu('kabur'));
    K.act(g, a.id, { t: 'main', kartu: [a.hand.at(-1)!.id] }, 0);
    tunggu(g);
    expect(cur(g)).toBe(a);
    expect(g.sisa).toBe(1);
  });

  it('Ogah! membatalkan; Ogah! atas Ogah! menghidupkan lagi', () => {
    const g = meja(3);
    const [a, b, c] = [cur(g), next(g), g.players[(g.giliran + 2) % 3]!];
    a.hand.push(kartu('serbu'));
    b.hand.push(kartu('ogah'));
    c.hand.push(kartu('ogah'));
    K.act(g, a.id, { t: 'main', kartu: [a.hand.at(-1)!.id] }, 0);
    K.act(g, b.id, { t: 'ogah', kartu: b.hand.at(-1)!.id }, 100);
    tunggu(g);
    expect(cur(g)).toBe(a);
    a.hand.push(kartu('serbu'));
    b.hand.push(kartu('ogah'));
    K.act(g, a.id, { t: 'main', kartu: [a.hand.at(-1)!.id] }, 20_000);
    K.act(g, b.id, { t: 'ogah', kartu: b.hand.at(-1)!.id }, 20_100);
    K.act(g, c.id, { t: 'ogah', kartu: c.hand.at(-1)!.id }, 20_200);
    tunggu(g, 40_000);
    expect(cur(g)).toBe(b);
  });

  it('Minta Dong, dua kembar (curi acak), tiga kembar (sebut), lima beda (pungut buangan)', () => {
    const g = meja(2);
    const [a, b] = [cur(g), next(g)];
    a.hand = [kartu('minta')];
    b.hand = [kartu('kocok'), kartu('siram')];
    K.act(g, a.id, { t: 'main', kartu: [a.hand[0]!.id], target: b.id }, 0);
    tunggu(g);
    expect(g.fase).toBe('minta');
    K.act(g, b.id, { t: 'beri', kartu: b.hand[0]!.id }, 0);
    expect(a.hand.map((c) => c.j)).toEqual(['kocok']);
    a.hand = [kartu('oren'), kartu('oren')];
    K.act(g, a.id, { t: 'main', kartu: a.hand.map((c) => c.id), target: b.id }, 20_000);
    tunggu(g, 30_000);
    expect(a.hand.map((c) => c.j)).toEqual(['siram']);
    a.hand = [kartu('garong'), kartu('garong'), kartu('garong')];
    b.hand = [kartu('terawang')];
    K.act(g, a.id, { t: 'main', kartu: a.hand.map((c) => c.id), target: b.id, sebut: 'terawang' }, 40_000);
    tunggu(g, 50_000);
    expect(a.hand.map((c) => c.j)).toEqual(['terawang']);
    const bekas = g.buang.find((c) => c.j === 'minta')!;
    a.hand = ['oren', 'garong', 'belang', 'kampung', 'anggora'].map((j) => kartu(j as K.Jenis));
    K.act(g, a.id, { t: 'main', kartu: a.hand.map((c) => c.id), ambil: bekas.id }, 60_000);
    tunggu(g, 70_000);
    expect(a.hand.map((c) => c.j)).toEqual(['minta']);
  });

  it('Terawang hanya terlihat oleh pemainnya', () => {
    const g = meja(3);
    const a = cur(g);
    a.hand.push(kartu('terawang'));
    K.act(g, a.id, { t: 'main', kartu: [a.hand.at(-1)!.id] }, 0);
    tunggu(g);
    expect(K.viewFor(g, a.id, 0).me!.intip!.kartu).toEqual(g.deck.slice(0, 3).map((c) => c.j));
    expect(K.viewFor(g, next(g).id, 0).me!.intip).toBeNull();
    expect(JSON.stringify(K.viewFor(g, next(g).id, 0).players)).not.toContain('hand');
  });

  it('permainan penuh antar-bot selalu berakhir dengan satu pemenang (2–10 pemain)', () => {
    for (const n of [2, 3, 5, 7, 10])
      for (let s = 1; s <= 8; s++) {
        const g = meja(n, s * 37 + n);
        for (const p of g.players) p.bot = true;
        let now = 0;
        for (let i = 0; i < 20000 && g.phase === 'main'; i++) K.tick(g, (now += 1500));
        expect(g.phase).toBe('akhir');
        expect(g.players.filter((p) => !p.out).length).toBe(1);
        const total = g.deck.length + g.buang.length + g.players.reduce((a, p) => a + p.hand.length, 0);
        // Petasan yang meledak keluar dari permainan.
        const set = n > 5 ? 2 : 1;
        expect(total).toBe(K.fullDeck(set).length - (set * 4 - (n - 1)) - (n === 2 ? 2 : 0) - g.players.filter((p) => p.out).length);
      }
  });
});
