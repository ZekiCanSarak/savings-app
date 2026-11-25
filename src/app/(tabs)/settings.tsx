import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Platform, StyleSheet, Switch, View } from 'react-native';

import { AfterTaxExplainer } from '@/components/profile/after-tax-explainer';
import { CurrencyPicker } from '@/components/profile/currency-picker';
import { ReminderSettingsSection } from '@/components/reminders/reminder-settings';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { ChoiceChips } from '@/components/ui/choice-chips';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { TextField } from '@/components/ui/text-field';
import { currencyInfo } from '@/constants/currencies';
import { Spacing } from '@/constants/theme';
import {
  useAbout,
  useAppActions,
  useAppearance,
  useAppLock,
  useBackupPrompt,
  useContributions,
  useGoals,
  useProfile,
} from '@/hooks/use-app-data';
import { useExportBackup } from '@/hooks/use-export-backup';
import { useTheme } from '@/hooks/use-theme';
import { appLockSupported, authenticate, lockAvailability } from '@/services/app-lock';
import { pickBackupFile } from '@/services/backup-file';
import { cancelAllReminders, notificationsSupported } from '@/services/notifications';
import type { AboutYou, Appearance, CurrencyCode } from '@/types/models';
import { parseBackup, type BackupData } from '@/utils/backup';
import {
  BUDGET_STYLE_INFO,
  EMERGENCY_INFO,
  FOCUS_INFO,
  GUIDANCE_INFO,
  PAY_INFO,
} from '@/utils/personal';
import { formatRelativeDay, toIsoDate } from '@/utils/dates';
import { describePaySchedule } from '@/utils/payday';
import { ordinal, weekdayName } from '@/utils/reminders';
import { feedbackEnabled, openFeedback } from '@/services/feedback';
import { defaultReviewYear } from '@/utils/year-review';
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

const NOT_ANSWERED = 'Not answered';

/** One line per "About you" answer, for the summary in Settings. */
function aboutSummary(about: AboutYou): { label: string; value: string }[] {
  const pay = about.payFrequency
    ? PAY_INFO[about.payFrequency].label +
      (about.payFrequency === 'monthly' && about.payday !== null ? `, on the ${ordinal(about.payday)}` : '') +
      ((about.payFrequency === 'weekly' || about.payFrequency === 'four-weekly') && about.payWeekday !== null
        ? `, on ${weekdayName(about.payWeekday)}s`
        : '') +
      (about.payFrequency === 'irregular' &&
      about.paySchedule &&
      (about.paySchedule.kind === 'pattern' || about.paySchedule.days.length > 0)
        ? `, usually on ${describePaySchedule(about.paySchedule)}`
        : '')
    : NOT_ANSWERED;
  const style = BUDGET_STYLE_INFO[about.budgetStyle];
  return [
    { label: 'Saving for', value: about.focus ? FOCUS_INFO[about.focus].label : NOT_ANSWERED },
    { label: 'Paid', value: pay },
    {
      label: 'Emergency fund',
      value: about.emergencyFund ? EMERGENCY_INFO[about.emergencyFund].label : NOT_ANSWERED,
    },
    { label: 'Budget', value: `${style.label} (${style.name.toLowerCase()})` },
    { label: 'Help', value: about.guidance ? GUIDANCE_INFO[about.guidance].label : NOT_ANSWERED },
    { label: 'Confetti', value: about.celebrations ? 'On' : 'Off' },
  ];
}

