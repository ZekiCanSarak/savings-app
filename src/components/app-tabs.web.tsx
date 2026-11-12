import {
  Tabs,
  TabList,
  TabTrigger,
  TabSlot,
  TabTriggerSlotProps,
  TabListProps,
} from 'expo-router/ui';
import { Pressable, StyleSheet, type PressableProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MaxContentWidth, MinTapSize, Spacing } from '@/constants/theme';

import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

/**
 * Tab bar for the web version of the app.
 * The iOS/Android version lives in app-tabs.tsx — keep the two in sync.
 *
 * The bar sits below the screens rather than floating over them, so screens
 * need no bottom inset on web (BottomTabInset is 0 there).
 */
export default function AppTabs() {
  return (
    <Tabs style={styles.tabs}>
      <TabSlot style={styles.slot} />
      <TabList asChild>
        <CustomTabList>
          <TabTrigger name="index" href="/" asChild>
            <TabButton>Home</TabButton>
          </TabTrigger>
          <TabTrigger name="goals" href="/goals" asChild>
            <TabButton>Goals</TabButton>
          </TabTrigger>
          <TabTrigger name="budget" href="/budget" asChild>
            <TabButton>Budget</TabButton>
          </TabTrigger>
          <TabTrigger name="settings" href="/settings" asChild>
            <TabButton>Settings</TabButton>
          </TabTrigger>
        </CustomTabList>
      </TabList>
    </Tabs>
  );
}

export function TabButton({ children, isFocused, ...props }: TabTriggerSlotProps) {
  return (
    // TabTrigger's slot props are typed for a View; Pressable accepts the same props.
    <Pressable
      {...(props as PressableProps)}
      style={({ pressed }) => [styles.tabButton, pressed && styles.pressed]}>
      <ThemedView
        type={isFocused ? 'backgroundSelected' : 'backgroundElement'}
        style={styles.tabButtonView}>
        <ThemedText type="small" themeColor={isFocused ? 'text' : 'textSecondary'}>
          {children}
        </ThemedText>
      </ThemedView>
    </Pressable>
  );
}

export function CustomTabList(props: TabListProps) {
  // Keeps the bar clear of the iPhone home indicator when opened from the home screen.
  const insets = useSafeAreaInsets();
  return (
    <ThemedView
      {...props}
      style={[styles.tabListContainer, { paddingBottom: insets.bottom + Spacing.two }]}>
      <ThemedView type="backgroundElement" style={styles.innerContainer}>
        {props.children}
      </ThemedView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  tabs: {
    flex: 1,
  },
  slot: {
    flex: 1,
  },
  tabListContainer: {
    width: '100%',
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  innerContainer: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.five,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    flexGrow: 1,
    gap: Spacing.two,
    maxWidth: MaxContentWidth,
  },
  pressed: {
    opacity: 0.7,
  },
  tabButton: {
    flex: 1,
  },
  tabButtonView: {
    minHeight: MinTapSize,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.two,
    borderRadius: Spacing.three,
  },
});
