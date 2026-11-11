import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { IsoDate } from '@/types/models';
import { addDays, formatRelativeDay } from '@/utils/dates';

type DayStepperProps = {
  label: string;
  value: IsoDate;
  onChange: (date: IsoDate) => void;
  /** Latest allowed day (inclusive). */
  max: IsoDate;
  /** Earliest allowed day (inclusive). */
  min: IsoDate;
};

/** Pick a day with ‹ › buttons. Shows "Today" / "Yesterday" / "11 Nov 2026". */
export function DayStepper({ label, value, onChange, max, min }: DayStepperProps) {
  const theme = useTheme();
  const canGoBack = value > min;
  const canGoForward = value < max;

  return (
    <View style={styles.wrapper}>
      <ThemedText type="smallBold">{label}</ThemedText>
      <View
        style={[
          styles.stepper,
          { backgroundColor: theme.backgroundElement, borderColor: theme.border },
        ]}>
        <StepButton
          label="‹"
          accessibilityLabel="Previous day"
          disabled={!canGoBack}
          onPress={() => onChange(addDays(value, -1))}
        />
        <ThemedText style={styles.value} accessibilityLiveRegion="polite">
          {formatRelativeDay(value)}
        </ThemedText>
        <StepButton
          label="›"
          accessibilityLabel="Next day"
          disabled={!canGoForward}
          onPress={() => onChange(addDays(value, 1))}
        />
      </View>
    </View>
  );
}

function StepButton({
  label,
  accessibilityLabel,
  disabled,
  onPress,
}: {
  label: string;
  accessibilityLabel: string;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => [styles.stepButton, (pressed || disabled) && styles.dim]}>
      <ThemedText style={styles.stepLabel}>{label}</ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: Spacing.one,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: Spacing.three,
    minHeight: 50,
  },
  stepButton: {
    width: 56,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepLabel: {
    fontSize: 28,
    lineHeight: 32,
  },
  value: {
    flex: 1,
    textAlign: 'center',
    fontWeight: 600,
  },
  dim: {
    opacity: 0.35,
  },
});
