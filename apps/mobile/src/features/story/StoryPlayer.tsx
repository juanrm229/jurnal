/**
 * Pemutar cerita ala Story: ketuk kanan/kiri untuk maju/mundur, tahan untuk
 * berhenti sejenak, garis kemajuan di atas. Tahun Kita lebih pelan, dengan
 * peralihan memudar seperti film pendek.
 */
import { type ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Easing, type GestureResponderEvent, Platform, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Doodle } from '@/ui/Doodle';
import { IconButton, Row, Txt } from '@/ui/kit';
import { MAX_WIDTH, SPACE, useTheme, withAlpha } from '@/ui/theme';

export interface StoryPage {
  key: string;
  /** null = tidak maju sendiri (mis. halaman akhir). */
  duration: number | null;
  tint: string;
  /** Halaman yang penuh tombol: ketukan tidak dipakai untuk berpindah. */
  interactive?: boolean;
  render: (state: { playing: boolean; duration: number; go: (delta: number) => void }) => ReactNode;
}

function RuledPaper({ color }: { color: string }) {
  return (
    <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, paddingTop: 120, gap: 31, overflow: 'hidden' }}>
      {Array.from({ length: 40 }).map((_, i) => (
        <View key={i} style={{ height: 1, backgroundColor: color }} />
      ))}
    </View>
  );
}

export function StoryPlayer({ pages, slow, onClose, startAt = 0 }: { pages: StoryPage[]; slow?: boolean; onClose: () => void; startAt?: number }) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const [index, setIndex] = useState(Math.min(startAt, pages.length - 1));
  const [paused, setPaused] = useState(false);
  const progress = useRef(new Animated.Value(0)).current;
  const fade = useRef(new Animated.Value(1)).current;
  const value = useRef(0);
  const held = useRef(false);
  const box = useRef({ x: 0, w: 1 });

  const page = pages[Math.min(index, pages.length - 1)]!;
  const count = pages.length;

  useEffect(() => {
    const id = progress.addListener(({ value: v }) => (value.current = v));
    return () => progress.removeListener(id);
  }, [progress]);

  const go = useCallback(
    (delta: number) => {
      setIndex((i) => {
        const n = Math.max(0, Math.min(count - 1, i + delta));
        return n;
      });
    },
    [count],
  );

  // Ganti halaman: kemajuan kembali ke nol, lalu kertas baru memudar masuk.
  useEffect(() => {
    progress.setValue(0);
    value.current = 0;
    fade.setValue(0);
    Animated.timing(fade, { toValue: 1, duration: slow ? 900 : 240, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
  }, [index, progress, fade, slow]);

  useEffect(() => {
    const d = page.duration;
    if (!d || paused) return;
    const a = Animated.timing(progress, { toValue: 1, duration: Math.max(60, d * (1 - value.current)), easing: Easing.linear, useNativeDriver: false });
    a.start(({ finished }) => {
      if (finished) go(1);
    });
    return () => a.stop();
  }, [index, paused, page.duration, progress, go]);

  // Papan ketik di web: panah & spasi.
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') go(1);
      else if (e.key === 'ArrowLeft') go(-1);
      else if (e.key === ' ' && !page.interactive) {
        e.preventDefault();
        setPaused((p) => !p);
      } else if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go, onClose, page.interactive]);

  const onTap = (e: GestureResponderEvent) => {
    const x = e.nativeEvent.pageX - box.current.x;
    if (x < box.current.w * 0.32) go(-1);
    else go(1);
  };

  const scale = fade.interpolate({ inputRange: [0, 1], outputRange: [slow ? 1.04 : 1.01, 1] });
  const content = (
    <Animated.View style={{ flex: 1, opacity: fade, transform: [{ scale }] }}>{page.render({ playing: !paused, duration: page.duration ?? 0, go })}</Animated.View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: c.text }} testID="story">
      <View
        style={{ flex: 1, width: '100%', maxWidth: MAX_WIDTH, alignSelf: 'center', backgroundColor: page.tint, overflow: 'hidden' }}
        onLayout={(e) => {
          box.current = { x: e.nativeEvent.layout.x, w: e.nativeEvent.layout.width };
        }}>
        <RuledPaper color={withAlpha(c.ink, 0.06)} />
        <View style={{ paddingTop: insets.top + SPACE.sm, paddingHorizontal: SPACE.sm, zIndex: 3 }}>
          <Row gap={4}>
            {pages.map((p, i) => (
              <View key={p.key} style={{ flex: 1, height: 3, borderRadius: 2, backgroundColor: withAlpha(c.ink, 0.18), overflow: 'hidden' }}>
                {i < index ? (
                  <View style={{ flex: 1, backgroundColor: c.ink }} />
                ) : i === index ? (
                  <Animated.View
                    style={{ height: 3, backgroundColor: c.ink, width: p.duration ? progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) : '100%' }}
                  />
                ) : null}
              </View>
            ))}
          </Row>
          <Row style={{ justifyContent: 'space-between', marginTop: 2 }}>
            <Row gap={6} style={{ paddingLeft: 6, opacity: paused ? 1 : 0 }}>
              <Doodle id="ui-jam" size={16} />
              <Txt v="tiny" ink>
                berhenti sejenak
              </Txt>
            </Row>
            <IconButton icon="ui-tutup" label="tutup" onPress={onClose} size={22} testID="story-close" />
          </Row>
        </View>
        {page.interactive ? (
          <View style={{ flex: 1 }}>{content}</View>
        ) : (
          <Pressable
            testID="story-tap"
            style={{ flex: 1, paddingBottom: insets.bottom + SPACE.md }}
            onPress={onTap}
            delayLongPress={220}
            onLongPress={() => {
              held.current = true;
              setPaused(true);
            }}
            onPressOut={() => {
              if (held.current) {
                held.current = false;
                setPaused(false);
              }
            }}
            accessibilityHint="ketuk kanan untuk lanjut, kiri untuk kembali, tahan untuk berhenti sejenak">
            {content}
          </Pressable>
        )}
      </View>
    </View>
  );
}
