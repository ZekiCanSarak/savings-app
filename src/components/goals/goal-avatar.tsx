import { Image } from 'expo-image';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';

type GoalAvatarProps = {
  emoji: string;
  /** The goal's photo (data URI), if it has one. */
  image?: string;
  size: number;
  radius: number;
  /** Background behind the emoji. */
  backgroundColor: string;
  /** Emoji text size: 'emoji' for small avatars, 'emojiLarge' for big ones. */
  emojiType?: 'emoji' | 'emojiLarge';
  style?: StyleProp<ViewStyle>;
};

/** A goal's picture: its photo when it has one, otherwise its emoji. Decorative (the name is shown next to it). */
export function GoalAvatar({ emoji, image, size, radius, backgroundColor, emojiType = 'emoji', style }: GoalAvatarProps) {
  return (
    <View
      style={[styles.box, { width: size, height: size, borderRadius: radius, backgroundColor }, style]}
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden>
      {image ? (
        <Image source={{ uri: image }} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} />
      ) : (
        <ThemedText type={emojiType}>{emoji}</ThemedText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    overflow: 'hidden',
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
