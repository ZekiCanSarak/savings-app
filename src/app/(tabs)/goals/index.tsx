import { router } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GoalCard } from '@/components/goals/goal-card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
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
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.header}>
            <ThemedText type="subtitle">Goals</ThemedText>
            {goals.length > 0 && (
              <View>
                <Button title="+ New goal" onPress={openNewGoal} />
              </View>
            )}
          </View>

          {goals.length === 0 ? (
            <EmptyState />
          ) : (
            sortedGoals.map((goal) => (
              <GoalCard
                key={goal.id}
                goal={goal}
                currency={currency}
                saved={totalSaved(goal.id, contributions)}
                remaining={amountRemaining(goal, contributions)}
                percent={percentComplete(goal, contributions)}
                onPress={() => router.push({ pathname: '/goals/[id]', params: { id: goal.id } })}
              />
            ))
          )}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

function EmptyState() {
  return (
    <ThemedView type="backgroundElement" style={styles.empty}>
      <ThemedText style={styles.emptyEmoji}>🌱</ThemedText>
      <ThemedText type="smallBold" style={styles.emptyTitle}>
        No goals yet
      </ThemedText>
      <ThemedText themeColor="textSecondary" style={styles.center}>
        What are you saving for? A new laptop, a holiday, a rainy-day fund? Add your first goal and
        watch it grow.
      </ThemedText>
      <View style={styles.emptyButton}>
        <Button title="Create your first goal" onPress={openNewGoal} />
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  safeArea: {
    flex: 1,
    maxWidth: MaxContentWidth,
  },
  content: {
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
    paddingBottom: BottomTabInset + Spacing.four,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
    marginBottom: Spacing.two,
  },
  empty: {
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.four,
    borderRadius: Spacing.four,
    marginTop: Spacing.four,
  },
  emptyEmoji: {
    fontSize: 56,
    lineHeight: 68,
  },
  emptyTitle: {
    fontSize: 20,
    lineHeight: 26,
  },
  center: {
    textAlign: 'center',
  },
  emptyButton: {
    alignSelf: 'stretch',
    marginTop: Spacing.two,
  },
});
