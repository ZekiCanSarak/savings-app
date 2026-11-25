import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Appearance, Platform } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { AppLockGate } from '@/components/app-lock-gate';
import { ReminderScheduler } from '@/components/reminders/reminder-scheduler';
import { RepeatingSaver } from '@/components/repeating/repeating-saver';
import { Colors } from '@/constants/theme';
import { useAppearance, useIsDataReady, useIsOnboarded } from '@/hooks/use-app-data';
import { useSaveFailedAlert } from '@/hooks/use-save-failed-alert';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { configureNotifications } from '@/services/notifications';
import { fitInstalledAppToScreen, keepPageInPlace, requestPersistentStorage } from '@/services/web-app';

SplashScreen.preventAutoHideAsync();
configureNotifications();

/**
 * Navigation colours (headers, back buttons, screen backgrounds) built from our
 * own palette, so native headers match the rest of the app in both modes.
 */
const navigationThemes = {
  light: {
    ...DefaultTheme,
    colors: {
      ...DefaultTheme.colors,
      primary: Colors.light.tint,
      background: Colors.light.background,
      card: Colors.light.background,
      text: Colors.light.text,
      border: Colors.light.border,
    },
  },
  dark: {
    ...DarkTheme,
    colors: {
      ...DarkTheme.colors,
      primary: Colors.dark.tint,
      background: Colors.dark.background,
      card: Colors.dark.background,
      text: Colors.dark.text,
      border: Colors.dark.border,
    },
  },
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const isDataReady = useIsDataReady();
  const isOnboarded = useIsOnboarded();
  const appearance = useAppearance();

  // Tell the phone about Settings → Appearance, so native parts (tab bar,
  // keyboard, alerts) match. Browsers have no equivalent; the web uses our hook only.
  useEffect(() => {
    if (Platform.OS === 'web') return;
    Appearance.setColorScheme(appearance === 'system' ? 'unspecified' : appearance);
  }, [appearance]);

  // Once someone has data worth keeping, ask the browser not to clear it (no-op on phones).
  useEffect(() => {
    if (isOnboarded) void requestPersistentStorage();
  }, [isOnboarded]);

  // iOS can leave the page slid up under the clock after the keyboard closes (no-op on phones).
  useEffect(() => keepPageInPlace(), []);
  useEffect(() => fitInstalledAppToScreen(), []);
  useSaveFailedAlert();

  // Keep the splash screen up until saved data has loaded, so screens never
  // flash empty data. (AnimatedSplashOverlay hides the splash when it mounts.)
  if (!isDataReady) return null;

  return (
    <ThemeProvider value={navigationThemes[colorScheme === 'dark' ? 'dark' : 'light']}>
      <StatusBar style="auto" />
      <AnimatedSplashOverlay />
      {isOnboarded && <ReminderScheduler />}
      {isOnboarded && <RepeatingSaver />}
      {isOnboarded && <AppLockGate />}
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
          {/* "About you" questions that personalise the app. */}
          <Stack.Screen name="about-you" options={{ presentation: 'modal' }} />
          {/* Share one amount between several goals. */}
          <Stack.Screen name="split-money" options={{ presentation: 'modal' }} />
          {/* A summary of a year's saving, opened with ?year=2026. */}
          <Stack.Screen name="year-review" options={{ presentation: 'modal' }} />
          {/* Set up or change a goal's repeating saving, opened with ?goalId=. */}
          <Stack.Screen name="repeating-saving" options={{ presentation: 'modal' }} />
        </Stack.Protected>
        <Stack.Protected guard={!isOnboarded}>
          <Stack.Screen name="onboarding" />
        </Stack.Protected>
      </Stack>
    </ThemeProvider>
  );
}
