import { dayName, formatDayLong } from '@sehari/core';
import { router, useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';
import { useCircles, useMe, useMyDay, useOpenDrops } from '@/lib/data';
import { audienceLabel, DropCard } from '@/ui/DropCard';
import { Card, Empty, Gap, Growing, Header, ListItem, Screen, Section, Txt } from '@/ui/kit';
import { SPACE } from '@/ui/theme';

/** Hari milikku: semua yang kutitipkan, termasuk yang "hanya aku". */
export default function MyDayScreen() {
  const { day } = useLocalSearchParams<{ day: string }>();
  const me = useMe();
  const q = useMyDay(day);
  const drops = useOpenDrops(q.data?.drops);
  const { circles } = useCircles();
  const names = (id: string) => circles.flatMap((x) => x.members).find((m) => m.userId === id)?.penName ?? 'seseorang';
  const circleName = (id: string) => circles.find((x) => x.id === id)?.name ?? 'lingkaran';
  const shared = new Set(drops.flatMap((d) => d.wire.circleIds));
  return (
    <Screen header={<Header title={`${dayName(day)}, ${formatDayLong(day)}`} subtitle={q.data?.sealedAt ? 'tersegel' : q.data?.frozen ? 'hari istirahat' : undefined} />}>
      {q.isLoading ? (
        <Growing />
      ) : drops.length === 0 ? (
        <Empty doodle="kabut" title="Hari ini hilang di kabut" body="Tidak apa-apa. Kabut juga bagian dari cerita." />
      ) : (
        <View style={{ gap: SPACE.sm }}>
          {drops.map((d) => (
            <DropCard key={d.wire.id} drop={d} meta={audienceLabel(d.wire, names, circleName)} viewerId={me.user.id} />
          ))}
        </View>
      )}
      {shared.size ? (
        <Section title="buka bersama">
          {[...shared].map((cid) => (
            <ListItem key={cid} icon="amplop" title={circleName(cid)} onPress={() => router.push(`/l/${cid}/hari/${day}`)} />
          ))}
        </Section>
      ) : null}
      <Gap />
      <Card>
        <Txt v="tiny" soft>
          Drop "hanya aku" tidak pernah meninggalkan arsip pribadimu.
        </Txt>
      </Card>
    </Screen>
  );
}
