import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Spacing } from '@/constants/theme';

type EmptyStateProps = {
  emoji: string;
  title: string;
  message: string;
  actionTitle?: string;
  onAction?: () => void;
};

/** A friendly card for "nothing here yet", with an optional button to fix that. */
export function EmptyState({ emoji, title, message, actionTitle, onAction }: EmptyStateProps) {
  return (
    <Card style={styles.card}>
      <ThemedText type="emojiLarge" importantForAccessibility="no" accessibilityElementsHidden>
        {emoji}
      </ThemedText>
      <View style={styles.text}>
        <ThemedText type="heading" style={styles.center} accessibilityRole="header">
          {title}
        </ThemedText>
        <ThemedText themeColor="textSecondary" style={styles.center}>
          {message}
        </ThemedText>
      </View>
      {actionTitle && onAction ? (
        <View style={styles.action}>
          <Button title={actionTitle} onPress={onAction} />
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    paddingVertical: Spacing.five,
  },
  text: {
    gap: Spacing.one,
  },
  center: {
    textAlign: 'center',
  },
  action: {
    alignSelf: 'stretch',
    marginTop: Spacing.one,
  },
});
