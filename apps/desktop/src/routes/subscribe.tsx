import { createFileRoute } from '@tanstack/react-router';
import { SubscriptionCheckout } from '@/components/SubscriptionCheckout';

export const Route = createFileRoute('/subscribe')({
  component: SubscriptionCheckout,
});