import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ValueStepper } from '@/components/ui/value-stepper';
import { Spacing } from '@/constants/theme';
import type { CurrencyCode, IsoDate, PayFrequency } from '@/types/models';
import { formatMonthYear } from '@/utils/dates';
import { formatMoney } from '@/utils/money';
import { perPayPeriod } from '@/utils/personal';
import { plannerStart, plannerStep, whatIf } from '@/utils/planner';

type WhatIfPlannerProps = {
  remaining: number;
  monthlyNeeded: number | null;
  targetDate: IsoDate | null;
  currency: CurrencyCode;
  payFrequency: PayFrequency | null;
};

/** "If I save £X a month, when do I get there?" with ‹ › to change the amount. */
export function WhatIfPlanner({
  remaining,
  monthlyNeeded,
  targetDate,
  currency,
  payFrequency,
}: WhatIfPlannerProps) {
  const step = plannerStep(remaining);
  const [monthly, setMonthly] = useState(() => plannerStart(remaining, monthlyNeeded));
  const money = (amount: number) => formatMoney(amount, currency);
  const result = whatIf(remaining, monthly, targetDate);
  const perPay = perPayPeriod(monthly, payFrequency);
  // Past the point where one payment finishes it, more makes no difference.
  const maxMonthly = Math.ceil(remaining / step) * step;

  let comparison = '';
  if (result && result.monthsEarly !== null && targetDate) {
    const n = Math.abs(result.monthsEarly);
    const months = `${n} month${n === 1 ? '' : 's'}`;
    comparison =
      result.monthsEarly > 0
        ? `${months} early 🎉`
        : result.monthsEarly < 0
          ? `${months} after your target of ${formatMonthYear(targetDate)}`
          : 'right on time for your target';
  }

  return (
    <View style={styles.wrapper}>
      <ValueStepper
        label="If I save each month"
        valueText={money(monthly)}
        onPrevious={() => setMonthly((m) => Math.max(step, m - step))}
        onNext={() => setMonthly((m) => Math.min(maxMonthly, m + step))}
        canGoPrevious={monthly > step}
        canGoNext={monthly < maxMonthly}
        previousLabel="Less"
        nextLabel="More"
      />
      {result && (
        <View accessible accessibilityLiveRegion="polite" style={styles.result}>
          <ThemedText>
            You’d reach it in <ThemedText type="defaultBold">{formatMonthYear(result.finishDate)}</ThemedText>
            {` (${result.months} month${result.months === 1 ? '' : 's'})`}
            {comparison ? `, ${comparison}.` : '.'}
          </ThemedText>
          {perPay ? (
            <ThemedText type="small" themeColor="textSecondary">
              That’s about {money(perPay.amount)} {perPay.per}.
            </ThemedText>
          ) : null}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: Spacing.three,
  },
  result: {
    gap: Spacing.one,
  },
});
