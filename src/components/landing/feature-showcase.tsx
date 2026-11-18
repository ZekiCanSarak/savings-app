import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ProgressBar } from '@/components/ui/progress-bar';
import { MinTapSize, Radius, Spacing } from '@/constants/theme';
import { demoData } from '@/data/demo';
import { useTheme } from '@/hooks/use-theme';
import { budgetSplit, labelColourOn, splitRule } from '@/utils/budget';
import { formatMonthYear } from '@/utils/dates';
import { monthlyAmountNeeded, percentComplete, totalSaved } from '@/utils/goals';
import { formatMoney } from '@/utils/money';
import { monthlyHistory } from '@/utils/streaks';

/**
 * The landing page's feature rows: a few words on one side and a small, real
 * piece of the app on the other (drawn with the demo data, so the numbers
 * match the screenshots and stay current). Display only: nothing is tappable.
 */

const demo = demoData();
const CURRENCY = demo.profile.currency;
const money = (amount: number) => formatMoney(amount, CURRENCY);

export function FeatureShowcase({ wide }: { wide: boolean }) {
  return (
    <View style={styles.list}>
      <FeatureRow
        wide={wide}
        eyebrow="Plan"
        title="Goals with a plan"
        text="Set a target and a date. Goalpot works out what to put aside each month, and tells you if you’re falling behind."
        preview={<GoalPreview />}
      />
      <FeatureRow
        wide={wide}
        flip
        eyebrow="Progress"
        title="See it add up"
        text="Charts, saving streaks and a look back at your year turn small amounts into something you can see."
        preview={<StreakPreview />}
      />
      <FeatureRow
        wide={wide}
        eyebrow="Budget"
        title="A budget that fits you"
        text="A simple split of your take-home pay, a suggested saving amount, and tips matched to what you’re saving for."
        preview={<BudgetPreview />}
      />
      <FeatureRow
        wide={wide}
        flip
        eyebrow="Payday"
        title="Save before it’s spent"
        text="On payday, Goalpot asks if you want to put your suggested amount aside. One tap and it’s done."
        preview={<PaydayPreview />}
      />
    </View>
  );
}

type FeatureRowProps = {
  wide: boolean;
  /** On wide screens, put the preview on the left. */
  flip?: boolean;
  eyebrow: string;
  title: string;
  text: string;
  preview: ReactNode;
};

function FeatureRow({ wide, flip, eyebrow, title, text, preview }: FeatureRowProps) {
  return (
    <View style={[styles.row, wide && styles.rowWide, wide && flip && styles.rowFlip]}>
      <View style={[styles.copy, wide && styles.copyWide]}>
        <ThemedText type="smallBold" themeColor="tint" style={styles.eyebrow}>
          {eyebrow.toUpperCase()}
        </ThemedText>
        <ThemedText type="title" accessibilityRole="header">
          {title}
        </ThemedText>
        <ThemedText themeColor="textSecondary" style={styles.text}>
          {text}
        </ThemedText>
      </View>
      <View style={[styles.previewSlot, wide && styles.previewSlotWide]}>{preview}</View>
    </View>
  );
}

/** A card-like surface for a preview, hidden from touch and read out as one image. */
function PreviewSurface({ label, children }: { label: string; children: ReactNode }) {
  const theme = useTheme();
  return (
    <View
      pointerEvents="none"
      accessible
      accessibilityRole="image"
      accessibilityLabel={label}
      style={[styles.surface, { backgroundColor: theme.backgroundElement }]}>
      {children}
    </View>
  );
}

function GoalPreview() {
  const theme = useTheme();
  const goal = demo.goals.find((g) => g.id === 'demo-japan') ?? demo.goals[0];
  const saved = totalSaved(goal.id, demo.contributions);
  const percent = percentComplete(goal, demo.contributions);
  const monthly = monthlyAmountNeeded(goal, demo.contributions) ?? 0;
  const by = goal.targetDate ? formatMonthYear(goal.targetDate) : '';

  return (
    <PreviewSurface
      label={`${goal.name}: ${money(saved)} of ${money(goal.targetAmount)} saved. Save ${money(monthly)} a month to reach it by ${by}.`}>
      <View style={styles.goalHead}>
        <View style={[styles.goalIcon, { backgroundColor: theme.background }]}>
          <ThemedText type="emoji">{goal.emoji}</ThemedText>
        </View>
        <View style={styles.flex}>
          <ThemedText type="defaultBold">{goal.name}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            by {by}
          </ThemedText>
        </View>
        <ThemedText type="smallBold" themeColor="textSecondary">
          {percent}%
        </ThemedText>
      </View>
      <ProgressBar percent={percent} />
      <ThemedText type="small" themeColor="textSecondary">
        <ThemedText type="smallBold">{money(saved)}</ThemedText> of {money(goal.targetAmount)}
      </ThemedText>
      <View style={[styles.divider, { backgroundColor: theme.border }]} />
      <ThemedText type="small">
        Save <ThemedText type="smallBold">{money(monthly)} a month</ThemedText> to make it by {by}.
      </ThemedText>
    </PreviewSurface>
  );
}

