import { Redirect } from 'expo-router';
import { View } from 'react-native';
import { useSession } from '@/lib/session';
import { Growing } from '@/ui/kit';
import { useTheme } from '@/ui/theme';

/** Pintu masuk: arahkan sesuai keadaan sesi. */
export default function Gate() {
  const { status } = useSession();
  const { c } = useTheme();
  if (status === 'loading') {
    return (
      <View style={{ flex: 1, backgroundColor: c.paper, justifyContent: 'center' }}>
        <Growing label="membuka kapsul…" />
      </View>
    );
  }
  if (status === 'signed_out') return <Redirect href="/mulai" />;
  if (status === 'needs_profile') return <Redirect href="/mulai/profil" />;
  if (status === 'needs_keys') return <Redirect href="/mulai/kunci" />;
  if (status === 'needs_restore') return <Redirect href="/mulai/pulihkan" />;
  return <Redirect href="/hari-ini" />;
}
