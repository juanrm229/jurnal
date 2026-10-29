import { describe, expect, it } from 'vitest';
import { satu } from '../src';

const { act, newGame, join, tick, viewFor, fullDeck, ORI, TONGKRONGAN } = satu;
type C = satu.Card;
const P = (id: string) => ({ id, name: id, avatar: 'kucing', guest: true });
const K = (id: number, w: satu.Warna | null, t: satu.Jenis): C => ({ id, w, t });

function meja(n: number, opts: Partial<satu.Opts> = {}, seed = 3) {
  const g = newGame('ABCD', P('a'), 0, seed);
  for (let i = 1; i < n; i++) join(g, P(String.fromCharCode(97 + i)));
  g.opts = { ...g.opts, ...opts };
  act(g, 'a', { t: 'mulai' }, 0);
  return g;
}
/** Susun keadaan tertentu: kartu atas, warna, dan giliran. */
function atur(g: satu.Game, atas: C, giliran = 0) {
  g.buang = [atas];
  g.warna = atas.w ?? 'm';
  g.giliran = giliran;
  g.tarik = 0;
  g.tarikJenis = null;
  g.awalWarna = false;
  g.ditarik = null;
  g.arah = 1;
}
const P0 = (g: satu.Game, i = 0) => g.players[i]!;

function cek(g: satu.Game) {
  if (g.phase !== 'main') return;
  const ids = [...g.draw, ...g.buang, ...g.players.flatMap((p) => p.hand)].map((c) => c.id).sort((a, b) => a - b);
  expect(ids).toEqual(fullDeck().map((c) => c.id));
}
function sampaiAkhir(g: satu.Game) {
  for (const p of g.players) p.bot = true;
  let now = 0;
  let i = 0;
  while (g.phase !== 'akhir' && i++ < 60000) {
    now += 2500;
    if (g.phase === 'jeda') now += satu.JEDA_MS;
    tick(g, now);
    cek(g);
  }
}

