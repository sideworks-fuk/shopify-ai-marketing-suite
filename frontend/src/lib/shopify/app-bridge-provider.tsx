"use client"

import React, { createContext, useContext, useEffect, useMemo, useState, useRef, ReactNode } from 'react'
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
  
  // 無限ループ防止: Redirect.toApp()の呼び出しを1回のみに制限
  const redirectCalledRef = useRef<Set<string>>(new Set())

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
          
          // 埋め込みアプリの場合、Redirect.toApp()を呼び出してShopify側のOAuthフローを開始
          // 動作していたバージョン（90b0997）と同じ実装に戻す
          // 無限ループ防止: 同じパスへのRedirect.toApp()は1回のみ呼び出す
          if (window.top !== window.self) {
            const currentPath = window.location.pathname
            const redirectKey = `${resolvedHost}:${currentPath}`
            
            // 既に同じパスに対してRedirect.toApp()を呼び出していない場合のみ実行
            if (!redirectCalledRef.current.has(redirectKey)) {
              // iframeの中にいる場合、Redirect.toApp()を呼び出してShopify側のOAuthフローを開始
              console.log('🔄 [AppBridge] Redirect.toApp()を呼び出します:', currentPath)
              redirectCalledRef.current.add(redirectKey)
              appBridge.dispatch(Redirect.toApp({ path: currentPath }))
            } else {
              console.log('⏸️ [AppBridge] Redirect.toApp()は既に呼び出されています。スキップします:', currentPath)
            }
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
      console.log('⚠️ App Bridge not available for token retrieval', { app: !!app, isEmbedded })
      return null
    }

    try {
      // Shopify公式ドキュメントによると、getSessionToken()はPromiseを返し、
      // セッショントークンがundefinedの場合はAPP::ERROR::FAILED_AUTHENTICATIONエラーを投げる
      // タイムアウト処理は不要（Shopify側が適切に処理する）
      const token = await getSessionToken(app)
      console.log('✅ Session token retrieved successfully', { tokenLength: token.length })
      return token
    } catch (error) {
      console.error('❌ Failed to get session token:', error)
      // エラーが発生した場合、Shopify側が適切に処理する（エラーページへのリダイレクトなど）
      // エラーをスローせずにnullを返す
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