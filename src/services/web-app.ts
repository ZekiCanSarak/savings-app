/**
 * Browser-only helpers (see web-app.web.ts). On phones the app is always
 * installed and its storage is permanent, so these do nothing.
 */

export type InstallDevice = 'iphone' | 'android' | 'computer';

/** Opened from the home screen icon (an installed web app) rather than in a browser tab. */
export function isInstalledWebApp(): boolean {
  return false;
}

/** Which "add to home screen" steps to show. */
export function installDevice(): InstallDevice {
  return 'computer';
}

/** Asks the browser not to clear this site's data when space runs low or after a while. */
export async function requestPersistentStorage(): Promise<void> {}
