/** Privasi & data: penjelasan enkripsi, batas jujur, AI, ekspor data, hapus akun. */
import {
  COPY,
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
import { useState } from 'react';
import { api } from '@/lib/api';
import { openCircleText, openDrop, useKeyring } from '@/lib/data';
import { navigate } from '@/lib/router';
import { useSession } from '@/lib/session';
import { Doodle, Header, Section } from '@/ui/kit';
import { Bullets, downloadText, ErrText, errMsg, Hr, IconRow, ListCard, Note } from './kit';

// ── Ekspor (hak UU PDP): arsip teracak dibuka di perangkat ini ──────────────

const AUDIENCE: Record<string, string> = { self: 'hanya aku', circle: 'lingkaran', person: 'satu orang', time_capsule: 'kapsul waktu' };

function stripMediaKeys(p: DropPayload | LetterPayload): Record<string, unknown> {
  const out: Record<string, unknown> = { ...p };
  if (p.media) out.media = p.media.map(({ key: _key, ...rest }) => rest);
  return out;
}

function buildReadableExport(bundle: ExportBundle, identity: Identity, fallback: Keyring | null) {
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
    return { id: c.id, kind: c.kind, name, status: c.status, createdDay: c.createdDay, members: c.members.filter((m) => m.state !== 'left').map((m) => m.penName) };
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
      untuk: l.toUserId === bundle.user.id ? 'aku' : (l.toUserId ?? (l.circleId ? (circleNames.get(l.circleId) ?? 'lingkaran') : 'diri sendiri')),
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
  const data = {
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
    catatan: ['Foto, video, dan voice note tidak ikut di berkas ini; yang tercatat hanya keterangannya.', 'Drop milik orang lain tidak termasuk: itu arsip mereka.'],
  };
  return { data, dropCount: bundle.drops.length, unreadable };
}

function Export() {
  const { identity } = useSession();
  const ring = useKeyring();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const run = async () => {
    if (!identity) return;
    setBusy(true);
    setErr(null);
    setDone(null);
    try {
      const bundle = await api.get<ExportBundle>('/me/export');
      const { data, dropCount, unreadable } = buildReadableExport(bundle, identity, ring);
      downloadText(`sehari-ekspor-${bundle.exportedAt.slice(0, 10)}.json`, JSON.stringify(data, null, 2));
      setDone(`Berkas sudah diunduh: ${data.days.length} hari, ${dropCount} Drop, ${data.letters.length} surat.` + (unreadable ? ` ${unreadable} Drop tidak bisa dibuka di perangkat ini.` : ''));
    } catch (e) {
      setErr(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card col" style={{ gap: 10 }}>
      <IconRow icon="ui-unduh" top={2}>
        <p className="small" style={{ margin: 0 }}>
          Hak atas datamu (UU PDP). Arsip diambil dari server dalam keadaan teracak, lalu dibuka di perangkat ini dan disusun jadi satu berkas JSON yang bisa kamu baca: profil, nama lingkaran, Drop milikmu per hari, dan surat.
        </p>
      </IconRow>
      <span className="tiny soft">Berkasnya tidak terenkripsi. Simpan di tempat yang hanya kamu yang bisa buka.</span>
      <button className="btn soft" onClick={() => void run()} disabled={busy || !identity}>
        {busy ? 'membuka arsip…' : 'ekspor arsipku'}
      </button>
      {done ? <Note color="green">{done}</Note> : null}
      <ErrText>{err}</ErrText>
    </div>
  );
}

function DeleteAccount() {
  const { signOut } = useSession();
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const run = async () => {
    setBusy(true);
    setErr(null);
    try {
      await api.del('/me?confirm=HAPUS');
      await signOut();
      navigate('/', { replace: true });
    } catch (e) {
      setErr(errMsg(e));
      setBusy(false);
    }
  };

  if (!open)
    return (
      <button className="btn danger" onClick={() => setOpen(true)}>
        hapus akunku
      </button>
    );
  return (
    <div className="card flat col rise" style={{ gap: 10, border: '1.5px dashed var(--danger)' }}>
      <div className="h2">Hapus akun selamanya?</div>
      <Bullets
        items={[
          'Semua Drop, surat, kapsul waktu, dan media milikmu dihapus dari server. Ini tidak bisa dibatalkan.',
          'Kamu keluar dari semua lingkaran. Anggota lain tetap menyimpan hari-hari mereka sendiri.',
          'Salinan yang sudah disimpan orang lain, termasuk tangkapan layar, tidak bisa kami hapus.',
          'Ingin menyimpan arsipmu? Ekspor dulu di atas.',
        ]}
      />
      <span className="label">ketik HAPUS untuk melanjutkan</span>
      <input className="field" value={typed} onChange={(e) => setTyped(e.target.value.toUpperCase())} autoCapitalize="characters" autoCorrect="off" placeholder="HAPUS" />
      <ErrText>{err}</ErrText>
      <button className="btn danger" onClick={() => void run()} disabled={busy || typed.trim() !== 'HAPUS'}>
        {busy ? 'menghapus…' : 'hapus selamanya'}
      </button>
      <button
        className="btn ghost"
        onClick={() => {
          setOpen(false);
          setTyped('');
        }}>
        tidak jadi
      </button>
    </div>
  );
}

export default function Privasi() {
  const p = COPY.privacy;
  return (
    <main className="screen">
      <Header title="privasi & data" backTo="/aku" />

      <Section title={p.e2eeTitle}>
        <div className="card">
          <IconRow icon="ui-gembok" top={0}>
            <p style={{ margin: 0 }}>{p.e2eeBody}</p>
          </IconRow>
        </div>
      </Section>

      <Section title={p.limitsTitle}>
        <Note color="yellow">
          <div className="col" style={{ gap: 10 }}>
            <Bullets items={p.limits} />
            <span className="small" style={{ fontStyle: 'italic' }}>{p.limitsClosing}</span>
          </div>
        </Note>
      </Section>

      <Section title="janji kami">
        <ListCard>
          {[
            { icon: 'kado', text: p.noAds },
            { icon: 'ui-lokasi', text: p.location },
            { icon: 'ui-hening', text: p.noSurveillance },
          ].map((x, i) => (
            <div key={x.icon}>
              {i ? <Hr /> : null}
              <div className="row" style={{ gap: 12, alignItems: 'flex-start', padding: '12px 0' }}>
                <Doodle id={x.icon} size={24} />
                <span className="small grow">{x.text}</span>
              </div>
            </div>
          ))}
        </ListCard>
      </Section>

      <Section title={p.aiTitle}>
        <div className="col" style={{ gap: 10 }}>
          {p.aiTiers.map((t, i) => (
            <div key={t.name} className="card col" style={{ gap: 4 }}>
              <div className="row" style={{ gap: 10 }}>
                <span className="label ink">{i + 1}</span>
                <span className="ink">{t.name}</span>
              </div>
              <span className="small">{t.body}</span>
              {i === 2 ? (
                <span className="tiny soft">
                  Kalau dinyalakan: {p.aiCloudWarning.charAt(0).toLowerCase() + p.aiCloudWarning.slice(1)} Pengaturannya ada di tiap lingkaran.
                </span>
              ) : null}
            </div>
          ))}
          <span className="tiny soft">{p.aiOffers}</span>
        </div>
      </Section>

      <Section title="ekspor data">
        <Export />
      </Section>

      <Section title="hapus akun">
        <DeleteAccount />
      </Section>
    </main>
  );
}
