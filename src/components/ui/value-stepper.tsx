import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type ValueStepperProps = {
  label: string;
  /** What's shown between the arrows, e.g. '18:00' or '1st'. */
  valueText: string;
  onPrevious: () => void;
  onNext: () => void;
  canGoPrevious?: boolean;
  canGoNext?: boolean;
  /** Spoken names for the arrow buttons, e.g. 'Earlier' / 'Later'. */
  previousLabel?: string;
  nextLabel?: string;
};

/** A value with ‹ › buttons either side. */
export function ValueStepper({
  label,
  valueText,
  onPrevious,
  onNext,
  canGoPrevious = true,
  canGoNext = true,
  previousLabel = 'Previous',
  nextLabel = 'Next',
}: ValueStepperProps) {
  const theme = useTheme();
  return (
    <View style={styles.wrapper}>
      <ThemedText type="smallBold">{label}</ThemedText>
      <View
        style={[
          styles.stepper,
          { backgroundColor: theme.backgroundElement, borderColor: theme.border },
        ]}>
        <StepButton label="‹" accessibilityLabel={`${previousLabel} (${label})`} disabled={!canGoPrevious} onPress={onPrevious} />
        <ThemedText style={styles.value} accessibilityLiveRegion="polite">
          {valueText}
        </ThemedText>
        <StepButton label="›" accessibilityLabel={`${nextLabel} (${label})`} disabled={!canGoNext} onPress={onNext} />
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
