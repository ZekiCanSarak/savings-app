import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { MinTapSize, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { Contribution, CurrencyCode } from '@/types/models';
import { formatRelativeDay } from '@/utils/dates';
import { formatMoney } from '@/utils/money';

type ContributionRowProps = {
  contribution: Contribution;
  currency: CurrencyCode;
  onEdit: () => void;
  onDelete: () => void;
};

/** One line in a goal's savings history, with Edit and Delete buttons. Money taken out shows as −£50. */
export function ContributionRow({ contribution, currency, onEdit, onDelete }: ContributionRowProps) {
  const theme = useTheme();
  const amount = formatMoney(contribution.amount, currency);
  const day = formatRelativeDay(contribution.date);
  const out = contribution.withdrawal === true;

  return (
    <View style={styles.row}>
      <View style={styles.details}>
        <ThemedText type="smallBold" themeColor={out ? 'danger' : 'text'}>
          {out ? `−${amount} taken out` : `+${amount}`}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary" numberOfLines={2}>
          {day}
          {contribution.note ? ` · ${contribution.note}` : ''}
        </ThemedText>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Edit ${amount} ${out ? 'taken out' : 'saved'} ${day}`}
        onPress={onEdit}
        hitSlop={6}
        style={({ pressed }) => [
          styles.rowButton,
          { borderColor: theme.border },
          pressed && styles.pressed,
        ]}>
        <ThemedText type="small" themeColor="tint">
          Edit
        </ThemedText>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Delete ${amount} ${out ? 'taken out' : 'saved'} ${day}`}
        onPress={onDelete}
        hitSlop={6}
        style={({ pressed }) => [
          styles.rowButton,
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
    gap: Spacing.two,
    minHeight: 48,
  },
  details: {
    flex: 1,
  },
  rowButton: {
    minHeight: MinTapSize,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.small,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.6,
  },
});
