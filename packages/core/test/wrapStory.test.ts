import { describe, expect, it } from 'vitest';
import { buildWrapStory, hourNickname, type WrapDrop } from '../src';

const drop = (id: string, authorId: string, day: string, hour: number, minute: number, extra: Partial<WrapDrop['payload']> = {}, reactions: WrapDrop['reactions'] = [], kind: WrapDrop['kind'] = 'text'): WrapDrop => ({
  id,
  authorId,
  day,
  kind,
  reactions,
  payload: { v: 1, kind, hour, minute, tz: 'Asia/Jakarta', ...extra } as WrapDrop['payload'],
});

const members = [
  { userId: 'j', name: 'Juan' },
  { userId: 'r', name: 'Raya' },
];

describe('wrapped cerita', () => {
  const drops = [
    drop('j1', 'j', '2026-10-26', 21, 47, { text: 'hujan lagi, kangen teh hangat di warung dekat kos', mood: 'tenang' }, [{ kind: 'hug', userId: 'r' }]),
    drop('r1', 'r', '2026-10-26', 21, 52, { text: 'kangen juga. hujan bikin semua orang pelan', mood: 'hangat' }, [{ kind: 'hug', userId: 'j' }, { kind: 'here', userId: 'j' }]),
    drop('r2', 'r', '2026-10-28', 23, 10, { text: 'malam ini bintangnya sedikit tapi cukup', mood: 'tenang' }),
    drop('j2', 'j', '2026-10-30', 7, 5, { media: [{ id: 'm1', key: 'k', mime: 'image/jpeg' }] as never }, [], 'photo'),
    drop('r3', 'r', '2026-11-01', 22, 30, { text: 'minggu yang pelan dan baik', song: { title: 'Sial', artist: 'Mahalini', url: 'x', provider: 'spotify' } }),
  ];
  const story = buildWrapStory({
    scope: 'week',
    period: '2026-W44',
    circle: { id: 'c', kind: 'duo' },
    members,
    drops,
    seals: { j: ['2026-10-26', '2026-10-30'], r: ['2026-10-26', '2026-10-28', '2026-11-01'] },
    viewerId: 'j',
  });
  const scene = <T extends string>(t: T) => story.scenes.find((s) => s.type === t) as Extract<(typeof story.scenes)[number], { type: T }> | undefined;

  it('pembuka, angka, dan hari demi hari', () => {
    expect(story.scenes[0]!.type).toBe('opening');
    expect(scene('opening')!.names).toEqual(['Juan', 'Raya']);
    const t = scene('tally')!;
    expect(t.items.find((x) => x.label === 'hal kecil dititipkan')!.value).toBe(5);
    expect(t.items.find((x) => x.label === 'pelukan dikirim')!.value).toBe(3);
    const d = scene('days')!;
    expect(d.days).toHaveLength(7);
    expect(d.days[0]!.top).toBe('sen');
    expect(d.busiest).toBe('2026-10-26');
  });

  it('jam & momen sinkron', () => {
    const c = scene('clock')!;
    expect(c.sync).toMatchObject({ day: '2026-10-26', gap: 5 });
    expect(c.perMember.find((m) => m.userId === 'r')!.nickname).toBe('si pencerita malam');
    expect(hourNickname(23)).toBe('si burung malam');
    expect(hourNickname(7)).toBe('si penyapa pagi');
  });

  it('kata bersama, kutipan, pelukan, lagu, foto', () => {
    expect(scene('words')!.shared.map((w) => w.word)).toEqual(expect.arrayContaining(['hujan', 'kangen']));
    expect(scene('quotes')!.items.map((q) => q.userId)).toEqual(['j', 'r']);
    expect(scene('hugs')!.pairs[0]).toEqual({ from: 'j', to: 'r', count: 2 });
    expect(scene('songs')!.songs[0]!.title).toBe('Sial');
    expect(scene('photos')!.total).toBe(1);
    expect(scene('bookends')!.first.userId).toBe('j');
  });

  it('surat penutup untuk orang yang diajak, dari sudut pandang pembaca', () => {
    const l = scene('letter')!;
    expect(l.to).toBe('Untuk Raya,');
    expect(l.signoff).toBe('— Juan');
    const all = l.paragraphs.join(' ');
    expect(all).toContain('5 menit berselang');
    expect(all).toContain('Kamu memeluk tulisanku 1 kali, aku memeluk tulisanmu 2 kali');
    expect(all).toMatch(/“(hujan|kangen)”/);
  });

  it('minggu tanpa isi tetap punya cerita yang lembut', () => {
    const q = buildWrapStory({ scope: 'week', period: '2026-W44', circle: { id: 'c', kind: 'duo' }, members, drops: [], seals: {} });
    expect(q.scenes.map((s) => s.type)).toEqual(['opening', 'quiet']);
  });
});
