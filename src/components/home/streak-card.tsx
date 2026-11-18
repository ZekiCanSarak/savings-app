import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import type { Contribution } from '@/types/models';
import { parseIsoDate, todayIsoDate } from '@/utils/dates';
import { currentStreak } from '@/utils/streaks';

type StreakCardProps = {
  contributions: Contribution[];
  index?: number;
};

/** "🔥 4 months in a row" on Home. Hidden until there's a streak. */
export function StreakCard({ contributions, index }: StreakCardProps) {
  const streak = currentStreak(contributions);
  if (streak.months === 0) return null;

  const months = `${streak.months} month${streak.months === 1 ? '' : 's'}`;
  const monthName = parseIsoDate(todayIsoDate()).toLocaleDateString('en-GB', { month: 'long' });

  return (
    <Card title={`🔥 ${months} in a row`} index={index}>
      <ThemedText themeColor="textSecondary">
        {streak.includesThisMonth
          ? streak.months === 1
            ? 'You’ve saved something this month. Save again next month to start a streak.'
            : 'You’ve saved something every month. Keep it going!'
          : `Save something in ${monthName} to make it ${streak.months + 1}.`}
      </ThemedText>
    </Card>
  );
}
