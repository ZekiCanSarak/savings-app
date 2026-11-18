import {
  Image,
  type ImageSourcePropType,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { TextButton } from '@/components/ui/text-button';
import { Radius, ScreenPadding, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';
import { feedbackEnabled, openFeedback } from '@/services/feedback';

import { FeatureShowcase } from './feature-showcase';
import type { LandingPageProps } from './landing-page';

/**
 * Screenshots of the demo data at iPhone size (390 × 844), in light and dark.
 * Retake them when the screens change noticeably.
 */
const SCREENSHOTS: {
  light: ImageSourcePropType;
  dark: ImageSourcePropType;
  label: string;
}[] = [
  {
    light: require('@/assets/images/landing/home-light.png'),
    dark: require('@/assets/images/landing/home-dark.png'),
    label: 'Your savings at a glance',
  },
  {
    light: require('@/assets/images/landing/goals-light.png'),
    dark: require('@/assets/images/landing/goals-dark.png'),
    label: 'Every goal and how close you are',
  },
  {
    light: require('@/assets/images/landing/goal-chart-light.png'),
    dark: require('@/assets/images/landing/goal-chart-dark.png'),
    label: 'Plan ahead and watch it grow',
  },
  {
    light: require('@/assets/images/landing/budget-light.png'),
    dark: require('@/assets/images/landing/budget-dark.png'),
    label: 'A budget built from your pay',
  },
];
const SHOT_RATIO = 844 / 390;

/**
 * Web only: what a first-time visitor sees before the welcome flow. Explains
 * Goalpot, shows it, and offers the demo. Skipped when opened from the home
 * screen, and never shown again once the user has started (see onboarding.tsx).
 */
export function LandingPage({ onGetStarted, onTryDemo }: LandingPageProps) {
  const theme = useTheme();
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const { width } = useWindowDimensions();
  const wide = width >= 820;
  const shotWidth = wide
    ? Math.min(220, (Math.min(width, 1100) - 4 * 48) / 4)
    : Math.min(240, width * 0.62);

  return (
    <ThemedView style={styles.page}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.column}>
          <View style={styles.nav}>
            <View style={styles.brand}>
              <Image
                source={require('@/assets/images/landing/icon.png')}
                style={styles.navIcon}
                accessibilityIgnoresInvertColors
                alt=""
              />
              <ThemedText type="heading">Goalpot</ThemedText>
            </View>
            <TextButton title="Open the app" onPress={onGetStarted} />
          </View>

          <View style={styles.hero}>
            <ThemedText type="hero" style={styles.center} accessibilityRole="header">
              Save for the things you want.
            </ThemedText>
            <ThemedText themeColor="textSecondary" style={[styles.center, styles.lead]}>
              Set a goal, log what you save, and see exactly how much to put aside each month to get
              there on time.
            </ThemedText>
            <View style={[styles.actions, wide && styles.actionsWide]}>
              <View style={wide ? styles.actionWide : undefined}>
                <Button
                  title="Get started"
                  onPress={onGetStarted}
                  accessibilityHint="Starts setting up Goalpot"
                />
              </View>
              <View style={wide ? styles.actionWide : undefined}>
                <Button
                  title="Try the demo"
                  variant="secondary"
                  onPress={onTryDemo}
                  accessibilityHint="Opens the app filled with sample data"
                />
              </View>
            </View>
            <ThemedText type="small" themeColor="textSecondary" style={styles.center}>
              Free · No sign-up · Works on any phone or computer
            </ThemedText>
          </View>
        </View>

        {SCREENSHOTS.length > 0 && (
          <ScrollView
            horizontal={!wide}
            showsHorizontalScrollIndicator={false}
            snapToInterval={wide ? undefined : shotWidth + Spacing.three}
            decelerationRate="fast"
            contentContainerStyle={[styles.shots, wide && styles.shotsWide]}>
            {SCREENSHOTS.map((shot) => (
              <View key={shot.label} style={styles.shot}>
                <View
                  style={[
                    styles.frame,
                    {
                      borderColor: theme.backgroundSelected,
                      backgroundColor: theme.backgroundSelected,
                    },
                  ]}>
                  <Image
                    source={shot[scheme]}
                    style={[styles.shotImage, { width: shotWidth, height: shotWidth * SHOT_RATIO }]}
                    accessibilityLabel={`Screenshot: ${shot.label}`}
                    alt={`Screenshot: ${shot.label}`}
                  />
                </View>
                <ThemedText type="small" themeColor="textSecondary">
                  {shot.label}
                </ThemedText>
              </View>
            ))}
          </ScrollView>
        )}

        <View style={styles.column}>
          <FeatureShowcase wide={wide} />

          <View style={[styles.pair, wide && styles.pairWide]}>
            <Card title="Private by design" style={wide ? styles.flex : undefined}>
              <ThemedText themeColor="textSecondary">
                No account, no sign-up and no servers. Your goals, income and savings are stored
                only on your device, and nobody else can see them. You can export a backup file
                whenever you like.
              </ThemedText>
            </Card>

            <Card title="Add it to your home screen" style={wide ? styles.flex : undefined}>
              <ThemedText themeColor="textSecondary">
                Goalpot works like a normal app, full screen and with its own icon.
              </ThemedText>
              <View style={styles.steps}>
                <ThemedText type="defaultBold">iPhone</ThemedText>
                <ThemedText themeColor="textSecondary">
                  Open this page in Safari, tap the Share button, then “Add to Home Screen”.
                </ThemedText>
                <ThemedText type="defaultBold">Android</ThemedText>
                <ThemedText themeColor="textSecondary">
                  Open this page in Chrome, tap the ⋮ menu, then “Add to Home screen”.
                </ThemedText>
              </View>
            </Card>
          </View>

          <View style={styles.hero}>
            <ThemedText type="title" style={styles.center} accessibilityRole="header">
              Ready to start?
            </ThemedText>
            <View style={[styles.actions, wide && styles.actionsWide]}>
              <View style={wide ? styles.actionWide : undefined}>
                <Button title="Get started" onPress={onGetStarted} />
              </View>
              <View style={wide ? styles.actionWide : undefined}>
                <Button title="Try the demo" variant="secondary" onPress={onTryDemo} />
              </View>
            </View>
          </View>

          <View style={styles.footer}>
            {feedbackEnabled && (
              <TextButton
                title="Got thoughts? Send feedback"
                accessibilityHint="Opens a short feedback form"
                onPress={openFeedback}
              />
            )}
            <ThemedText type="caption" themeColor="textSecondary" style={styles.center}>
              Goalpot gives general guidance, not professional financial advice.
            </ThemedText>
          </View>
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
  },
  scroll: {
    paddingBottom: Spacing.six,
    gap: Spacing.five,
  },
  column: {
    width: '100%',
    maxWidth: 960,
    alignSelf: 'center',
    paddingHorizontal: ScreenPadding,
    gap: Spacing.five,
  },
  nav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Spacing.three,
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  navIcon: {
    width: 36,
    height: 36,
    borderRadius: Radius.small,
  },
  hero: {
    gap: Spacing.three,
    alignItems: 'center',
    maxWidth: 640,
    alignSelf: 'center',
    width: '100%',
  },
  lead: {
    maxWidth: 520,
  },
  center: {
    textAlign: 'center',
  },
  actions: {
    gap: Spacing.two,
    alignSelf: 'stretch',
  },
  actionsWide: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  actionWide: {
    width: 200,
  },
  shots: {
    gap: Spacing.three,
    paddingHorizontal: ScreenPadding,
  },
  shotsWide: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.five,
  },
  shot: {
    alignItems: 'center',
    gap: Spacing.two,
  },
  frame: {
    borderWidth: 6,
    borderRadius: 34,
    overflow: 'hidden',
  },
  shotImage: {
    borderRadius: 28,
  },
  pair: {
    gap: Spacing.three,
  },
  pairWide: {
    flexDirection: 'row',
  },
  flex: {
    flex: 1,
  },
  steps: {
    gap: Spacing.one,
  },
  footer: {
    alignItems: 'center',
    gap: Spacing.two,
  },
});
