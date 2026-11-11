import { Stack } from 'expo-router';

/** The Goals tab has its own stack: the list, then a goal's detail screen. */
export default function GoalsLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="[id]" options={{ title: '', headerBackTitle: 'Goals' }} />
    </Stack>
  );
}
