import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
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
  return (
    <View style={styles.wrapper}>
      <ThemedView type="backgroundElement" style={styles.hero}>
        <ThemedText type="small" themeColor="textSecondary">
          Total saved
        </ThemedText>
        <ThemedText type="title" adjustsFontSizeToFit numberOfLines={1}>
          {formatMoney(summary.totalSaved, currency)}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          across {goalCount} goal{goalCount === 1 ? '' : 's'}
        </ThemedText>
      </ThemedView>

      <View style={styles.tiles}>
        <StatTile label="Still to save" value={formatMoney(summary.totalRemaining, currency)} />
        <StatTile label="Goals reached" value={`${summary.completedCount} of ${goalCount}`} />
      </View>
    </View>
  );
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <ThemedView type="backgroundElement" style={styles.tile}>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
      <ThemedText style={styles.tileValue} adjustsFontSizeToFit numberOfLines={1}>
        {value}
      </ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: Spacing.three,
  },
  hero: {
    gap: Spacing.one,
    padding: Spacing.four,
    borderRadius: Spacing.four,
  },
  tiles: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  tile: {
    flex: 1,
    gap: Spacing.one,
    padding: Spacing.three,
    borderRadius: Spacing.four,
  },
  tileValue: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: 600,
  },
});
