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
      <ThemedText style={styles.icon}>💡</ThemedText>
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
    fontSize: 20,
    lineHeight: 24,
  },
  text: {
    flex: 1,
    gap: Spacing.half,
  },
});
