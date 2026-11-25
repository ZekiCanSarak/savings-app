import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

/**
 * Sharing a PNG on iOS/Android. The web version is share-image.web.ts; keep
 * the exports in sync. Nothing is uploaded: the share sheet hands the image to
 * whichever app the user picks.
 */
export async function shareImage(fileName: string, pngBase64: string): Promise<void> {
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('Sharing isn’t available on this device.');
  }
  const file = new File(Paths.cache, fileName);
  file.create({ overwrite: true });
  await file.write(pngBase64, { encoding: 'base64' });
  await Sharing.shareAsync(file.uri, {
    mimeType: 'image/png',
    UTI: 'public.png',
    dialogTitle: 'Share your progress',
  });
}
