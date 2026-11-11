import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import type { Tip } from '@/data/tips';

type TipCardProps = {
  tip: Tip;
};

/** One saving tip: a light-bulb, a bold title and a short explanation. */
export function TipCard({ tip }: TipCardProps) {
  return (
    <View style={styles.row} accessible accessibilityLabel={`Tip: ${tip.title}. ${tip.body}`}>
      <ThemedText type="emoji" style={styles.icon} importantForAccessibility="no">💡</ThemedText>
      <View style={styles.text}>
        <ThemedText type="smallBold">{tip.title}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {tip.body}
        </ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: Spacing.three,
    alignItems: 'flex-start',
  },
  icon: {
    width: 32,
  },
  text: {
    flex: 1,
    gap: Spacing.half,
  },
});
