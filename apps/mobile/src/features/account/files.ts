/** Simpan/bagikan berkas teks (ekspor data). */
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

export async function saveTextFile(name: string, text: string, mime = 'application/json'): Promise<'downloaded' | 'shared' | 'saved'> {
  if (Platform.OS === 'web') {
    const blob = new Blob([text], { type: `${mime};charset=utf-8` });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
    return 'downloaded';
  }
  const file = new File(Paths.cache, name);
  if (file.exists) file.delete();
  file.create();
  await file.write(text);
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(file.uri, { mimeType: mime, dialogTitle: 'Simpan arsip Sehari', UTI: 'public.json' });
    return 'shared';
  }
  return 'saved';
}
