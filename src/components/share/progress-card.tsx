import type { Ref } from 'react';
import { Platform } from 'react-native';
import Svg, {
  ClipPath,
  Circle,
  Defs,
  G,
  Image as SvgImage,
  LinearGradient,
  Rect,
  Stop,
  Text as SvgText,
} from 'react-native-svg';

/** The share image is drawn at this size (Instagram/TikTok portrait), then scaled to fit the screen. */
export const SHARE_CARD_WIDTH = 1080;
export const SHARE_CARD_HEIGHT = 1350;

type ProgressCardProps = {
  name: string;
  emoji: string;
  image?: string;
  percent: number;
  /** e.g. "£350 of £500"; null hides the amounts (the default when sharing). */
  amountsText: string | null;
  /** On-screen width; the image itself is always made at full size. */
  width: number;
  ref?: Ref<Svg>;
};

// Fixed brand colours: the image looks the same whatever the app's light/dark mode.
const GREEN = '#1F7A52';
const DEEP_GREEN = '#0B3A26';
const MINT = '#7DF5B8';
// Browsers draw SVG text in a serif font by default; phones use the system font.
const FONT = Platform.select({
  web: 'Inter, -apple-system, "Segoe UI", Helvetica, Arial, sans-serif',
});

/** "I'm 70% of the way there" card for sharing a goal's progress (amounts hidden unless chosen). */
export function ProgressCard({
  name,
  emoji,
  image,
  percent,
  amountsText,
  width,
  ref,
}: ProgressCardProps) {
  const reached = percent >= 100;
  const shortName = name.length > 22 ? `${name.slice(0, 21)}…` : name;
  const barWidth = 800;
  return (
    <Svg
      ref={ref}
      width={width}
      height={(width * SHARE_CARD_HEIGHT) / SHARE_CARD_WIDTH}
      viewBox={`0 0 ${SHARE_CARD_WIDTH} ${SHARE_CARD_HEIGHT}`}>
      <Defs>
        <LinearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={GREEN} />
          <Stop offset="1" stopColor={DEEP_GREEN} />
        </LinearGradient>
        <ClipPath id="photo">
          <Rect x="390" y="230" width="300" height="300" rx="72" />
        </ClipPath>
      </Defs>
      <Rect x="0" y="0" width={SHARE_CARD_WIDTH} height={SHARE_CARD_HEIGHT} fill="url(#bg)" />
      <Circle cx="120" cy="140" r="260" fill="#ffffff" opacity="0.05" />
      <Circle cx="980" cy="1250" r="320" fill="#ffffff" opacity="0.05" />

      <SvgText
        x="540"
        fontFamily={FONT}
        y="160"
        fill="#ffffff"
        opacity="0.75"
        fontSize="40"
        fontWeight="700"
        textAnchor="middle"
        letterSpacing="6">
        MY SAVINGS GOAL
      </SvgText>

      {image ? (
        <G clipPath="url(#photo)">
          <SvgImage
            x="390"
            y="230"
            width="300"
            height="300"
            href={{ uri: image }}
            preserveAspectRatio="xMidYMid slice"
          />
        </G>
      ) : (
        <G>
          <Rect x="390" y="230" width="300" height="300" rx="72" fill="#ffffff" opacity="0.14" />
          <SvgText x="540" fontFamily={FONT} y="445" fontSize="160" textAnchor="middle">
            {emoji}
          </SvgText>
        </G>
      )}

      <SvgText
        x="540"
        fontFamily={FONT}
        y="660"
        fill="#ffffff"
        fontSize="88"
        fontWeight="800"
        textAnchor="middle">
        {shortName}
      </SvgText>

      {reached ? (
        <SvgText
          x="540"
          fontFamily={FONT}
          y="860"
          fill={MINT}
          fontSize="110"
          fontWeight="900"
          textAnchor="middle">
          Goal reached! 🎉
        </SvgText>
      ) : (
        <G>
          <SvgText
            x="540"
            fontFamily={FONT}
            y="860"
            fill={MINT}
            fontSize="200"
            fontWeight="900"
            textAnchor="middle">
            {`${percent}%`}
          </SvgText>
          <SvgText
            x="540"
            fontFamily={FONT}
            y="935"
            fill="#ffffff"
            opacity="0.9"
            fontSize="52"
            fontWeight="700"
            textAnchor="middle">
            of the way there
          </SvgText>
        </G>
      )}

      <Rect x="140" y="990" width={barWidth} height="40" rx="20" fill="#ffffff" opacity="0.2" />
      <Rect
        x="140"
        y="990"
        width={Math.max(40, (barWidth * Math.min(percent, 100)) / 100)}
        height="40"
        rx="20"
        fill={MINT}
      />

      {amountsText ? (
        <SvgText
          x="540"
          fontFamily={FONT}
          y="1110"
          fill="#ffffff"
          fontSize="50"
          fontWeight="700"
          textAnchor="middle">
          {amountsText}
        </SvgText>
      ) : null}

      <SvgText
        x="540"
        fontFamily={FONT}
        y="1265"
        fill="#ffffff"
        opacity="0.75"
        fontSize="38"
        fontWeight="600"
        textAnchor="middle">
        Saving with Goalpot · goalpot.expo.app
      </SvgText>
    </Svg>
  );
}
