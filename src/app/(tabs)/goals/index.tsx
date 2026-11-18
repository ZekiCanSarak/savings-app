import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { GoalCard } from '@/components/goals/goal-card';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Screen } from '@/components/ui/screen';
import { MinTapSize, Spacing } from '@/constants/theme';
import { useContributions, useCurrency, useGoals } from '@/hooks/use-app-data';
import type { SavingsGoal } from '@/types/models';
import {
  amountRemaining,
  isGoalComplete,
  percentComplete,
  sortGoalsForDisplay,
  totalSaved,
} from '@/utils/goals';

function openNewGoal() {
  router.push('/goal-editor');
}

export default function GoalsScreen() {
  const goals = useGoals();
  const contributions = useContributions();
  const currency = useCurrency();
  const [showReached, setShowReached] = useState(false);

  const sortedGoals = sortGoalsForDisplay(goals, contributions);
  const active = sortedGoals.filter((g) => !isGoalComplete(g, contributions));
  const reached = sortedGoals.filter((g) => isGoalComplete(g, contributions));

  const card = (goal: SavingsGoal, index: number) => (
    <GoalCard
      key={goal.id}
      index={index}
      goal={goal}
      currency={currency}
      saved={totalSaved(goal.id, contributions)}
      remaining={amountRemaining(goal, contributions)}
      percent={percentComplete(goal, contributions)}
      onPress={() => router.push({ pathname: '/goals/[id]', params: { id: goal.id } })}
    />
  );

  return (
    <Screen
      title="Goals"
      subtitle={
        goals.length > 0
          ? `${active.length} in progress${reached.length > 0 ? ` · ${reached.length} reached` : ''}`
          : undefined
      }
      headerRight={
        goals.length > 0 ? (
          <Button
            title="+ New goal"
            compact
            onPress={openNewGoal}
            accessibilityHint="Opens a form to add a goal"
          />
        ) : null
      }>
      {goals.length === 0 ? (
        <EmptyState
          emoji="🌱"
          title="No goals yet"
          message="What are you saving for? A new laptop, a holiday, a rainy-day fund? Add your first goal and watch it grow."
          actionTitle="Create your first goal"
          onAction={openNewGoal}
        />
      ) : (
        <>
          {active.length === 0 && (
            <ThemedText themeColor="textSecondary">
              Every goal is reached. Brilliant! Add a new one whenever you’re ready.
            </ThemedText>
          )}
          {active.map(card)}

          {active.length >= 2 && (
            <Button
              title="Split money between goals"
              variant="secondary"
              accessibilityHint="Share one amount, like a bonus, between your goals"
              onPress={() => router.push('/split-money')}
            />
          )}

          {reached.length > 0 && (
            <View style={styles.shelf}>
              {/* Finished goals are kept out of the way, like a trophy shelf. */}
              <Pressable
                onPress={() => setShowReached((value) => !value)}
                accessibilityRole="button"
                aria-expanded={showReached}
                accessibilityLabel={`Reached goals, ${reached.length}`}
                accessibilityHint={showReached ? 'Hides your reached goals' : 'Shows your reached goals'}
                style={({ pressed }) => [styles.shelfHeader, pressed && styles.pressed]}>
                <ThemedText type="heading" style={styles.flex}>
                  Reached 🎉 ({reached.length})
                </ThemedText>
                <ThemedText type="smallBold" themeColor="tint" importantForAccessibility="no">
                  {showReached ? 'Hide ▲' : 'Show ▼'}
                </ThemedText>
              </Pressable>
              {showReached && reached.map((goal, i) => card(goal, active.length + i))}
            </View>
          )}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  shelf: {
    gap: Spacing.three,
    marginTop: Spacing.two,
  },
  shelfHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    minHeight: MinTapSize,
  },
  flex: {
    flex: 1,
  },
  pressed: {
    opacity: 0.7,
  },
});
