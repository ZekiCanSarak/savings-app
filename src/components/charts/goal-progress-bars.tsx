import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ProgressBar } from '@/components/ui/progress-bar';
import { MinTapSize, Spacing } from '@/constants/theme';
import type { CurrencyCode, SavingsGoal } from '@/types/models';
import type { GoalProgressRow } from '@/utils/charts';
import { formatMoney } from '@/utils/money';

type GoalProgressBarsProps = {
  /** Already ranked, most complete first (see summariseGoals). */
  rows: GoalProgressRow[];
  currency: CurrencyCode;
  onPressGoal: (goal: SavingsGoal) => void;
};

/**
 * Ranked horizontal bars comparing % complete across goals, on one shared
 * 0–100% scale. One colour for every bar (the goals' names say which is which),
 * and every bar is labelled with its % and amounts, so it needs no legend and
 * doubles as its own table view.
 */
export function GoalProgressBars({ rows, currency, onPressGoal }: GoalProgressBarsProps) {
  return (
    <View style={styles.list}>
      {rows.map(({ goal, saved, percent }) => {
        const amounts = `${formatMoney(saved, currency)} of ${formatMoney(goal.targetAmount, currency)}`;
        return (
          <Pressable
            key={goal.id}
            accessibilityRole="button"
            accessibilityLabel={`${goal.name}, ${percent}% complete, ${amounts} saved`}
            accessibilityHint="Opens goal details"
            onPress={() => onPressGoal(goal)}
            style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
            <View style={styles.labelRow}>
              <ThemedText type="smallBold" numberOfLines={1} style={styles.name}>
                {goal.emoji} {goal.name}
              </ThemedText>
              <ThemedText type="smallBold">{percent}%</ThemedText>
            </View>
            <View importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
              <ProgressBar percent={percent} />
            </View>
            <ThemedText type="caption" themeColor="textSecondary">
              {amounts}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: Spacing.two,
  },
  row: {
    gap: Spacing.one + Spacing.half,
    minHeight: MinTapSize,
    paddingVertical: Spacing.one,
  },
  pressed: {
    opacity: 0.7,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  name: {
    flex: 1,
  },
});
