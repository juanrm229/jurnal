import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { APP_GROUP, WIDGET_KEY, type WidgetSnapshot } from './snapshot';

/** Simpan snapshot & minta widget menggambar ulang (Android & iOS). */
export async function publishWidget(snap: WidgetSnapshot): Promise<void> {
  if (Platform.OS === 'web') return;
  await AsyncStorage.setItem(WIDGET_KEY, JSON.stringify(snap));
  try {
    if (Platform.OS === 'android') {
      const { requestWidgetUpdate } = await import('react-native-android-widget');
      const { renderSehariWidget } = await import('./android');
      await requestWidgetUpdate({ widgetName: 'Sehari', renderWidget: () => renderSehariWidget(snap) });
      await requestWidgetUpdate({ widgetName: 'SehariTaman', renderWidget: () => renderSehariWidget(snap, 'garden') });
    } else if (Platform.OS === 'ios') {
      const { ExtensionStorage } = await import('@bacons/apple-targets');
      const store = new ExtensionStorage(APP_GROUP);
      store.set('snapshot', JSON.stringify(snap));
      ExtensionStorage.reloadWidget();
    }
  } catch {
    // Expo Go tidak punya modul native widget — abaikan.
  }
}