function StreakPreview() {
  const theme = useTheme();
  const months = monthlyHistory(demo.contributions).slice(-10);
  const letter = (m: number) =>
    new Date(2000, m, 1).toLocaleDateString('en-GB', { month: 'narrow' });

  return (
    <PreviewSurface label={`${months.length} months in a row of saving something.`}>
      <ThemedText type="heading">{months.length} months in a row</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        You’ve saved something every month. Keep it going!
      </ThemedText>
      <View style={styles.months}>
        {months.map((m, i) => (
          <View key={m.key} style={styles.month}>
            <View
              style={[
                styles.dot,
                { backgroundColor: theme.chart },
                i === months.length - 1 && { borderColor: theme.text, borderWidth: 2 },
              ]}
            />
            <ThemedText type="caption" themeColor="textSecondary">
              {letter(m.month.month)}
            </ThemedText>
          </View>
        ))}
      </View>
    </PreviewSurface>
  );
}

function BudgetPreview() {
  const theme = useTheme();
  const income = demo.profile.monthlyIncome ?? 0;
  const split = budgetSplit(income);
  const colours = {
    needs: theme.budgetNeeds,
    wants: theme.budgetWants,
    savings: theme.budgetSavings,
  };
  const labels = { needs: 'Needs', wants: 'Wants', savings: 'Savings' };
  const parts = splitRule().map(({ key, share }) => ({
    label: labels[key],
    share,
    amount: split[key],
    colour: colours[key],
  }));

  return (
    <PreviewSurface
      label={`From ${money(income)} a month: ${parts.map((p) => `${p.label} ${money(p.amount)}`).join(', ')}.`}>
      <ThemedText type="small" themeColor="textSecondary">
        From <ThemedText type="smallBold">{money(income)}</ThemedText> a month
      </ThemedText>
      <View style={styles.splitBar}>
        {parts.map((p) => (
          <View
            key={p.label}
            style={[styles.splitPart, { flex: p.share, backgroundColor: p.colour }]}>
            <ThemedText type="smallBold" style={{ color: labelColourOn(p.colour) }}>
              {p.share}%
            </ThemedText>
          </View>
        ))}
      </View>
      <View style={styles.splitRows}>
        {parts.map((p) => (
          <View key={p.label} style={styles.splitRow}>
            <View style={[styles.swatch, { backgroundColor: p.colour }]} />
            <ThemedText type="small" style={styles.flex}>
              {p.label}
            </ThemedText>
            <ThemedText type="smallBold">{money(p.amount)}</ThemedText>
          </View>
        ))}
      </View>
    </PreviewSurface>
  );
}

function PaydayPreview() {
  const theme = useTheme();
  const income = demo.profile.monthlyIncome ?? 0;
  const amount = budgetSplit(income).savings;
  const goal = demo.goals.find((g) => g.id === 'demo-emergency') ?? demo.goals[0];

  return (
    <PreviewSurface
      label={`It’s payday. A button offers to save ${money(amount)} to ${goal.name}.`}>
      <ThemedText type="heading">It’s payday!</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        Put something aside before it gets spent?
      </ThemedText>
      <View style={[styles.fakeButton, { backgroundColor: theme.tint }]}>
        <ThemedText type="defaultBold" style={{ color: theme.onTint }}>
          Save {money(amount)} to {goal.name}
        </ThemedText>
      </View>
      <View style={[styles.fakeButton, { backgroundColor: theme.backgroundSelected }]}>
        <ThemedText type="defaultBold">A different amount</ThemedText>
      </View>
    </PreviewSurface>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: Spacing.six,
  },
  row: {
    gap: Spacing.four,
  },
  rowWide: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.six,
  },
  rowFlip: {
    flexDirection: 'row-reverse',
  },
  copy: {
    gap: Spacing.two,
  },
  copyWide: {
    flex: 1,
  },
  eyebrow: {
    letterSpacing: 1.5,
  },
  text: {
    maxWidth: 440,
  },
  previewSlot: {
    width: '100%',
  },
  previewSlotWide: {
    width: 380,
  },
  surface: {
    borderRadius: Radius.card,
    borderCurve: 'continuous',
    padding: Spacing.four,
    gap: Spacing.three,
  },
  flex: {
    flex: 1,
  },
  goalHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  goalIcon: {
    width: MinTapSize,
    height: MinTapSize,
    borderRadius: Radius.control,
    alignItems: 'center',
    justifyContent: 'center',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
  },
  months: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: Spacing.one,
  },
  month: {
    alignItems: 'center',
    gap: Spacing.one,
  },
  dot: {
    width: 16,
    height: 16,
    borderRadius: Radius.pill,
  },
  splitBar: {
    flexDirection: 'row',
    gap: Spacing.half,
    borderRadius: Radius.small,
    overflow: 'hidden',
  },
  splitPart: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.two,
  },
  splitRows: {
    gap: Spacing.two,
  },
  splitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  swatch: {
    width: 12,
    height: 12,
    borderRadius: 3,
  },
  fakeButton: {
    minHeight: MinTapSize,
    borderRadius: Radius.control,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
  },
});
