import { describe, expect, it } from 'vitest';
import { buildWrapStory, type WrapDrop } from '../src';

const media = (id: string) => ({ id, key: 'k', mime: 'image/jpeg' }) as never;
const d = (id: string, authorId: string, day: string, extra: Partial<WrapDrop['payload']> = {}, kind: WrapDrop['kind'] = 'text', hugs = 0): WrapDrop => ({
  id,
  authorId,
  day,
  kind,
  reactions: Array.from({ length: hugs }, () => ({ kind: 'hug' as const, userId: authorId === 'j' ? 'r' : 'j' })),
  payload: { v: 1, kind, hour: 20, minute: 0, tz: 'Asia/Jakarta', ...extra } as WrapDrop['payload'],
});
const members = [
  { userId: 'j', name: 'Juan' },
  { userId: 'r', name: 'Raya' },
];

describe('bulan kita', () => {
  const drops = [
    d('a', 'j', '2026-10-02', { text: 'pagi cerah kopi senja', mood: 'cerah' }),
    d('b', 'j', '2026-10-09', { text: 'kopi senja lagi', mood: 'lelah' }),
    d('c', 'r', '2026-10-03', { text: 'senja indah sekali', mood: 'hangat' }),
    d('e', 'r', '2026-10-15', { text: 'kopi senja hujan, hujan lagi', mood: 'sedih' }),
    d('p1', 'j', '2026-10-05', { media: [media('m1')] }, 'photo', 2),
    d('p2', 'r', '2026-10-20', { media: [media('m2')], text: 'jalan sore' }, 'photo'),
    d('p3', 'r', '2026-10-22', { media: [media('m3')] }, 'photo'),
  ];
  const st = buildWrapStory({
    scope: 'month',
    period: '2026-10',
    circle: { id: 'c', kind: 'duo' },
    members,
    drops,
    seals: {},
    viewerId: 'j',
    rolls: [{ userId: 'r', dropIds: ['p3'], week: '2026-W43' }],
    previous: { drops: [d('x', 'j', '2026-09-10', { text: 'pagi cerah, berangkat kerja naik kereta, makan siang nasi padang, pulang malam' })] },
  });
  const get = <T extends string>(t: T) => st.scenes.find((x) => x.type === t) as Extract<(typeof st.scenes)[number], { type: T }> | undefined;

  it('grafik mood per orang dengan hari paling terang & paling berat', () => {
    const m = get('moodline')!;
    expect(m.days).toHaveLength(31);
    expect(m.series.map((s) => s.userId)).toEqual(['j', 'r']);
    expect(m.brightest).toBe('2026-10-02');
    expect(m.heaviest).toBe('2026-10-15');
  });

  it('minggu-minggu dalam sebulan, rol menjadi foto sampul minggunya', () => {
    const w = get('weeks')!;
    expect(w.items[0]!.start).toBe('2026-10-01');
    expect(w.items[w.items.length - 1]!.end).toBe('2026-10-31');
    expect(w.items.find((i) => i.week === '2026-W43')!.photo).toMatchObject({ id: 'm3' });
    expect(w.best).toBeDefined();
  });

  it('kata baru bulan ini & film bulan ini', () => {
    expect(get('newWords')?.words).toEqual(expect.arrayContaining(['senja', 'kopi']));
    const f = get('film')!;
    expect(f.title).toBe('Film Bulan Ini');
    expect(f.shots.map((s) => s.dropId)).toEqual(['p1', 'p2', 'p3']);
    expect(get('roll')).toBeUndefined();
  });
});

describe('tahun kita', () => {
  const drops: WrapDrop[] = [];
  const early = ['capek', 'kerja', 'lembur'];
  const late = ['pulang', 'tenang', 'rumah'];
  for (let m = 1; m <= 12; m++) {
    const day = `2026-${String(m).padStart(2, '0')}-10`;
    const words = m <= 4 ? early : m >= 9 ? late : ['biasa'];
    drops.push(d(`t${m}`, m % 2 ? 'j' : 'r', day, { text: `${words.join(' ')} ${words.join(' ')}` }, 'text', m === 6 ? 3 : 0));
    if (m % 3 === 0) drops.push(d(`f${m}`, 'j', day, { media: [media(`y${m}`)] }, 'photo'));
  }
  const st = buildWrapStory({ scope: 'year', period: '2026', circle: { id: 'c', kind: 'duo' }, members, drops, seals: {}, viewerId: 'j' });
  const get = <T extends string>(t: T) => st.scenes.find((x) => x.type === t) as Extract<(typeof st.scenes)[number], { type: T }> | undefined;

  it('montase dua belas bulan: foto & kalimat', () => {
    const m = get('montage')!;
    expect(m.months).toHaveLength(12);
    expect(m.months[2]!.photo).toMatchObject({ id: 'y3' });
    expect(m.months[5]!.line?.text).toContain('biasa');
    expect(m.months[0]!.name).toBe('januari');
  });

  it('perjalanan kata awal vs akhir tahun', () => {
    const j = get('journey')!;
    expect(j.early).toEqual(expect.arrayContaining(['capek']));
    expect(j.late).toEqual(expect.arrayContaining(['pulang']));
    expect(j.earlyLabel).toBe('januari–april');
  });

  it('film tahun ini & surat untuk tahun depan di akhir', () => {
    expect(get('film')!.shots.length).toBe(4);
    const last = st.scenes[st.scenes.length - 1]!;
    expect(last).toEqual({ type: 'futureLetter', year: 2027, openOn: '2027-12-31' });
  });
});
