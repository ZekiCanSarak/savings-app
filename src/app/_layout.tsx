import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { ReminderScheduler } from '@/components/reminders/reminder-scheduler';
import { useIsDataReady, useIsOnboarded } from '@/hooks/use-app-data';

import { configureNotifications } from '@/services/notifications';

SplashScreen.preventAutoHideAsync();
configureNotifications();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const isDataReady = useIsDataReady();
  const isOnboarded = useIsOnboarded();

  // Keep the splash screen up until saved data has loaded, so screens never
  // flash empty data. (AnimatedSplashOverlay hides the splash when it mounts.)
  if (!isDataReady) return null;

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AnimatedSplashOverlay />
      {isOnboarded && <ReminderScheduler />}
      {/*
        Protected routes: only one of these is reachable at a time. When onboarding
        finishes, `isOnboarded` flips and the router moves to the tabs (Home) by itself.
      */}
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Protected guard={isOnboarded}>
          <Stack.Screen name="(tabs)" />
          {/* Add / edit a goal. Opens over the tabs. */}
          <Stack.Screen name="goal-editor" options={{ presentation: 'modal' }} />
          {/* Log money saved toward a goal. */}
          <Stack.Screen name="add-money" options={{ presentation: 'modal' }} />
          {/* Explains reminders before asking for notification permission. */}
          <Stack.Screen name="reminder-setup" options={{ presentation: 'modal' }} />
        </Stack.Protected>
        <Stack.Protected guard={!isOnboarded}>
          <Stack.Screen name="onboarding" />
        </Stack.Protected>
      </Stack>
    </ThemeProvider>
  );
}