describe('Kartu Satu', () => {
  it('dek resmi 108 kartu dan poin', () => {
    const d = fullDeck();
    expect(d.length).toBe(108);
    expect(d.filter((c) => c.t === '0').length).toBe(4);
    expect(d.filter((c) => c.t === '+4').length).toBe(4);
    expect(d.filter((c) => c.w === 'm').length).toBe(25);
    expect([K(0, 'm', '7'), K(1, 'b', 'skip'), K(2, null, '+4')].map(satu.poin)).toEqual([7, 20, 50]);
  });

  it('pembagian: 7 kartu, kartu pembuka bukan +4', () => {
    for (let s = 1; s < 40; s++) {
      const g = meja(4, {}, s);
      expect(g.players.every((p) => p.hand.length === 7 || p.hand.length === 9)).toBe(true);
      expect(satu.top(g).t).not.toBe('+4');
      cek(g);
    }
  });

  it('cocok warna atau angka; tidak cocok ditolak', () => {
    const g = meja(3);
    atur(g, K(200, 'm', '5'));
    P0(g).hand = [K(201, 'b', '5'), K(202, 'h', '3'), K(203, 'm', '9')];
    expect(() => act(g, P0(g).id, { t: 'main', kartu: [202] }, 0)).toThrow();
    act(g, P0(g).id, { t: 'main', kartu: [201] }, 0);
    expect(g.warna).toBe('b');
    expect(g.giliran).toBe(1);
  });

  it('resmi: +2 membuat pemain berikutnya mengambil 2 dan kehilangan giliran, tanpa tumpuk', () => {
    const g = meja(3);
    atur(g, K(200, 'm', '5'));
    P0(g).hand = [K(201, 'm', '+2'), K(202, 'h', '3')];
    P0(g, 1).hand.push(K(203, 'k', '+2'));
    act(g, P0(g).id, { t: 'main', kartu: [201] }, 0);
    expect(() => act(g, P0(g, 1).id, { t: 'main', kartu: [203] }, 0)).toThrow();
    const n = P0(g, 1).hand.length;
    act(g, P0(g, 1).id, { t: 'tarik' }, 0);
    expect(P0(g, 1).hand.length).toBe(n + 2);
    expect(g.giliran).toBe(2);
  });

  it('resmi: Putar Balik berdua = Lewati', () => {
    const g = meja(2);
    atur(g, K(200, 'm', '5'));
    P0(g).hand = [K(201, 'm', 'rev'), K(202, 'h', '3')];
    act(g, P0(g).id, { t: 'main', kartu: [201] }, 0);
    expect(g.giliran).toBe(0);
  });

  it('tantangan +4: curang → pelaku ambil 4; sah → penantang ambil 6', () => {
    const g = meja(3);
    atur(g, K(200, 'm', '5'));
    P0(g).hand = [K(201, null, '+4'), K(202, 'm', '3'), K(205, 'b', '1')];
    act(g, P0(g).id, { t: 'main', kartu: [201], warna: 'b' }, 0);
    expect(viewFor(g, P0(g, 1).id, 0).tantang).toBe(true);
    act(g, P0(g, 1).id, { t: 'tantang' }, 0);
    expect(P0(g).hand.length).toBe(6);
    expect(g.giliran).toBe(1);
    const h = meja(3);
    atur(h, K(200, 'm', '5'));
    P0(h).hand = [K(201, null, '+4'), K(202, 'h', '3'), K(205, 'b', '1')];
    act(h, P0(h).id, { t: 'main', kartu: [201], warna: 'b' }, 0);
    const n = P0(h, 1).hand.length;
    act(h, P0(h, 1).id, { t: 'tantang' }, 0);
    expect(P0(h, 1).hand.length).toBe(n + 6);
    expect(h.giliran).toBe(2);
  });

  it('lupa "satu!" bisa ditangkap: +2 kartu', () => {
    const g = meja(3);
    atur(g, K(200, 'm', '5'));
    P0(g).hand = [K(201, 'm', '1'), K(202, 'h', '3')];
    act(g, P0(g).id, { t: 'main', kartu: [201] }, 0);
    expect(P0(g).rawan).toBe(true);
    act(g, P0(g, 2).id, { t: 'tangkap', target: P0(g).id }, 0);
    expect(P0(g).hand.length).toBe(3);
    // Yang sudah bilang "satu!" aman.
    const h = meja(3);
    atur(h, K(200, 'm', '5'));
    P0(h).hand = [K(201, 'm', '1'), K(202, 'h', '3')];
    act(h, P0(h).id, { t: 'satu' }, 0);
    act(h, P0(h).id, { t: 'main', kartu: [201] }, 0);
    expect(() => act(h, P0(h, 2).id, { t: 'tangkap', target: P0(h).id }, 0)).toThrow();
  });

  it('ambil kartu: kalau cocok boleh langsung dimainkan atau dilewati', () => {
    const g = meja(3);
    atur(g, K(200, 'm', '5'));
    P0(g).hand = [K(202, 'h', '3')];
    g.draw.push(K(201, 'm', '8'));
    g.draw = g.draw.filter((c, i, a) => a.findIndex((x) => x.id === c.id) === i);
    act(g, P0(g).id, { t: 'tarik' }, 0);
    expect(g.ditarik).toBe(201);
    expect(() => act(g, P0(g).id, { t: 'main', kartu: [202] }, 0)).toThrow();
    act(g, P0(g).id, { t: 'lewat' }, 0);
    expect(g.giliran).toBe(1);
  });

  it('tongkrongan: tumpuk campur, pantul, kembar, salip, tutup angka', () => {
    const g = meja(3, TONGKRONGAN);
    atur(g, K(200, 'm', '5'));
    P0(g).hand = [K(201, 'm', '+2'), K(209, 'h', '1')];
    P0(g, 1).hand = [K(202, null, '+4'), K(208, 'h', '2')];
    P0(g, 2).hand = [K(203, 'b', '+2'), K(204, 'b', 'rev'), K(207, 'h', '3')];
    act(g, P0(g).id, { t: 'main', kartu: [201] }, 0);
    act(g, P0(g, 1).id, { t: 'main', kartu: [202], warna: 'b' }, 0);
    expect(g.tarik).toBe(6);
    // Pantul: Putar Balik biru mengembalikan tumpukan ke pemain sebelumnya.
    act(g, P0(g, 2).id, { t: 'main', kartu: [204] }, 0);
    expect(g.giliran).toBe(1);
    expect(g.tarik).toBe(6);
    const n = P0(g, 1).hand.length;
    act(g, P0(g, 1).id, { t: 'tarik' }, 0);
    expect(P0(g, 1).hand.length).toBe(n + 6);

    const k = meja(3, TONGKRONGAN);
    atur(k, K(200, 'm', '5'));
    P0(k).hand = [K(201, 'b', '5'), K(202, 'h', '5'), K(203, 'k', '9')];
    act(k, P0(k).id, { t: 'main', kartu: [201, 202] }, 0);
    expect(satu.top(k).id).toBe(202);
    expect(k.warna).toBe('h');
    // Salip: kartu persis sama di luar giliran.
    P0(k, 2).hand.push(K(204, 'h', '5'));
    act(k, P0(k, 2).id, { t: 'salip', kartu: 204 }, 0);
    expect(k.giliran).toBe(0);
    // Tutup angka: kartu terakhir tidak boleh aksi.
    atur(k, K(210, 'k', '1'), 0);
    P0(k).hand = [K(211, 'k', 'skip')];
    expect(() => act(k, P0(k).id, { t: 'main', kartu: [211] }, 0)).toThrow(/angka/);
  });

  it('7-0: tukar tangan & putar semua tangan', () => {
    const g = meja(3, { tujuhNol: true });
    atur(g, K(200, 'm', '5'));
    P0(g).hand = [K(201, 'm', '7'), K(202, 'h', '3')];
    const lain = P0(g, 2).hand.map((c) => c.id);
    act(g, P0(g).id, { t: 'main', kartu: [201], target: P0(g, 2).id }, 0);
    expect(P0(g).hand.map((c) => c.id)).toEqual(lain);
    expect(P0(g, 2).hand.map((c) => c.id)).toEqual([202]);
  });

  it('kartu pembuka Ganti Warna: pemain pertama memilih warna dulu', () => {
    for (let s = 1; s < 400; s++) {
      const g = meja(3, {}, s);
      if (satu.top(g).t !== 'wild') continue;
      const p = g.players[g.giliran]!;
      expect(viewFor(g, p.id, 0).awalWarna).toBe(true);
      expect(() => act(g, p.id, { t: 'tarik' }, 0)).toThrow();
      act(g, p.id, { t: 'warna', warna: 'h' }, 0);
      expect(g.warna).toBe('h');
      return;
    }
  });

  it('permainan penuh antar-bot tuntas untuk semua mode (2–10 pemain)', () => {
    for (const akhir of ['skor', 'sekali', 'pecundang'] as const)
      for (const n of [2, 3, 5, 10]) {
        const g = meja(n, { ...(akhir === 'pecundang' ? TONGKRONGAN : ORI), akhir, target: 200, tujuhNol: n === 5 }, n * 31);
        sampaiAkhir(g);
        expect(g.phase).toBe('akhir');
        expect(g.pemenang).toBeTruthy();
        if (akhir === 'pecundang') expect(g.kalah).toBeTruthy();
        if (akhir === 'skor') expect(g.players.find((p) => p.id === g.pemenang)!.skor).toBeGreaterThanOrEqual(200);
      }
  });

  it('privasi tangan', () => {
    const g = meja(4);
    const v = viewFor(g, 'b', 0);
    expect(JSON.stringify(v.players)).not.toContain('hand');
    expect(v.me!.hand.length).toBeGreaterThan(0);
  });
});
