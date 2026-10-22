/**
 * Ekspor data (hak UU PDP). Server mengirim arsip teracak; semua dibuka di
 * perangkat ini, lalu disusun jadi JSON yang bisa dibaca manusia.
 */
import {
  type DropPayload,
  type ExportBundle,
  fromBase64,
  getCity,
  getProduct,
  type Identity,
  type Keyring,
  type LetterPayload,
  openEnvelope,
  openSealed,
} from '@sehari/core';
import { openCircleText, openDrop } from '@/lib/data';

const AUDIENCE: Record<string, string> = { self: 'hanya aku', circle: 'lingkaran', person: 'satu orang', time_capsule: 'kapsul waktu' };

export interface ReadableExport {
  tentang: string;
  exportedAt: string;
  profile: Record<string, unknown>;
  circles: { id: string; kind: string; name: string; status: string; createdDay: string; members: string[] }[];
  days: { day: string; drops: Record<string, unknown>[] }[];
  letters: Record<string, unknown>[];
  orders: { product: string; amountIdr: number; status: string; createdAt: string; paidAt: string | null }[];
  catatan: string[];
}

function stripMediaKeys(p: DropPayload | LetterPayload): Record<string, unknown> {
  const out: Record<string, unknown> = { ...p };
  if (p.media) out.media = p.media.map(({ key: _key, ...rest }) => rest);
  return out;
}

export function buildReadableExport(bundle: ExportBundle, identity: Identity, fallback: Keyring | null): { data: ReadableExport; dropCount: number; unreadable: number } {
  // Kunci lingkaran dari arsip itu sendiri, dengan cadangan dari sesi aktif.
  const keys = new Map<string, Map<number, Uint8Array>>();
  for (const c of bundle.circles) {
    const m = new Map<number, Uint8Array>();
    for (const k of c.myKeys) {
      try {
        m.set(k.epoch, openSealed(identity, fromBase64(k.wk)));
      } catch {}
    }
    keys.set(c.id, m);
  }
  const ring: Keyring = {
    userId: bundle.user.id,
    identity,
    circleKey: (circleId, epoch) => keys.get(circleId)?.get(epoch) ?? fallback?.circleKey(circleId, epoch),
  };
  const circleNames = new Map<string, string>();
  const circles = bundle.circles.map((c) => {
    const name = openCircleText({ keys: keys.get(c.id) ?? new Map() }, c.nameEnc, c.kind === 'duo' ? 'Duo' : 'Lingkaran');
    circleNames.set(c.id, name);
    return {
      id: c.id,
      kind: c.kind,
      name,
      status: c.status,
      createdDay: c.createdDay,
      members: c.members.filter((m) => m.state !== 'left').map((m) => m.penName),
    };
  });

  let unreadable = 0;
  const byDay = new Map<string, Record<string, unknown>[]>();
  const sorted = [...bundle.drops].sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1));
  for (const w of sorted) {
    const { payload } = openDrop(w, ring);
    if (!payload) unreadable += 1;
    const entry: Record<string, unknown> = {
      untuk: AUDIENCE[w.audience] ?? w.audience,
      lingkaran: w.circleIds.map((id) => circleNames.get(id) ?? id),
      dibuat: w.createdAt,
      ...(w.unlockOn ? { terkunciSampai: w.unlockOn } : {}),
      ...(payload ? stripMediaKeys(payload) : { kind: w.kind, isi: '(tidak bisa dibuka di perangkat ini)' }),
    };
    const list = byDay.get(w.day) ?? [];
    list.push(entry);
    byDay.set(w.day, list);
  }
  const days = [...byDay.entries()].sort(([a], [b]) => (a < b ? -1 : 1)).map(([day, drops]) => ({ day, drops }));

  const letters = bundle.letters.map((l) => {
    const base: Record<string, unknown> = {
      jenis: l.kind,
      dari: l.fromUserId === bundle.user.id ? 'aku' : l.fromUserId,
      untuk: l.toUserId === bundle.user.id ? 'aku' : (l.toUserId ?? (l.circleId ? circleNames.get(l.circleId) ?? 'lingkaran' : 'diri sendiri')),
      ditulis: l.createdAt,
      ...(l.deliverOn ? { dikirimPada: l.deliverOn } : {}),
      ...(l.deliveredAt ? { sampai: l.deliveredAt } : {}),
    };
    if (!l.envelope) return { ...base, isi: '(masih dalam perjalanan)' };
    try {
      return { ...base, ...stripMediaKeys(openEnvelope<LetterPayload>(l.envelope as never, ring)) };
    } catch {
      return { ...base, isi: '(tidak bisa dibuka di perangkat ini)' };
    }
  });

  const u = bundle.user;
  const data: ReadableExport = {
    tentang: 'Arsip Sehari milikmu, dibuka di perangkatmu sendiri. Berkas ini tidak terenkripsi: simpan baik-baik.',
    exportedAt: bundle.exportedAt,
    profile: {
      namaPena: u.penName,
      email: u.email,
      doodle: u.doodle,
      tahunLahir: u.birthYear,
      ulangTahun: u.birthday,
      kota: getCity(u.cityId)?.name ?? u.cityId,
      kotaAsal: getCity(u.homeCityId)?.name ?? u.homeCityId,
      zonaWaktu: u.tz,
      paket: u.plan,
      paketSampai: u.planUntil,
      bergabung: u.createdAt,
      pengaturan: u.settings,
    },
    circles,
    days,
    letters,
    orders: bundle.orders.map((o) => ({ product: getProduct(o.product)?.name ?? o.product, amountIdr: o.amountIdr, status: o.status, createdAt: o.createdAt, paidAt: o.paidAt })),
    catatan: [
      'Foto, video, dan voice note tidak ikut di berkas ini; yang tercatat hanya keterangannya.',
      'Drop milik orang lain tidak termasuk: itu arsip mereka.',
    ],
  };
  return { data, dropCount: bundle.drops.length, unreadable };
}
