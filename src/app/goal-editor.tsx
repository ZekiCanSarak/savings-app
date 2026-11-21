import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';

import { EmojiPicker } from '@/components/goals/emoji-picker';
import { MonthPicker } from '@/components/goals/month-picker';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { ModalHeader } from '@/components/ui/modal-header';
import { TextField } from '@/components/ui/text-field';
import { SafeAreaView } from '@/components/ui/safe-area-view';
import { CURRENCIES } from '@/constants/currencies';
import { DEFAULT_GOAL_EMOJI, GOAL_EMOJIS } from '@/constants/goal-emojis';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useAppActions, useContributions, useCurrency, useGoal } from '@/hooks/use-app-data';
import type { IsoDate } from '@/types/models';
import { formatMonthYear, todayIsoDate } from '@/utils/dates';
import { monthlyAmountNeeded, totalSaved } from '@/utils/goals';
import { formatMoney } from '@/utils/money';
import {
  amountToInputText,
  GOAL_NAME_MAX_LENGTH,
  interestRateToInputText,
  MONEY_INPUT_MAX_LENGTH,
  validateGoalName,
  validateGoalTarget,
  validateGoalTargetDate,
  validateInterestRate,
} from '@/utils/validation';

function close() {
  if (router.canGoBack()) router.back();
  else router.replace('/goals');
}

/** A suggestion for a new goal, passed in the URL by Home's starter-goal buttons. */
type GoalSuggestion = { name?: string; emoji?: string; target?: string };

/**
 * Add a new goal, or edit one when opened with `?id=<goalId>`. A new goal can
 * be pre-filled with `?name=&emoji=&target=` (target in minor units); the user
 * can change everything before saving.
 * Presented as a modal over the tabs (see src/app/_layout.tsx).
 */
export default function GoalEditorScreen() {
  const { id, ...suggestion } = useLocalSearchParams<{ id?: string } & GoalSuggestion>();
  const existing = useGoal(id ?? '');

  if (id && !existing) {
    return (
      <ThemedView style={[styles.container, styles.notFound]}>
        <ThemedText themeColor="textSecondary">This goal doesn’t exist any more.</ThemedText>
        <Button title="Close" variant="secondary" onPress={close} />
      </ThemedView>
    );
  }
  // `key` resets the form if a different goal is opened in the same screen.
  return (
    <GoalForm
      key={existing?.id ?? 'new'}
      goalId={existing?.id}
      suggestion={existing ? undefined : suggestion}
    />
  );
}

/** Only accept a suggestion that would pass validation anyway. */
function cleanSuggestion(suggestion: GoalSuggestion = {}) {
  const target = Number(suggestion.target);
  return {
    name: suggestion.name?.slice(0, GOAL_NAME_MAX_LENGTH) ?? '',
    emoji: (GOAL_EMOJIS as readonly string[]).includes(suggestion.emoji ?? '')
      ? (suggestion.emoji as string)
      : DEFAULT_GOAL_EMOJI,
    target: Number.isSafeInteger(target) && target > 0 ? target : null,
  };
}

