import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ProgressBar } from '@/components/ui/progress-bar';
import { TextButton } from '@/components/ui/text-button';
import { Spacing } from '@/constants/theme';
import { useChallenges, useCurrency } from '@/hooks/use-app-data';
import type { Contribution, SavingsGoal } from '@/types/models';
import { CHALLENGES, challengeProgress, nextStep, stepAmount } from '@/utils/challenges';
import { amountRemaining } from '@/utils/goals';
import { formatMoney } from '@/utils/money';

type ChallengeCardProps = {
  /** Active (not archived) goals. */
  goals: SavingsGoal[];
  contributions: Contribution[];
  index?: number;
  /** Only this goal's challenge (the goal page); otherwise all of them (Home). */
  goalId?: string;
};

/**
 * Savings challenges at a glance: progress and the next step for each one,
 * or (on Home, with none running) an invitation to start one.
 */
export function ChallengeCard({ goals, contributions, index, goalId }: ChallengeCardProps) {
  const currency = useCurrency();
  const money = (amount: number) => formatMoney(amount, currency);
  const goalIds = new Set(goals.map((g) => g.id));
  const challenges = useChallenges().filter(
    (c) => goalIds.has(c.goalId) && (!goalId || c.goalId === goalId),
  );

  if (challenges.length === 0) {
    // The goal page only shows a running challenge; Home invites one when a goal needs money.
    if (goalId || !goals.some((g) => amountRemaining(g, contributions) > 0)) return null;
    return (
      <Card
        title="Try a savings challenge 🏆"
        subtitle="The 52-week challenge, 100 envelopes or 30 days in a row. Tick off each step as you save it."
        index={index}>
        <Button
          title="See challenges"
          variant="secondary"
          accessibilityHint="Opens the savings challenges"
          onPress={() => router.push('/challenges')}
        />
      </Card>
    );
  }

  return (
    <Card
      title={challenges.length === 1 ? 'Your challenge' : 'Your challenges'}
      index={index}
      action={
        goalId ? undefined : (
          <TextButton
            title="All"
            accessibilityHint="Opens the savings challenges"
            onPress={() => router.push('/challenges')}
          />
        )
      }>
      {challenges.map((c) => {
        const info = CHALLENGES[c.kind];
        const goal = goals.find((g) => g.id === c.goalId);
        const progress = challengeProgress(c, contributions);
        const next = nextStep(c, contributions);
        return (
          <View key={c.id} style={styles.item}>
            <ThemedText type="defaultBold">
              {info.emoji} {info.name}
              {goalId ? '' : ` · ${goal?.name ?? ''}`}
            </ThemedText>
            <ProgressBar
              percent={progress.percent}
              accessibilityLabel={`${progress.done} of ${progress.steps} done`}
            />
            <ThemedText type="small" themeColor="textSecondary">
              {progress.finished
                ? `Complete! ${money(progress.saved)} saved 🎉`
                : `${progress.done} of ${progress.steps} done · ${money(progress.saved)} saved${
                    next !== null
                      ? ` · next: ${info.stepLabel(next)} (${money(stepAmount(c.kind, next, c.unit))})`
                      : ''
                  }`}
            </ThemedText>
            <Button
              title={progress.finished ? 'See it' : 'Open challenge'}
              variant="secondary"
              compact
              accessibilityHint={`Opens your ${info.name}`}
              onPress={() => router.push({ pathname: '/challenge', params: { id: c.id } })}
            />
          </View>
        );
      })}
    </Card>
  );
}

const styles = StyleSheet.create({
  item: {
    gap: Spacing.two,
  },
});
