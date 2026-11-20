import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { DayStepper } from '@/components/ui/day-stepper';
import { ModalHeader } from '@/components/ui/modal-header';
import { TextField } from '@/components/ui/text-field';
import { CURRENCIES } from '@/constants/currencies';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import {
  useAppActions,
  useContribution,
  useContributions,
  useCurrency,
  useGoal,
  useGoalProgress,
} from '@/hooks/use-app-data';
import { addDays, todayIsoDate } from '@/utils/dates';
import { totalSaved } from '@/utils/goals';
import { formatMoney, parseMoneyInput } from '@/utils/money';
import {
  amountToInputText,
  MONEY_INPUT_MAX_LENGTH,
  NOTE_MAX_LENGTH,
  validateContributionAmount,
  validateContributionDate,
  validateNote,
  validateWithdrawalAmount,
} from '@/utils/validation';

/** How far back a saving can be dated. */
const MAX_DAYS_BACK = 365 * 5;

function close() {
  if (router.canGoBack()) router.back();
  else router.replace('/goals');
}

/**
 * Log money saved toward a goal, opened with `?goalId=<id>` from the goal
 * detail screen. With `&mode=withdraw` it logs money taken out instead (never
 * more than the goal holds). With `&contributionId=<id>` it edits that entry
 * (amount, date and note; saved or taken out stays as it was).
 * Presented as a modal (see src/app/_layout.tsx).
 */
export default function AddMoneyScreen() {
  const { goalId, mode, contributionId } = useLocalSearchParams<{
    goalId: string;
    mode?: string;
    contributionId?: string;
  }>();
  const editing = useContribution(contributionId ?? '');
  const contributions = useContributions();
  const withdrawing = editing ? editing.withdrawal === true : mode === 'withdraw';
  const goal = useGoal(goalId ?? '');
  const progress = useGoalProgress(goalId ?? '');
  const currency = useCurrency();
  const { addContribution, updateContribution } = useAppActions();

  const today = todayIsoDate();
  const [amountText, setAmountText] = useState(() => amountToInputText(editing?.amount ?? null));
  const [date, setDate] = useState(editing?.date ?? today);
  const [noteText, setNoteText] = useState(editing?.note ?? '');
  const [amountError, setAmountError] = useState<string | null>(null);
  const [noteError, setNoteError] = useState<string | null>(null);
  const [dateError, setDateError] = useState<string | null>(null);

  if (!goal || !progress || (contributionId && !editing)) {
    return (
      <ThemedView style={[styles.container, styles.notFound]}>
        <ThemedText themeColor="textSecondary">
          {goal ? 'This entry doesn’t exist any more.' : 'This goal doesn’t exist any more.'}
        </ThemedText>
        <Button title="Close" variant="secondary" onPress={close} />
      </ThemedView>
    );
  }

  const currencySymbol = CURRENCIES.find((c) => c.code === currency)?.symbol ?? '';
  const typedAmount = parseMoneyInput(amountText);
  // When editing, work from the goal's total without this entry.
  const saved = editing
    ? totalSaved(goal.id, contributions.filter((c) => c.id !== editing.id))
    : progress.saved;
  const remaining = Math.max(0, goal.targetAmount - saved);
  const willComplete =
    !withdrawing && remaining > 0 && typedAmount !== null && typedAmount >= remaining;

  function handleSave() {
    if (!goal || !progress) return;
    const amountResult = withdrawing
      ? validateWithdrawalAmount(amountText, saved, formatMoney(saved, currency))
      : validateContributionAmount(amountText);
    const noteResult = validateNote(noteText);
    const dateResult = validateContributionDate(date);
    setAmountError(amountResult.ok ? null : amountResult.error);
    setNoteError(noteResult.ok ? null : noteResult.error);
    setDateError(dateResult.ok ? null : dateResult.error);
    if (!amountResult.ok || !noteResult.ok || !dateResult.ok) return;

    if (editing) {
      updateContribution(editing.id, {
        amount: amountResult.value,
        date: dateResult.value,
        note: noteResult.value,
      });
    } else {
      addContribution({
        goalId: goal.id,
        amount: amountResult.value,
        date: dateResult.value,
        ...(withdrawing ? { withdrawal: true as const } : {}),
        ...(noteResult.value ? { note: noteResult.value } : {}),
      });
    }
    close();
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ModalHeader
          title={
            editing
              ? withdrawing
                ? 'Edit money taken out'
                : 'Edit saving'
              : withdrawing
                ? 'Take money out'
                : 'Add money'
          }
          onClose={close}
        />

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
                {withdrawing
                  ? `${formatMoney(saved, currency)} in this goal`
                  : remaining > 0
                    ? `${formatMoney(remaining, currency)} left to save`
                    : 'Goal already reached. Extra savings are welcome!'}
              </ThemedText>
            </View>

            <TextField
              label={withdrawing ? 'Amount taken out' : 'Amount saved'}
              value={amountText}
              onChangeText={(text) => {
                setAmountText(text);
                setAmountError(null);
              }}
              error={amountError}
              prefix={currencySymbol}
              placeholder="e.g. 50"
              keyboardType="decimal-pad"
              maxLength={MONEY_INPUT_MAX_LENGTH}
              autoFocus={!editing}
            />
            {willComplete && (
              <ThemedText type="small" themeColor="tint">
                This will complete your goal! 🎉
              </ThemedText>
            )}

            <DayStepper
              label="Date"
              value={date}
              onChange={(d) => {
                setDate(d);
                setDateError(null);
              }}
              min={addDays(today, -MAX_DAYS_BACK)}
              max={today}
            />
            {dateError ? (
              <ThemedText type="small" themeColor="danger">
                {dateError}
              </ThemedText>
            ) : null}

            <TextField
              label="Note (optional)"
              value={noteText}
              onChangeText={(text) => {
                setNoteText(text);
                setNoteError(null);
              }}
              error={noteError}
              placeholder={withdrawing ? 'e.g. Car repair' : 'e.g. Birthday money'}
              maxLength={NOTE_MAX_LENGTH + 20}
              returnKeyType="done"
              onSubmitEditing={handleSave}
            />
          </ScrollView>

          <View style={styles.footer}>
            <Button title={editing ? 'Save changes' : 'Save'} onPress={handleSave} />
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
    gap: Spacing.half,
    marginBottom: Spacing.two,
  },
  center: {
    textAlign: 'center',
  },
  footer: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
  },
});
