import { createFileRoute } from '@tanstack/react-router';
import { AccountSetup } from '@/components/AccountSetup';

export const Route = createFileRoute('/account-setup')({
  component: () => {
    const { email } = Route.useSearch();
    return <AccountSetup email={email || ''} onComplete={() => {}} />;
  },
  validateSearch: (search: Record<string, unknown>) => {
    return {
      email: (search.email as string) || '',
    };
  },
});