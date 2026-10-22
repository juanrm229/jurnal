import AsyncStorage from '@react-native-async-storage/async-storage';
import type { WidgetTaskHandlerProps } from 'react-native-android-widget';
import { renderSehariWidget } from './android';
import { WIDGET_KEY, type WidgetSnapshot } from './snapshot';

/** Dipanggil Android (headless JS) saat widget ditambah, diperbarui, atau diubah ukuran. */
export async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
  const raw = await AsyncStorage.getItem(WIDGET_KEY);
  const snap = raw ? (JSON.parse(raw) as WidgetSnapshot) : null;
  switch (props.widgetAction) {
    case 'WIDGET_ADDED':
    case 'WIDGET_UPDATE':
    case 'WIDGET_RESIZED':
      props.renderWidget(renderSehariWidget(snap, props.widgetInfo.widgetName === 'SehariTaman' ? 'garden' : 'small'));
      break;
    default:
      break;
  }
}
