/**
 * Komponen dasar. Semua teks memakai huruf mesin tik; tulisan tangan hanya
 * untuk hal yang terasa pribadi (tanda tangan, surat, kalimat terakhir).
 */
import { router } from 'expo-router';
import { type ReactNode, useEffect, useRef } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  Pressable,
  type PressableProps,
  ScrollView,
  type ScrollViewProps,
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  type TextProps,
  View,
  type ViewProps,
  type ViewStyle,
  type StyleProp,
  type TextStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Doodle } from './Doodle';
import { FONTS, MAX_WIDTH, RADIUS, SPACE, useTheme } from './theme';

// ── Teks ────────────────────────────────────────────────────────────────────

type TxtVariant = 'display' | 'title' | 'h2' | 'body' | 'small' | 'tiny' | 'hand' | 'handLarge' | 'label';

export function Txt({
  v = 'body',
  soft,
  ink,
  center,
  style,
  children,
  ...rest
}: TextProps & { v?: TxtVariant; soft?: boolean; ink?: boolean; center?: boolean }) {
  const { c } = useTheme();
  const base: Record<TxtVariant, TextStyle> = {
    display: { fontFamily: FONTS.mono, fontSize: 30, lineHeight: 38, letterSpacing: 1 },
    title: { fontFamily: FONTS.mono, fontSize: 22, lineHeight: 30, letterSpacing: 0.6 },
    h2: { fontFamily: FONTS.monoMedium, fontSize: 16, lineHeight: 22, letterSpacing: 0.4 },
    body: { fontFamily: FONTS.mono, fontSize: 15, lineHeight: 23 },
    small: { fontFamily: FONTS.mono, fontSize: 13, lineHeight: 19 },
    tiny: { fontFamily: FONTS.mono, fontSize: 11, lineHeight: 15, letterSpacing: 0.4 },
    label: { fontFamily: FONTS.mono, fontSize: 12, lineHeight: 16, letterSpacing: 1.2 },
    hand: { fontFamily: FONTS.hand, fontSize: 24, lineHeight: 28 },
    handLarge: { fontFamily: FONTS.handBold, fontSize: 40, lineHeight: 44 },
  };
  const color = ink ? (soft ? c.inkSoft : c.ink) : soft ? c.textSoft : v === 'hand' || v === 'handLarge' ? c.ink : c.text;
  return (
    <Text style={[base[v], { color }, center && { textAlign: 'center' }, style]} {...rest}>
      {children}
    </Text>
  );
}

// ── Tata letak ──────────────────────────────────────────────────────────────

export function Screen({
  children,
  scroll = true,
  padded = true,
  footer,
  header,
  refreshControl,
  contentStyle,
}: {
  children: ReactNode;
  scroll?: boolean;
  padded?: boolean;
  footer?: ReactNode;
  header?: ReactNode;
  refreshControl?: ScrollViewProps['refreshControl'];
  contentStyle?: StyleProp<ViewStyle>;
}) {
  const { c } = useTheme();
  const inner = [styles.inner, padded && { paddingHorizontal: SPACE.md }, contentStyle];
  return (
    <SafeAreaView style={[styles.fill, { backgroundColor: c.paper }]} edges={['top', 'left', 'right']}>
      {header}
      {scroll ? (
        <ScrollView
          style={styles.fill}
          contentContainerStyle={[styles.scroll]}
          keyboardShouldPersistTaps="handled"
          refreshControl={refreshControl}
          showsVerticalScrollIndicator={false}>
          <View style={inner}>{children}</View>
        </ScrollView>
      ) : (
        <View style={[styles.fill, ...inner]}>{children}</View>
      )}
      {footer ? <View style={[styles.footer, { backgroundColor: c.paper }]}>{footer}</View> : null}
    </SafeAreaView>
  );
}

export function Header({ title, back = true, right, subtitle }: { title?: string; back?: boolean; right?: ReactNode; subtitle?: string }) {
  return (
    <View style={styles.header}>
      <View style={{ width: 44 }}>
        {back ? (
          <IconButton
            icon="ui-kembali"
            label="kembali"
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
          />
        ) : null}
      </View>
      <View style={{ flex: 1, alignItems: 'center' }}>
        {title ? (
          <Txt v="h2" ink center numberOfLines={1}>
            {title}
          </Txt>
        ) : null}
        {subtitle ? (
          <Txt v="tiny" ink soft center numberOfLines={1}>
            {subtitle}
          </Txt>
        ) : null}
      </View>
      <View style={{ minWidth: 44, alignItems: 'flex-end' }}>{right}</View>
    </View>
  );
}

export const Row = ({ style, ...p }: ViewProps & { gap?: number }) => (
  <View style={[{ flexDirection: 'row', alignItems: 'center', gap: p.gap ?? SPACE.sm }, style]} {...p} />
);

export const Gap = ({ h = SPACE.md }: { h?: number }) => <View style={{ height: h }} />;

