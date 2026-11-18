import { router } from 'expo-router';
import { Platform, StyleSheet, View } from 'react-native';

import { AdviceNote } from '@/components/budget/advice-note';
import { BudgetSplitChart } from '@/components/budget/budget-split-chart';
import { MonthHistory } from '@/components/budget/month-history';
import { TipsSection } from '@/components/budget/tips-section';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ProgressBar } from '@/components/ui/progress-bar';
import { Screen } from '@/components/ui/screen';
import { TextButton } from '@/components/ui/text-button';
import { Spacing } from '@/constants/theme';
import { useAbout, useContributions, useGoals, useProfile } from '@/hooks/use-app-data';
import type { AboutYou, Contribution, CurrencyCode, SavingsGoal } from '@/types/models';
import { budgetSplit, incomeLevel, savedThisMonth, tipsFor } from '@/utils/budget';
import { parseIsoDate, savingMonthsLeft, todayIsoDate } from '@/utils/dates';
import { isGoalComplete, monthlyAmountNeeded } from '@/utils/goals';
import { formatMoney } from '@/utils/money';
import { currentStreak } from '@/utils/streaks';
import { defaultReviewYear } from '@/utils/year-review';
import { BUDGET_STYLE_INFO, perPayPeriod, wantsGuidance } from '@/utils/personal';

/** Short explanations for people who asked for help ("I'm new to this"). */
const GOOD_TO_KNOW = [
  {
    icon: '🧾',
    title: 'Needs or wants?',
    body: 'Needs are what you must pay, like rent, bills, food and getting to work. Wants are nice to have, like eating out, hobbies and subscriptions.',
  },
  {
    icon: '🛟',
    title: 'What’s an emergency fund?',
    body: 'Money kept aside only for surprises, like a broken boiler or losing work. Three months of essentials is a common aim.',
  },
  {
    icon: '🏦',
    title: 'Why save first?',
    body: 'Moving money to savings on payday, before spending, means it actually gets saved instead of being whatever’s left.',
  },
];

export default function BudgetScreen() {
  const profile = useProfile();
  const goals = useGoals();
  const contributions = useContributions();
  const about = useAbout();
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
          about={about}
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
  about,
}: {
  monthlyIncome: number;
  currency: CurrencyCode;
  goals: SavingsGoal[];
  contributions: Contribution[];
  about: AboutYou;
}) {
  const money = (amount: number) => formatMoney(amount, currency);
  const today = todayIsoDate();
  const streak = currentStreak(contributions, today);
  const monthName = parseIsoDate(today).toLocaleDateString('en-GB', { month: 'long' });

  const style = BUDGET_STYLE_INFO[about.budgetStyle];
  const savingsShare = style.shares.savings;
  const guided = wantsGuidance(about);
  const irregular = about.payFrequency === 'irregular';
  const split = budgetSplit(monthlyIncome, about.budgetStyle);
  const suggested = split.savings;
  const perPay = perPayPeriod(suggested, about.payFrequency);
  const saved = savedThisMonth(contributions, today);
  const percentOfSuggested = suggested > 0 ? Math.min(100, Math.floor((saved / suggested) * 100)) : 0;
  const toGo = Math.max(0, suggested - saved);

  // What goals with a future target date need each month, added up.
  const goalsNeed = goals
    .filter((g) => g.targetDate && savingMonthsLeft(g.targetDate, today) > 0)
    .filter((g) => !isGoalComplete(g, contributions))
    .reduce((sum, g) => sum + (monthlyAmountNeeded(g, contributions, today) ?? 0), 0);

  // Tips about the user's answers come first; "keep it short" shows just the top three.
  const allTips = tipsFor(incomeLevel(monthlyIncome, currency), about);
  const tips = guided ? allTips : allTips.slice(0, 3);
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
          subtitle={
            `${style.label}: ${style.shares.needs}% on needs, ${style.shares.wants}% on wants and ${savingsShare}% on savings.` +
            (guided ? ' Change it in Settings → About you.' : '')
          }
          index={0}>
          <BudgetSplitChart split={split} currency={currency} style={about.budgetStyle} />
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
      <Card
        title={`Savings in ${monthName}`}
        subtitle={
          irregular
            ? `Suggested: ${savingsShare}% of whatever comes in (about ${money(suggested)} in an average month)`
            : `Suggested: ${money(suggested)} a month (${savingsShare}%)` +
              (perPay ? `, about ${money(perPay.amount)} ${perPay.per}` : '')
        }
        index={1}>
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
              ? ` That’s more than ${savingsShare}% of your income, so you might push a date back or trim your wants.`
              : ' That fits within your suggested savings.'}
          </ThemedText>
        )}
      </Card>
      )}

      <Card
        title="Your months"
        subtitle={streak.months >= 2 ? `🔥 ${streak.months} months in a row` : undefined}
        index={2}
        action={
          <TextButton
            title="Year in review"
            accessibilityHint="Opens a summary of your year's saving"
            onPress={() =>
              router.push({ pathname: '/year-review', params: { year: String(defaultReviewYear(today)) } })
            }
          />
        }>
        <MonthHistory contributions={contributions} currency={currency} suggested={noIncome ? 0 : suggested} />
      </Card>

      {guided && (
        <Card title="Good to know" index={2}>
          {GOOD_TO_KNOW.map((item) => (
            <View key={item.title} style={styles.explainer} accessible accessibilityLabel={`${item.title} ${item.body}`}>
              <ThemedText type="emoji" style={styles.explainerIcon} importantForAccessibility="no">
                {item.icon}
              </ThemedText>
              <View style={styles.flex}>
                <ThemedText type="smallBold">{item.title}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {item.body}
                </ThemedText>
              </View>
            </View>
          ))}
        </Card>
      )}

      {/* On web the long tips list starts folded away, so the budget itself stays in view. */}
      <TipsSection tips={tips} index={3} collapsible={Platform.OS === 'web'} />
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
  explainer: {
    flexDirection: 'row',
    gap: Spacing.three,
    alignItems: 'flex-start',
  },
  explainerIcon: {
    width: 32,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    gap: Spacing.two,
  },
});
