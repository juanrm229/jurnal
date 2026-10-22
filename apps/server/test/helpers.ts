import {
  type CircleSummary,
  type CreateDropBody,
  createInviteSecret,
  decryptBytes,
  encryptText,
  fromBase64,
  generateIdentity,
  generateRecoveryCode,
  backupIdentity,
  type Identity,
  inviteProof,
  newSymmetricKey,
  openInviteBundle,
  openSealed,
  sealEnvelope,
  sealInviteBundle,
  sealTo,
  toBase64,
  type DropPayload,
  type RecipientSpec,
  openEnvelope,
} from '@sehari/core';
import { createApp } from '../src/app';
import type { Services } from '../src/context';
import { loadConfig } from '../src/lib/config';
import { ConsoleMailer } from '../src/lib/email';
import { MemoryPusher } from '../src/lib/push';
import { MemoryBlobStore } from '../src/lib/storage';
import { createServices } from '../src/services';

export async function setup(start = '2026-10-22T05:00:00Z') {
  let now = new Date(start);
  const cfg = { ...loadConfig({ NODE_ENV: 'test', DATA_DIR: 'memory', PUSH_DISABLED: '1', ADMIN_TOKEN: 'admin' } as NodeJS.ProcessEnv), dataDir: 'memory' };
  const pusher = new MemoryPusher();
  const services = await createServices(cfg, { now: () => now, blobs: new MemoryBlobStore(), mailer: new ConsoleMailer(), pusher });
  const app = createApp(services);
  return {
    app,
    services: services as Services & { close: () => Promise<void> },
    pusher,
    setNow: (iso: string) => (now = new Date(iso)),
    advanceDays: (n: number) => (now = new Date(now.getTime() + n * 86_400_000)),
  };
}

let uid = 0;
export const id = () => `id${Date.now().toString(36)}${(uid++).toString(36).padStart(6, '0')}`;

export class Client {
  token = '';
  userId = '';
  identity: Identity = generateIdentity();
  circleKeys = new Map<string, Map<number, Uint8Array>>();
  constructor(private app: ReturnType<typeof createApp>, public email: string, public tz = 'Asia/Jakarta') {}

  async req<T = any>(method: string, path: string, body?: unknown, raw?: Uint8Array): Promise<{ status: number; json: T }> {
    const res = await this.app.request(path, {
      method,
      headers: { ...(this.token ? { authorization: `Bearer ${this.token}` } : {}), ...(body ? { 'content-type': 'application/json' } : {}) },
      body: raw ? (raw as unknown as BodyInit) : body ? JSON.stringify(body) : undefined,
    });
    const text = await res.text();
    let json: any = text;
    try {
      json = JSON.parse(text);
    } catch {}
    return { status: res.status, json };
  }

  async ok<T = any>(method: string, path: string, body?: unknown): Promise<T> {
    const r = await this.req<T>(method, path, body);
    if (r.status >= 300) throw new Error(`${method} ${path} → ${r.status} ${JSON.stringify(r.json)}`);
    return r.json;
  }

  async signup(penName: string) {
    const { devCode } = await this.ok('POST', '/v1/auth/request-code', { email: this.email });
    const res = await this.ok('POST', '/v1/auth/verify', { email: this.email, code: devCode, deviceName: 'tes', platform: 'web' });
    this.token = res.token;
    this.userId = res.user.id;
    await this.ok('PATCH', '/v1/me', { penName, birthYear: 1998, tz: this.tz, cityId: this.tz === 'Asia/Makassar' ? 'balikpapan' : 'yogyakarta' });
    await this.ok('POST', '/v1/me/push-token', { token: `ExponentPushToken[${this.email}]`, platform: 'ios' });
    const code = generateRecoveryCode();
    await this.ok('PUT', '/v1/me/keys', { publicKey: toBase64(this.identity.publicKey), keyBackup: backupIdentity(this.identity, code) });
    return this;
  }

  ring() {
    return {
      userId: this.userId,
      identity: this.identity,
      circleKey: (c: string, e: number) => this.circleKeys.get(c)?.get(e),
    };
  }

