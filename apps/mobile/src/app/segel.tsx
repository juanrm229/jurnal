/**
 * Segel harimu. Momen terpenting bukan saat menulis, tapi saat dua kapsul
 * terbuka jadi satu — animasinya terasa seperti menutup surat dengan lilin.
 */
import { COPY, type MoodCode, type SealResult } from '@sehari/core';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, View } from 'react-native';
import { nowParts, useCircles, useMe, useMyDay, useSeal, useToday } from '@/lib/data';
import { Doodle } from '@/ui/Doodle';
import { Button, Card, Field, Gap, Header, Row, Screen, Toggle, Txt } from '@/ui/kit';
import { MoodPicker } from '@/ui/Mood';
import { SPACE, useTheme } from '@/ui/theme';

const MILESTONE_COPY: Record<string, { name: string; line: string }> = {
  gerbang: COPY.streak.milestone7,
  jembatan: COPY.streak.milestone30,
  mercusuar: COPY.streak.milestone100,
  pelabuhan: COPY.streak.milestone365,
};

export default function Seal() {
  const me = useMe();
  const { c } = useTheme();
  const today = useToday();
  const day = useMyDay(today);
  const { circles } = useCircles();
  const seal = useSeal();
  const active = circles.filter((x) => x.status === 'active' && x.me?.state === 'active');
  const [line, setLine] = useState('');
  const [mood, setMood] = useState<MoodCode | undefined>();
  const [private_, setPrivate] = useState(false);
  const [result, setResult] = useState<SealResult | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const stamp = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!result) return;
    Animated.sequence([
      Animated.timing(stamp, { toValue: 1, duration: 520, easing: Easing.out(Easing.back(2.2)), useNativeDriver: true }),
    ]).start();
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  }, [result, stamp]);

  const go = async () => {
    setErr(null);
    try {
      const t = nowParts(me.user.tz);
      const hasLine = line.trim().length > 0 || !!mood;
      const res = await seal.mutateAsync({
        day: today,
        lastLine: hasLine
          ? {
              day: today,
              audience: private_ || !active.length ? 'self' : 'circle',
              circleIds: private_ ? [] : active.map((x) => x.id),
              payload: { v: 1, kind: 'last_line', text: line.trim() || undefined, mood, ...t, tz: me.user.tz, cityId: me.user.cityId ?? undefined },
            }
          : undefined,
      });
      setResult(res);
    } catch (e) {
      setErr((e as Error).message);
    }
  };

  if (result) {
    const milestone = result.circles.find((x) => x.milestone);
    return (
      <Screen footer={<Button title="Selesai" onPress={() => router.back()} testID="seal-done" />}>
        <Gap h={SPACE.xxl} />
        <View style={{ alignItems: 'center' }}>
          <Animated.View
            style={{
              transform: [
                { scale: stamp.interpolate({ inputRange: [0, 1], outputRange: [2.4, 1] }) },
                { rotate: stamp.interpolate({ inputRange: [0, 1], outputRange: ['-25deg', '-8deg'] }) },
              ],
              opacity: stamp,
            }}>
            <View style={{ width: 132, height: 132, borderRadius: 66, backgroundColor: c.ink, alignItems: 'center', justifyContent: 'center' }}>
              <Doodle id="tunas" size={78} color={c.onInk} strokeWidth={3} />
            </View>
          </Animated.View>
          <Gap />
          <Txt v="title" ink center testID="seal-success">
            {COPY.seal.sealed}
          </Txt>
          {line ? (
            <Txt v="hand" center style={{ marginTop: SPACE.sm }}>
              “{line}”
            </Txt>
          ) : null}
        </View>
        {milestone ? (
          <Card tint={c.sticky.yellow} style={{ marginTop: SPACE.lg, alignItems: 'center', gap: 6 }}>
            <Doodle id={milestone.milestone === 'gerbang' ? 'rumah' : milestone.milestone === 'jembatan' ? 'peta' : milestone.milestone === 'mercusuar' ? 'lampu' : 'surat-botol'} size={48} />
            <Txt v="h2" ink>
              {MILESTONE_COPY[milestone.milestone!]?.name}
            </Txt>
            <Txt center>{MILESTONE_COPY[milestone.milestone!]?.line}</Txt>
          </Card>
        ) : null}
        <Gap h={SPACE.lg} />
        <View style={{ gap: SPACE.sm }}>
          {result.circles.map((r) => {
            const circle = active.find((x) => x.id === r.circleId);
            if (!circle) return null;
            const waiting = circle.others.filter((m) => !circle.todaySealed[m.userId]);
            return (
              <Card key={r.circleId} onPress={() => router.replace(`/l/${r.circleId}/hari/${result.day}`)} testID={`seal-result-${r.circleId}`}>
                <Row style={{ justifyContent: 'space-between' }}>
                  <Txt v="h2" ink>
                    {circle.name}
                  </Txt>
                  <Row gap={4}>
                    <Doodle id="ui-api" size={20} />
                    <Txt ink>{r.streak.current}</Txt>
                  </Row>
                </Row>
                <Gap h={6} />
                <Txt v="small" soft>
                  {r.allSealed ? COPY.seal.opened : circle.kind === 'duo' && waiting[0] ? COPY.seal.waitingPartner(waiting[0].penName) : COPY.seal.circleProgress(circle.active.length - waiting.length, circle.active.length)}
                </Txt>
              </Card>
            );
          })}
        </View>
      </Screen>
    );
  }

  const count = day.data?.drops.length ?? 0;
  return (
    <Screen header={<Header title={COPY.seal.cta} />} footer={<Button title={COPY.seal.cta} icon="segel-lilin" onPress={go} loading={seal.isPending} disabled={count === 0 && !line.trim() && !mood} testID="seal-submit" />}>
      <Gap h={SPACE.md} />
      <Card style={{ alignItems: 'center', gap: SPACE.sm }}>
        <Doodle id="amplop" size={48} />
        <Txt ink center>
          {count ? `${count} hal sudah ada di kapsul hari ini.` : COPY.seal.nothingYet}
        </Txt>
        <Txt v="tiny" soft center>
          {COPY.seal.giveFirst}
        </Txt>
      </Card>
      <Gap h={SPACE.lg} />
      <Txt v="label" ink soft>
        {COPY.seal.lastLinePrompt.toLowerCase()}
      </Txt>
      <Gap h={SPACE.sm} />
      <Field value={line} onChangeText={setLine} placeholder={COPY.seal.lastLinePlaceholder} maxLength={200} testID="last-line" style={{ fontFamily: 'Caveat_500Medium', fontSize: 26 }} />
      <Txt v="tiny" soft style={{ marginTop: 6 }}>
        Setahun lagi, kalimat-kalimat ini menjadi puisi panjang yang kalian tulis tanpa sadar.
      </Txt>
      <Gap h={SPACE.lg} />
      <Txt v="label" ink soft>
        warna hari ini
      </Txt>
      <Gap h={SPACE.sm} />
      <MoodPicker value={mood} onChange={setMood} compact />
      <Gap />
      {active.length ? <Toggle label="kalimat terakhir hanya untukku" value={private_} onChange={setPrivate} hint="Kalau mati, kalimat & warna ikut terbuka di semua lingkaranmu." /> : null}
      {err ? (
        <Txt v="small" style={{ marginTop: SPACE.md }}>
          {err}
        </Txt>
      ) : null}
    </Screen>
  );
}
