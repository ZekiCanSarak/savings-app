import { useState } from 'react';
import { Alert, Platform, StyleSheet } from 'react-native';

import { AfterTaxExplainer } from '@/components/profile/after-tax-explainer';
import { CurrencyPicker } from '@/components/profile/currency-picker';
import { ReminderSettingsSection } from '@/components/reminders/reminder-settings';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { TextField } from '@/components/ui/text-field';
import { currencyInfo } from '@/constants/currencies';
import { useAppActions, useContributions, useGoals, useProfile } from '@/hooks/use-app-data';
import { pickBackupFile, saveBackupFile } from '@/services/backup-file';
import { cancelAllReminders, notificationsSupported } from '@/services/notifications';
import type { CurrencyCode } from '@/types/models';
import { backupFileName, createBackup, parseBackup, type BackupData } from '@/utils/backup';
import {
  amountToInputText,
  MONEY_INPUT_MAX_LENGTH,
  NAME_MAX_LENGTH,
  validateIncome,
  validateName,
} from '@/utils/validation';

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

/** Yes/no dialog. Alert buttons don't work on web, so it uses window.confirm there. */
function confirmAction(title: string, message: string, confirmTitle: string, onConfirm: () => void) {
  if (Platform.OS === 'web') {
    if (window.confirm(`${title} ${message}`)) onConfirm();
    return;
  }
  Alert.alert(title, message, [
    { text: 'Cancel', style: 'cancel' },
    { text: confirmTitle, style: 'destructive', onPress: onConfirm },
  ]);
}

type DataMessage = { tone: 'success' | 'error'; text: string };

