import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmojiPicker } from '@/components/goals/emoji-picker';
import { MonthPicker } from '@/components/goals/month-picker';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { ModalHeader } from '@/components/ui/modal-header';
import { TextField } from '@/components/ui/text-field';
import { CURRENCIES } from '@/constants/currencies';
import { DEFAULT_GOAL_EMOJI } from '@/constants/goal-emojis';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useAppActions, useContributions, useCurrency, useGoal } from '@/hooks/use-app-data';
import type { IsoDate } from '@/types/models';
import { formatMonthYear, todayIsoDate } from '@/utils/dates';
import { monthlyAmountNeeded, totalSaved } from '@/utils/goals';
import { formatMoney } from '@/utils/money';
import {
  amountToInputText,
  GOAL_NAME_MAX_LENGTH,
  MONEY_INPUT_MAX_LENGTH,
  validateGoalName,
  validateGoalTarget,
  validateGoalTargetDate,
} from '@/utils/validation';

function close() {
  if (router.canGoBack()) router.back();
  else router.replace('/goals');
}

/**
 * Add a new goal, or edit one when opened with `?id=<goalId>`.
 * Presented as a modal over the tabs (see src/app/_layout.tsx).
 */
export default function GoalEditorScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
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
  return <GoalForm key={existing?.id ?? 'new'} goalId={existing?.id} />;
}

function GoalForm({ goalId }: { goalId?: string }) {
  const existing = useGoal(goalId ?? '');
  const contributions = useContributions();
  const currency = useCurrency();
  const { addGoal, updateGoal } = useAppActions();
  const isEditing = existing !== undefined;

  const [name, setName] = useState(existing?.name ?? '');
  const [targetText, setTargetText] = useState(amountToInputText(existing?.targetAmount ?? null));
  const [targetDate, setTargetDate] = useState<IsoDate | null>(existing?.targetDate ?? null);
  const [emoji, setEmoji] = useState(existing?.emoji ?? DEFAULT_GOAL_EMOJI);
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
    if (!nameResult.ok || !targetResult.ok || !dateResult.ok) return;

    const values = {
      name: nameResult.value,
      targetAmount: targetResult.value,
      targetDate: dateResult.value,
      emoji,
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
                  month to reach it by {formatMonthYear(targetDate)}.
                </ThemedText>
              </ThemedView>
            )}

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
