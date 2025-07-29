'use client';

import { AppProvider } from '@shopify/polaris';
import translations from '@shopify/polaris/locales/ja.json';
import React from 'react';

/**
 * Polaris Provider
 * 
 * @author YUKI
 * @date 2025-07-29
 * @description Shopify Polarisのコンテキストプロバイダー
 */
interface PolarisProviderProps {
  children: React.ReactNode;
}

export function PolarisProvider({ children }: PolarisProviderProps) {
  return (
    <AppProvider i18n={translations}>
      {children}
    </AppProvider>
  );
}