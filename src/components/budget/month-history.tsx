import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import type { Contribution, CurrencyCode } from '@/types/models';
import { formatMoney } from '@/utils/money';
import { monthlyHistory } from '@/utils/streaks';

const MONTHS_SHOWN = 6;

type MonthHistoryProps = {
  contributions: Contribution[];
  currency: CurrencyCode;
  /** Suggested monthly saving; a month at or above it gets a tick. 0 = no ticks. */
  suggested: number;
};

/** The last few months, newest first: what was saved, and a ✓ when the suggestion was met. */
export function MonthHistory({ contributions, currency, suggested }: MonthHistoryProps) {
  const months = monthlyHistory(contributions).slice(-MONTHS_SHOWN).reverse();
  if (months.length === 0) {
    return (
      <ThemedText type="small" themeColor="textSecondary">
        Once you add money to a goal, each month you save will show here.
      </ThemedText>
    );
  }
  return (
    <View style={styles.list}>
      {months.map((m, i) => {
        const name = new Date(m.month.year, m.month.month, 1).toLocaleDateString('en-GB', {
          month: 'long',
          ...(m.month.year !== new Date().getFullYear() ? { year: 'numeric' } : {}),
        });
        const amount = Math.max(0, m.net);
        const hit = suggested > 0 && amount >= suggested;
        return (
          <View
            key={m.key}
            style={styles.row}
            accessible
            accessibilityLabel={`${name}: ${formatMoney(amount, currency)} saved${hit ? ', suggested amount reached' : ''}`}>
            <ThemedText type={i === 0 ? 'smallBold' : 'small'} style={styles.month}>
              {name}
              {i === 0 ? ' (so far)' : ''}
            </ThemedText>
            <ThemedText type="smallBold">
              {formatMoney(amount, currency, { decimals: 'always' })}
            </ThemedText>
            <ThemedText type="smallBold" themeColor="tint" style={styles.tick} importantForAccessibility="no">
              {hit ? '✓' : ''}
            </ThemedText>
          </View>
        );
      })}
      {suggested > 0 && (
        <ThemedText type="caption" themeColor="textSecondary">
          ✓ = you saved at least your suggested {formatMoney(suggested, currency)} that month.
        </ThemedText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: Spacing.two,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  month: {
    flex: 1,
  },
  tick: {
    width: 20,
    textAlign: 'center',
  },
});
