import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

import { ContributionRow } from '@/components/goals/contribution-row';
import { GoalCelebration } from '@/components/goals/goal-celebration';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { Confetti } from '@/components/ui/confetti';
import { ProgressBar } from '@/components/ui/progress-bar';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import {
  useAppActions,
  useCurrency,
  useGoal,
  useGoalContributions,
  useGoalProgress,
} from '@/hooks/use-app-data';
import type { Contribution } from '@/types/models';
import { formatDate, formatMonthYear, formatRelativeDay, savingMonthsLeft, toIsoDate } from '@/utils/dates';
import { formatMoney } from '@/utils/money';

/** Leaves this screen; falls back to the list if there's nothing to go back to (e.g. web refresh). */
function goBackToList() {
  if (router.canGoBack()) router.back();
  else router.replace('/goals');
}

/** Shows a yes/no dialog. Alert buttons don't work on web, so it uses window.confirm there. */
function confirm(title: string, message: string, confirmLabel: string, onConfirm: () => void) {
  if (Platform.OS === 'web') {
    if (window.confirm(`${title} ${message}`)) onConfirm();
    return;
  }
  Alert.alert(title, message, [
    { text: 'Cancel', style: 'cancel' },
    { text: confirmLabel, style: 'destructive', onPress: onConfirm },
  ]);
}