export default function SettingsScreen() {
  const profile = useProfile();
  const goals = useGoals();
  const contributions = useContributions();
  const { updateProfile, resetAllData, importBackup } = useAppActions();

  // Edits are kept here until the user taps Save.
  const [name, setName] = useState(profile.name);
  const [currency, setCurrency] = useState<CurrencyCode>(profile.currency);
  const [incomeText, setIncomeText] = useState(amountToInputText(profile.monthlyIncome));
  const [nameError, setNameError] = useState<string | null>(null);
  const [incomeError, setIncomeError] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState(false);
  const [dataMessage, setDataMessage] = useState<DataMessage | null>(null);

  const hasChanges =
    name !== profile.name ||
    currency !== profile.currency ||
    incomeText !== amountToInputText(profile.monthlyIncome);

  function handleSave() {
    const nameResult = validateName(name);
    const incomeResult = validateIncome(incomeText);
    setNameError(nameResult.ok ? null : nameResult.error);
    setIncomeError(incomeResult.ok ? null : incomeResult.error);
    if (!nameResult.ok || !incomeResult.ok) return;

    updateProfile({ name: nameResult.value, currency, monthlyIncome: incomeResult.value });
    // Show the cleaned-up values (e.g. trimmed name, '1850.5' → '1850.50').
    setName(nameResult.value);
    setIncomeText(amountToInputText(incomeResult.value));
    setJustSaved(true);
  }

  function handleReset() {
    setDataMessage(null);
    const message =
      `This permanently deletes your profile, ${plural(goals.length, 'goal')} and ` +
      `${plural(contributions.length, 'saving')} from this device, and turns off reminders. ` +
      'You’ll start again from the welcome screen. This can’t be undone.';
    confirmAction('Reset all data?', message, 'Reset everything', async () => {
      // Cancel first: once data is reset, the reminder scheduler is no longer running.
      await cancelAllReminders();
      resetAllData();
    });
  }

  async function handleExport() {
    setDataMessage(null);
    try {
      // Saves what's stored, not unsaved edits in the form above.
      await saveBackupFile(backupFileName(), createBackup({ profile, goals, contributions }));
    } catch (error) {
      console.warn('Export failed', error);
      setDataMessage({ tone: 'error', text: 'Couldn’t export your data. Please try again.' });
    }
  }

  async function handleImport() {
    setDataMessage(null);
    let text: string | null;
    try {
      // Opened before confirming: web browsers only show a file picker straight after a tap.
      text = await pickBackupFile();
    } catch (error) {
      console.warn('Import failed', error);
      setDataMessage({ tone: 'error', text: 'Couldn’t open that file. Please try again.' });
      return;
    }
    if (text === null) return;

    const result = parseBackup(text);
    if (!result.ok) {
      setDataMessage({ tone: 'error', text: result.error });
      return;
    }
    // Keep the current name if the backup somehow has none, so Home can still greet you.
    const backup: BackupData = {
      ...result.value,
      profile: { ...result.value.profile, name: result.value.profile.name.trim() || profile.name },
    };
    const message =
      `This replaces your details, ${plural(goals.length, 'goal')} and ` +
      `${plural(contributions.length, 'saving')} on this device with the backup’s ` +
      `${plural(backup.goals.length, 'goal')} and ${plural(backup.contributions.length, 'saving')}. ` +
      'This can’t be undone.';
    confirmAction('Import this backup?', message, 'Import', () => {
      importBackup(backup);
      // Show the imported details in the form.
      setName(backup.profile.name);
      setCurrency(backup.profile.currency);
      setIncomeText(amountToInputText(backup.profile.monthlyIncome));
      setNameError(null);
      setIncomeError(null);
      setJustSaved(false);
      setDataMessage({
        tone: 'success',
        text: `Imported ${plural(backup.goals.length, 'goal')} and ${plural(backup.contributions.length, 'saving')} ✓`,
      });
    });
  }

  // Any edit clears the "Saved" message.
  function edited<T>(setter: (value: T) => void) {
    return (value: T) => {
      setter(value);
      setJustSaved(false);
    };
  }

  return (
    <Screen title="Settings" keyboard>
      <Card title="Your details" index={0}>
        <TextField
          label="Name"
          value={name}
          onChangeText={edited((text: string) => {
            setName(text);
            setNameError(null);
          })}
          error={nameError}
          autoCapitalize="words"
          autoComplete="given-name"
          maxLength={NAME_MAX_LENGTH + 10}
        />
        <TextField
          label="Monthly income after tax"
          value={incomeText}
          onChangeText={edited((text: string) => {
            setIncomeText(text);
            setIncomeError(null);
          })}
          error={incomeError}
          prefix={currencyInfo(currency).symbol}
          keyboardType="decimal-pad"
          maxLength={MONEY_INPUT_MAX_LENGTH}
        />
        <AfterTaxExplainer />
      </Card>

      <Card
        title="Currency"
        subtitle="Changing currency only changes how amounts are shown. They aren’t converted."
        index={1}>
        <CurrencyPicker value={currency} onChange={edited(setCurrency)} />
      </Card>

      <Button title="Save changes" onPress={handleSave} disabled={!hasChanges} />
      {justSaved && (
        <ThemedText
          type="smallBold"
          themeColor="tint"
          style={styles.center}
          accessibilityLiveRegion="polite"
          accessibilityRole="alert">
          Saved ✓
        </ThemedText>
      )}

      {/* The web app can't send notifications; its reminders show on Home instead. */}
      {notificationsSupported && (
        <Card title="Reminders" subtitle="Changes here save straight away." index={2}>
          <ReminderSettingsSection />
        </Card>
      )}

      <Card
        title="Your data"
        subtitle="Everything is stored only on this device. Export a backup file to keep a copy or move to another device."
        index={3}>
        <Button
          title="Export my data"
          variant="secondary"
          onPress={() => void handleExport()}
          accessibilityHint="Saves your goals and savings to a backup file"
        />
        <Button
          title="Import my data"
          variant="secondary"
          onPress={() => void handleImport()}
          accessibilityHint="Choose a backup file. Asks before replacing your current data"
        />
        {dataMessage && (
          <ThemedText
            type="smallBold"
            themeColor={dataMessage.tone === 'error' ? 'danger' : 'tint'}
            accessibilityLiveRegion="polite"
            accessibilityRole="alert">
            {dataMessage.text}
          </ThemedText>
        )}
        <Button
          title="Reset all data"
          variant="danger"
          onPress={handleReset}
          accessibilityHint="Asks for confirmation before deleting everything"
        />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: {
    textAlign: 'center',
  },
});
