import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, ReduceMotion } from 'react-native-reanimated';

import { TipCard } from '@/components/budget/tip-card';
import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { MinTapSize, Spacing } from '@/constants/theme';
import type { Tip } from '@/data/tips';

type TipsSectionProps = {
  tips: Tip[];
  /** Position on the screen, for the card's staggered fade-in. */
  index?: number;
};

/**
 * The Budget tab's "Tips for you" card. It starts closed so the list of tips
 * doesn't push everything else down; the whole header opens and closes it.
 */
export function TipsSection({ tips, index }: TipsSectionProps) {
  const [open, setOpen] = useState(false);
  const subtitle = `${tips.length} ideas to help you save`;

  const list = (
    <Animated.View
      entering={FadeIn.duration(200).reduceMotion(ReduceMotion.System)}
      style={styles.tips}>
      {tips.map((tip) => (
        <TipCard key={tip.id} tip={tip} />
      ))}
    </Animated.View>
  );

  return (
    <Card index={index}>
      <Pressable
        onPress={() => setOpen((value) => !value)}
        accessibilityRole="button"
        aria-expanded={open}
        accessibilityLabel={`Tips for you. ${subtitle}`}
        accessibilityHint={open ? 'Hides the tips' : 'Shows the tips'}
        style={({ pressed }) => [styles.header, pressed && styles.pressed]}>
        <View style={styles.headerText}>
          <ThemedText type="heading">Tips for you</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {subtitle}
          </ThemedText>
        </View>
        <ThemedText type="smallBold" themeColor="tint" importantForAccessibility="no">
          {open ? 'Hide ▲' : 'Show ▼'}
        </ThemedText>
      </Pressable>
      {open && list}
    </Card>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    minHeight: MinTapSize,
  },
  headerText: {
    flex: 1,
    gap: Spacing.half,
  },
  pressed: {
    opacity: 0.7,
  },
  tips: {
    gap: Spacing.four,
  },
});
