import { StyleSheet, View } from 'react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { TextButton } from '@/components/ui/text-button';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { MILESTONE_INFO, type Milestone } from '@/utils/milestones';

type MilestoneBannerProps = {
  milestone: Milestone;
  goalName: string;
  /** e.g. "£250 of £500" */
  progressText: string;
  onShare: () => void;
  onDismiss: () => void;
};

/** A small "Halfway there!" moment at 25, 50 and 75% (100% has the full GoalCelebration). */
export function MilestoneBanner({
  milestone,
  goalName,
  progressText,
  onShare,
  onDismiss,
}: MilestoneBannerProps) {
  const theme = useTheme();
  const info = MILESTONE_INFO[milestone];
  return (
    // ZoomIn respects the phone's "reduce motion" setting automatically.
    <Animated.View entering={ZoomIn.springify()}>
      <View
        accessibilityRole="alert"
        accessibilityLiveRegion="polite"
        style={[
          styles.card,
          { backgroundColor: theme.backgroundElement, borderColor: theme.tint },
        ]}>
        <View style={styles.header}>
          <ThemedText type="emoji" importantForAccessibility="no">
            {info.emoji}
          </ThemedText>
          <View style={styles.text}>
            <ThemedText type="heading">{info.title}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {progressText} saved for {goalName}. Keep going!
            </ThemedText>
          </View>
        </View>
        <View style={styles.actions}>
          <View style={styles.share}>
            <Button
              title="Share my progress"
              variant="secondary"
              compact
              accessibilityHint="Makes an image of your progress to share"
              onPress={onShare}
            />
          </View>
          <TextButton title="Nice!" onPress={onDismiss} />
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: Spacing.three,
    padding: Spacing.three + Spacing.one,
    borderRadius: Radius.card,
    borderCurve: 'continuous',
    borderWidth: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  text: {
    flex: 1,
    gap: Spacing.half,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  share: {
    flex: 1,
  },
});
