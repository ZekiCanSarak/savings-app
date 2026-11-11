import { Pressable, StyleSheet, Text } from 'react-native';

import { MinTapSize, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type ButtonProps = {
  title: string;
  onPress: () => void;
  /**
   * primary = filled brand colour (one per screen area)
   * secondary = grey fill, readable on page and on cards
   * danger = outlined in red, for destructive actions
   */
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
  /** Extra context for screen readers, e.g. "Opens a form to add a goal". */
  accessibilityHint?: string;
  /** Hug the label instead of filling the width (e.g. in a header). */
  compact?: boolean;
};

export function Button({
  title,
  onPress,
  variant = 'primary',
  disabled = false,
  accessibilityHint,
  compact = false,
}: ButtonProps) {
  const theme = useTheme();
  const backgroundColor =
    variant === 'primary' ? theme.tint : variant === 'secondary' ? theme.backgroundSelected : 'transparent';
  const color =
    variant === 'primary' ? theme.onTint : variant === 'danger' ? theme.danger : theme.text;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      accessibilityHint={accessibilityHint}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        compact && styles.compact,
        { backgroundColor },
        variant === 'danger' && { borderWidth: 1.5, borderColor: theme.danger },
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}>
      <Text style={[styles.label, { color }]} maxFontSizeMultiplier={1.6}>
        {title}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 52,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    borderRadius: Radius.control,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  compact: {
    minHeight: MinTapSize,
    paddingHorizontal: Spacing.three,
  },
  label: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: 600,
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  disabled: {
    opacity: 0.4,
  },
});
