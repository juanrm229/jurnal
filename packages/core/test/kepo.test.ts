import { describe, expect, it } from 'vitest';
import { addDays, kepo, type KepoEntry, weekday } from '../src';

const START = '2026-09-01'; // Selasa
const e = (offset: number, extra: Partial<KepoEntry> = {}): KepoEntry => ({ day: addDays(START, offset), hour: 23, kind: 'text', ...extra });

describe('si kepo', () => {
  it('diam dulu kalau bahannya belum cukup', () => {
    const r = kepo([e(0, { text: 'halo' }), e(1, { text: 'halo lagi' })]);
    expect(r.findings).toEqual([]);
    expect(r.need).toBe(3);
  });

  it('menemukan jam favorit, kata setia, dan ritual hari Selasa', () => {
    expect(weekday(START)).toBe(2);
    const xs: KepoEntry[] = [];
    for (let w = 0; w < 5; w++) {
      xs.push(e(w * 7, { text: 'beli martabak sepulang kerja, antre lama sekali', hour: 23 }));
      xs.push(e(w * 7 + 2, { text: 'hari biasa saja di kantor', hour: 22 }));
    }
    xs.push(e(4, { text: 'martabak lagi padahal bukan jadwalnya', hour: 23 }));
    const r = kepo(xs);
    const by = (id: string) => r.findings.find((f) => f.id === id);
    expect(by('jam')!.title).toContain('jam 23');
    expect(by('kata')!.title).toContain('martabak');
    expect(by('ritual')!.title).toContain('Martabak');
    expect(by('ritual')!.title).toContain('Selasa');
    expect(by('ritual')!.proof).toBe('5 dari 6 kemunculan');
    expect(by('hari')!.title).toMatch(/^Selasa adalah hari paling rajinmu/);
  });

  it('memasangkan rasa dengan cuaca, hanya kalau polanya nyata', () => {
    const xs: KepoEntry[] = [];
    for (let i = 0; i < 4; i++) xs.push(e(i, { kind: 'mood', mood: 'rindu', weather: 'hujan' }));
    for (let i = 4; i < 12; i++) xs.push(e(i, { kind: 'mood', mood: 'tenang', weather: 'cerah' }));
    const r = kepo(xs);
    expect(r.findings.find((f) => f.id === 'cuaca')!.title).toMatch(/Saat hujan, kamu paling sering merasa rindu/);
    expect(r.findings.find((f) => f.id === 'rasa')!.title).toContain('tenang');
    // Tanpa cuaca tidak ada temuan cuaca.
    expect(kepo(xs.map((x) => ({ ...x, weather: undefined }))).findings.some((f) => f.id === 'cuaca')).toBe(false);
  });
});