export function Card({
  children,
  style,
  onPress,
  tint,
  testID,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  tint?: string;
  testID?: string;
}) {
  const { c } = useTheme();
  const body = <View style={[styles.card, { backgroundColor: tint ?? c.card, borderColor: c.cardEdge }, style]}>{children}</View>;
  if (!onPress) return body;
  return (
    <Pressable onPress={onPress} testID={testID} style={({ pressed }) => pressed && { opacity: 0.8, transform: [{ scale: 0.99 }] }}>
      {body}
    </Pressable>
  );
}

export function Section({ title, right, children }: { title: string; right?: ReactNode; children: ReactNode }) {
  return (
    <View style={{ marginTop: SPACE.lg }}>
      <Row style={{ justifyContent: 'space-between', marginBottom: SPACE.sm }}>
        <Txt v="label" ink soft>
          {title.toLowerCase()}
        </Txt>
        {right}
      </Row>
      {children}
    </View>
  );
}

// ── Tombol ──────────────────────────────────────────────────────────────────

export function Button({
  title,
  onPress,
  kind = 'primary',
  loading,
  disabled,
  icon,
  style,
  testID,
}: {
  title: string;
  onPress?: () => void;
  kind?: 'primary' | 'soft' | 'ghost' | 'danger';
  loading?: boolean;
  disabled?: boolean;
  icon?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}) {
  const { c } = useTheme();
  const bg = kind === 'primary' ? c.ink : kind === 'soft' ? c.pill : kind === 'danger' ? 'transparent' : 'transparent';
  const fg = kind === 'primary' ? c.onInk : kind === 'danger' ? c.danger : c.ink;
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={disabled || loading ? undefined : onPress}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: bg, opacity: disabled ? 0.45 : pressed ? 0.85 : 1 },
        kind === 'ghost' && { borderWidth: 1, borderColor: c.inkSoft },
        kind === 'danger' && { borderWidth: 1, borderColor: c.danger },
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <Row gap={10}>
          {icon ? <Doodle id={icon} size={20} color={fg} /> : null}
          <Text style={{ fontFamily: FONTS.mono, fontSize: 15, color: fg, letterSpacing: 0.6 }}>{title}</Text>
        </Row>
      )}
    </Pressable>
  );
}

export function IconButton({ icon, label, onPress, size = 26, color, testID }: { icon: string; label: string; onPress?: () => void; size?: number; color?: string; testID?: string }) {
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={10}
      style={({ pressed }) => [{ padding: 8, opacity: pressed ? 0.6 : 1 }]}>
      <Doodle id={icon} size={size} color={color} />
    </Pressable>
  );
}

export function Pill({ children, active, onPress, style, testID }: { children: ReactNode; active?: boolean; onPress?: () => void; style?: StyleProp<ViewStyle>; testID?: string }) {
  const { c } = useTheme();
  const content = (
    <View style={[styles.pill, { backgroundColor: active ? c.ink : c.pill }, style]}>
      {typeof children === 'string' ? (
        <Text style={{ fontFamily: FONTS.mono, fontSize: 13, color: active ? c.onInk : c.ink }}>{children}</Text>
      ) : (
        children
      )}
    </View>
  );
  if (!onPress) return content;
  return (
    <Pressable onPress={onPress} testID={testID} accessibilityRole="button" accessibilityState={{ selected: active }}>
      {content}
    </Pressable>
  );
}

// ── Isian ───────────────────────────────────────────────────────────────────

export function Field({ label, hint, style, ...props }: TextInputProps & { label?: string; hint?: string }) {
  const { c } = useTheme();
  return (
    <View style={{ gap: 6 }}>
      {label ? (
        <Txt v="label" ink soft>
          {label.toLowerCase()}
        </Txt>
      ) : null}
      <TextInput
        placeholderTextColor={c.inkSoft}
        style={[
          styles.field,
          { color: c.text, backgroundColor: c.card, borderColor: c.cardEdge },
          props.multiline && { minHeight: 120, textAlignVertical: 'top' },
          style,
        ]}
        {...props}
      />
      {hint ? (
        <Txt v="tiny" soft>
          {hint}
        </Txt>
      ) : null}
    </View>
  );
}

export function Toggle({ label, value, onChange, hint, testID }: { label: string; value: boolean; onChange: (v: boolean) => void; hint?: string; testID?: string }) {
  const { c } = useTheme();
  return (
    <Pressable onPress={() => onChange(!value)} testID={testID} accessibilityRole="switch" accessibilityState={{ checked: value }} style={{ paddingVertical: 10 }}>
      <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <View style={{ flex: 1, paddingRight: 12 }}>
          <Txt>{label}</Txt>
          {hint ? (
            <Txt v="tiny" soft>
              {hint}
            </Txt>
          ) : null}
        </View>
        <View style={[styles.switch, { backgroundColor: value ? c.ink : c.fog }]}>
          <View style={[styles.knob, { backgroundColor: c.card, alignSelf: value ? 'flex-end' : 'flex-start' }]} />
        </View>
      </Row>
    </Pressable>
  );
}

