import '@/lib/random';
import { Caveat_500Medium, Caveat_700Bold } from '@expo-google-fonts/caveat';
import { IBMPlexMono_400Regular, IBMPlexMono_400Regular_Italic, IBMPlexMono_500Medium } from '@expo-google-fonts/ibm-plex-mono';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { useEffect, useMemo, useState } from 'react';
import { useColorScheme, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { SessionProvider, useSession } from '@/lib/session';
import { DARK, LIGHT, ThemeContext } from '@/ui/theme';
import { NotificationsBridge } from '@/lib/notifications';

SplashScreen.preventAutoHideAsync().catch(() => {});

function Themed({ children }: { children: React.ReactNode }) {
  const system = useColorScheme();
  const pref = useSession().me?.user.settings.theme ?? 'system';
  const dark = pref === 'dark' || (pref === 'system' && system === 'dark');
  const theme = useMemo(() => ({ dark, c: dark ? DARK : LIGHT }), [dark]);
  useEffect(() => {
    void SystemUI.setBackgroundColorAsync(theme.c.paper);
  }, [theme]);
  return (
    <ThemeContext.Provider value={theme}>
      <StatusBar style={dark ? 'light' : 'dark'} />
      {children}
    </ThemeContext.Provider>
  );
}

function Root() {
  const { status } = useSession();
  // Semua layar mengandalkan sesi: tunggu sampai token & kunci dibaca dari perangkat.
  if (status === 'loading') return <Themed><View style={{ flex: 1 }} /></Themed>;
  return (
    <Themed>
      <NotificationsBridge />
      <Stack screenOptions={{ headerShown: false, animation: 'fade', contentStyle: { backgroundColor: 'transparent' } }}>
        <Stack.Screen name="drop" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="segel" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="wrap/[circleId]/[scope]/[period]" options={{ presentation: 'fullScreenModal', animation: 'fade' }} />
      </Stack>
    </Themed>
  );
}

export default function Layout() {
  const [fontsLoaded] = useFonts({ IBMPlexMono_400Regular, IBMPlexMono_500Medium, IBMPlexMono_400Regular_Italic, Caveat_500Medium, Caveat_700Bold });
  const [qc] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { staleTime: 30_000, retry: (n, e) => n < 2 && (e as { status?: number }).status !== 403 && (e as { status?: number }).status !== 404 } },
      }),
  );
  useEffect(() => {
    if (fontsLoaded) void SplashScreen.hideAsync();
  }, [fontsLoaded]);
  if (!fontsLoaded) return null;
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={qc}>
          <SessionProvider>
            <Root />
          </SessionProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
