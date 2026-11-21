/**
 * Keeps content clear of the notch, status bar and home indicator. On phones
 * this is react-native-safe-area-context's SafeAreaView; the web version
 * (safe-area-view.web.tsx) pads with the browser's own safe-area values.
 */
export { SafeAreaView } from 'react-native-safe-area-context';

/** Web only (see safe-area-view.web.tsx): the top safe area in pixels. Phones don't need it. */
export function useWebSafeAreaTop(): number | undefined {
  return undefined;
}