// ── Keadaan ─────────────────────────────────────────────────────────────────

/** Tunas yang tumbuh pelan sebagai tanda memuat. */
export function Growing({ label = 'menyiram…' }: { label?: string }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(v, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(v, { toValue: 0, duration: 900, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [v]);
  return (
    <View style={{ alignItems: 'center', padding: SPACE.xl, gap: SPACE.sm }}>
      <Animated.View style={{ transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1.05] }) }] }}>
        <Doodle id="tunas" size={48} />
      </Animated.View>
      <Txt v="small" ink soft>
        {label}
      </Txt>
    </View>
  );
}

export function Empty({ doodle = 'tunas', title, body, action }: { doodle?: string; title: string; body?: string; action?: ReactNode }) {
  return (
    <View style={{ alignItems: 'center', padding: SPACE.xl, gap: SPACE.sm }}>
      <Doodle id={doodle} size={64} />
      <Txt v="h2" ink center>
        {title}
      </Txt>
      {body ? (
        <Txt v="small" soft center>
          {body}
        </Txt>
      ) : null}
      {action}
    </View>
  );
}

export function ErrorNote({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const msg = error instanceof Error ? error.message : 'Ada yang salah.';
  return (
    <Card style={{ alignItems: 'center', gap: SPACE.sm }}>
      <Doodle id="awan" size={40} />
      <Txt v="small" center>
        {msg}
      </Txt>
      {onRetry ? <Button kind="ghost" title="coba lagi" onPress={onRetry} /> : null}
    </Card>
  );
}

/** Kertas tempel untuk surat & kapsul waktu. */
export function Sticky({
  children,
  color = 'yellow',
  tilt = 0,
  pin = true,
  style,
  onPress,
}: {
  children: ReactNode;
  color?: 'yellow' | 'peach' | 'green' | 'blue';
  tilt?: number;
  pin?: boolean;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
}) {
  const { c } = useTheme();
  const note = (
    <View style={[{ transform: [{ rotate: `${tilt}deg` }] }, style]}>
      {pin ? (
        <View style={{ alignItems: 'center', marginBottom: -10, zIndex: 2 }}>
          <Doodle id="ui-lokasi" size={22} color={c.text} />
        </View>
      ) : null}
      <View style={[styles.sticky, { backgroundColor: c.sticky[color] }]}>{children}</View>
    </View>
  );
  return onPress ? <Pressable onPress={onPress}>{note}</Pressable> : note;
}

export function Divider() {
  const { c } = useTheme();
  return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: c.inkSoft, opacity: 0.5, marginVertical: SPACE.md }} />;
}

export function ListItem({
  icon,
  title,
  subtitle,
  onPress,
  right,
  testID,
}: {
  icon?: string;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  right?: ReactNode;
  testID?: string;
}) {
  return (
    <Pressable onPress={onPress} testID={testID} accessibilityRole={onPress ? 'button' : undefined} style={({ pressed }) => [{ paddingVertical: 12, opacity: pressed ? 0.6 : 1 }]}>
      <Row gap={14}>
        {icon ? <Doodle id={icon} size={28} /> : null}
        <View style={{ flex: 1 }}>
          <Txt>{title}</Txt>
          {subtitle ? (
            <Txt v="tiny" soft>
              {subtitle}
            </Txt>
          ) : null}
        </View>
        {right ?? (onPress ? <Doodle id="ui-panah-kanan" size={18} opacity={0.6} /> : null)}
      </Row>
    </Pressable>
  );
}

export function PressableScale(props: PressableProps & { children: ReactNode }) {
  return <Pressable {...props} style={({ pressed }) => [{ transform: [{ scale: pressed ? 0.97 : 1 }] }, props.style as ViewStyle]} />;
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  scroll: { flexGrow: 1, alignItems: 'center', paddingBottom: 140 },
  inner: { width: '100%', maxWidth: MAX_WIDTH },
  footer: { paddingHorizontal: SPACE.md, paddingTop: SPACE.sm, paddingBottom: SPACE.lg, alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACE.sm, height: 52, width: '100%', maxWidth: MAX_WIDTH + 32, alignSelf: 'center' },
  card: { borderRadius: RADIUS.lg, padding: SPACE.md, borderWidth: 1 },
  button: { minHeight: 54, borderRadius: RADIUS.sm, alignItems: 'center', justifyContent: 'center', paddingHorizontal: SPACE.lg, width: '100%', maxWidth: MAX_WIDTH },
  pill: { borderRadius: 999, paddingHorizontal: 14, paddingVertical: 7, alignSelf: 'flex-start' },
  field: { fontFamily: FONTS.mono, fontSize: 15, borderRadius: RADIUS.md, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12 },
  switch: { width: 46, height: 28, borderRadius: 14, padding: 3, justifyContent: 'center' },
  knob: { width: 22, height: 22, borderRadius: 11 },
  sticky: {
    padding: SPACE.md,
    paddingTop: SPACE.lg,
    borderRadius: 4,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
});
