import { StyleSheet, Switch, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ChoiceChips } from '@/components/ui/choice-chips';
import { OptionList } from '@/components/ui/option-list';
import { ValueStepper } from '@/components/ui/value-stepper';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type {
  BudgetStyle,
  EmergencyFundStatus,
  GuidanceLevel,
  PayFrequency,
  SavingFocus,
} from '@/types/models';
import {
  BUDGET_STYLE_INFO,
  EMERGENCY_INFO,
  FOCUS_INFO,
  GUIDANCE_INFO,
  PAY_INFO,
} from '@/utils/personal';
import { ordinal } from '@/utils/reminders';

// Monday first (UK). Values use expo-notifications' numbering, 1 = Sunday.
const WEEKDAYS = [
  { value: 2, label: 'Mon', accessibilityLabel: 'Monday' },
  { value: 3, label: 'Tue', accessibilityLabel: 'Tuesday' },
  { value: 4, label: 'Wed', accessibilityLabel: 'Wednesday' },
  { value: 5, label: 'Thu', accessibilityLabel: 'Thursday' },
  { value: 6, label: 'Fri', accessibilityLabel: 'Friday' },
  { value: 7, label: 'Sat', accessibilityLabel: 'Saturday' },
  { value: 1, label: 'Sun', accessibilityLabel: 'Sunday' },
];

/**
 * The "About you" questions. The welcome flow shows one per step, and the
 * About you screen shows them all. Wording lives here so both match.
 */

export const QUESTIONS = {
  focus: {
    title: 'What are you mainly saving for?',
    intro: 'We’ll suggest a first goal and show the most useful tips first.',
  },
  pay: {
    title: 'How do you get paid?',
    intro: 'So reminders can come just after payday, and amounts can match how you’re paid.',
  },
  emergency: {
    title: 'Do you have money set aside for emergencies?',
    intro: 'An emergency fund stops a surprise bill turning into debt.',
  },
  budget: {
    title: 'Which budget feels realistic?',
    intro: 'How to split your take-home pay between needs, wants and savings. You can change it any time.',
  },
  guidance: {
    title: 'How much help would you like?',
    intro: 'We can explain things as you go, or keep it short.',
  },
} as const;

type QuestionProps<T> = {
  value: T | null;
  onChange: (value: T) => void;
};

export function FocusQuestion({ value, onChange }: QuestionProps<SavingFocus>) {
  return (
    <OptionList
      label={QUESTIONS.focus.title}
      value={value}
      onChange={onChange}
      options={(Object.keys(FOCUS_INFO) as SavingFocus[]).map((key) => ({
        value: key,
        label: FOCUS_INFO[key].label,
        emoji: FOCUS_INFO[key].emoji,
      }))}
    />
  );
}

type PayQuestionProps = {
  frequency: PayFrequency | null;
  payday: number | null;
  payWeekday: number | null;
  onChangeFrequency: (value: PayFrequency) => void;
  onChangePayday: (value: number) => void;
  onChangePayWeekday: (value: number) => void;
};

export function PayQuestion({
  frequency,
  payday,
  payWeekday,
  onChangeFrequency,
  onChangePayday,
  onChangePayWeekday,
}: PayQuestionProps) {
  // Wraps round: ‹ from the 1st goes to the 31st and back.
  const step = (direction: 1 | -1) => {
    const current = payday ?? (direction === 1 ? 0 : 32);
    onChangePayday(((current - 1 + direction + 31) % 31) + 1);
  };
  return (
    <View style={styles.group}>
      <OptionList
        label={QUESTIONS.pay.title}
        value={frequency}
        onChange={onChangeFrequency}
        options={(Object.keys(PAY_INFO) as PayFrequency[]).map((key) => ({
          value: key,
          label: PAY_INFO[key].label,
          description: PAY_INFO[key].description,
        }))}
      />
      {frequency === 'monthly' && (
        <ValueStepper
          label="What day is payday?"
          valueText={payday === null ? 'Choose a day' : `The ${ordinal(payday)}`}
          onPrevious={() => step(-1)}
          onNext={() => step(1)}
          previousLabel="Earlier day"
          nextLabel="Later day"
        />
      )}
      {(frequency === 'weekly' || frequency === 'four-weekly') && (
        // ChoiceChips needs a value; 0 matches no chip until one is picked.
        <ChoiceChips<number>
          label="Which day are you paid?"
          options={WEEKDAYS}
          value={payWeekday ?? 0}
          onChange={onChangePayWeekday}
        />
      )}
    </View>
  );
}

export function EmergencyQuestion({ value, onChange }: QuestionProps<EmergencyFundStatus>) {
  return (
    <OptionList
      label={QUESTIONS.emergency.title}
      value={value}
      onChange={onChange}
      options={(Object.keys(EMERGENCY_INFO) as EmergencyFundStatus[]).map((key) => ({
        value: key,
        label: EMERGENCY_INFO[key].label,
        description: EMERGENCY_INFO[key].description,
      }))}
    />
  );
}

export function BudgetStyleQuestion({ value, onChange }: QuestionProps<BudgetStyle>) {
  return (
    <OptionList
      label={QUESTIONS.budget.title}
      value={value}
      onChange={onChange}
      options={(Object.keys(BUDGET_STYLE_INFO) as BudgetStyle[]).map((key) => ({
        value: key,
        label: `${BUDGET_STYLE_INFO[key].label} · ${BUDGET_STYLE_INFO[key].name}`,
        description: BUDGET_STYLE_INFO[key].description,
      }))}
    />
  );
}

type GuidanceQuestionProps = QuestionProps<GuidanceLevel> & {
  celebrations: boolean;
  onChangeCelebrations: (value: boolean) => void;
};

export function GuidanceQuestion({
  value,
  onChange,
  celebrations,
  onChangeCelebrations,
}: GuidanceQuestionProps) {
  const theme = useTheme();
  return (
    <View style={styles.group}>
      <OptionList
        label={QUESTIONS.guidance.title}
        value={value}
        onChange={onChange}
        options={(Object.keys(GUIDANCE_INFO) as GuidanceLevel[]).map((key) => ({
          value: key,
          label: GUIDANCE_INFO[key].label,
          description: GUIDANCE_INFO[key].description,
        }))}
      />
      <View style={styles.switchRow}>
        <View style={styles.flex}>
          <ThemedText type="defaultBold">Celebrate with confetti 🎉</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            When you reach a goal
          </ThemedText>
        </View>
        <Switch
          value={celebrations}
          onValueChange={onChangeCelebrations}
          accessibilityLabel="Celebrate with confetti when you reach a goal"
          trackColor={{ false: theme.border, true: theme.tint }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  group: {
    gap: Spacing.three,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    minHeight: 44,
  },
  flex: {
    flex: 1,
  },
});
