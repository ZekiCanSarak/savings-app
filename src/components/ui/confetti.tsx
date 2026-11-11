import { useEffect, useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

const PIECE_COUNT = 40;
const COLOURS = ['#3DD68C', '#1F7A52', '#FFC83D', '#FF7A7A', '#4DA3FF', '#B98CFF'];

type Piece = {
  x: number;
  size: number;
  colour: string;
  delay: number;
  duration: number;
  drift: number;
  spin: number;
  round: boolean;
};

function makePieces(width: number, startDelay: number): Piece[] {
  return Array.from({ length: PIECE_COUNT }, (_, i) => ({
    x: Math.random() * width,
    size: 6 + Math.random() * 6,
    colour: COLOURS[i % COLOURS.length],
    delay: startDelay + Math.random() * 400,
    duration: 1800 + Math.random() * 1200,
    drift: (Math.random() - 0.5) * 80,
    spin: (Math.random() - 0.5) * 720,
    round: Math.random() < 0.3,
  }));
}

type ConfettiProps = {
  /** Wait this long (ms) before starting, e.g. to let a closing modal get out of the way. */
  startDelay?: number;
};

/**
 * A one-off burst of falling confetti over the whole screen. It doesn't block
 * taps. Unmount it to remove it; each mount plays the animation once.
 * Callers should skip it when `useReducedMotion()` is true.
 */
export function Confetti({ startDelay = 0 }: ConfettiProps) {
  const { width, height } = useWindowDimensions();
  // Lazy initialiser: random positions are picked once, on first render only.
  const [pieces] = useState(() => makePieces(width, startDelay));

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {pieces.map((piece, i) => (
        <ConfettiPiece key={i} piece={piece} fallDistance={height + 40} />
      ))}
    </View>
  );
}

function ConfettiPiece({ piece, fallDistance }: { piece: Piece; fallDistance: number }) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.set(
      withDelay(
        piece.delay,
        withTiming(1, { duration: piece.duration, easing: Easing.in(Easing.quad) }),
      ),
    );
  }, [progress, piece]);

  const style = useAnimatedStyle(() => {
    const p = progress.get();
    return {
      opacity: p > 0.85 ? (1 - p) / 0.15 : 1,
      transform: [
        { translateX: piece.x + Math.sin(p * Math.PI * 2) * piece.drift },
        { translateY: -20 + p * fallDistance },
        { rotate: `${p * piece.spin}deg` },
      ],
    };
  });

  return (
    <Animated.View
      style={[
        styles.piece,
        {
          width: piece.size,
          height: piece.round ? piece.size : piece.size * 1.6,
          borderRadius: piece.round ? piece.size / 2 : 1,
          backgroundColor: piece.colour,
        },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  piece: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
});
