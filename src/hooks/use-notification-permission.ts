import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { getPermissionState, notificationsSupported, type PermissionState } from '@/services/notifications';

/**
 * The current notification permission. Re-checks when the app comes back to
 * the foreground, because the user may have changed it in the phone's settings.
 * `null` while the first check is running.
 */
export function useNotificationPermission() {
  const [state, setState] = useState<PermissionState | null>(
    notificationsSupported ? null : 'unsupported',
  );

  const refresh = useCallback(async () => {
    const next = await getPermissionState();
    setState(next);
    return next;
  }, []);

  useEffect(() => {
    if (!notificationsSupported) return;
    let cancelled = false;
    getPermissionState().then((next) => {
      if (!cancelled) setState(next);
    });
    const subscription = AppState.addEventListener('change', (status) => {
      if (status === 'active') getPermissionState().then((next) => !cancelled && setState(next));
    });
    return () => {
      cancelled = true;
      subscription.remove();
    };
  }, []);

  return { permission: state, refresh };
}
