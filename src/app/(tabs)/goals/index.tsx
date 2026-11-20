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
import type { ReactNode } from 'react';

import {
  activeGoals,
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
  const [showArchived, setShowArchived] = useState(false);

  const sortedGoals = sortGoalsForDisplay(activeGoals(goals), contributions);
  const active = sortedGoals.filter((g) => !isGoalComplete(g, contributions));
  const reached = sortedGoals.filter((g) => isGoalComplete(g, contributions));
  const archived = sortGoalsForDisplay(
    goals.filter((g) => g.archivedAt),
    contributions,
  );

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
          ? `${active.length} in progress${reached.length > 0 ? ` · ${reached.length} reached` : ''}${
              archived.length > 0 ? ` · ${archived.length} archived` : ''
            }`
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
          {active.length === 0 && reached.length > 0 && (
            <ThemedText themeColor="textSecondary">
              Every goal is reached. Brilliant! Add a new one whenever you’re ready.
            </ThemedText>
          )}
          {active.length === 0 && reached.length === 0 && (
            <ThemedText themeColor="textSecondary">
              All your goals are archived. Add a new one whenever you’re ready.
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

          {/* Finished goals are kept out of the way, like a trophy shelf. */}
          {reached.length > 0 && (
            <Shelf
              title={`Reached 🎉 (${reached.length})`}
              label={`Reached goals, ${reached.length}`}
              what="reached goals"
              open={showReached}
              onToggle={() => setShowReached((value) => !value)}>
              {reached.map((goal, i) => card(goal, active.length + i))}
            </Shelf>
          )}
          {archived.length > 0 && (
            <Shelf
              title={`Archived (${archived.length})`}
              label={`Archived goals, ${archived.length}`}
              what="archived goals"
              open={showArchived}
              onToggle={() => setShowArchived((value) => !value)}>
              {archived.map((goal, i) => card(goal, active.length + reached.length + i))}
            </Shelf>
          )}
        </>
      )}
    </Screen>
  );
}

type ShelfProps = {
  title: string;
  label: string;
  /** For the hint: "Shows your archived goals". */
  what: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
};

/** A collapsible section of the goals list, closed to start with. */
function Shelf({ title, label, what, open, onToggle, children }: ShelfProps) {
  return (
    <View style={styles.shelf}>
      <Pressable
        onPress={onToggle}
        accessibilityRole="button"
        aria-expanded={open}
        accessibilityLabel={label}
        accessibilityHint={open ? `Hides your ${what}` : `Shows your ${what}`}
        style={({ pressed }) => [styles.shelfHeader, pressed && styles.pressed]}>
        <ThemedText type="heading" style={styles.flex}>
          {title}
        </ThemedText>
        <ThemedText type="smallBold" themeColor="tint" importantForAccessibility="no">
          {open ? 'Hide ▲' : 'Show ▼'}
        </ThemedText>
      </Pressable>
      {open && children}
    </View>
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
