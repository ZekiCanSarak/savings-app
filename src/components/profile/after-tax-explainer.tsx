import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** Short explanation of "income after tax", shown next to the income field. */
export function AfterTaxExplainer() {
  const theme = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: theme.background, borderColor: theme.border }]}>
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
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Radius.control,
    borderWidth: 1,
  },
});
