import { Pressable, StyleSheet, View } from 'react-native';

import { GoalAvatar } from '@/components/goals/goal-avatar';
import { ThemedText } from '@/components/themed-text';
import { FadeInView } from '@/components/ui/fade-in-view';
import { ProgressBar } from '@/components/ui/progress-bar';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { CurrencyCode, SavingsGoal } from '@/types/models';
import { formatMonthYear, todayIsoDate } from '@/utils/dates';
import { formatMoney } from '@/utils/money';

type GoalCardProps = {
  goal: SavingsGoal;
  saved: number;
  remaining: number;
  percent: number;
  currency: CurrencyCode;
  onPress: () => void;
  /** Position in the list, used to stagger the fade-in. */
  index?: number;
};

export function GoalCard({ goal, saved, remaining, percent, currency, onPress, index = 0 }: GoalCardProps) {
  const theme = useTheme();
  const complete = remaining === 0;
  const savedText = formatMoney(saved, currency);
  const targetText = formatMoney(goal.targetAmount, currency);
  const remainingText = formatMoney(remaining, currency);
  const overdue = !complete && goal.targetDate !== null && goal.targetDate < todayIsoDate();
  const dateLabel = goal.targetDate
    ? overdue
      ? `Target date passed (${formatMonthYear(goal.targetDate)})`
      : `by ${formatMonthYear(goal.targetDate)}`
    : null;
  const dateText = dateLabel ? `, ${dateLabel}` : '';

  return (
    <FadeInView index={index}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${goal.name}${dateText}. ${savedText} saved of ${targetText}, ${percent}%. ${
          complete ? 'Goal reached.' : `${remainingText} left.`
        }`}
        accessibilityHint="Opens goal details"
        onPress={onPress}
        style={({ pressed }) => [
          styles.card,
          { backgroundColor: theme.backgroundElement },
          pressed && styles.pressed,
        ]}>
        <View style={styles.header}>
          <GoalAvatar
            emoji={goal.emoji}
            image={goal.image}
            size={48}
            radius={Radius.control}
            backgroundColor={theme.background}
          />
          <View style={styles.titleBlock}>
            <ThemedText type="heading" numberOfLines={2}>
              {goal.name}
            </ThemedText>
            {dateLabel ? (
              <ThemedText type="small" themeColor={overdue ? 'danger' : 'textSecondary'}>
                {dateLabel}
              </ThemedText>
            ) : null}
          </View>
          <ThemedText type="smallBold" themeColor={complete ? 'tint' : 'textSecondary'}>
            {percent}%
          </ThemedText>
        </View>

        <ProgressBar percent={percent} />

        <View style={styles.footer}>
          <ThemedText type="small">
            <ThemedText type="smallBold">{savedText}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {' '}
              of {targetText}
            </ThemedText>
          </ThemedText>
          <ThemedText type="small" themeColor={complete ? 'tint' : 'textSecondary'}>
            {complete ? 'Goal reached 🎉' : `${remainingText} left`}
          </ThemedText>
        </View>
      </Pressable>
    </FadeInView>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: Spacing.three,
    padding: Spacing.three + Spacing.one,
    borderRadius: Radius.card,
    borderCurve: 'continuous',
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.99 }],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  titleBlock: {
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
});
