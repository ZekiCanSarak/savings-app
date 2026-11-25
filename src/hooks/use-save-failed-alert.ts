import { useEffect } from 'react';
import { Alert, Platform } from 'react-native';

import { setSaveFailedHandler } from '@/storage/app-store';

const MESSAGE =
  'Your phone’s storage for Goalpot is full, so the latest change wasn’t saved. Try removing a goal photo, then make the change again.';

/** Shows a message (at most once a minute) when saving to storage fails, e.g. because it's full. */
export function useSaveFailedAlert() {
  useEffect(() => {
    let lastShown = 0;
    setSaveFailedHandler(() => {
      if (Date.now() - lastShown < 60_000) return;
      lastShown = Date.now();
      if (Platform.OS === 'web') window.alert(`Couldn’t save. ${MESSAGE}`);
      else Alert.alert('Couldn’t save', MESSAGE);
    });
    return () => setSaveFailedHandler(null);
  }, []);
}
