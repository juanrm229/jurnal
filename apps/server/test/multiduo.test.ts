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
