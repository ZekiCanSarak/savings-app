import { useEffect, useState, type ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

type Edge = 'top' | 'right' | 'bottom' | 'left';

type SafeAreaViewProps = {
  style?: StyleProp<ViewStyle>;
  /** Which sides to keep clear. All four by default. */
  edges?: readonly Edge[];
  children?: ReactNode;
};

const PADDING: Record<Edge, keyof ViewStyle> = {
  top: 'paddingTop',
  right: 'paddingRight',
  bottom: 'paddingBottom',
  left: 'paddingLeft',
};

/**
 * Web: pads with CSS `env(safe-area-inset-*)`, which the browser keeps right
 * (e.g. the iPhone notch and home indicator when Goalpot is opened from the
 * home screen, with `viewport-fit=cover` in +html.tsx). The JavaScript
 * measurement in react-native-safe-area-context reports 0 inside the tab
 * screens on web, which left content under the status bar.
 */
export function SafeAreaView({ style, edges = ['top', 'right', 'bottom', 'left'], children }: SafeAreaViewProps) {
  // React Native's types only allow numbers here; react-native-web passes CSS strings through.
  const insets = Object.fromEntries(
    edges.map((edge) => [PADDING[edge], `env(safe-area-inset-${edge})`]),
  ) as unknown as ViewStyle;
  return <View style={[style, insets]}>{children}</View>;
}


/** Reads the browser's top safe area (e.g. the iPhone notch) in pixels. */
function measureTop(): number {
  if (typeof document === 'undefined') return 0;
  const probe = document.createElement('div');
  probe.style.cssText = 'position:fixed;visibility:hidden;padding-top:env(safe-area-inset-top)';
  document.body.appendChild(probe);
  const top = parseFloat(getComputedStyle(probe).paddingTop) || 0;
  probe.remove();
  return top;
}

/**
 * The top safe area in pixels, for headers that need a number (the Goals
 * stack's `headerStatusBarHeight`). Updates when the phone is rotated.
 */
export function useWebSafeAreaTop(): number | undefined {
  const [top, setTop] = useState(0);
  useEffect(() => {
    const update = () => setTop(measureTop());
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);
  return top;
}
