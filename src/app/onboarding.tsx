import { useEffect, useState } from 'react';
import { BackHandler, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  BudgetStyleQuestion,
  EmergencyQuestion,
  FocusQuestion,
  GuidanceQuestion,
  PayQuestion,
  QUESTIONS,
} from '@/components/profile/about-questions';
import { AfterTaxExplainer } from '@/components/profile/after-tax-explainer';
import { CurrencyPicker } from '@/components/profile/currency-picker';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { TextButton } from '@/components/ui/text-button';
import { TextField } from '@/components/ui/text-field';
import { CURRENCIES, DEFAULT_CURRENCY } from '@/constants/currencies';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useAppActions } from '@/hooks/use-app-data';
import { useTheme } from '@/hooks/use-theme';
import type { AboutYou, CurrencyCode } from '@/types/models';
import { DEFAULT_ABOUT } from '@/utils/personal';
import {
  MONEY_INPUT_MAX_LENGTH,
  NAME_MAX_LENGTH,
  validateIncome,
  validateName,
} from '@/utils/validation';

const STEPS = ['name', 'currency', 'pay', 'income', 'focus', 'emergency', 'budget', 'guidance'] as const;
type Step = (typeof STEPS)[number];
const STEP_COUNT = STEPS.length;

/** The "About you" steps can be skipped; skipping resets that answer. */
const SKIPPED: Partial<Record<Step, Partial<AboutYou>>> = {
  pay: { payFrequency: null, payday: null, payWeekday: null, paySchedule: null },
  focus: { focus: null },
  emergency: { emergencyFund: null },
  budget: { budgetStyle: DEFAULT_ABOUT.budgetStyle },
  guidance: { guidance: null },
};

/** Title and intro for the question steps. */
const QUESTION_FOR: Partial<Record<Step, { title: string; intro: string }>> = {
  pay: QUESTIONS.pay,
  focus: QUESTIONS.focus,
  emergency: QUESTIONS.emergency,
  budget: QUESTIONS.budget,
  guidance: QUESTIONS.guidance,
};

/**
 * Welcome flow shown the first time the app opens (see the guard in _layout.tsx).
 * Name → currency → pay → monthly income after tax, then the "About you"
 * questions that personalise the app. Every question step can be skipped.
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
  const [about, setAbout] = useState<AboutYou>(DEFAULT_ABOUT);

  const stepName: Step = STEPS[step];
  const question = QUESTION_FOR[stepName];
  const skipped = SKIPPED[stepName];
  const irregularPay = about.payFrequency === 'irregular';
  const currencySymbol = CURRENCIES.find((c) => c.code === currency)?.symbol ?? '';
  const answer = (changes: Partial<AboutYou>) => setAbout((current) => ({ ...current, ...changes }));

  // Android back button goes to the previous step instead of closing the app.
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (step === 0) return false;
      setStep(step - 1);
      return true;
    });
    return () => subscription.remove();
  }, [step]);

  function handleNext(skip?: Partial<AboutYou>) {
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
    const answers = skip ? { ...about, ...skip } : about;
    if (skip) setAbout(answers);
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
    completeOnboarding(
      { name: nameResult.value, currency, monthlyIncome: incomeResult.value },
      answers,
    );
  }

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
                  autoFocus
                  autoCapitalize="words"
                  autoComplete="given-name"
                  textContentType="givenName"
                  maxLength={NAME_MAX_LENGTH + 10}
                  returnKeyType="next"
                  onSubmitEditing={() => handleNext()}
                />
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
                  {irregularPay
                    ? 'Roughly how much comes in each month, after tax? A rough average is fine. We use this to suggest how much you could save.'
                    : 'How much do you take home each month, after tax? We use this to suggest how much you could save.'}{' '}
                  No income right now? Enter 0. That’s fine.
                </ThemedText>
                <TextField
                  label={irregularPay ? 'Average monthly income after tax' : 'Monthly income after tax'}
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
                  autoFocus
                  returnKeyType="done"
                  onSubmitEditing={() => handleNext()}
                />
                <AfterTaxExplainer />
              </>
            )}

            {question && (
              <>
                <ThemedText type="title" accessibilityRole="header">{question.title}</ThemedText>
                <ThemedText themeColor="textSecondary">{question.intro}</ThemedText>
              </>
            )}

            {stepName === 'pay' && (
              <PayQuestion
                frequency={about.payFrequency}
                payday={about.payday}
                payWeekday={about.payWeekday}
                paySchedule={about.paySchedule}
                onChangeFrequency={(payFrequency) => answer({ payFrequency })}
                onChangePayday={(payday) => answer({ payday })}
                onChangePayWeekday={(payWeekday) => answer({ payWeekday })}
                onChangePaySchedule={(paySchedule) => answer({ paySchedule })}
              />
            )}
            {stepName === 'focus' && (
              <FocusQuestion value={about.focus} onChange={(focus) => answer({ focus })} />
            )}
            {stepName === 'emergency' && (
              <EmergencyQuestion
                value={about.emergencyFund}
                onChange={(emergencyFund) => answer({ emergencyFund })}
              />
            )}
            {stepName === 'budget' && (
              <BudgetStyleQuestion
                value={about.budgetStyle}
                onChange={(budgetStyle) => answer({ budgetStyle })}
              />
            )}
            {stepName === 'guidance' && (
              <GuidanceQuestion
                value={about.guidance}
                onChange={(guidance) => answer({ guidance })}
                celebrations={about.celebrations}
                onChangeCelebrations={(celebrations) => answer({ celebrations })}
              />
            )}

            {question && (
              <ThemedText type="caption" themeColor="textSecondary">
                Your answers stay on this device. Change them any time in Settings → About you.
              </ThemedText>
            )}
          </ScrollView>

          {skipped && (
            <View style={styles.skip}>
              <TextButton
                title="Skip this question"
                accessibilityHint={step === STEP_COUNT - 1 ? 'Skips and finishes setting up' : 'Goes to the next step'}
                onPress={() => handleNext(skipped)}
              />
            </View>
          )}
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
  skip: {
    alignItems: 'center',
  },
  footer: {
    flexDirection: 'row',
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.three,
  },
});
