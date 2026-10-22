import {
  type CircleKind,
  type CircleSummary,
  createInviteSecret,
  encryptText,
  fromBase64,
  inviteProof,
  newSymmetricKey,
  openInviteBundle,
  sealInviteBundle,
  sealTo,
  toBase64,
  type AcceptInviteResult,
  type Identity,
} from '@sehari/core';
import { API_URL, api } from './api';
import type { CircleView } from './data';

export async function createCircle(
  identity: Identity,
  input: { kind: CircleKind; name: string; doodle: string; moment?: { startsOn: string; endsOn: string }; settings?: Record<string, unknown> },
): Promise<{ circle: CircleSummary; keys: Map<number, Uint8Array> }> {
  const key = newSymmetricKey();
  const circle = await api.post<CircleSummary>('/circles', {
    kind: input.kind,
    nameEnc: `e1:${encryptText(key, input.name)}`,
    doodle: input.doodle,
    keyEnvelope: toBase64(sealTo(identity.publicKey, key)),
    moment: input.moment ? { ...input.moment, tier: 'coba' } : undefined,
    settings: input.settings,
  });
  return { circle, keys: new Map([[1, key]]) };
}

/**
 * Tautan undangan: token di path, rahasia pembuka kunci di fragmen (#...).
 * Fragmen tidak pernah dikirim browser ke server.
 */
export async function createInvite(circle: Pick<CircleView, 'id' | 'keys'>, opts: { maxUses?: number; hours?: number } = {}): Promise<{ url: string; appUrl: string; token: string }> {
  const { secret, fragment } = createInviteSecret();
  const keys = [...circle.keys.entries()].map(([epoch, k]) => ({ epoch, key: toBase64(k) }));
  const res = await api.post<{ token: string; url: string }>(`/circles/${circle.id}/invites`, {
    bundle: sealInviteBundle(secret, { circleId: circle.id, keys }),
    proof: inviteProof(fragment),
    maxUses: opts.maxUses ?? 1,
    expiresInHours: opts.hours ?? 48,
  });
  return { token: res.token, url: `${API_URL}/j/${res.token}#${fragment}`, appUrl: `${res.url}#${fragment}` };
}

export async function acceptInvite(identity: Identity, userId: string, token: string, fragment: string): Promise<string> {
  const res = await api.post<AcceptInviteResult>(`/invites/${token}/accept`, { proof: inviteProof(fragment) });
  const bundle = openInviteBundle(fragment, res.bundle);
  await api.put(`/circles/${res.circleId}/keys`, {
    envelopes: bundle.keys.map((k) => ({ epoch: k.epoch, userId, wk: toBase64(sealTo(identity.publicKey, fromBase64(k.key))) })),
  });
  return res.circleId;
}

/** Simpan undangan yang dibuka sebelum masuk, untuk diterima setelah onboarding. */
export const pendingInvite = {
  value: null as null | { token: string; fragment: string },
};
