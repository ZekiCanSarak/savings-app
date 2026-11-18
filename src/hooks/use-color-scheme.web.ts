import { useSyncExternalStore } from 'react';
import { useColorScheme as useRNColorScheme } from 'react-native';

import { useAppearance } from '@/hooks/use-app-data';

const subscribe = () => () => {};

/**
 * On web, pages are first rendered on the server, which can't know the
 * viewer's colour scheme. Report 'light' there and during hydration, then the
 * real scheme in the browser, so server and client markup match.
 * The user's choice in Settings → Appearance wins over the browser's setting.
 */
export function useColorScheme() {
  const isClient = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  const appearance = useAppearance();
  const colorScheme = useRNColorScheme();
  if (!isClient) return 'light';
  return appearance === 'system' ? colorScheme : appearance;
}
