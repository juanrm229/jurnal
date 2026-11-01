import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { runJobs } from '../src/jobs/scheduler';
import { Client, setup } from './helpers';

let env: Awaited<ReturnType<typeof setup>>;
let raka: Client;
let naya: Client;
let duo: string;

beforeAll(async () => {
  env = await setup('2026-10-22T05:00:00Z');
  raka = await new Client(env.app, 'raka-d@contoh.id').signup('Raka');
  naya = await new Client(env.app, 'naya-d@contoh.id').signup('Naya');
  duo = (await raka.createCircle('duo', 'Raka & Naya')).id;
  await naya.accept(await raka.invite(duo));
  await naya.ok('PATCH', '/v1/me', { birthday: '10-24' });
});
afterAll(async () => env.services.close());

describe('tanggal penting', () => {
  it('tambah, lihat (judul tetap terenkripsi), hapus', async () => {
    const r = await raka.req('POST', `/v1/circles/${duo}/dates`, { titleEnc: 'e1:rahasia', month: 10, day: 29, year: 2024 });
    expect(r.status).toBe(201);
    expect((await raka.req('POST', `/v1/circles/${duo}/dates`, { titleEnc: 'e1:x', month: 2, day: 30 })).status).toBe(400);
    const list = await naya.ok('GET', `/v1/circles/${duo}/dates`);
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ titleEnc: 'e1:rahasia', month: 10, day: 29, year: 2024 });
    const tmp = await naya.ok('POST', `/v1/circles/${duo}/dates`, { titleEnc: 'e1:y', month: 1, day: 1 });
    await naya.ok('DELETE', `/v1/circles/${duo}/dates/${tmp.id}`);
    expect(await raka.ok('GET', `/v1/circles/${duo}/dates`)).toHaveLength(1);
  });

  it('pengingat H-7 untuk tanggal sendiri & H-1 ulang tahun teman (bukan untuk yang berulang tahun)', async () => {
    env.setNow('2026-10-22T02:00:00Z'); // 09.00 WIB, 22 Okt: 29 Okt = H-7
    await runJobs(env.services);
    const d = env.pusher.sent.filter((m) => m.data?.type === 'dates' && m.body.includes('7 hari lagi'));
    expect(d.map((m) => m.to).sort()).toHaveLength(2);
    expect(d[0]!.body).not.toContain('rahasia');
    env.setNow('2026-10-23T02:00:00Z'); // 23 Okt: besok ulang tahun Naya
    await runJobs(env.services);
    const b = env.pusher.sent.filter((m) => m.data?.type === 'dates' && m.body.includes('ulang tahun Naya'));
    expect(b).toHaveLength(1);
    expect(b[0]!.to).toContain('raka-d');
    await runJobs(env.services);
    expect(env.pusher.sent.filter((m) => m.data?.type === 'dates' && m.body.includes('ulang tahun Naya'))).toHaveLength(1);
  });
});
