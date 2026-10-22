import { getDoodle } from '@sehari/doodles';
import { memo } from 'react';
import Svg, { Path } from 'react-native-svg';
import { useTheme } from './theme';

export interface DoodleProps {
  id: string;
  size?: number;
  color?: string;
  strokeWidth?: number;
  opacity?: number;
}

/** Doodle tinta tangan dari @sehari/doodles. */
export const Doodle = memo(function Doodle({ id, size = 32, color, strokeWidth = 2.4, opacity = 1 }: DoodleProps) {
  const { c } = useTheme();
  const d = getDoodle(id);
  const ink = color ?? c.ink;
  return (
    <Svg width={size} height={size} viewBox={d.viewBox} opacity={opacity} accessibilityLabel={d.name}>
      {d.strokes.map((p, i) => (
        <Path key={i} d={p} stroke={ink} strokeWidth={strokeWidth} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      ))}
      {d.fills?.map((p, i) => <Path key={`f${i}`} d={p} fill={ink} />)}
    </Svg>
  );
});
