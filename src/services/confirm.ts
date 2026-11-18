import { Alert, Platform } from 'react-native';

/** Yes/no dialog. Alert buttons don't work on web, so it uses window.confirm there. */
export function confirmAction(
  title: string,
  message: string,
  confirmTitle: string,
  onConfirm: () => void,
  destructive = true,
) {
  if (Platform.OS === 'web') {
    if (window.confirm(`${title} ${message}`)) onConfirm();
    return;
  }
  Alert.alert(title, message, [
    { text: 'Cancel', style: 'cancel' },
    { text: confirmTitle, style: destructive ? 'destructive' : 'default', onPress: onConfirm },
  ]);
}
