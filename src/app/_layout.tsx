import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { useIsDataReady, useIsOnboarded } from '@/hooks/use-app-data';

SplashScreen.preventAutoHideAsync();

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
      {/*
        Protected routes: only one of these is reachable at a time. When onboarding
        finishes, `isOnboarded` flips and the router moves to the tabs (Home) by itself.
      */}
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Protected guard={isOnboarded}>
          <Stack.Screen name="(tabs)" />
        </Stack.Protected>
        <Stack.Protected guard={!isOnboarded}>
          <Stack.Screen name="onboarding" />
        </Stack.Protected>
      </Stack>
    </ThemeProvider>
  );
}
