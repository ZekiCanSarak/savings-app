import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AdviceNote } from '@/components/budget/advice-note';
import { TipCard } from '@/components/budget/tip-card';
import { GoalProgressBars } from '@/components/charts/goal-progress-bars';
import { SavingsSummary } from '@/components/home/savings-summary';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useContributions, useCurrency, useGoals, useProfile } from '@/hooks/use-app-data';
import { incomeLevel, tipOfTheDay } from '@/utils/budget';
import { summariseGoals } from '@/utils/charts';

export default function HomeScreen() {
  const profile = useProfile();
  const goals = useGoals();
  const contributions = useContributions();
  const currency = useCurrency();
  const summary = summariseGoals(goals, contributions);
  // Without an income we can't pick income-specific tips, so use the middle set.
  const tip = tipOfTheDay(
    profile.monthlyIncome === null ? 'middle' : incomeLevel(profile.monthlyIncome, currency),
  );

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <ScrollView contentContainerStyle={styles.content}>
          <ThemedText type="subtitle">Hi {profile.name} 👋</ThemedText>

          {goals.length === 0 ? (
            <ThemedView type="backgroundElement" style={styles.card}>
              <ThemedText style={styles.emptyEmoji}>🌱</ThemedText>
              <ThemedText type="smallBold" style={styles.emptyTitle}>
                Your savings will show up here
              </ThemedText>
              <ThemedText themeColor="textSecondary" style={styles.center}>
                Create a goal to start tracking how much you’ve saved and how close you are.
              </ThemedText>
              <View style={styles.stretch}>
                <Button title="Create a goal" onPress={() => router.push('/goal-editor')} />
              </View>
            </ThemedView>
          ) : (
            <>
              <SavingsSummary summary={summary} goalCount={goals.length} currency={currency} />

              <ThemedView type="backgroundElement" style={styles.card}>
                <View style={styles.cardHeader}>
                  <ThemedText type="smallBold">Progress by goal</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    Most complete first
                  </ThemedText>
                </View>
                {summary.totalSaved === 0 && (
                  <ThemedText type="small" themeColor="textSecondary">
                    Nothing saved yet. Open a goal and tap “Add money” to fill these bars.
                  </ThemedText>
                )}
                <GoalProgressBars
                  rows={summary.ranked}
                  currency={currency}
                  onPressGoal={(goal) =>
                    router.push({ pathname: '/goals/[id]', params: { id: goal.id } })
                  }
                />
              </ThemedView>
            </>
          )}

          {tip && (
            <ThemedView type="backgroundElement" style={styles.card}>
              <View style={styles.tipHeader}>
                <ThemedText type="smallBold">Tip of the day</ThemedText>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="See more tips on the Budget tab"
                  onPress={() => router.navigate('/budget')}
                  hitSlop={10}
                  style={({ pressed }) => pressed && styles.pressed}>
                  <ThemedText type="small" themeColor="tint">
                    More tips
                  </ThemedText>
                </Pressable>
              </View>
              <TipCard tip={tip} />
              <AdviceNote short />
            </ThemedView>
          )}
        </ScrollView>
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
  card: {
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Spacing.four,
  },
  cardHeader: {
    gap: Spacing.half,
  },
  tipHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pressed: {
    opacity: 0.6,
  },
  emptyEmoji: {
    fontSize: 48,
    lineHeight: 58,
    textAlign: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    lineHeight: 24,
    textAlign: 'center',
  },
  center: {
    textAlign: 'center',
  },
  stretch: {
    alignSelf: 'stretch',
  },
});
