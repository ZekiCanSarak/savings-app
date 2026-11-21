import { useEffect, useState } from 'react';
import { BackHandler, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';

import { LandingPage } from '@/components/landing/landing-page';
import { AfterTaxExplainer } from '@/components/profile/after-tax-explainer';
import { CurrencyPicker } from '@/components/profile/currency-picker';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { TextButton } from '@/components/ui/text-button';
import { TextField } from '@/components/ui/text-field';
import { SafeAreaView } from '@/components/ui/safe-area-view';
import { CURRENCIES, DEFAULT_CURRENCY } from '@/constants/currencies';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useAppActions, useIntroSeen } from '@/hooks/use-app-data';
import { useTheme } from '@/hooks/use-theme';
import { isInstalledWebApp, isTouchWeb } from '@/services/web-app';
import type { CurrencyCode } from '@/types/models';
import {
  MONEY_INPUT_MAX_LENGTH,
  NAME_MAX_LENGTH,
  validateIncome,
  validateName,
} from '@/utils/validation';


const STEPS = ['name', 'currency', 'income'] as const;
type Step = (typeof STEPS)[number];
const STEP_COUNT = STEPS.length;

/**
 * Welcome flow shown the first time the app opens (see the guard in _layout.tsx).
 * Kept short: name → currency → monthly income after tax. The "About you"
 * questions come later, from Home's "Complete your profile" card or Settings.
 */
export default function OnboardingScreen() {
  const theme = useTheme();
  const { completeOnboarding, startDemo, markIntroSeen } = useAppActions();
  const introSeen = useIntroSeen();
  // First-time web visitors see what Goalpot is before being asked anything.
  const showLanding = Platform.OS === 'web' && !introSeen && !isInstalledWebApp();

  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [currency, setCurrency] = useState<CurrencyCode>(DEFAULT_CURRENCY);
  const [incomeText, setIncomeText] = useState('');
  const [nameError, setNameError] = useState<string | null>(null);
  const [incomeError, setIncomeError] = useState<string | null>(null);

  const stepName: Step = STEPS[step];
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
    if (stepName === 'name') {
      const result = validateName(name);
      if (!result.ok) return setNameError(result.error);
      setName(result.value);
      setNameError(null);
    }
    if (stepName === 'income') {
      const result = validateIncome(incomeText);
      if (!result.ok) return setIncomeError(result.error);
      setIncomeError(null);
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
      setStep(STEPS.indexOf('name'));
      return;
    }
    if (!incomeResult.ok) {
      setIncomeError(incomeResult.error);
      setStep(STEPS.indexOf('income'));
      return;
    }
    completeOnboarding({ name: nameResult.value, currency, monthlyIncome: incomeResult.value });
  }

  // On a phone's browser, focusing straight away opens the keyboard before the
  // screen is read, and iOS slides the page up under the clock to make room.
  const autoFocusField = !isTouchWeb();

  if (showLanding) return <LandingPage onGetStarted={markIntroSeen} onTryDemo={startDemo} />;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <View style={styles.progress} accessibilityLabel={`Step ${step + 1} of ${STEP_COUNT}`}>
              {STEPS.map((key, i) => (
                <View
                  key={key}
                  style={[
                    styles.progressBar,
                    { backgroundColor: i <= step ? theme.tint : theme.backgroundSelected },
                  ]}
                />
              ))}
            </View>

            {stepName === 'name' && (
              <>
                <ThemedText type="title" accessibilityRole="header">Welcome 👋</ThemedText>
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
                  autoFocus={autoFocusField}
                  autoCapitalize="words"
                  autoComplete="given-name"
                  textContentType="givenName"
                  maxLength={NAME_MAX_LENGTH + 10}
                  returnKeyType="next"
                  onSubmitEditing={() => handleNext()}
                />
                <View style={styles.demo}>
                  <ThemedText type="small" themeColor="textSecondary">
                    Just looking?
                  </ThemedText>
                  <TextButton
                    title="Try the demo with sample data"
                    accessibilityHint="Opens the app filled with made-up goals and savings"
                    onPress={startDemo}
                  />
                </View>
              </>
            )}

            {stepName === 'currency' && (
              <>
                <ThemedText type="title" accessibilityRole="header">Hi {name}!</ThemedText>
                <ThemedText themeColor="textSecondary">
                  Which currency do you use? You can change this later in Settings.
                </ThemedText>
                <CurrencyPicker value={currency} onChange={setCurrency} />
              </>
            )}

            {stepName === 'income' && (
              <>
                <ThemedText type="title" accessibilityRole="header">Your monthly income</ThemedText>
                <ThemedText themeColor="textSecondary">
                  How much do you take home each month, after tax? If it changes from month to
                  month, a rough average is fine. We use this to suggest how much you could save.
                  No income right now? Enter 0. That’s fine.
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
                  maxLength={MONEY_INPUT_MAX_LENGTH}
                  autoFocus={autoFocusField}
                  returnKeyType="done"
                  onSubmitEditing={() => handleNext()}
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
              <Button
                title={step === STEP_COUNT - 1 ? 'Finish' : 'Next'}
                onPress={() => handleNext()}
              />
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
    gap: Spacing.one,
    marginBottom: Spacing.three,
  },
  progressBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  demo: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    columnGap: Spacing.two,
  },
  footer: {
    flexDirection: 'row',
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.three,
  },
});
