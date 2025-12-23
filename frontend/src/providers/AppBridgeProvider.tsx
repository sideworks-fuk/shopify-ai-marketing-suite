'use client'

import React, { ReactNode, useEffect, useState } from 'react'

interface AppBridgeProviderProps {
  children: ReactNode
}

export function AppBridgeProvider({ children }: AppBridgeProviderProps) {
  const [AppProvider, setAppProvider] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // 動的インポートでApp Bridgeを読み込む
    const loadAppBridge = async () => {
      try {
        const appBridgeModule = await import('@shopify/app-bridge-react')
        // @shopify/app-bridge-react は通常 Provider をエクスポートする（AppProvider は存在しない版がある）
        const Provider = (appBridgeModule as any).Provider ?? (appBridgeModule as any).AppProvider
        setAppProvider(() => Provider)
      } catch (error) {
        console.error('Failed to load @shopify/app-bridge-react:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadAppBridge()
  }, [])

  // App Bridgeの設定
  const config = {
    apiKey: process.env.NEXT_PUBLIC_SHOPIFY_API_KEY || '',
    host: typeof window !== 'undefined' 
      ? new URLSearchParams(window.location.search).get('host') || ''
      : '',
    forceRedirect: false
  }

  // ローディング中は子要素のみ表示
  if (isLoading) {
    return <>{children}</>
  }

  // AppProviderが読み込めなかった場合、またはhostパラメータがない場合は、App Bridgeを使用せずに子要素をレンダリング
  if (!AppProvider || !config.host || !config.apiKey) {
    if (!AppProvider) {
      console.warn('AppBridgeProvider: AppProvider not available')
    } else {
      console.warn('AppBridgeProvider: Missing host or apiKey, rendering without App Bridge')
    }
    return <>{children}</>
  }

  return (
    <AppProvider config={config}>
      {children}
    </AppProvider>
  )
}