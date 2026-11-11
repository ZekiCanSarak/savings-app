import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { ReminderMessage } from '@/utils/reminders';

/** A mock notification banner showing what a reminder will say. */
export function ReminderPreview({ message }: { message: ReminderMessage }) {
  const theme = useTheme();
  return (
    <View
      accessible
      accessibilityLabel={`Example reminder: ${message.title}. ${message.body}`}
      style={[styles.banner, { backgroundColor: theme.background, borderColor: theme.border }]}>
      <View style={[styles.appIcon, { backgroundColor: theme.tint }]}>
        <ThemedText style={styles.appIconText}>💰</ThemedText>
      </View>
      <View style={styles.text}>
        <ThemedText type="smallBold">{message.title}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {message.body}
        </ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Radius.control,
    borderWidth: 1,
  },
  appIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  appIconText: {
    fontSize: 18,
    lineHeight: 22,
  },
  text: {
    flex: 1,
    gap: Spacing.half,
  },
});
