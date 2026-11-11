import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { AdviceNote } from '@/components/budget/advice-note';
import { BudgetSplitChart } from '@/components/budget/budget-split-chart';
import { TipCard } from '@/components/budget/tip-card';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ProgressBar } from '@/components/ui/progress-bar';
import { Screen } from '@/components/ui/screen';
import { TextButton } from '@/components/ui/text-button';
import { Spacing } from '@/constants/theme';
import { useContributions, useGoals, useProfile } from '@/hooks/use-app-data';
import type { Contribution, CurrencyCode, SavingsGoal } from '@/types/models';
import { budgetSplit, incomeLevel, savedThisMonth, tipsFor } from '@/utils/budget';
import { parseIsoDate, savingMonthsLeft, todayIsoDate } from '@/utils/dates';
import { isGoalComplete, monthlyAmountNeeded } from '@/utils/goals';
import { formatMoney } from '@/utils/money';

export default function BudgetScreen() {
  const profile = useProfile();
  const goals = useGoals();
  const contributions = useContributions();
  const { currency, monthlyIncome } = profile;

  return (
    <Screen
      title="Budget"
      subtitle={
        monthlyIncome === null ? undefined : (
          <View style={styles.incomeRow}>
            <ThemedText themeColor="textSecondary" style={styles.flex}>
              From your take-home pay of{' '}
              <ThemedText type="defaultBold">{formatMoney(monthlyIncome, currency)}</ThemedText> a
              month
            </ThemedText>
            <TextButton
              title="Change"
              accessibilityLabel="Change income"
              accessibilityHint="Opens Settings"
              onPress={() => router.navigate('/settings')}
            />
          </View>
        )
      }>
      {monthlyIncome === null ? (
        <Card title="Add your income to see a budget">
          <ThemedText themeColor="textSecondary">
            Your suggested budget is based on your monthly income after tax.
          </ThemedText>
          <Button title="Go to Settings" onPress={() => router.navigate('/settings')} />
        </Card>
      ) : (
        <BudgetContent
          monthlyIncome={monthlyIncome}
          currency={currency}
          goals={goals}
          contributions={contributions}
        />
      )}

      <AdviceNote />
    </Screen>
  );
}

function BudgetContent({
  monthlyIncome,
  currency,
  goals,
  contributions,
}: {
  monthlyIncome: number;
  currency: CurrencyCode;
  goals: SavingsGoal[];
  contributions: Contribution[];
}) {
  const money = (amount: number) => formatMoney(amount, currency);
  const today = todayIsoDate();
  const monthName = parseIsoDate(today).toLocaleDateString('en-GB', { month: 'long' });

  const split = budgetSplit(monthlyIncome);
  const suggested = split.savings;
  const saved = savedThisMonth(contributions, today);
  const percentOfSuggested = suggested > 0 ? Math.min(100, Math.floor((saved / suggested) * 100)) : 0;
  const toGo = Math.max(0, suggested - saved);

  // What goals with a future target date need each month, added up.
  const goalsNeed = goals
    .filter((g) => g.targetDate && savingMonthsLeft(g.targetDate, today) > 0)
    .filter((g) => !isGoalComplete(g, contributions))
    .reduce((sum, g) => sum + (monthlyAmountNeeded(g, contributions, today) ?? 0), 0);

  const tips = tipsFor(incomeLevel(monthlyIncome, currency));
  const noIncome = monthlyIncome === 0;

  return (
    <>
      {noIncome ? (
        <Card title="No income right now" index={0}>
          <ThemedText themeColor="textSecondary">
            Your income is set to {money(0)}, so there’s nothing to split yet. That’s okay. Any
            money you can put aside still counts, and when your income changes, update it in
            Settings to see a suggested budget.
          </ThemedText>
        </Card>
      ) : (
        <Card
          title="Suggested split"
          subtitle="The 50/30/20 rule: half on needs, 30% on wants and 20% on savings. A simple place to start."
          index={0}>
          <BudgetSplitChart split={split} currency={currency} />
        </Card>
      )}

      {noIncome ? (
        <Card title={`Savings in ${monthName}`} index={1}>
          <View accessible accessibilityLabel={`${money(saved)} saved in ${monthName}`}>
            <ThemedText type="title">{money(saved)}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              saved so far this month
            </ThemedText>
          </View>
        </Card>
      ) : (
      <Card title={`Savings in ${monthName}`} subtitle={`Suggested: ${money(suggested)} a month (20%)`} index={1}>
        <View
          style={styles.row}
          accessible
          accessibilityLabel={`${money(saved)} saved of ${money(suggested)} suggested, ${percentOfSuggested}%`}>
          <View>
            <ThemedText type="title">{money(saved)}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              of {money(suggested)}
            </ThemedText>
          </View>
          <ThemedText type="heading">{percentOfSuggested}%</ThemedText>
        </View>
        <ProgressBar
          percent={percentOfSuggested}
          height={12}
          accessibilityLabel={`Saved this month: ${percentOfSuggested}% of suggested`}
        />
        <ThemedText themeColor={toGo === 0 ? 'tint' : 'textSecondary'}>
          {toGo === 0
            ? `You’ve hit the suggested amount for ${monthName}. Brilliant! 🎉`
            : saved === 0
              ? `Nothing logged yet in ${monthName}. Add money to a goal when you save.`
              : `${money(toGo)} to go this month.`}
        </ThemedText>
        {goalsNeed > 0 && (
          <ThemedText type="small" themeColor="textSecondary">
            Your goals with target dates need about{' '}
            <ThemedText type="smallBold">{money(goalsNeed)}</ThemedText> a month.
            {goalsNeed > suggested
              ? ' That’s more than 20% of your income, so you might push a date back or trim your wants.'
              : ' That fits within your suggested savings.'}
          </ThemedText>
        )}
      </Card>
      )}

      <Card title="Tips for you" subtitle={`${tips.length} ideas to help you save`} index={2}>
        <View style={styles.tips}>
          {tips.map((tip) => (
            <TipCard key={tip.id} tip={tip} />
          ))}
        </View>
      </Card>
    </>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  incomeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    gap: Spacing.two,
  },
  tips: {
    gap: Spacing.four,
  },
});
