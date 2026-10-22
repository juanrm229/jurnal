import { formatIdr, getProduct, type PlanCode } from '@sehari/core';
import * as Clipboard from 'expo-clipboard';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { MethodPicker, type PayMethod, PaymentStatus, useCheckout, WEB_PAY_NOTE } from '@/features/account/checkout';
import { errMsg, formatDate, Note } from '@/features/account/kit';
import { api } from '@/lib/api';
import { useSession } from '@/lib/session';
import { shareText } from '@/lib/share';
import { Doodle } from '@/ui/Doodle';
import { Button, Card, Field, Gap, Header, Row, Screen, Section, Txt } from '@/ui/kit';
import { SPACE, useTheme } from '@/ui/theme';

const GIFTS = ['gift_plus_yearly', 'gift_plus_duo_yearly'] as const;
const PLAN_NAME: Record<PlanCode, string> = { free: 'Gratis', plus: 'Plus', plus_duo: 'Plus Duo' };

function GiftCodeNote({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Note color="yellow">
      <View style={{ gap: 6 }}>
        <Txt v="small">Kodenya sudah jadi. Berikan dengan caramu sendiri: di kartu ucapan, di pesan, atau dibisikkan.</Txt>
        <Txt v="title" style={{ letterSpacing: 3 }} selectable testID="gift-new-code">
          {code}
        </Txt>
        <Row gap={8}>
          <Button kind="ghost" title={copied ? 'tersalin' : 'salin'} onPress={() => { void Clipboard.setStringAsync(code); setCopied(true); }} style={{ flex: 1, minHeight: 40 }} />
          <Button kind="ghost" title="bagikan" icon="ui-bagikan" onPress={() => void shareText(`Ada hadiah kecil untukmu: Sehari Plus. Tukar kode ${code} di Aku → Hadiah & kode.`)} style={{ flex: 1, minHeight: 40 }} />
        </Row>
      </View>
    </Note>
  );
}

function BuyGift() {
  const { c } = useTheme();
  const [product, setProduct] = useState<(typeof GIFTS)[number]>('gift_plus_yearly');
  const [method, setMethod] = useState<PayMethod>('qris');
  const [code, setCode] = useState<string | null>(null);
  const flow = useCheckout((o) => setCode(o.giftCode));
  const p = getProduct(product)!;
  return (
    <View style={{ gap: SPACE.md }}>
      <View style={{ gap: SPACE.sm }}>
        {GIFTS.map((g) => {
          const x = getProduct(g)!;
          const on = g === product;
          return (
            <Pressable key={g} onPress={() => setProduct(g)} testID={`gift-${g}`} accessibilityRole="radio" accessibilityState={{ checked: on }}>
              <Card tint={on ? c.pill : undefined} style={{ borderColor: on ? c.ink : c.cardEdge }}>
                <Row gap={12}>
                  <Doodle id={g === 'gift_plus_yearly' ? 'kado' : 'pita'} size={32} />
                  <View style={{ flex: 1 }}>
                    <Txt>{x.name}</Txt>
                    <Txt v="tiny" soft>
                      {x.description}
                    </Txt>
                  </View>
                  <Txt ink>{formatIdr(x.priceIdr)}</Txt>
                </Row>
              </Card>
            </Pressable>
          );
        })}
      </View>
      {flow.phase === 'idle' || flow.phase === 'opening' ? (
        <>
          <MethodPicker value={method} onChange={setMethod} />
          <Button title={`beli hadiah ${formatIdr(p.priceIdr)}`} onPress={() => void flow.start({ product, method })} loading={flow.phase === 'opening'} testID="gift-pay" />
          <PaymentStatus flow={flow} />
        </>
      ) : (
        <PaymentStatus flow={flow} paidText="Hadiahnya siap. Kode juga tersimpan di Pesanan kalau nanti kamu lupa." />
      )}
      {code ? <GiftCodeNote code={code} /> : null}
      <Txt v="tiny" soft>
        Kode berlaku sampai ditukar, dan tidak diperpanjang otomatis. {WEB_PAY_NOTE}
      </Txt>
    </View>
  );
}

function Redeem() {
  const { me, refresh } = useSession();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const run = async () => {
    setBusy(true);
    setErr(null);
    setDone(null);
    try {
      const r = await api.post<{ ok: true; plan: PlanCode }>('/billing/redeem', { code: code.trim().toUpperCase() });
      const m = await refresh();
      const until = m?.user.planUntil ?? me?.user.planUntil;
      setDone(`Hadiahnya sudah terbuka. ${PLAN_NAME[r.plan]} aktif${until ? ` sampai ${formatDate(until)}` : ''}.`);
      setCode('');
    } catch (e) {
      setErr(errMsg(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <View style={{ gap: SPACE.sm }}>
      <Field
        label="kode hadiah"
        value={code}
        onChangeText={setCode}
        autoCapitalize="characters"
        autoCorrect={false}
        placeholder="XXXX-XXXX-XXXX"
        style={{ letterSpacing: 2 }}
        testID="redeem-code"
      />
      <Button title="tukar kode" onPress={() => void run()} loading={busy} disabled={code.trim().length < 6} testID="redeem-submit" />
      {done ? (
        <Note color="green" icon="kado" testID="redeem-done">
          {done}
        </Note>
      ) : null}
      {err ? <Txt v="small">{err}</Txt> : null}
    </View>
  );
}

export default function Gifts() {
  return (
    <Screen header={<Header title="hadiah & kode" />}>
      <View style={{ alignItems: 'center', gap: 6, marginTop: SPACE.sm }}>
        <Doodle id="kado" size={52} />
        <Txt v="hand" center>
          setahun hari-hari yang tersimpan
        </Txt>
      </View>
      <Section title="hadiahkan Plus">
        <BuyGift />
      </Section>
      <Section title="tukar kode hadiah">
        <Redeem />
      </Section>
      <Gap h={SPACE.xl} />
    </Screen>
  );
}
