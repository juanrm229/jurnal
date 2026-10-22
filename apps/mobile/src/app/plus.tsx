import { formatIdr, getProduct, PLAN_LIMITS, type PlanCode, type PlanLimits } from '@sehari/core';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { MethodPicker, type PayMethod, PaymentStatus, useCheckout, WEB_PAY_NOTE } from '@/features/account/checkout';
import { formatDate, Note } from '@/features/account/kit';
import { useCircles, useMe } from '@/lib/data';
import { Avatar } from '@/ui/Avatar';
import { Doodle } from '@/ui/Doodle';
import { Button, Card, Gap, Header, Pill, Row, Screen, Section, Txt } from '@/ui/kit';
import { SPACE, useTheme } from '@/ui/theme';

type Period = 'monthly' | 'yearly';
type Paid = Exclude<PlanCode, 'free'>;

const PLAN_NAME: Record<PlanCode, string> = { free: 'Gratis', plus: 'Plus', plus_duo: 'Plus Duo' };

const seconds = (n: number) => (n === 0 ? '—' : n < 120 ? `${n} detik` : `${Math.round(n / 60)} menit`);
const yesNo = (b: boolean) => (b ? 'ya' : '—');

const ROWS: { label: string; get: (l: PlanLimits) => string }[] = [
  { label: 'lingkaran', get: (l) => (l.maxCircles >= 50 ? 'tanpa batas' : String(l.maxCircles)) },
  { label: 'voice note', get: (l) => seconds(l.voiceSeconds) },
  { label: 'video', get: (l) => seconds(l.videoSeconds) },
  { label: 'foto per Drop', get: (l) => String(l.photosPerDrop) },
  { label: 'kapsul waktu', get: (l) => `${l.timeCapsuleYears} tahun` },
  { label: 'pembeku api / bulan', get: (l) => String(l.freezesPerMonth) },
  { label: 'Lore & Kamus Lingkaran', get: (l) => yesNo(l.lore && l.dictionary) },
  { label: 'tema kapsul', get: (l) => yesNo(l.themes) },
  { label: 'ekspor OST', get: (l) => yesNo(l.ostExport) },
  { label: 'film Wrap premium', get: (l) => yesNo(l.premiumFilm) },
];

function productFor(plan: Paid, period: Period) {
  return getProduct(`${plan}_${period}`)!;
}

function saving(plan: Paid): number {
  const m = productFor(plan, 'monthly').priceIdr * 12;
  const y = productFor(plan, 'yearly').priceIdr;
  return Math.round((1 - y / m) * 100);
}

function Compare() {
  const { c } = useTheme();
  const plans: PlanCode[] = ['free', 'plus', 'plus_duo'];
  return (
    <Card style={{ paddingVertical: SPACE.sm, paddingHorizontal: SPACE.sm }}>
      <Row gap={0} style={{ paddingBottom: 6 }}>
        <View style={{ flex: 1.3 }} />
        {plans.map((p) => (
          <Txt key={p} v="label" ink style={{ flex: 1, textAlign: 'center' }}>
            {PLAN_NAME[p].toLowerCase()}
          </Txt>
        ))}
      </Row>
      {ROWS.map((r, i) => (
        <Row key={r.label} gap={0} style={{ paddingVertical: 7, borderTopWidth: 1, borderTopColor: c.cardEdge, backgroundColor: i % 2 ? 'transparent' : undefined }}>
          <Txt v="tiny" style={{ flex: 1.3 }}>
            {r.label}
          </Txt>
          {plans.map((p) => (
            <Txt key={p} v="tiny" ink={p !== 'free'} soft={p === 'free'} style={{ flex: 1, textAlign: 'center' }}>
              {r.get(PLAN_LIMITS[p])}
            </Txt>
          ))}
        </Row>
      ))}
      <Row gap={0} style={{ paddingVertical: 7, borderTopWidth: 1, borderTopColor: c.cardEdge }}>
        <Txt v="tiny" style={{ flex: 1.3 }}>
          untuk berapa orang
        </Txt>
        <Txt v="tiny" soft style={{ flex: 1, textAlign: 'center' }}>
          1
        </Txt>
        <Txt v="tiny" ink style={{ flex: 1, textAlign: 'center' }}>
          1
        </Txt>
        <Txt v="tiny" ink style={{ flex: 1, textAlign: 'center' }}>
          2
        </Txt>
      </Row>
    </Card>
  );
}

