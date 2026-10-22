/**
 * Lapisan data: kueri server + dekripsi di perangkat. Isi selalu dibuka di
 * sini, tidak pernah di server.
 */
import {
  type Audience,
  type CircleCalendarDay,
  type CircleDay,
  type CircleMember,
  type CircleSummary,
  type CreateDropBody,
  decryptText,
  type DropMeta,
  type DropPayload,
  type DropWire,
  encryptText,
  fromBase64,
  type Keyring,
  type LetterWire,
  type LockedDrop,
  type Me,
  type MyDay,
  newSymmetricKey,
  openEnvelope,
  openSealed,
  type RecipientSpec,
  sealEnvelope,
  type SealResult,
  sealTo,
  todayIn,
  toBase64,
} from '@sehari/core';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';
import { api, ApiError } from './api';
import { useSession } from './session';

// ── Kunci ───────────────────────────────────────────────────────────────────

const keyCache = new Map<string, Uint8Array>();

export interface CircleView extends CircleSummary {
  name: string;
  keys: Map<number, Uint8Array>;
  me: CircleMember | undefined;
  active: CircleMember[];
  others: CircleMember[];
}

function openKeys(c: CircleSummary, identity: { publicKey: Uint8Array; secretKey: Uint8Array }): Map<number, Uint8Array> {
  const map = new Map<number, Uint8Array>();
  for (const k of c.myKeys) {
    const ck = `${c.id}:${k.epoch}:${k.wk.slice(0, 16)}`;
    let key = keyCache.get(ck);
    if (!key) {
      try {
        key = openSealed(identity, fromBase64(k.wk));
        keyCache.set(ck, key);
      } catch {
        continue;
      }
    }
    map.set(k.epoch, key);
  }
  return map;
}

/** Teks lingkaran (nama, judul bab, julukan) disimpan sebagai "e<epoch>:<ciphertext>". */
export function sealCircleText(c: Pick<CircleView, 'keys' | 'currentEpoch'>, text: string): string {
  const key = c.keys.get(c.currentEpoch);
  if (!key) throw new Error('Kunci lingkaran belum tersedia di perangkat ini.');
  return `e${c.currentEpoch}:${encryptText(key, text)}`;
}

export function openCircleText(c: Pick<CircleView, 'keys'>, enc: string | null | undefined, fallback = '…'): string {
  if (!enc) return fallback;
  const m = /^e(\d+):(.*)$/s.exec(enc);
  const epoch = m ? Number(m[1]) : 1;
  const body = m ? m[2]! : enc;
  const key = c.keys.get(epoch);
  if (!key) return fallback;
  try {
    return decryptText(key, body);
  } catch {
    return fallback;
  }
}

export const qk = {
  circles: ['circles'] as const,
  me: ['me'] as const,
  myDay: (d: string) => ['myDay', d] as const,
  circleDay: (c: string, d: string) => ['circleDay', c, d] as const,
  circleRange: (c: string, f: string, t: string) => ['circleRange', c, f, t] as const,
  calendar: (c: string, f: string, t: string) => ['calendar', c, f, t] as const,
  myDays: (f: string, t: string) => ['myDays', f, t] as const,
  onThisDay: (d: string) => ['onThisDay', d] as const,
  inbox: ['inbox'] as const,
  letters: (box: string) => ['letters', box] as const,
};

export function useMe(): Me {
  const { me } = useSession();
  if (!me) throw new Error('belum masuk');
  return me;
}

/** Hari aktif pengguna, diperbarui tiap menit (sebelum 04.00 masih kemarin). */
export function useToday(): string {
  const me = useSession().me;
  const tz = me?.user.tz ?? 'Asia/Jakarta';
  const [today, setToday] = useState(() => todayIn(tz, new Date(), true));
  useEffect(() => {
    setToday(todayIn(tz, new Date(), true));
    const t = setInterval(() => setToday(todayIn(tz, new Date(), true)), 60_000);
    return () => clearInterval(t);
  }, [tz]);
  return today;
}

export function useCircles() {
  const { identity, me } = useSession();
  const q = useQuery({ queryKey: qk.circles, queryFn: () => api.get<CircleSummary[]>('/circles'), enabled: !!identity });
  const views = useMemo<CircleView[]>(() => {
    if (!q.data || !identity || !me) return [];
    return q.data.map((c) => {
      const keys = openKeys(c, identity);
      const base = { ...c, keys } as CircleView;
      const active = c.members.filter((m) => m.state === 'active');
      return {
        ...base,
        name: openCircleText(base, c.nameEnc, c.kind === 'duo' ? 'Duo' : 'Lingkaran'),
        me: c.members.find((m) => m.userId === me.user.id),
        active,
        others: active.filter((m) => m.userId !== me.user.id),
      };
    });
  }, [q.data, identity, me]);
  return { ...q, circles: views };
}

