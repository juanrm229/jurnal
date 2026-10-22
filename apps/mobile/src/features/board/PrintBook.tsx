/**
 * Cetak buku "Tahun Kita": pilih sampul → alamat → bayar (QRIS di web) →
 * persetujuan eksplisit → PDF dibuat di perangkat → dikirim ke percetakan.
 */
import { type CheckoutResult, formatIdr, fromBase64, type OrderWire, type Product } from '@sehari/core';
import { useQuery } from '@tanstack/react-query';
import * as Print from 'expo-print';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useState } from 'react';
import { Platform, Pressable, View } from 'react-native';
import { api } from '@/lib/api';
import { type CircleView, useKeyring } from '@/lib/data';
import { kv } from '@/lib/storage';
import { Doodle } from '@/ui/Doodle';
import { Button, Card, Field, Gap, Growing, Row, Toggle, Txt } from '@/ui/kit';
import { SPACE, useTheme } from '@/ui/theme';
import { buildBookHtml, collectBook } from './bookHtml';
import { errorText } from './shared';

type Step = 'choose' | 'ship' | 'paying' | 'consent' | 'making' | 'web' | 'done';

export interface BookOrderRef {
  orderId: string;
  circleId: string;
  year: number;
}

/**
 * OrderWire tidak membawa lingkaran & tahun buku, jadi pasangan pesanan→jilid
 * disimpan di perangkat ini supaya pesanan yang sudah dibayar bisa dilanjutkan.
 */
const ORDERS_KEY = 'board.bookOrders';
export async function bookOrderRefs(): Promise<BookOrderRef[]> {
  try {
    return (await kv.get<BookOrderRef[]>(ORDERS_KEY)) ?? [];
  } catch {
    return [];
  }
}
async function rememberOrder(ref: BookOrderRef) {
  const list = await bookOrderRefs();
  await kv.set(ORDERS_KEY, [...list.filter((x) => x.orderId !== ref.orderId), ref]);
}

export function useBookOrders(poll = false) {
  return useQuery({
    queryKey: ['orders'],
    queryFn: () => api.get<OrderWire[]>('/billing/orders'),
    refetchInterval: poll ? 3000 : false,
    select: (o) => o.filter((x) => x.product.startsWith('book_')),
  });
}

