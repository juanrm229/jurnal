/**
 * Mengisi server pengembangan dengan dua orang (Raka & Naya) dalam satu Duo
 * dan satu Lingkaran, lengkap dengan Drop & segel hari ini. Mencetak cara
 * "masuk" di browser (Expo web) dengan menyetel localStorage.
 *
 *   npx tsx apps/server/scripts/seed.ts [http://localhost:8787]
 */
import {
  backupIdentity,
  createInviteSecret,
  encryptText,
  fromBase64,
  generateIdentity,
  generateRecoveryCode,
  inviteProof,
  newSymmetricKey,
  openInviteBundle,
  sealEnvelope,
  sealInviteBundle,
  sealTo,
  todayIn,
  toBase64,
  type Identity,
  type RecipientSpec,
} from '@sehari/core';

const BASE = (process.argv[2] ?? 'http://localhost:8787').replace(/\/$/, '');
const tag = Date.now().toString(36);

async function call<T = any>(token: string | null, method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE}/v1${path}`, {
    method,
    headers: { ...(token ? { authorization: `Bearer ${token}` } : {}), ...(body ? { 'content-type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const j = await res.json().catch(() => null);
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status} ${JSON.stringify(j)}`);
  return j as T;
}

interface Person {
  name: string;
  email: string;
  token: string;
  id: string;
  identity: Identity;
  code: string;
  tz: string;
}

async function person(name: string, tz: string, cityId: string, doodle: string): Promise<Person> {
  const email = `${name.toLowerCase()}+${tag}@contoh.id`;
  const { devCode } = await call(null, 'POST', '/auth/request-code', { email });
  const auth = await call(null, 'POST', '/auth/verify', { email, code: devCode, deviceName: 'seed', platform: 'web' });
  const identity = generateIdentity();
  const code = generateRecoveryCode();
  await call(auth.token, 'PATCH', '/me', { penName: name, birthYear: 1997, tz, cityId, homeCityId: cityId, doodle, settings: { autoWeather: true } });
  await call(auth.token, 'PUT', '/me/keys', { publicKey: toBase64(identity.publicKey), keyBackup: backupIdentity(identity, code) });
  return { name, email, token: auth.token, id: auth.user.id, identity, code, tz };
}

async function circle(owner: Person, kind: string, name: string, doodle: string) {
  const key = newSymmetricKey();
  const c = await call(owner.token, 'POST', '/circles', { kind, nameEnc: `e1:${encryptText(key, name)}`, doodle, keyEnvelope: toBase64(sealTo(owner.identity.publicKey, key)) });
  return { id: c.id as string, key };
}

async function join(owner: Person, guest: Person, c: { id: string; key: Uint8Array }) {
  const { secret, fragment } = createInviteSecret();
  const { token } = await call(owner.token, 'POST', `/circles/${c.id}/invites`, {
    bundle: sealInviteBundle(secret, { circleId: c.id, keys: [{ epoch: 1, key: toBase64(c.key) }] }),
    proof: inviteProof(fragment),
    maxUses: 5,
  });
  const res = await call(guest.token, 'POST', `/invites/${token}/accept`, { proof: inviteProof(fragment) });
  const bundle = openInviteBundle(fragment, res.bundle);
  await call(guest.token, 'PUT', `/circles/${c.id}/keys`, {
    envelopes: bundle.keys.map((k) => ({ epoch: k.epoch, userId: guest.id, wk: toBase64(sealTo(guest.identity.publicKey, fromBase64(k.key))) })),
  });
}

async function drop(p: Person, circles: { id: string; key: Uint8Array }[], payload: Record<string, unknown>) {
  const day = todayIn(p.tz, new Date(), true);
  const recips: RecipientSpec[] = [{ t: 'user', userId: p.id, publicKey: p.identity.publicKey }, ...circles.map((c) => ({ t: 'circle' as const, circleId: c.id, epoch: 1, key: c.key }))];
  const env = sealEnvelope({ v: 1, tz: p.tz, ...payload }, recips);
  await call(p.token, 'POST', '/drops', {
    id: `seed${Math.random().toString(36).slice(2, 12)}${Date.now().toString(36)}`,
    day,
    kind: payload.kind,
    audience: circles.length ? 'circle' : 'self',
    circleIds: circles.map((c) => c.id),
    envelope: { ciphertext: env.ciphertext, recipients: env.recipients },
  });
  return day;
}

const raka = await person('Raka', 'Asia/Jakarta', 'yogyakarta', 'kaktus');
const naya = await person('Naya', 'Asia/Makassar', 'balikpapan', 'bunga-matahari');
const sari = await person('Sari', 'Asia/Jakarta', 'bandung', 'kucing');
const duo = await circle(raka, 'duo', 'Raka & Naya', 'ui-peluk');
await join(raka, naya, duo);
const kos = await circle(naya, 'circle', 'Anak Kos Gang 3', 'rumah');
await join(naya, raka, kos);
await join(naya, sari, kos);

await drop(raka, [duo], { kind: 'text', text: 'kopi pagi di balkon, langit Jogja abu-abu tapi hangat', mood: 'hangat', hour: 7, minute: 40, cityId: 'yogyakarta', weather: { code: 'berawan', tempC: 27, label: 'berawan' } });
await drop(raka, [duo, kos], { kind: 'song', song: { title: 'Sial', artist: 'Mahalini', url: 'https://open.spotify.com/track/0', provider: 'spotify' }, text: 'lagu di angkot', hour: 12, minute: 5, cityId: 'yogyakarta' });
await drop(naya, [duo], { kind: 'text', text: 'hujan sore di Balikpapan, batal ke pantai, jadinya nonton film', mood: 'rindu', hour: 16, minute: 20, cityId: 'balikpapan', weather: { code: 'hujan', tempC: 25, label: 'hujan' }, tags: ['hujan'] });
await drop(naya, [kos], { kind: 'word', text: 'gaskeun', hour: 19, minute: 0, cityId: 'balikpapan' });
await drop(sari, [kos], { kind: 'mood', mood: 'lelah', hour: 21, minute: 10, cityId: 'bandung' });
const day = await drop(naya, [duo, kos], { kind: 'last_line', text: 'hari ini pelan, tapi cukup', mood: 'tenang', hour: 21, minute: 30, cityId: 'balikpapan' });
await call(naya.token, 'POST', `/days/${day}/seal`, { tz: naya.tz });

const out = (p: Person) => ({
  name: p.name,
  email: p.email,
  recoveryCode: p.code,
  localStorage: { 'sehari.secure.token': p.token, [`sehari.secure.identity_${p.id}`]: toBase64(p.identity.secretKey) },
});
console.log(JSON.stringify({ duoId: duo.id, circleId: kos.id, users: [out(raka), out(naya), out(sari)] }, null, 2));
