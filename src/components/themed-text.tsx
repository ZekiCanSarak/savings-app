import { StyleSheet, Text, type TextProps } from 'react-native';

import { ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/**
 * The app's type scale. Use these instead of setting fontSize in screens.
 *
 * - hero:      the one big number on a screen (e.g. total saved)
 * - title:     screen titles ("Goals", "Budget")
 * - heading:   card and section headings
 * - default:   body text
 * - defaultBold
 * - small:     secondary text, labels
 * - smallBold
 * - caption:   fine print (notes, chart axes). Never smaller than this.
 * - emoji / emojiLarge: emoji used as icons
 *
 * Text scales with the phone's accessibility font size. Very large display
 * styles are capped (`maxFontSizeMultiplier`) so they don't overflow.
 */
export type TextType =
  | 'hero'
  | 'title'
  | 'heading'
  | 'default'
  | 'defaultBold'
  | 'small'
  | 'smallBold'
  | 'caption'
  | 'emoji'
  | 'emojiLarge';

export type ThemedTextProps = TextProps & {
  type?: TextType;
  themeColor?: ThemeColor;
};

const MAX_SCALE: Partial<Record<TextType, number>> = {
  hero: 1.3,
  title: 1.4,
  emoji: 1.5,
  emojiLarge: 1.3,
};

export function ThemedText({ style, type = 'default', themeColor, ...rest }: ThemedTextProps) {
  const theme = useTheme();

  return (
    <Text
      maxFontSizeMultiplier={MAX_SCALE[type]}
      style={[{ color: theme[themeColor ?? 'text'] }, styles[type], style]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  hero: {
    fontSize: 44,
    lineHeight: 52,
    fontWeight: 700,
    letterSpacing: -0.5,
  },
  title: {
    fontSize: 30,
    lineHeight: 38,
    fontWeight: 700,
    letterSpacing: -0.3,
  },
  heading: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: 600,
  },
  default: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: 400,
  },
  defaultBold: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: 600,
  },
  small: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: 400,
  },
  smallBold: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: 600,
  },
  caption: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: 400,
  },
  emoji: {
    fontSize: 24,
    lineHeight: 30,
  },
  emojiLarge: {
    fontSize: 56,
    lineHeight: 68,
    textAlign: 'center',
  },
});
