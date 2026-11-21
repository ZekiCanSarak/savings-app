import { router } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';

import {
  BudgetStyleQuestion,
  EmergencyQuestion,
  FocusQuestion,
  GuidanceQuestion,
  PayQuestion,
  QUESTIONS,
} from '@/components/profile/about-questions';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ModalHeader } from '@/components/ui/modal-header';
import { SafeAreaView } from '@/components/ui/safe-area-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useAbout, useAppActions } from '@/hooks/use-app-data';
import type { AboutYou } from '@/types/models';
import { nowIsoTimestamp } from '@/utils/dates';

/**
 * All the "About you" questions on one page, opened from Settings and from
 * Home's "Make Goalpot yours" card. Answers save as they're tapped.
 */
export default function AboutYouScreen() {
  const about = useAbout();
  const { updateAbout } = useAppActions();

  // Any answer, or closing the screen, counts as having been asked (hides Home's prompt).
  const answer = (changes: Partial<AboutYou>) => updateAbout({ ...changes, askedAt: nowIsoTimestamp() });

  function close() {
    updateAbout({ askedAt: about.askedAt ?? nowIsoTimestamp() });
    if (router.canGoBack()) router.back();
    else router.replace('/settings');
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ModalHeader title="About you" onClose={close} closeLabel="Close" />
        <ScrollView contentContainerStyle={styles.content}>
          <ThemedText themeColor="textSecondary">
            Your answers tailor your budget, tips, reminders and suggestions. They stay on this
            device, and every question is optional.
          </ThemedText>

          <Card title={QUESTIONS.focus.title} subtitle={QUESTIONS.focus.intro} index={0}>
            <FocusQuestion value={about.focus} onChange={(focus) => answer({ focus })} />
          </Card>

          <Card title={QUESTIONS.pay.title} subtitle={QUESTIONS.pay.intro} index={1}>
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
          </Card>

          <Card title={QUESTIONS.emergency.title} subtitle={QUESTIONS.emergency.intro} index={2}>
            <EmergencyQuestion
              value={about.emergencyFund}
              onChange={(emergencyFund) => answer({ emergencyFund })}
            />
          </Card>

          <Card title={QUESTIONS.budget.title} subtitle={QUESTIONS.budget.intro} index={3}>
            <BudgetStyleQuestion
              value={about.budgetStyle}
              onChange={(budgetStyle) => answer({ budgetStyle })}
            />
          </Card>

          <Card title={QUESTIONS.guidance.title} subtitle={QUESTIONS.guidance.intro} index={4}>
            <GuidanceQuestion
              value={about.guidance}
              onChange={(guidance) => answer({ guidance })}
              celebrations={about.celebrations}
              onChangeCelebrations={(celebrations) => answer({ celebrations })}
            />
          </Card>
        </ScrollView>
        <View style={styles.footer}>
          <Button title="Done" onPress={close} />
        </View>
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
  content: {
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.four,
  },
  footer: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
  },
});
