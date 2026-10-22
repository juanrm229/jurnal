/**
 * Puisi Temuan (blackout poetry): kata-kata lingkaran selama seminggu jadi
 * selembar teks. Hitamkan kata demi kata sampai tersisa puisi kalian sendiri.
 */
import { blackoutSource, formatDayLong, isoWeek, weekRange } from '@sehari/core';
import { useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { authoredTexts, errorText, nameIn } from '@/features/board/shared';
import { nowParts, useCircle, useCircleRange, useCreateDrop, useMe, useOpenDrops, useToday } from '@/lib/data';
import { Doodle } from '@/ui/Doodle';
import { Button, Card, Empty, Gap, Growing, Header, Row, Screen, Section, Sticky, Txt } from '@/ui/kit';
import { FONTS, SPACE, useTheme } from '@/ui/theme';

const MIN_WORDS = 24;

export default function Puisi() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const me = useMe();
  const { c } = useTheme();
  const today = useToday();
  const circle = useCircle(id);
  const { start, end } = weekRange(isoWeek(today));
  const to = end < today ? end : today;
  const range = useCircleRange(id, start, to, !!circle);
  const opened = useOpenDrops(range.data?.drops);
  const create = useCreateDrop();
  const [black, setBlack] = useState<Set<number>>(new Set());
  const [saved, setSaved] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const words = useMemo(() => blackoutSource(authoredTexts(opened, { kinds: ['text', 'idea', 'word', 'answer', 'card', 'expedition', 'last_line', 'prologue', 'epilogue'] })), [opened]);
  const poems = opened.filter((d) => d.wire.kind === 'blackout' && d.payload?.text);
  const kept = words.filter((_, i) => !black.has(i));
  const poem = kept.join(' ');

  if (!circle) return <Screen header={<Header title="Puisi Temuan" />}><Growing /></Screen>;

  const toggle = (i: number) =>
    setBlack((s) => {
      const n = new Set(s);
      if (n.has(i)) n.delete(i);
      else n.add(i);
      return n;
    });

  const save = async () => {
    setErr(null);
    const { hour, minute } = nowParts(me.user.tz);
    try {
      await create.mutateAsync({ day: today, audience: 'circle', circleIds: [id], payload: { v: 1, kind: 'blackout', text: poem, hour, minute, tz: me.user.tz } });
      setSaved(poem);
      setBlack(new Set());
      void range.refetch();
    } catch (e) {
      setErr(errorText(e));
    }
  };

  const canSave = kept.length >= 2 && black.size >= 1;

  return (
    <Screen header={<Header title="Puisi Temuan" subtitle={`${formatDayLong(start, false)} – ${formatDayLong(end)}`} />}>
      {range.isLoading ? (
        <Growing label="mengumpulkan kata seminggu…" />
      ) : words.length < MIN_WORDS ? (
        <Empty
          doodle="pena"
          title="kata-katanya masih sedikit"
          body={`Minggu ini baru ada ${words.length} kata yang terbuka di lingkaran. Puisi temuan butuh selembar teks dulu — tulis-tulis kecil sepanjang minggu sudah cukup.${range.data?.locked.length ? ' Kata-kata teman terbuka setelah kamu menyegel harimu.' : ' Coba lagi menjelang akhir pekan.'}`}
        />
      ) : (
        <>
          <Txt v="small" soft center>
            Ketuk kata untuk menghitamkannya. Yang tersisa adalah puisimu.
          </Txt>
          <Gap h={SPACE.md} />
          <View testID="blackout-sheet" style={{ backgroundColor: c.cardEdge, borderRadius: 6, padding: SPACE.md, borderWidth: 1, borderColor: c.cardEdge, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } }}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: 6 }}>
              {words.map((w, i) => {
                const off = black.has(i);
                return (
                  <Pressable key={i} onPress={() => toggle(i)} testID={`word-${i}`} accessibilityRole="button" accessibilityLabel={off ? `kembalikan ${w}` : `hitamkan ${w}`} style={{ marginRight: 6 }}>
                    <View style={{ backgroundColor: off ? c.text : 'transparent', borderRadius: 2, paddingHorizontal: 2 }}>
                      <Txt style={{ fontFamily: FONTS.mono, fontSize: 15, lineHeight: 22, color: c.text }}>{w}</Txt>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>
          <Row style={{ justifyContent: 'center', marginTop: SPACE.sm }} gap={8}>
            <Button kind="ghost" title="hitamkan semua" onPress={() => setBlack(new Set(words.map((_, i) => i)))} style={{ width: 'auto', minHeight: 40, paddingHorizontal: 14 }} testID="blackout-all" />
            <Button kind="ghost" title="mulai lagi" onPress={() => setBlack(new Set())} style={{ width: 'auto', minHeight: 40, paddingHorizontal: 14 }} />
          </Row>
          <Txt v="tiny" soft center style={{ marginTop: 6 }}>
            tip: hitamkan semua dulu, lalu ketuk kata yang ingin kamu selamatkan
          </Txt>

          {black.size ? (
            <Sticky color="yellow" tilt={-1} style={{ marginTop: SPACE.lg }}>
              <Txt v="label">puisimu</Txt>
              <Txt v="hand" style={{ fontSize: 26, lineHeight: 32, marginTop: 4 }} testID="blackout-poem">
                {poem || '…'}
              </Txt>
            </Sticky>
          ) : null}
          <Gap h={SPACE.md} />
          <Button title="simpan ke kitab" icon="buku" onPress={save} disabled={!canSave} loading={create.isPending} testID="blackout-save" />
          {err ? (
            <Txt v="tiny" style={{ color: c.danger, marginTop: 6 }}>
              {err}
            </Txt>
          ) : null}
        </>
      )}

      {saved ? (
        <Card tint={c.pill} style={{ marginTop: SPACE.md, alignItems: 'center', gap: 4 }} testID="blackout-saved">
          <Doodle id="ui-centang" size={28} />
          <Txt v="small" center>
            Puisinya sudah masuk kitab minggu ini.
          </Txt>
        </Card>
      ) : null}

      {poems.length ? (
        <Section title="puisi minggu ini">
          <View style={{ gap: SPACE.sm }}>
            {poems.map((d) => (
              <Card key={d.wire.id}>
                <Txt v="hand" style={{ fontSize: 24, lineHeight: 30 }}>
                  {d.payload!.text}
                </Txt>
                <Txt v="tiny" soft style={{ marginTop: 4 }}>
                  ditemukan {nameIn(circle, d.wire.authorId, me.user.id)} · {formatDayLong(d.wire.day, false)}
                </Txt>
              </Card>
            ))}
          </View>
        </Section>
      ) : null}
    </Screen>
  );
}
