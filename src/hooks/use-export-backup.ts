import { useAbout, useAppActions, useContributions, useGoals, useProfile } from '@/hooks/use-app-data';
import { saveBackupFile } from '@/services/backup-file';
import { backupFileName, createBackup } from '@/utils/backup';

/**
 * Exports a backup file (share sheet on phones, download or share on web) and
 * remembers when, for the backup reminder. Call it straight from a tap: web
 * browsers only allow downloads and sharing right after one.
 * Resolves true when the file was handed over, false if that failed.
 */
export function useExportBackup() {
  const profile = useProfile();
  const goals = useGoals();
  const contributions = useContributions();
  const about = useAbout();
  const { markBackedUp } = useAppActions();

  return async function exportBackup(): Promise<boolean> {
    try {
      await saveBackupFile(backupFileName(), createBackup({ profile, goals, contributions, about }));
      markBackedUp();
      return true;
    } catch (error) {
      console.warn('Export failed', error);
      return false;
    }
  };
}
