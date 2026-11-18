import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { AdviceNote } from '@/components/budget/advice-note';
import { TipCard } from '@/components/budget/tip-card';
import { GoalProgressBars } from '@/components/charts/goal-progress-bars';
import { SavingsSummary } from '@/components/home/savings-summary';
import { ReminderMessages } from '@/components/reminders/reminder-messages';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Screen } from '@/components/ui/screen';
import { TextButton } from '@/components/ui/text-button';
import { Spacing } from '@/constants/theme';
import {
  useAbout,
  useAppActions,
  useContributions,
  useCurrency,
  useGoals,
  useProfile,
  useReminderPromptDismissed,
  useReminderSettings,
} from '@/hooks/use-app-data';
import { notificationsSupported } from '@/services/notifications';
import { budgetSplit, incomeLevel, tipOfTheDay } from '@/utils/budget';
import { summariseGoals } from '@/utils/charts';
import { nowIsoTimestamp } from '@/utils/dates';
import { formatMoney } from '@/utils/money';
import {
  emergencyFundTarget,
  FOCUS_INFO,
  goalEmojiForFocus,
  shouldSuggestEmergencyFund,
} from '@/utils/personal';
import { reminderMessages } from '@/utils/reminders';

function greeting(hour = new Date().getHours()): string {
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

export default function HomeScreen() {
  const profile = useProfile();
  const goals = useGoals();
  const contributions = useContributions();
  const currency = useCurrency();
  const reminderSettings = useReminderSettings();
  const promptDismissed = useReminderPromptDismissed();
  const about = useAbout();
  const { dismissReminderPrompt, updateAbout } = useAppActions();

  const summary = summariseGoals(goals, contributions);
  const reminders = reminderMessages(goals, contributions, currency, undefined, 2);
  // Without an income we can't pick income-specific tips, so use the middle set.
  const tip = tipOfTheDay(
    profile.monthlyIncome === null ? 'middle' : incomeLevel(profile.monthlyIncome, currency),
  );
  // Suggest reminders once there's a goal to be reminded about. Never on first launch.
  const showReminderPrompt =
    notificationsSupported && goals.length > 0 && !reminderSettings.enabled && !promptDismissed;

  // Personalised from "About you".
  const focus = about.focus ? FOCUS_INFO[about.focus] : null;
  const income = profile.monthlyIncome;
  const emergencyTarget =
    income && income > 0 ? emergencyFundTarget(budgetSplit(income, about.budgetStyle).needs) : null;
  const emergencyGoal = {
    name: 'Emergency fund',
    emoji: '🛟',
    ...(emergencyTarget ? { target: String(emergencyTarget) } : {}),
  };
  const starterGoal =
    about.focus === 'emergency'
      ? emergencyGoal
      : focus && about.focus
        ? { name: focus.goalName, emoji: goalEmojiForFocus(about.focus) }
        : null;
  const showEmergencyCard =
    shouldSuggestEmergencyFund(about, goals) && !(goals.length === 0 && about.focus === 'emergency');
  const subtitle =
    focus && summary.totalSaved > 0
      ? `${greeting()}. You’re ${formatMoney(summary.totalSaved, currency)} closer to ${focus.closerTo}.`
      : `${greeting()}. Here’s how your saving is going.`;

  return (
    <Screen
      title={`Hi ${profile.name} 👋`}
      subtitle={subtitle}>
      {about.askedAt === null && (
        <Card
          title="Make Goalpot yours ✨"
          subtitle="Answer 5 quick questions so your budget, tips and reminders fit you. Every question is optional."
          index={0}>
          <View style={styles.buttonRow}>
            <View style={styles.flex}>
              <Button
                title="Not now"
                variant="secondary"
                onPress={() => updateAbout({ askedAt: nowIsoTimestamp() })}
                accessibilityHint="You can answer later in Settings, About you"
              />
            </View>
            <View style={styles.flex}>
              <Button title="Let’s go" onPress={() => router.push('/about-you')} />
            </View>
          </View>
        </Card>
      )}

      {goals.length === 0 ? (
        starterGoal && focus ? (
          <EmptyState
            emoji={starterGoal.emoji}
            title="Let’s set up your first goal"
            message={`You said you’re saving for ${focus.label.toLowerCase()}, so we’ve filled in a goal to get you started. Change anything you like.`}
            actionTitle={`Create “${starterGoal.name}”`}
            onAction={() => router.push({ pathname: '/goal-editor', params: starterGoal })}
          />
        ) : (
          <EmptyState
            emoji="🌱"
            title="Your savings will show up here"
            message="Create a goal to start tracking how much you’ve saved and how close you are."
            actionTitle="Create a goal"
            onAction={() => router.push('/goal-editor')}
          />
        )
      ) : (
        <>
          <SavingsSummary summary={summary} goalCount={goals.length} currency={currency} />

          <Card title="Progress by goal" subtitle="Most complete first" index={2}>
            {summary.totalSaved === 0 && (
              <ThemedText type="small" themeColor="textSecondary">
                Nothing saved yet. Open a goal and tap “Add money” to fill these bars.
              </ThemedText>
            )}
            <GoalProgressBars
              rows={summary.ranked}
              currency={currency}
              onPressGoal={(goal) =>
                router.push({ pathname: '/goals/[id]', params: { id: goal.id } })
              }
            />
          </Card>

          {reminders.length > 0 && (
            <Card
              title="Reminders"
              // The web app has no notifications, so this card is where reminders live.
              subtitle={notificationsSupported ? undefined : 'Check back here for your reminders.'}
              index={3}>
              <ReminderMessages messages={reminders} />
            </Card>
          )}

          {showReminderPrompt && (
            <Card
              title="Want a gentle nudge? 🔔"
              subtitle="We can send you a weekly or monthly reminder like the ones above, so your goals stay on track."
              index={4}>
              <View style={styles.buttonRow}>
                <View style={styles.flex}>
                  <Button title="No thanks" variant="secondary" onPress={dismissReminderPrompt} />
                </View>
                <View style={styles.flex}>
                  <Button
                    title="Set up"
                    onPress={() => router.push('/reminder-setup')}
                    accessibilityHint="Explains reminders before asking for permission"
                  />
                </View>
              </View>
            </Card>
          )}
        </>
      )}

      {showEmergencyCard && (
        <Card
          title="Start an emergency fund 🛟"
          subtitle={
            emergencyTarget
              ? `Aim for about 3 months of essentials: ${formatMoney(emergencyTarget, currency)}. A small start still helps.`
              : 'Even a small buffer stops a surprise bill turning into debt.'
          }
          index={4}>
          <View style={styles.buttonRow}>
            <View style={styles.flex}>
              <Button
                title="No thanks"
                variant="secondary"
                onPress={() => updateAbout({ emergencyPromptDismissed: true })}
              />
            </View>
            <View style={styles.flex}>
              <Button
                title="Create goal"
                accessibilityHint="Opens a new goal, filled in for an emergency fund"
                onPress={() => router.push({ pathname: '/goal-editor', params: emergencyGoal })}
              />
            </View>
          </View>
        </Card>
      )}

      {tip && (
        <Card
          title="Tip of the day"
          index={5}
          action={
            <TextButton
              title="More tips"
              accessibilityHint="Opens the Budget tab"
              onPress={() => router.navigate('/budget')}
            />
          }>
          <TipCard tip={tip} />
          <AdviceNote short />
        </Card>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  buttonRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  flex: {
    flex: 1,
  },
});
