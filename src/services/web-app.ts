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

/** Web: keeps the page from staying slid up after the on-screen keyboard closes. Returns a cleanup. */
export function keepPageInPlace(): () => void {
  return () => {};
}

/** Web on a phone or tablet, where focusing a field opens the on-screen keyboard. */
export function isTouchWeb(): boolean {
  return false;
}

/** Web: stretches the installed iPhone app to the whole screen. Returns a cleanup. */
export function fitInstalledAppToScreen(): () => void {
  return () => {};
}