export function useCircle(id: string | undefined): CircleView | undefined {
  const { circles } = useCircles();
  return circles.find((c) => c.id === id);
}

export function useKeyring(): Keyring | null {
  const { identity, me } = useSession();
  const { circles } = useCircles();
  return useMemo(() => {
    if (!identity || !me) return null;
    return {
      userId: me.user.id,
      identity,
      circleKey: (circleId: string, epoch: number) => circles.find((c) => c.id === circleId)?.keys.get(epoch),
    };
  }, [identity, me, circles]);
}

export function memberName(circles: CircleView[], userId: string, meId?: string): string {
  if (userId === meId) return 'kamu';
  for (const c of circles) {
    const m = c.members.find((x) => x.userId === userId);
    if (m) return m.penName;
  }
  return 'seseorang';
}

// ── Drop ────────────────────────────────────────────────────────────────────

export interface OpenDrop {
  wire: DropWire;
  payload: DropPayload | null;
}

export function openDrop(wire: DropWire, ring: Keyring | null): OpenDrop {
  if (!ring) return { wire, payload: null };
  try {
    return { wire, payload: openEnvelope<DropPayload>(wire.envelope as never, ring) };
  } catch {
    return { wire, payload: null };
  }
}

export function useOpenDrops(wires: DropWire[] | undefined): OpenDrop[] {
  const ring = useKeyring();
  return useMemo(() => (wires ?? []).map((w) => openDrop(w, ring)), [wires, ring]);
}

export interface DraftDrop {
  day: string;
  payload: DropPayload;
  audience: Audience;
  circleIds?: string[];
  personId?: string;
  unlockOn?: string;
  mediaIds?: string[];
  meta?: DropMeta;
  mediaSeconds?: number;
}

export function buildDropBody(d: DraftDrop, ctx: { me: Me; identity: { publicKey: Uint8Array }; circles: CircleView[]; id?: string }): CreateDropBody {
  const recips: RecipientSpec[] = [{ t: 'user', userId: ctx.me.user.id, publicKey: ctx.identity.publicKey }];
  const circleIds = d.audience === 'self' ? [] : (d.circleIds ?? []);
  if (d.audience === 'person') {
    const circle = ctx.circles.find((c) => c.id === circleIds[0]);
    const person = circle?.members.find((m) => m.userId === d.personId);
    if (!person?.publicKey) throw new Error('Penerima belum punya kunci.');
    recips.push({ t: 'user', userId: person.userId, publicKey: fromBase64(person.publicKey) });
  } else if (d.audience === 'circle' || (d.audience === 'time_capsule' && circleIds.length && !d.personId)) {
    for (const id of circleIds) {
      const c = ctx.circles.find((x) => x.id === id);
      const key = c?.keys.get(c.currentEpoch);
      if (!c || !key) throw new Error('Kunci lingkaran belum tersedia. Tarik untuk memuat ulang.');
      recips.push({ t: 'circle', circleId: id, epoch: c.currentEpoch, key });
    }
  } else if (d.audience === 'time_capsule' && d.personId) {
    const person = ctx.circles.flatMap((c) => c.members).find((m) => m.userId === d.personId);
    if (!person?.publicKey) throw new Error('Penerima belum punya kunci.');
    recips.push({ t: 'user', userId: person.userId, publicKey: fromBase64(person.publicKey) });
  }
  const env = sealEnvelope(d.payload, recips);
  return {
    id: ctx.id ?? newDropId(),
    day: d.day,
    kind: d.payload.kind,
    audience: d.audience,
    circleIds,
    personId: d.personId,
    unlockOn: d.unlockOn,
    envelope: { ciphertext: env.ciphertext, recipients: env.recipients },
    mediaIds: d.mediaIds ?? [],
    meta: d.meta ?? {},
    mediaSeconds: d.mediaSeconds,
  };
}

export function newDropId(): string {
  const r = toBase64(newSymmetricKey()).replace(/[^a-zA-Z0-9]/g, '').slice(0, 14).toLowerCase();
  return `d${Date.now().toString(36)}${r}`;
}

export function nowParts(tz: string): { hour: number; minute: number } {
  const p = new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date());
  return { hour: Number(p.find((x) => x.type === 'hour')?.value ?? 0), minute: Number(p.find((x) => x.type === 'minute')?.value ?? 0) };
}

