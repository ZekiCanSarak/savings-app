import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { TextButton } from '@/components/ui/text-button';
import { MinTapSize, ScreenPadding } from '@/constants/theme';

type ModalHeaderProps = {
  title?: string;
  /** Label for the close button: "Cancel" when it discards changes, "Close" otherwise. */
  closeLabel?: 'Cancel' | 'Close';
  onClose: () => void;
};

/** Top bar for full-screen sheets: a close button on the left and a centred title. */
export function ModalHeader({ title, closeLabel = 'Cancel', onClose }: ModalHeaderProps) {
  return (
    <View style={styles.bar}>
      <View style={styles.side}>
        <TextButton title={closeLabel} onPress={onClose} />
      </View>
      {title ? (
        <ThemedText type="defaultBold" style={styles.title} accessibilityRole="header" numberOfLines={1}>
          {title}
        </ThemedText>
      ) : (
        <View style={styles.title} />
      )}
      <View style={styles.side} />
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: ScreenPadding,
    minHeight: MinTapSize + 8,
  },
  side: {
    width: 80,
  },
  title: {
    flex: 1,
    textAlign: 'center',
  },
});
