import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ReminderPreview } from '@/components/reminders/reminder-preview';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import {
  useAppActions,
  useContributions,
  useCurrency,
  useGoals,
  useReminderSettings,
} from '@/hooks/use-app-data';
import { useNotificationPermission } from '@/hooks/use-notification-permission';
import { notificationsSupported, requestPermission } from '@/services/notifications';
import { describeSchedule, notificationMessage } from '@/utils/reminders';

function close() {
  if (router.canGoBack()) router.back();
  else router.replace('/settings');
}

/**
 * Explains reminders BEFORE the system permission prompt appears, so the user
 * knows what they're agreeing to. Opened from Settings or the Home suggestion.
 */
export default function ReminderSetupScreen() {
  const goals = useGoals();
  const contributions = useContributions();
  const currency = useCurrency();
  const settings = useReminderSettings();
  const { updateReminders, dismissReminderPrompt } = useAppActions();
  const { permission, refresh } = useNotificationPermission();
  const [asking, setAsking] = useState(false);

  const preview = notificationMessage(goals, contributions, currency);
  const blocked = permission === 'denied';

  async function handleTurnOn() {
    setAsking(true);
    try {
      const result = permission === 'granted' ? 'granted' : await requestPermission();
      if (result === 'granted') {
        updateReminders({ enabled: true });
        dismissReminderPrompt();
        close();
      } else {
        await refresh();
      }
    } finally {
      setAsking(false);
    }
  }

  function handleNotNow() {
    dismissReminderPrompt();
    close();
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.topBar}>
          <Pressable
            accessibilityRole="button"
            onPress={close}
            hitSlop={12}
            style={({ pressed }) => [styles.topBarSide, pressed && styles.pressed]}>
            <ThemedText themeColor="tint">Close</ThemedText>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          <ThemedText style={styles.bell}>🔔</ThemedText>
          <ThemedText type="subtitle" style={styles.center}>
            Gentle savings reminders
          </ThemedText>
          <ThemedText themeColor="textSecondary" style={styles.center}>
            We’ll send you a short nudge about the goal that most needs attention, so saving stays
            on your radar.
          </ThemedText>

          <ThemedView type="backgroundElement" style={styles.card}>
            <ThemedText type="small" themeColor="textSecondary">
              Your reminder would look like this:
            </ThemedText>
            <ReminderPreview message={preview} />
          </ThemedView>

          <View style={styles.points}>
            <Point icon="🗓️" text={`${describeSchedule(settings)}. You can change this in Settings.`} />
            <Point icon="🔒" text="Created on your phone. Nothing is sent to a server." />
            <Point icon="🙅" text="No marketing, ever. Turn it off any time." />
          </View>

          {!notificationsSupported ? (
            <ThemedText themeColor="textSecondary" style={styles.center}>
              Reminders work in the phone app, not in a web browser.
            </ThemedText>
          ) : blocked ? (
            <ThemedView type="backgroundElement" style={styles.card}>
              <ThemedText type="smallBold">Notifications are switched off for this app</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                To get reminders, allow notifications in your phone’s settings, then come back
                here.
              </ThemedText>
              <Button title="Open phone settings" onPress={() => Linking.openSettings()} />
            </ThemedView>
          ) : null}
        </ScrollView>

        <View style={styles.footer}>
          {notificationsSupported && !blocked && (
            <Button
              title={asking ? 'Just a moment…' : 'Turn on reminders'}
              onPress={handleTurnOn}
              disabled={asking}
            />
          )}
          <Button title="Not now" variant="secondary" onPress={handleNotNow} />
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

function Point({ icon, text }: { icon: string; text: string }) {
  return (
    <View style={styles.point}>
      <ThemedText style={styles.pointIcon}>{icon}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary" style={styles.flex}>
        {text}
      </ThemedText>
    </View>
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
  flex: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.four,
    minHeight: 52,
    alignItems: 'center',
  },
  topBarSide: {
    minHeight: 44,
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.6,
  },
  content: {
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.four,
  },
  bell: {
    fontSize: 56,
    lineHeight: 68,
    textAlign: 'center',
  },
  center: {
    textAlign: 'center',
  },
  card: {
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Spacing.four,
  },
  points: {
    gap: Spacing.two,
  },
  point: {
    flexDirection: 'row',
    gap: Spacing.three,
    alignItems: 'flex-start',
  },
  pointIcon: {
    fontSize: 18,
    lineHeight: 22,
  },
  footer: {
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
  },
});
