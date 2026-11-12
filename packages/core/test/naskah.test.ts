import { describe, expect, it } from 'vitest';
import { type NaskahEntry, naskahChrono, naskahFind, naskahKacamata, naskahWarnings, naskahYear } from '../src/naskah';

const scene = (id: string, chapter: number, order: number, sort: string) => ({ id, chapter, order, p: { v: 1 as const, pov: 'dina', when: { label: sort, sort }, text: '' } });
const scenes = [scene('a1', 1, 1, '1974'), scene('a2', 1, 2, ''), scene('a6', 2, 1, '1979-02-14 23:40'), scene('a7', 2, 2, '1979-02-15 06:10'), scene('kilas', 3, 1, '1960')];
const chrono = naskahChrono(scenes);
const canon: NaskahEntry[] = [
  { id: 'dina', p: { v: 1, kind: 'tokoh', name: 'Dina', aliases: [], known: [] } },
  { id: 'darmo', p: { v: 1, kind: 'tokoh', name: 'Pak Darmo', aliases: ['Bapak'], known: [{ who: 'dina', how: 'tahu' }] } },
  { id: 'cincin', p: { v: 1, kind: 'benda', name: 'cincin', aliases: ['cincin perak'], known: [{ who: 'darmo', how: 'tahu', since: 'a6' }], since: 'a6' } },
  { id: 'laras', p: { v: 1, kind: 'fakta', name: 'Laras anak Pak Darmo', aliases: ['Laras'], known: [{ who: 'darmo', how: 'tahu' }, { who: 'dina', how: 'mengira', since: 'a7' }] } },
];

describe('studio naskah', () => {
  it('kronologi: adegan tanpa tanggal mengikuti yang bertanggal sebelumnya; kilas balik tetap di masa lalu', () => {
    expect(chrono.a1! < chrono.a2!).toBe(true);
    expect(chrono.a2! < chrono.a6!).toBe(true);
    expect(chrono.kilas! < chrono.a1!).toBe(true);
    expect(naskahYear('1979-02-15 06:10')).toBe(1979);
  });

  it('kacamata: tahu, mengira, dan yang belum sampai, sesuai waktu cerita', () => {
    const pagi = naskahKacamata('dina', chrono.a7!, canon, chrono);
    expect(pagi.tahu.map((e) => e.id)).toEqual(['darmo']);
    expect(pagi.mengira.map((e) => e.id)).toEqual(['laras']);
    expect(pagi.belum.map((e) => e.id)).toEqual(['cincin']);
    // Sebelum cincin ada di dunia cerita, ia tidak tampil sama sekali.
    expect(naskahKacamata('dina', chrono.a1!, canon, chrono).belum.map((e) => e.id)).toEqual(['laras']);
  });

  it('peringatan: menyebut hal yang belum diketahui, dan kata yang belum ada di zamannya', () => {
    const text = 'Dina menemukan cincin itu. Ia ingin menelepon, tapi ponselnya hanyut.';
    const w = naskahWarnings(text, 'dina', chrono.a7!, canon, chrono, 1979);
    expect(w.map((x) => [x.kind, x.term])).toEqual([
      ['belum', 'cincin'],
      ['zaman', 'ponsel'],
    ]);
    expect(w[0]!.first?.who).toBe('darmo');
    expect(naskahWarnings(text, 'dina', chrono.a7!, canon, chrono, 2001).filter((x) => x.kind === 'zaman')).toHaveLength(0);
  });

  it('pencarian kata utuh, tanpa beda huruf besar-kecil', () => {
    expect(naskahFind('Cincin, cincinnya, cincin.', 'cincin').map((r) => r.at)).toEqual([0, 8, 19]);
    expect(naskahFind('cincinan', 'cincin')).toHaveLength(0);
  });
});
