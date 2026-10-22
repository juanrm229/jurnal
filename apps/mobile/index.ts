// Titik masuk: expo-router + pendaftaran penangan widget Android.
import 'expo-router/entry';
import { Platform } from 'react-native';

if (Platform.OS === 'android') {
  const { registerWidgetTaskHandler } = require('react-native-android-widget') as typeof import('react-native-android-widget');
  const { widgetTaskHandler } = require('./src/widget/task-handler') as typeof import('./src/widget/task-handler');
  registerWidgetTaskHandler(widgetTaskHandler);
}
