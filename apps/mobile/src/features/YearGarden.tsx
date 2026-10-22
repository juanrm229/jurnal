import { dayOfYear, daysInYear, eachDay } from '@sehari/core';
import { gardenDoodleFor } from '@sehari/doodles';
import { useState } from 'react';
import { type LayoutChangeEvent, Pressable, View } from 'react-native';
import { Doodle } from '@/ui/Doodle';
import { useTheme } from '@/ui/theme';
import { gardenSeedFor } from './garden';

/**
 * Taman tahunan: setiap hari tersegel menumbuhkan satu tanaman. Hari yang
 * lewat tanpa segel tidak merah — hanya titik kabut. Hari depan: titik tinta.
 */
export function YearGarden({
  year,
  sealed,
  seedOwner,
  today,
  onPressDay,
  columns = 18,
  tint,
}: {
  year: number;
  sealed: ReadonlySet<string>;
  seedOwner: string;
  today: string;
  onPressDay?: (day: string) => void;
  columns?: number;
  tint?: (day: string) => string | undefined;
}) {
  const { c } = useTheme();
  const [w, setW] = useState(0);
  const days = eachDay(`${year}-01-01`, `${year}-12-31`);
  const cell = w ? Math.floor(w / columns) : 0;
  void daysInYear;
  void dayOfYear;
  return (
    <View onLayout={(e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width)} style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
      {cell > 0 &&
        days.map((d) => {
          const isSealed = sealed.has(d);
          const past = d < today;
          const content = isSealed ? (
            <Doodle id={gardenDoodleFor(gardenSeedFor(seedOwner, d)).id} size={cell * 0.95} color={tint?.(d)} />
          ) : (
            <View
              style={{
                width: d === today ? 6 : 3,
                height: d === today ? 6 : 3,
                borderRadius: 3,
                backgroundColor: d === today ? c.ink : past ? c.fog : c.inkSoft,
              }}
            />
          );
          return (
            <Pressable
              key={d}
              disabled={!onPressDay || d > today}
              onPress={() => onPressDay?.(d)}
              style={{ width: cell, height: cell, alignItems: 'center', justifyContent: 'center' }}
              accessibilityLabel={isSealed ? `${d} tersegel` : d}>
              {content}
            </Pressable>
          );
        })}
    </View>
  );
}
