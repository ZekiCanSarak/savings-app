import { router } from 'expo-router';

import { QuickSave } from '@/components/goals/quick-save';
import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { TextButton } from '@/components/ui/text-button';
import type { Contribution, SavingsGoal } from '@/types/models';
import { amountRemaining } from '@/utils/goals';
import { goalsNeedingAttention } from '@/utils/reminders';

type QuickSaveCardProps = {
  /** Active (not archived) goals. */
  goals: SavingsGoal[];
  contributions: Contribution[];
  index?: number;
};

/** Home: one-tap saving into the goal that needs it most (the same one reminders pick). */
export function QuickSaveCard({ goals, contributions, index }: QuickSaveCardProps) {
  const goal = goalsNeedingAttention(goals, contributions)[0];
  if (!goal) return null;
  const remaining = amountRemaining(goal, contributions);

  return (
    <Card
      title="Quick save"
      subtitle="Put a little aside in one tap"
      index={index}
      action={
        <TextButton
          title="Open"
          accessibilityHint={`Opens ${goal.name}`}
          onPress={() => router.push({ pathname: '/goals/[id]', params: { id: goal.id } })}
        />
      }>
      <ThemedText>
        <ThemedText importantForAccessibility="no">{goal.emoji} </ThemedText>
        <ThemedText type="defaultBold">{goal.name}</ThemedText>
      </ThemedText>
      <QuickSave
        goalId={goal.id}
        goalName={goal.name}
        remaining={remaining}
        target={goal.targetAmount}
        label="Add to it"
      />
    </Card>
  );
}
