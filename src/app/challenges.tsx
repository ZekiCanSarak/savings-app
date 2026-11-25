import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { AdviceNote } from '@/components/budget/advice-note';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ChoiceChips } from '@/components/ui/choice-chips';
import { ModalHeader } from '@/components/ui/modal-header';
import { OptionList } from '@/components/ui/option-list';
import { ProgressBar } from '@/components/ui/progress-bar';
import { SafeAreaView } from '@/components/ui/safe-area-view';
import { TextButton } from '@/components/ui/text-button';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import {
  useAppActions,
  useChallenges,
  useContributions,
  useCurrency,
  useGoals,
} from '@/hooks/use-app-data';
import type { ChallengeKind } from '@/types/models';
import {
  CHALLENGE_KINDS,
  CHALLENGES,
  challengeProgress,
  challengeTotal,
  challengeUnits,
  defaultChallengeUnit,
  stepAmount,
} from '@/utils/challenges';
import { activeGoals, amountRemaining } from '@/utils/goals';
import { formatMoney } from '@/utils/money';

function close() {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}

/**
 * Savings challenges: the user's current ones, and starting a new one
 * (pick a challenge, a step size and the goal it saves towards).
 */
export default function ChallengesScreen() {
  const currency = useCurrency();
  const goals = activeGoals(useGoals());
  const contributions = useContributions();
  const challenges = useChallenges();
  const { startChallenge } = useAppActions();
  const money = (amount: number) => formatMoney(amount, currency);

  const [kind, setKind] = useState<ChallengeKind>('52-week');
  const [unit, setUnit] = useState(() => defaultChallengeUnit('52-week', currency));
  const [goalId, setGoalId] = useState<string | null>(null);

  const info = CHALLENGES[kind];
  const total = challengeTotal(kind, unit);
  const activeGoalIds = new Set(goals.map((g) => g.id));
  const current = challenges.filter((c) => activeGoalIds.has(c.goalId));
  const busy = new Set(current.map((c) => c.goalId));
  // One challenge per goal, and only for goals that still need money.
  const available = goals.filter((g) => !busy.has(g.id) && amountRemaining(g, contributions) > 0);
  const chosenGoal = available.find((g) => g.id === goalId) ?? null;

  function pickKind(next: ChallengeKind) {
    setKind(next);
    setUnit(defaultChallengeUnit(next, currency));
  }

  function start() {
    if (!chosenGoal) return;
    const id = startChallenge(kind, chosenGoal.id, unit);
    router.replace({ pathname: '/challenge', params: { id } });
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ModalHeader title="Savings challenges" onClose={close} closeLabel="Close" />
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {current.length > 0 && (
            <Card title="Your challenges" index={0}>
              {current.map((c) => {
                const goal = goals.find((g) => g.id === c.goalId);
                const p = challengeProgress(c, contributions);
                return (
                  <View key={c.id} style={styles.currentRow}>
                    <ThemedText type="defaultBold">
                      {CHALLENGES[c.kind].emoji} {CHALLENGES[c.kind].name} · {goal?.name}
                    </ThemedText>
                    <ProgressBar
                      percent={p.percent}
                      accessibilityLabel={`${p.done} of ${p.steps} done`}
                    />
                    <View style={styles.row}>
                      <ThemedText type="small" themeColor="textSecondary">
                        {p.done} of {p.steps} done · {money(p.saved)} saved
                      </ThemedText>
                      <TextButton
                        title="Open"
                        accessibilityHint={`Opens your ${CHALLENGES[c.kind].name}`}
                        onPress={() =>
                          router.push({ pathname: '/challenge', params: { id: c.id } })
                        }
                      />
                    </View>
                  </View>
                );
              })}
            </Card>
          )}

          <Card
            title="Start a challenge"
            subtitle="Tick off each step as you save it. Every tick is logged to your goal."
            index={1}>
            <OptionList
              label="Choose a challenge"
              value={kind}
              onChange={pickKind}
              options={CHALLENGE_KINDS.map((k) => ({
                value: k,
                label: CHALLENGES[k].name,
                emoji: CHALLENGES[k].emoji,
                description: CHALLENGES[k].describe(
                  money(stepAmount(k, 1, defaultChallengeUnit(k, currency))),
                  money(stepAmount(k, CHALLENGES[k].steps, defaultChallengeUnit(k, currency))),
                ),
              }))}
            />
            <ChoiceChips
              label={kind === 'daily' ? 'How much a day?' : 'Step size'}
              value={unit}
              onChange={setUnit}
              options={challengeUnits(kind, currency).map((u) => ({
                value: u,
                label: money(u),
                accessibilityLabel: `${money(u)}, ${money(challengeTotal(kind, u))} in all`,
              }))}
            />
            <ThemedText accessibilityLiveRegion="polite">
              {info.describe(
                money(stepAmount(kind, 1, unit)),
                money(stepAmount(kind, info.steps, unit)),
              )}{' '}
              That’s <ThemedText type="defaultBold">{money(total)}</ThemedText> in all.
            </ThemedText>
          </Card>

          <Card
            title="Which goal is it for?"
            subtitle="The money you save goes into this goal."
            index={2}>
            {available.length > 0 ? (
              <OptionList
                label="Which goal is it for?"
                value={goalId}
                onChange={setGoalId}
                options={available.map((g) => ({
                  value: g.id,
                  label: g.name,
                  emoji: g.emoji,
                  description: `${money(amountRemaining(g, contributions))} left to save`,
                }))}
              />
            ) : (
              <ThemedText themeColor="textSecondary">
                {goals.length === 0
                  ? 'You don’t have a goal yet.'
                  : 'Each of your goals already has a challenge or is reached.'}
              </ThemedText>
            )}
            <TextButton
              title="Create a new goal for it"
              accessibilityHint={`Opens a new goal for ${money(total)}`}
              onPress={() =>
                router.push({
                  pathname: '/goal-editor',
                  params: { name: info.name, emoji: '🎯', target: String(total) },
                })
              }
            />
          </Card>
          <AdviceNote short />
        </ScrollView>
        <View style={styles.footer}>
          <Button
            title={chosenGoal ? `Start for ${chosenGoal.name}` : 'Choose a goal to start'}
            disabled={!chosenGoal}
            onPress={start}
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
  safeArea: {
    flex: 1,
    maxWidth: MaxContentWidth,
  },
  content: {
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.four,
  },
  currentRow: {
    gap: Spacing.two,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  footer: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
  },
});
