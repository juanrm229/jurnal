import { describe, expect, it } from 'vitest';
import { saudagar as S } from '../src';

const P = (id: string) => ({ id, name: id, avatar: 'kucing', guest: true });
function meja(n: number, opts: Partial<S.Opts> = {}, seed = 9) {
  const g = S.newGame('ABCD', P('a'), 0, seed);
  for (let i = 1; i < n; i++) S.join(g, P(String.fromCharCode(97 + i)));
  g.opts = { ...g.opts, ...opts };
  S.act(g, 'a', { t: 'mulai' }, 0);
  return g;
}
const cur = (g: S.Game) => g.players[g.giliran]!;
const lain = (g: S.Game) => g.players.find((p) => p !== cur(g))!;
const punya = (g: S.Game, pid: string, ...ks: number[]) => ks.forEach((k) => (g.milik[k] = { owner: pid, rumah: 0, gadai: false }));
/** Lempar dengan dadu tertentu. */
function lempar(g: S.Game, d: [number, number], now = 0) {
  const p = cur(g);
  const r = g.rng;
  // Cari benih yang menghasilkan dadu yang diminta.
  for (let s = 0; s < 1e6; s++) {
    g.rng = s;
    const a = 1 + Math.floor(rnd(s) * 6);
    const b = 1 + Math.floor(rnd2(s) * 6);
    if (a === d[0] && b === d[1]) break;
  }
  S.act(g, p.id, { t: 'lempar' }, now);
  void r;
}
// Tiruan rand() mesin untuk mencari benih.
function step(x: number) {
  let t = (x + 0x6d2b79f5) >>> 0;
  const st = t;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return { v: ((t ^ (t >>> 14)) >>> 0) / 4294967296, st };
}
const rnd = (s: number) => step(s).v;
const rnd2 = (s: number) => step(step(s).st).v;

