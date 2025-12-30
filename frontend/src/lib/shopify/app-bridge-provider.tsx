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
  // 🆕 クライアントサイドマウント状態（Hydrationエラー対策）
  const [isMounted, setIsMounted] = useState(false)
  
  const [app, setApp] = useState<any | null>(null)
  const [isEmbedded, setIsEmbedded] = useState(false)
  const [shop, setShop] = useState<string | null>(null)
  const [host, setHost] = useState<string | null>(null)
  const searchParams = useSearchParams()
  const pathname = usePathname()
  
  // 無限ループ防止: Redirect.toApp()の呼び出しを1回のみに制限
  const redirectCalledRef = useRef<Set<string>>(new Set())

  // 🆕 クライアントサイドマウント状態を設定（Hydrationエラー対策）
  useEffect(() => {
    setIsMounted(true)
  }, [])

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
          // 注意: window.top !== window.selfはforceRedirect: trueの影響でfalseになる可能性があるため、
          // 計算済みのembedded変数を使用する（embeddedはhostパラメータの存在で判断される）
          if (embedded) {
            const currentPath = window.location.pathname
            
            // 🆕 /auth/success と /setup/initial パスではRedirect.toApp()をスキップ
            // 理由: 
            // - /auth/success: OAuth認証コールバック後のページで、URLパラメータを保持する必要があるため
            // - /setup/initial: OAuth認証完了後の初期設定ページで、Redirect.toApp()を呼び出すと
            //                   Shopify側が未インストールと判断して/installにリダイレクトする可能性があるため
            const skipRedirectPaths = ['/auth/success', '/setup/initial'];
            
            if (skipRedirectPaths.includes(currentPath)) {
              console.log('⏸️ [AppBridge] スキップ対象パスのため、Redirect.toApp()をスキップします', {
                path: currentPath,
                search: window.location.search,
                embedded
              })
              // Redirect.toApp()をスキップしても、App Bridgeの初期化は完了しているため問題なし
            } else {
              // hostパラメータがある場合（embedded=true）、Redirect.toApp()を呼び出す
              // window.top !== window.selfはforceRedirectの影響でfalseになる可能性があるため
              const redirectKey = `${resolvedHost}:${currentPath}`
              
              // 既に同じパスに対してRedirect.toApp()を呼び出していない場合のみ実行
              if (!redirectCalledRef.current.has(redirectKey)) {
                // hostパラメータがある場合（embedded=true）、Redirect.toApp()を呼び出してShopify側のOAuthフローを開始
                console.log('🔄 [AppBridge] Redirect.toApp()を呼び出します:', {
                  path: currentPath,
                  embedded,
                  inIframe: window.top !== window.self,
                  hostParam: !!hostParam,
                  resolvedHost: !!resolvedHost
                })
                redirectCalledRef.current.add(redirectKey)
                appBridge.dispatch(Redirect.toApp({ path: currentPath }))
              } else {
                console.log('⏸️ [AppBridge] Redirect.toApp()は既に呼び出されています。スキップします:', {
                  path: currentPath,
                  redirectKey
                })
              }
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

  // 🆕 クライアントサイドでのみレンダリング（Hydrationエラー対策）
  // 理由: useSearchParams() を使用しているため、サーバーサイドとクライアントサイドで
  // レンダリング結果が異なる可能性がある。サーバーサイドでは初期値のみを返し、
  // クライアントサイドでのみ実際の値を設定することで、Hydration エラーを防止する。
  if (!isMounted) {
    // サーバーサイド/初期レンダリング時は初期値のコンテキストを返す
    const initialValue: AppBridgeContextType = {
      app: null,
      isEmbedded: false,
      getToken: async () => null,
      shop: null,
      host: null
    }
    return (
      <AppBridgeContext.Provider value={initialValue}>
        {children}
      </AppBridgeContext.Provider>
    )
  }

  return (
    <AppBridgeContext.Provider value={value}>
      {children}
    </AppBridgeContext.Provider>
  )
}