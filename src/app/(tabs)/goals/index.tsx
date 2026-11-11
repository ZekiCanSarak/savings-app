import { router } from 'expo-router';

import { GoalCard } from '@/components/goals/goal-card';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Screen } from '@/components/ui/screen';
import { useContributions, useCurrency, useGoals } from '@/hooks/use-app-data';
import { amountRemaining, percentComplete, sortGoalsForDisplay, totalSaved } from '@/utils/goals';

function openNewGoal() {
  router.push('/goal-editor');
}

export default function GoalsScreen() {
  const goals = useGoals();
  const contributions = useContributions();
  const currency = useCurrency();
  const sortedGoals = sortGoalsForDisplay(goals, contributions);

  return (
    <Screen
      title="Goals"
      subtitle={goals.length > 0 ? `${goals.length} goal${goals.length === 1 ? '' : 's'}` : undefined}
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
        sortedGoals.map((goal, index) => (
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
        ))
      )}
    </Screen>
  );
}
