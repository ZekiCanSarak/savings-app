import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { GOAL_EMOJIS } from '@/constants/goal-emojis';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type EmojiPickerProps = {
  value: string;
  onChange: (emoji: string) => void;
};

/** A grid of emojis; tap one to pick it. */
export function EmojiPicker({ value, onChange }: EmojiPickerProps) {
  const theme = useTheme();

  return (
    <View style={styles.wrapper}>
      <ThemedText type="smallBold">Icon</ThemedText>
      <View accessibilityRole="radiogroup" style={styles.grid}>
        {GOAL_EMOJIS.map((emoji) => {
          const selected = emoji === value;
          return (
            <Pressable
              key={emoji}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              accessibilityLabel={emoji}
              onPress={() => onChange(emoji)}
              style={({ pressed }) => [
                styles.cell,
                {
                  backgroundColor: selected ? theme.backgroundSelected : theme.backgroundElement,
                  borderColor: selected ? theme.tint : 'transparent',
                },
                pressed && styles.pressed,
              ]}>
              <Text style={styles.emoji}>{emoji}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: Spacing.one,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  cell: {
    width: 48,
    height: 48,
    borderRadius: Spacing.three,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: {
    fontSize: 24,
  },
  pressed: {
    opacity: 0.75,
  },
});
