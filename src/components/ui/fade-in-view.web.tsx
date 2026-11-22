import { useState, type ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

type FadeInViewProps = {
  /** Position on the screen, used to stagger the fade-in (0 = first). */
  index?: number;
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
};

/**
 * Web: a plain CSS fade instead of Reanimated's entering animation. Reanimated
 * hides the view until the browser reports that the animation started; when
 * the iPhone home-screen app was rebuilt while asleep, that never came and
 * Home stayed blank until you switched tabs. CSS needs no event to finish.
 */
const KEYFRAMES = 'goalpot-fade-in';

// react-native-web drops keyframes given in inline styles, so add them once as CSS.
function addKeyframes() {
  if (typeof document === 'undefined' || document.getElementById(KEYFRAMES)) return;
  const css = document.createElement('style');
  css.id = KEYFRAMES;
  css.textContent = `@keyframes ${KEYFRAMES} { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: none; } }`;
  document.head.appendChild(css);
}

export function FadeInView({ index = 0, style, children }: FadeInViewProps) {
  const reduceMotion = useReducedMotion();
  // Built in the background (nobody watching): just show it.
  const [hiddenAtStart] = useState(
    () => typeof document !== 'undefined' && document.visibilityState === 'hidden',
  );
  const animate = !reduceMotion && !hiddenAtStart;
  if (animate) addKeyframes();
  // React Native's types don't know react-native-web's CSS animation styles.
  const fade = animate
    ? ({
        animationName: KEYFRAMES,
        animationDuration: '320ms',
        animationDelay: `${Math.min(index, 6) * 50}ms`,
        animationTimingFunction: 'ease-out',
        animationFillMode: 'backwards',
      } as unknown as ViewStyle)
    : undefined;
  return <View style={[style, fade]}>{children}</View>;
}
