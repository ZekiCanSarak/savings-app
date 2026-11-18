import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { TextButton } from '@/components/ui/text-button';
import { Spacing } from '@/constants/theme';
import {
  useAbout,
  useAppActions,
  useContributions,
  useCurrency,
  useGoals,
  usePaydayCheckIn,
  useProfile,
} from '@/hooks/use-app-data';
import { budgetSplit } from '@/utils/budget';
import { relativeDayInSentence, todayIsoDate } from '@/utils/dates';
import { amountRemaining } from '@/utils/goals';
import { formatMoney } from '@/utils/money';
import { paydaysPerMonth, paydayToCheckIn } from '@/utils/payday';
import { perPayPeriod } from '@/utils/personal';
import { goalsNeedingAttention } from '@/utils/reminders';

type PaydayCheckInProps = {
  index?: number;
};

/**
 * Home's payday card: on payday (and for a couple of days after), offer to
 * save the suggested amount to the goal that most needs it, in one tap.
 * Shown only when the "About you" pay answers say when payday is.
 */
export function PaydayCheckIn({ index }: PaydayCheckInProps) {
  const about = useAbout();
  const profile = useProfile();
  const goals = useGoals();
  const contributions = useContributions();
  const currency = useCurrency();
  const answeredFor = usePaydayCheckIn();
  const { addContribution, markPaydayCheckIn } = useAppActions();
  const [saved, setSaved] = useState<{ amount: number; goalName: string } | null>(null);

  const money = (amount: number) => formatMoney(amount, currency);

  if (saved) {
    return (
      <Card title="Nice one! 🎉" index={index}>
        <ThemedText accessibilityLiveRegion="polite">
          {money(saved.amount)} saved to {saved.goalName}. Paying yourself first is the habit that works.
        </ThemedText>
        <TextButton title="Done" onPress={() => setSaved(null)} />
      </Card>
    );
  }

  const today = todayIsoDate();
  const payday = paydayToCheckIn(about, answeredFor, today);
  const goal = goalsNeedingAttention(goals, contributions, today)[0];
  if (!payday || !goal) return null;

  // The suggested saving for one payday, never more than the goal still needs.
  const income = profile.monthlyIncome ?? 0;
  const monthly = income > 0 ? budgetSplit(income, about.budgetStyle).savings : 0;
  const perPay =
    perPayPeriod(monthly, about.payFrequency)?.amount ??
    // Pay that varies, on several set dates: share the month's suggestion between them.
    (about.payFrequency === 'irregular'
      ? Math.round(monthly / paydaysPerMonth(about.paySchedule))
      : monthly);
  const suggested = Math.min(perPay, amountRemaining(goal, contributions));

  function quickSave() {
    if (!goal || !payday) return;
    addContribution({ goalId: goal.id, amount: suggested, date: today, note: 'Payday' });
    markPaydayCheckIn(payday);
    setSaved({ amount: suggested, goalName: goal.name });
  }

  return (
    <Card
      title={payday === today ? 'It’s payday! 💷' : `Payday was ${relativeDayInSentence(payday, today)} 💷`}
      subtitle="Put something aside before it gets spent?"
      index={index}>
      <ThemedText>
        {goal.emoji} <ThemedText type="defaultBold">{goal.name}</ThemedText> needs it most right now.
      </ThemedText>
      <View style={styles.buttons}>
        {suggested > 0 && (
          <Button
            title={`Save ${money(suggested)} to ${goal.name}`}
            onPress={quickSave}
          />
        )}
        <Button
          title={suggested > 0 ? 'A different amount' : 'Add money'}
          variant="secondary"
          onPress={() => {
            markPaydayCheckIn(payday);
            router.push({ pathname: '/add-money', params: { goalId: goal.id } });
          }}
        />
        <TextButton title="Not this time" onPress={() => markPaydayCheckIn(payday)} />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  buttons: {
    gap: Spacing.two,
  },
});
