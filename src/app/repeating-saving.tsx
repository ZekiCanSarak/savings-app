import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ModalHeader } from '@/components/ui/modal-header';
import { TextField } from '@/components/ui/text-field';
import { ValueStepper } from '@/components/ui/value-stepper';
import { CURRENCIES } from '@/constants/currencies';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useAppActions, useCurrency, useGoal, useGoalProgress } from '@/hooks/use-app-data';
import { addDays, formatMonthYear, formatRelativeDay, todayIsoDate } from '@/utils/dates';
import { formatMoney, parseMoneyInput } from '@/utils/money';
import { whatIf } from '@/utils/planner';
import { ordinal } from '@/utils/reminders';
import {
  newRepeatingSaving,
  nextRepeatingDate,
  updatedRepeatingSaving,
} from '@/utils/repeating';
import { amountToInputText, MONEY_INPUT_MAX_LENGTH, validateContributionAmount } from '@/utils/validation';

function close() {
  if (router.canGoBack()) router.back();
  else router.replace('/goals');
}

/**
 * Set up, change or stop a goal's repeating saving ("£100 on the 1st of every
 * month"), opened with `?goalId=<id>`. Goalpot then logs it on that day each
 * month (see utils/repeating.ts and hooks/use-repeating-savings.ts).
 */
export default function RepeatingSavingScreen() {
  const { goalId } = useLocalSearchParams<{ goalId: string }>();
  const goal = useGoal(goalId ?? '');
  const progress = useGoalProgress(goalId ?? '');
  const currency = useCurrency();
  const { setRepeatingSaving } = useAppActions();

  const existing = goal?.repeating;
  const today = todayIsoDate();
  // Start from what's set, else the monthly plan, so most people just tap Save.
  const [amountText, setAmountText] = useState(() =>
    amountToInputText(existing?.amount ?? progress?.monthlyNeeded ?? null),
  );
  const [day, setDay] = useState(existing?.dayOfMonth ?? Number(today.slice(8, 10)));
  const [amountError, setAmountError] = useState<string | null>(null);

  if (!goal || !progress) {
    return (
      <ThemedView style={[styles.container, styles.notFound]}>
        <ThemedText themeColor="textSecondary">This goal doesn’t exist any more.</ThemedText>
        <Button title="Close" variant="secondary" onPress={close} />
      </ThemedView>
    );
  }

  const money = (amount: number) => formatMoney(amount, currency);
  const currencySymbol = CURRENCIES.find((c) => c.code === currency)?.symbol ?? '';
  const typed = parseMoneyInput(amountText);
  const firstFrom =
    existing && existing.loggedThrough > addDays(today, -1) ? existing.loggedThrough : addDays(today, -1);
  const next = nextRepeatingDate(day, firstFrom);
  const plan = typed && typed > 0 ? whatIf(progress.remaining, typed, goal.targetDate) : null;

  function handleSave() {
    if (!goal) return;
    const result = validateContributionAmount(amountText);
    if (!result.ok) {
      setAmountError(result.error);
      return;
    }
    setRepeatingSaving(
      goal.id,
      existing
        ? updatedRepeatingSaving(existing, result.value, day)
        : newRepeatingSaving(result.value, day),
    );
    close();
  }

  function handleStop() {
    if (!goal) return;
    // Savings already logged stay in the history; only future ones stop.
    setRepeatingSaving(goal.id, null);
    close();
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ModalHeader title="Repeating saving" onClose={close} closeLabel="Cancel" />

        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <View style={styles.goalSummary}>
              <ThemedText type="emojiLarge" importantForAccessibility="no" accessibilityElementsHidden>
                {goal.emoji}
              </ThemedText>
              <ThemedText type="heading" style={styles.center}>
                {goal.name}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary" style={styles.center}>
                Save the same amount every month, like a standing order, and Goalpot logs it for you
                on that day. You can change, skip or stop it any time.
              </ThemedText>
            </View>

            <TextField
              label="Amount each month"
              value={amountText}
              onChangeText={(text) => {
                setAmountText(text);
                setAmountError(null);
              }}
              error={amountError}
              prefix={currencySymbol}
              placeholder="e.g. 100"
              keyboardType="decimal-pad"
              maxLength={MONEY_INPUT_MAX_LENGTH}
              returnKeyType="done"
              onSubmitEditing={handleSave}
            />

            <ValueStepper
              label="Day of the month"
              valueText={`${ordinal(day)} of every month`}
              onPrevious={() => setDay(day === 1 ? 31 : day - 1)}
              onNext={() => setDay(day === 31 ? 1 : day + 1)}
              previousLabel="Earlier day"
              nextLabel="Later day"
            />
            {day > 28 && (
              <ThemedText type="small" themeColor="textSecondary">
                In shorter months it goes in on the last day of the month.
              </ThemedText>
            )}

            <Card>
              <View accessible accessibilityLiveRegion="polite" style={styles.preview}>
                <ThemedText>
                  {existing ? 'Next one' : 'First one'}:{' '}
                  <ThemedText type="defaultBold">{formatRelativeDay(next)}</ThemedText>
                </ThemedText>
                {progress.remaining === 0 ? (
                  <ThemedText type="small" themeColor="textSecondary">
                    This goal is already reached, so nothing will be logged unless you raise its target.
                  </ThemedText>
                ) : plan && typed ? (
                  <ThemedText type="small" themeColor="textSecondary">
                    At {money(typed)} a month you’d reach it in about{' '}
                    {formatMonthYear(plan.finishDate)}
                    {plan.monthsEarly === null
                      ? '.'
                      : plan.monthsEarly > 0
                        ? `, ${plan.monthsEarly} month${plan.monthsEarly === 1 ? '' : 's'} early.`
                        : plan.monthsEarly < 0
                          ? `, ${-plan.monthsEarly} month${plan.monthsEarly === -1 ? '' : 's'} after your target.`
                          : ', right on time.'}
                  </ThemedText>
                ) : null}
                <ThemedText type="small" themeColor="textSecondary">
                  It stops by itself once the goal is reached.
                </ThemedText>
              </View>
            </Card>

            {existing && (
              <Button
                title="Stop repeating saving"
                variant="secondary"
                onPress={handleStop}
                accessibilityHint="Savings already logged stay in your history"
              />
            )}
          </ScrollView>

          <View style={styles.footer}>
            <Button title={existing ? 'Save changes' : 'Start repeating saving'} onPress={handleSave} />
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  notFound: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.four,
  },
  safeArea: {
    flex: 1,
    maxWidth: MaxContentWidth,
  },
  flex: {
    flex: 1,
  },
  content: {
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.four,
  },
  goalSummary: {
    alignItems: 'center',
    gap: Spacing.one,
  },
  center: {
    textAlign: 'center',
  },
  preview: {
    gap: Spacing.two,
  },
  footer: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.three,
  },
});
