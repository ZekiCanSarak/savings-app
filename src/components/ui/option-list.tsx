import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type Option<T extends string> = {
  value: T;
  label: string;
  description?: string;
  emoji?: string;
};

type OptionListProps<T extends string> = {
  /** Spoken name of the group, e.g. the question. */
  label: string;
  options: Option<T>[];
  /** null = nothing chosen yet. */
  value: T | null;
  onChange: (value: T) => void;
};

/**
 * A list of large choices with an optional emoji and description, where one
 * can be selected. Same look as the currency picker.
 */
export function OptionList<T extends string>({ label, options, value, onChange }: OptionListProps<T>) {
  const theme = useTheme();

  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={label} style={styles.list}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected }}
            accessibilityLabel={
              option.description ? `${option.label}. ${option.description}` : option.label
            }
            onPress={() => onChange(option.value)}
            style={({ pressed }) => [
              styles.row,
              {
                backgroundColor: theme.background,
                borderColor: selected ? theme.tint : theme.border,
              },
              pressed && styles.pressed,
            ]}>
            {option.emoji ? (
              <ThemedText type="emoji" style={styles.emoji} importantForAccessibility="no">
                {option.emoji}
              </ThemedText>
            ) : null}
            <View style={styles.text}>
              <ThemedText type="defaultBold">{option.label}</ThemedText>
              {option.description ? (
                <ThemedText type="small" themeColor="textSecondary">
                  {option.description}
                </ThemedText>
              ) : null}
            </View>
            <View style={[styles.radio, { borderColor: selected ? theme.tint : theme.border }]}>
              {selected ? <View style={[styles.radioDot, { backgroundColor: theme.tint }]} /> : null}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: Spacing.two,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    minHeight: 56,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radius.control,
    borderCurve: 'continuous',
    borderWidth: 2,
  },
  emoji: {
    width: 32,
  },
  text: {
    flex: 1,
    gap: Spacing.half,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  pressed: {
    opacity: 0.7,
  },
});
