import { useEffect, useState } from 'react';
import { BackHandler, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AfterTaxExplainer } from '@/components/profile/after-tax-explainer';
import { CurrencyPicker } from '@/components/profile/currency-picker';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/text-field';
import { CURRENCIES, DEFAULT_CURRENCY } from '@/constants/currencies';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useAppActions } from '@/hooks/use-app-data';
import { useTheme } from '@/hooks/use-theme';
import type { CurrencyCode } from '@/types/models';
import { NAME_MAX_LENGTH, validateIncome, validateName } from '@/utils/validation';

const STEP_COUNT = 3;

/**
 * Welcome flow shown the first time the app opens (see the guard in _layout.tsx).
 * Three steps: name → currency → monthly income after tax.
 */
export default function OnboardingScreen() {
  const theme = useTheme();
  const { completeOnboarding } = useAppActions();

  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [currency, setCurrency] = useState<CurrencyCode>(DEFAULT_CURRENCY);
  const [incomeText, setIncomeText] = useState('');
  const [nameError, setNameError] = useState<string | null>(null);
  const [incomeError, setIncomeError] = useState<string | null>(null);

  const currencySymbol = CURRENCIES.find((c) => c.code === currency)?.symbol ?? '';

  // Android back button goes to the previous step instead of closing the app.
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (step === 0) return false;
      setStep(step - 1);
      return true;
    });
    return () => subscription.remove();
  }, [step]);

  function handleNext() {
    if (step === 0) {
      const result = validateName(name);
      if (!result.ok) return setNameError(result.error);
      setName(result.value);
      setNameError(null);
    }
    if (step < STEP_COUNT - 1) {
      setStep(step + 1);
      return;
    }
    // Last step: check everything again before saving.
    const nameResult = validateName(name);
    const incomeResult = validateIncome(incomeText);
    if (!nameResult.ok) {
      setNameError(nameResult.error);
      setStep(0);
      return;
    }
    if (!incomeResult.ok) return setIncomeError(incomeResult.error);
    completeOnboarding({ name: nameResult.value, currency, monthlyIncome: incomeResult.value });
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <View style={styles.progress} accessibilityLabel={`Step ${step + 1} of ${STEP_COUNT}`}>
              {Array.from({ length: STEP_COUNT }, (_, i) => (
                <View
                  key={i}
                  style={[
                    styles.progressBar,
                    { backgroundColor: i <= step ? theme.tint : theme.backgroundSelected },
                  ]}
                />
              ))}
            </View>

            {step === 0 && (
              <>
                <ThemedText type="subtitle">Welcome 👋</ThemedText>
                <ThemedText themeColor="textSecondary">
                  Let’s set things up so we can help you save. First, what should we call you?
                </ThemedText>
                <TextField
                  label="Your name"
                  value={name}
                  onChangeText={(text) => {
                    setName(text);
                    if (nameError) setNameError(null);
                  }}
                  error={nameError}
                  placeholder="e.g. Sam"
                  autoFocus
                  autoCapitalize="words"
                  autoComplete="given-name"
                  textContentType="givenName"
                  maxLength={NAME_MAX_LENGTH + 10}
                  returnKeyType="next"
                  onSubmitEditing={handleNext}
                />
              </>
            )}

            {step === 1 && (
              <>
                <ThemedText type="subtitle">Hi {name}!</ThemedText>
                <ThemedText themeColor="textSecondary">
                  Which currency do you use? You can change this later in Settings.
                </ThemedText>
                <CurrencyPicker value={currency} onChange={setCurrency} />
              </>
            )}

            {step === 2 && (
              <>
                <ThemedText type="subtitle">Your monthly income</ThemedText>
                <ThemedText themeColor="textSecondary">
                  How much do you take home each month, after tax? We use this to suggest how much
                  you could save.
                </ThemedText>
                <TextField
                  label="Monthly income after tax"
                  value={incomeText}
                  onChangeText={(text) => {
                    setIncomeText(text);
                    if (incomeError) setIncomeError(null);
                  }}
                  error={incomeError}
                  prefix={currencySymbol}
                  placeholder="e.g. 1850"
                  keyboardType="decimal-pad"
                  autoFocus
                  returnKeyType="done"
                  onSubmitEditing={handleNext}
                />
                <AfterTaxExplainer />
              </>
            )}
          </ScrollView>

          <View style={styles.footer}>
            {step > 0 && (
              <View style={styles.flex}>
                <Button title="Back" variant="secondary" onPress={() => setStep(step - 1)} />
              </View>
            )}
            <View style={styles.flex}>
              <Button title={step === STEP_COUNT - 1 ? 'Finish' : 'Next'} onPress={handleNext} />
            </View>
          </View>
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
    padding: Spacing.four,
  },
  progress: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginBottom: Spacing.three,
  },
  progressBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  footer: {
    flexDirection: 'row',
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
  },
});
