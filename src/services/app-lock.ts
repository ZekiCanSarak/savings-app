import * as LocalAuthentication from 'expo-local-authentication';

/**
 * The only file that imports expo-local-authentication (Face ID, fingerprint
 * or the phone's passcode). The web version is app-lock.web.ts; keep the
 * exports in sync.
 */

export const appLockSupported = true;

export type LockAvailability = 'biometric' | 'passcode' | 'none';

/** What the phone can unlock with. 'none' = no passcode set up, so locking isn't possible. */
export async function lockAvailability(): Promise<LockAvailability> {
  try {
    const level = await LocalAuthentication.getEnrolledLevelAsync();
    if (level === LocalAuthentication.SecurityLevel.NONE) return 'none';
    if (level === LocalAuthentication.SecurityLevel.SECRET) return 'passcode';
    return 'biometric';
  } catch {
    return 'none';
  }
}

/**
 * Asks for Face ID / fingerprint, falling back to the phone's passcode.
 * Resolves true when the user is confirmed.
 */
export async function authenticate(promptMessage: string): Promise<boolean> {
  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage,
      cancelLabel: 'Cancel',
      disableDeviceFallback: false,
    });
    return result.success;
  } catch {
    return false;
  }
}
