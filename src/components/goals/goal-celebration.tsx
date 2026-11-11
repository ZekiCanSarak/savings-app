import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { MinTapSize, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type GoalCelebrationProps = {
  goalName: string;
  /** e.g. '£900.00' */
  targetText: string;
  onDismiss: () => void;
};

/** "Goal reached!" banner shown on the detail screen the moment a goal hits 100%. */
export function GoalCelebration({ goalName, targetText, onDismiss }: GoalCelebrationProps) {
  const theme = useTheme();

  return (
    // ZoomIn respects the phone's "reduce motion" setting automatically.
    <Animated.View entering={ZoomIn.springify()}>
      <View
        accessibilityRole="alert"
        accessibilityLiveRegion="assertive"
        style={[styles.card, { backgroundColor: theme.tint }]}>
        <ThemedText type="emojiLarge" importantForAccessibility="no">🎉</ThemedText>
        <ThemedText type="title" style={[styles.center, { color: theme.onTint }]}>
          Goal reached!
        </ThemedText>
        <ThemedText style={[styles.center, { color: theme.onTint }]}>
          You saved {targetText} for {goalName}. That took real discipline. Well done!
        </ThemedText>
        <Pressable
          accessibilityRole="button"
          onPress={onDismiss}
          hitSlop={8}
          style={({ pressed }) => [
            styles.dismiss,
            { borderColor: theme.onTint },
            pressed && styles.pressed,
          ]}>
          <ThemedText type="smallBold" style={{ color: theme.onTint }}>
            Thanks!
          </ThemedText>
        </Pressable>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.four,
    borderRadius: Radius.card,
    borderCurve: 'continuous',
  },
  center: {
    textAlign: 'center',
  },
  dismiss: {
    marginTop: Spacing.two,
    minHeight: MinTapSize,
    paddingHorizontal: Spacing.four,
    borderRadius: Radius.control,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
});
