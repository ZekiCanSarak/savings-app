import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

/** Short explanation of "income after tax", shown next to the income field. */
export function AfterTaxExplainer() {
  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <ThemedText type="smallBold">What does “after tax” mean?</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        It’s the money that actually lands in your bank account each month, after things like
        income tax, National Insurance and pension contributions are taken off. You’ll find it on
        your payslip as “net pay”.
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        If your income changes month to month, use a typical month. You can change it any time in
        Settings.
      </ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Spacing.three,
  },
});
