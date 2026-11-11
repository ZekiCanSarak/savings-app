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
import { useAppActions, useCurrency, useGoal, useGoalProgress } from '@/hooks/use-app-data';
import { addDays, todayIsoDate } from '@/utils/dates';
import { formatMoney, parseMoneyInput } from '@/utils/money';
import {
  MONEY_INPUT_MAX_LENGTH,
  NOTE_MAX_LENGTH,
  validateContributionAmount,
  validateContributionDate,
  validateNote,
} from '@/utils/validation';

/** How far back a saving can be dated. */
const MAX_DAYS_BACK = 365 * 5;

function close() {
  if (router.canGoBack()) router.back();
  else router.replace('/goals');
}

/**
 * Log money saved toward a goal. Opened with `?goalId=<id>` from the goal
 * detail screen, and presented as a modal (see src/app/_layout.tsx).
 */
export default function AddMoneyScreen() {
  const { goalId } = useLocalSearchParams<{ goalId: string }>();
  const goal = useGoal(goalId ?? '');
  const progress = useGoalProgress(goalId ?? '');
  const currency = useCurrency();
  const { addContribution } = useAppActions();

  const today = todayIsoDate();
  const [amountText, setAmountText] = useState('');
  const [date, setDate] = useState(today);
  const [noteText, setNoteText] = useState('');
  const [amountError, setAmountError] = useState<string | null>(null);
  const [noteError, setNoteError] = useState<string | null>(null);
  const [dateError, setDateError] = useState<string | null>(null);

  if (!goal || !progress) {
    return (
      <ThemedView style={[styles.container, styles.notFound]}>
        <ThemedText themeColor="textSecondary">This goal doesn’t exist any more.</ThemedText>
        <Button title="Close" variant="secondary" onPress={close} />
      </ThemedView>
    );
  }

  const currencySymbol = CURRENCIES.find((c) => c.code === currency)?.symbol ?? '';
  const typedAmount = parseMoneyInput(amountText);
  const willComplete =
    progress.remaining > 0 && typedAmount !== null && typedAmount >= progress.remaining;

  function handleSave() {
    if (!goal) return;
    const amountResult = validateContributionAmount(amountText);
    const noteResult = validateNote(noteText);
    const dateResult = validateContributionDate(date);
    setAmountError(amountResult.ok ? null : amountResult.error);
    setNoteError(noteResult.ok ? null : noteResult.error);
    setDateError(dateResult.ok ? null : dateResult.error);
    if (!amountResult.ok || !noteResult.ok || !dateResult.ok) return;

    addContribution({
      goalId: goal.id,
      amount: amountResult.value,
      date: dateResult.value,
      ...(noteResult.value ? { note: noteResult.value } : {}),
    });
    close();
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ModalHeader title="Add money" onClose={close} />

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
                {progress.remaining > 0
                  ? `${formatMoney(progress.remaining, currency)} left to save`
                  : 'Goal already reached. Extra savings are welcome!'}
              </ThemedText>
            </View>

            <TextField
              label="Amount saved"
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
              autoFocus
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
              placeholder="e.g. Birthday money"
              maxLength={NOTE_MAX_LENGTH + 20}
              returnKeyType="done"
              onSubmitEditing={handleSave}
            />
          </ScrollView>

          <View style={styles.footer}>
            <Button title="Save" onPress={handleSave} />
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
