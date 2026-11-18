import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { TextButton } from '@/components/ui/text-button';
import { Radius, Spacing } from '@/constants/theme';
import { useAppActions, useIsDemo } from '@/hooks/use-app-data';
import { useTheme } from '@/hooks/use-theme';
import { confirmAction } from '@/services/confirm';

/**
 * Shown at the top of every tab while "Try the demo" data is loaded, so it's
 * clear the numbers aren't real, with a way to start properly.
 */
export function DemoBanner() {
  const theme = useTheme();
  const isDemo = useIsDemo();
  const { endDemo } = useAppActions();
  if (!isDemo) return null;

  function startForReal() {
    confirmAction(
      'Start for real?',
      'This clears the sample data and takes you to set up Goalpot with your own goals.',
      'Start',
      endDemo,
      false,
    );
  }

  return (
    <View style={[styles.banner, { backgroundColor: theme.backgroundSelected }]}>
      <ThemedText type="small" style={styles.text}>
        <ThemedText type="smallBold">Demo</ThemedText> · You’re looking at sample data.
      </ThemedText>
      <TextButton
        title="Start for real"
        accessibilityHint="Clears the sample data and starts setting up the app"
        onPress={startForReal}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderRadius: Radius.control,
    paddingLeft: Spacing.three,
    paddingRight: Spacing.two,
  },
  text: {
    flex: 1,
    paddingVertical: Spacing.two,
  },
});