export default function GoalDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const goal = useGoal(id);
  const progress = useGoalProgress(id);
  const history = useGoalContributions(id);
  const currency = useCurrency();
  const { deleteGoal, deleteContribution } = useAppActions();
  const reduceMotion = useReducedMotion();

  // Celebrate when progress crosses into 100% while this screen is open
  // (e.g. after "Add money"), but not when opening an already-finished goal.
  // This is React's "adjust state when a value changes" pattern, done during render.
  const percent = progress?.percent ?? 0;
  const [lastPercent, setLastPercent] = useState(percent);
  const [celebrating, setCelebrating] = useState(false);
  if (percent !== lastPercent) {
    setLastPercent(percent);
    setCelebrating(lastPercent < 100 && percent >= 100);
  }

  if (!goal || !progress) {
    return (
      <ThemedView style={[styles.container, styles.notFound]}>
        <Stack.Screen options={{ title: 'Goal not found' }} />
        <ThemedText themeColor="textSecondary">This goal doesn’t exist any more.</ThemedText>
        <Button title="Back to goals" variant="secondary" onPress={goBackToList} />
      </ThemedView>
    );
  }

  const money = (amount: number) => formatMoney(amount, currency);
  const complete = progress.remaining === 0;

  function confirmDeleteGoal() {
    if (!goal) return;
    const extra =
      history.length > 0
        ? ` This also deletes the ${history.length} saving${history.length === 1 ? '' : 's'} you logged for it.`
        : '';
    confirm(
      'Delete this goal?',
      `“${goal.name}” will be removed from this phone.${extra} This can’t be undone.`,
      'Delete',
      () => {
        // Leave the screen first, so it doesn't briefly show "not found".
        goBackToList();
        deleteGoal(goal.id);
      },
    );
  }

  function confirmDeleteContribution(entry: Contribution) {
    confirm(
      'Delete this saving?',
      `${money(entry.amount)} from ${formatRelativeDay(entry.date).toLowerCase()} will be removed from “${goal?.name}”.`,
      'Delete',
      () => deleteContribution(entry.id),
    );
  }

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ title: goal.name }} />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.content}>
        {celebrating && (
          <GoalCelebration
            goalName={goal.name}
            targetText={money(goal.targetAmount)}
            onDismiss={() => setCelebrating(false)}
          />
        )}

        <View style={styles.hero}>
          <ThemedText style={styles.heroEmoji}>{goal.emoji}</ThemedText>
          <ThemedText type="subtitle" style={styles.center}>
            {goal.name}
          </ThemedText>
          {goal.targetDate ? (
            <ThemedText themeColor="textSecondary">
              Target: {formatMonthYear(goal.targetDate)}
            </ThemedText>
          ) : null}
        </View>

        <ThemedView type="backgroundElement" style={styles.card}>
          <View style={styles.row}>
            <ThemedText type="smallBold">
              {money(progress.saved)}{' '}
              <ThemedText type="small" themeColor="textSecondary">
                of {money(goal.targetAmount)}
              </ThemedText>
            </ThemedText>
            <ThemedText type="smallBold" themeColor={complete ? 'tint' : 'text'}>
              {progress.percent}%
            </ThemedText>
          </View>
          <ProgressBar percent={progress.percent} height={12} accessibilityLabel="Goal progress" />
          <ThemedText themeColor={complete ? 'tint' : 'textSecondary'}>
            {complete
              ? 'You’ve reached this goal. Well done! 🎉'
              : `You have ${money(progress.remaining)} left to save.`}
          </ThemedText>
          <Button
            title="+ Add money"
            onPress={() => router.push({ pathname: '/add-money', params: { goalId: goal.id } })}
          />
        </ThemedView>

        {!complete && goal.targetDate && progress.monthlyNeeded !== null && (
          <ThemedView type="backgroundElement" style={styles.card}>
            <ThemedText type="smallBold">Monthly plan</ThemedText>
            {savingMonthsLeft(goal.targetDate) > 0 ? (
              <ThemedText>
                You need to save{' '}
                <ThemedText type="smallBold" style={styles.inlineEmphasis}>
                  {money(progress.monthlyNeeded)}
                </ThemedText>{' '}
                per month to reach this by {formatMonthYear(goal.targetDate)}.
              </ThemedText>
            ) : (
              <ThemedText themeColor="textSecondary">
                Your target date ({formatMonthYear(goal.targetDate)}) has passed, and you still have{' '}
                {money(progress.remaining)} to go. Edit the goal to pick a new date.
              </ThemedText>
            )}
          </ThemedView>
        )}

        <ThemedView type="backgroundElement" style={styles.card}>
          <ThemedText type="smallBold">Savings history</ThemedText>
          {history.length === 0 ? (
            <ThemedText type="small" themeColor="textSecondary">
              Nothing logged yet. Tap “Add money” when you put some aside.
            </ThemedText>
          ) : (
            history.map((entry) => (
              <ContributionRow
                key={entry.id}
                contribution={entry}
                currency={currency}
                onDelete={() => confirmDeleteContribution(entry)}
              />
            ))
          )}
        </ThemedView>

        <ThemedText type="small" themeColor="textSecondary" style={styles.center}>
          Created {formatDate(toIsoDate(new Date(goal.createdAt)))}
        </ThemedText>

        <View style={styles.actions}>
          <Button
            title="Edit goal"
            variant="secondary"
            onPress={() => router.push({ pathname: '/goal-editor', params: { id: goal.id } })}
          />
          <Button title="Delete goal" variant="danger" onPress={confirmDeleteGoal} />
        </View>
      </ScrollView>

      {/* Usually triggered from the Add money sheet, so wait for it to close. */}
      {celebrating && !reduceMotion && <Confetti startDelay={450} />}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  notFound: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
    padding: Spacing.four,
  },
  content: {
    gap: Spacing.three,
    padding: Spacing.four,
    paddingBottom: BottomTabInset + Spacing.four,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  hero: {
    alignItems: 'center',
    gap: Spacing.one,
    marginBottom: Spacing.two,
  },
  heroEmoji: {
    fontSize: 64,
    lineHeight: 76,
  },
  center: {
    textAlign: 'center',
  },
  card: {
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Spacing.four,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.two,
  },
  inlineEmphasis: {
    fontSize: 16,
  },
  actions: {
    gap: Spacing.two,
    marginTop: Spacing.two,
  },
});
