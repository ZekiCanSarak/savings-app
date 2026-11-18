import { router, useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ModalHeader } from '@/components/ui/modal-header';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useContributions, useCurrency, useGoals } from '@/hooks/use-app-data';
import { useTheme } from '@/hooks/use-theme';
import { formatDate } from '@/utils/dates';
import { formatMoney } from '@/utils/money';
import { defaultReviewYear, yearReview } from '@/utils/year-review';

function close() {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}

/** `month` is 0–11, as in YearMonth. */
const monthName = (year: number, month: number) =>
  new Date(year, month, 1).toLocaleDateString('en-GB', { month: 'long' });

/** A year's saving at a glance. Opened with `?year=2026` (defaults to this year, or last year in January). */
export default function YearReviewScreen() {
  const params = useLocalSearchParams<{ year?: string }>();
  const parsed = Number(params.year);
  const year = Number.isInteger(parsed) && parsed > 2000 && parsed < 3000 ? parsed : defaultReviewYear();
  const goals = useGoals();
  const contributions = useContributions();
  const currency = useCurrency();
  const theme = useTheme();
  const onAccent = { color: theme.onTint };
  const review = yearReview(year, goals, contributions);
  const money = (amount: number) => formatMoney(amount, currency);
  const nothing = review.savingCount === 0 && review.goalsReached.length === 0;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ModalHeader title={`Your ${year}`} onClose={close} closeLabel="Close" />
        <ScrollView contentContainerStyle={styles.content}>
          {nothing ? (
            <Card title={`Nothing logged in ${year}`} index={0}>
              <ThemedText themeColor="textSecondary">
                Once you add money to your goals, your year in review will show how much you saved,
                the goals you reached and your best month.
              </ThemedText>
            </Card>
          ) : (
            <>
              <Card tone="accent" index={0}>
                <View accessible accessibilityLabel={`In ${year} you saved ${money(review.netSaved)}`}>
                  <ThemedText type="small" style={onAccent}>
                    In {year} you saved
                  </ThemedText>
                  <ThemedText type="hero" style={onAccent} adjustsFontSizeToFit numberOfLines={1}>
                    {money(Math.max(0, review.netSaved))}
                  </ThemedText>
                  <ThemedText type="small" style={onAccent}>
                    across {review.savingCount} saving{review.savingCount === 1 ? '' : 's'} 🎉
                  </ThemedText>
                </View>
              </Card>

              <View style={styles.tiles}>
                <Stat label="Goals reached" value={String(review.goalsReached.length)} />
                <Stat label="New goals" value={String(review.goalsStarted)} />
                <Stat
                  label="Longest streak"
                  value={`${review.longestStreak} month${review.longestStreak === 1 ? '' : 's'}`}
                />
              </View>

              {review.bestMonth && (
                <Card title="Best month" index={2}>
                  <ThemedText>
                    <ThemedText type="defaultBold">
                      {monthName(review.bestMonth.month.year, review.bestMonth.month.month)}
                    </ThemedText>
                    , when you saved {money(review.bestMonth.saved)}.
                  </ThemedText>
                </Card>
              )}

              {review.goalsReached.length > 0 && (
                <Card title="Goals you reached" index={3}>
                  {review.goalsReached.map(({ goal, date }) => (
                    <View
                      key={goal.id}
                      style={styles.goalRow}
                      accessible
                      accessibilityLabel={`${goal.name}, ${money(goal.targetAmount)}, reached ${formatDate(date)}`}>
                      <ThemedText type="emoji" importantForAccessibility="no">
                        {goal.emoji}
                      </ThemedText>
                      <View style={styles.flex}>
                        <ThemedText type="defaultBold">{goal.name}</ThemedText>
                        <ThemedText type="small" themeColor="textSecondary">
                          {money(goal.targetAmount)} · reached {formatDate(date)}
                        </ThemedText>
                      </View>
                    </View>
                  ))}
                </Card>
              )}
            </>
          )}
        </ScrollView>
        <View style={styles.footer}>
          <Button title="Close" variant="secondary" onPress={close} />
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card style={styles.tile} index={1}>
      <View accessible accessibilityLabel={`${label}: ${value}`}>
        <ThemedText type="small" themeColor="textSecondary">
          {label}
        </ThemedText>
        <ThemedText type="heading">{value}</ThemedText>
      </View>
    </Card>
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
  flex: {
    flex: 1,
  },
  content: {
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.four,
  },
  tiles: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.three,
  },
  tile: {
    flexGrow: 1,
    flexBasis: 140,
  },
  goalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  footer: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
  },
});
