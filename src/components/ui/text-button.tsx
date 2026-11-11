import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { MinTapSize } from '@/constants/theme';

type TextButtonProps = {
  title: string;
  onPress: () => void;
  /** What the button does, if the visible text alone isn't clear ("Change" → "Change income"). */
  accessibilityLabel?: string;
  accessibilityHint?: string;
  tone?: 'tint' | 'danger';
};

/** A text-only button ("Change", "More tips", "Cancel") with a full-size tap area. */
export function TextButton({ title, onPress, accessibilityLabel, accessibilityHint, tone = 'tint' }: TextButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityHint={accessibilityHint}
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
      <ThemedText type="smallBold" themeColor={tone}>
        {title}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: MinTapSize,
    minWidth: MinTapSize,
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.6,
  },
});
