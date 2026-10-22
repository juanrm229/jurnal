/**
 * Menulis surat: Surat Tersesat (sampai di waktu acak), Surat Wasiat Kecil /
 * kapsul waktu (dibuka di tanggal pilihan), dan surat petak istimewa
 * (dibuka saat lingkaran mencapai hari ke-7/30/100/365).
 * Isi dienkripsi di perangkat untuk penerima dan untukku sendiri.
 */
import {
  addDays,
  diffDays,
  formatDayLong,
  fromBase64,
  isDayKey,
  type LetterKind,
  type LetterPayload,
  type MediaRef,
  MILESTONES,
  type RecipientSpec,
  sealEnvelope,
} from '@sehari/core';
import { useQueryClient } from '@tanstack/react-query';
import { type CSSProperties, useEffect, useMemo, useRef, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { qk, useCircles, useMe, useToday } from '@/lib/data';
import { uploadPhoto } from '@/lib/media';
import { back, navigate, usePath } from '@/lib/router';
import { useSession } from '@/lib/session';
import { Doodle, Header, Screen, Section, Sticky } from '@/ui/kit';
import { KIND_DOODLE, milestoneDay, newLetterId } from '../story/letters';

const MILESTONE_DOODLE: Record<number, string> = { 7: 'rumah', 30: 'peta', 100: 'lampu', 365: 'surat-botol' };

const INTRO: Record<LetterKind, { title: string; body: string }> = {
  lost: {
    title: 'Surat Tersesat',
    body: 'Seperti pesan dalam botol yang dilempar ke laut. Surat ini akan tersesat sebentar, lalu sampai di waktu acak: satu sampai dua belas bulan lagi. Tidak ada yang tahu kapan, termasuk kamu. Mungkin justru saat paling dibutuhkan.',
  },
  future: {
    title: 'Surat Wasiat Kecil',
    body: 'Kapsul waktu untuk dibuka di masa depan: untuk dirimu setahun lagi, untuk anak di umur tujuh belas, atau untuk seseorang di hari yang kamu pilih. Sampai hari itu, tidak ada yang bisa membacanya, termasuk kami.',
  },
  milestone: {
    title: 'Surat Petak Istimewa',
    body: 'Disimpan di petak papan permainan kalian. Surat ini baru terbuka saat lingkaran sampai di petak itu: Gerbang, Jembatan, Mercusuar, atau Pelabuhan.',
  },
};

function addYears(day: string, n: number): string {
  const y = Number(day.slice(0, 4)) + n;
  const md = day.slice(5);
  return md === '02-29' ? `${y}-02-28` : `${y}-${md}`;
}

function nextBirthday(mmdd: string, today: string): string {
  const y = Number(today.slice(0, 4));
  const fix = (yy: number) => (mmdd === '02-29' && !((yy % 4 === 0 && yy % 100 !== 0) || yy % 400 === 0) ? `${yy}-02-28` : `${yy}-${mmdd}`);
  const thisYear = fix(y);
  return thisYear > today ? thisYear : fix(y + 1);
}

function untilLabel(d: number): string {
  if (d < 60) return `${d} hari lagi`;
  if (d < 350) return `${Math.round(d / 30.4)} bulan lagi`;
  const y = Math.round((d / 365.25) * 10) / 10;
  return `${String(y).replace('.', ',')} tahun lagi`;
}

type Target = 'self' | 'circle' | string;

export default function Write() {
  const { search } = usePath();
  const params = {
    kind: search.get('kind') ?? undefined,
    circleId: search.get('circleId') ?? undefined,
    self: search.get('self') ?? undefined,
    deliverOn: search.get('deliverOn') ?? undefined,
    to: search.get('to') ?? undefined,
  };
  const me = useMe();
  const { identity } = useSession();
  const qc = useQueryClient();
  const today = useToday();
  const { circles } = useCircles();
  const usable = circles.filter((x) => (x.status === 'active' || x.status === 'memorial') && x.me?.state === 'active');

  const initialKind = (['lost', 'future', 'milestone'] as const).find((k) => k === params.kind) ?? null;
  const [kind, setKind] = useState<LetterKind | null>(initialKind);
  const [circleId, setCircleId] = useState<string | undefined>(params.circleId ?? (params.self === '1' ? undefined : usable[0]?.id));
  const circle = usable.find((x) => x.id === circleId);
  const defaultTarget = (): Target => {
    if (params.self === '1') return 'self';
    if (params.to) return params.to;
    if (circle?.kind === 'duo' && circle.others[0]) return circle.others[0].userId;
    return circle ? 'circle' : 'self';
  };
  const [target, setTarget] = useState<Target>(defaultTarget);
  const [preset, setPreset] = useState<string>(params.deliverOn && isDayKey(params.deliverOn) ? 'param' : '1y');
  const [custom, setCustom] = useState('');
  const [born, setBorn] = useState('');
  const [milestone, setMilestone] = useState<number | null>(null);
  const [text, setText] = useState('');
  const [note, setNote] = useState('');
  const [photo, setPhoto] = useState<{ file: File; url: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<{ msg: string; plus?: boolean } | null>(null);
  const [sent, setSent] = useState<{ kind: LetterKind; deliverOn?: string; milestone?: number } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => () => void (photo && URL.revokeObjectURL(photo.url)), [photo]);

  const maxDay = addDays(today, me.limits.timeCapsuleYears * 366);
  const targetMember = circle?.members.find((m) => m.userId === target);
  const birthday = target === 'self' ? me.user.birthday : targetMember?.birthday;

  const presets = useMemo(() => {
    const out: { key: string; label: string; day: string | null; hint?: string }[] = [];
    if (params.deliverOn && isDayKey(params.deliverOn)) out.push({ key: 'param', label: formatDayLong(params.deliverOn), day: params.deliverOn });
    out.push({ key: '1y', label: '1 tahun lagi', day: addYears(today, 1) });
    out.push({ key: '5y', label: '5 tahun lagi', day: addYears(today, 5) });
    out.push({ key: '10y', label: '10 tahun lagi', day: addYears(today, 10) });
    if (birthday) out.push({ key: 'bday', label: target === 'self' ? 'ulang tahunku' : `ulang tahun ${targetMember?.penName ?? ''}`.trim(), day: nextBirthday(birthday, today) });
    const b17 = isDayKey(born) ? addYears(born, 17) : null;
    out.push({ key: '17', label: 'ulang tahun ke-17…', day: b17 && b17 > today ? b17 : null, hint: 'isi tanggal lahirnya' });
    out.push({ key: 'custom', label: 'tanggal lain', day: isDayKey(custom) && custom > today ? custom : null, hint: 'YYYY-MM-DD' });
    return out;
  }, [params.deliverOn, today, birthday, target, targetMember?.penName, born, custom]);

  const milestones = circle ? MILESTONES.filter((m) => milestoneDay(circle.createdDay, m.days) > today) : [];
  const chosen = presets.find((p) => p.key === preset);
  const deliverOn = kind === 'future' ? (chosen?.day ?? null) : null;
  const overLimit = !!deliverOn && deliverOn > maxDay;
  const lostOff = kind === 'lost' && circle && !circle.settings.lostLetters;
  const needsCircle = kind === 'lost' || kind === 'milestone' || (kind === 'future' && target !== 'self');

  const targets: { key: Target; label: string }[] = [];
  if (kind === 'future') targets.push({ key: 'self', label: 'diriku sendiri' });
  if (circle) {
    for (const m of circle.others) if (m.publicKey) targets.push({ key: m.userId, label: m.penName });
    if (circle.kind !== 'duo' || kind === 'milestone') targets.push({ key: 'circle', label: `seluruh ${circle.name}` });
  }

  // Lingkaran baru selesai dimuat: pilih lingkaran & penerima yang masuk akal.
  const validTarget = targets.some((t) => t.key === target);
  useEffect(() => {
    if (!circleId && needsCircle && usable[0]) setCircleId(usable[0].id);
  }, [circleId, needsCircle, usable]);
  useEffect(() => {
    if (!validTarget && targets.length) setTarget(defaultTarget());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [validTarget, targets.length, circle?.id]);

  const ready =
    !!kind &&
    text.trim().length > 0 &&
    (!needsCircle || !!circle) &&
    !lostOff &&
    (kind !== 'future' || (!!deliverOn && !overLimit)) &&
    (kind !== 'milestone' || !!milestone) &&
    targets.some((t) => t.key === target);

  const pickPhoto = (f: File | undefined) => {
    if (!f || !f.type.startsWith('image/')) return;
    setPhoto({ file: f, url: URL.createObjectURL(f) });
  };

  const send = async () => {
    if (!kind || !identity || !ready) return;
    setBusy(true);
    setErr(null);
    try {
      const recips: RecipientSpec[] = [{ t: 'user', userId: me.user.id, publicKey: identity.publicKey }];
      if (target === 'circle') {
        const key = circle?.keys.get(circle.currentEpoch);
        if (!circle || !key) throw new Error('Kunci lingkaran belum tersedia di perangkat ini. Muat ulang halaman, ya.');
        recips.push({ t: 'circle', circleId: circle.id, epoch: circle.currentEpoch, key });
      } else if (target !== 'self') {
        const m = circle?.members.find((x) => x.userId === target);
        if (!m?.publicKey) throw new Error('Penerima belum punya kunci.');
        recips.push({ t: 'user', userId: m.userId, publicKey: fromBase64(m.publicKey) });
      }
      const media: MediaRef[] = photo ? [await uploadPhoto(photo.file)] : [];
      const payload: LetterPayload = {
        v: 1,
        text: text.trim(),
        media: media.length ? media : undefined,
        envelopeNote: note.trim() || undefined,
        writtenAt: new Date().toISOString(),
        writtenInCityId: me.user.cityId ?? undefined,
      };
      const env = sealEnvelope(payload, recips);
      await api.post('/letters', {
        id: newLetterId(),
        kind,
        circleId: target === 'self' ? undefined : circle?.id,
        toUserId: target === 'self' ? me.user.id : target === 'circle' ? undefined : target,
        deliverOn: kind === 'future' ? deliverOn : undefined,
        milestoneDays: kind === 'milestone' ? milestone : undefined,
        envelope: { ciphertext: env.ciphertext, recipients: env.recipients },
        mediaIds: media.map((m) => m.id),
      });
      void qc.invalidateQueries({ queryKey: qk.letters('outbox') });
      setSent({ kind, deliverOn: deliverOn ?? (milestone && circle ? milestoneDay(circle.createdDay, milestone) : undefined), milestone: milestone ?? undefined });
    } catch (e) {
      if (e instanceof ApiError && e.status === 402) setErr({ msg: e.message, plus: true });
      else setErr({ msg: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };

  // ── Sudah dikirim ─────────────────────────────────────────────────────────
  if (sent) {
    const ms = MILESTONES.find((m) => m.days === sent.milestone);
    return (
      <Screen>
        <div className="col" style={{ alignItems: 'center', gap: 16, paddingTop: '10vh', textAlign: 'center' }} data-testid="letter-sent">
          <div className="letter-sent-seal">
            <Doodle id="segel-lilin" size={76} color="var(--on-ink)" sw={3} draw={0.5} />
          </div>
          <h1 className="title rise" style={{ animationDelay: '.6s' }}>
            {sent.kind === 'lost' ? 'dalam perjalanan' : 'terkunci rapat'}
          </h1>
          <p className="hand rise" style={{ fontSize: 28, color: 'var(--text)', margin: 0, animationDelay: '.8s' }}>
            {sent.kind === 'lost'
              ? 'Suratmu sudah dilepas ke laut. Entah kapan ia ditemukan.'
              : sent.kind === 'milestone'
                ? `Menunggu di petak ${ms?.name ?? ''}${sent.deliverOn ? `, sekitar ${formatDayLong(sent.deliverOn)}` : ''}.`
                : `Terbuka ${sent.deliverOn ? formatDayLong(sent.deliverOn) : 'nanti'}.`}
          </p>
          <p className="small soft rise" style={{ margin: 0, maxWidth: 380, animationDelay: '1s' }}>
            {sent.kind === 'lost' ? 'Kamu tidak akan diberi tahu kapan sampainya. Itu bagian dari rahasianya.' : 'Sampai hari itu, isinya hanya bisa dibuka oleh perangkat penerima.'}
          </p>
          <div className="col mt-lg" style={{ width: '100%', maxWidth: 380 }}>
            <button className="btn" onClick={() => navigate('/surat', { replace: true })} data-testid="letter-sent-mailbox">
              <Doodle id="amplop" size={20} color="currentColor" />
              ke kotak surat
            </button>
            <button className="btn ghost" onClick={() => back('/surat')}>
              selesai
            </button>
          </div>
        </div>
      </Screen>
    );
  }

  // ── Pilih jenis surat ─────────────────────────────────────────────────────
  if (!kind) {
    return (
      <Screen>
        <Header title="tulis surat" backTo="/surat" />
        <div className="col" style={{ gap: 26, marginTop: 20 }}>
          {(['lost', 'future', 'milestone'] as const).map((k, i) => (
            <button key={k} className="letter-note rise" style={{ animationDelay: `${i * 0.08}s` }} onClick={() => setKind(k)} data-testid={`kind-${k}`}>
              <Sticky color={(['blue', 'yellow', 'green'] as const)[i]!} tilt={[-1.5, 1, -0.8][i]!}>
                <div className="row" style={{ alignItems: 'flex-start', gap: 12 }}>
                  <Doodle id={KIND_DOODLE[k]} size={40} />
                  <div className="col grow" style={{ gap: 4 }}>
                    <span className="hand" style={{ fontSize: 28, color: 'inherit' }}>{INTRO[k].title}</span>
                    <span className="small letter-clamp" style={{ opacity: 0.8 }}>{INTRO[k].body}</span>
                  </div>
                </div>
              </Sticky>
            </button>
          ))}
        </div>
      </Screen>
    );
  }

  // ── Menulis ───────────────────────────────────────────────────────────────
  return (
    <Screen>
      <Header title={INTRO[kind].title.toLowerCase()} sub={circle && target !== 'self' ? circle.name : undefined} backTo="/surat" />
      <div className="card flat row" style={{ background: 'var(--pill)', alignItems: 'flex-start', gap: 12, marginTop: 8 }}>
        <Doodle id={KIND_DOODLE[kind]} size={36} />
        <span className="small ink grow">{INTRO[kind].body}</span>
      </div>

      {needsCircle && usable.length > 1 && !(params.circleId && kind !== 'future') ? (
        <Section title="lingkaran">
          <div className="row wrap">
            {usable.map((x) => (
              <button
                key={x.id}
                className={`pill${x.id === circleId ? ' active' : ''}`}
                onClick={() => {
                  setCircleId(x.id);
                  setTarget(x.kind === 'duo' && x.others[0] ? x.others[0].userId : kind === 'future' ? target : 'circle');
                  setMilestone(null);
                }}>
                {x.name}
              </button>
            ))}
          </div>
        </Section>
      ) : null}

      <Section title="untuk">
        {targets.length ? (
          <div className="row wrap">
            {targets.map((t) => (
              <button key={t.key} className={`pill${target === t.key ? ' active' : ''}`} onClick={() => setTarget(t.key)} data-testid={`to-${t.key === 'self' || t.key === 'circle' ? t.key : 'member'}`}>
                {t.label}
              </button>
            ))}
            {kind === 'future' && !circle && usable.length ? (
              <button className="pill" onClick={() => setCircleId(usable[0]!.id)}>
                orang di lingkaranku…
              </button>
            ) : null}
          </div>
        ) : (
          <span className="small soft">{usable.length ? 'Belum ada orang lain di lingkaran ini.' : 'Surat ini butuh lingkaran. Ajak seseorang dulu, ya.'}</span>
        )}
        {lostOff ? <p className="small soft" style={{ marginTop: 8 }}>Surat Tersesat sedang dimatikan di lingkaran ini. Bisa dinyalakan lagi di pengaturan lingkaran.</p> : null}
      </Section>

      {kind === 'future' ? (
        <Section title="dibuka pada">
          <div className="col">
            <div className="row wrap">
              {presets.map((p) => {
                const locked = !!p.day && p.day > maxDay;
                return (
                  <button key={p.key} className={`pill${preset === p.key ? ' active' : ''}`} onClick={() => setPreset(p.key)} data-testid={`preset-${p.key}`}>
                    {locked ? `${p.label} · plus` : p.label}
                  </button>
                );
              })}
            </div>
            {preset === '17' ? (
              <label className="col gap-sm">
                <span className="label">tanggal lahirnya</span>
                <input className="field" type="date" max={today} value={born} onChange={(e) => setBorn(e.target.value)} data-testid="born" />
              </label>
            ) : null}
            {preset === 'custom' ? (
              <label className="col gap-sm">
                <span className="label">tanggal</span>
                <input className="field" type="date" min={addDays(today, 1)} value={custom} onChange={(e) => setCustom(e.target.value)} data-testid="custom-date" />
              </label>
            ) : null}
            {deliverOn ? (
              <span className="small ink" data-testid="deliver-on">
                terbuka {formatDayLong(deliverOn)} · {untilLabel(diffDays(deliverOn, today))}
              </span>
            ) : preset === '17' || preset === 'custom' ? (
              <span className="tiny soft">Pilih tanggal setelah hari ini.</span>
            ) : null}
            {overLimit ? (
              <div className="card flat row" style={{ background: 'var(--sticky-yellow)', color: 'var(--text)', gap: 10 }} data-testid="capsule-plus">
                <Doodle id="jam-pasir" size={26} />
                <span className="small grow">Paketmu bisa mengunci surat hingga {me.limits.timeCapsuleYears} tahun. Kapsul yang lebih jauh terbuka dengan Plus.</span>
              </div>
            ) : null}
          </div>
        </Section>
      ) : null}

      {kind === 'milestone' ? (
        <Section title="petak">
          {!circle ? (
            <span className="small soft">Pilih lingkaran dulu.</span>
          ) : milestones.length === 0 ? (
            <span className="small soft">Semua petak istimewa lingkaran ini sudah dilewati. Coba Surat untuk Nanti.</span>
          ) : (
            <div className="col">
              {milestones.map((m) => {
                const on = milestoneDay(circle.createdDay, m.days);
                const active = milestone === m.days;
                return (
                  <button key={m.days} className="card press row" style={{ gap: 12, background: active ? 'var(--pill)' : undefined, display: 'flex' }} onClick={() => setMilestone(m.days)} data-testid={`milestone-${m.days}`}>
                    <Doodle id={MILESTONE_DOODLE[m.days] ?? 'kunci'} size={30} />
                    <span className="grow">
                      <span className="h2" style={{ display: 'block' }}>{m.name}</span>
                      <span className="tiny soft">hari ke-{m.days} · sekitar {formatDayLong(on)}</span>
                    </span>
                    {active ? <Doodle id="ui-centang" size={20} /> : null}
                  </button>
                );
              })}
            </div>
          )}
        </Section>
      ) : null}

      <Section title="suratnya">
        <div className="letter-paper writing" style={{ '--lp': 'var(--sticky-yellow)' } as CSSProperties}>
          <div className="letter-paper-head">
            <span className="tiny">{formatDayLong(today)}</span>
            <Doodle id={KIND_DOODLE[kind]} size={24} />
          </div>
          <textarea
            className="letter-text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={kind === 'lost' ? 'untukmu, kapan pun surat ini sampai…' : 'hai, kamu yang di masa depan…'}
            maxLength={8000}
            data-testid="letter-text"
          />
          <div className="letter-sign hand">— {me.user.penName}</div>
        </div>
      </Section>

      <Section title="tulisan di amplop (opsional)">
        <input className="field hand" style={{ fontSize: 24, paddingTop: 8, paddingBottom: 8 }} value={note} onChange={(e) => setNote(e.target.value)} placeholder="misalnya: buka saat hujan" maxLength={60} data-testid="envelope-note" />
        <span className="tiny soft" style={{ display: 'block', marginTop: 6 }}>Terlihat penerima sebelum amplop dibuka. Tetap terenkripsi.</span>
      </Section>

      <Section title="foto (opsional)">
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => pickPhoto(e.target.files?.[0])} />
        {photo ? (
          <div className="letter-photo-pick">
            <img src={photo.url} alt="foto yang diselipkan" />
            <button className="icon-btn" aria-label="hapus foto" onClick={() => setPhoto(null)}>
              <Doodle id="ui-tutup" size={18} />
            </button>
          </div>
        ) : (
          <button className="letter-photo-slot" onClick={() => fileRef.current?.click()} data-testid="letter-photo">
            <Doodle id="ui-foto" size={30} />
            <span className="tiny ink">selipkan foto</span>
          </button>
        )}
      </Section>

      {err ? (
        <div className="card flat mt" style={{ background: 'var(--sticky-peach)', color: 'var(--text)' }}>
          <span className="small">
            {err.msg}
            {err.plus ? ' Fitur ini bagian dari Plus.' : ''}
          </span>
        </div>
      ) : null}

      <div className="letter-send-bar">
        <button className="btn" onClick={send} disabled={!ready || busy} data-testid="letter-send">
          <Doodle id="segel-lilin" size={22} color="currentColor" />
          {busy ? 'menyegel…' : kind === 'lost' ? 'lepaskan surat' : 'kunci surat'}
        </button>
      </div>
    </Screen>
  );
}
