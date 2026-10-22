import { COPY } from '@sehari/core';
import { Redirect, router, Tabs } from 'expo-router';
import { useEffect } from 'react';
import { pendingInvite } from '@/lib/circles';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useKeyMaintenance } from '@/lib/data';
import { useSession } from '@/lib/session';
import { Doodle } from '@/ui/Doodle';
import { FONTS, useTheme } from '@/ui/theme';

const TABS: { name: string; label: string; icon: string }[] = [
  { name: 'hari-ini', label: COPY.nav.today, icon: 'ui-hari-ini' },
  { name: 'lingkaran', label: COPY.nav.circle, icon: 'ui-lingkaran' },
  { name: 'kenangan', label: COPY.nav.memories, icon: 'ui-kenangan' },
  { name: 'aku', label: COPY.nav.me, icon: 'ui-aku' },
];

function TabBar({ state, go }: { state: { index: number; routes: { name: string; key: string }[] }; go: (key: string) => void }) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const current = state.routes[state.index]?.name;
  const item = (t: (typeof TABS)[number]) => {
    const focused = current === t.name;
    return (
      <Pressable key={t.name} testID={`tab-${t.name}`} accessibilityRole="tab" accessibilityState={{ selected: focused }} onPress={() => { const r = state.routes.find((x) => x.name === t.name); if (r) go(r.key); }} style={styles.tab}>
        <Doodle id={t.icon} size={26} color={focused ? c.ink : c.inkSoft} />
        <Text style={{ fontFamily: FONTS.mono, fontSize: 10, color: focused ? c.ink : c.inkSoft, marginTop: 2 }}>{t.label.toLowerCase()}</Text>
      </Pressable>
    );
  };
  return (
    <View style={[styles.bar, { backgroundColor: c.card, borderColor: c.cardEdge, paddingBottom: Math.max(insets.bottom, 10) }]}>
      {item(TABS[0]!)}
      {item(TABS[1]!)}
      <Pressable testID="tab-drop" accessibilityRole="button" accessibilityLabel="Drop" onPress={() => router.push('/drop')} style={styles.tab}>
        <View style={[styles.fab, { backgroundColor: c.ink }]}>
          <Doodle id="ui-tambah" size={30} color={c.onInk} strokeWidth={3} />
        </View>
      </Pressable>
      {item(TABS[2]!)}
      {item(TABS[3]!)}
    </View>
  );
}

export default function TabsLayout() {
  const { status } = useSession();
  useKeyMaintenance();
  // Undangan yang dibuka sebelum masuk: lanjutkan setelah sesi siap.
  useEffect(() => {
    const inv = pendingInvite.value;
    if (status === 'ready' && inv) {
      pendingInvite.value = null;
      router.push(`/j/${inv.token}?k=${encodeURIComponent(inv.fragment)}`);
    }
  }, [status]);
  if (status === 'loading') return <View style={{ flex: 1 }} />;
  if (status !== 'ready') return <Redirect href="/" />;
  return (
    <Tabs screenOptions={{ headerShown: false }} tabBar={(p) => <TabBar state={p.state as never} go={p.navigateToTab} />}>
      {TABS.map((t) => (
        <Tabs.Screen key={t.name} name={t.name} options={{ title: t.label }} />
      ))}
    </Tabs>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', borderTopWidth: 1, paddingTop: 8, alignItems: 'center', justifyContent: 'space-around' },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 48 },
  fab: { width: 58, height: 58, borderRadius: 29, alignItems: 'center', justifyContent: 'center', marginTop: -26, shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 10, shadowOffset: { width: 0, height: 6 }, elevation: 6 },
});
