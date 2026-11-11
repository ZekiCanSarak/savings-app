import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { Spacing } from '@/constants/theme';
import type { CurrencyCode } from '@/types/models';
import type { GoalsSummary } from '@/utils/charts';
import { formatMoney } from '@/utils/money';

type SavingsSummaryProps = {
  summary: GoalsSummary;
  goalCount: number;
  currency: CurrencyCode;
};

/** Headline numbers: total saved (the one big figure), then two smaller stat tiles. */
export function SavingsSummary({ summary, goalCount, currency }: SavingsSummaryProps) {
  const total = formatMoney(summary.totalSaved, currency);
  return (
    <View style={styles.wrapper}>
      <Card index={0} style={styles.hero}>
        <View accessible accessibilityLabel={`Total saved: ${total}, across ${goalCount} goal${goalCount === 1 ? '' : 's'}`}>
          <ThemedText type="small" themeColor="textSecondary">
            Total saved
          </ThemedText>
          <ThemedText type="hero" adjustsFontSizeToFit numberOfLines={1}>
            {total}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            across {goalCount} goal{goalCount === 1 ? '' : 's'}
          </ThemedText>
        </View>
      </Card>

      <View style={styles.tiles}>
        <StatTile label="Still to save" value={formatMoney(summary.totalRemaining, currency)} />
        <StatTile label="Goals reached" value={`${summary.completedCount} of ${goalCount}`} />
      </View>
    </View>
  );
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <Card index={1} style={styles.tile}>
      <View accessible accessibilityLabel={`${label}: ${value}`} style={styles.tileInner}>
        <ThemedText type="small" themeColor="textSecondary">
          {label}
        </ThemedText>
        <ThemedText type="heading" style={styles.tileValue} adjustsFontSizeToFit numberOfLines={1}>
          {value}
        </ThemedText>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: Spacing.three,
  },
  hero: {
    paddingVertical: Spacing.four,
  },
  tiles: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  tile: {
    flex: 1,
  },
  tileInner: {
    gap: Spacing.one,
  },
  tileValue: {
    fontSize: 22,
    lineHeight: 28,
  },
});
