import { Stack } from 'expo-router';

import { useTheme } from '@/hooks/use-theme';

/** The Goals tab has its own stack: the list, then a goal's detail screen. */
export default function GoalsLayout() {
  const theme = useTheme();
  return (
    <Stack
      screenOptions={{
        headerShadowVisible: false,
        headerTintColor: theme.tint,
        headerTitleStyle: { color: theme.text },
        headerStyle: { backgroundColor: theme.background },
        contentStyle: { backgroundColor: theme.background },
      }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="[id]" options={{ title: '', headerBackTitle: 'Goals' }} />
    </Stack>
  );
}
