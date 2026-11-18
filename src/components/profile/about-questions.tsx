import { Pressable, StyleSheet, Switch, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ChoiceChips } from '@/components/ui/choice-chips';
import { OptionList } from '@/components/ui/option-list';
import { ValueStepper } from '@/components/ui/value-stepper';
import { MinTapSize, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type {
  BudgetStyle,
  EmergencyFundStatus,
  GuidanceLevel,
  PayFrequency,
  PaySchedule,
  SavingFocus,
  WeekOfMonth,
} from '@/types/models';
import { describePaySchedule } from '@/utils/payday';
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
  paySchedule: PaySchedule | null;
  onChangeFrequency: (value: PayFrequency) => void;
  onChangePayday: (value: number) => void;
  onChangePayWeekday: (value: number) => void;
  onChangePaySchedule: (value: PaySchedule | null) => void;
};

export function PayQuestion({
  frequency,
  payday,
  payWeekday,
  paySchedule,
  onChangeFrequency,
  onChangePayday,
  onChangePayWeekday,
  onChangePaySchedule,
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
      {frequency === 'irregular' && (
        <VariablePaySchedule value={paySchedule} onChange={onChangePaySchedule} />
      )}
    </View>
  );
}

type ScheduleKind = PaySchedule['kind'] | 'none';

const WEEKS_OF_MONTH: { value: WeekOfMonth; label: string }[] = [
  { value: 1, label: 'First' },
  { value: 2, label: 'Second' },
  { value: 3, label: 'Third' },
  { value: 4, label: 'Fourth' },
  { value: -1, label: 'Last' },
];

const DAYS_OF_MONTH = Array.from({ length: 31 }, (_, i) => i + 1);

/**
 * For pay that "varies": the usual paydays, as set dates each month (the 1st
 * and 15th) or a pattern (the last Friday). Used for the payday check-in.
 */
function VariablePaySchedule({
  value,
  onChange,
}: {
  value: PaySchedule | null;
  onChange: (value: PaySchedule | null) => void;
}) {
  const theme = useTheme();
  const kind: ScheduleKind = value?.kind ?? 'none';

  function chooseKind(next: ScheduleKind) {
    if (next === kind) return;
    if (next === 'dates') onChange({ kind: 'dates', days: [] });
    else if (next === 'pattern') onChange({ kind: 'pattern', week: -1, weekday: 6 }); // last Friday
    else onChange(null);
  }

  function toggleDay(day: number) {
    if (value?.kind !== 'dates') return;
    const days = value.days.includes(day)
      ? value.days.filter((d) => d !== day)
      : [...value.days, day].sort((a, b) => a - b);
    onChange({ kind: 'dates', days });
  }

  const summary =
    value && (value.kind === 'pattern' || value.days.length > 0)
      ? `Paid on ${describePaySchedule(value)} of every month.`
      : null;

  return (
    <View style={styles.group}>
      <ChoiceChips<ScheduleKind>
        label="When do you usually get paid?"
        value={kind}
        onChange={chooseKind}
        options={[
          { value: 'dates', label: 'On set dates' },
          { value: 'pattern', label: 'On a pattern' },
          { value: 'none', label: 'No set days' },
        ]}
      />

      {value?.kind === 'dates' && (
        <View style={styles.group}>
          <ThemedText type="small" themeColor="textSecondary">
            Tap every day you’re usually paid. In shorter months, the 29th–31st count as the last
            day of the month.
          </ThemedText>
          <View accessibilityLabel="Paydays each month" style={styles.dayGrid}>
            {DAYS_OF_MONTH.map((day) => {
              const selected = value.days.includes(day);
              return (
                <Pressable
                  key={day}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: selected }}
                  accessibilityLabel={`${ordinal(day)} of the month`}
                  onPress={() => toggleDay(day)}
                  style={({ pressed }) => [
                    styles.day,
                    {
                      backgroundColor: selected ? theme.tint : theme.background,
                      borderColor: selected ? theme.tint : theme.border,
                    },
                    pressed && styles.pressed,
                  ]}>
                  <ThemedText type="smallBold" style={{ color: selected ? theme.onTint : theme.text }}>
                    {day}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>
        </View>
      )}

      {value?.kind === 'pattern' && (
        <>
          <ChoiceChips<WeekOfMonth>
            label="Which one?"
            value={value.week}
            onChange={(week) => onChange({ ...value, week })}
            options={WEEKS_OF_MONTH}
          />
          <ChoiceChips<number>
            label="Which day?"
            value={value.weekday}
            onChange={(weekday) => onChange({ ...value, weekday })}
            options={WEEKDAYS}
          />
        </>
      )}

      {summary ? (
        <ThemedText type="smallBold" themeColor="tint" accessibilityLiveRegion="polite">
          {summary}
        </ThemedText>
      ) : kind === 'none' ? (
        <ThemedText type="small" themeColor="textSecondary">
          No problem. Payday reminders and check-ins need set days, so they’ll stay off.
        </ThemedText>
      ) : null}
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
  dayGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  day: {
    width: MinTapSize,
    height: MinTapSize,
    borderRadius: Radius.control,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
});
