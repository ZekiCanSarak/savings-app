import { Stack } from 'expo-router';

import { useWebSafeAreaTop } from '@/components/ui/safe-area-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** The Goals tab has its own stack: the list, then a goal's detail screen. */
export default function GoalsLayout() {
  const theme = useTheme();
  // On web the header's own safe-area measurement reads 0, which put the back
  // button under the iPhone notch in the home-screen app (see safe-area-view.web.tsx).
  // The extra space keeps it out of the strip iOS fades just under the clock.
  const webTop = useWebSafeAreaTop();
  return (
    <Stack
      screenOptions={{
        headerShadowVisible: false,
        headerTintColor: theme.tint,
        headerTitleStyle: { color: theme.text },
        headerStyle: { backgroundColor: theme.background },
        contentStyle: { backgroundColor: theme.background },
        ...(webTop !== undefined && { headerStatusBarHeight: webTop ? webTop + Spacing.three : 0 }),
      }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="[id]" options={{ title: '', headerBackTitle: 'Goals' }} />
    </Stack>
  );
}
