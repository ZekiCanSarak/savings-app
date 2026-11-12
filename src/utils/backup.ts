import { DEFAULT_CURRENCY } from '@/constants/currencies';
import { sanitizeContributions, sanitizeGoals, sanitizeProfile } from '@/storage/sanitize';
import type { AppData, IsoTimestamp } from '@/types/models';
import { nowIsoTimestamp, todayIsoDate } from '@/utils/dates';
import type { ValidationResult } from '@/utils/validation';

/**
 * "Export my data" / "Import my data" (Settings). A backup is a JSON file
 * holding the profile, goals and savings.
 *
 * Reminder settings are left out on purpose: they depend on this device's
 * notification permission, so an import keeps the current device's settings.
 */

/** What a backup holds and what an import replaces. */
export type BackupData = Pick<AppData, 'profile' | 'goals' | 'contributions'>;

type BackupFile = {
  app: typeof BACKUP_APP;
  /** Bump if the file's shape changes, and keep reading older versions. */
  version: number;
  exportedAt: IsoTimestamp;
  data: BackupData;
};

const BACKUP_APP = 'goalpot';
const BACKUP_VERSION = 1;
/** Far more than any real backup; stops a wrong (huge) file freezing the app. */
export const MAX_BACKUP_BYTES = 5_000_000;

export function backupFileName(today = todayIsoDate()): string {
  return `goalpot-backup-${today}.json`;
}

export function createBackup(data: BackupData, exportedAt = nowIsoTimestamp()): string {
  const file: BackupFile = {
    app: BACKUP_APP,
    version: BACKUP_VERSION,
    exportedAt,
    data: { profile: data.profile, goals: data.goals, contributions: data.contributions },
  };
  return JSON.stringify(file, null, 2);
}

const NOT_A_BACKUP = 'This file isn’t a Goalpot backup. Choose a file made with “Export my data”.';
const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;

/**
 * Reads a backup file's text. Bad entries are repaired or dropped the same way
 * as saved data (see sanitize.ts), so an edited or damaged file can't break the app.
 */
export function parseBackup(text: string): ValidationResult<BackupData> {
  if (text.length > MAX_BACKUP_BYTES) return { ok: false, error: NOT_A_BACKUP };
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, error: NOT_A_BACKUP };
  }
  if (!isObject(parsed) || parsed.app !== BACKUP_APP || !isObject(parsed.data)) {
    return { ok: false, error: NOT_A_BACKUP };
  }
  if (typeof parsed.version === 'number' && parsed.version > BACKUP_VERSION) {
    return {
      ok: false,
      error: 'This backup was made by a newer version of the app. Update the app, then try again.',
    };
  }

  const { data } = parsed;
  const goals = sanitizeGoals(data.goals);
  return {
    ok: true,
    value: {
      profile: sanitizeProfile(data.profile, {
        name: '',
        currency: DEFAULT_CURRENCY,
        monthlyIncome: null,
      }),
      goals,
      contributions: sanitizeContributions(data.contributions, new Set(goals.map((g) => g.id))),
    },
  };
}
