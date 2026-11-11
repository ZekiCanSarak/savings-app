import { useSyncExternalStore } from 'react';
import { useColorScheme as useRNColorScheme } from 'react-native';

const subscribe = () => () => {};

/**
 * On web, pages are first rendered on the server, which can't know the
 * viewer's colour scheme. Report 'light' there and during hydration, then the
 * real scheme in the browser, so server and client markup match.
 */
export function useColorScheme() {
  const isClient = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  const colorScheme = useRNColorScheme();
  return isClient ? colorScheme : 'light';
}
