/**
 * Rak Perpustakaan: setiap jilid Tahun Kita dari semua lingkaranmu berjejer
 * sebagai punggung buku. Sepuluh tahun bersahabat, sepuluh jilid.
 */
import type { VolumeWire } from '@sehari/core';
import { useQueries } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { type LayoutChangeEvent, Pressable, View } from 'react-native';
import { type BookOrderRef, bookOrderRefs, PrintBook, useBookOrders } from '@/features/board/PrintBook';
import { coverTint, CoverPatternArt, genreById, unit } from '@/features/board/shared';
import { api } from '@/lib/api';
import { type CircleView, useCircles, useMe } from '@/lib/data';
import { Doodle } from '@/ui/Doodle';
import { Button, Card, Empty, Gap, Growing, Header, Row, Screen, Section, Txt } from '@/ui/kit';
import { FONTS, mix, SPACE, useTheme } from '@/ui/theme';

interface Volume {
  key: string;
  circle: CircleView;
  year: number;
  genreId: string | null;
}

const SPINE_W = 50;
const SPINE_H = 172;

export default function Rak() {
  const me = useMe();
  const { c } = useTheme();
  const { circles, isLoading } = useCircles();
  const shelfCircles = circles.filter((x) => x.kind !== 'moment' || x.status === 'ended');
  const vols = useQueries({
    queries: shelfCircles.map((x) => ({ queryKey: ['volumes', x.id], queryFn: () => api.get<VolumeWire[]>(`/circles/${x.id}/volumes`) })),
  });
  const [picked, setPicked] = useState<string | null>(null);
  const [printing, setPrinting] = useState<{ key: string; resume?: string } | null>(null);
  const [w, setW] = useState(0);
  const orders = useBookOrders();
  const [refs, setRefs] = useState<BookOrderRef[]>([]);
  useEffect(() => {
    void bookOrderRefs().then(setRefs);
  }, [printing, orders.dataUpdatedAt]);

  const volumes = useMemo<Volume[]>(() => {
    const out: Volume[] = [];
    shelfCircles.forEach((circle, i) => {
      for (const v of vols[i]?.data ?? []) out.push({ key: `${circle.id}:${v.year}`, circle, year: v.year, genreId: v.genreId });
    });
    return out.sort((a, b) => a.year - b.year || a.circle.name.localeCompare(b.circle.name));
  }, [shelfCircles.map((x) => x.id).join(), vols.map((v) => v.dataUpdatedAt).join()]);

  const loading = isLoading || vols.some((v) => v.isLoading);
  const perShelf = w ? Math.max(3, Math.floor((w - 24) / (SPINE_W + 8))) : 5;
  const shelves: Volume[][] = [];
  for (let i = 0; i < volumes.length; i += perShelf) shelves.push(volumes.slice(i, i + perShelf));
  const sel = volumes.find((v) => v.key === picked);
  const waiting = (orders.data ?? []).filter((o) => o.status === 'paid' && o.bookStatus === 'awaiting_file');
  const waitingFor = (v: Volume) => waiting.find((o) => refs.some((r) => r.orderId === o.id && r.circleId === v.circle.id && r.year === v.year));
  const unmapped = waiting.filter((o) => !refs.some((r) => r.orderId === o.id));

  return (
    <Screen header={<Header title="Rak Perpustakaan" subtitle="setiap jilid Tahun Kita" />}>
      {loading ? (
        <Growing label="menata rak…" />
      ) : volumes.length === 0 ? (
        <Empty doodle="rak-buku" title="raknya masih kosong" body="Setiap lingkaran menulis satu jilid per tahun. Jilid pertama muncul di sini begitu lingkaran pertamamu mulai menulis." />
      ) : (
        <View onLayout={(e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width)} testID="rak-shelves" style={{ paddingTop: SPACE.md }}>
          {shelves.map((row, i) => (
            <View key={i} style={{ marginBottom: SPACE.lg }}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8, paddingHorizontal: 12, minHeight: SPINE_H + 6 }}>
                {row.map((v) => (
                  <Spine key={v.key} v={v} active={picked === v.key} onPress={() => setPicked(picked === v.key ? null : v.key)} />
                ))}
                {i === shelves.length - 1 ? (
                  <View style={{ marginLeft: 6, marginBottom: 4, opacity: 0.5 }}>
                    <Doodle id="tanaman-pot" size={44} />
                  </View>
                ) : null}
              </View>
              <View style={{ height: 10, borderRadius: 3, backgroundColor: c.aged, borderWidth: 1, borderColor: mix(c.aged, c.text, 0.25) }} />
              <View style={{ height: 6, marginHorizontal: 8, backgroundColor: c.text, opacity: 0.07, borderBottomLeftRadius: 4, borderBottomRightRadius: 4 }} />
            </View>
          ))}
        </View>
      )}

      {sel ? (
        printing?.key === sel.key ? (
          <PrintBook circle={sel.circle} year={sel.year} meId={me.user.id} resumeOrderId={printing.resume} onClose={() => setPrinting(null)} />
        ) : (
          <VolumeCard v={sel} waiting={!!waitingFor(sel)} onOpen={() => router.push(`/wrap/${sel.circle.id}/year/${sel.year}`)} onPrint={() => setPrinting({ key: sel.key, resume: waitingFor(sel)?.id })} />
        )
      ) : volumes.length ? (
        <Txt v="tiny" soft center>
          ketuk punggung buku untuk membuka atau mencetaknya
        </Txt>
      ) : null}

      {unmapped.length && sel && printing?.key !== sel.key ? (
        <Card tint={c.sticky.yellow} style={{ marginTop: SPACE.md, gap: 6 }}>
          <Txt v="small">Ada {unmapped.length} pesanan buku yang sudah dibayar dan menunggu berkas. Kalau itu untuk jilid ini, lanjutkan dari sini.</Txt>
          <Button kind="soft" title="lanjutkan untuk jilid ini" onPress={() => setPrinting({ key: sel.key, resume: unmapped[0]!.id })} style={{ minHeight: 44 }} />
        </Card>
      ) : null}

      {orders.data?.length ? (
        <Section title="pesanan buku">
          {orders.data.map((o) => {
            const ref = refs.find((r) => r.orderId === o.id);
            const circle = ref ? circles.find((x) => x.id === ref.circleId) : undefined;
            const status =
              o.status === 'pending' ? 'menunggu pembayaran' : o.status !== 'paid' ? 'tidak jadi' : o.bookStatus === 'awaiting_file' ? 'menunggu berkas' : o.bookStatus === 'printing' ? 'sedang dicetak' : o.bookStatus === 'shipped' ? 'dalam perjalanan' : 'dibayar';
            return (
              <Row key={o.id} style={{ paddingVertical: 6 }}>
                <Doodle id="buku" size={22} />
                <View style={{ flex: 1 }}>
                  <Txt v="small">{circle && ref ? `${circle.name} · ${ref.year}` : o.product === 'book_hardcover' ? 'Buku hardcover' : 'Buku sampul lunak'}</Txt>
                  <Txt v="tiny" soft>
                    {status}
                  </Txt>
                </View>
              </Row>
            );
          })}
        </Section>
      ) : null}
      <Gap />
    </Screen>
  );
}

