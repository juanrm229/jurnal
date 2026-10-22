import { CIRCLE_KIND_LABEL, type CircleSettings, COPY, formatIdr, MOMENT_TIERS, type MomentTier } from '@sehari/core';
import { useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { MethodPicker, type PayMethod, PaymentStatus, useCheckout } from '@/features/account/checkout';
import { CircleMembers } from '@/features/account/CircleMembers';
import { Bullets, Choice, ConfirmCard, errMsg, Note, TCard } from '@/features/account/kit';
import { api } from '@/lib/api';
import { type CircleView, sealCircleText, useCircle } from '@/lib/data';
import { useSession } from '@/lib/session';
import { Doodle } from '@/ui/Doodle';
import { Button, Card, Field, Gap, Growing, Header, Row, Screen, Section, Toggle, Txt } from '@/ui/kit';
import { SPACE, useTheme } from '@/ui/theme';

const CIRCLE_DOODLES = ['tunas', 'rumah', 'ui-peluk', 'cangkir', 'bunga-matahari', 'kucing', 'buku', 'gitar', 'sepeda', 'kerang', 'bulan', 'lentera', 'payung', 'kompas', 'surat-botol', 'pohon-kelapa', 'kembang-api', 'kado'];

// ── nama & doodle ───────────────────────────────────────────────────────────

function NameAndDoodle({ circle, onSaved }: { circle: CircleView; onSaved: () => Promise<void> }) {
  const { c } = useTheme();
  const [name, setName] = useState(circle.name);
  const [doodle, setDoodle] = useState(circle.doodle);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const dirty = name.trim() !== circle.name || doodle !== circle.doodle;
  const save = async () => {
    setBusy(true);
    setErr(null);
    try {
      await api.patch(`/circles/${circle.id}`, {
        ...(name.trim() !== circle.name ? { nameEnc: sealCircleText(circle, name.trim()) } : {}),
        ...(doodle !== circle.doodle ? { doodle } : {}),
      });
      await onSaved();
      setSaved(true);
    } catch (e) {
      setErr(errMsg(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <View style={{ gap: SPACE.sm }}>
      <Field
        value={name}
        onChangeText={(v) => {
          setName(v);
          setSaved(false);
        }}
        maxLength={60}
        placeholder="nama lingkaran"
        hint="Nama ini dienkripsi; server hanya melihat huruf acak."
        testID="circle-name-edit"
      />
      <Row style={{ flexWrap: 'wrap', gap: 8 }}>
        {CIRCLE_DOODLES.map((d) => (
          <Pressable
            key={d}
            onPress={() => {
              setDoodle(d);
              setSaved(false);
            }}
            accessibilityLabel={d}
            accessibilityState={{ selected: d === doodle }}
            testID={`circle-doodle-${d}`}
            style={{ padding: 7, borderRadius: 14, backgroundColor: d === doodle ? c.pill : c.card, borderWidth: 1, borderColor: d === doodle ? c.ink : c.cardEdge }}>
            <Doodle id={d} size={28} />
          </Pressable>
        ))}
      </Row>
      {dirty ? <Button kind="soft" title="simpan nama & doodle" onPress={() => void save()} loading={busy} disabled={!name.trim()} testID="circle-name-save" /> : null}
      {saved && !dirty ? (
        <Txt v="tiny" ink soft>
          tersimpan
        </Txt>
      ) : null}
      {err ? <Txt v="small" style={{ color: c.danger }}>{err}</Txt> : null}
    </View>
  );
}

// ── AI cloud ────────────────────────────────────────────────────────────────

function AiConsent({ circle, onSaved }: { circle: CircleView; onSaved: () => Promise<void> }) {
  const { me } = useSession();
  const p = COPY.privacy;
  const activeIds = new Set(circle.active.map((m) => m.userId));
  const consents = circle.aiConsent.filter((x) => activeIds.has(x.userId));
  const agreed = consents.filter((x) => x.granted).length;
  const total = circle.active.length;
  const mine = consents.find((x) => x.userId === me?.user.id)?.granted ?? false;
  const [asking, setAsking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const set = async (granted: boolean) => {
    setBusy(true);
    setErr(null);
    try {
      await api.put(`/circles/${circle.id}/ai-consent`, { granted });
      await onSaved();
      setAsking(false);
    } catch (e) {
      setErr(errMsg(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <View style={{ gap: SPACE.sm }}>
      <Card style={{ gap: 6 }}>
        {p.aiTiers.map((t, i) => (
          <View key={t.name} style={{ paddingVertical: 4 }}>
            <Txt v="small" ink>
              {i + 1}. {t.name}
            </Txt>
            <Txt v="tiny" soft>
              {t.body}
            </Txt>
          </View>
        ))}
      </Card>
      <Txt v="small" testID="ai-progress">
        {p.aiConsentProgress(agreed, total)}
      </Txt>
      {asking ? (
        <ConfirmCard
          title={p.aiConsentTitle}
          body={p.aiCloudWarning}
          note={`${p.aiOffers} Persetujuanmu bisa ditarik kapan saja, dan AI cloud langsung mati lagi untuk semua.`}
          confirmLabel="aku setuju"
          cancelLabel="belum"
          onConfirm={() => void set(true)}
          onCancel={() => setAsking(false)}
          busy={busy}
          error={err}
          testID="ai-consent"
        />
      ) : mine ? (
        <View style={{ gap: 6 }}>
          <Note color="peach">{`Kamu sudah setuju. ${p.aiCloudWarning}`}</Note>
          <Button kind="ghost" title="tarik persetujuanku" onPress={() => void set(false)} loading={busy} testID="ai-withdraw" />
        </View>
      ) : (
        <Button kind="soft" title="aku setuju menyalakan AI cloud" onPress={() => setAsking(true)} disabled={circle.status !== 'active'} testID="ai-ask" />
      )}
      {err && !asking ? <Txt v="small">{err}</Txt> : null}
    </View>
  );
}

// ── Kapsul Momen ────────────────────────────────────────────────────────────

function MomentTierCard({ circle }: { circle: CircleView }) {
  const { c } = useTheme();
  const tier: MomentTier = circle.moment?.tier ?? 'coba';
  const order: MomentTier[] = ['coba', 'kecil', 'sedang', 'besar'];
  const higher = order.slice(order.indexOf(tier) + 1) as Exclude<MomentTier, 'coba'>[];
  const [pick, setPick] = useState<Exclude<MomentTier, 'coba'> | null>(higher[0] ?? null);
  const [method, setMethod] = useState<PayMethod>('qris');
  const flow = useCheckout();
  const guests = circle.members.filter((m) => m.state !== 'left').length;
  return (
    <View style={{ gap: SPACE.sm }}>
      <TCard style={{ gap: 4 }} testID="moment-tier">
        <Row style={{ justifyContent: 'space-between' }}>
          <Txt ink>Paket {MOMENT_TIERS[tier].label}</Txt>
          <Txt v="tiny" soft>
            {guests} dari {MOMENT_TIERS[tier].maxGuests} tamu
          </Txt>
        </Row>
        {circle.moment ? (
          <Txt v="tiny" soft>
            acara {circle.moment.startsOn} sampai {circle.moment.endsOn}
          </Txt>
        ) : null}
      </TCard>
      {higher.length && flow.phase !== 'paid' ? (
        <>
          <Txt v="small">Butuh ruang untuk lebih banyak tamu? Termasuk Wrap acara dan QR untuk tamu.</Txt>
          <View style={{ gap: 6 }}>
            {higher.map((t) => (
              <Pressable key={t} onPress={() => setPick(t)} testID={`moment-${t}`}>
                <Card tint={pick === t ? c.pill : undefined} style={{ paddingVertical: 12, borderColor: pick === t ? c.ink : c.cardEdge }}>
                  <Row style={{ justifyContent: 'space-between' }}>
                    <Txt>
                      {MOMENT_TIERS[t].label} · hingga {MOMENT_TIERS[t].maxGuests} tamu
                    </Txt>
                    <Txt ink>{formatIdr(MOMENT_TIERS[t].priceIdr)}</Txt>
                  </Row>
                </Card>
              </Pressable>
            ))}
          </View>
          {flow.phase === 'idle' || flow.phase === 'opening' ? (
            <>
              <MethodPicker value={method} onChange={setMethod} />
              <Button
                title={pick ? `tingkatkan ke ${MOMENT_TIERS[pick].label.toLowerCase()}` : 'pilih paket'}
                onPress={() => pick && void flow.start({ product: `moment_${pick}`, circleId: circle.id, method })}
                loading={flow.phase === 'opening'}
                disabled={!pick}
                testID="moment-upgrade"
              />
            </>
          ) : null}
        </>
      ) : null}
      <PaymentStatus flow={flow} paidText="Kapsul Momen sudah ditingkatkan. Selamat merayakan." />
    </View>
  );
}

// ── Mode ────────────────────────────────────────────────────────────────────

function SplitMode({ circle, onDone }: { circle: CircleView; onDone: () => Promise<void> }) {
  const t = COPY.modes.split;
  const [asking, setAsking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const run = async () => {
    setBusy(true);
    setErr(null);
    try {
      await api.post(`/circles/${circle.id}/split`);
      await onDone();
      setAsking(false);
    } catch (e) {
      setErr(errMsg(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Card style={{ gap: SPACE.sm }}>
      <Row gap={10}>
        <Doodle id="daun-kering" size={28} />
        <Txt v="h2" ink>
          {t.title}
        </Txt>
      </Row>
      <Txt v="small">{t.body}</Txt>
      <Txt v="tiny" soft>
        {t.limit}
      </Txt>
      {asking ? (
        <ConfirmCard title={t.confirmTitle} body={t.confirmBody} confirmLabel={t.confirmCta} cancelLabel={t.cancel} onConfirm={() => void run()} onCancel={() => setAsking(false)} busy={busy} error={err} danger testID="split" />
      ) : (
        <Button kind="ghost" title="mulai Mode Pisah" onPress={() => setAsking(true)} testID="split-open" />
      )}
    </Card>
  );
}

function MemorialMode({ circle, onDone }: { circle: CircleView; onDone: () => Promise<void> }) {
  const t = COPY.modes.memorial;
  const [who, setWho] = useState<string | null>(null);
  const [asking, setAsking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const person = circle.others.find((m) => m.userId === who);
  const run = async () => {
    if (!person) return;
    setBusy(true);
    setErr(null);
    try {
      const r = await api.post<{ confirmed: boolean; votes: number; needed: number }>(`/circles/${circle.id}/memorial`, { userId: person.userId });
      setResult(
        r.confirmed
          ? t.done(person.penName)
          : `Terima kasih. Untuk lingkaran, perlu ${r.needed - r.votes === 1 ? 'satu' : r.needed - r.votes} konfirmasi lagi dari anggota lain sebelum halaman ${person.penName} disimpan sebagai kenangan. Tidak ada pemberitahuan yang dikirim kepadanya.`,
      );
      setAsking(false);
      setWho(null);
      await onDone();
    } catch (e) {
      setErr(errMsg(e));
    } finally {
      setBusy(false);
    }
  };
  if (!circle.others.length) return null;
  return (
    <Card style={{ gap: SPACE.sm }}>
      <Row gap={10}>
        <Doodle id="lilin" size={28} />
        <Txt v="h2" ink>
          {t.title}
        </Txt>
      </Row>
      <Txt v="small">{t.body}</Txt>
      {result ? (
        <Note color="blue" testID="memorial-result">
          {result}
        </Note>
      ) : null}
      {asking && person ? (
        <ConfirmCard title={t.confirmTitle(person.penName)} body={t.confirmBody} confirmLabel={t.confirmCta} cancelLabel={t.cancel} onConfirm={() => void run()} onCancel={() => setAsking(false)} busy={busy} error={err} testID="memorial" />
      ) : (
        <>
          <Txt v="tiny" soft>
            untuk siapa?
          </Txt>
          <Choice options={circle.others.map((m) => ({ value: m.userId, label: m.memorialVotes?.length ? `${m.penName} · ${m.memorialVotes.length} konfirmasi` : m.penName }))} value={who ?? ''} onChange={setWho} testID="memorial-who" />
          {circle.kind !== 'duo' ? (
            <Txt v="tiny" soft>
              Di lingkaran, dua anggota perlu mengonfirmasi. Orang yang ditandai keliru bisa membatalkannya sendiri.
            </Txt>
          ) : null}
          <Button kind="ghost" title="lanjut" onPress={() => setAsking(true)} disabled={!person} testID="memorial-open" />
        </>
      )}
    </Card>
  );
}

function MemorialLock({ circle, onDone }: { circle: CircleView; onDone: () => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const set = async (locked: boolean) => {
    setBusy(true);
    setErr(null);
    try {
      await api.post(`/circles/${circle.id}/memorial/lock?locked=${locked ? 1 : 0}`);
      await onDone();
    } catch (e) {
      setErr(errMsg(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Card style={{ paddingVertical: SPACE.sm }}>
      <Toggle
        label={busy ? 'menyimpan…' : 'Kunci arsip sebagai kapsul kenangan'}
        hint="Hari-hari di sini disimpan rapat dan tidak muncul di Kenangan atau Wrap sampai kalian membukanya lagi. Tidak ada yang dihapus."
        value={circle.memorialLocked}
        onChange={(v) => void set(v)}
        testID="memorial-lock"
      />
      {err ? <Txt v="small">{err}</Txt> : null}
    </Card>
  );
}

function RememberedUndo({ circle, onDone }: { circle: CircleView; onDone: () => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  return (
    <Note color="peach">
      <View style={{ gap: 6 }}>
        <Txt v="small">Halamanmu di lingkaran ini sedang disimpan sebagai kenangan. Kalau ini keliru, kamu bisa membatalkannya.</Txt>
        <Button
          kind="ghost"
          title="batalkan, aku masih di sini"
          loading={busy}
          onPress={async () => {
            setBusy(true);
            try {
              await api.post(`/circles/${circle.id}/memorial/undo`);
              await onDone();
            } finally {
              setBusy(false);
            }
          }}
          testID="memorial-undo"
        />
      </View>
    </Note>
  );
}

function Leave({ circle }: { circle: CircleView }) {
  const t = COPY.modes.leave;
  const qc = useQueryClient();
  const [asking, setAsking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const run = async () => {
    setBusy(true);
    setErr(null);
    try {
      await api.post(`/circles/${circle.id}/leave`);
      await qc.invalidateQueries({ queryKey: ['circles'] });
      router.replace('/lingkaran');
    } catch (e) {
      setErr(errMsg(e));
      setBusy(false);
    }
  };
  return asking ? (
    <ConfirmCard
      title={`${t.title}?`}
      body={t.body}
      note={circle.kind === 'duo' && circle.status === 'active' ? `${t.note} Di Duo, keluar juga membekukan arsip kalian berdua.` : t.note}
      confirmLabel={t.confirmCta}
      cancelLabel={t.cancel}
      onConfirm={() => void run()}
      onCancel={() => setAsking(false)}
      busy={busy}
      error={err}
      danger
      testID="leave"
    />
  ) : (
    <View style={{ gap: 6 }}>
      <Txt v="small" soft>
        {t.body}
      </Txt>
      <Button kind="danger" title="keluar dari lingkaran" onPress={() => setAsking(true)} testID="leave-open" />
    </View>
  );
}

// ── Layar ───────────────────────────────────────────────────────────────────

export default function CircleSettingsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const circle = useCircle(id);
  const qc = useQueryClient();
  const { c } = useTheme();
  const [local, setLocal] = useState<Partial<CircleSettings>>({});
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  if (!circle) return <Screen header={<Header title="pengaturan" />}><Growing /></Screen>;

  const refresh = () => qc.invalidateQueries({ queryKey: ['circles'] });
  const s: CircleSettings = { ...circle.settings, ...local };
  const frozen = circle.status !== 'active';
  const isMoment = circle.kind === 'moment';
  const meActive = circle.me?.state === 'active';
  const hasRemembered = circle.members.some((m) => m.state === 'remembered');

  const setSetting = async <K extends keyof CircleSettings>(k: K, v: CircleSettings[K]) => {
    setLocal((x) => ({ ...x, [k]: v }));
    setSaving(true);
    setErr(null);
    try {
      await api.patch(`/circles/${circle.id}`, { settings: { [k]: v } });
      await refresh();
      setLocal((x) => {
        const { [k]: _drop, ...rest } = x;
        return rest;
      });
    } catch (e) {
      setLocal((x) => {
        const { [k]: _drop, ...rest } = x;
        return rest;
      });
      setErr(errMsg(e));
    } finally {
      setSaving(false);
    }
  };

  const toggle = (k: 'oneYearAgo' | 'yellowingPages' | 'lostLetters' | 'nightQuestion' | 'seasons', label: string, hint: string) => (
    <Toggle label={label} hint={hint} value={s[k]} onChange={(v) => (frozen ? undefined : void setSetting(k, v))} testID={`circle-toggle-${k}`} />
  );

  return (
    <Screen
      header={
        <Header
          title="pengaturan"
          subtitle={`${circle.name} · ${CIRCLE_KIND_LABEL[circle.kind].toLowerCase()}`}
          right={saving ? <Txt v="tiny" ink soft>menyimpan…</Txt> : undefined}
        />
      }>
      {frozen ? (
        <Note color="blue" icon={circle.status === 'memorial' ? 'lilin' : 'daun-kering'}>
          {circle.status === 'split' ? COPY.modes.split.done : circle.status === 'memorial' ? COPY.modes.memorial.body : 'Acara ini sudah selesai. Arsipnya tetap bisa dibuka kapan saja.'}
        </Note>
      ) : null}
      {circle.me?.state === 'remembered' || (circle.me?.memorialVotes?.length ?? 0) > 0 ? <RememberedUndo circle={circle} onDone={refresh} /> : null}
      {err ? (
        <>
          <Gap h={SPACE.sm} />
          <Note color="peach">{err}</Note>
        </>
      ) : null}

      {!frozen ? (
        <Section title="nama & doodle">
          <NameAndDoodle circle={circle} onSaved={refresh} />
        </Section>
      ) : null}

      {isMoment ? (
        <Section title="paket kapsul momen">
          <MomentTierCard circle={circle} />
        </Section>
      ) : null}

      <Section title="fitur melankolis">
        <Txt v="small" soft style={{ marginBottom: 4 }}>
          Ada masa ketika kenangan terasa terlalu dekat. Matikan kapan saja; tidak ada yang hilang, hanya berhenti muncul.
        </Txt>
        <Card style={{ paddingVertical: SPACE.xs }}>
          {toggle('oneYearAgo', 'Setahun Lalu', 'Hari yang sama dari tahun-tahun lalu muncul di Kenangan.')}
          {toggle('yellowingPages', 'Halaman Menguning', 'Hari lama yang jarang dikunjungi perlahan menguning. Kunjungi sebentar, warnanya hidup lagi.')}
          {toggle('lostLetters', 'Surat Tersesat', 'Surat yang tiba di waktu acak, satu sampai dua belas bulan setelah ditulis.')}
        </Card>
      </Section>

      <Section title="ritual">
        <Card style={{ paddingVertical: SPACE.xs }}>
          {toggle('nightQuestion', 'Pertanyaan Malam', 'Satu pertanyaan kecil menjelang tidur, sama untuk semua anggota.')}
          {toggle('seasons', 'Musim Bersama', 'Ramadan, mudik, 17-an, akhir tahun: kartu dan tema musiman ikut mampir.')}
        </Card>
      </Section>

      <Section title="cara kapsul terbuka">
        <View style={{ gap: SPACE.sm }}>
          {(
            [
              { v: 'after_seal', label: 'setelah menyegel', body: COPY.seal.giveFirst },
              { v: 'open', label: 'terbuka kapan saja', body: 'Drop langsung bisa dibaca begitu dijatuhkan. Cocok untuk Kapsul Momen, atau lingkaran yang ingin lebih santai.' },
            ] as const
          ).map((o) => {
            const on = s.revealMode === o.v;
            return (
              <Pressable key={o.v} onPress={() => (frozen || on ? undefined : void setSetting('revealMode', o.v))} testID={`reveal-${o.v}`} accessibilityRole="radio" accessibilityState={{ checked: on }}>
                <Card tint={on ? c.pill : undefined} style={{ gap: 4, borderColor: on ? c.ink : c.cardEdge }}>
                  <Row style={{ justifyContent: 'space-between' }}>
                    <Txt ink={on}>{o.label}</Txt>
                    {on ? <Doodle id="ui-centang" size={18} /> : null}
                  </Row>
                  <Txt v="tiny" soft>
                    {o.body}
                  </Txt>
                </Card>
              </Pressable>
            );
          })}
          <Txt v="tiny" soft>
            Kami masih belajar cara mana yang terasa lebih hangat untuk lingkaran seperti kalian, jadi sebagian lingkaran baru dimulai dengan cara yang berbeda. Tidak ada yang benar atau salah; pilih yang paling nyaman, dan ganti kapan saja.
          </Txt>
        </View>
      </Section>

      <Section title="orang-orang di sini">
        <CircleMembers circle={circle} />
      </Section>

      {!isMoment ? (
        <Section title="AI cloud (opsional)">
          <AiConsent circle={circle} onSaved={refresh} />
        </Section>
      ) : null}

      {meActive && (!frozen || hasRemembered || circle.status === 'memorial') ? (
        <Section title="saat hidup berubah">
          <View style={{ gap: SPACE.sm }}>
            {!frozen && circle.kind === 'duo' ? <SplitMode circle={circle} onDone={refresh} /> : null}
            {!frozen && !isMoment ? <MemorialMode circle={circle} onDone={refresh} /> : null}
            {hasRemembered || circle.status === 'memorial' ? <MemorialLock circle={circle} onDone={refresh} /> : null}
          </View>
        </Section>
      ) : null}

      {circle.me && circle.me.state !== 'left' ? (
        <Section title="keluar">
          <Leave circle={circle} />
        </Section>
      ) : null}

      <Gap h={SPACE.lg} />
      <Bullets items={[COPY.privacy.noSurveillance]} />
      <Gap h={SPACE.xl} />
    </Screen>
  );
}
