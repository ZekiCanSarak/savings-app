import { Pressable, StyleSheet, Switch, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { IsoDate } from '@/types/models';
import {
  addMonths,
  compareYearMonth,
  endOfMonthIsoDate,
  formatMonthYear,
  todayIsoDate,
  yearMonthOf,
} from '@/utils/dates';

/** How far ahead a target date can be set. */
const MAX_MONTHS_AHEAD = 12 * 30;
/** Where the picker starts when the user switches a target date on. */
const DEFAULT_MONTHS_AHEAD = 6;

type MonthPickerProps = {
  /** Last day of the chosen month, or null for "no target date". */
  value: IsoDate | null;
  onChange: (date: IsoDate | null) => void;
  error?: string | null;
};

/**
 * Optional "save by" month. Goals are aimed at a month ("by March 2027"), so
 * we store the last day of that month.
 */
export function MonthPicker({ value, onChange, error }: MonthPickerProps) {
  const theme = useTheme();
  const thisMonth = yearMonthOf(todayIsoDate());
  const lastMonth = addMonths(thisMonth, MAX_MONTHS_AHEAD);
  const selected = value ? yearMonthOf(value) : null;

  const canGoBack = selected !== null && compareYearMonth(selected, thisMonth) > 0;
  const canGoForward = selected !== null && compareYearMonth(selected, lastMonth) < 0;

  function step(count: number) {
    if (!selected) return;
    // A goal whose date has passed: the first step forward jumps straight to this month.
    const inPast = compareYearMonth(selected, thisMonth) < 0;
    const next = inPast && count > 0 ? thisMonth : addMonths(selected, count);
    onChange(endOfMonthIsoDate(next));
  }

  return (
    <View style={styles.wrapper}>
      <View style={styles.toggleRow}>
        <View style={styles.flex}>
          <ThemedText type="smallBold">Target date</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Optional — we’ll work out how much to save each month.
          </ThemedText>
        </View>
        <Switch
          accessibilityLabel="Set a target date"
          value={value !== null}
          onValueChange={(on) =>
            onChange(on ? endOfMonthIsoDate(addMonths(thisMonth, DEFAULT_MONTHS_AHEAD)) : null)
          }
          trackColor={{ true: theme.tint }}
        />
      </View>

      {value !== null && (
        <View
          style={[
            styles.stepper,
            { backgroundColor: theme.background, borderColor: error ? theme.danger : theme.border },
          ]}>
          <StepButton label="‹" accessibilityLabel="Previous month" disabled={!canGoBack} onPress={() => step(-1)} />
          <ThemedText style={styles.monthText} accessibilityLiveRegion="polite">
            {formatMonthYear(value)}
          </ThemedText>
          <StepButton label="›" accessibilityLabel="Next month" disabled={!canGoForward} onPress={() => step(1)} />
        </View>
      )}

      {error ? (
        <ThemedText type="small" themeColor="danger" accessibilityLiveRegion="polite">
          {error}
        </ThemedText>
      ) : null}
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
    gap: Spacing.two,
  },
  flex: {
    flex: 1,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: Radius.control,
    minHeight: 52,
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
  monthText: {
    flex: 1,
    textAlign: 'center',
    fontWeight: 600,
  },
  dim: {
    opacity: 0.35,
  },
});