export function useCreateDrop() {
  const qc = useQueryClient();
  const { me, identity } = useSession();
  const { circles, refetch } = useCircles();
  return useMutation({
    mutationFn: async (d: DraftDrop) => {
      if (!me || !identity) throw new Error('Belum siap');
      const id = newDropId();
      try {
        return await api.post<{ id: string }>('/drops', buildDropBody(d, { me, identity, circles, id }));
      } catch (e) {
        // Kunci lingkaran baru saja diputar: muat ulang lalu coba sekali lagi.
        if (e instanceof ApiError && e.code === 'epoch_stale') {
          const fresh = await refetch();
          const views = (fresh.data ?? []).map((c) => ({ ...c, keys: openKeys(c, identity) }) as CircleView);
          return api.post<{ id: string }>('/drops', buildDropBody(d, { me, identity, circles: views, id }));
        }
        throw e;
      }
    },
    onSuccess: (_r, d) => {
      void qc.invalidateQueries({ queryKey: qk.myDay(d.day) });
      for (const c of d.circleIds ?? []) void qc.invalidateQueries({ queryKey: ['circleDay', c] });
    },
  });
}

export function useDeleteDrop(day: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.del(`/drops/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.myDay(day) }),
  });
}

export function useMyDay(day: string) {
  return useQuery({ queryKey: qk.myDay(day), queryFn: () => api.get<MyDay>(`/days/${day}`) });
}

export function useSeal() {
  const qc = useQueryClient();
  const { me, identity } = useSession();
  const { circles } = useCircles();
  return useMutation({
    mutationFn: async (args: { day: string; lastLine?: DraftDrop }) => {
      if (!me || !identity) throw new Error('Belum siap');
      return api.post<SealResult>(`/days/${args.day}/seal`, {
        tz: me.user.tz,
        lastLine: args.lastLine ? buildDropBody(args.lastLine, { me, identity, circles }) : undefined,
      });
    },
    onSuccess: () => {
      void qc.invalidateQueries();
    },
  });
}

export function useCircleDay(circleId: string, day: string) {
  return useQuery({ queryKey: qk.circleDay(circleId, day), queryFn: () => api.get<CircleDay>(`/circles/${circleId}/days/${day}`), enabled: !!circleId });
}

export function useCircleRange(circleId: string, from: string, to: string, enabled = true) {
  return useQuery({
    queryKey: qk.circleRange(circleId, from, to),
    queryFn: () => api.get<{ drops: DropWire[]; locked: LockedDrop[] }>(`/circles/${circleId}/drops?from=${from}&to=${to}`),
    enabled: enabled && !!circleId,
  });
}

export function useCalendar(circleId: string, from: string, to: string) {
  return useQuery({ queryKey: qk.calendar(circleId, from, to), queryFn: () => api.get<CircleCalendarDay[]>(`/circles/${circleId}/calendar?from=${from}&to=${to}`), enabled: !!circleId });
}

export interface MyDaySummary {
  day: string;
  sealedAt: string | null;
  dropCount: number;
  frozen: boolean;
}

export function useMyDays(from: string, to: string) {
  return useQuery({ queryKey: qk.myDays(from, to), queryFn: () => api.get<MyDaySummary[]>(`/me/days?from=${from}&to=${to}`) });
}

export function useOnThisDay(day: string) {
  return useQuery({
    queryKey: qk.onThisDay(day),
    queryFn: () => api.get<{ circleId: string | null; day: string; yearsAgo: number; drops: DropWire[] }[]>(`/memories/on-this-day?day=${day}`),
  });
}

export function useInbox() {
  return useQuery({ queryKey: qk.inbox, queryFn: () => api.get<{ drops: DropWire[]; locked: LockedDrop[] }>('/me/inbox') });
}

export function useLetters(box: 'inbox' | 'outbox') {
  return useQuery({ queryKey: qk.letters(box), queryFn: () => api.get<LetterWire[]>(`/letters?box=${box}`) });
}

export function useReact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ dropId, kind, on }: { dropId: string; kind: 'hug' | 'me_too' | 'candle' | 'here'; on: boolean }) =>
      on ? api.put(`/drops/${dropId}/reactions/${kind}`) : api.del(`/drops/${dropId}/reactions/${kind}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['circleDay'] }),
  });
}

// ── Pemeliharaan kunci ──────────────────────────────────────────────────────

/**
 * Setelah anggota keluar, anggota yang tersisa memutar kunci lingkaran.
 * Dijalankan diam-diam oleh perangkat pertama yang melihatnya.
 */
export function useKeyMaintenance() {
  const { circles, refetch } = useCircles();
  const tried = useRef(new Set<string>());
  useEffect(() => {
    for (const c of circles) {
      if (!c.rotationNeeded || c.status === 'memorial' || !c.me || c.me.state !== 'active' || tried.current.has(c.id)) continue;
      tried.current.add(c.id);
      const key = newSymmetricKey();
      const envelopes = c.active.filter((m) => m.publicKey).map((m) => ({ userId: m.userId, wk: toBase64(sealTo(fromBase64(m.publicKey), key)) }));
      api
        .post(`/circles/${c.id}/rotate`, { epoch: c.currentEpoch + 1, envelopes })
        .then(() => refetch())
        .catch(() => refetch());
    }
  }, [circles, refetch]);
}