  async createCircle(kind: 'duo' | 'circle' | 'chosen_family' | 'moment', name: string, extra: Record<string, unknown> = {}): Promise<CircleSummary> {
    const key = newSymmetricKey();
    const res = await this.req<CircleSummary>('POST', '/v1/circles', {
      kind,
      nameEnc: encryptText(key, name),
      keyEnvelope: toBase64(sealTo(this.identity.publicKey, key)),
      ...extra,
    });
    if (res.status !== 201) throw Object.assign(new Error(`create circle ${res.status}`), { res });
    this.circleKeys.set(res.json.id, new Map([[1, key]]));
    return res.json;
  }

  async invite(circleId: string, maxUses = 1) {
    const { secret, fragment } = createInviteSecret();
    const keys = [...(this.circleKeys.get(circleId) ?? new Map()).entries()].map(([epoch, k]) => ({ epoch, key: toBase64(k) }));
    const { token } = await this.ok('POST', `/v1/circles/${circleId}/invites`, { bundle: sealInviteBundle(secret, { circleId, keys }), proof: inviteProof(fragment), maxUses });
    return { token, fragment };
  }

  async accept(inv: { token: string; fragment: string }) {
    const res = await this.ok('POST', `/v1/invites/${inv.token}/accept`, { proof: inviteProof(inv.fragment) });
    const bundle = openInviteBundle(inv.fragment, res.bundle);
    const map = new Map<number, Uint8Array>();
    for (const k of bundle.keys) map.set(k.epoch, fromBase64(k.key));
    this.circleKeys.set(res.circleId, map);
    await this.ok('PUT', `/v1/circles/${res.circleId}/keys`, {
      envelopes: bundle.keys.map((k) => ({ epoch: k.epoch, userId: this.userId, wk: toBase64(sealTo(this.identity.publicKey, fromBase64(k.key))) })),
    });
    return res.circleId as string;
  }

  /** Muat ulang kunci lingkaran dari server (mis. setelah rotasi). */
  async loadKeys(circleId: string) {
    const rows: { epoch: number; wk: string }[] = await this.ok('GET', `/v1/circles/${circleId}/keys`);
    const map = new Map<number, Uint8Array>();
    for (const r of rows) map.set(r.epoch, openSealed(this.identity, fromBase64(r.wk)));
    this.circleKeys.set(circleId, map);
  }

  dropBody(day: string, payload: Partial<DropPayload>, target: { circleId?: string; epoch?: number; personId?: string; personPk?: Uint8Array; unlockOn?: string } = {}): CreateDropBody {
    const recips: RecipientSpec[] = [{ t: 'user', userId: this.userId, publicKey: this.identity.publicKey }];
    let audience: CreateDropBody['audience'] = 'self';
    if (target.personId && target.personPk) {
      recips.push({ t: 'user', userId: target.personId, publicKey: target.personPk });
      audience = 'person';
    } else if (target.circleId) {
      const epoch = target.epoch ?? Math.max(...this.circleKeys.get(target.circleId)!.keys());
      recips.push({ t: 'circle', circleId: target.circleId, epoch, key: this.circleKeys.get(target.circleId)!.get(epoch)! });
      audience = 'circle';
    }
    if (target.unlockOn) audience = 'time_capsule';
    const env = sealEnvelope({ v: 1, kind: 'text', hour: 9, minute: 0, tz: this.tz, ...payload }, recips);
    return {
      id: id(),
      day,
      kind: (payload.kind ?? 'text') as CreateDropBody['kind'],
      audience,
      circleIds: target.circleId ? [target.circleId] : [],
      personId: target.personId,
      unlockOn: target.unlockOn,
      envelope: { ciphertext: env.ciphertext, recipients: env.recipients },
    };
  }

  open<T = DropPayload>(drop: { envelope: { ciphertext: string; recipients: any[] } }): T {
    return openEnvelope<T>(drop.envelope as never, this.ring());
  }
}

export { decryptBytes };
