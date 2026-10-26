import { type RecipientSpec, sealEnvelope } from '@sehari/core';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Client, id, setup } from './helpers';

let env: Awaited<ReturnType<typeof setup>>;
let raka: Client;
let naya: Client;
let sari: Client;
const DAY = '2026-10-22';

beforeAll(async () => {
  env = await setup('2026-10-22T05:00:00Z');
  raka = await new Client(env.app, 'raka@contoh.id').signup('Raka');
  naya = await new Client(env.app, 'naya@contoh.id').signup('Naya');
  sari = await new Client(env.app, 'sari@contoh.id').signup('Sari');
});
afterAll(async () => env.services.close());

describe('lebih dari satu duo', () => {
  it('satu halaman dibagikan ke dua duo sekaligus, dan keduanya bisa membukanya', async () => {
    const d1 = await raka.createCircle('duo', 'Raka & Naya');
    await naya.accept(await raka.invite(d1.id));
    const d2 = await raka.createCircle('duo', 'Raka & Sari');
    await sari.accept(await raka.invite(d2.id));
    // Halaman Raka untuk kedua duo, disegel untuk dua kunci lingkaran.
    const recips: RecipientSpec[] = [{ t: 'user', userId: raka.userId, publicKey: raka.identity.publicKey }];
    for (const c of [d1.id, d2.id]) recips.push({ t: 'circle', circleId: c, epoch: 1, key: raka.circleKeys.get(c)!.get(1)! });
    const env1 = sealEnvelope({ v: 1, kind: 'text', hour: 9, minute: 0, tz: raka.tz, text: 'untuk kalian berdua' }, recips);
    const drop = await raka.req('POST', '/v1/drops', { id: id(), day: DAY, kind: 'text', audience: 'circle', circleIds: [d1.id, d2.id], envelope: { ciphertext: env1.ciphertext, recipients: env1.recipients } });
    expect(drop.status).toBe(201);
    await raka.ok('POST', `/v1/days/${DAY}/seal`, { tz: raka.tz });
    for (const [who, c] of [[naya, d1.id], [sari, d2.id]] as const) {
      await who.ok('POST', '/v1/drops', who.dropBody(DAY, { text: `halo dari ${who === naya ? 'naya' : 'sari'}` }, { circleId: c }));
      await who.ok('POST', `/v1/days/${DAY}/seal`, { tz: who.tz });
      const v = await who.ok('GET', `/v1/circles/${c}/days/${DAY}`);
      const rakas = v.drops.filter((x: any) => x.authorId === raka.userId);
      expect(rakas, `drop Raka di ${who === naya ? 'duo Naya' : 'duo Sari'}`).toHaveLength(1);
      expect(who.open(rakas[0]).text).toBe('untuk kalian berdua');
    }
  });
});

