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
import { cancelAllReminders } from '@/services/notifications';
import type { CurrencyCode } from '@/types/models';
import {
  amountToInputText,
  MONEY_INPUT_MAX_LENGTH,
  NAME_MAX_LENGTH,
  validateIncome,
  validateName,
} from '@/utils/validation';

export default function SettingsScreen() {
  const profile = useProfile();
  const goals = useGoals();
  const contributions = useContributions();
  const { updateProfile, resetAllData } = useAppActions();

  // Edits are kept here until the user taps Save.
  const [name, setName] = useState(profile.name);
  const [currency, setCurrency] = useState<CurrencyCode>(profile.currency);
  const [incomeText, setIncomeText] = useState(amountToInputText(profile.monthlyIncome));
  const [nameError, setNameError] = useState<string | null>(null);
  const [incomeError, setIncomeError] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState(false);

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
    const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;
    const message =
      `This permanently deletes your profile, ${plural(goals.length, 'goal')} and ` +
      `${plural(contributions.length, 'saving')} from this phone, and turns off reminders. ` +
      'You’ll start again from the welcome screen. This can’t be undone.';
    const reset = async () => {
      // Cancel first: once data is reset, the reminder scheduler is no longer running.
      await cancelAllReminders();
      resetAllData();
    };
    if (Platform.OS === 'web') {
      // Alert buttons don't work on web.
      if (window.confirm(`Reset all data? ${message}`)) void reset();
      return;
    }
    Alert.alert('Reset all data?', message, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Reset everything', style: 'destructive', onPress: () => void reset() },
    ]);
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

      <Card title="Reminders" subtitle="Changes here save straight away." index={2}>
        <ReminderSettingsSection />
      </Card>

      <Card
        title="Your data"
        subtitle="Everything is stored only on this phone. Resetting deletes it all and starts the app afresh."
        index={3}>
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