function Spine({ v, active, onPress }: { v: Volume; active: boolean; onPress: () => void }) {
  const { c } = useTheme();
  const g = genreById(v.genreId);
  const h = SPINE_H - Math.round(unit(v.key) * 22);
  const tint = g ? coverTint(c, g.cover.pattern) : mix(c.card, c.pill, 0.35);
  return (
    <Pressable
      onPress={onPress}
      testID={`spine-${v.circle.id}-${v.year}`}
      accessibilityRole="button"
      accessibilityLabel={`${v.circle.name} ${v.year}${g ? `, ${g.name}` : ''}`}
      style={({ pressed }) => ({ transform: [{ translateY: active ? -10 : pressed ? -4 : 0 }] })}>
      <View style={{ width: SPINE_W, height: h, borderRadius: 4, backgroundColor: tint, borderWidth: active ? 2 : 1, borderColor: active ? c.ink : mix(tint, c.text, 0.2), overflow: 'hidden', alignItems: 'center', paddingVertical: 8 }}>
        <CoverPatternArt pattern={g?.cover.pattern} width={SPINE_W} height={h} color={c.ink} opacity={0.18} />
        <View style={{ height: 1.5, width: SPINE_W - 12, backgroundColor: c.ink, opacity: 0.5 }} />
        <Txt v="tiny" ink style={{ marginTop: 4, fontFamily: FONTS.monoMedium }}>
          {v.year}
        </Txt>
        <View style={{ flex: 1, width: SPINE_W, alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ width: h - 80, transform: [{ rotate: '-90deg' }] }}>
            <Txt v="small" ink numberOfLines={1} center style={{ fontSize: 12 }}>
              {v.circle.name}
            </Txt>
          </View>
        </View>
        <Doodle id={g?.cover.doodle ?? v.circle.doodle} size={22} />
        <View style={{ height: 1.5, width: SPINE_W - 12, backgroundColor: c.ink, opacity: 0.5, marginTop: 6 }} />
      </View>
    </Pressable>
  );
}

function VolumeCard({ v, waiting, onOpen, onPrint }: { v: Volume; waiting: boolean; onOpen: () => void; onPrint: () => void }) {
  const g = genreById(v.genreId);
  return (
    <Card style={{ gap: SPACE.sm }} testID="rak-volume">
      <View>
        <Txt v="label" ink soft>
          jilid {v.year}
        </Txt>
        <Txt v="h2" ink>
          {v.circle.name} · {v.year}
        </Txt>
        <Txt v="small" soft>
          {g ? `${g.name} — ${g.blurb}` : 'Genre belum dipilih. Bisa dipilih bersama di Kitab sebelum dicetak.'}
        </Txt>
      </View>
      <Button title="buka Tahun Kita" icon="buku" onPress={onOpen} testID="rak-open" />
      <Button kind="soft" title={waiting ? 'lanjutkan cetak (sudah dibayar)' : 'cetak buku'} icon="ui-cetak" onPress={onPrint} testID="rak-print" />
      {!g ? (
        <Button kind="ghost" title="pilih genre di Kitab" onPress={() => router.push(`/l/${v.circle.id}/kitab`)} style={{ minHeight: 40 }} />
      ) : null}
    </Card>
  );
}
