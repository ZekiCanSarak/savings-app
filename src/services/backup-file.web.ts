import { MAX_BACKUP_BYTES } from '@/utils/backup';

/**
 * Web version of backup-file.ts (same exports). Must be called straight from a
 * tap: browsers only allow sharing and file pickers in response to one.
 */

/** Phones and tablets get the share sheet ("Save to Files"); computers get a normal download. */
function prefersShareSheet(): boolean {
  return window.matchMedia?.('(pointer: coarse)').matches ?? false;
}

export async function saveBackupFile(fileName: string, contents: string): Promise<void> {
  const file = new File([contents], fileName, { type: 'application/json' });

  if (prefersShareSheet() && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: 'Goalpot backup' });
      return;
    } catch (error) {
      // Closing the share sheet isn't an error.
      if (error instanceof DOMException && error.name === 'AbortError') return;
      // Otherwise fall back to a download below.
    }
  }

  const url = URL.createObjectURL(file);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Give the browser a moment to start the download before freeing the file.
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/** Opens the browser's file picker. Returns the file's text, or null if cancelled. */
export function pickBackupFile(): Promise<string | null> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json,text/plain';
    input.addEventListener('change', () => {
      const file = input.files?.[0];
      if (!file) return resolve(null);
      // A huge file can't be a backup; skip reading it.
      if (file.size > MAX_BACKUP_BYTES) return resolve('');
      file.text().then(resolve, reject);
    });
    input.addEventListener('cancel', () => resolve(null));
    input.click();
  });
}