function PlanCard({ plan, period, selected, onPress }: { plan: Paid; period: Period; selected: boolean; onPress: () => void }) {
  const { c } = useTheme();
  const p = productFor(plan, period);
  const monthly = period === 'yearly' ? Math.round(p.priceIdr / 12 / 100) * 100 : null;
  return (
    <Pressable onPress={onPress} testID={`plan-${plan}`} accessibilityRole="radio" accessibilityState={{ checked: selected }} style={{ flex: 1 }}>
      <View
        style={{
          borderRadius: 20,
          padding: SPACE.md,
          gap: 4,
          borderWidth: 1.5,
          borderColor: selected ? c.ink : c.cardEdge,
          backgroundColor: selected ? c.pill : c.card,
          minHeight: 150,
        }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <Txt v="h2" ink>
            {PLAN_NAME[plan]}
          </Txt>
          {selected ? <Doodle id="ui-centang" size={20} /> : null}
        </Row>
        <Txt v="title" ink style={{ fontSize: 20 }}>
          {formatIdr(p.priceIdr)}
        </Txt>
        <Txt v="tiny" soft>
          {period === 'yearly' ? `per tahun · ±${formatIdr(monthly!)}/bulan` : 'per bulan'}
        </Txt>
        <Gap h={4} />
        <Txt v="tiny">{plan === 'plus' ? 'untuk kamu sendiri' : 'satu langganan untuk berdua'}</Txt>
      </View>
    </Pressable>
  );
}

export default function PlusPaywall() {
  const me = useMe();
  const { c } = useTheme();
  const { circles } = useCircles();
  const [period, setPeriod] = useState<Period>('yearly');
  const [plan, setPlan] = useState<Paid>(me.user.plan === 'plus_duo' ? 'plus_duo' : 'plus');
  const [method, setMethod] = useState<PayMethod>('qris');
  const duoPartners = circles
    .filter((x) => x.kind === 'duo' && x.status === 'active')
    .flatMap((x) => x.others.map((m) => ({ circle: x, member: m })));
  // Bawaan: pasangan Duo pertama (setelah daftar lingkaran termuat).
  const [picked, setPartnerId] = useState<string | null | undefined>(undefined);
  const partnerId = picked === undefined ? (duoPartners[0]?.member.userId ?? null) : picked;
  const flow = useCheckout();
  const product = productFor(plan, period);
  const current = me.user.plan;
  const busy = flow.phase === 'opening';

  const pay = () =>
    void flow.start({
      product: product.code,
      method,
      ...(plan === 'plus_duo' && partnerId ? { partnerUserId: partnerId } : {}),
    });

  return (
    <Screen header={<Header title="Sehari Plus" />}>
      <View style={{ alignItems: 'center', gap: 6, marginTop: SPACE.sm }}>
        <Doodle id="segel-lilin" size={56} />
        <Txt v="hand" center>
          hari-hari kalian, lebih lama tersimpan
        </Txt>
        <Txt v="small" soft center>
          Gratis sudah cukup untuk menyimpan hari setiap hari. Plus untuk yang ingin lebih banyak lingkaran, suara yang lebih panjang, dan kapsul waktu sampai 25 tahun.
        </Txt>
      </View>

      {current !== 'free' ? (
        <>
          <Gap />
          <Card tint={c.sticky.green} style={{ gap: 4 }} testID="plan-current">
            <Txt ink>Paketmu sekarang: {PLAN_NAME[current]}</Txt>
            <Txt v="small">{me.user.planUntil ? `aktif sampai ${formatDate(me.user.planUntil)}` : 'aktif'}. Terima kasih sudah ikut merawat Sehari.</Txt>
            <Txt v="tiny" soft>
              Membayar lagi akan memperpanjang dari tanggal itu, bukan menimpanya.
            </Txt>
          </Card>
        </>
      ) : null}

      <Section title="bandingkan">
        <Compare />
      </Section>

      <Section title="pilih paket">
        <Row gap={8} style={{ marginBottom: SPACE.sm }}>
          <Pill active={period === 'monthly'} onPress={() => setPeriod('monthly')} testID="period-monthly">
            bulanan
          </Pill>
          <Pill active={period === 'yearly'} onPress={() => setPeriod('yearly')} testID="period-yearly">
            {`tahunan · hemat ${saving(plan)}%`}
          </Pill>
        </Row>
        <Row gap={SPACE.sm} style={{ alignItems: 'stretch' }}>
          <PlanCard plan="plus" period={period} selected={plan === 'plus'} onPress={() => setPlan('plus')} />
          <PlanCard plan="plus_duo" period={period} selected={plan === 'plus_duo'} onPress={() => setPlan('plus_duo')} />
        </Row>
        <Txt v="tiny" soft style={{ marginTop: 8 }}>
          {product.description}
        </Txt>
      </Section>

      {plan === 'plus_duo' ? (
        <Section title="berdua dengan">
          {duoPartners.length ? (
            <View style={{ gap: 8 }}>
              {duoPartners.map(({ circle, member }) => (
                <Pressable key={`${circle.id}-${member.userId}`} onPress={() => setPartnerId(member.userId === partnerId ? null : member.userId)} testID={`partner-${member.userId}`}>
                  <Card tint={partnerId === member.userId ? c.pill : undefined} style={{ paddingVertical: 12 }}>
                    <Row gap={12}>
                      <Avatar doodle={member.doodle} size={36} />
                      <View style={{ flex: 1 }}>
                        <Txt>{member.penName}</Txt>
                        <Txt v="tiny" soft>
                          dari Duo “{circle.name}”
                        </Txt>
                      </View>
                      {partnerId === member.userId ? <Doodle id="ui-centang" size={20} /> : null}
                    </Row>
                  </Card>
                </Pressable>
              ))}
              <Txt v="tiny" soft>
                {partnerId ? 'Orang yang kamu pilih ikut mendapat Plus Duo dari pembayaran ini.' : 'Tanpa pasangan dipilih, Plus Duo hanya berlaku untukmu dulu.'}
              </Txt>
            </View>
          ) : (
            <Txt v="small" soft>
              Plus Duo dibagi dengan orang di Duo-mu. Kamu belum punya Duo aktif, jadi untuk sekarang paket ini hanya berlaku untukmu.
            </Txt>
          )}
        </Section>
      ) : null}

      <Section title="bayar">
        {flow.phase === 'idle' || flow.phase === 'opening' ? (
          <View style={{ gap: SPACE.md }}>
            <MethodPicker value={method} onChange={setMethod} />
            <Button title={`bayar ${formatIdr(product.priceIdr)}`} onPress={pay} loading={busy} testID="plus-pay" />
            <PaymentStatus flow={flow} />
          </View>
        ) : (
          <PaymentStatus flow={flow} paidText={`Selamat datang di ${PLAN_NAME[me.user.plan === 'free' ? plan : me.user.plan]}. Hari-hari kalian kini punya ruang lebih lapang.`} />
        )}
        {flow.phase === 'paid' ? (
          <>
            <Gap h={SPACE.sm} />
            <Txt center testID="plan-now">
              paketmu sekarang: {PLAN_NAME[me.user.plan]}
              {me.user.planUntil ? ` · sampai ${formatDate(me.user.planUntil)}` : ''}
            </Txt>
            <Gap h={SPACE.sm} />
            <Button kind="ghost" title="kembali" onPress={() => (router.canGoBack() ? router.back() : router.replace('/aku'))} />
          </>
        ) : null}
      </Section>

      <Gap />
      <Note color="blue" icon="jendela">
        <View style={{ gap: 6 }}>
          <Txt v="small">{WEB_PAY_NOTE}</Txt>
          <Txt v="small">
            Tidak ada perpanjangan otomatis yang diam-diam. Kalau tidak kamu perpanjang, akunmu kembali ke Gratis di akhir periode, dan semua arsip tetap utuh.
          </Txt>
        </View>
      </Note>
      <Gap h={SPACE.xl} />
    </Screen>
  );
}
