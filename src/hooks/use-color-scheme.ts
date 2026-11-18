import { useColorScheme as useSystemColorScheme } from 'react-native';

import { useAppearance } from '@/hooks/use-app-data';

/**
 * Light or dark: the user's choice in Settings → Appearance, or the phone's
 * setting when that's "System". The root layout also passes the choice to
 * the OS (Appearance.setColorScheme) so native parts like the tab bar match.
 */
export function useColorScheme() {
  const appearance = useAppearance();
  const system = useSystemColorScheme();
  return appearance === 'system' ? system : appearance;
}
