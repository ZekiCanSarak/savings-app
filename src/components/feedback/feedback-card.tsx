import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { FEEDBACK_PROMPT_DAYS } from '@/constants/feedback';
import { Spacing } from '@/constants/theme';
import { useAppActions, useFeedbackPrompt, useIsDemo } from '@/hooks/use-app-data';
import { feedbackEnabled, openFeedback } from '@/services/feedback';
import { shouldAskForFeedback } from '@/utils/feedback';

/** Home: asks once, a few days in, what the user thinks. Either button closes it for good. */
export function FeedbackCard({ index }: { index: number }) {
  const { startedAt, dismissed } = useFeedbackPrompt();
  const demo = useIsDemo();
  const { dismissFeedbackPrompt } = useAppActions();
  const show = shouldAskForFeedback(
    { startedAt, dismissed, demo, hasFeedbackLink: feedbackEnabled },
    FEEDBACK_PROMPT_DAYS,
  );
  if (!show) return null;

  return (
    <Card
      title="What do you think so far? 💬"
      subtitle="You’ve had Goalpot for a few days. It’s made by one person, and a minute of your thoughts shapes what comes next."
      index={index}>
      <View style={styles.row}>
        <View style={styles.flex}>
          <Button title="Not now" variant="secondary" onPress={dismissFeedbackPrompt} />
        </View>
        <View style={styles.flex}>
          <Button
            title="Share feedback"
            accessibilityHint="Opens a short feedback form"
            onPress={() => {
              openFeedback();
              dismissFeedbackPrompt();
            }}
          />
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  flex: {
    flex: 1,
  },
});