export default function SettingsScreen() {
  const profile = useProfile();
  const goals = useGoals();
  const contributions = useContributions();
  const about = useAbout();
  const appearance = useAppearance();
  const appLock = useAppLock();
  const exportBackup = useExportBackup();
  const { lastBackupAt } = useBackupPrompt();
  const theme = useTheme();
  const { updateProfile, resetAllData, importBackup, setAppearance, setAppLock } = useAppActions();
  const [lockMessage, setLockMessage] = useState<string | null>(null);
  const reviewYear = defaultReviewYear();

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

  async function handleLockToggle(on: boolean) {
    setLockMessage(null);
    if (on && (await lockAvailability()) === 'none') {
      setLockMessage('Set up a passcode, Face ID or fingerprint on your phone first, then try again.');
      return;
    }
    // Confirm it's really the phone's owner, both to turn it on and to turn it off.
    const ok = await authenticate(on ? 'Turn on app lock' : 'Turn off app lock');
    if (ok) setAppLock(on);
    else setLockMessage('That didn’t work, so nothing changed.');
  }

  async function handleExport() {
    setDataMessage(null);
    // Saves what's stored, not unsaved edits in the form above.
    if (!(await exportBackup())) {
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

      <Card
        title="About you"
        subtitle="Your answers tailor your budget, tips, reminders and suggestions."
        index={2}>
        <View style={styles.summary}>
          {aboutSummary(about).map((row) => (
            <View
              key={row.label}
              style={styles.summaryRow}
              accessible
              accessibilityLabel={`${row.label}: ${row.value}`}>
              <ThemedText type="small" themeColor="textSecondary" style={styles.summaryLabel}>
                {row.label}
              </ThemedText>
              <ThemedText
                type="smallBold"
                themeColor={row.value === NOT_ANSWERED ? 'textSecondary' : 'text'}
                style={styles.summaryValue}>
                {row.value}
              </ThemedText>
            </View>
          ))}
        </View>
        <Button
          title="Change your answers"
          variant="secondary"
          onPress={() => router.push('/about-you')}
        />
      </Card>

      <Card title="Appearance" subtitle="System follows your phone’s light or dark setting." index={2}>
        <ChoiceChips<Appearance>
          label="Theme"
          value={appearance}
          onChange={setAppearance}
          options={[
            { value: 'system', label: 'System' },
            { value: 'light', label: '☀️ Light', accessibilityLabel: 'Light' },
            { value: 'dark', label: '🌙 Dark', accessibilityLabel: 'Dark' },
          ]}
        />
      </Card>

      {/* Phones only: a browser page can't use Face ID or the phone's passcode. */}
      {appLockSupported && (
        <Card
          title="Privacy"
          subtitle="Your goals and income stay hidden until you unlock the app."
          index={2}>
          <View style={styles.switchRow}>
            <View style={styles.summaryValue}>
              <ThemedText type="defaultBold">Lock with Face ID or passcode</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Asks each time you open the app
              </ThemedText>
            </View>
            <Switch
              value={appLock}
              onValueChange={(on) => void handleLockToggle(on)}
              accessibilityLabel="Lock with Face ID or passcode"
              trackColor={{ false: theme.border, true: theme.tint }}
            />
          </View>
          {lockMessage && (
            <ThemedText type="small" themeColor="danger" accessibilityLiveRegion="polite">
              {lockMessage}
            </ThemedText>
          )}
        </Card>
      )}

      <Card title="Look back" index={2}>
        <Button
          title="Savings challenges"
          variant="secondary"
          accessibilityHint="Opens the 52-week, 100 envelopes and 30-day challenges"
          onPress={() => router.push('/challenges')}
        />
        <Button
          title={`Your ${reviewYear} in review`}
          variant="secondary"
          accessibilityHint="Opens a summary of your year's saving"
          onPress={() => router.push({ pathname: '/year-review', params: { year: String(reviewYear) } })}
        />
      </Card>

      {/* The web app can't send notifications; its reminders show on Home instead. */}
      {notificationsSupported && (
        <Card title="Reminders" subtitle="Changes here save straight away." index={2}>
          <ReminderSettingsSection />
        </Card>
      )}

      {feedbackEnabled && (
        <Card
          title="Help improve Goalpot"
          subtitle="Something confusing, missing or great? A minute of feedback makes a real difference."
          index={3}>
          <Button
            title="Send feedback"
            variant="secondary"
            onPress={openFeedback}
            accessibilityHint="Opens a short feedback form"
          />
        </Card>
      )}

      <Card
        title="Your data"
        subtitle={`Everything is stored only on this device. Export a backup file to keep a copy or move to another device. ${
          lastBackupAt
            ? `Last backup: ${formatRelativeDay(toIsoDate(new Date(lastBackupAt)))}.`
            : 'You haven’t made a backup yet.'
        }`}
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
  summary: {
    gap: Spacing.two,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    minHeight: 44,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  summaryLabel: {
    width: 120,
  },
  summaryValue: {
    flex: 1,
  },
});
