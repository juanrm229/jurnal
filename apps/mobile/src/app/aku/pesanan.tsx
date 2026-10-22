import { findProduct, formatIdr, type OrderStatus, type OrderWire } from '@sehari/core';
import { useQuery } from '@tanstack/react-query';
import * as Clipboard from 'expo-clipboard';
import * as WebBrowser from 'expo-web-browser';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { RefreshControl, View } from 'react-native';
import { formatDate, Note, TCard } from '@/features/account/kit';
import { api } from '@/lib/api';
import { useSession } from '@/lib/session';
import { shareText } from '@/lib/share';
import { Doodle } from '@/ui/Doodle';
import { Button, Card, Empty, ErrorNote, Gap, Growing, Header, Row, Screen, Txt } from '@/ui/kit';
import { SPACE, useTheme } from '@/ui/theme';

const STATUS: Record<OrderStatus, string> = {
  pending: 'menunggu pembayaran',
  paid: 'lunas',
  expired: 'kedaluwarsa',
  failed: 'belum berhasil',
  refunded: 'dikembalikan',
};

const BOOK: Record<NonNullable<OrderWire['bookStatus']>, string> = {
  awaiting_file: 'menunggu berkas cetak dari perangkatmu',
  printing: 'sedang dicetak',
  shipped: 'dalam perjalanan ke rumahmu',
};

function iconFor(product: string): string {
  if (product.startsWith('gift_')) return 'kado';
  if (product.startsWith('book_')) return 'buku';
  if (product.startsWith('moment_')) return 'kembang-api';
  if (product.startsWith('deck_')) return 'kartu';
  return 'segel-lilin';
}

function GiftCode({ code }: { code: string }) {
  const { c } = useTheme();
  const [copied, setCopied] = useState(false);
  return (
    <View style={{ backgroundColor: c.sticky.yellow, borderRadius: 6, padding: SPACE.sm, gap: 6, marginTop: SPACE.sm }}>
      <Txt v="tiny">kode hadiah</Txt>
      <Txt v="title" style={{ letterSpacing: 3 }} selectable testID="gift-code">
        {code}
      </Txt>
      <Row gap={8}>
        <Button
          kind="ghost"
          title={copied ? 'tersalin' : 'salin'}
          onPress={() => {
            void Clipboard.setStringAsync(code);
            setCopied(true);
          }}
          style={{ flex: 1, minHeight: 40 }}
        />
        <Button
          kind="ghost"
          title="bagikan"
          icon="ui-bagikan"
          onPress={() => void shareText(`Ada hadiah kecil untukmu: Sehari Plus. Tukar kode ${code} di Aku → Hadiah & kode.`)}
          style={{ flex: 1, minHeight: 40 }}
        />
      </Row>
    </View>
  );
}

export default function Orders() {
  const { status, order } = useLocalSearchParams<{ status?: string; order?: string }>();
  const { refresh } = useSession();
  const { c } = useTheme();
  const q = useQuery({ queryKey: ['orders'], queryFn: () => api.get<OrderWire[]>('/billing/orders') });
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current || !status) return;
    handled.current = true;
    if (status === 'berhasil') {
      void refresh().catch(() => null);
      void q.refetch();
    }
  }, [status, refresh, q]);

  const highlight = order ? q.data?.find((o) => o.id === order) : undefined;

  return (
    <Screen header={<Header title="pesanan" />} refreshControl={<RefreshControl refreshing={q.isRefetching} onRefresh={() => void q.refetch()} />}>
      {status === 'berhasil' ? (
        <>
          <Note color="green" icon="segel-lilin" testID="order-success">
            {highlight && highlight.status !== 'paid'
              ? 'Pembayaran sedang dikonfirmasi. Biasanya hanya beberapa detik; tarik ke bawah untuk memuat ulang.'
              : 'Pembayaran berhasil. Terima kasih sudah ikut merawat Sehari.'}
          </Note>
          <Gap />
        </>
      ) : status === 'gagal' ? (
        <>
          <Note color="peach">Pembayarannya belum berhasil. Tidak apa-apa, kamu bisa mencobanya lagi kapan saja. Kalau saldo sudah terpotong, kabari kami lewat Bantuan.</Note>
          <Gap />
        </>
      ) : null}

      {q.isLoading ? (
        <Growing />
      ) : q.error ? (
        <ErrorNote error={q.error} onRetry={() => q.refetch()} />
      ) : !q.data?.length ? (
        <Empty doodle="tiket" title="Belum ada pesanan" body="Buku tahunan, hadiah, dan dek kartu yang kamu beli akan tercatat di sini." action={<Button kind="ghost" title="lihat Sehari Plus" onPress={() => router.push('/plus')} />} />
      ) : (
        <View style={{ gap: SPACE.sm }}>
          {q.data.map((o) => {
            const p = findProduct(o.product);
            return (
              <TCard key={o.id} testID={`order-${o.id}`} style={o.id === order ? { borderColor: c.ink } : undefined}>
                <Row gap={12} style={{ alignItems: 'flex-start' }}>
                  <Doodle id={iconFor(o.product)} size={30} />
                  <View style={{ flex: 1, gap: 2 }}>
                    <Txt>{p?.name ?? o.product}</Txt>
                    <Txt v="tiny" soft>
                      {formatDate(o.createdAt, true)} · {formatIdr(o.amountIdr)}
                    </Txt>
                    {o.bookStatus ? (
                      <Txt v="tiny" ink>
                        buku: {BOOK[o.bookStatus]}
                      </Txt>
                    ) : null}
                  </View>
                  <View style={{ backgroundColor: o.status === 'paid' ? c.pill : c.paper, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 }}>
                    <Txt v="tiny" ink={o.status === 'paid'} soft={o.status !== 'paid'} testID={`order-status-${o.id}`}>
                      {STATUS[o.status]}
                    </Txt>
                  </View>
                </Row>
                {o.giftCode && !o.giftRedeemed ? <GiftCode code={o.giftCode} /> : null}
                {o.giftCode && o.giftRedeemed ? (
                  <Txt v="tiny" soft>
                    kode hadiah sudah dipakai
                  </Txt>
                ) : null}
                {o.status === 'pending' && o.paymentUrl ? (
                  <Button kind="soft" title="lanjutkan bayar" onPress={() => WebBrowser.openBrowserAsync(o.paymentUrl!)} style={{ marginTop: SPACE.sm }} testID={`order-pay-${o.id}`} />
                ) : null}
              </TCard>
            );
          })}
          <Txt v="tiny" soft center style={{ marginTop: SPACE.sm }}>
            Pesanan yang menunggu pembayaran akan kedaluwarsa sendiri. Tidak ada yang ditagih sampai kamu menyelesaikannya.
          </Txt>
        </View>
      )}
      <Gap h={SPACE.xl} />
    </Screen>
  );
}
