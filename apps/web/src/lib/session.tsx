/**
 * Sesi & identitas kunci. Kunci rahasia hanya hidup di peramban ini; server
 * menyimpan cadangan yang terenkripsi dengan kode pemulihan.
 */
import {
  type AuthResult,
  backupIdentity,
  type DeviceLinkState,
  fromBase64,
  generateIdentity,
  generateRecoveryCode,
  type Identity,
  identityFromSecret,
  type KeyBackupResponse,
  type Me,
  openSealed,
  restoreIdentity,
  sealTo,
  toBase64,
} from '@sehari/core';
import { useQueryClient } from '@tanstack/react-query';
import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, setToken, setUnauthorizedHandler } from './api';
import { store } from './storage';

export type SessionStatus = 'loading' | 'signed_out' | 'needs_profile' | 'needs_keys' | 'needs_restore' | 'ready';

interface SessionValue {
  status: SessionStatus;
  me: Me | null;
  identity: Identity | null;
  requestCode(email: string): Promise<{ devCode?: string }>;
  verify(email: string, code: string): Promise<AuthResult>;
  refresh(): Promise<Me | null>;
  setMe(me: Me): void;
  draftKeys(): { identity: Identity; code: string };
  commitKeys(draft: { identity: Identity; code: string }): Promise<void>;
  rebackup(code: string): Promise<void>;
  restoreWithCode(code: string): Promise<void>;
  startDeviceLink(): Promise<{ qr: string; wait: () => Promise<void>; cancel: () => void }>;
  approveDeviceLink(qr: string): Promise<void>;
  signOut(): Promise<void>;
}

const Ctx = createContext<SessionValue | null>(null);

export function useSession(): SessionValue {
  const v = useContext(Ctx);
  if (!v) throw new Error('useSession di luar SessionProvider');
  return v;
}

export function useReady(): { me: Me; identity: Identity } {
  const s = useSession();
  if (!s.me || !s.identity) throw new Error('Sesi belum siap');
  return { me: s.me, identity: s.identity };
}

const skKey = (userId: string) => `identity_${userId}`;

function statusFor(me: Me | null, identity: Identity | null): SessionStatus {
  if (!me) return 'signed_out';
  if (!me.user.penName || !me.user.birthYear || !me.user.cityId) return 'needs_profile';
  if (!me.user.publicKey) return 'needs_keys';
  if (!identity || toBase64(identity.publicKey) !== me.user.publicKey) return 'needs_restore';
  return 'ready';
}

function deviceName() {
  const ua = navigator.userAgent;
  const os = /iPhone|iPad/.test(ua) ? 'iPhone' : /Android/.test(ua) ? 'Android' : /Mac/.test(ua) ? 'Mac' : /Windows/.test(ua) ? 'Windows' : 'peramban';
  return `${os} · web`;
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const [loading, setLoading] = useState(true);
  const [me, setMeState] = useState<Me | null>(null);
  const [identity, setIdentity] = useState<Identity | null>(null);

  const loadIdentity = useCallback((userId: string) => {
    const sk = store.get(skKey(userId));
    const id = sk ? identityFromSecret(fromBase64(sk)) : null;
    setIdentity(id);
    return id;
  }, []);

  const refresh = useCallback(async () => {
    try {
      const m = await api.get<Me>('/me');
      setMeState(m);
      return m;
    } catch (e) {
      if ((e as { status?: number }).status === 401) {
        setMeState(null);
        return null;
      }
      throw e;
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } catch {}
    store.del('token');
    setToken(null);
    setMeState(null);
    setIdentity(null);
    qc.clear();
  }, [qc]);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      store.del('token');
      setToken(null);
      setMeState(null);
    });
    (async () => {
      try {
        const t = store.get('token');
        if (t) {
          setToken(t);
          const m = await refresh().catch(() => null);
          if (m) loadIdentity(m.user.id);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [refresh, loadIdentity]);

  const value = useMemo<SessionValue>(
    () => ({
      status: loading ? 'loading' : statusFor(me, identity),
      me,
      identity,
      setMe: setMeState,
      refresh,
      signOut,
      requestCode: (email) => api.post<{ ok: true; devCode?: string }>('/auth/request-code', { email }),
      async verify(email, code) {
        const res = await api.post<AuthResult>('/auth/verify', { email, code, deviceName: deviceName(), platform: 'web' });
        store.set('token', res.token);
        setToken(res.token);
        loadIdentity(res.user.id);
        await refresh();
        return res;
      },
      draftKeys: () => ({ identity: generateIdentity(), code: generateRecoveryCode() }),
      async commitKeys(draft) {
        if (!me) throw new Error('Belum masuk');
        await api.put('/me/keys', { publicKey: toBase64(draft.identity.publicKey), keyBackup: backupIdentity(draft.identity, draft.code) });
        store.set(skKey(me.user.id), toBase64(draft.identity.secretKey));
        setIdentity(draft.identity);
        await refresh();
      },
      async rebackup(code) {
        if (!identity) throw new Error('Kunci belum ada');
        await api.put('/me/keys', { publicKey: toBase64(identity.publicKey), keyBackup: backupIdentity(identity, code) });
      },
      async restoreWithCode(code) {
        if (!me) throw new Error('Belum masuk');
        const b = await api.get<KeyBackupResponse>('/me/key-backup');
        let id: Identity;
        try {
          id = restoreIdentity(b.keyBackup, code);
        } catch {
          throw new Error('Kode pemulihan belum cocok. Periksa lagi huruf dan angkanya.');
        }
        if (toBase64(id.publicKey) !== b.publicKey) throw new Error('Kode ini untuk kunci yang berbeda.');
        store.set(skKey(me.user.id), toBase64(id.secretKey));
        setIdentity(id);
      },
      async startDeviceLink() {
        if (!me) throw new Error('Belum masuk');
        const eph = generateIdentity();
        const { id: linkId } = await api.post<{ id: string }>('/me/device-links', { ephemeralPublicKey: toBase64(eph.publicKey) });
        let cancelled = false;
        return {
          qr: `sehari-link:${linkId}:${toBase64(eph.publicKey)}`,
          cancel: () => {
            cancelled = true;
          },
          wait: async () => {
            for (let i = 0; i < 300 && !cancelled; i++) {
              const st = await api.get<DeviceLinkState>(`/me/device-links/${linkId}`);
              if (st.status === 'expired') throw new Error('Kode tautan kedaluwarsa. Coba lagi.');
              if (st.status === 'approved' && st.payload) {
                const sk = openSealed(eph, fromBase64(st.payload));
                const id = identityFromSecret(sk);
                if (toBase64(id.publicKey) !== me.user.publicKey) throw new Error('Kunci dari perangkat lain tidak cocok.');
                store.set(skKey(me.user.id), toBase64(sk));
                setIdentity(id);
                return;
              }
              await new Promise((r) => setTimeout(r, 2000));
            }
          },
        };
      },
      async approveDeviceLink(qr) {
        if (!identity) throw new Error('Perangkat ini belum punya kunci.');
        const m = /^sehari-link:([a-z0-9]+):(.+)$/.exec(qr.trim());
        if (!m) throw new Error('Ini bukan kode tautan Sehari.');
        await api.post(`/me/device-links/${m[1]}/approve`, { payload: toBase64(sealTo(fromBase64(m[2]!), identity.secretKey)) });
      },
    }),
    [loading, me, identity, refresh, signOut, loadIdentity],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
