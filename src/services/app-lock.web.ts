/**
 * Web version of services/app-lock.ts (same exports). Browsers can't use the
 * phone's Face ID or passcode to lock a page, so the lock is phone-only.
 */

export const appLockSupported = false;

export type LockAvailability = 'biometric' | 'passcode' | 'none';

export async function lockAvailability(): Promise<LockAvailability> {
  return 'none';
}

export async function authenticate(_promptMessage: string): Promise<boolean> {
  return true;
}
