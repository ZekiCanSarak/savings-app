import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Spacing } from '@/constants/theme';
import {
  useAppActions,
  useContributions,
  useCurrency,
  useGoals,
  useYearReviewDismissed,
} from '@/hooks/use-app-data';
import { formatMoney } from '@/utils/money';
import { reviewYearToShow, yearReview } from '@/utils/year-review';

type YearReviewCardProps = {
  index?: number;
};

/** In December (this year) and January (last year), invites the user to look back. */
export function YearReviewCard({ index }: YearReviewCardProps) {
  const goals = useGoals();
  const contributions = useContributions();
  const currency = useCurrency();
  const dismissed = useYearReviewDismissed();
  const { dismissYearReview } = useAppActions();

  const year = reviewYearToShow();
  if (year === null || dismissed === year) return null;
  const review = yearReview(year, goals, contributions);
  if (review.savingCount === 0) return null;

  return (
    <Card
      title={`Your ${year} in review 🎉`}
      subtitle={`You saved ${formatMoney(Math.max(0, review.netSaved), currency)} this year. See your highlights.`}
      index={index}>
      <View style={styles.buttonRow}>
        <View style={styles.flex}>
          <Button title="Not now" variant="secondary" onPress={() => dismissYearReview(year)} />
        </View>
        <View style={styles.flex}>
          <Button
            title="Take a look"
            onPress={() => router.push({ pathname: '/year-review', params: { year: String(year) } })}
          />
        </View>
      </View>
      <ThemedText type="caption" themeColor="textSecondary">
        You can open it any time from Settings.
      </ThemedText>
    </Card>
  );
}

const styles = StyleSheet.create({
  buttonRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  flex: {
    flex: 1,
  },
});
