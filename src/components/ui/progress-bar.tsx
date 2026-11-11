import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { useTheme } from '@/hooks/use-theme';

type ProgressBarProps = {
  /** 0–100. */
  percent: number;
  height?: number;
  /** What the bar measures, read out by screen readers. */
  accessibilityLabel?: string;
};

/**
 * A rounded progress bar in the chart green on a lighter green track. It fills
 * smoothly when it appears and when the value changes (instantly if the phone's
 * "reduce motion" setting is on).
 */
export function ProgressBar({ percent, height = 10, accessibilityLabel }: ProgressBarProps) {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  const clamped = Math.max(0, Math.min(100, percent));
  const width = useSharedValue(reduceMotion ? clamped : 0);

  useEffect(() => {
    width.set(
      reduceMotion
        ? clamped
        : withTiming(clamped, { duration: 700, easing: Easing.out(Easing.cubic) }),
    );
  }, [clamped, reduceMotion, width]);

  const fillStyle = useAnimatedStyle(() => ({ width: `${width.get()}%` }));

  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min: 0, max: 100, now: clamped, text: `${Math.round(clamped)}%` }}
      style={[
        styles.track,
        { height, borderRadius: height / 2, backgroundColor: theme.chartTrack },
      ]}>
      {clamped > 0 && (
        <Animated.View
          style={[
            styles.fill,
            { borderRadius: height / 2, backgroundColor: theme.chart, minWidth: height },
            fillStyle,
          ]}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    width: '100%',
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
  },
});
