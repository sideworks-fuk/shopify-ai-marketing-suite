'use client';

import { Frame, Navigation as PolarisNavigation } from '@shopify/polaris';
import {
  HomeIcon,
  OrderIcon,
  SettingsIcon,
  CreditCardIcon,
} from '@shopify/polaris-icons';
import { usePathname } from 'next/navigation';
import { ReactNode } from 'react';

interface NavigationLayoutProps {
  children: ReactNode;
}

export default function NavigationLayout({ children }: NavigationLayoutProps) {
  const pathname = usePathname();

  const navigationMarkup = (
    <PolarisNavigation location={pathname}>
      <PolarisNavigation.Section
        items={[
          {
            url: '/',
            label: 'Dashboard',
            icon: HomeIcon,
            selected: pathname === '/',
          },
          {
            url: '/orders',
            label: 'Orders',
            icon: OrderIcon,
            selected: pathname.startsWith('/orders'),
          },
          {
            url: '/billing',
            label: 'Billing',
            icon: CreditCardIcon,
            selected: pathname === '/billing',
          },
          {
            url: '/settings',
            label: 'Settings',
            icon: SettingsIcon,
            selected: pathname === '/settings',
          },
        ]}
      />
    </PolarisNavigation>
  );

  return (
    <Frame
      logo={{
        width: 124,
        topBarSource: 'https://cdn.shopify.com/s/files/1/0446/6937/files/jaded-pixel-logo-color.svg?6215648040070010999',
        contextualSaveBarSource: 'https://cdn.shopify.com/s/files/1/0446/6937/files/jaded-pixel-logo-gray.svg?6215648040070010999',
        url: '/',
        accessibilityLabel: 'Quick Ship Tracker',
      }}
      navigation={navigationMarkup}
    >
      {children}
    </Frame>
  );
}