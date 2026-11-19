import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Spacing } from '@/constants/theme';
import {
  useAppActions,
  useBackupPrompt,
  useContributions,
  useFeedbackPrompt,
  useIsDemo,
} from '@/hooks/use-app-data';
import { useExportBackup } from '@/hooks/use-export-backup';
import { shouldRemindBackup } from '@/utils/backup';

/**
 * Home: once a month, suggests exporting a backup. Everything lives only on
 * this device, so a backup file is the only way back after losing a phone or
 * clearing the browser.
 */
export function BackupReminderCard({ index }: { index: number }) {
  const { lastBackupAt, snoozedAt } = useBackupPrompt();
  const { startedAt } = useFeedbackPrompt();
  const contributions = useContributions();
  const demo = useIsDemo();
  const { snoozeBackupPrompt } = useAppActions();
  const exportBackup = useExportBackup();
  const [failed, setFailed] = useState(false);

  const show = shouldRemindBackup({
    lastBackupAt,
    snoozedAt,
    startedAt,
    hasSavings: contributions.length > 0,
    demo,
  });
  if (!show) return null;

  return (
    <Card
      title="Back up your savings"
      subtitle={
        lastBackupAt
          ? 'It’s been a month since your last backup. A fresh copy means you won’t lose anything if your phone is lost or your browser is cleared.'
          : 'Your savings are stored only on this device. A backup file lets you get everything back if your phone is lost or your browser is cleared.'
      }
      index={index}>
      {failed && (
        <ThemedText type="smallBold" themeColor="danger" accessibilityRole="alert">
          Couldn’t export your data. Please try again.
        </ThemedText>
      )}
      <View style={styles.row}>
        <View style={styles.flex}>
          <Button
            title="Later"
            variant="secondary"
            onPress={snoozeBackupPrompt}
            accessibilityHint="Reminds you again in a month"
          />
        </View>
        <View style={styles.flex}>
          <Button
            title="Back up now"
            accessibilityHint="Saves your goals and savings to a backup file"
            onPress={async () => setFailed(!(await exportBackup()))}
          />
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  flex: {
    flex: 1,
  },
});
