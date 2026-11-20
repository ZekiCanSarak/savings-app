import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { ChoiceChips } from '@/components/ui/choice-chips';
import { DayStepper } from '@/components/ui/day-stepper';
import { ModalHeader } from '@/components/ui/modal-header';
import { TextField } from '@/components/ui/text-field';
import { CURRENCIES } from '@/constants/currencies';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useAppActions, useContributions, useCurrency, useGoals } from '@/hooks/use-app-data';
import { addDays, todayIsoDate } from '@/utils/dates';
import { activeGoals, amountRemaining, sortGoalsForDisplay } from '@/utils/goals';
import { formatMoney, parseMoneyInput } from '@/utils/money';
import { splitByNeed, splitEvenly } from '@/utils/split';
import {
  amountToInputText,
  MONEY_INPUT_MAX_LENGTH,
  NOTE_MAX_LENGTH,
  validateContributionAmount,
  validateContributionDate,
  validateNote,
} from '@/utils/validation';

/** Same limit as "Add money". */
const MAX_DAYS_BACK = 365 * 5;

type Method = 'need' | 'even' | 'custom';

function close() {
  if (router.canGoBack()) router.back();
  else router.replace('/goals');
}

/**
 * Share one amount (a bonus, birthday money) between several goals. Shares
 * are filled in by what each goal still needs, or evenly, and can be edited.
 * Saving logs one saving per goal with a share above 0.
 */
export default function SplitMoneyScreen() {
  const allGoals = activeGoals(useGoals());
  const contributions = useContributions();
  const currency = useCurrency();
  const { addContributions } = useAppActions();
  // Unfinished goals only, in the usual order. Fixed when the screen opens.
  const [goals] = useState(() =>
    sortGoalsForDisplay(allGoals, contributions).filter((g) => amountRemaining(g, contributions) > 0),
  );

  const today = todayIsoDate();
  const [amountText, setAmountText] = useState('');
  const [method, setMethod] = useState<Method>('need');
  const [customShares, setCustomShares] = useState<Record<string, string>>({});
  const [date, setDate] = useState(today);
  const [noteText, setNoteText] = useState('');
  const [error, setError] = useState<string | null>(null);

  const currencySymbol = CURRENCIES.find((c) => c.code === currency)?.symbol ?? '';
  const money = (amount: number) => formatMoney(amount, currency);
  const total = parseMoneyInput(amountText);

  // Shares follow the amount until the user edits one ("custom").
  const autoShares: Record<string, number> =
    total && total > 0
      ? method === 'even'
        ? splitEvenly(total, goals.map((g) => g.id))
        : splitByNeed(total, goals, contributions)
      : {};
  const shareText = (id: string) =>
    method === 'custom' ? (customShares[id] ?? '') : autoShares[id] ? amountToInputText(autoShares[id]) : '';
  const shareValue = (id: string) => parseMoneyInput(shareText(id)) ?? 0;
  const assigned = goals.reduce((sum, g) => sum + shareValue(g.id), 0);
  const left = (total ?? 0) - assigned;

  function editShare(id: string, text: string) {
    // Switching to custom starts from the shares currently shown.
    const base =
      method === 'custom'
        ? customShares
        : Object.fromEntries(goals.map((g) => [g.id, shareText(g.id)]));
    setCustomShares({ ...base, [id]: text });
    setMethod('custom');
    setError(null);
  }

  function handleSave() {
    const amountResult = validateContributionAmount(amountText);
    if (!amountResult.ok) return setError(amountResult.error);
    const dateResult = validateContributionDate(date);
    if (!dateResult.ok) return setError(dateResult.error);
    const noteResult = validateNote(noteText);
    if (!noteResult.ok) return setError(noteResult.error);
    for (const goal of goals) {
      if (shareText(goal.id).trim() && parseMoneyInput(shareText(goal.id)) === null) {
        return setError(`Check the amount for “${goal.name}”.`);
      }
    }
    if (assigned !== amountResult.value) {
      return setError(
        left > 0
          ? `${money(left)} still needs a goal. Add it to one of the goals above.`
          : `The shares come to ${money(-left)} more than ${money(amountResult.value)}.`,
      );
    }
    const note = noteResult.value ?? 'Split';
    addContributions(
      goals
        .filter((g) => shareValue(g.id) > 0)
        .map((g) => ({ goalId: g.id, amount: shareValue(g.id), date: dateResult.value, note })),
    );
    close();
  }

  if (goals.length < 2) {
    return (
      <ThemedView style={[styles.container, styles.notFound]}>
        <ThemedText themeColor="textSecondary" style={styles.center}>
          Splitting needs at least two goals that aren’t finished yet.
        </ThemedText>
        <Button title="Close" variant="secondary" onPress={close} />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ModalHeader title="Split money" onClose={close} />
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <ThemedText themeColor="textSecondary">
              Got a lump sum, like a bonus or birthday money? Share it between your goals in one go.
            </ThemedText>
            <TextField
              label="Amount to split"
              value={amountText}
              onChangeText={(text) => {
                setAmountText(text);
                setError(null);
                // A new total re-fills the shares automatically.
                if (method === 'custom') setMethod('need');
              }}
              prefix={currencySymbol}
              placeholder="e.g. 300"
              keyboardType="decimal-pad"
              maxLength={MONEY_INPUT_MAX_LENGTH}
              autoFocus
            />
            <ChoiceChips<Method>
              label="Share it out"
              value={method}
              onChange={(m) => {
                setMethod(m);
                setError(null);
              }}
              options={[
                { value: 'need', label: 'By what each needs' },
                { value: 'even', label: 'Evenly' },
                { value: 'custom', label: 'My own amounts' },
              ]}
            />

            {goals.map((goal) => (
              <TextField
                key={goal.id}
                label={`${goal.emoji} ${goal.name} (${money(amountRemaining(goal, contributions))} to go)`}
                value={shareText(goal.id)}
                onChangeText={(text) => editShare(goal.id, text)}
                prefix={currencySymbol}
                placeholder="0"
                keyboardType="decimal-pad"
                maxLength={MONEY_INPUT_MAX_LENGTH}
              />
            ))}

            {total !== null && total > 0 && (
              <ThemedText
                type="smallBold"
                themeColor={left === 0 ? 'tint' : 'danger'}
                accessibilityLiveRegion="polite">
                {left === 0
                  ? `All ${money(total)} shared out ✓`
                  : left > 0
                    ? `${money(left)} left to share out`
                    : `${money(-left)} more than ${money(total)}`}
              </ThemedText>
            )}

            <DayStepper
              label="Date"
              value={date}
              onChange={setDate}
              min={addDays(today, -MAX_DAYS_BACK)}
              max={today}
            />
            <TextField
              label="Note (optional)"
              value={noteText}
              onChangeText={setNoteText}
              placeholder="e.g. Christmas bonus"
              maxLength={NOTE_MAX_LENGTH + 20}
            />
            {error ? (
              <ThemedText type="small" themeColor="danger" accessibilityLiveRegion="polite">
                {error}
              </ThemedText>
            ) : null}
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
    justifyContent: 'center',
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
  center: {
    textAlign: 'center',
  },
  footer: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
  },
});
