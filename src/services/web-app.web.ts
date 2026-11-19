import type { InstallDevice } from './web-app';

export type { InstallDevice } from './web-app';

// Every function checks for `window`: on web, pages are first rendered in Node.

export function isInstalledWebApp(): boolean {
  if (typeof window === 'undefined') return false;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return window.matchMedia?.('(display-mode: standalone)').matches || nav.standalone === true;
}

export function installDevice(): InstallDevice {
  if (typeof navigator === 'undefined') return 'computer';
  const ua = navigator.userAgent;
  // iPadOS reports itself as a Mac, so also check for touch.
  if (/iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) return 'iphone';
  if (/Android/.test(ua)) return 'android';
  return 'computer';
}

/**
 * Browsers may clear a website's storage (Safari after about 7 days without a
 * visit, unless it was added to the home screen). Asking for persistent
 * storage stops that where the browser agrees; it's granted silently or not at all.
 */
export async function requestPersistentStorage(): Promise<void> {
  try {
    if (typeof navigator === 'undefined' || !navigator.storage?.persist) return;
    if (await navigator.storage.persisted()) return;
    await navigator.storage.persist();
  } catch {
    // Not supported or refused: the Home card and backup reminders still cover it.
  }
}
