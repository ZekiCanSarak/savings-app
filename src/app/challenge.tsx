import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { GoalAvatar } from '@/components/goals/goal-avatar';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ModalHeader } from '@/components/ui/modal-header';
import { ProgressBar } from '@/components/ui/progress-bar';
import { SafeAreaView } from '@/components/ui/safe-area-view';
import { MaxContentWidth, MinTapSize, Radius, Spacing } from '@/constants/theme';
import {
  useAppActions,
  useChallenge,
  useContributions,
  useCurrency,
  useGoal,
} from '@/hooks/use-app-data';
import { useTheme } from '@/hooks/use-theme';
import { confirmAction } from '@/services/confirm';
import { CHALLENGES, challengeProgress, doneSteps, nextStep, stepAmount } from '@/utils/challenges';
import { formatMoney } from '@/utils/money';

function close() {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}

/** One savings challenge (?id=): tap a step to tick it, which logs that saving to the goal. */
export default function ChallengeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const challenge = useChallenge(id ?? '');
  const goal = useGoal(challenge?.goalId ?? '');
  const contributions = useContributions();
  const currency = useCurrency();
  const theme = useTheme();
  const { toggleChallengeStep, endChallenge } = useAppActions();

  if (!challenge || !goal) {
    return (
      <ThemedView style={[styles.container, styles.notFound]}>
        <ThemedText themeColor="textSecondary">This challenge doesn’t exist any more.</ThemedText>
        <Button title="Close" variant="secondary" onPress={close} />
      </ThemedView>
    );
  }

  const money = (amount: number) => formatMoney(amount, currency);
  const info = CHALLENGES[challenge.kind];
  const progress = challengeProgress(challenge, contributions);
  const done = new Set(doneSteps(challenge, contributions));
  const next = nextStep(challenge, contributions);
  const steps = Array.from({ length: info.steps }, (_, i) => i + 1);

  function confirmEnd() {
    if (!challenge) return;
    confirmAction(
      'End this challenge?',
      'The savings you’ve already ticked stay in your goal.',
      'End challenge',
      () => {
        close();
        endChallenge(challenge.id);
      },
    );
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ModalHeader title={info.name} onClose={close} closeLabel="Close" />
        <ScrollView contentContainerStyle={styles.content}>
          <Card index={0}>
            <View style={styles.goalRow}>
              <GoalAvatar
                emoji={goal.emoji}
                image={goal.image}
                size={48}
                radius={Radius.control}
                backgroundColor={theme.background}
              />
              <View style={styles.flex}>
                <ThemedText type="small" themeColor="textSecondary">
                  Saving for
                </ThemedText>
                <ThemedText type="heading">{goal.name}</ThemedText>
              </View>
            </View>
            <View
              accessible
              accessibilityLabel={`${money(progress.saved)} saved of ${money(progress.total)}. ${progress.done} of ${progress.steps} done.`}>
              <ThemedText type="title">{money(progress.saved)}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                of {money(progress.total)} · {progress.done} of {progress.steps} done
              </ThemedText>
            </View>
            <ProgressBar
              percent={progress.percent}
              height={12}
              accessibilityLabel="Challenge progress"
            />
            <ThemedText
              themeColor={progress.finished ? 'tint' : 'textSecondary'}
              accessibilityLiveRegion="polite">
              {progress.finished
                ? 'Challenge complete! 🎉 Amazing commitment.'
                : next !== null
                  ? `Next up: ${info.stepLabel(next)} (${money(stepAmount(challenge.kind, next, challenge.unit))}). Tap a step when you’ve saved it.`
                  : 'Tap any envelope when you’ve saved that amount.'}
            </ThemedText>
          </Card>

          <View style={styles.grid} accessibilityLabel={`${info.name} steps`}>
            {steps.map((step) => {
              const ticked = done.has(step);
              const amount = stepAmount(challenge.kind, step, challenge.unit);
              return (
                <Pressable
                  key={step}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: ticked }}
                  accessibilityLabel={`${info.stepLabel(step)}, ${money(amount)}`}
                  accessibilityHint={
                    ticked
                      ? 'Unticks it and removes that saving'
                      : 'Ticks it and logs the saving to your goal'
                  }
                  onPress={() => toggleChallengeStep(challenge.id, step)}
                  style={({ pressed }) => [
                    styles.cell,
                    {
                      backgroundColor: ticked ? theme.tint : theme.backgroundElement,
                      borderColor: ticked || step === next ? theme.tint : theme.border,
                    },
                    pressed && styles.pressed,
                  ]}>
                  <ThemedText type="smallBold" style={ticked ? { color: theme.onTint } : undefined}>
                    {ticked ? '✓' : step}
                  </ThemedText>
                  <ThemedText
                    type="caption"
                    style={ticked ? { color: theme.onTint } : undefined}
                    themeColor={ticked ? undefined : 'textSecondary'}>
                    {money(amount)}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>

          <Button title="End challenge" variant="danger" onPress={confirmEnd} />
        </ScrollView>
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
  flex: {
    flex: 1,
  },
  content: {
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.five,
  },
  goalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
    justifyContent: 'center',
  },
  cell: {
    width: 62,
    minHeight: Math.max(MinTapSize, 58),
    paddingVertical: Spacing.one,
    borderRadius: Radius.control,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
});
