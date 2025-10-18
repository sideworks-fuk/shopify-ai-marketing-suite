'use client';

import { SubscriptionProvider } from '@/contexts/SubscriptionContext';

export default function BillingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SubscriptionProvider>
      {children}
    </SubscriptionProvider>
  );
}