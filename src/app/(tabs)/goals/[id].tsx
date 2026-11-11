import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Alert, Platform, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { ProgressBar } from '@/components/ui/progress-bar';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import {
  useAppActions,
  useCurrency,
  useGoal,
  useGoalContributions,
  useGoalProgress,
} from '@/hooks/use-app-data';
import { formatDate, formatMonthYear, toIsoDate } from '@/utils/dates';
import { formatMoney } from '@/utils/money';

/** Leaves this screen; falls back to the list if there's nothing to go back to (e.g. web refresh). */
function goBackToList() {
  if (router.canGoBack()) router.back();
  else router.replace('/goals');
}

export default function GoalDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const goal = useGoal(id);
  const progress = useGoalProgress(id);
  const history = useGoalContributions(id);
  const currency = useCurrency();
  const { deleteGoal } = useAppActions();

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

  function confirmDelete() {
    if (!goal) return;
    const extra =
      history.length > 0
        ? ` This also deletes the ${history.length} saving${history.length === 1 ? '' : 's'} you logged for it.`
        : '';
    const message = `“${goal.name}” will be removed from this phone.${extra} This can’t be undone.`;
    const remove = () => {
      // Leave the screen first, so it doesn't briefly show "not found".
      goBackToList();
      deleteGoal(goal.id);
    };
    if (Platform.OS === 'web') {
      // Alert buttons don't work on web.
      if (window.confirm(`Delete this goal? ${message}`)) remove();
      return;
    }
    Alert.alert('Delete this goal?', message, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: remove },
    ]);
  }

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ title: goal.name }} />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.content}>
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
              ? 'You’ve reached this goal — well done! 🎉'
              : `You have ${money(progress.remaining)} left to save.`}
          </ThemedText>
        </ThemedView>

        {!complete && progress.monthlyNeeded !== null && goal.targetDate && (
          <ThemedView type="backgroundElement" style={styles.card}>
            <ThemedText type="smallBold">To stay on track</ThemedText>
            <ThemedText themeColor="textSecondary">
              Save about {money(progress.monthlyNeeded)} a month to reach it by{' '}
              {formatMonthYear(goal.targetDate)}.
            </ThemedText>
          </ThemedView>
        )}

        <ThemedView type="backgroundElement" style={styles.card}>
          <ThemedText type="smallBold">Savings history</ThemedText>
          {history.length === 0 ? (
            <ThemedText type="small" themeColor="textSecondary">
              Nothing logged yet. Logging money you’ve saved is coming soon.
            </ThemedText>
          ) : (
            history.map((entry) => (
              <View key={entry.id} style={styles.row}>
                <View style={styles.flex}>
                  <ThemedText type="small">{formatDate(entry.date)}</ThemedText>
                  {entry.note ? (
                    <ThemedText type="small" themeColor="textSecondary">
                      {entry.note}
                    </ThemedText>
                  ) : null}
                </View>
                <ThemedText type="smallBold">+{money(entry.amount)}</ThemedText>
              </View>
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
          <Button title="Delete goal" variant="danger" onPress={confirmDelete} />
        </View>
      </ScrollView>
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
  flex: {
    flex: 1,
  },
  actions: {
    gap: Spacing.two,
    marginTop: Spacing.two,
  },
});
