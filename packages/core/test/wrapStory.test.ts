import { describe, expect, it } from 'vitest';
import { awardsScene, buildWrapStory, hourNickname, type WrapDrop } from '../src';

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

  it('kamu minggu ini: persona & angka milik pembaca', () => {
    const y = scene('you')!;
    expect(y.userId).toBe('j');
    expect(y.persona).toMatch(/^(Penulis|Fotografer|Pencerita|DJ|Pembaca Cuaca) /);
    expect(y.stats[0]).toEqual({ value: 2, label: 'hal kecil darimu' });
    expect(story.scenes[1]!.type).toBe('you');
  });

  it('penghargaan: setiap anggota dapat satu, tidak dobel', () => {
    const a = scene('awards')!;
    expect(a.items.map((x) => x.userId).sort()).toEqual(['j', 'r']);
    expect(new Set(a.items.map((x) => x.title)).size).toBe(2);
  });

  it('tebak siapa: kalimat dari lebih dari satu orang, jawaban ada di pilihan', () => {
    const g = scene('guess')!;
    expect(g.rounds.length).toBeGreaterThanOrEqual(2);
    for (const r of g.rounds) expect(r.options).toContain(r.answerId);
    expect(new Set(g.rounds.map((r) => r.answerId)).size).toBe(2);
  });

  it('untuk berikutnya: kirim surat ke satu-satunya teman & simpan kata bersama', () => {
    const n = scene('next')!;
    expect(n.items[0]).toMatchObject({ action: 'letter', cta: 'kirim ke Raya' });
    expect(n.items.some((i) => i.action === 'kamus')).toBe(true);
    expect(scene('letter')!.toUserIds).toEqual(['r']);
  });

  it('penghargaan tidak dobel meski semua seri', () => {
    const ppl = [{ userId: 'a' }, { userId: 'b' }, { userId: 'c' }, { userId: 'd' }];
    const ds = ['a', 'b', 'c'].map((u) => drop(`${u}1`, u, '2026-10-26', 12, 0, { text: 'halo semua apa kabar' }));
    const a = awardsScene(ppl, ds, {})!;
    expect(a.items).toHaveLength(4);
    expect(new Set(a.items.map((x) => x.title)).size).toBe(4);
    expect(a.items.find((x) => x.userId === 'd')!.title).toBe('Penonton Setia');
  });

  it('rol, dibanding minggu lalu, wajah-wajah, tanaman, dan kilasan', () => {
    const media = { id: 'm', key: 'k', mime: 'image/jpeg' } as never;
    const snap = { ...drop('s1', 'r', '2026-10-27', 12, 0, { media: [media], text: 'kopi' }, [], 'photo'), flash: 'snap' as const, faces: [{ userId: 'j', expression: 'ketawa' as const, media }] };
    const kangen = { ...drop('k1', 'j', '2026-10-27', 13, 0, { sticker: 'hati-dua' }, [], 'sticker'), flash: 'kangen' as const };
    const st = buildWrapStory({
      scope: 'week',
      period: '2026-W44',
      circle: { id: 'c', kind: 'duo' },
      members,
      drops: [...drops, snap, kangen],
      seals: { j: ['2026-10-26'], r: ['2026-10-26'] },
      viewerId: 'j',
      today: '2026-11-01',
      createdDay: '2026-10-01',
      streak: { current: 1, longest: 3, togetherDays: 8, today: { day: '2026-11-01', active: 2, sealed: 0, frozen: 0, fraction: 0, counts: false }, pendingToday: false, flame: 'warm', warmth: 0.6, reached: [] },
      rolls: [{ userId: 'r', dropIds: ['s1', 'j2'] }],
      sceneTitle: 'Minggu Hujan',
      previous: { drops: [drop('p1', 'j', '2026-10-20', 9, 0, { text: 'minggu lalu sepi' })] },
    });
    const get = <T extends string>(t: T) => st.scenes.find((x) => x.type === t) as Extract<(typeof st.scenes)[number], { type: T }> | undefined;
    const roll = get('roll')!;
    expect(roll.title).toBe('Minggu Hujan');
    expect(roll.items.map((x) => x.userId)).toEqual(['r']);
    expect(roll.items[0]!.shots.map((x) => [x.dropId, x.caption])).toEqual([['s1', 'kopi'], ['j2', undefined]]);
    expect(get('photos')).toBeUndefined();
    expect(get('compare')!.headline).toMatch(/lebih ramai dari minggu lalu/);
    expect(get('faces')!.top).toEqual({ expression: 'ketawa', count: 1 });
    expect(get('plant')!.state.stage.key).toBe('kuncup');
    const t = get('tally')!.items;
    expect(t.find((x) => x.label === 'kilasan dikirim')!.value).toBe(1);
    expect(t.find((x) => x.label === 'kali saling kangen')!.value).toBe(1);
    expect(get('letter')!.paragraphs.join(' ')).toContain('mengirim “kangen”');
  });
});
