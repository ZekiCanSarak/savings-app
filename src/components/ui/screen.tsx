import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, ScreenPadding, Spacing } from '@/constants/theme';

type ScreenProps = {
  /** Big screen title, announced as a header. */
  title?: string;
  /** Line under the title. */
  subtitle?: ReactNode;
  /** Element on the right of the title (e.g. a "+ New goal" button). */
  headerRight?: ReactNode;
  /** Leaves room for the tab bar at the bottom. On for tab screens. */
  inTabs?: boolean;
  /** Wraps the content so the keyboard doesn't cover text fields. */
  keyboard?: boolean;
  children: ReactNode;
};

/**
 * Standard scrolling screen: safe areas, side padding, a title, and content
 * centred on wide screens. Every tab screen uses this so they all line up.
 */
export function Screen({ title, subtitle, headerRight, inTabs = true, keyboard = false, children }: ScreenProps) {
  const content = (
    <ScrollView
      contentContainerStyle={[
        styles.content,
        { paddingBottom: (inTabs ? BottomTabInset : 0) + Spacing.five },
      ]}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag">
      {(title || headerRight) && (
        <View style={styles.header}>
          <View style={styles.headerText}>
            {title ? (
              <ThemedText type="title" accessibilityRole="header">
                {title}
              </ThemedText>
            ) : null}
            {typeof subtitle === 'string' ? (
              <ThemedText themeColor="textSecondary">{subtitle}</ThemedText>
            ) : (
              subtitle
            )}
          </View>
          {headerRight}
        </View>
      )}
      {children}
    </ScrollView>
  );

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        {keyboard ? (
          <KeyboardAvoidingView
            style={styles.flex}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            {content}
          </KeyboardAvoidingView>
        ) : (
          content
        )}
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
    paddingHorizontal: ScreenPadding,
    paddingTop: Spacing.three,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    marginBottom: Spacing.one,
  },
  headerText: {
    flex: 1,
    gap: Spacing.half,
  },
});
