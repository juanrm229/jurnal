import { MOOD_CODES, MOODS, type MoodCode } from '@sehari/core';
import { Pressable, View } from 'react-native';
import { Row, Txt } from './kit';
import { useTheme } from './theme';

export function MoodDot({ mood, size = 14 }: { mood: MoodCode; size?: number }) {
  return <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: MOODS[mood]?.color ?? '#999' }} accessibilityLabel={MOODS[mood]?.label} />;
}

export function MoodPicker({ value, onChange, compact }: { value?: MoodCode; onChange: (m: MoodCode) => void; compact?: boolean }) {
  const { c } = useTheme();
  return (
    <Row style={{ flexWrap: 'wrap', gap: compact ? 8 : 10 }}>
      {MOOD_CODES.map((m) => (
        <Pressable key={m} testID={`mood-${m}`} onPress={() => onChange(m)} accessibilityRole="button" accessibilityLabel={MOODS[m].label} style={{ alignItems: 'center', gap: 4 }}>
          <View
            style={{
              width: compact ? 30 : 40,
              height: compact ? 30 : 40,
              borderRadius: 999,
              backgroundColor: MOODS[m].color,
              borderWidth: value === m ? 3 : 0,
              borderColor: c.ink,
            }}
          />
          {!compact ? (
            <Txt v="tiny" soft>
              {MOODS[m].label}
            </Txt>
          ) : null}
        </Pressable>
      ))}
    </Row>
  );
}
