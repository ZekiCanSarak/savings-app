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

/**
 * When the on-screen keyboard opens, iOS slides the whole page up to show the
 * field, and in the home-screen app it often leaves it there, so the top of
 * the screen ends up under the clock. The app never scrolls the page itself
 * (screens scroll inside), so putting it back at the top is always safe.
 */
export function keepPageInPlace(): () => void {
  if (typeof window === 'undefined') return () => {};
  let timer: ReturnType<typeof setTimeout> | undefined;
  const reset = () => {
    clearTimeout(timer);
    // Wait for the keyboard to finish closing (or another field to take focus).
    timer = setTimeout(() => {
      const active = document.activeElement;
      const typing = active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement;
      if (!typing && (window.scrollY !== 0 || document.documentElement.scrollTop !== 0)) {
        window.scrollTo(0, 0);
      }
    }, 100);
  };
  document.addEventListener('focusout', reset);
  window.visualViewport?.addEventListener('resize', reset);
  return () => {
    clearTimeout(timer);
    document.removeEventListener('focusout', reset);
    window.visualViewport?.removeEventListener('resize', reset);
  };
}

export function isTouchWeb(): boolean {
  return installDevice() !== 'computer';
}

/**
 * iOS 18 draws the home-screen app from the very top of the screen (behind the
 * clock) but sizes the page as if the status bar took up room, which left an
 * empty strip of that height at the bottom. Where the page comes out shorter
 * than the screen by exactly the top safe area, make it that much taller.
 */
export function fitInstalledAppToScreen(): () => void {
  if (typeof window === 'undefined' || !isInstalledWebApp()) return () => {};
  const html = document.documentElement;
  const fit = () => {
    const probe = document.createElement('div');
    probe.style.cssText = 'position:fixed;visibility:hidden;padding-top:env(safe-area-inset-top)';
    document.body.appendChild(probe);
    const top = parseFloat(getComputedStyle(probe).paddingTop) || 0;
    probe.remove();
    // screen.height doesn't swap when the phone is turned, so only in portrait.
    const portrait = window.innerWidth === screen.width;
    const full = `${screen.height}px`;
    // Once stretched, iOS reports the full height, so keep it rather than undo it.
    const stretched = html.style.height === full;
    const short = Math.abs(screen.height - window.innerHeight - top) <= 1;
    html.style.height = portrait && top > 0 && (stretched || short) ? full : '';
  };
  fit();
  window.addEventListener('resize', fit);
  return () => {
    window.removeEventListener('resize', fit);
    html.style.height = '';
  };
}
