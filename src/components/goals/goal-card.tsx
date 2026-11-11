import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ProgressBar } from '@/components/ui/progress-bar';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { CurrencyCode, SavingsGoal } from '@/types/models';
import { formatMonthYear } from '@/utils/dates';
import { formatMoney } from '@/utils/money';

type GoalCardProps = {
  goal: SavingsGoal;
  saved: number;
  remaining: number;
  percent: number;
  currency: CurrencyCode;
  onPress: () => void;
};

export function GoalCard({ goal, saved, remaining, percent, currency, onPress }: GoalCardProps) {
  const theme = useTheme();
  const complete = remaining === 0;
  const savedText = formatMoney(saved, currency);
  const targetText = formatMoney(goal.targetAmount, currency);
  const remainingText = formatMoney(remaining, currency);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${goal.name}. ${savedText} saved of ${targetText}. ${
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
        <View style={[styles.emojiBubble, { backgroundColor: theme.background }]}>
          <ThemedText style={styles.emoji}>{goal.emoji}</ThemedText>
        </View>
        <View style={styles.titleBlock}>
          <ThemedText type="smallBold" style={styles.name} numberOfLines={2}>
            {goal.name}
          </ThemedText>
          {goal.targetDate ? (
            <ThemedText type="small" themeColor="textSecondary">
              by {formatMonthYear(goal.targetDate)}
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
  );
}

const styles = StyleSheet.create({
  card: {
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Spacing.four,
  },
  pressed: {
    opacity: 0.75,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  emojiBubble: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: {
    fontSize: 26,
    lineHeight: 32,
  },
  titleBlock: {
    flex: 1,
  },
  name: {
    fontSize: 17,
    lineHeight: 22,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
});
