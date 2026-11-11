import { PlaceholderScreen } from '@/components/placeholder-screen';

export default function BudgetScreen() {
  return (
    <PlaceholderScreen
      title="Budget"
      description="Make your monthly income work for you."
      comingSoon={[
        'Suggested monthly savings based on your income',
        'Budgeting tips',
      ]}
    />
  );
}