function GoalForm({ goalId, suggestion }: { goalId?: string; suggestion?: GoalSuggestion }) {
  const existing = useGoal(goalId ?? '');
  const contributions = useContributions();
  const currency = useCurrency();
  const { addGoal, updateGoal } = useAppActions();
  const isEditing = existing !== undefined;
  const [suggested] = useState(() => cleanSuggestion(suggestion));

  const [name, setName] = useState(existing?.name ?? suggested.name);
  const [targetText, setTargetText] = useState(
    amountToInputText(existing?.targetAmount ?? suggested.target),
  );
  const [targetDate, setTargetDate] = useState<IsoDate | null>(existing?.targetDate ?? null);
  const [emoji, setEmoji] = useState(existing?.emoji ?? suggested.emoji);
  const [rateText, setRateText] = useState(interestRateToInputText(existing?.interestRate));
  const [rateError, setRateError] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);
  const [targetError, setTargetError] = useState<string | null>(null);
  const [dateError, setDateError] = useState<string | null>(null);

  const currencySymbol = CURRENCIES.find((c) => c.code === currency)?.symbol ?? '';
  const alreadySaved = existing ? totalSaved(existing.id, contributions) : 0;

  // An existing goal whose date has already passed keeps that date until the
  // user picks a new one, so they can still edit the name or amount.
  const datePassed = targetDate !== null && targetDate < todayIsoDate();
  const keepingOldDate = isEditing && targetDate === existing.targetDate;

  // Live hint: "That's about £68 a month" once there's a valid target and a future date.
  const targetPreview = validateGoalTarget(targetText);
  const ratePreview = validateInterestRate(rateText);
  const monthlyPreview =
    targetPreview.ok && targetDate && !datePassed
      ? monthlyAmountNeeded(
          {
            id: existing?.id ?? 'draft',
            name,
            emoji,
            targetAmount: targetPreview.value,
            targetDate,
            createdAt: existing?.createdAt ?? '',
            ...(ratePreview.ok && ratePreview.value ? { interestRate: ratePreview.value } : {}),
          },
          contributions,
        )
      : null;

  function handleSave() {
    const nameResult = validateGoalName(name);
    const targetResult = validateGoalTarget(targetText);
    const dateResult = keepingOldDate
      ? ({ ok: true, value: targetDate } as const)
      : validateGoalTargetDate(targetDate);
    setNameError(nameResult.ok ? null : nameResult.error);
    setTargetError(targetResult.ok ? null : targetResult.error);
    setDateError(dateResult.ok ? null : dateResult.error);
    const rateResult = validateInterestRate(rateText);
    setRateError(rateResult.ok ? null : rateResult.error);
    if (!nameResult.ok || !targetResult.ok || !dateResult.ok || !rateResult.ok) return;

    const values = {
      name: nameResult.value,
      targetAmount: targetResult.value,
      targetDate: dateResult.value,
      emoji,
      // undefined clears a rate that was removed (it isn't saved).
      interestRate: rateResult.value ?? undefined,
    };
    if (existing) updateGoal(existing.id, values);
    else addGoal(values);
    close();
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ModalHeader title={isEditing ? 'Edit goal' : 'New goal'} onClose={close} />

        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <View style={styles.preview}>
              <ThemedText type="emojiLarge" accessibilityLabel={`Chosen icon: ${emoji}`}>{emoji}</ThemedText>
            </View>

            <TextField
              label="Goal name"
              value={name}
              onChangeText={(text) => {
                setName(text);
                setNameError(null);
              }}
              error={nameError}
              placeholder="e.g. New laptop"
              autoCapitalize="sentences"
              autoFocus={!isEditing}
              maxLength={GOAL_NAME_MAX_LENGTH + 10}
              returnKeyType="next"
            />

            <TextField
              label="Target amount"
              value={targetText}
              onChangeText={(text) => {
                setTargetText(text);
                setTargetError(null);
              }}
              error={targetError}
              prefix={currencySymbol}
              placeholder="e.g. 900"
              keyboardType="decimal-pad"
              maxLength={MONEY_INPUT_MAX_LENGTH}
            />
            {isEditing && alreadySaved > 0 && (
              <ThemedText type="small" themeColor="textSecondary">
                You’ve saved {formatMoney(alreadySaved, currency)} toward this so far.
              </ThemedText>
            )}

            <MonthPicker
              value={targetDate}
              onChange={(date) => {
                setTargetDate(date);
                setDateError(null);
              }}
              error={dateError}
            />
            {datePassed && targetDate && !dateError && (
              <ThemedText type="small" themeColor="textSecondary">
                The target date ({formatMonthYear(targetDate)}) has passed. Pick a new month with
                the arrows, or switch the date off.
              </ThemedText>
            )}
            {monthlyPreview !== null && monthlyPreview > 0 && targetDate && (
              <ThemedView type="backgroundElement" style={styles.hint}>
                <ThemedText type="small" themeColor="textSecondary">
                  That’s about{' '}
                  <ThemedText type="smallBold">{formatMoney(monthlyPreview, currency)}</ThemedText> a
                  month to reach it by {formatMonthYear(targetDate)}
                  {ratePreview.ok && ratePreview.value ? ', including interest' : ''}.
                </ThemedText>
              </ThemedView>
            )}

            <TextField
              label="Interest rate (optional)"
              value={rateText}
              onChangeText={(text) => {
                setRateText(text);
                setRateError(null);
              }}
              error={rateError}
              suffix="% a year"
              placeholder="e.g. 4.5"
              keyboardType="decimal-pad"
              maxLength={8}
              accessibilityHint="The yearly interest rate your bank pays on this money"
            />
            <ThemedText type="small" themeColor="textSecondary">
              Keeping this money in a savings account that pays interest? Enter the yearly rate your
              own bank pays on it (often shown as “AER” in your banking app). Goalpot doesn’t hold
              or move any money: it only uses this rate to estimate how your pot grows, so your
              monthly plan is more accurate. Leave it blank if this money doesn’t earn interest.
            </ThemedText>

            <EmojiPicker value={emoji} onChange={setEmoji} />
          </ScrollView>

          <View style={styles.footer}>
            <Button title={isEditing ? 'Save changes' : 'Add goal'} onPress={handleSave} />
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
  preview: {
    alignItems: 'center',
  },
  hint: {
    padding: Spacing.three,
    borderRadius: Radius.control,
  },
  footer: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
  },
});
