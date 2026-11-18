import { useEffect, useRef, useState } from 'react';
import { AppState, Modal, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useAppLock } from '@/hooks/use-app-data';
import { appLockSupported, authenticate } from '@/services/app-lock';

/**
 * Covers the app with a lock screen when "Lock with Face ID or passcode" is
 * on: when the app opens, and whenever it comes back from the background.
 * Mounted in the root layout after onboarding. Does nothing on web.
 *
 * A native Modal is used so the lock also covers screens shown as modals.
 */
export function AppLockGate() {
  const enabled = useAppLock() && appLockSupported;
  // Locked from the start if the lock was already on when the app opened.
  const [locked, setLocked] = useState(enabled);
  const [failed, setFailed] = useState(false);
  const lockedRef = useRef(locked);
  const busyRef = useRef(false);
  const enabledRef = useRef(enabled);

  useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);

  async function unlock() {
    if (busyRef.current) return;
    busyRef.current = true;
    const ok = await authenticate('Unlock Goalpot');
    busyRef.current = false;
    if (ok) {
      lockedRef.current = false;
      setLocked(false);
      setFailed(false);
    } else {
      setFailed(true);
    }
  }

  useEffect(() => {
    // Ask straight away when the app opens locked.
    if (lockedRef.current && AppState.currentState === 'active') void unlock();
    const subscription = AppState.addEventListener('change', (status) => {
      if (status === 'background' && enabledRef.current) {
        // Lock on leaving (not on 'inactive': the Face ID prompt itself causes that).
        lockedRef.current = true;
        setLocked(true);
        setFailed(false);
      } else if (status === 'active' && lockedRef.current) {
        void unlock();
      }
    });
    return () => subscription.remove();
    // Only set up once; the refs carry the latest values.
  }, []);

  if (!enabled) return null;

  return (
    <Modal visible={locked} animationType="none" presentationStyle="fullScreen" onRequestClose={() => {}}>
      <ThemedView style={styles.container}>
        <View style={styles.content}>
          <ThemedText type="emojiLarge" importantForAccessibility="no" style={styles.center}>
            🔒
          </ThemedText>
          <ThemedText type="title" accessibilityRole="header" style={styles.center}>
            Goalpot is locked
          </ThemedText>
          <ThemedText themeColor="textSecondary" style={styles.center}>
            {failed
              ? 'That didn’t work. Try again with Face ID, your fingerprint or your passcode.'
              : 'Unlock with Face ID, your fingerprint or your passcode.'}
          </ThemedText>
          <Button title="Unlock" onPress={() => void unlock()} />
        </View>
      </ThemedView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
  },
  content: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignItems: 'stretch',
    gap: Spacing.three,
  },
  center: {
    textAlign: 'center',
  },
});
