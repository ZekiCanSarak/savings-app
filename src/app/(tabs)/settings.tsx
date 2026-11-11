import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AfterTaxExplainer } from '@/components/profile/after-tax-explainer';
import { CurrencyPicker } from '@/components/profile/currency-picker';
import { ReminderSettingsSection } from '@/components/reminders/reminder-settings';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/text-field';
import { CURRENCIES } from '@/constants/currencies';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useAppActions, useProfile } from '@/hooks/use-app-data';
import type { CurrencyCode } from '@/types/models';
import {
  amountToInputText,
  NAME_MAX_LENGTH,
  validateIncome,
  validateName,
} from '@/utils/validation';

export default function SettingsScreen() {
  const profile = useProfile();
  const { updateProfile, resetAllData } = useAppActions();

  // Edits are kept here until the user taps Save.
  const [name, setName] = useState(profile.name);
  const [currency, setCurrency] = useState<CurrencyCode>(profile.currency);
  const [incomeText, setIncomeText] = useState(amountToInputText(profile.monthlyIncome));
  const [nameError, setNameError] = useState<string | null>(null);
  const [incomeError, setIncomeError] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState(false);

  const currencySymbol = CURRENCIES.find((c) => c.code === currency)?.symbol ?? '';
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
    const message =
      'This deletes your profile, goals and saved money from this phone. It can’t be undone.';
    if (Platform.OS === 'web') {
      // Alert buttons don't work on web.
      if (window.confirm(message)) resetAllData();
      return;
    }
    Alert.alert('Delete all data?', message, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete everything', style: 'destructive', onPress: resetAllData },
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
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <ThemedText type="subtitle">Settings</ThemedText>

            <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionTitle}>
              YOUR DETAILS
            </ThemedText>
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
              prefix={currencySymbol}
              keyboardType="decimal-pad"
            />
            <AfterTaxExplainer />

            <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionTitle}>
              CURRENCY
            </ThemedText>
            <CurrencyPicker value={currency} onChange={edited(setCurrency)} />
            <ThemedText type="small" themeColor="textSecondary">
              Changing currency only changes the symbol shown — amounts aren’t converted.
            </ThemedText>

            <Button title="Save changes" onPress={handleSave} disabled={!hasChanges} />
            {justSaved && (
              <ThemedText
                type="small"
                themeColor="tint"
                style={styles.center}
                accessibilityLiveRegion="polite">
                Saved ✓
              </ThemedText>
            )}

            <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionTitle}>
              REMINDERS
            </ThemedText>
            <ReminderSettingsSection />

            <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionTitle}>
              DATA
            </ThemedText>
            <Button title="Delete all data" variant="danger" onPress={handleReset} />
          </ScrollView>
        </KeyboardAvoidingView>
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
  flex: {
    flex: 1,
  },
  content: {
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
    paddingBottom: BottomTabInset + Spacing.four,
  },
  sectionTitle: {
    marginTop: Spacing.three,
    letterSpacing: 0.5,
  },
  center: {
    textAlign: 'center',
  },
});