describe('Saudagar', () => {
  it('papan resmi: 40 petak, 28 properti, harga & sewa', () => {
    expect(S.PETAK.length).toBe(40);
    expect(S.PETAK.filter(S.isMilikan).length).toBe(28);
    expect(S.KARTU.length).toBe(32);
    const jkt = S.PETAK[39] as Extract<S.Petak, { jenis: 'kota' }>;
    expect(jkt.sewa).toEqual([50, 200, 600, 1400, 1700, 2000]);
    expect(S.rp(1500)).toBe('Rp1,5 M');
  });

  it('sewa: dobel satu grup, rumah, transportasi, utilitas', () => {
    const m = S.PETAK.map(() => ({ owner: null as string | null, rumah: 0, gadai: false }));
    m[1] = { owner: 'x', rumah: 0, gadai: false };
    expect(S.sewa(m, 1, 7)).toBe(2);
    m[3] = { owner: 'x', rumah: 0, gadai: false };
    expect(S.sewa(m, 1, 7)).toBe(4);
    m[3]!.rumah = 3;
    expect(S.sewa(m, 3, 7)).toBe(180);
    m[5] = { owner: 'x', rumah: 0, gadai: false };
    m[15] = { owner: 'x', rumah: 0, gadai: false };
    expect(S.sewa(m, 5, 7)).toBe(50);
    m[12] = { owner: 'x', rumah: 0, gadai: false };
    expect(S.sewa(m, 12, 7)).toBe(28);
    m[28] = { owner: 'x', rumah: 0, gadai: false };
    expect(S.sewa(m, 12, 7)).toBe(70);
    m[12]!.gadai = true;
    expect(S.sewa(m, 12, 7)).toBe(0);
  });

  it('beli atau lelang; tanpa penawar tetap milik bank', () => {
    const g = meja(3);
    const p = cur(g);
    lempar(g, [1, 2]); // ke Ambon (3)
    expect(g.fase).toBe('beli');
    S.act(g, p.id, { t: 'tolak' }, 0);
    expect(g.fase).toBe('lelang');
    S.act(g, lain(g).id, { t: 'tawar', n: 40 }, 1000);
    for (const x of g.players) if (x.id !== lain(g).id) S.act(g, x.id, { t: 'lewatLelang' }, 1000);
    expect(g.milik[3]!.owner).toBe(lain(g).id);
    expect(lain(g).uang).toBe(1500 - 40);
    expect(g.fase).toBe('selesai');
  });

  it('kembar 3 kali masuk penjara; di penjara: kembar keluar, gagal 3 kali bayar denda', () => {
    const g = meja(2);
    const p = cur(g);
    lempar(g, [1, 1]);
    while (g.fase !== 'lempar') S.act(g, p.id, { t: g.fase === 'beli' ? 'tolak' : 'akhiri' }, 0), g.lelang && ((g.lelang.deadline = 0), S.tick(g, 1));
    lempar(g, [2, 2]);
    while (g.fase !== 'lempar') S.act(g, p.id, { t: g.fase === 'beli' ? 'tolak' : 'akhiri' }, 0), g.lelang && ((g.lelang.deadline = 0), S.tick(g, 1));
    lempar(g, [3, 3]);
    expect(p.pos).toBe(10);
    expect(p.penjara).toBe(0);
    // Giliran berikutnya: tiga kali gagal → bayar denda dan jalan.
    p.uang = 1000;
    for (let i = 0; i < 3; i++) {
      g.giliran = g.players.indexOf(p);
      g.fase = 'lempar';
      lempar(g, [1, 2]);
    }
    expect(p.penjara).toBe(-1);
    expect(p.uang).toBe(1000 - S.DENDA_PENJARA);
    expect(p.pos).toBe(13);
  });

  it('bangun merata, hotel, stok rumah, jual separuh harga', () => {
    const g = meja(2);
    const p = cur(g);
    punya(g, p.id, 1, 3);
    S.act(g, p.id, { t: 'bangun', kotak: 1 }, 0);
    expect(() => S.act(g, p.id, { t: 'bangun', kotak: 1 }, 0)).toThrow(/merata/);
    for (let i = 0; i < 4; i++) for (const k of [3, 1]) if (g.milik[k]!.rumah < 4) S.act(g, p.id, { t: 'bangun', kotak: k }, 0);
    expect(g.rumahBank).toBe(32 - 8);
    S.act(g, p.id, { t: 'bangun', kotak: 1 }, 0);
    expect(g.milik[1]!.rumah).toBe(5);
    expect(g.rumahBank).toBe(32 - 4);
    expect(g.hotelBank).toBe(11);
    const u = p.uang;
    S.act(g, p.id, { t: 'jualRumah', kotak: 1 }, 0);
    expect(p.uang).toBe(u + 25);
    expect(() => S.act(g, p.id, { t: 'gadai', kotak: 3 }, 0)).toThrow(/bangunan/);
    g.milik[1]!.rumah = 2;
    g.milik[3]!.rumah = 2;
    g.rumahBank = 0;
    expect(S.bisaBangun(g, p.id, 3)).toMatch(/Stok/);
  });

  it('gadai & tebus dengan bunga 10%', () => {
    const g = meja(2);
    const p = cur(g);
    punya(g, p.id, 39);
    S.act(g, p.id, { t: 'gadai', kotak: 39 }, 0);
    expect(p.uang).toBe(1700);
    S.act(g, p.id, { t: 'tebus', kotak: 39 }, 0);
    expect(p.uang).toBe(1700 - 220);
  });

  it('tidak sanggup bayar sewa: bangkrut, aset pindah ke penagih', () => {
    const g = meja(3);
    const p = cur(g);
    const o = lain(g);
    punya(g, o.id, 37, 39);
    g.milik[39]!.rumah = 5;
    g.milik[37]!.rumah = 4;
    punya(g, p.id, 1);
    p.uang = 100;
    p.pos = 33;
    lempar(g, [3, 3]); // 39 Jakarta hotel: 2000
    expect(g.fase).toBe('utang');
    expect(() => S.act(g, p.id, { t: 'bayarUtang' }, 0)).toThrow();
    S.act(g, p.id, { t: 'bangkrut' }, 0);
    expect(p.bangkrut).toBe(true);
    expect(g.milik[1]!.owner).toBe(o.id);
    expect(o.uang).toBe(1500 + 100);
    expect(cur(g)).not.toBe(p);
  });

  it('bangkrut ke bank: properti dilelang ulang', () => {
    const g = meja(3);
    const p = cur(g);
    punya(g, p.id, 1, 3);
    p.uang = 10;
    p.pos = 2;
    lempar(g, [1, 1]); // 4: pajak 200
    expect(g.fase).toBe('utang');
    S.act(g, p.id, { t: 'gadai', kotak: 1 }, 0);
    S.act(g, p.id, { t: 'gadai', kotak: 3 }, 0);
    S.act(g, p.id, { t: 'bangkrut' }, 0);
    expect(g.fase).toBe('lelang');
    expect(g.lelang!.kotak).toBe(1);
  });

  it('tukar: properti, uang, kartu; properti tergadai kena bunga 10%', () => {
    const g = meja(2);
    const [a, b] = g.players;
    punya(g, a!.id, 1);
    punya(g, b!.id, 3);
    g.milik[3]!.gadai = true;
    S.act(g, a!.id, { t: 'ajukan', ke: b!.id, beri: { uang: 50, kotak: [1], bebas: 0 }, minta: { uang: 0, kotak: [3], bebas: 0 } }, 0);
    const t = g.tawaran[0]!;
    S.act(g, b!.id, { t: 'terimaTawaran', id: t.id }, 0);
    expect(g.milik[1]!.owner).toBe(b!.id);
    expect(g.milik[3]!.owner).toBe(a!.id);
    expect(a!.uang).toBe(1500 - 50 - 3);
    expect(b!.uang).toBe(1550);
  });

  it('kartu ulang tahun: setiap pemain membayar', () => {
    const g = meja(4);
    const p = cur(g);
    const id = S.KARTU.find((k) => k.aksi.t === 'terimaSemua')!.id;
    g.dekD = [id, ...g.dekD.filter((x) => x !== id)];
    p.pos = 0;
    lempar(g, [1, 1]); // 2: Dana Umum
    expect(p.uang).toBe(1500 + 30);
  });

  it('jackpot parkir & start dobel (aturan rumahan)', () => {
    const g = meja(2, S.RUMAHAN);
    const p = cur(g);
    p.pos = 2;
    lempar(g, [1, 1]); // pajak 200 → pot
    expect(g.pot).toBe(200);
    S.act(g, p.id, { t: 'lempar' }, 0);
    void p;
  });

  it('permainan antar-bot berakhir (tanpa batas waktu, maupun dengan batas waktu)', () => {
    let selesai = 0;
    for (const n of [2, 3, 4, 6])
      for (let s = 1; s <= 5; s++) {
        const g = meja(n, { ...S.RESMI }, s * 31 + n);
        for (const p of g.players) p.bot = true;
        let now = 0;
        for (let i = 0; i < 40000 && g.phase === 'main'; i++) S.tick(g, (now += 2000));
        if (g.phase === 'akhir') selesai++;
        const total = g.players.reduce((a, p) => a + p.uang, 0);
        expect(Number.isFinite(total)).toBe(true);
        expect(g.players.every((p) => p.uang >= 0)).toBe(true);
      }
    expect(selesai).toBeGreaterThanOrEqual(16);
    const g = meja(4, { ...S.RESMI, batas: 30 }, 77);
    for (const p of g.players) p.bot = true;
    let now = 0;
    for (let i = 0; i < 40000 && g.phase === 'main'; i++) S.tick(g, (now += 2000));
    expect(g.phase).toBe('akhir');
  });

  it('privasi tawaran', () => {
    const g = meja(3);
    const [a, b, c] = g.players;
    punya(g, a!.id, 1);
    S.act(g, a!.id, { t: 'ajukan', ke: b!.id, beri: { uang: 0, kotak: [1], bebas: 0 }, minta: { uang: 10, kotak: [], bebas: 0 } }, 0);
    expect(S.viewFor(g, c!.id, 0).tawaran.length).toBe(0);
    expect(S.viewFor(g, b!.id, 0).tawaran.length).toBe(1);
  });
});
