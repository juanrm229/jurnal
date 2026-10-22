import type { FlameLevel } from '@sehari/core';
import { View } from 'react-native';
import { Doodle } from './Doodle';
import { Row, Txt } from './kit';
import { useTheme } from './theme';

/** Api streak: tidak pernah "mati" — kabut untuk hari yang terlewat. */
export function Flame({ level, days, size = 28, showLabel = true }: { level: FlameLevel; days: number; size?: number; showLabel?: boolean }) {
  const { c } = useTheme();
  const icon = level === 'fog' ? 'kabut' : level === 'ember' || level === 'dim' ? 'ui-api-redup' : 'ui-api';
  const color = level === 'fog' ? c.fog : level === 'ember' ? c.inkSoft : c.ink;
  const scale = level === 'bright' ? 1.15 : level === 'warm' ? 1 : 0.85;
  return (
    <Row gap={4} accessibilityLabel={`api ${days} hari`}>
      <View style={{ transform: [{ scale }] }}>
        <Doodle id={icon} size={size} color={color} />
      </View>
      {showLabel ? (
        <Txt v="h2" ink={level !== 'fog'} soft={level === 'fog'}>
          {days}
        </Txt>
      ) : null}
    </Row>
  );
}
