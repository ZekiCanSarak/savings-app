import { PlaceholderScreen } from '@/components/placeholder-screen';

export default function GoalsScreen() {
  return (
    <PlaceholderScreen
      title="Goals"
      description="What you're saving for."
      comingSoon={[
        'Create goals, e.g. "New laptop, £900, by March 2027"',
        'Log money saved toward each goal',
        'See how far along each goal is',
      ]}
    />
  );
}
