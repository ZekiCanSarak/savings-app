import { PlaceholderScreen } from '@/components/placeholder-screen';
import { useProfile } from '@/hooks/use-app-data';
import { formatMoney } from '@/utils/money';

export default function HomeScreen() {
  const profile = useProfile();
  const income =
    profile.monthlyIncome === null ? null : formatMoney(profile.monthlyIncome, profile.currency);

  return (
    <PlaceholderScreen
      title={`Hi ${profile.name} 👋`}
      description={
        income ? `Your monthly income after tax: ${income}` : 'Your savings at a glance.'
      }
      comingSoon={[
        'Total saved across all goals',
        'Progress charts',
        'Reminders like "You have £340 left to save for New laptop"',
      ]}
    />
  );
}
