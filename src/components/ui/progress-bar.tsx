import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

type ProgressBarProps = {
  /** 0–100. */
  percent: number;
  height?: number;
  /** What the bar measures, read out by screen readers. */
  accessibilityLabel?: string;
};

export function ProgressBar({ percent, height = 8, accessibilityLabel }: ProgressBarProps) {
  const theme = useTheme();
  const clamped = Math.max(0, Math.min(100, percent));

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min: 0, max: 100, now: clamped }}
      style={[
        styles.track,
        { height, borderRadius: height / 2, backgroundColor: theme.backgroundSelected },
      ]}>
      <View
        style={[
          styles.fill,
          { width: `${clamped}%`, borderRadius: height / 2, backgroundColor: theme.tint },
        ]}
      />
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
