import { Platform, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Spacing } from '@/constants/theme';
import { useAppActions, useGoals, useInstallPromptDismissed, useIsDemo } from '@/hooks/use-app-data';
import { installDevice, isInstalledWebApp } from '@/services/web-app';

const STEPS = {
  iphone: 'In Safari, tap the Share button, then “Add to Home Screen”.',
  android: 'In Chrome, tap the ⋮ menu, then “Add to Home screen” or “Install app”.',
  computer: 'Look for the install icon at the end of the address bar, or export a backup in Settings now and then.',
} as const;

/**
 * Web only: once there's a goal, explains that a browser can clear website
 * data and suggests adding Goalpot to the home screen, which keeps it.
 * Hidden when already installed, in the demo, or once closed.
 */
export function InstallCard({ index }: { index: number }) {
  const goals = useGoals();
  const dismissed = useInstallPromptDismissed();
  const demo = useIsDemo();
  const { dismissInstallPrompt } = useAppActions();

  if (Platform.OS !== 'web' || dismissed || demo || goals.length === 0 || isInstalledWebApp()) {
    return null;
  }
  const device = installDevice();

  return (
    <Card
      title="Keep your savings safe"
      subtitle="Your goals are saved in this browser, which can clear website data after a while without a visit. Adding Goalpot to your home screen keeps them, and it opens like a normal app."
      index={index}>
      <View style={styles.steps}>
        <ThemedText type="smallBold">
          {device === 'iphone' ? 'On iPhone' : device === 'android' ? 'On Android' : 'On a computer'}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {STEPS[device]}
        </ThemedText>
      </View>
      <Button title="Got it" variant="secondary" onPress={dismissInstallPrompt} />
    </Card>
  );
}

const styles = StyleSheet.create({
  steps: {
    gap: Spacing.half,
  },
});
