import { View } from 'react-native';
import { Doodle } from './Doodle';
import { useTheme } from './theme';

export function Avatar({ doodle, size = 36, sealed, dim }: { doodle: string; size?: number; sealed?: boolean; dim?: boolean }) {
  const { c } = useTheme();
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: sealed ? c.pill : c.card,
        borderWidth: 1.5,
        borderColor: sealed ? c.ink : c.inkSoft,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: dim ? 0.5 : 1,
      }}>
      <Doodle id={doodle} size={size * 0.68} />
    </View>
  );
}
