import { Image } from 'expo-image';
import * as SplashScreen from 'expo-splash-screen';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, Keyframe } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { Colors } from '@/constants/theme';

const DURATION = 600;

/** Same size as `imageWidth` for expo-splash-screen in app.json, so the hand-over is seamless. */
const LOGO_SIZE = 120;

const fadeOut = new Keyframe({
  0: { opacity: 1 },
  30: { opacity: 1 },
  100: { opacity: 0, easing: Easing.out(Easing.cubic) },
});

/**
 * Covers the app with the same green and Goalpot logo as the native splash
 * screen, then fades out once the first screen is ready. On phones the native
 * splash hides as soon as this appears, so there's no flash in between.
 */
export function AnimatedSplashOverlay() {
  const [fading, setFading] = useState(false);
  const [visible, setVisible] = useState(true);

  if (!visible) return null;

  const logo = <Image style={styles.logo} source={require('@/assets/images/splash-icon.png')} />;

  return fading ? (
    <Animated.View
      entering={fadeOut.duration(DURATION).withCallback((finished) => {
        'worklet';
        if (finished) scheduleOnRN(setVisible, false);
      })}
      style={styles.overlay}>
      {logo}
    </Animated.View>
  ) : (
    <View
      onLayout={() => {
        SplashScreen.hideAsync().finally(() => setFading(true));
      }}
      style={styles.overlay}>
      {logo}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    // The brand green, matching the native splash background in app.json.
    backgroundColor: Colors.light.tint,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  logo: {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
  },
});
