import { Linking, Platform } from 'react-native';

import { FEEDBACK_URL } from '@/constants/feedback';

/** True when there's somewhere to send feedback (see constants/feedback.ts). */
export const feedbackEnabled = FEEDBACK_URL.length > 0;

/** Opens the feedback form: a new tab on web, the browser or mail app on phones. */
export function openFeedback() {
  if (!feedbackEnabled) return;
  if (Platform.OS === 'web' && !FEEDBACK_URL.startsWith('mailto:')) {
    window.open(FEEDBACK_URL, '_blank', 'noopener');
    return;
  }
  void Linking.openURL(FEEDBACK_URL);
}
