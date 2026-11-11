import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Switch, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { ChoiceChips } from '@/components/ui/choice-chips';
import { ValueStepper } from '@/components/ui/value-stepper';
import { Spacing } from '@/constants/theme';
import {
  useAppActions,
  useContributions,
  useCurrency,
  useGoals,
  useReminderSettings,
} from '@/hooks/use-app-data';
import { useNotificationPermission } from '@/hooks/use-notification-permission';
import { useTheme } from '@/hooks/use-theme';
import { notificationsSupported, sendTestReminder } from '@/services/notifications';
import type { ReminderFrequency } from '@/types/models';
import { describeSchedule, formatTime, notificationMessage, ordinal } from '@/utils/reminders';

const TIME_STEP_MINUTES = 30;
const MINUTES_PER_DAY = 24 * 60;

// Monday first (UK convention). Values use expo-notifications' 1 = Sunday numbering.
const WEEKDAY_OPTIONS = [
  { value: 2, label: 'Mon', accessibilityLabel: 'Monday' },
  { value: 3, label: 'Tue', accessibilityLabel: 'Tuesday' },
  { value: 4, label: 'Wed', accessibilityLabel: 'Wednesday' },
  { value: 5, label: 'Thu', accessibilityLabel: 'Thursday' },
  { value: 6, label: 'Fri', accessibilityLabel: 'Friday' },
  { value: 7, label: 'Sat', accessibilityLabel: 'Saturday' },
  { value: 1, label: 'Sun', accessibilityLabel: 'Sunday' },
];

/**
 * The Reminders section of Settings. Changes save straight away (no Save
 * button) and the reminder is rescheduled automatically by useReminderScheduler.
 */
export function ReminderSettingsSection() {
  const theme = useTheme();
  const settings = useReminderSettings();
  const goals = useGoals();
  const contributions = useContributions();
  const currency = useCurrency();
  const { updateReminders } = useAppActions();
  const { permission } = useNotificationPermission();
  const [testSent, setTestSent] = useState(false);

  if (!notificationsSupported) {
    return (
      <ThemedText type="small" themeColor="textSecondary">
        Reminders work in the phone app, not in a web browser.
      </ThemedText>
    );
  }

  const blocked = permission === 'denied';
  const isOn = settings.enabled && permission === 'granted';

  function handleToggle(on: boolean) {
    if (!on) {
      updateReminders({ enabled: false });
      return;
    }
    if (permission === 'granted') updateReminders({ enabled: true });
    // Explain first; that screen asks for permission and turns reminders on.
    else router.push('/reminder-setup');
  }

  function stepTime(direction: 1 | -1) {
    const total =
      (settings.hour * 60 + settings.minute + direction * TIME_STEP_MINUTES + MINUTES_PER_DAY) %
      MINUTES_PER_DAY;
    // Snap to the step, in case an odd time was saved.
    const snapped = Math.round(total / TIME_STEP_MINUTES) * TIME_STEP_MINUTES % MINUTES_PER_DAY;
    updateReminders({ hour: Math.floor(snapped / 60), minute: snapped % 60 });
  }

  async function handleTest() {
    await sendTestReminder(notificationMessage(goals, contributions, currency), 5);
    setTestSent(true);
  }

  return (
    <View style={styles.wrapper}>
      <View style={styles.toggleRow}>
        <View style={styles.flex}>
          <ThemedText type="smallBold">Savings reminders</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {isOn ? describeSchedule(settings) : 'A gentle nudge about the goal that most needs attention.'}
          </ThemedText>
        </View>
        <Switch
          accessibilityLabel="Savings reminders"
          value={isOn}
          onValueChange={handleToggle}
          trackColor={{ true: theme.tint }}
        />
      </View>

      {settings.enabled && blocked && (
        <ThemedView type="backgroundElement" style={styles.card}>
          <ThemedText type="smallBold">Notifications are blocked</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Reminders are on, but notifications for this app are switched off in your phone’s
            settings, so nothing will arrive.
          </ThemedText>
          <Button title="Open phone settings" onPress={() => Linking.openSettings()} />
        </ThemedView>
      )}

      {isOn && (
        <>
          <ChoiceChips<ReminderFrequency>
            label="How often"
            options={[
              { value: 'weekly', label: 'Weekly' },
              { value: 'monthly', label: 'Monthly' },
            ]}
            value={settings.frequency}
            onChange={(frequency) => updateReminders({ frequency })}
          />

          {settings.frequency === 'weekly' ? (
            <ChoiceChips<number>
              label="Day"
              options={WEEKDAY_OPTIONS}
              value={settings.weekday}
              onChange={(weekday) => updateReminders({ weekday })}
            />
          ) : (
            <ValueStepper
              label="Day of the month"
              valueText={ordinal(settings.dayOfMonth)}
              onPrevious={() => updateReminders({ dayOfMonth: settings.dayOfMonth - 1 })}
              onNext={() => updateReminders({ dayOfMonth: settings.dayOfMonth + 1 })}
              canGoPrevious={settings.dayOfMonth > 1}
              canGoNext={settings.dayOfMonth < 28}
              previousLabel="Earlier day"
              nextLabel="Later day"
            />
          )}
          {settings.frequency === 'monthly' && (
            <ThemedText type="small" themeColor="textSecondary">
              Tip: choose the day after payday. Days go up to the 28th so every month has one.
            </ThemedText>
          )}

          <ValueStepper
            label="Time"
            valueText={formatTime(settings.hour, settings.minute)}
            onPrevious={() => stepTime(-1)}
            onNext={() => stepTime(1)}
            previousLabel="Earlier"
            nextLabel="Later"
          />

          <Button title="Send a test reminder" variant="secondary" onPress={handleTest} />
          {testSent && (
            <ThemedText type="small" themeColor="textSecondary" accessibilityLiveRegion="polite">
              Sent! It arrives in about 5 seconds. Go to your home screen or lock your phone to see
              it as a normal notification.
            </ThemedText>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: Spacing.three,
  },
  flex: {
    flex: 1,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  card: {
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Spacing.three,
  },
});
