import * as Clipboard from 'expo-clipboard';
import { Platform, Share } from 'react-native';

export async function shareText(message: string, url?: string): Promise<'shared' | 'copied'> {
  const full = url ? `${message}\n${url}` : message;
  if (Platform.OS === 'web') {
    const nav = globalThis.navigator as Navigator | undefined;
    if (nav?.share) {
      try {
        await nav.share({ text: message, url });
        return 'shared';
      } catch {}
    }
    await Clipboard.setStringAsync(full);
    return 'copied';
  }
  await Share.share({ message: full, url });
  return 'shared';
}
