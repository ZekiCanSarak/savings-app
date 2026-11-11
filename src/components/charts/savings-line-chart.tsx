import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';
import { useReducedMotion } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { CURRENCIES } from '@/constants/currencies';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { Contribution, CurrencyCode, SavingsGoal } from '@/types/models';
import { formatCompactMoney, niceAxis, savingsOverTime } from '@/utils/charts';
import { formatRelativeDay, relativeDayInSentence } from '@/utils/dates';
import { formatMoney } from '@/utils/money';

type SavingsLineChartProps = {
  goal: SavingsGoal;
  contributions: Contribution[];
  currency: CurrencyCode;
};

const CHART_HEIGHT = 170;
const Y_LABEL_WIDTH = 46;
const INITIAL_SPACING = 4;
const END_SPACING = 10;
const SECTIONS = 4;
/** End dot: 8px fill + 2px ring in the card colour, so it stays readable on the line. */
const DOT_SIZE = 12;

/**
 * Total saved toward one goal over time (a single green line with a soft area
 * wash), with the target as a dashed line. Touch and drag to read a value.
 * The savings history list below this chart doubles as its table view.
 */
export function SavingsLineChart({ goal, contributions, currency }: SavingsLineChartProps) {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  const [width, setWidth] = useState(0);

  const points = savingsOverTime(goal, contributions);
  const symbol = CURRENCIES.find((c) => c.code === currency)?.symbol ?? '';
  const money = (amount: number) => formatMoney(amount, currency);

  if (points.length === 0) {
    return (
      <View style={[styles.empty, { borderColor: theme.chartGrid }]}>
        <ThemedText type="emoji" importantForAccessibility="no">📈</ThemedText>
        <ThemedText type="small" themeColor="textSecondary" style={styles.center}>
          Your progress chart will appear here once you add money.
        </ThemedText>
      </View>
    );
  }

  // The chart works in whole units (pounds), our data is in minor units (pence).
  const values = points.map((p) => p.total / 100);
  const target = goal.targetAmount / 100;
  const { max, step } = niceAxis(Math.max(target, ...values) * 1.1, SECTIONS);
  const last = points.length - 1;
  const latest = points[last];

  const plotWidth = Math.max(0, width - Y_LABEL_WIDTH);
  const spacing = last > 0 ? (plotWidth - INITIAL_SPACING - END_SPACING) / last : 0;

  const data = values.map((value, i) => ({
    value,
    hideDataPoint: i !== last,
    ...(i === last
      ? {
          customDataPoint: () => (
            <View
              style={[
                styles.dot,
                { backgroundColor: theme.chart, borderColor: theme.backgroundElement },
              ]}
            />
          ),
        }
      : {}),
  }));

  const summary = `Savings over time. ${money(0)} ${relativeDayInSentence(points[0].date)}, ${money(
    latest.total,
  )} ${relativeDayInSentence(latest.date)}. Target ${money(goal.targetAmount)}.`;

  return (
    <View style={styles.wrapper}>
      <View
        accessible
        accessibilityRole="image"
        accessibilityLabel={summary}
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
        style={{ height: CHART_HEIGHT + 20 }}>
        {width > 0 && (
          <LineChart
            data={data}
            height={CHART_HEIGHT}
            width={plotWidth}
            parentWidth={width}
            initialSpacing={INITIAL_SPACING}
            endSpacing={END_SPACING}
            spacing={spacing}
            disableScroll
            adjustToWidth={false}
            maxValue={max}
            stepValue={step}
            noOfSections={SECTIONS}
            // Line: 2px, single colour, with a ~10% area wash underneath.
            color={theme.chart}
            thickness={2}
            areaChart
            startFillColor={theme.chart}
            endFillColor={theme.chart}
            startOpacity={0.14}
            endOpacity={0.02}
            dataPointsHeight={DOT_SIZE}
            dataPointsWidth={DOT_SIZE}
            isAnimated={!reduceMotion}
            animationDuration={600}
            // Recessive chrome: solid hairline grid, no y-axis line.
            rulesType="solid"
            rulesColor={theme.chartGrid}
            rulesThickness={1}
            xAxisColor={theme.chartGrid}
            xAxisThickness={1}
            yAxisThickness={0}
            yAxisLabelWidth={Y_LABEL_WIDTH}
            yAxisTextStyle={[styles.axisText, { color: theme.textSecondary }]}
            formatYLabel={(label) => formatCompactMoney(Number(label), symbol)}
            xAxisLabelsHeight={0}
            // Target: dashed reference line (dashing here means "goal", not grid).
            showReferenceLine1
            referenceLine1Position={target}
            referenceLine1Config={{
              color: theme.textSecondary,
              thickness: 1.5,
              type: 'dashed',
              dashWidth: 5,
              dashGap: 4,
            }}
            pointerConfig={{
              pointerStripColor: theme.textSecondary,
              pointerStripWidth: 1,
              pointerColor: theme.chart,
              radius: 5,
              pointerLabelWidth: 130,
              pointerLabelHeight: 52,
              autoAdjustPointerLabelPosition: true,
              pointerVanishDelay: 1500,
              pointerLabelComponent: (_items: unknown, _secondary: unknown, index: number) => {
                const point = points[Math.min(Math.max(index, 0), last)];
                return (
                  <View
                    style={[
                      styles.tooltip,
                      { backgroundColor: theme.background, borderColor: theme.border },
                    ]}>
                    <ThemedText type="small" themeColor="textSecondary">
                      {formatRelativeDay(point.date)}
                    </ThemedText>
                    <ThemedText type="smallBold">{money(point.total)}</ThemedText>
                  </View>
                );
              },
            }}
          />
        )}
      </View>

      <View style={[styles.dateRow, { marginLeft: Y_LABEL_WIDTH }]}>
        <ThemedText type="small" themeColor="textSecondary">
          {formatRelativeDay(points[0].date)}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {formatRelativeDay(latest.date)}
        </ThemedText>
      </View>

      <View style={styles.key}>
        <View style={styles.keyItem}>
          <View style={[styles.keyLine, { backgroundColor: theme.chart }]} />
          <ThemedText type="small" themeColor="textSecondary">
            Saved
          </ThemedText>
        </View>
        <View style={styles.keyItem}>
          <View style={styles.keyDashes}>
            {[0, 1, 2].map((i) => (
              <View key={i} style={[styles.keyDash, { backgroundColor: theme.textSecondary }]} />
            ))}
          </View>
          <ThemedText type="small" themeColor="textSecondary">
            Target {money(goal.targetAmount)}
          </ThemedText>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: Spacing.two,
  },
  empty: {
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.four,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.control,
    borderWidth: 1,
  },
  center: {
    textAlign: 'center',
  },
  axisText: {
    fontSize: 12,
  },
  dot: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
    borderWidth: 2,
  },
  tooltip: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
    borderRadius: Radius.small,
    borderWidth: 1,
  },
  dateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: -Spacing.two,
  },
  key: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.four,
  },
  keyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  keyLine: {
    width: 18,
    height: 2,
    borderRadius: 1,
  },
  keyDashes: {
    flexDirection: 'row',
    gap: 3,
    width: 18,
  },
  keyDash: {
    width: 4,
    height: 1.5,
  },
});