describe('halaman terpisah per lingkaran', () => {
  it('Duo sahabat punya halaman sendiri: tidak melihat halaman utama, disegel terpisah', async () => {
    const DAY2 = '2026-10-22';
    const ana = await new Client(env.app, 'ana@contoh.id').signup('Ana');
    const pacar = await new Client(env.app, 'pacar@contoh.id').signup('Pacar');
    const teman = await new Client(env.app, 'teman@contoh.id').signup('Teman');
    const d1 = await ana.createCircle('duo', 'Ana & Pacar');
    await pacar.accept(await ana.invite(d1.id));
    const d2 = await ana.createCircle('duo', 'Ana & Teman');
    await teman.accept(await ana.invite(d2.id));
    await ana.ok('PUT', `/v1/circles/${d2.id}/own-page`, { ownPage: true });

    // Halaman utama tidak boleh menjangkau duo yang punya halaman sendiri.
    const recips: RecipientSpec[] = [{ t: 'user', userId: ana.userId, publicKey: ana.identity.publicKey }];
    for (const c of [d1.id, d2.id]) recips.push({ t: 'circle', circleId: c, epoch: 1, key: ana.circleKeys.get(c)!.get(1)! });
    const both = sealEnvelope({ v: 1, kind: 'text', hour: 9, minute: 0, tz: ana.tz, text: 'rahasia' }, recips);
    const bad = await ana.req('POST', '/v1/drops', { id: id(), day: DAY2, kind: 'text', audience: 'circle', circleIds: [d1.id, d2.id], envelope: { ciphertext: both.ciphertext, recipients: both.recipients } });
    expect(bad.status).toBe(409);

    await ana.ok('POST', '/v1/drops', ana.dropBody(DAY2, { text: 'cerita memalukan untuk pacar' }, { circleId: d1.id }));
    const page2 = { ...ana.dropBody(DAY2, { text: 'cerita untuk teman' }, { circleId: d2.id }), pageCircleId: d2.id };
    await ana.ok('POST', '/v1/drops', page2);

    // Segel halaman utama: duo teman belum tersegel, halamannya masih bisa ditulis.
    await ana.ok('POST', `/v1/days/${DAY2}/seal`, { tz: ana.tz });
    let my = await ana.ok('GET', `/v1/days/${DAY2}`);
    expect(my.sealedCircles).toEqual([d1.id]);
    await ana.ok('POST', '/v1/drops', { ...ana.dropBody(DAY2, { text: 'tambahan untuk teman' }, { circleId: d2.id }), pageCircleId: d2.id });

    // Teman belum bisa melihat apa pun sebelum ia sendiri menyegel, dan Ana belum menyegel untuknya.
    await teman.ok('POST', '/v1/drops', teman.dropBody(DAY2, { text: 'halo ana' }, { circleId: d2.id }));
    await teman.ok('POST', `/v1/days/${DAY2}/seal`, { tz: teman.tz });
    let v = await teman.ok('GET', `/v1/circles/${d2.id}/days/${DAY2}`);
    expect(v.members.find((m: any) => m.userId === ana.userId).sealed).toBe(false);

    // Segel halaman teman.
    await ana.ok('POST', `/v1/days/${DAY2}/seal`, { tz: ana.tz, circleId: d2.id });
    my = await ana.ok('GET', `/v1/days/${DAY2}`);
    expect(my.sealedCircles.sort()).toEqual([d1.id, d2.id].sort());
    const late = await ana.req('POST', '/v1/drops', { ...ana.dropBody(DAY2, { text: 'telat' }, { circleId: d2.id }), pageCircleId: d2.id });
    expect(late.status).toBe(409);

    v = await teman.ok('GET', `/v1/circles/${d2.id}/days/${DAY2}`);
    const texts = v.drops.filter((x: any) => x.authorId === ana.userId).map((x: any) => teman.open(x).text);
    expect(texts.sort()).toEqual(['cerita untuk teman', 'tambahan untuk teman']);
    expect(v.members.find((m: any) => m.userId === ana.userId).sealed).toBe(true);

    // Pacar hanya melihat halaman utama.
    await pacar.ok('POST', '/v1/drops', pacar.dropBody(DAY2, { text: 'hai' }, { circleId: d1.id }));
    await pacar.ok('POST', `/v1/days/${DAY2}/seal`, { tz: pacar.tz });
    const p = await pacar.ok('GET', `/v1/circles/${d1.id}/days/${DAY2}`);
    expect(p.drops.filter((x: any) => x.authorId === ana.userId).map((x: any) => pacar.open(x).text)).toEqual(['cerita memalukan untuk pacar']);
  });

  it('Duo yang dibuat setelah menyegel mendapat halaman susulan', async () => {
    const DAY3 = '2026-10-22';
    const budi = await new Client(env.app, 'budi@contoh.id').signup('Budi');
    const cici = await new Client(env.app, 'cici@contoh.id').signup('Cici');
    const dodi = await new Client(env.app, 'dodi@contoh.id').signup('Dodi');
    const d1 = await budi.createCircle('duo', 'Budi & Cici');
    await cici.accept(await budi.invite(d1.id));
    await budi.ok('POST', '/v1/drops', budi.dropBody(DAY3, { text: 'pagi' }, { circleId: d1.id }));
    await budi.ok('POST', `/v1/days/${DAY3}/seal`, { tz: budi.tz });
    const d2 = await budi.createCircle('duo', 'Budi & Dodi');
    await dodi.accept(await budi.invite(d2.id));
    expect((await budi.ok('GET', `/v1/days/${DAY3}`)).sealedCircles).toEqual([d1.id]);
    await budi.ok('POST', '/v1/drops', { ...budi.dropBody(DAY3, { text: 'halaman susulan' }, { circleId: d2.id }), pageCircleId: d2.id });
    await budi.ok('POST', `/v1/days/${DAY3}/seal`, { tz: budi.tz, circleId: d2.id });
    await dodi.ok('POST', '/v1/drops', dodi.dropBody(DAY3, { text: 'yo' }, { circleId: d2.id }));
    await dodi.ok('POST', `/v1/days/${DAY3}/seal`, { tz: dodi.tz });
    const v = await dodi.ok('GET', `/v1/circles/${d2.id}/days/${DAY3}`);
    expect(v.drops.filter((x: any) => x.authorId === budi.userId).map((x: any) => dodi.open(x).text)).toEqual(['halaman susulan']);
  });
});

describe('halaman susulan untuk hari terlewat', () => {
  it('hari yang terlewat (≤7 hari) masih bisa ditulis & disegel, lalu halaman pasangan terbuka', async () => {
    const FRI = '2026-10-19';
    const eka = await new Client(env.app, 'eka@contoh.id').signup('Eka');
    const fajar = await new Client(env.app, 'fajar@contoh.id').signup('Fajar');
    const d = await eka.createCircle('duo', 'Eka & Fajar');
    await fajar.accept(await eka.invite(d.id));
    await fajar.ok('POST', '/v1/drops', fajar.dropBody(FRI, { text: 'jumat kemarin hujan' }, { circleId: d.id }));
    await fajar.ok('POST', `/v1/days/${FRI}/seal`, { tz: fajar.tz });
    let v = await eka.ok('GET', `/v1/circles/${d.id}/days/${FRI}`);
    expect(v.drops.filter((x: any) => x.authorId === fajar.userId)).toHaveLength(0);
    await eka.ok('POST', '/v1/drops', eka.dropBody(FRI, { text: 'susulan jumat' }, { circleId: d.id }));
    await eka.ok('POST', `/v1/days/${FRI}/seal`, { tz: eka.tz });
    v = await eka.ok('GET', `/v1/circles/${d.id}/days/${FRI}`);
    expect(v.drops.filter((x: any) => x.authorId === fajar.userId).map((x: any) => eka.open(x).text)).toEqual(['jumat kemarin hujan']);
    // Lebih dari 7 hari: tertutup.
    const old = await eka.req('POST', '/v1/drops', eka.dropBody('2026-10-10', { text: 'terlalu lama' }, { circleId: d.id }));
    expect(old.status).toBe(400);
  });
});
