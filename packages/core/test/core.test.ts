import { describe, expect, it } from 'vitest';
import {
  addDays,
  backupIdentity,
  buildWrap,
  coverageOn,
  createInviteSecret,
  dailyCardFor,
  DECKS,
  fromHijri,
  generateIdentity,
  generateRecoveryCode,
  isoWeek,
  newSymmetricKey,
  nightQuestionFor,
  openEnvelope,
  openInviteBundle,
  penHolderFor,
  rareTriggersFor,
  restoreIdentity,
  safetyCode,
  sealableDays,
  sealEnvelope,
  sealInviteBundle,
  seasonsForYear,
  streakSummary,
  sunsetUtc,
  todayIn,
  toHijri,
  weekRange,
  dictionaryCandidates,
  type StreakMember,
  type WrapDrop,
} from '../src';

describe('waktu', () => {
  it('menghitung hari di WIB/WITA/WIT', () => {
    const at = new Date('2026-10-21T16:30:00Z'); // 23.30 WIB, 00.30 WITA
    expect(todayIn('Asia/Jakarta', at)).toBe('2026-10-21');
    expect(todayIn('Asia/Makassar', at)).toBe('2026-10-22');
    expect(todayIn('Asia/Makassar', at, true)).toBe('2026-10-21'); // sebelum 04.00 masih kemarin
    expect(sealableDays('Asia/Makassar', at)).toEqual(['2026-10-21', '2026-10-22']);
  });
  it('minggu ISO', () => {
    expect(isoWeek('2026-10-22')).toBe('2026-W43');
    expect(isoWeek('2027-01-01')).toBe('2026-W53');
    expect(weekRange('2026-W43')).toEqual({ start: '2026-10-19', end: '2026-10-25' });
  });
});

describe('langit', () => {
  it('senja di Jakarta sekitar 17.50 WIB', () => {
    const t = sunsetUtc('2026-10-22', -6.2, 106.82)!;
    const local = new Date(t.getTime() + 7 * 3600_000);
    expect(local.getUTCHours()).toBe(17);
    expect(local.toISOString().slice(0, 10)).toBe('2026-10-22');
  });
  it('kalender Hijriah tabular kira-kira sesuai', () => {
    // 1 Ramadan 1447 H ≈ 18–19 Februari 2026
    const ram = fromHijri({ year: 1447, month: 9, day: 1 });
    expect(['2026-02-17', '2026-02-18', '2026-02-19']).toContain(ram);
    expect(toHijri(ram)).toEqual({ year: 1447, month: 9, day: 1 });
    const seasons = seasonsForYear(2027).map((s) => s.code);
    expect(seasons).toContain('ramadan');
    expect(seasons).toContain('mudik');
  });
});

describe('kripto', () => {
  it('amplop bisa dibuka penerima lingkaran & pribadi, tidak oleh orang lain', () => {
    const a = generateIdentity();
    const b = generateIdentity();
    const eve = generateIdentity();
    const circleKey = newSymmetricKey();
    const env = sealEnvelope({ text: 'halo' }, [
      { t: 'user', userId: 'a', publicKey: a.publicKey },
      { t: 'circle', circleId: 'c1', epoch: 1, key: circleKey },
    ]);
    const ringA = { userId: 'a', identity: a, circleKey: () => undefined };
    const ringB = { userId: 'b', identity: b, circleKey: (id: string, e: number) => (id === 'c1' && e === 1 ? circleKey : undefined) };
    const ringEve = { userId: 'eve', identity: eve, circleKey: () => undefined };
    expect(openEnvelope<{ text: string }>(env, ringA).text).toBe('halo');
    expect(openEnvelope<{ text: string }>(env, ringB).text).toBe('halo');
    expect(() => openEnvelope(env, ringEve)).toThrow();
  });
  it('cadangan kunci pulih dengan kode pemulihan', () => {
    const id = generateIdentity();
    const code = generateRecoveryCode();
    expect(code).toMatch(/^([0-9A-Z]{4}-){5}[0-9A-Z]{4}$/);
    const backup = backupIdentity(id, code);
    const restored = restoreIdentity(backup, code.toLowerCase().replace(/-/g, ' '));
    expect([...restored.publicKey]).toEqual([...id.publicKey]);
    expect(() => restoreIdentity(backup, generateRecoveryCode())).toThrow();
  });
  it('bundel undangan & kode keamanan', () => {
    const { secret, fragment } = createInviteSecret();
    const sealed = sealInviteBundle(secret, { circleId: 'c', keys: [{ epoch: 1, key: 'k' }] });
    expect(openInviteBundle(fragment, sealed).keys[0]!.key).toBe('k');
    const a = generateIdentity().publicKey;
    const b = generateIdentity().publicKey;
    expect(safetyCode(a, b)).toBe(safetyCode(b, a));
  });
});

