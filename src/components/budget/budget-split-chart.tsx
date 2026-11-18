import { StyleSheet, Text, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { BudgetStyle, CurrencyCode } from '@/types/models';
import { labelColourOn, splitRule, type BudgetSplit } from '@/utils/budget';
import { formatMoney } from '@/utils/money';

const PARTS = {
  needs: { name: 'Needs', examples: 'Rent or mortgage, bills, food, transport' },
  wants: { name: 'Wants', examples: 'Eating out, hobbies, shopping, subscriptions' },
  savings: { name: 'Savings', examples: 'Goals, emergency fund, paying off debt' },
} as const;

const BAR_HEIGHT = 28;

type BudgetSplitChartProps = {
  split: BudgetSplit;
  currency: CurrencyCode;
  /** Which shares to draw; must match the style `split` was made with. */
  style?: BudgetStyle;
};

/**
 * The budget split (50/30/20 or the chosen style) as one segmented bar (one whole, three parts), with each
 * part's share printed on it, and a row per part below with its amount. The
 * swatch on each row is the legend, and the rows are the table view.
 */
export function BudgetSplitChart({ split, currency, style = '50-30-20' }: BudgetSplitChartProps) {
  const theme = useTheme();
  const rule = splitRule(style);
  const colours = {
    needs: theme.budgetNeeds,
    wants: theme.budgetWants,
    savings: theme.budgetSavings,
  };
  const description = rule.map(
    ({ key, share }) => `${PARTS[key].name} ${share}%, ${formatMoney(split[key], currency)}`,
  ).join('; ');

  return (
    <View style={styles.wrapper}>
      <View
        accessible
        accessibilityRole="image"
        accessibilityLabel={`Suggested split: ${description}.`}
        style={styles.bar}>
        {rule.map(({ key, share }) => (
          <View key={key} style={[styles.segment, { flex: share, backgroundColor: colours[key] }]}>
            <Text style={[styles.segmentLabel, { color: labelColourOn(colours[key]) }]}>
              {share}%
            </Text>
          </View>
        ))}
      </View>

      <View style={styles.rows}>
        {rule.map(({ key, share }) => (
          <View key={key} style={styles.row}>
            <View style={[styles.swatch, { backgroundColor: colours[key] }]} />
            <View style={styles.rowText}>
              <ThemedText type="smallBold">
                {PARTS[key].name}{' '}
                <ThemedText type="small" themeColor="textSecondary">
                  {share}%
                </ThemedText>
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {PARTS[key].examples}
              </ThemedText>
            </View>
            <ThemedText type="smallBold" style={{ color: theme.text }}>
              {formatMoney(split[key], currency)}
            </ThemedText>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: Spacing.three,
  },
  // 2px gaps between parts let the card colour separate them (no borders).
  bar: {
    flexDirection: 'row',
    gap: 2,
    height: BAR_HEIGHT,
  },
  segment: {
    borderRadius: 4,
    justifyContent: 'center',
    paddingHorizontal: Spacing.two,
  },
  segmentLabel: {
    fontSize: 13,
    fontWeight: 700,
  },
  rows: {
    gap: Spacing.three,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  swatch: {
    width: 12,
    height: 12,
    borderRadius: 3,
  },
  rowText: {
    flex: 1,
  },
});
