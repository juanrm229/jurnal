import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Client, id, setup } from './helpers';

let env: Awaited<ReturnType<typeof setup>>;
let raka: Client;
let naya: Client;
let duo: string;
const DAY = '2026-10-22';
const kabar = (type: string, untuk: string) => env.pusher.sent.filter((m) => m.data?.type === type && m.to.includes(untuk));

beforeAll(async () => {
  env = await setup('2026-10-22T05:00:00Z');
  raka = await new Client(env.app, 'raka-n@contoh.id').signup('Raka');
  naya = await new Client(env.app, 'naya-n@contoh.id').signup('Naya');
  duo = (await raka.createCircle('duo', 'Raka & Naya')).id;
  await naya.accept(await raka.invite(duo));
});
afterAll(async () => env.services.close());

describe('notifikasi aktivitas teman', () => {
  it('token web push diterima tanpa kolom platform (PWA)', async () => {
    const c = await new Client(env.app, 'web-n@contoh.id').signup('Web');
    const r = await c.req('POST', '/v1/me/push-token', { token: 'webpush:{"endpoint":"https://x"}' });
    expect(r.status).toBe(200);
  });

  it('teman mulai menulis: dikabari sekali per hari, tidak setiap tulisan', async () => {
    await raka.ok('POST', '/v1/drops', raka.dropBody(DAY, { text: 'pagi' }, { circleId: duo }));
    await raka.ok('POST', '/v1/drops', raka.dropBody(DAY, { text: 'siang' }, { circleId: duo }));
    const k = kabar('drop_new', 'naya-n');
    expect(k).toHaveLength(1);
    expect(k[0]!.body).toContain('Raka');
    expect(k[0]!.data).toMatchObject({ circleId: duo, day: DAY });
    // Tulisan "hanya aku" tidak mengabari siapa pun.
    await naya.ok('POST', '/v1/drops', naya.dropBody(DAY, { text: 'rahasia' }));
    expect(kabar('drop_new', 'raka-n')).toHaveLength(0);
  });

  it('reaksi & catatan kaki di halamanmu', async () => {
    await naya.ok('POST', `/v1/days/${DAY}/seal`, { tz: naya.tz, lastLine: naya.dropBody(DAY, { kind: 'last_line', text: 'reda', mood: 'rindu' }, { circleId: duo }) });
    await raka.ok('POST', `/v1/days/${DAY}/seal`, { tz: raka.tz });
    const v = await naya.ok('GET', `/v1/circles/${duo}/days/${DAY}`);
    const d = v.drops.find((x: any) => x.authorId === raka.userId);
    await naya.ok('PUT', `/v1/drops/${d.id}/reactions/hug`);
    await naya.ok('PUT', `/v1/drops/${d.id}/reactions/hug`);
    expect(kabar('reaction', 'raka-n')).toHaveLength(1);
    expect(kabar('reaction', 'raka-n')[0]!.body).toContain('Naya');
    const env1 = naya.dropBody(DAY, { text: 'catatan kecil' }, { circleId: duo }).envelope;
    await naya.ok('POST', `/v1/drops/${d.id}/footnotes`, { id: id(), envelope: env1 });
    expect(kabar('footnote', 'raka-n')).toHaveLength(1);
    // Raka membalas di halamannya sendiri: Naya (yang ikut berkomentar) dikabari.
    const env2 = raka.dropBody(DAY, { text: 'balasan' }, { circleId: duo }).envelope;
    await raka.ok('POST', `/v1/drops/${d.id}/footnotes`, { id: id(), envelope: env2 });
    expect(kabar('footnote', 'naya-n')).toHaveLength(1);
  });

  it('ajak main game ke lingkaran', async () => {
    const r = await raka.ok('POST', `/v1/circles/${duo}/ajak-main`, { game: 'Saudagar', path: '/main/saudagar/ABCD' });
    expect(r.dikabari).toBe(1);
    expect(kabar('ajak', 'naya-n')[0]!.data).toMatchObject({ url: '/main/saudagar/ABCD' });
    expect((await raka.req('POST', `/v1/circles/${duo}/ajak-main`, { game: 'x', path: 'https://jahat.example' })).status).toBe(400);
  });

  it('setelan "kabar dari teman" mati: tidak dikabari', async () => {
    await naya.ok('PATCH', '/v1/me', { settings: { notifyActivity: false } });
    const n = kabar('ajak', 'naya-n').length;
    await raka.ok('POST', `/v1/circles/${duo}/ajak-main`, { game: 'Saudagar', path: '/main/saudagar/WXYZ' });
    expect(kabar('ajak', 'naya-n')).toHaveLength(n);
  });

  it('notifikasi uji ke perangkat sendiri', async () => {
    const r = await raka.ok('POST', '/v1/me/push-test', {});
    expect(r.ok).toBe(true);
    expect(kabar('test', 'raka-n')).toHaveLength(1);
  });
});
