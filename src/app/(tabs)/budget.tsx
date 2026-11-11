import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AdviceNote } from '@/components/budget/advice-note';
import { BudgetSplitChart } from '@/components/budget/budget-split-chart';
import { TipCard } from '@/components/budget/tip-card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { ProgressBar } from '@/components/ui/progress-bar';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
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
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <ScrollView contentContainerStyle={styles.content}>
          <ThemedText type="subtitle">Budget</ThemedText>

          {monthlyIncome === null ? (
            <ThemedView type="backgroundElement" style={styles.card}>
              <ThemedText type="smallBold">Add your income to see a budget</ThemedText>
              <ThemedText themeColor="textSecondary">
                Your suggested budget is based on your monthly income after tax.
              </ThemedText>
              <Button title="Go to Settings" onPress={() => router.navigate('/settings')} />
            </ThemedView>
          ) : (
            <BudgetContent
              monthlyIncome={monthlyIncome}
              currency={currency}
              goals={goals}
              contributions={contributions}
            />
          )}

          <AdviceNote />
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
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

  return (
    <>
      <View style={styles.incomeRow}>
        <ThemedText themeColor="textSecondary" style={styles.flex}>
          Based on your monthly income after tax of{' '}
          <ThemedText type="smallBold" style={styles.inlineBold}>
            {money(monthlyIncome)}
          </ThemedText>
        </ThemedText>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Change income in Settings"
          onPress={() => router.navigate('/settings')}
          hitSlop={10}
          style={({ pressed }) => pressed && styles.pressed}>
          <ThemedText type="smallBold" themeColor="tint">
            Change
          </ThemedText>
        </Pressable>
      </View>

      <ThemedView type="backgroundElement" style={styles.card}>
        <View style={styles.cardHeader}>
          <ThemedText type="smallBold">Suggested split: the 50/30/20 rule</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            A simple starting point: half your income on needs, 30% on wants and 20% on savings.
          </ThemedText>
        </View>
        <BudgetSplitChart split={split} currency={currency} />
      </ThemedView>

      <ThemedView type="backgroundElement" style={styles.card}>
        <View style={styles.cardHeader}>
          <ThemedText type="smallBold">Savings this month</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Suggested: {money(suggested)} a month (20%)
          </ThemedText>
        </View>
        <View style={styles.row}>
          <ThemedText type="smallBold">
            {money(saved)}{' '}
            <ThemedText type="small" themeColor="textSecondary">
              of {money(suggested)}
            </ThemedText>
          </ThemedText>
          <ThemedText type="smallBold">{percentOfSuggested}%</ThemedText>
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
              : `You’ve saved ${money(saved)} in ${monthName}. ${money(toGo)} to go.`}
        </ThemedText>
        {goalsNeed > 0 && (
          <ThemedText type="small" themeColor="textSecondary">
            Your goals with target dates need about {money(goalsNeed)} a month.
            {goalsNeed > suggested
              ? ' That’s more than 20% of your income, so you might push a date back or trim your wants.'
              : ' That fits within your suggested savings.'}
          </ThemedText>
        )}
      </ThemedView>

      <ThemedView type="backgroundElement" style={styles.card}>
        <ThemedText type="smallBold">Tips for you</ThemedText>
        {tips.map((tip) => (
          <TipCard key={tip.id} tip={tip} />
        ))}
      </ThemedView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  safeArea: {
    flex: 1,
    maxWidth: MaxContentWidth,
  },
  content: {
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
    paddingBottom: BottomTabInset + Spacing.four,
  },
  flex: {
    flex: 1,
  },
  incomeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  inlineBold: {
    fontSize: 16,
  },
  pressed: {
    opacity: 0.6,
  },
  card: {
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Spacing.four,
  },
  cardHeader: {
    gap: Spacing.half,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.two,
  },
});
