import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

import { AdviceNote } from '@/components/budget/advice-note';
import { ChallengeCard } from '@/components/challenges/challenge-card';
import { SavingsLineChart } from '@/components/charts/savings-line-chart';
import { ContributionRow } from '@/components/goals/contribution-row';
import { GoalAvatar } from '@/components/goals/goal-avatar';
import { GoalCelebration } from '@/components/goals/goal-celebration';
import { MilestoneBanner } from '@/components/goals/milestone-banner';
import { QuickSave } from '@/components/goals/quick-save';
import { WhatIfPlanner } from '@/components/goals/what-if-planner';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { TextButton } from '@/components/ui/text-button';
import { Confetti } from '@/components/ui/confetti';
import { ProgressBar } from '@/components/ui/progress-bar';
import { BottomTabInset, MaxContentWidth, Radius, ScreenPadding, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  useAbout,
  useAppActions,
  useContributions,
  useCurrency,
  useGoal,
  useGoalContributions,
  useGoalProgress,
} from '@/hooks/use-app-data';
import type { Contribution } from '@/types/models';
import {
  formatDate,
  formatMonthYear,
  formatRelativeDay,
  relativeDayInSentence,
  savingMonthsLeft,
  toIsoDate,
} from '@/utils/dates';
import { formatRate, interestEarned } from '@/utils/interest';
import { crossedMilestone, type Milestone } from '@/utils/milestones';
import { formatMoney } from '@/utils/money';
import { perPayPeriod } from '@/utils/personal';
import { ordinal } from '@/utils/reminders';
import {
  nextRepeatingPayment,
  skipNextRepeating,
  skippedRepeatingDates,
  undoSkipRepeating,
} from '@/utils/repeating';

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
  const contributions = useContributions();
  const currency = useCurrency();
  const { deleteGoal, deleteContribution, setRepeatingSaving, archiveGoal, restoreGoal } =
    useAppActions();
  const reduceMotion = useReducedMotion();
  const about = useAbout();
  const theme = useTheme();

  // Celebrate when progress crosses into 100% while this screen is open
  // (e.g. after "Add money"), but not when opening an already-finished goal.
  // This is React's "adjust state when a value changes" pattern, done during render.
  const percent = progress?.percent ?? 0;
  const [lastPercent, setLastPercent] = useState(percent);
  const [celebrating, setCelebrating] = useState(false);
  // Same for the smaller 25 / 50 / 75% milestones.
  const [milestone, setMilestone] = useState<Milestone | null>(null);
  if (percent !== lastPercent) {
    setLastPercent(percent);
    setCelebrating(lastPercent < 100 && percent >= 100);
    setMilestone(crossedMilestone(lastPercent, percent));
  }

  if (!goal || !progress) {
    return (
      <ThemedView style={[styles.container, styles.notFound]}>
        <Stack.Screen options={{ title: 'Goal not found' }} />
        <ThemedText type="emojiLarge">🔍</ThemedText>
        <ThemedText themeColor="textSecondary">This goal doesn’t exist any more.</ThemedText>
        <Button title="Back to goals" variant="secondary" onPress={goBackToList} />
      </ThemedView>
    );
  }

  const money = (amount: number) => formatMoney(amount, currency);
  const archived = Boolean(goal.archivedAt);
  // An archived goal shows its progress and history, but no plans or actions.
  const complete = progress.remaining === 0 || archived;
  // People paid weekly or every 4 weeks also see the monthly plan per payday.
  const perPay =
    progress.monthlyNeeded !== null
      ? perPayPeriod(progress.monthlyNeeded, about.payFrequency)
      : null;

  function openShare() {
    if (goal) router.push({ pathname: '/share-progress', params: { goalId: goal.id } });
  }

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
      entry.withdrawal ? 'Delete this entry?' : 'Delete this saving?',
      entry.withdrawal
        ? `The ${money(entry.amount)} you took out ${relativeDayInSentence(entry.date)} will be removed, so it counts as still in “${goal?.name}”.`
        : `The ${money(entry.amount)} you saved ${relativeDayInSentence(entry.date)} will be removed from “${goal?.name}”.`,
      'Delete',
      () => deleteContribution(entry.id),
    );
  }

  return (
    <ThemedView style={styles.container}>
      {/* The big name below is the page title, so the bar just shows the back button. */}
      <Stack.Screen options={{ title: '' }} />
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content}>
        {celebrating && (
          <GoalCelebration
            goalName={goal.name}
            targetText={money(goal.targetAmount)}
            onDismiss={() => setCelebrating(false)}
            onShare={openShare}
          />
        )}
        {milestone && !celebrating && (
          <MilestoneBanner
            milestone={milestone}
            goalName={goal.name}
            progressText={`${money(progress.saved)} of ${money(goal.targetAmount)}`}
            onShare={openShare}
            onDismiss={() => setMilestone(null)}
          />
        )}

        <View style={styles.hero}>
          <GoalAvatar
            emoji={goal.emoji}
            image={goal.image}
            size={goal.image ? 132 : 96}
            radius={Radius.card + 8}
            backgroundColor={theme.backgroundElement}
            emojiType="emojiLarge"
          />
          <ThemedText type="title" style={styles.center} accessibilityRole="header">
            {goal.name}
          </ThemedText>
          {goal.targetDate ? (
            <View style={[styles.chip, { backgroundColor: theme.backgroundElement }]}>
              <ThemedText type="smallBold" themeColor="textSecondary">
                🗓️ Target: {formatMonthYear(goal.targetDate)}
              </ThemedText>
            </View>
          ) : null}
        </View>

        {archived && (
          <Card
            title="Archived"
            subtitle="This goal is put away: it’s not in your goals list, totals, reminders or check-ins, and any repeating saving is paused. Its savings still count in your streaks and year in review."
            index={0}>
            <Button
              title="Restore goal"
              accessibilityHint="Brings this goal back to your goals list"
              onPress={() => restoreGoal(goal.id)}
            />
          </Card>
        )}

        <Card index={0}>
          <View
            style={styles.row}
            accessible
            accessibilityLabel={`${money(progress.saved)} saved of ${money(goal.targetAmount)}, ${progress.percent}%`}>
            <View>
              <ThemedText type="small" themeColor="textSecondary">
                Saved
              </ThemedText>
              <ThemedText type="title">{money(progress.saved)}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                of {money(goal.targetAmount)}
              </ThemedText>
            </View>
            <ThemedText type="heading" themeColor={complete ? 'tint' : 'text'}>
              {progress.percent}%
            </ThemedText>
          </View>
          <ProgressBar percent={progress.percent} height={12} accessibilityLabel="Goal progress" />
          <ThemedText themeColor={progress.remaining === 0 ? 'tint' : 'textSecondary'}>
            {progress.remaining === 0
              ? 'You’ve reached this goal. Well done! 🎉'
              : `You have ${money(progress.remaining)} left to save.`}
          </ThemedText>
          {!archived && (
            <Button
              title="+ Add money"
              accessibilityHint="Opens a form to log money you’ve saved"
              onPress={() => router.push({ pathname: '/add-money', params: { goalId: goal.id } })}
            />
          )}
          {!archived && (
            <QuickSave
              goalId={goal.id}
              goalName={goal.name}
              remaining={progress.remaining}
              target={goal.targetAmount}
            />
          )}
          {progress.saved > 0 && (
            <TextButton
              title="Share my progress"
              accessibilityHint="Makes an image of your progress to share"
              onPress={openShare}
            />
          )}
          {!archived && progress.saved > 0 && (
            <Button
              title="Take money out"
              variant="secondary"
              accessibilityHint="Opens a form to log money you’ve taken out of this goal"
              onPress={() =>
                router.push({
                  pathname: '/add-money',
                  params: { goalId: goal.id, mode: 'withdraw' },
                })
              }
            />
          )}
        </Card>

        {!archived && (
          <ChallengeCard goals={[goal]} contributions={contributions} goalId={goal.id} index={1} />
        )}

        {!complete && goal.targetDate && progress.monthlyNeeded !== null && (
          <Card title="Monthly plan" index={1}>
            {savingMonthsLeft(goal.targetDate) > 0 ? (
              <ThemedText>
                You need to save{' '}
                <ThemedText type="defaultBold">{money(progress.monthlyNeeded)}</ThemedText> per
                month to reach this by {formatMonthYear(goal.targetDate)}.
                {perPay ? ` That’s about ${money(perPay.amount)} ${perPay.per}.` : ''}
                {goal.interestRate ? ' This includes the interest your bank pays.' : ''}
              </ThemedText>
            ) : (
              <ThemedText themeColor="textSecondary">
                Your target date ({formatMonthYear(goal.targetDate)}) has passed, and you still have{' '}
                {money(progress.remaining)} to go. Edit the goal to pick a new date.
              </ThemedText>
            )}
            {!goal.interestRate && (
              <TextButton
                title="Earning interest on this? Add your rate"
                accessibilityHint="Opens the goal editor, where you can enter your bank’s interest rate"
                onPress={() => router.push({ pathname: '/goal-editor', params: { id: goal.id } })}
              />
            )}
          </Card>
        )}

        {!complete && goal.interestRate ? (
          <Card
            title="Interest (estimate)"
            index={1}
            action={
              <TextButton
                title="Change"
                accessibilityLabel="Change interest rate"
                onPress={() => router.push({ pathname: '/goal-editor', params: { id: goal.id } })}
              />
            }>
            {(() => {
              const rate = goal.interestRate ?? 0;
              const months = goal.targetDate ? savingMonthsLeft(goal.targetDate) : 0;
              const monthly = progress.monthlyNeeded ?? 0;
              if (goal.targetDate && months > 0 && monthly > 0) {
                const earned = interestEarned(progress.saved, monthly, months, rate);
                return (
                  <ThemedText>
                    At <ThemedText type="defaultBold">{formatRate(rate)} a year</ThemedText>, about{' '}
                    <ThemedText type="defaultBold">{money(earned)}</ThemedText> of this goal should
                    come from interest if you save {money(monthly)} a month until{' '}
                    {formatMonthYear(goal.targetDate)}.
                  </ThemedText>
                );
              }
              if (progress.saved > 0) {
                return (
                  <ThemedText>
                    At <ThemedText type="defaultBold">{formatRate(rate)} a year</ThemedText>, the{' '}
                    {money(progress.saved)} you’ve saved would earn about{' '}
                    <ThemedText type="defaultBold">
                      {money(interestEarned(progress.saved, 0, 12, rate))}
                    </ThemedText>{' '}
                    over the next year.
                  </ThemedText>
                );
              }
              return (
                <ThemedText>
                  Once you’ve saved something, interest at {formatRate(rate)} a year will help it
                  grow.
                </ThemedText>
              );
            })()}
            <ThemedText type="small" themeColor="textSecondary">
              This uses the rate you entered from your bank. Goalpot doesn’t hold your money, and
              banks change their rates, so treat it as an estimate. When your bank pays interest,
              log it with “Add money” (note: Interest) so your total matches your account.
            </ThemedText>
            <AdviceNote short />
          </Card>
        ) : null}

        {archived ? null : goal.repeating ? (
          <Card title="Repeating saving" index={1}>
            {(() => {
              const next = nextRepeatingPayment(goal, contributions);
              const skipped = skippedRepeatingDates(goal.repeating);
              return (
                <View style={styles.repeating} accessible>
                  <ThemedText>
                    <ThemedText type="defaultBold">{money(goal.repeating.amount)}</ThemedText> on
                    the {ordinal(goal.repeating.dayOfMonth)} of every month, logged for you.
                  </ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {next
                      ? `Next one: ${formatRelativeDay(next)}`
                      : 'Paused: this goal is reached. It starts again if you raise the target.'}
                  </ThemedText>
                  {next && skipped.length > 0 && (
                    <ThemedText type="small" themeColor="textSecondary">
                      Skipping {skipped.map((d) => formatDate(d)).join(' and ')}.
                    </ThemedText>
                  )}
                </View>
              );
            })()}
            <View style={styles.buttonRow}>
              <View style={styles.flex}>
                <Button
                  title="Change"
                  variant="secondary"
                  accessibilityHint="Change the amount or day, or stop it"
                  onPress={() =>
                    router.push({ pathname: '/repeating-saving', params: { goalId: goal.id } })
                  }
                />
              </View>
              {!complete && goal.repeating && (
                <View style={styles.flex}>
                  <Button
                    title="Skip next"
                    variant="secondary"
                    accessibilityHint="The next payment won’t be logged"
                    onPress={() => {
                      if (goal.repeating)
                        setRepeatingSaving(goal.id, skipNextRepeating(goal.repeating));
                    }}
                  />
                </View>
              )}
            </View>
            {!complete && skippedRepeatingDates(goal.repeating).length > 0 && (
              <Button
                title="Undo skip"
                variant="secondary"
                accessibilityHint="The last skipped payment will be logged after all"
                onPress={() => {
                  if (goal.repeating)
                    setRepeatingSaving(goal.id, undoSkipRepeating(goal.repeating));
                }}
              />
            )}
          </Card>
        ) : (
          !complete && (
            <Card
              title="Save automatically"
              subtitle="Put the same amount aside every month, like a standing order? Goalpot can log it for you."
              index={1}>
              <Button
                title="Set up a repeating saving"
                variant="secondary"
                onPress={() =>
                  router.push({ pathname: '/repeating-saving', params: { goalId: goal.id } })
                }
              />
            </Card>
          )
        )}

        {!complete && (
          <Card title="What if?" subtitle="Try a different monthly amount" index={2}>
            <WhatIfPlanner
              remaining={progress.remaining}
              monthlyNeeded={progress.monthlyNeeded}
              targetDate={goal.targetDate}
              currency={currency}
              payFrequency={about.payFrequency}
              interest={
                goal.interestRate ? { saved: progress.saved, rate: goal.interestRate } : undefined
              }
            />
          </Card>
        )}

        <Card title="Saved over time" index={2}>
          <SavingsLineChart goal={goal} contributions={contributions} currency={currency} />
        </Card>

        <Card
          title="Savings history"
          subtitle={
            history.length > 0
              ? `${history.length} saving${history.length === 1 ? '' : 's'}, newest first`
              : undefined
          }
          index={3}>
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
                onEdit={() =>
                  router.push({
                    pathname: '/add-money',
                    params: { goalId: goal.id, contributionId: entry.id },
                  })
                }
                onDelete={() => confirmDeleteContribution(entry)}
              />
            ))
          )}
        </Card>

        <ThemedText type="caption" themeColor="textSecondary" style={styles.center}>
          Created {formatDate(toIsoDate(new Date(goal.createdAt)))}
        </ThemedText>

        <View style={styles.actions}>
          <Button
            title="Edit goal"
            variant="secondary"
            onPress={() => router.push({ pathname: '/goal-editor', params: { id: goal.id } })}
          />
          {!archived && (
            <Button
              title="Archive goal"
              variant="secondary"
              accessibilityHint="Hides this goal from your lists and totals. You can restore it any time"
              onPress={() => archiveGoal(goal.id)}
            />
          )}
          <Button title="Delete goal" variant="danger" onPress={confirmDeleteGoal} />
        </View>
      </ScrollView>

      {/* Usually triggered from the Add money sheet, so wait for it to close. */}
      {celebrating && !reduceMotion && about.celebrations && <Confetti startDelay={450} />}
      {milestone && !celebrating && !reduceMotion && about.celebrations && (
        <Confetti key={milestone} startDelay={450} count={22} />
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  repeating: {
    gap: Spacing.one,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  flex: {
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
    paddingHorizontal: ScreenPadding,
    paddingTop: Spacing.two,
    paddingBottom: BottomTabInset + Spacing.five,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  hero: {
    alignItems: 'center',
    gap: Spacing.two,
    marginBottom: Spacing.two,
  },
  chip: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one + Spacing.half,
    borderRadius: Radius.pill,
  },
  center: {
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    gap: Spacing.two,
  },
  actions: {
    gap: Spacing.two,
    marginTop: Spacing.two,
  },
});
