/**
 * Amplop tersegel. Saat diketuk: segel lilin lepas, tutup amplop terangkat,
 * lalu kertas surat naik keluar — seperti membuka surat, bukan notifikasi.
 */
import * as Haptics from 'expo-haptics';
import { useRef, useState } from 'react';
import { Animated, Easing, Pressable, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Doodle } from '@/ui/Doodle';
import { Row, Txt } from '@/ui/kit';
import { mix, RADIUS, SPACE, useTheme } from '@/ui/theme';

const H = 176;
const flapPath = (w: number) => `M0 6 Q0 0 6 0 L${w - 6} 0 Q${w} 0 ${w} 6 L${w / 2} ${H * 0.6} Z`;

export function Envelope({
  note,
  from,
  doodle = 'amplop',
  tilt = 0,
  onOpen,
  testID,
}: {
  note?: string;
  from: string;
  doodle?: string;
  tilt?: number;
  /** Dipanggil setelah animasi; boleh async (mis. POST /open). */
  onOpen: () => Promise<void> | void;
  testID?: string;
}) {
  const { c } = useTheme();
  const [w, setW] = useState(0);
  const [busy, setBusy] = useState(false);
  const seal = useRef(new Animated.Value(0)).current;
  const flap = useRef(new Animated.Value(0)).current;
  const paper = useRef(new Animated.Value(0)).current;

  const kraft = c.aged;
  const kraftDark = mix(c.aged, c.text, 0.1);
  const kraftEdge = mix(c.aged, c.text, 0.18);

  const open = () => {
    if (busy) return;
    setBusy(true);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    Animated.sequence([
      Animated.timing(seal, { toValue: 1, duration: 260, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.timing(flap, { toValue: 1, duration: 420, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }),
      Animated.timing(paper, { toValue: 1, duration: 520, easing: Easing.out(Easing.back(1.3)), useNativeDriver: true }),
    ]).start(async () => {
      try {
        await onOpen();
      } finally {
        setBusy(false);
      }
    });
  };

  return (
    <Pressable onPress={open} testID={testID} accessibilityRole="button" accessibilityLabel={`buka surat dari ${from}`} style={{ transform: [{ rotate: `${tilt}deg` }], marginTop: 70 }}>
      <View onLayout={(e) => setW(e.nativeEvent.layout.width)} style={{ height: H }}>
        {/* bagian belakang */}
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: kraftDark, borderRadius: RADIUS.sm }} />
        {/* tutup amplop (terbuka, di belakang kertas) */}
        {w > 0 ? (
          <Animated.View
            pointerEvents="none"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: w,
              height: H * 0.62,
              transformOrigin: 'top',
              opacity: flap.interpolate({ inputRange: [0, 0.5, 0.51, 1], outputRange: [0, 0, 1, 1] }),
              transform: [{ perspective: 600 }, { rotateX: flap.interpolate({ inputRange: [0, 0.5, 1], outputRange: ['90deg', '90deg', '180deg'] }) }],
            }}>
            <Svg width={w} height={H * 0.62}>
              <Path d={flapPath(w)} fill={kraftDark} stroke={kraftEdge} strokeWidth={1} />
            </Svg>
          </Animated.View>
        ) : null}
        {/* kertas surat */}
        <Animated.View
          style={{
            position: 'absolute',
            left: 14,
            right: 14,
            top: 8,
            height: H - 24,
            backgroundColor: c.sticky.yellow,
            borderRadius: 3,
            padding: SPACE.sm,
            gap: 12,
            paddingTop: 16,
            opacity: paper.interpolate({ inputRange: [0, 0.01, 1], outputRange: [0, 1, 1] }),
            transform: [{ translateY: paper.interpolate({ inputRange: [0, 1], outputRange: [0, -72] }) }],
          }}>
          {[0, 1, 2].map((i) => (
            <View key={i} style={{ height: 1.5, borderRadius: 1, backgroundColor: c.inkSoft, width: `${80 - i * 18}%` }} />
          ))}
        </Animated.View>
        {w > 0 ? (
          <>
            {/* kantong depan */}
            <Svg width={w} height={H} style={{ position: 'absolute', top: 0, left: 0 }} pointerEvents="none">
              <Path d={`M0 ${H * 0.3} L${w / 2} ${H * 0.62} L${w} ${H * 0.3} L${w} ${H - 6} Q${w} ${H} ${w - 6} ${H} L6 ${H} Q0 ${H} 0 ${H - 6} Z`} fill={kraft} />
              <Path d={`M2 ${H - 2} L${w * 0.42} ${H * 0.55} M${w - 2} ${H - 2} L${w * 0.58} ${H * 0.55}`} stroke={kraftEdge} strokeWidth={1.2} fill="none" />
            </Svg>
            {/* tutup amplop (depan, menutup) */}
            <Animated.View
              pointerEvents="none"
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: w,
                height: H * 0.62,
                zIndex: 3,
                transformOrigin: 'top',
                opacity: flap.interpolate({ inputRange: [0, 0.5, 0.51, 1], outputRange: [1, 1, 0, 0] }),
                transform: [{ perspective: 600 }, { rotateX: flap.interpolate({ inputRange: [0, 0.5, 1], outputRange: ['0deg', '90deg', '90deg'] }) }],
              }}>
              <Svg width={w} height={H * 0.62}>
                <Path d={flapPath(w)} fill={mix(kraft, c.text, 0.04)} stroke={kraftEdge} strokeWidth={1} />
              </Svg>
            </Animated.View>
            {/* segel lilin */}
            <Animated.View
              pointerEvents="none"
              style={{
                position: 'absolute',
                zIndex: 4,
                left: w / 2 - 26,
                top: H * 0.6 - 30,
                width: 52,
                height: 52,
                borderRadius: 26,
                backgroundColor: c.danger,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: seal.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }),
                transform: [{ scale: seal.interpolate({ inputRange: [0, 1], outputRange: [1, 1.5] }) }, { rotate: '-10deg' }],
              }}>
              <Doodle id="segel-lilin" size={34} color={c.onInk} />
            </Animated.View>
          </>
        ) : null}
        {/* tulisan di amplop */}
        <View pointerEvents="none" style={{ position: 'absolute', left: SPACE.md, right: SPACE.md, bottom: 12, zIndex: 2 }}>
          <Row style={{ justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <View style={{ flex: 1, paddingRight: 8 }}>
              {note ? (
                <Txt v="hand" numberOfLines={1} style={{ fontSize: 24, lineHeight: 26, color: c.text }}>
                  {note}
                </Txt>
              ) : null}
              <Txt v="tiny" style={{ color: c.text, opacity: 0.7 }}>
                dari {from} · {busy ? 'membuka…' : 'ketuk untuk membuka'}
              </Txt>
            </View>
            <View style={{ borderWidth: 1.5, borderStyle: 'dashed', borderColor: kraftEdge, padding: 4, borderRadius: 2, transform: [{ rotate: '4deg' }] }}>
              <Doodle id={doodle} size={30} />
            </View>
          </Row>
        </View>
      </View>
    </Pressable>
  );
}
