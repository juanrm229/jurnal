import { addDays, dayName, gardenSeedFor } from './garden';
import { router } from 'expo-router';
import { Pressable, View } from 'react-native';
import { useMe, useMyDays } from '@/lib/data';
import { Doodle } from '@/ui/Doodle';
import { Txt } from '@/ui/kit';
import { useTheme } from '@/ui/theme';
import { gardenDoodleFor } from '@sehari/doodles';

/** Tujuh hari terakhir: tanaman untuk hari tersegel, titik untuk kabut. */
export function DayStrip({ today }: { today: string }) {
  const me = useMe();
  const { c } = useTheme();
  const from = addDays(today, -6);
  const { data } = useMyDays(from, today);
  const days = Array.from({ length: 7 }, (_, i) => addDays(from, i));
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
      {days.map((d) => {
        const info = data?.find((x) => x.day === d);
        const sealed = !!info?.sealedAt;
        const isToday = d === today;
        return (
          <Pressable key={d} onPress={() => router.push(`/hari/${d}`)} style={{ alignItems: 'center', width: 42, gap: 4 }} accessibilityLabel={`${dayName(d)} ${sealed ? 'tersegel' : ''}`}>
            <View style={{ height: 36, justifyContent: 'center' }}>
              {sealed ? (
                <Doodle id={gardenDoodleFor(gardenSeedFor(me.user.id, d)).id} size={34} />
              ) : info?.frozen ? (
                <Doodle id="kabut" size={26} color={c.inkSoft} />
              ) : (
                <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: isToday ? c.ink : c.inkSoft }} />
              )}
            </View>
            <Txt v="tiny" ink={isToday} soft={!isToday}>
              {dayName(d).slice(0, 3)}
            </Txt>
          </Pressable>
        );
      })}
    </View>
  );
}
