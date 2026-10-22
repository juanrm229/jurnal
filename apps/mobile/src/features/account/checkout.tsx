/**
 * Pembayaran lewat web (QRIS, e-wallet, VA, kartu). Halaman bayar dibuka di
 * browser; setelah kembali, sesi dimuat ulang supaya paket baru langsung terlihat.
 */
import { type CheckoutResult, formatIdr, type OrderWire } from '@sehari/core';
import { useQueryClient } from '@tanstack/react-query';
import * as WebBrowser from 'expo-web-browser';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, View } from 'react-native';
import { api } from '@/lib/api';
import { useSession } from '@/lib/session';
import { Button, Card, Gap, Row, Txt } from '@/ui/kit';
import { Doodle } from '@/ui/Doodle';
import { SPACE, useTheme } from '@/ui/theme';
import { Choice, errMsg, TCard } from './kit';

export type PayMethod = 'qris' | 'ewallet' | 'va' | 'card';

export const PAY_METHODS: { value: PayMethod; label: string; hint: string }[] = [
  { value: 'qris', label: 'QRIS', hint: 'Pindai dari aplikasi bank atau e-wallet apa pun.' },
  { value: 'ewallet', label: 'e-wallet', hint: 'GoPay, OVO, DANA, ShopeePay.' },
  { value: 'va', label: 'virtual account', hint: 'Transfer dari m-banking atau ATM.' },
  { value: 'card', label: 'kartu', hint: 'Kartu debit atau kredit.' },
];

export interface CheckoutInput {
  product: string;
  method?: PayMethod;
  circleId?: string;
  partnerUserId?: string;
  year?: number;
}

export const WEB_PAY_NOTE =
  'Pembayaran dibuka di halaman web Sehari. Tanpa potongan toko aplikasi, jadi lebih banyak yang kembali untuk merawat arsip kalian.';

/** Buka halaman bayar. Di HP: browser dalam aplikasi (selesai saat ditutup). Di web: tab baru. */
export async function openPayment(url: string): Promise<void> {
  if (Platform.OS === 'web') {
    const w = typeof window !== 'undefined' ? window.open(url, '_blank') : null;
    if (!w && typeof window !== 'undefined') window.location.assign(url);
    return;
  }
  await WebBrowser.openBrowserAsync(url);
}

type Phase = 'idle' | 'opening' | 'waiting' | 'paid' | 'failed';

/**
 * Alur checkout: buat pesanan → buka halaman bayar → tunggu status lunas.
 * Status dicek ulang saat kembali dari browser, saat jendela kembali fokus,
 * dan berkala selama beberapa menit.
 */
export function useCheckout(onPaid?: (order: OrderWire) => void) {
  const { refresh } = useSession();
  const qc = useQueryClient();
  const [phase, setPhase] = useState<Phase>('idle');
  const [result, setResult] = useState<CheckoutResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [order, setOrder] = useState<OrderWire | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const paidRef = useRef(onPaid);
  paidRef.current = onPaid;

  const stop = () => {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
  };

  const check = useCallback(
    async (orderId?: string) => {
      const id = orderId ?? result?.orderId;
      if (!id) return;
      try {
        const orders = await api.get<OrderWire[]>('/billing/orders');
        const o = orders.find((x) => x.id === id);
        if (!o) return;
        setOrder(o);
        if (o.status === 'paid') {
          stop();
          setPhase('paid');
          await refresh().catch(() => null);
          void qc.invalidateQueries({ queryKey: ['orders'] });
          void qc.invalidateQueries({ queryKey: ['circles'] });
          paidRef.current?.(o);
        } else if (o.status === 'failed' || o.status === 'expired') {
          stop();
          setPhase('failed');
        }
      } catch {}
    },
    [result?.orderId, refresh, qc],
  );

  useEffect(() => {
    if (phase !== 'waiting' || Platform.OS !== 'web' || typeof window === 'undefined') return;
    const onFocus = () => void check();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [phase, check]);

  useEffect(() => stop, []);

  const start = async (input: CheckoutInput) => {
    setError(null);
    setPhase('opening');
    try {
      const res = await api.post<CheckoutResult>('/billing/checkout', { method: 'qris', ...input });
      setResult(res);
      setPhase('waiting');
      stop();
      let n = 0;
      timer.current = setInterval(() => {
        n += 1;
        if (n > 100) stop();
        void check(res.orderId);
      }, 3000);
      await openPayment(res.paymentUrl);
      // Di HP, openBrowserAsync selesai saat browser ditutup: langsung cek.
      if (Platform.OS !== 'web') await check(res.orderId);
    } catch (e) {
      setPhase('idle');
      setError(errMsg(e));
    }
  };

  const reset = () => {
    stop();
    setPhase('idle');
    setResult(null);
    setOrder(null);
    setError(null);
  };

  return { phase, result, order, error, start, check: () => check(), reopen: () => result && openPayment(result.paymentUrl), reset };
}

export function MethodPicker({ value, onChange }: { value: PayMethod; onChange: (m: PayMethod) => void }) {
  const hint = PAY_METHODS.find((m) => m.value === value)?.hint;
  return (
    <View style={{ gap: 6 }}>
      <Txt v="label" ink soft>
        cara bayar
      </Txt>
      <Choice options={PAY_METHODS} value={value} onChange={onChange} testID="pay-method" />
      {hint ? (
        <Txt v="tiny" soft>
          {hint}
        </Txt>
      ) : null}
    </View>
  );
}

/** Kartu status setelah halaman bayar dibuka. */
export function PaymentStatus({ flow, paidText }: { flow: ReturnType<typeof useCheckout>; paidText?: string }) {
  const { c } = useTheme();
  if (flow.phase === 'waiting') {
    return (
      <TCard style={{ gap: SPACE.sm, borderStyle: 'dashed', borderColor: c.inkSoft }} testID="payment-waiting">
        <Row gap={10}>
          <Doodle id="jam-pasir" size={28} />
          <View style={{ flex: 1 }}>
            <Txt ink>menunggu pembayaran…</Txt>
            <Txt v="tiny" soft>
              {flow.result ? `pesanan ${flow.result.orderId.slice(0, 8)} · halaman bayar terbuka di browser` : ''}
            </Txt>
          </View>
        </Row>
        <Button kind="soft" title="sudah bayar? cek lagi" onPress={() => void flow.check()} testID="payment-check" />
        <Button kind="ghost" title="buka lagi halaman bayar" onPress={() => void flow.reopen()} />
        <Button kind="ghost" title="batal" onPress={flow.reset} />
      </TCard>
    );
  }
  if (flow.phase === 'paid') {
    return (
      <TCard tint={c.sticky.green} style={{ gap: 6, alignItems: 'center' }} testID="payment-paid">
        <Doodle id="segel-lilin" size={40} color={c.text} />
        <Txt center>{paidText ?? 'Pembayaran diterima. Terima kasih sudah ikut merawat Sehari.'}</Txt>
        {flow.order ? (
          <Txt v="tiny" soft center>
            {formatIdr(flow.order.amountIdr)} · lunas
          </Txt>
        ) : null}
      </TCard>
    );
  }
  if (flow.phase === 'failed') {
    return (
      <Card style={{ gap: 6 }}>
        <Txt>Pembayarannya belum berhasil. Tidak apa-apa, kamu bisa mencoba lagi kapan saja.</Txt>
        <Gap h={4} />
        <Button kind="ghost" title="coba lagi" onPress={flow.reset} />
      </Card>
    );
  }
  return flow.error ? <Txt v="small" style={{ color: c.danger }}>{flow.error}</Txt> : null;
}