describe('streak', () => {
  const m = (id: string, sealed: string[], frozen: string[] = []): StreakMember => ({
    userId: id,
    joinedDay: '2026-10-01',
    sealed: new Set(sealed),
    frozen: new Set(frozen),
  });
  it('duo butuh keduanya; pembeku menutup satu hari', () => {
    const days = ['2026-10-18', '2026-10-19', '2026-10-20', '2026-10-21'];
    const a = m('a', days);
    const b = m('b', ['2026-10-18', '2026-10-20', '2026-10-21'], ['2026-10-19']);
    const s = streakSummary([a, b], 'duo', '2026-10-22');
    expect(s.current).toBe(4);
    expect(s.pendingToday).toBe(true);
  });
  it('lingkaran: satu orang bolos hanya meredupkan', () => {
    const d = '2026-10-22';
    const cov = coverageOn(d, [m('a', [d]), m('b', [d]), m('c', [])], 'circle');
    expect(cov.counts).toBe(true);
    const s = streakSummary([m('a', [d]), m('b', [d]), m('c', [])], 'circle', d);
    expect(s.flame).toBe('dim');
  });
});

describe('ritual', () => {
  it('deterministik dan sama untuk semua anggota', () => {
    expect(nightQuestionFor('c1', '2026-10-22', 'duo').id).toBe(nightQuestionFor('c1', '2026-10-22', 'duo').id);
    expect(nightQuestionFor('c1', '2026-10-22', 'duo').id).not.toBe(nightQuestionFor('c1', '2026-10-23', 'duo').id);
    expect(penHolderFor(['a', 'b', 'c'], '2026-W43', 'c1')).toBe(penHolderFor(['a', 'b', 'c'], '2026-W43', 'c1'));
    const holders = new Set(['2026-W43', '2026-W44', '2026-W45'].map((w) => penHolderFor(['a', 'b', 'c'], w, 'c1')));
    expect(holders.size).toBe(3);
  });
  it('kartu langka di 17 Agustus & malam tahun baru', () => {
    expect(rareTriggersFor('2026-08-17')).toContain('tujuh_belas');
    const draw = dailyCardFor({ userId: 'u', day: '2026-12-31', kind: 'duo' });
    expect(draw.rare).toBe(true);
    expect(draw.card.rare).toBe('malam_tahun_baru');
    expect(DECKS.find((d) => d.id === 'dasar')).toBeTruthy();
  });
});

describe('wrap', () => {
  it('menyusun Minggu Kita & versi publik tanpa isi', () => {
    const drops: WrapDrop[] = ['2026-10-19', '2026-10-20', '2026-10-21'].flatMap((day, i) => [
      { id: `a${i}`, authorId: 'a', day, kind: 'text', payload: { v: 1, kind: 'text', text: 'kopi pagi di kos rahasia sekali', mood: 'hangat', hour: 8, minute: 0, tz: 'Asia/Jakarta', song: { title: 'Sial', artist: 'Mahalini', url: 'x', provider: 'spotify' } }, reactions: [{ kind: 'hug', userId: 'b' }] },
      { id: `b${i}`, authorId: 'b', day, kind: 'mood', payload: { v: 1, kind: 'mood', mood: 'rindu', hour: 21, minute: 0, tz: 'Asia/Makassar' }, reactions: [] },
    ]);
    const wrap = buildWrap({
      scope: 'week',
      period: '2026-W43',
      circle: { id: 'c1', kind: 'duo' },
      members: [{ userId: 'a', name: 'Raka' }, { userId: 'b', name: 'Naya' }],
      drops,
      seals: { a: ['2026-10-19', '2026-10-20', '2026-10-21'], b: ['2026-10-19', '2026-10-21'] },
    });
    expect(wrap.title).toBe('Minggu Kita');
    expect(wrap.cards.some((c) => c.type === 'song')).toBe(true);
    expect(wrap.cards.some((c) => c.type === 'moment')).toBe(true);
    expect(wrap.public.sealedDays).toBe(3);
    expect(JSON.stringify(wrap.public)).not.toContain('kopi');
  });
  it('kamus lingkaran hanya kata yang dipakai bersama', () => {
    const t = (a: string, d: string, text: string) => ({ authorId: a, day: d, text });
    const c = dictionaryCandidates([
      t('a', '2026-10-01', 'gaskeun mantul'),
      t('b', '2026-10-02', 'gaskeun dong'),
      t('a', '2026-10-03', 'ayo gaskeun'),
      t('a', '2026-10-04', 'mantul'),
    ]);
    expect(c.map((x) => x.word)).toEqual(['gaskeun']);
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
  });
});
