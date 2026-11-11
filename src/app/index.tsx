import { PlaceholderScreen } from '@/components/placeholder-screen';

export default function HomeScreen() {
  return (
    <PlaceholderScreen
      title="Home"
      description="Your savings at a glance."
      comingSoon={[
        'Total saved across all goals',
        'Progress charts',
        'Reminders like "You have £340 left to save for New laptop"',
      ]}
    />
  );
}
