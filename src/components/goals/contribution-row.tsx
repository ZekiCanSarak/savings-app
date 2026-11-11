import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { Contribution, CurrencyCode } from '@/types/models';
import { formatRelativeDay } from '@/utils/dates';
import { formatMoney } from '@/utils/money';

type ContributionRowProps = {
  contribution: Contribution;
  currency: CurrencyCode;
  onDelete: () => void;
};

/** One line in a goal's savings history, with a delete button. */
export function ContributionRow({ contribution, currency, onDelete }: ContributionRowProps) {
  const theme = useTheme();
  const amount = formatMoney(contribution.amount, currency);
  const day = formatRelativeDay(contribution.date);

  return (
    <View style={styles.row}>
      <View style={styles.details}>
        <ThemedText type="smallBold">+{amount}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary" numberOfLines={2}>
          {day}
          {contribution.note ? ` · ${contribution.note}` : ''}
        </ThemedText>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Delete ${amount} saved ${day}`}
        onPress={onDelete}
        hitSlop={6}
        style={({ pressed }) => [
          styles.deleteButton,
          { borderColor: theme.border },
          pressed && styles.pressed,
        ]}>
        <ThemedText type="small" themeColor="danger">
          Delete
        </ThemedText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    minHeight: 48,
  },
  details: {
    flex: 1,
  },
  deleteButton: {
    minHeight: 36,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.two,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.6,
  },
});
