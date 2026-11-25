import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Switch, View, type LayoutChangeEvent } from 'react-native';
import type Svg from 'react-native-svg';

import {
  ProgressCard,
  SHARE_CARD_HEIGHT,
  SHARE_CARD_WIDTH,
} from '@/components/share/progress-card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { ModalHeader } from '@/components/ui/modal-header';
import { SafeAreaView } from '@/components/ui/safe-area-view';
import { MaxContentWidth, MinTapSize, Radius, Spacing } from '@/constants/theme';
import { useCurrency, useGoal, useGoalProgress } from '@/hooks/use-app-data';
import { useTheme } from '@/hooks/use-theme';
import { shareImage } from '@/services/share-image';
import { formatMoney } from '@/utils/money';

function close() {
  if (router.canGoBack()) router.back();
  else router.replace('/goals');
}

/**
 * "Share my progress": a ready-made image of a goal's progress (amounts hidden
 * unless the user turns them on), shared through the phone's share sheet.
 * Nothing is sent anywhere unless the user shares it. Opened with ?goalId=.
 */
export default function ShareProgressScreen() {
  const { goalId } = useLocalSearchParams<{ goalId: string }>();
  const goal = useGoal(goalId ?? '');
  const progress = useGoalProgress(goalId ?? '');
  const currency = useCurrency();
  const theme = useTheme();
  const svgRef = useRef<Svg>(null);
  const [width, setWidth] = useState(0);
  const [showAmounts, setShowAmounts] = useState(false);
  // The finished PNG, made ahead of the tap (browsers only allow sharing straight from one).
  const [png, setPng] = useState<{ amounts: boolean; data: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!width || !goal) return;
    // Give the drawing (and any photo in it) a moment to render before capturing it.
    const timer = setTimeout(() => {
      svgRef.current?.toDataURL((data) => setPng({ amounts: showAmounts, data }), {
        width: SHARE_CARD_WIDTH,
        height: SHARE_CARD_HEIGHT,
      });
    }, 350);
    return () => clearTimeout(timer);
  }, [width, showAmounts, goal]);

  if (!goal || !progress) {
    return (
      <ThemedView style={[styles.container, styles.notFound]}>
        <ThemedText themeColor="textSecondary">This goal doesn’t exist any more.</ThemedText>
        <Button title="Close" variant="secondary" onPress={close} />
      </ThemedView>
    );
  }

  const money = (amount: number) => formatMoney(amount, currency);
  const amountsText = showAmounts
    ? `${money(progress.saved)} of ${money(goal.targetAmount)}`
    : null;
  const ready = png !== null && png.amounts === showAmounts;
  const fileName = `goalpot-${
    goal.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'goal'
  }.png`;

  async function share() {
    if (!png) return;
    setError(null);
    try {
      await shareImage(fileName, png.data);
    } catch {
      setError('Sharing didn’t work on this device. Try taking a screenshot instead.');
    }
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ModalHeader title="Share progress" onClose={close} closeLabel="Close" />
        <ScrollView contentContainerStyle={styles.content}>
          <View
            style={styles.preview}
            onLayout={(e: LayoutChangeEvent) => setWidth(Math.round(e.nativeEvent.layout.width))}
            accessible
            accessibilityRole="image"
            accessibilityLabel={`Progress image: ${goal.name}, ${progress.percent >= 100 ? 'goal reached' : `${progress.percent}% of the way there`}${amountsText ? `, ${amountsText}` : ''}. Saving with Goalpot.`}>
            {width > 0 && (
              <View style={styles.cardFrame}>
                <ProgressCard
                  ref={svgRef}
                  name={goal.name}
                  emoji={goal.emoji}
                  image={goal.image}
                  percent={progress.percent}
                  amountsText={amountsText}
                  width={width}
                />
              </View>
            )}
          </View>

          <View style={[styles.switchRow, { backgroundColor: theme.backgroundElement }]}>
            <View style={styles.switchText}>
              <ThemedText type="defaultBold">Show amounts</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Off by default, so people only see your percentage.
              </ThemedText>
            </View>
            <Switch
              value={showAmounts}
              onValueChange={setShowAmounts}
              accessibilityLabel="Show amounts on the image"
              trackColor={{ true: theme.tint }}
            />
          </View>

          <ThemedText type="small" themeColor="textSecondary">
            The image is made on your phone. Nothing is sent anywhere unless you share it.
          </ThemedText>
          {error ? (
            <ThemedText type="small" themeColor="danger">
              {error}
            </ThemedText>
          ) : null}
        </ScrollView>
        <View style={styles.footer}>
          <Button
            title={ready ? 'Share image' : 'Getting it ready…'}
            disabled={!ready}
            accessibilityHint="Opens your phone’s share options"
            onPress={share}
          />
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  notFound: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.four,
  },
  safeArea: {
    flex: 1,
    maxWidth: MaxContentWidth,
  },
  content: {
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.four,
  },
  preview: {
    width: '100%',
  },
  cardFrame: {
    borderRadius: Radius.card,
    overflow: 'hidden',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    minHeight: MinTapSize,
    borderRadius: Radius.control,
  },
  switchText: {
    flex: 1,
    gap: Spacing.half,
  },
  footer: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
  },
});
