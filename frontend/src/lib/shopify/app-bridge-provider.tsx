"use client"

import React, { createContext, useContext, useEffect, useMemo, useState, ReactNode } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { createApp } from '@shopify/app-bridge'
import { Redirect } from '@shopify/app-bridge/actions'
import { getSessionToken } from '@shopify/app-bridge-utils'

/**
 * Shopify App Bridge プロバイダー
 * 
 * @author YUKI
 * @date 2025-10-26
 * @description Shopify App Bridgeの初期化とセッショントークン取得機能を提供
 */

interface AppBridgeContextType {
  app: any | null
  isEmbedded: boolean
  getToken: () => Promise<string | null>
  shop: string | null
  host: string | null
}

const AppBridgeContext = createContext<AppBridgeContextType | undefined>(undefined)

export function useAppBridge() {
  const context = useContext(AppBridgeContext)
  if (context === undefined) {
    throw new Error('useAppBridge must be used within an AppBridgeProvider')
  }
  return context
}

interface AppBridgeProviderProps {
  children: ReactNode
}

export function AppBridgeProvider({ children }: AppBridgeProviderProps) {
  const [app, setApp] = useState<any | null>(null)
  const [isEmbedded, setIsEmbedded] = useState(false)
  const [shop, setShop] = useState<string | null>(null)
  const [host, setHost] = useState<string | null>(null)
  const searchParams = useSearchParams()
  const pathname = usePathname()

  const apiKey = useMemo(() => process.env.NEXT_PUBLIC_SHOPIFY_API_KEY || '', [])
  const storageKeys = useMemo(() => ({ host: 'shopify_host', shop: 'shopify_shop' }), [])

  useEffect(() => {
    const initializeAppBridge = () => {
      try {
        const inIframe = typeof window !== 'undefined' && window.location !== window.parent.location

        // Next.jsのsearchParams（ルーティング遷移で変化する）から取得
        const shopParam = searchParams?.get('shop')
        const hostParam = searchParams?.get('host')

        // host/shop を永続化（埋め込み遷移でクエリが落ちることがあるため）
        if (typeof window !== 'undefined') {
          if (hostParam) sessionStorage.setItem(storageKeys.host, hostParam)
          if (shopParam) sessionStorage.setItem(storageKeys.shop, shopParam)
        }

        const persistedHost =
          typeof window !== 'undefined' ? sessionStorage.getItem(storageKeys.host) : null
        const persistedShop =
          typeof window !== 'undefined' ? sessionStorage.getItem(storageKeys.shop) : null

        const resolvedHost = hostParam || persistedHost
        const resolvedShop = shopParam || persistedShop

        // 埋め込み判定: iframe内 or host/shop が存在
        const embedded = Boolean(inIframe || hostParam || resolvedHost)
        setIsEmbedded(embedded)

        if (embedded && resolvedHost && apiKey) {
          setShop(resolvedShop)
          setHost(resolvedHost)

          // host がURLから落ちている場合は補完（Shopify埋め込みの安定動作に必須）
          if (typeof window !== 'undefined' && !hostParam) {
            const url = new URL(window.location.href)
            if (!url.searchParams.get('host')) {
              url.searchParams.set('host', resolvedHost)
              if (resolvedShop && !url.searchParams.get('shop')) {
                url.searchParams.set('shop', resolvedShop)
              }
              // embedded=1 が無いケースもあるため補完（useIsEmbedded等の検知補助）
              if (!url.searchParams.get('embedded')) {
                url.searchParams.set('embedded', '1')
              }
              window.history.replaceState({}, document.title, url.toString())
            }
          }

          // App Bridgeを初期化
          const appBridge = createApp({
            apiKey,
            host: resolvedHost,
            forceRedirect: true
          })

          setApp(appBridge)
          console.log('✅ Shopify App Bridge initialized', { shop: resolvedShop, host: resolvedHost })
          
          // トップレベルリダイレクトの処理（条件付き）
          // 注意: Shopify Adminからの初回アクセス時は、pathnameがルート（/）の場合のみリダイレクト
          // それ以外のパス（/install, /customers/dormant など）は既に正しいパスなのでリダイレクトしない
          if (window.top !== window.self && window.location.pathname === '/') {
            // iframeの中にいて、かつルートパスの場合のみリダイレクト
            // ルートパスはリダイレクト専用ページなので、App Bridgeでリダイレクトする必要はない
            // （ルートページ内で適切なページにリダイレクトされる）
            console.log('ℹ️ App Bridge initialized in iframe at root path. Root page will handle redirect.')
          }
        } else {
          console.log('ℹ️ Not running in Shopify embedded context or missing host/apiKey', {
            inIframe,
            hostParam,
            persistedHost,
            apiKeyConfigured: Boolean(apiKey),
          })
          setApp(null)
        }
      } catch (error) {
        console.error('❌ Failed to initialize App Bridge:', error)
        setIsEmbedded(false)
      }
    }

    initializeAppBridge()
  }, [apiKey, pathname, searchParams, storageKeys.host, storageKeys.shop])

  const getToken = async (): Promise<string | null> => {
    if (!app || !isEmbedded) {
      console.log('⚠️ App Bridge not available for token retrieval')
      return null
    }

    try {
      const token = await getSessionToken(app)
      console.log('✅ Session token retrieved successfully')
      return token
    } catch (error) {
      console.error('❌ Failed to get session token:', error)
      return null
    }
  }

  const value: AppBridgeContextType = {
    app,
    isEmbedded,
    getToken,
    shop,
    host
  }

  return (
    <AppBridgeContext.Provider value={value}>
      {children}
    </AppBridgeContext.Provider>
  )
}