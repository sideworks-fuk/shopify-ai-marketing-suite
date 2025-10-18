'use client';

import { AppProvider } from '@shopify/polaris';
import enTranslations from '@shopify/polaris/locales/en.json';
import '@shopify/polaris/build/esm/styles.css';
import { ReactNode } from 'react';

interface ShopifyProviderProps {
  children: ReactNode;
}

export default function ShopifyProvider({ children }: ShopifyProviderProps) {
  return (
    <AppProvider i18n={enTranslations}>
      {children}
    </AppProvider>
  );
}