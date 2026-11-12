import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

/**
 * Saving and opening backup files on iOS/Android. The web version is
 * backup-file.web.ts; keep the exports in sync.
 */

/**
 * Writes the backup to a temporary file and opens the share sheet, where the
 * user can pick "Save to Files", Google Drive, email and so on.
 */
export async function saveBackupFile(fileName: string, contents: string): Promise<void> {
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('Sharing files isn’t available on this device.');
  }
  const file = new File(Paths.cache, fileName);
  file.create({ overwrite: true });
  await file.write(contents);
  await Sharing.shareAsync(file.uri, {
    mimeType: 'application/json',
    UTI: 'public.json',
    dialogTitle: 'Save your Goalpot backup',
  });
}

/** Lets the user choose a backup file. Returns its text, or null if they cancelled. */
export async function pickBackupFile(): Promise<string | null> {
  // Any file type: some file apps label .json files as plain text or "unknown".
  // parseBackup rejects anything that isn't a real backup.
  const result = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
  if (result.canceled) return null;
  return new File(result.assets[0].uri).text();
}
