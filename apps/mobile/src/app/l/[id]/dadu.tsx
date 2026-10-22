/**
 * Dadu Kenangan: sekali seminggu, lempar dadu untuk membuka satu hari acak
 * dari masa lalu lingkaran. Kebetulan membuat mengingat terasa seperti hadiah.
 */
import { COPY, dayName, type DiceRoll, formatDayLong, relativeDay } from '@sehari/core';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Platform, View } from 'react-native';
import { errorText, nameIn } from '@/features/board/shared';
import { api } from '@/lib/api';
import { useCircle, useCircleDay, useMe, useOpenDrops, useToday } from '@/lib/data';
import { Doodle } from '@/ui/Doodle';
import { DropCard, LockedCard } from '@/ui/DropCard';
import { Button, Card, ErrorNote, Gap, Growing, Header, Screen, Sticky, Txt } from '@/ui/kit';
import { SPACE, useTheme } from '@/ui/theme';

const native = Platform.OS !== 'web';

export default function Dadu() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const me = useMe();
  const { c } = useTheme();
  const today = useToday();
  const qc = useQueryClient();
  const circle = useCircle(id);
  const q = useQuery({ queryKey: ['dice', id], queryFn: () => api.get<DiceRoll | null>(`/circles/${id}/dice`), enabled: !!circle });
  const [rolling, setRolling] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const spin = useRef(new Animated.Value(0)).current;
  const hop = useRef(new Animated.Value(0)).current;

  // Dadu bernapas pelan selagi menunggu dilempar.
  useEffect(() => {
    if (q.data || rolling) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(hop, { toValue: 0.25, duration: 1200, easing: Easing.inOut(Easing.quad), useNativeDriver: native }),
        Animated.timing(hop, { toValue: 0, duration: 1200, easing: Easing.inOut(Easing.quad), useNativeDriver: native }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [q.data, rolling, hop]);

  const roll = async () => {
    setErr(null);
    setRolling(true);
    spin.setValue(0);
    const anim = Animated.parallel([
      Animated.timing(spin, { toValue: 1, duration: 1300, easing: Easing.out(Easing.cubic), useNativeDriver: native }),
      Animated.sequence([
        Animated.timing(hop, { toValue: 1, duration: 260, easing: Easing.out(Easing.quad), useNativeDriver: native }),
        Animated.timing(hop, { toValue: 0, duration: 300, easing: Easing.bounce, useNativeDriver: native }),
        Animated.timing(hop, { toValue: 0.5, duration: 200, easing: Easing.out(Easing.quad), useNativeDriver: native }),
        Animated.timing(hop, { toValue: 0, duration: 300, easing: Easing.bounce, useNativeDriver: native }),
      ]),
    ]);
    try {
      const [r] = await Promise.all([api.post<DiceRoll>(`/circles/${id}/dice`), new Promise((res) => anim.start(() => res(null)))]);
      qc.setQueryData(['dice', id], r);
    } catch (e) {
      setErr(errorText(e));
    } finally {
      setRolling(false);
    }
  };

  if (!circle || q.isLoading) return <Screen header={<Header title="Dadu Kenangan" />}><Growing /></Screen>;
  const r = q.data;
  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '1080deg'] });
  const translateY = hop.interpolate({ inputRange: [0, 1], outputRange: [0, -60] });

  return (
    <Screen header={<Header title="Dadu Kenangan" subtitle={circle.name} />}>
      {q.error ? <ErrorNote error={q.error} onRetry={() => q.refetch()} /> : null}
      <View style={{ alignItems: 'center', paddingVertical: SPACE.lg }}>
        <Animated.View style={{ transform: [{ translateY }, { rotate }] }} testID="dice">
          <Doodle id="dadu" size={r ? 96 : 150} strokeWidth={2} />
        </Animated.View>
        <View style={{ width: r ? 70 : 110, height: 8, borderRadius: 4, backgroundColor: c.text, opacity: 0.07, marginTop: 6 }} />
      </View>

      {!r ? (
        <>
          <Txt v="small" soft center>
            Sekali seminggu, satu lemparan untuk seluruh lingkaran. Dadu memilih satu hari lama secara acak.
          </Txt>
          <Gap />
          <Button title={COPY.memories.diceRoll.toLowerCase()} icon="ui-dadu" onPress={roll} loading={rolling} testID="dice-roll" />
          {err ? (
            <Txt v="tiny" center style={{ color: c.danger, marginTop: 6 }}>
              {err}
            </Txt>
          ) : null}
        </>
      ) : r.day ? (
        <Revealed circleId={id} day={r.day} rolledBy={nameIn(circle, r.rolledBy, me.user.id)} today={today} names={(u) => nameIn(circle, u, me.user.id)} meId={me.user.id} />
      ) : (
        <Card style={{ alignItems: 'center', gap: 6 }} testID="dice-empty">
          <Doodle id="jam-pasir" size={40} />
          <Txt v="h2" ink center>
            belum ada hari lama untuk dibuka
          </Txt>
          <Txt v="small" soft center>
            Dadu hanya membuka hari yang sudah lewat seminggu atau lebih. Hari-hari ini sedang menua pelan-pelan; minggu depan coba lagi.
          </Txt>
        </Card>
      )}
      {r ? (
        <Txt v="tiny" soft center style={{ marginTop: SPACE.lg }}>
          dadu bisa dilempar lagi minggu depan
        </Txt>
      ) : null}
    </Screen>
  );
}

function Revealed({ circleId, day, rolledBy, today, names, meId }: { circleId: string; day: string; rolledBy: string; today: string; names: (u: string) => string; meId: string }) {
  const q = useCircleDay(circleId, day);
  const drops = useOpenDrops(q.data?.drops);
  return (
    <View style={{ gap: SPACE.md }} testID="dice-revealed">
      <Sticky color="yellow" tilt={-1.2}>
        <Txt v="label">dadu jatuh di</Txt>
        <Txt v="handLarge" style={{ fontSize: 36, lineHeight: 40 }}>
          {dayName(day)}, {formatDayLong(day)}
        </Txt>
        <Txt v="tiny">
          {relativeDay(day, today)} · dilempar {rolledBy}
        </Txt>
      </Sticky>
      {q.isLoading ? <Growing /> : null}
      {q.error ? <ErrorNote error={q.error} onRetry={() => q.refetch()} /> : null}
      {drops.map((d) => (
        <DropCard key={d.wire.id} drop={d} author={names(d.wire.authorId)} viewerId={meId} compact />
      ))}
      {q.data?.locked.length ? <LockedCard locked={q.data.locked[0]!} author={`${q.data.locked.length} hal masih tertutup`} /> : null}
      {q.data && !drops.length && !q.data.locked.length ? (
        <Txt v="small" soft center>
          Halaman hari itu sepi. Kadang hari yang paling tenang justru yang paling ingin diulang.
        </Txt>
      ) : null}
      <Button kind="soft" title="buka halaman lengkapnya" onPress={() => router.push(`/l/${circleId}/hari/${day}`)} testID="dice-open-day" />
    </View>
  );
}
