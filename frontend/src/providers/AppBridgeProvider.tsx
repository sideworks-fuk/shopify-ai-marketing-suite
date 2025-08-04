'use client'

import React, { ReactNode } from 'react'

interface AppBridgeProviderProps {
  children: ReactNode
}

export function AppBridgeProvider({ children }: AppBridgeProviderProps) {
  // 一時的にApp Bridgeを無効化してエラーを回避
  // TODO: @shopify/app-bridge-reactの正しいインポート方法を確認
  return <>{children}</>
  
  // 以下は今後の実装用にコメントアウト
  /*
  const config = {
    apiKey: process.env.NEXT_PUBLIC_SHOPIFY_API_KEY || '',
    host: typeof window !== 'undefined' 
      ? new URLSearchParams(window.location.search).get('host') || ''
      : '',
    forceRedirect: false
  }

  if (!config.host) {
    return <>{children}</>
  }

  return (
    <AppProvider config={config}>
      {children}
    </AppProvider>
  )
  */
}