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
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Image, Pressable, View } from 'react-native';
import { api, ApiError } from '@/lib/api';
import { qk, useCircles, useMe, useToday } from '@/lib/data';
import { uploadPhoto } from '@/lib/media';
import { useSession } from '@/lib/session';
import { KIND_DOODLE, milestoneDay, newLetterId } from '@/features/story/letters';
import { Doodle } from '@/ui/Doodle';
import { Button, Card, Field, Gap, Header, IconButton, Pill, Row, Screen, Section, Sticky, Txt } from '@/ui/kit';
import { FONTS, RADIUS, SPACE, useTheme } from '@/ui/theme';

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

export default function WriteLetter() {
  const params = useLocalSearchParams<{ kind?: string; circleId?: string; self?: string; deliverOn?: string; to?: string }>();
  const me = useMe();
  const { identity } = useSession();
  const { c } = useTheme();
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
  const [photo, setPhoto] = useState<{ uri: string; width: number; height: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<{ msg: string; plus?: boolean } | null>(null);
  const [sent, setSent] = useState<{ kind: LetterKind; deliverOn?: string; milestone?: number } | null>(null);

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

  const pickPhoto = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.9, exif: false });
    if (!res.canceled && res.assets[0]) setPhoto({ uri: res.assets[0].uri, width: res.assets[0].width, height: res.assets[0].height });
  };

  const send = async () => {
    if (!kind || !identity) return;
    setBusy(true);
    setErr(null);
    try {
      const recips: RecipientSpec[] = [{ t: 'user', userId: me.user.id, publicKey: identity.publicKey }];
      if (target === 'circle') {
        const key = circle?.keys.get(circle.currentEpoch);
        if (!circle || !key) throw new Error('Kunci lingkaran belum tersedia di perangkat ini. Tarik untuk memuat ulang.');
        recips.push({ t: 'circle', circleId: circle.id, epoch: circle.currentEpoch, key });
      } else if (target !== 'self') {
        const m = circle?.members.find((x) => x.userId === target);
        if (!m?.publicKey) throw new Error('Penerima belum punya kunci.');
        recips.push({ t: 'user', userId: m.userId, publicKey: fromBase64(m.publicKey) });
      }
      const media: MediaRef[] = photo ? [await uploadPhoto(photo.uri, photo.width, photo.height)] : [];
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
      <Screen
        header={<Header back={false} />}
        footer={
          <View style={{ width: '100%', gap: SPACE.sm, alignItems: 'center' }}>
            <Button title="ke kotak surat" icon="amplop" onPress={() => router.replace('/surat')} testID="letter-sent-mailbox" />
            <Button kind="ghost" title="selesai" onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} />
          </View>
        }>
        <Gap h={SPACE.xxl} />
        <View style={{ alignItems: 'center', gap: SPACE.md }} testID="letter-sent">
          <View style={{ width: 128, height: 128, borderRadius: 64, backgroundColor: c.danger, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-8deg' }] }}>
            <Doodle id="segel-lilin" size={76} color={c.onInk} strokeWidth={3} />
          </View>
          <Txt v="title" ink center>
            {sent.kind === 'lost' ? 'dalam perjalanan' : 'terkunci rapat'}
          </Txt>
          <Txt v="hand" center style={{ fontSize: 28, lineHeight: 32, color: c.text }}>
            {sent.kind === 'lost'
              ? 'Suratmu sudah dilepas ke laut. Entah kapan ia ditemukan.'
              : sent.kind === 'milestone'
                ? `Menunggu di petak ${ms?.name ?? ''}${sent.deliverOn ? `, sekitar ${formatDayLong(sent.deliverOn)}` : ''}.`
                : `Terbuka ${sent.deliverOn ? formatDayLong(sent.deliverOn) : 'nanti'}.`}
          </Txt>
          <Txt v="small" soft center>
            {sent.kind === 'lost'
              ? 'Kamu tidak akan diberi tahu kapan sampainya. Itu bagian dari rahasianya.'
              : 'Sampai hari itu, isinya hanya bisa dibuka oleh perangkat penerima.'}
          </Txt>
        </View>
      </Screen>
    );
  }

  // ── Pilih jenis surat ─────────────────────────────────────────────────────
  if (!kind) {
    return (
      <Screen header={<Header title="tulis surat" />}>
        <Gap h={SPACE.md} />
        <View style={{ gap: SPACE.lg }}>
          {(['lost', 'future', 'milestone'] as const).map((k, i) => (
            <Sticky key={k} color={(['blue', 'yellow', 'green'] as const)[i]!} tilt={[-1.5, 1, -0.8][i]!} onPress={() => setKind(k)}>
              <View testID={`kind-${k}`}>
                <Row gap={12} style={{ alignItems: 'flex-start' }}>
                  <Doodle id={KIND_DOODLE[k]} size={40} />
                  <View style={{ flex: 1, gap: 4 }}>
                    <Txt v="hand" style={{ fontSize: 28, lineHeight: 30, color: c.text }}>
                      {INTRO[k].title}
                    </Txt>
                    <Txt v="small" style={{ color: c.text, opacity: 0.8 }} numberOfLines={3}>
                      {INTRO[k].body}
                    </Txt>
                  </View>
                </Row>
              </View>
            </Sticky>
          ))}
        </View>
      </Screen>
    );
  }

  // ── Menulis ───────────────────────────────────────────────────────────────
  return (
    <Screen
      header={<Header title={INTRO[kind].title.toLowerCase()} subtitle={circle && target !== 'self' ? circle.name : undefined} />}
      footer={<Button title={kind === 'lost' ? 'lepaskan surat' : 'kunci surat'} icon="segel-lilin" onPress={send} loading={busy} disabled={!ready} testID="letter-send" />}>
      <Card tint={c.pill} style={{ marginTop: SPACE.sm }}>
        <Row gap={12} style={{ alignItems: 'flex-start' }}>
          <Doodle id={KIND_DOODLE[kind]} size={36} />
          <Txt v="small" ink style={{ flex: 1 }}>
            {INTRO[kind].body}
          </Txt>
        </Row>
      </Card>

      {needsCircle && usable.length > 1 && !(params.circleId && kind !== 'future') ? (
        <Section title="lingkaran">
          <Row gap={8} style={{ flexWrap: 'wrap' }}>
            {usable.map((x) => (
              <Pill
                key={x.id}
                active={x.id === circleId}
                onPress={() => {
                  setCircleId(x.id);
                  setTarget(x.kind === 'duo' && x.others[0] ? x.others[0].userId : kind === 'future' ? target : 'circle');
                  setMilestone(null);
                }}>
                {x.name}
              </Pill>
            ))}
          </Row>
        </Section>
      ) : null}

      <Section title="untuk">
        {targets.length ? (
          <Row gap={8} style={{ flexWrap: 'wrap' }}>
            {targets.map((t) => (
              <Pill key={t.key} active={target === t.key} onPress={() => setTarget(t.key)} testID={`to-${t.key === 'self' || t.key === 'circle' ? t.key : 'member'}`}>
                {t.label}
              </Pill>
            ))}
            {kind === 'future' && !circle && usable.length ? (
              <Pill onPress={() => setCircleId(usable[0]!.id)}>orang di lingkaranku…</Pill>
            ) : null}
          </Row>
        ) : (
          <Txt v="small" soft>
            {usable.length ? 'Belum ada orang lain di lingkaran ini.' : 'Surat ini butuh lingkaran. Ajak seseorang dulu, ya.'}
          </Txt>
        )}
        {lostOff ? (
          <Txt v="small" soft style={{ marginTop: SPACE.sm }}>
            Surat Tersesat sedang dimatikan di lingkaran ini. Bisa dinyalakan lagi di pengaturan lingkaran.
          </Txt>
        ) : null}
      </Section>

      {kind === 'future' ? (
        <Section title="dibuka pada">
          <View style={{ gap: SPACE.sm }}>
            <Row gap={8} style={{ flexWrap: 'wrap' }}>
              {presets.map((p) => {
                const locked = !!p.day && p.day > maxDay;
                return (
                  <Pill key={p.key} active={preset === p.key} onPress={() => setPreset(p.key)} testID={`preset-${p.key}`}>
                    {locked ? `${p.label} · plus` : p.label}
                  </Pill>
                );
              })}
            </Row>
            {preset === '17' ? <Field label="tanggal lahirnya" placeholder="YYYY-MM-DD" value={born} onChangeText={setBorn} maxLength={10} autoCapitalize="none" testID="born" /> : null}
            {preset === 'custom' ? <Field label="tanggal" placeholder="YYYY-MM-DD" value={custom} onChangeText={setCustom} maxLength={10} autoCapitalize="none" testID="custom-date" /> : null}
            {deliverOn ? (
              <Txt v="small" ink testID="deliver-on">
                terbuka {formatDayLong(deliverOn)} · {untilLabel(diffDays(deliverOn, today))}
              </Txt>
            ) : preset === '17' || preset === 'custom' ? (
              <Txt v="tiny" soft>
                Pilih tanggal setelah hari ini.
              </Txt>
            ) : null}
            {overLimit ? (
              <Card tint={c.sticky.yellow} onPress={() => router.push('/plus')} testID="capsule-plus">
                <Row gap={10}>
                  <Doodle id="jam-pasir" size={26} />
                  <Txt v="small" style={{ flex: 1, color: c.text }}>
                    Paketmu bisa mengunci surat hingga {me.limits.timeCapsuleYears} tahun. Kapsul yang lebih jauh terbuka dengan Plus.
                  </Txt>
                  <Doodle id="ui-panah-kanan" size={16} />
                </Row>
              </Card>
            ) : null}
          </View>
        </Section>
      ) : null}

      {kind === 'milestone' ? (
        <Section title="petak">
          {!circle ? (
            <Txt v="small" soft>
              Pilih lingkaran dulu.
            </Txt>
          ) : milestones.length === 0 ? (
            <Txt v="small" soft>
              Semua petak istimewa lingkaran ini sudah dilewati. Coba Surat untuk Nanti.
            </Txt>
          ) : (
            <View style={{ gap: SPACE.sm }}>
              {milestones.map((m) => {
                const on = milestoneDay(circle.createdDay, m.days);
                return (
                  <Card key={m.days} onPress={() => setMilestone(m.days)} tint={milestone === m.days ? c.pill : undefined} testID={`milestone-${m.days}`}>
                    <Row gap={12}>
                      <Doodle id={MILESTONE_DOODLE[m.days] ?? 'kunci'} size={30} />
                      <View style={{ flex: 1 }}>
                        <Txt v="h2" ink>
                          {m.name}
                        </Txt>
                        <Txt v="tiny" soft>
                          hari ke-{m.days} · sekitar {formatDayLong(on)}
                        </Txt>
                      </View>
                      {milestone === m.days ? <Doodle id="ui-centang" size={20} /> : null}
                    </Row>
                  </Card>
                );
              })}
            </View>
          )}
        </Section>
      ) : null}

      <Section title="suratnya">
        <Sticky color="yellow" tilt={-0.6} pin={false}>
          <Field
            value={text}
            onChangeText={setText}
            placeholder={kind === 'lost' ? 'untukmu, kapan pun surat ini sampai…' : 'hai, kamu yang di masa depan…'}
            multiline
            maxLength={8000}
            testID="letter-text"
            style={{ fontFamily: FONTS.hand, fontSize: 26, lineHeight: 32, minHeight: 220, backgroundColor: 'transparent', borderWidth: 0, color: c.text }}
          />
        </Sticky>
      </Section>

      <Section title="tulisan di amplop (opsional)">
        <Field value={note} onChangeText={setNote} placeholder="misalnya: buka saat hujan" maxLength={60} testID="envelope-note" hint="Terlihat penerima sebelum amplop dibuka. Tetap terenkripsi." />
      </Section>

      <Section title="foto (opsional)">
        {photo ? (
          <View style={{ alignSelf: 'flex-start' }}>
            <Image source={{ uri: photo.uri }} style={{ width: 160, height: 160, borderRadius: RADIUS.md }} />
            <View style={{ position: 'absolute', right: -6, top: -6, backgroundColor: c.card, borderRadius: 999 }}>
              <IconButton icon="ui-tutup" label="hapus foto" size={18} onPress={() => setPhoto(null)} />
            </View>
          </View>
        ) : (
          <Pressable onPress={pickPhoto} accessibilityRole="button" style={{ alignSelf: 'flex-start' }} testID="letter-photo">
            <View style={{ width: 120, height: 120, borderRadius: RADIUS.md, borderWidth: 1.5, borderStyle: 'dashed', borderColor: c.inkSoft, alignItems: 'center', justifyContent: 'center', gap: 4 }}>
              <Doodle id="ui-foto" size={30} />
              <Txt v="tiny" ink>
                selipkan foto
              </Txt>
            </View>
          </Pressable>
        )}
      </Section>

      {err ? (
        <Card style={{ marginTop: SPACE.md }} tint={c.sticky.peach} onPress={err.plus ? () => router.push('/plus') : undefined}>
          <Txt v="small" style={{ color: c.text }}>
            {err.msg}
            {err.plus ? ' Ketuk untuk melihat Plus.' : ''}
          </Txt>
        </Card>
      ) : null}
      <Gap h={SPACE.lg} />
    </Screen>
  );
}
