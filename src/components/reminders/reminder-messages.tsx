import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import type { ReminderMessage } from '@/utils/reminders';

type ReminderMessagesProps = {
  messages: ReminderMessage[];
};

/** The same messages the notifications use, shown in the app. Tap one to open its goal. */
export function ReminderMessages({ messages }: ReminderMessagesProps) {
  return (
    <View style={styles.list}>
      {messages.map((message) => (
        <Pressable
          key={message.goalId ?? message.title}
          accessibilityRole={message.goalId ? 'button' : undefined}
          accessibilityLabel={`${message.title}. ${message.body}`}
          disabled={!message.goalId}
          onPress={() =>
            message.goalId &&
            router.push({ pathname: '/goals/[id]', params: { id: message.goalId } })
          }
          style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
          <ThemedText style={styles.icon}>🔔</ThemedText>
          <View style={styles.text}>
            <ThemedText type="smallBold">{message.title}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {message.body}
            </ThemedText>
          </View>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: Spacing.three,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.three,
    alignItems: 'flex-start',
    minHeight: 44,
  },
  pressed: {
    opacity: 0.7,
  },
  icon: {
    fontSize: 18,
    lineHeight: 22,
  },
  text: {
    flex: 1,
    gap: Spacing.half,
  },
});
