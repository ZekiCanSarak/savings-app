import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { CurrencyCode, SavingsGoal } from '@/types/models';
import type { GoalProgressRow } from '@/utils/charts';
import { formatMoney } from '@/utils/money';

type GoalProgressBarsProps = {
  /** Already ranked, most complete first (see summariseGoals). */
  rows: GoalProgressRow[];
  currency: CurrencyCode;
  onPressGoal: (goal: SavingsGoal) => void;
};

const BAR_HEIGHT = 12;

/**
 * Ranked horizontal bars comparing % complete across goals, on one shared
 * 0–100% scale. One colour for every bar (the goals' names say which is which),
 * and every bar is labelled with its % and amounts, so it needs no legend and
 * doubles as its own table view.
 */
export function GoalProgressBars({ rows, currency, onPressGoal }: GoalProgressBarsProps) {
  const theme = useTheme();

  return (
    <View style={styles.list}>
      {rows.map(({ goal, saved, percent }) => {
        const amounts = `${formatMoney(saved, currency)} of ${formatMoney(goal.targetAmount, currency)}`;
        return (
          <Pressable
            key={goal.id}
            accessibilityRole="button"
            accessibilityLabel={`${goal.name}, ${percent}% complete, ${amounts}`}
            accessibilityHint="Opens goal details"
            onPress={() => onPressGoal(goal)}
            style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
            <View style={styles.labelRow}>
              <ThemedText type="small" numberOfLines={1} style={styles.name}>
                {goal.emoji} {goal.name}
              </ThemedText>
              <ThemedText type="smallBold">{percent}%</ThemedText>
            </View>
            <View
              style={[styles.track, { backgroundColor: theme.chartTrack }]}
              importantForAccessibility="no-hide-descendants">
              {percent > 0 && (
                <View
                  style={[styles.fill, { width: `${percent}%`, backgroundColor: theme.chart }]}
                />
              )}
            </View>
            <ThemedText type="small" themeColor="textSecondary">
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
    gap: Spacing.three,
  },
  row: {
    gap: Spacing.one,
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
  // Square at the baseline (left), 4px rounded at the data end (right).
  track: {
    height: BAR_HEIGHT,
    borderTopRightRadius: 4,
    borderBottomRightRadius: 4,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderTopRightRadius: 4,
    borderBottomRightRadius: 4,
  },
});
