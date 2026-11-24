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

const MAX_STATUS_BAR = 80;

export function isTouchWeb(): boolean {
  return installDevice() !== 'computer';
}

/**
 * iOS 18 draws the home-screen app from the very top of the screen (behind the
 * clock) but sizes the page as if the status bar took up room, which left an
 * empty strip of that height at the bottom. Where the page comes out shorter
 * than the screen by about a status bar, make it as tall as the screen.
 *
 * This used to wait for the notch height (env(safe-area-inset-top)), which iOS
 * sometimes hadn't worked out yet at launch, so on some launches the tab bar
 * sat too high. Now only screen sizes are used, checked again shortly after
 * launch and whenever the app comes back to the front.
 */
export function fitInstalledAppToScreen(): () => void {
  if (typeof window === 'undefined' || !isInstalledWebApp() || installDevice() !== 'iphone') return () => {};
  const html = document.documentElement;
  const fit = () => {
    // screen.height doesn't swap when the phone is turned, so only in portrait.
    const portrait = window.innerWidth === screen.width;
    const full = `${screen.height}px`;
    // Once stretched, iOS reports the full height, so keep it rather than undo it.
    const stretched = html.style.height === full;
    // A status bar is 20–62 points; a bigger gap means something else (e.g. the keyboard).
    const missing = screen.height - window.innerHeight;
    const short = missing > 0 && missing <= MAX_STATUS_BAR;
    html.style.height = portrait && (stretched || short) ? full : '';
  };
  const onVisible = () => {
    if (document.visibilityState === 'visible') fit();
  };
  fit();
  // iOS can settle the page size a moment after launch without a resize event.
  const timers = [100, 400, 1000, 2500].map((ms) => setTimeout(fit, ms));
  window.addEventListener('resize', fit);
  window.addEventListener('orientationchange', fit);
  window.addEventListener('pageshow', fit);
  document.addEventListener('visibilitychange', onVisible);
  return () => {
    timers.forEach(clearTimeout);
    window.removeEventListener('resize', fit);
    window.removeEventListener('orientationchange', fit);
    window.removeEventListener('pageshow', fit);
    document.removeEventListener('visibilitychange', onVisible);
    html.style.height = '';
  };
}