export function PrintBook({ circle, year, meId, resumeOrderId, onClose }: { circle: CircleView; year: number; meId: string; resumeOrderId?: string; onClose: () => void }) {
  const { c } = useTheme();
  const ring = useKeyring();
  const [step, setStep] = useState<Step>(resumeOrderId ? 'consent' : 'choose');
  const [product, setProduct] = useState<Product | null>(null);
  const [ship, setShip] = useState({ name: '', phone: '', address: '', city: '', postalCode: '' });
  const [orderId, setOrderId] = useState<string | null>(resumeOrderId ?? null);
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [html, setHtml] = useState<string | null>(null);
  const products = useQuery({ queryKey: ['products'], queryFn: () => api.get<Product[]>('/billing/products'), select: (p) => p.filter((x) => x.kind === 'book') });
  const orders = useBookOrders(step === 'paying');
  const order = orders.data?.find((o) => o.id === orderId);

  useEffect(() => {
    if (step === 'paying' && order?.status === 'paid') setStep(order.bookStatus === 'awaiting_file' || !order.bookStatus ? 'consent' : 'done');
  }, [step, order?.status, order?.bookStatus]);

  const shipOk = ship.name.trim() && ship.phone.trim().length >= 8 && ship.address.trim().length >= 10 && ship.city.trim() && /^\d{5}$/.test(ship.postalCode.trim());

  const checkout = async () => {
    if (!product) return;
    setBusy(true);
    setErr(null);
    try {
      const r = await api.post<CheckoutResult>('/billing/checkout', {
        product: product.code,
        circleId: circle.id,
        year,
        shipping: { name: ship.name.trim(), phone: ship.phone.trim(), address: ship.address.trim(), city: ship.city.trim(), postalCode: ship.postalCode.trim() },
        method: 'qris',
      });
      setOrderId(r.orderId);
      await rememberOrder({ orderId: r.orderId, circleId: circle.id, year });
      setStep('paying');
      await WebBrowser.openBrowserAsync(r.paymentUrl).catch(() => {});
      void orders.refetch();
    } catch (e) {
      setErr(errorText(e));
    } finally {
      setBusy(false);
    }
  };

  const upload = async (bytes: Uint8Array) => {
    await api.upload(`/billing/orders/${orderId}/book-file?consent=1`, bytes, 'application/pdf');
    void orders.refetch();
    setStep('done');
  };

  const make = async () => {
    if (!ring || !orderId) return;
    setBusy(true);
    setErr(null);
    setStep('making');
    try {
      const book = await collectBook(circle, year, ring, meId);
      const doc = buildBookHtml(book);
      setHtml(doc);
      if (Platform.OS === 'web') {
        // expo-print di web tidak menghasilkan berkas: buka dialog cetak untuk HTML buku ini.
        printHtmlOnWeb(doc);
        setStep('web');
        return;
      }
      const file = await Print.printToFileAsync({ html: doc, base64: true });
      if (!file?.base64) throw new Error('Berkas PDF tidak terbentuk di perangkat ini.');
      await upload(fromBase64(file.base64));
    } catch (e) {
      setErr(errorText(e));
      setStep('consent');
    } finally {
      setBusy(false);
    }
  };

  const pickPdfOnWeb = () => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/pdf';
    input.onchange = async () => {
      const f = input.files?.[0];
      if (!f) return;
      setBusy(true);
      setErr(null);
      try {
        await upload(new Uint8Array(await f.arrayBuffer()));
      } catch (e) {
        setErr(errorText(e));
      } finally {
        setBusy(false);
      }
    };
    input.click();
  };

  const title = `${circle.name} · ${year}`;

  return (
    <Card style={{ gap: SPACE.sm }} testID="print-flow">
      <Row>
        <Doodle id="ui-cetak" size={28} />
        <View style={{ flex: 1 }}>
          <Txt v="h2" ink>
            cetak buku
          </Txt>
          <Txt v="tiny" soft>
            {title}
          </Txt>
        </View>
      </Row>

      {step === 'choose' ? (
        products.isLoading ? (
          <Growing />
        ) : (
          <>
            {(products.data ?? []).map((p) => {
              const on = product?.code === p.code;
              return (
                <Pressable
                  key={p.code}
                  onPress={() => setProduct(p)}
                  testID={`book-${p.code}`}
                  style={{ borderRadius: 14, borderWidth: on ? 2 : 1, borderColor: on ? c.ink : c.inkSoft, backgroundColor: on ? c.pill : c.paper, padding: 12 }}>
                  <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <View style={{ flex: 1 }}>
                      <Txt ink>{p.code === 'book_hardcover' ? 'hardcover' : 'sampul lunak'}</Txt>
                      <Txt v="tiny" soft>
                        {p.description}
                      </Txt>
                    </View>
                    <Txt v="small" ink>
                      {formatIdr(p.priceIdr)}
                    </Txt>
                  </Row>
                </Pressable>
              );
            })}
            <Button title="lanjut ke alamat" onPress={() => setStep('ship')} disabled={!product} testID="book-next" />
          </>
        )
      ) : null}

      {step === 'ship' ? (
        <>
          <Field label="nama penerima" value={ship.name} onChangeText={(v) => setShip({ ...ship, name: v })} testID="ship-name" />
          <Field label="nomor hp" value={ship.phone} onChangeText={(v) => setShip({ ...ship, phone: v })} keyboardType="phone-pad" testID="ship-phone" />
          <Field label="alamat" value={ship.address} onChangeText={(v) => setShip({ ...ship, address: v })} multiline style={{ minHeight: 80 }} testID="ship-address" />
          <Row gap={8}>
            <View style={{ flex: 1 }}>
              <Field label="kota" value={ship.city} onChangeText={(v) => setShip({ ...ship, city: v })} testID="ship-city" />
            </View>
            <View style={{ width: 120 }}>
              <Field label="kode pos" value={ship.postalCode} onChangeText={(v) => setShip({ ...ship, postalCode: v.replace(/\D/g, '').slice(0, 5) })} keyboardType="number-pad" testID="ship-postal" />
            </View>
          </Row>
          <Txt v="tiny" soft>
            Alamat dipakai untuk pengiriman saja. Pembayaran lewat QRIS di halaman web.
          </Txt>
          <Button title={product ? `bayar ${formatIdr(product.priceIdr)}` : 'bayar'} onPress={checkout} disabled={!shipOk} loading={busy} testID="book-pay" />
          <Button kind="ghost" title="kembali" onPress={() => setStep('choose')} style={{ minHeight: 40 }} />
        </>
      ) : null}

      {step === 'paying' ? (
        <View style={{ alignItems: 'center', gap: SPACE.sm }} testID="book-paying">
          <Growing label="menunggu pembayaran…" />
          <Txt v="small" soft center>
            Selesaikan pembayaran di halaman yang terbuka. Layar ini lanjut sendiri setelah pembayaran diterima.
          </Txt>
          <Button kind="ghost" title="sudah bayar? cek lagi" onPress={() => orders.refetch()} style={{ minHeight: 40 }} />
        </View>
      ) : null}

      {step === 'consent' ? (
        <View style={{ gap: SPACE.sm }} testID="book-consent">
          <Card tint={c.sticky.peach} style={{ padding: 14, borderRadius: 14, gap: 6 }}>
            <Txt v="h2">sebelum dikirim ke percetakan</Txt>
            <Txt v="small">Isi buku akan dibaca percetakan. Bagian ini tidak lagi end-to-end.</Txt>
            <Txt v="tiny">
              · PDF dibuat di perangkatmu dari isi yang sudah dibuka di sini.{'\n'}· Isinya termasuk tulisan anggota lain di jilid ini. Pastikan mereka setuju.{'\n'}· Drop "hanya aku" dan Ruang Hening tidak ikut dicetak. Catatan kaki hanya ikut bila pemiliknya memilih "ikut cetak".
            </Txt>
          </Card>
          <Toggle label="aku mengerti dan setuju" value={agree} onChange={setAgree} testID="book-agree" />
          <Button title="buat PDF & kirim" onPress={make} disabled={!agree || !ring} loading={busy} testID="book-make" />
        </View>
      ) : null}

      {step === 'making' ? <Growing label="menyusun halaman demi halaman…" /> : null}

      {step === 'web' ? (
        <View style={{ gap: SPACE.sm }} testID="book-web">
          <Txt v="small">
            Di versi web, PDF tidak bisa dibuat otomatis. Dialog cetak sudah dibuka untuk isi buku ini: pilih "Simpan sebagai PDF", lalu unggah berkasnya di sini. Dari aplikasi HP, langkah ini berjalan sendiri.
          </Txt>
          <Button kind="soft" title="buka dialog cetak lagi" onPress={() => html && printHtmlOnWeb(html)} />
          <Button title="unggah PDF yang sudah disimpan" onPress={pickPdfOnWeb} loading={busy} testID="book-upload" />
        </View>
      ) : null}

      {step === 'done' ? (
        <View style={{ alignItems: 'center', gap: 6 }} testID="book-done">
          <Doodle id="kado" size={44} />
          <Txt v="h2" ink center>
            berkasnya sudah sampai di percetakan
          </Txt>
          <Txt v="small" soft center>
            Jilid ini sedang dicetak. Kabar pengirimannya ada di daftar pesanan.
          </Txt>
        </View>
      ) : null}

      {err ? (
        <Txt v="tiny" style={{ color: c.danger }}>
          {err}
        </Txt>
      ) : null}
      {step !== 'making' ? <Button kind="ghost" title={step === 'done' ? 'tutup' : 'batal'} onPress={onClose} style={{ minHeight: 40 }} /> : null}
      <Gap h={0} />
    </Card>
  );
}

function printHtmlOnWeb(html: string) {
  if (typeof document === 'undefined') return;
  const frame = document.createElement('iframe');
  frame.style.position = 'fixed';
  frame.style.right = '0';
  frame.style.bottom = '0';
  frame.style.width = '0';
  frame.style.height = '0';
  frame.style.border = '0';
  document.body.appendChild(frame);
  const doc = frame.contentWindow?.document;
  if (!doc) return;
  doc.open();
  doc.write(html);
  doc.close();
  setTimeout(() => {
    try {
      frame.contentWindow?.focus();
      frame.contentWindow?.print();
    } finally {
      setTimeout(() => frame.remove(), 60_000);
    }
  }, 300);
}
