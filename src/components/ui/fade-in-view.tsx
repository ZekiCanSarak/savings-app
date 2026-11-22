import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import Animated, { FadeInDown, ReduceMotion } from 'react-native-reanimated';

type FadeInViewProps = {
  /** Position on the screen, used to stagger the fade-in (0 = first). */
  index?: number;
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
};

/** Fades and slides its content in when it first appears (web: fade-in-view.web.tsx). */
export function FadeInView({ index = 0, style, children }: FadeInViewProps) {
  return (
    <Animated.View
      entering={FadeInDown.duration(320)
        .delay(Math.min(index, 6) * 50)
        .reduceMotion(ReduceMotion.System)}
      style={style}>
      {children}
    </Animated.View>
  );
}
