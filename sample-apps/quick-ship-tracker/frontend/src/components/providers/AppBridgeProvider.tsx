'use client';

import { ReactNode } from 'react';

interface AppBridgeProviderProps {
  children: ReactNode;
}

export default function AppBridgeProvider({ children }: AppBridgeProviderProps) {
  // App Bridge v4では、Providerは必要なくなりました
  // 代わりに、必要に応じて個別のフックを使用します
  // 開発環境では、App Bridgeの機能をスキップします
  
  return <>{children}</>;
}