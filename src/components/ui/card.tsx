import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { FadeInDown, ReduceMotion } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type CardProps = {
  /** Card heading; announced as a header by screen readers. */
  title?: string;
  /** Short line under the title. */
  subtitle?: string;
  /** Optional element on the right of the title, e.g. a TextButton. */
  action?: ReactNode;
  /** Position on the screen, used to stagger the fade-in (0 = first). */
  index?: number;
  /** 'accent' fills the card with the brand colour (e.g. celebrations). */
  tone?: 'default' | 'accent';
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
};

/**
 * The rounded surface every section of the app sits on. Fades in gently when
 * it first appears (skipped when the phone's "reduce motion" setting is on).
 */
export function Card({ title, subtitle, action, index = 0, tone = 'default', style, children }: CardProps) {
  const theme = useTheme();
  const background = tone === 'accent' ? theme.tint : theme.backgroundElement;
  const textColour = tone === 'accent' ? theme.onTint : undefined;

  return (
    <Animated.View
      entering={FadeInDown.duration(320)
        .delay(Math.min(index, 6) * 50)
        .reduceMotion(ReduceMotion.System)}
      style={[styles.card, { backgroundColor: background }, style]}>
      {(title || action) && (
        <View style={styles.header}>
          <View style={styles.headerText}>
            {title ? (
              <ThemedText type="heading" accessibilityRole="header" style={textColour && { color: textColour }}>
                {title}
              </ThemedText>
            ) : null}
            {subtitle ? (
              <ThemedText type="small" themeColor="textSecondary">
                {subtitle}
              </ThemedText>
            ) : null}
          </View>
          {action}
        </View>
      )}
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: Spacing.three,
    padding: Spacing.three + Spacing.one,
    borderRadius: Radius.card,
    borderCurve: 'continuous',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
  },
  headerText: {
    flex: 1,
    gap: Spacing.half,
  },
});
