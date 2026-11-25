import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { TextButton } from '@/components/ui/text-button';
import { MinTapSize, Radius, Spacing } from '@/constants/theme';
import { useAppActions, useCurrency } from '@/hooks/use-app-data';
import { useTheme } from '@/hooks/use-theme';
import { todayIsoDate } from '@/utils/dates';
import { formatMoney } from '@/utils/money';
import { QUICK_SAVE_NOTE, quickSaveAmounts } from '@/utils/quick-save';

type QuickSaveProps = {
  goalId: string;
  goalName: string;
  /** What's left to save, in minor units. */
  remaining: number;
  /** Shown before the buttons, e.g. "Quick save". */
  label?: string;
  /** Extra text after "Saved £10", e.g. a milestone ("You're halfway! 🎉"). */
  savedMessage?: (amount: number) => string | null;
};

/** How long "Saved £10 · Undo" stays before the buttons come back. */
const UNDO_MS = 6000;

/**
 * One-tap saving: +£5 / +£10 / +£20 buttons that log a saving straight away
 * (dated today), then offer Undo for a few seconds in case of a mis-tap.
 */
export function QuickSave({ goalId, goalName, remaining, label = 'Quick save', savedMessage }: QuickSaveProps) {
  const theme = useTheme();
  const currency = useCurrency();
  const { addContribution, deleteContribution } = useAppActions();
  const [last, setLast] = useState<{ id: string; amount: number; extra: string | null } | null>(null);

  useEffect(() => {
    if (!last) return;
    const timer = setTimeout(() => setLast(null), UNDO_MS);
    return () => clearTimeout(timer);
  }, [last]);

  const money = (amount: number) => formatMoney(amount, currency);
  const amounts = quickSaveAmounts(remaining, currency);

  if (last) {
    return (
      <View style={[styles.saved, { backgroundColor: theme.background, borderColor: theme.border }]}>
        <ThemedText style={styles.savedText} accessibilityLiveRegion="polite">
          ✅ Saved <ThemedText type="defaultBold">{money(last.amount)}</ThemedText>
          {last.extra ? ` · ${last.extra}` : ''}
        </ThemedText>
        <TextButton
          title="Undo"
          accessibilityHint={`Removes the ${money(last.amount)} you just saved`}
          onPress={() => {
            deleteContribution(last.id);
            setLast(null);
          }}
        />
      </View>
    );
  }

  if (amounts.length === 0) return null;

  function save(amount: number) {
    const id = addContribution({ goalId, amount, date: todayIsoDate(), note: QUICK_SAVE_NOTE });
    setLast({ id, amount, extra: savedMessage?.(amount) ?? null });
  }

  return (
    <View style={styles.wrapper}>
      <ThemedText type="smallBold" themeColor="textSecondary">
        {label}
      </ThemedText>
      <View style={styles.row}>
        {amounts.map((amount) => (
          <Pressable
            key={amount}
            accessibilityRole="button"
            accessibilityLabel={`Save ${money(amount)} to ${goalName}`}
            accessibilityHint="Logs it straight away, dated today"
            onPress={() => save(amount)}
            style={({ pressed }) => [
              styles.chip,
              { backgroundColor: theme.background, borderColor: theme.tint },
              pressed && styles.pressed,
            ]}>
            <ThemedText type="defaultBold" themeColor="tint">
              +{money(amount)}
            </ThemedText>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: Spacing.one,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  chip: {
    flexGrow: 1,
    minHeight: MinTapSize,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.control,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
  saved: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
    paddingLeft: Spacing.three,
    borderRadius: Radius.control,
    borderWidth: 1,
  },
  savedText: {
    flex: 1,
  },
});
