import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';

type AdviceNoteProps = {
  /** Short version for small spaces (e.g. under the Home tip). */
  short?: boolean;
};

/** "This is general guidance" note. Show it anywhere we suggest amounts or give tips. */
export function AdviceNote({ short = false }: AdviceNoteProps) {
  return (
    <ThemedText type="small" themeColor="textSecondary" style={styles.note}>
      {short
        ? 'General guidance, not professional financial advice.'
        : 'ℹ️ This is general guidance to help you get started, not professional financial advice. Everyone’s situation is different. For advice about your own circumstances, speak to a qualified, regulated financial adviser or a free debt advice service.'}
    </ThemedText>
  );
}

const styles = StyleSheet.create({
  note: {
    fontSize: 12,
    lineHeight: 17,
  },
});
