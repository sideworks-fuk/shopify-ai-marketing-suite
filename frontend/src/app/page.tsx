"use client"

import React, { useEffect, useState, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/components/providers/AuthProvider'
import { getCurrentEnvironmentConfig, getAuthModeConfig } from '@/lib/config/environments'

/**
 * ルートページ - リダイレクト専用
 * 
 * このページはダッシュボードUIを表示せず、認証状態に基づいて
 * 適切なページにリダイレクトするためだけに使用されます。
 * 
 * - 認証済み → /customers/dormant（メインダッシュボード）
 * - 未認証（開発環境） → /auth/select（認証方法選択画面）
 * - 未認証（本番環境） → /install（インストールページ）
 */
export default function HomePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { isAuthenticated, isInitializing, isApiClientReady } = useAuth()
  // 初期メッセージをZustandProviderと同じに統一（Hydrationエラーを防ぐ）
  const [statusMessage, setStatusMessage] = useState('アプリケーションを初期化中...')
  const [isMounted, setIsMounted] = useState(false) // クライアントサイドマウント状態（Hydrationエラー対策）
  const hasProcessedRef = useRef(false)

  // クライアントサイドマウント状態を設定（Hydrationエラー対策）
  useEffect(() => {
    setIsMounted(true)
  }, [])

  // タイムアウト処理: 10秒以上待機してもリダイレクトされない場合はインストールページへ
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (!hasProcessedRef.current) {
        console.warn('⏰ [ルートページ] タイムアウト: 10秒経過しても認証状態が確定しませんでした')
        console.warn('⏰ [ルートページ] 状態:', { isInitializing, isApiClientReady, isAuthenticated })
        console.warn('⏰ [ルートページ] 強制的にインストールページへリダイレクトします')
        
        const shop = searchParams?.get('shop')
        const host = searchParams?.get('host')
        const embedded = searchParams?.get('embedded')
        const hmac = searchParams?.get('hmac')
        const timestamp = searchParams?.get('timestamp')
        
        const params = new URLSearchParams()
        if (shop) params.set('shop', shop)
        if (host) params.set('host', host)
        if (embedded) params.set('embedded', embedded)
        if (hmac) params.set('hmac', hmac)
        if (timestamp) params.set('timestamp', timestamp)
        const queryString = params.toString()
        
        hasProcessedRef.current = true
        setStatusMessage('インストールページへ移動中...')
        router.replace(`/install${queryString ? `?${queryString}` : ''}`)
      }
    }, 10000) // 10秒タイムアウト（5秒から延長）

    return () => clearTimeout(timeoutId)
  }, [router, searchParams, isInitializing, isApiClientReady, isAuthenticated])

  // 認証状態に基づいてリダイレクト
  useEffect(() => {
    console.log('🔄 [ルートページ] useEffect実行:', { 
      isInitializing, 
      isApiClientReady, 
      isAuthenticated,
      hasProcessed: hasProcessedRef.current 
    })
    
    // 既に処理済みの場合はスキップ
    if (hasProcessedRef.current) {
      console.log('⏸️ [ルートページ] 既に処理済み、スキップ')
      return
    }

    // 初期化中またはAPIクライアントが準備完了していない場合は待機
    if (isInitializing || !isApiClientReady) {
      console.log('⏳ [ルートページ] 認証状態の初期化中...', { isInitializing, isApiClientReady })
      setStatusMessage('アプリケーションを初期化中...')
      return
    }

    const processRedirect = async () => {
      // 処理開始をマーク（重複実行を防ぐ）
      if (hasProcessedRef.current) {
        console.log('⏸️ [ルートページ] processRedirect: 既に処理済み、スキップ')
        return
      }
      hasProcessedRef.current = true
      
      console.log('🚀 [ルートページ] リダイレクト処理を開始します')
      
      const shop = searchParams?.get('shop')
      const host = searchParams?.get('host')
      const embedded = searchParams?.get('embedded')
      const hmac = searchParams?.get('hmac')
      const timestamp = searchParams?.get('timestamp')

      console.log('🔍 [ルートページ] 認証状態をチェック:', { isAuthenticated, shop, host, embedded, hmac: !!hmac, timestamp: !!timestamp })

      // クエリパラメータを保持するためのヘルパー関数
      // Shopify Adminからのアクセス時に必要なパラメータ（hmac, timestamp）も保持
      const buildRedirectUrl = (basePath: string) => {
        const params = new URLSearchParams()
        if (shop) params.set('shop', shop)
        if (host) params.set('host', host)
        if (embedded) params.set('embedded', embedded)
        if (hmac) params.set('hmac', hmac)
        if (timestamp) params.set('timestamp', timestamp)
        const queryString = params.toString()
        return `${basePath}${queryString ? `?${queryString}` : ''}`
      }

      if (isAuthenticated) {
        // デモトークンが存在する場合は、デモモード専用のリダイレクトロジックを適用
        const demoToken = typeof window !== 'undefined' ? localStorage.getItem('demoToken') || localStorage.getItem('demo_token') : null
        const authMode = typeof window !== 'undefined' ? localStorage.getItem('authMode') : null
        const oauthAuthenticated = typeof window !== 'undefined' ? localStorage.getItem('oauth_authenticated') : null
        
        if (demoToken && authMode === 'demo') {
          // デモモードの場合、ストア確認をスキップしてデモモード専用のダッシュボードにリダイレクト
          console.log('🎭 [ルートページ] デモモード検出: デモモード専用ダッシュボードへリダイレクト')
          setStatusMessage('デモモードダッシュボードを読み込み中...')
          const redirectUrl = buildRedirectUrl('/customers/dormant')
          router.replace(redirectUrl)
          return
        }
        
        // 🆕 Shopify埋め込みモードでOAuth未完了の場合は、ストアAPIを呼び出さずにインストールページへ
        if (shop && oauthAuthenticated !== 'true') {
          console.log('⚠️ [ルートページ] Shopify埋め込みモードでOAuth未完了: インストールページへリダイレクト', {
            shop,
            oauthAuthenticated,
            isAuthenticated
          })
          const redirectUrl = buildRedirectUrl('/install')
          setStatusMessage('インストールページへ移動中...')
          router.replace(redirectUrl)
          return
        }
        
        // OAuth認証済みの場合のみ、ストアの存在を確認
        setStatusMessage('ストア情報を確認中...')
        
        try {
          console.log('🔍 [ルートページ] ストアの存在を確認中...')
          const config = getCurrentEnvironmentConfig()
          console.log('🔍 [ルートページ] API URL:', `${config.apiBaseUrl}/api/store`)
          
          const response = await fetch(`${config.apiBaseUrl}/api/store`, {
            credentials: 'include',
          })
          
          console.log('🔍 [ルートページ] レスポンスステータス:', response.status, response.statusText)
          
          // 🆕 401エラーの場合は、認証が完了していない可能性があるため、インストールページへリダイレクト
          if (response.status === 401) {
            console.warn('⚠️ [ルートページ] 401エラー: 認証が完了していない可能性があります。インストールページへリダイレクトします。')
            const redirectUrl = buildRedirectUrl('/install')
            setStatusMessage('インストールページへ移動中...')
            router.replace(redirectUrl)
            return
          }
          
          if (response.ok) {
            const result: unknown = await response.json()
            console.log('🔍 [ルートページ] レスポンスデータ:', result)
            
            // レスポンス構造の確認: { success: true, data: { stores: [...], totalCount: 0 } }
            const responseData = result as { 
              success?: boolean
              data?: { 
                stores?: unknown[]
                Stores?: unknown[]  // C#のプロパティ名（大文字）も考慮
                totalCount?: number
              } 
            }
            
            // stores または Stores のどちらかを使用
            const stores = responseData.data?.stores || responseData.data?.Stores
            
            console.log('🔍 [ルートページ] 取得したストア:', stores)
            console.log('🔍 [ルートページ] ストア数:', stores?.length || 0)

            if (Array.isArray(stores) && stores.length > 0) {
              // ストアが存在する場合、メインダッシュボードにリダイレクト
              const redirectUrl = buildRedirectUrl('/customers/dormant')
              console.log('✅ [ルートページ] 認証済み & ストア存在: リダイレクト:', redirectUrl)
              setStatusMessage('ダッシュボードを読み込み中...')
              router.replace(redirectUrl)
              return
            }
            
            // ストアが0件の場合
            console.log('⚠️ [ルートページ] ストアが0件です。インストールページへリダイレクト')
          } else {
            console.warn('⚠️ [ルートページ] ストア取得APIがエラーを返しました:', response.status)
          }
          
          // ストアが存在しない、またはエラーの場合
          // 認証情報をクリアして未認証として扱う
          console.log('⚠️ [ルートページ] ストアが存在しない: 認証情報をクリアして未認証として扱う')
          localStorage.removeItem('oauth_authenticated')
          localStorage.removeItem('currentStoreId')
          localStorage.removeItem('demo_token') // デモトークンもクリア
          localStorage.removeItem('demoToken') // デモトークンもクリア（両方のキー名に対応）
          
          // 未認証時のリダイレクトロジックを適用
          const authConfig = getAuthModeConfig()
          const isDevelopment = authConfig.environment === 'development'
          const allowsDemo = authConfig.authMode === 'all_allowed' || authConfig.authMode === 'demo_allowed'
          
          if (isDevelopment && allowsDemo && !shop) {
            // 開発環境でデモモードが許可されている場合、認証選択画面へ
            console.log('🔍 [ルートページ] 開発環境 & デモモード許可: 認証選択画面へリダイレクト')
            setStatusMessage('認証方法を選択中...')
            router.replace('/auth/select')
          } else {
            // それ以外の場合はインストールページへ
            const redirectUrl = buildRedirectUrl('/install')
            console.log('⚠️ [ルートページ] インストールページへリダイレクト:', redirectUrl)
            setStatusMessage('インストールページへ移動中...')
            router.replace(redirectUrl)
          }
        } catch (error) {
          console.error('❌ [ルートページ] ストア確認エラー:', error)
          
          // エラー時も認証情報をクリアして未認証として扱う
          localStorage.removeItem('oauth_authenticated')
          localStorage.removeItem('currentStoreId')
          localStorage.removeItem('demo_token') // デモトークンもクリア
          localStorage.removeItem('demoToken') // デモトークンもクリア（両方のキー名に対応）
          
          // 未認証時のリダイレクトロジックを適用
          const authConfig = getAuthModeConfig()
          const isDevelopment = authConfig.environment === 'development'
          const allowsDemo = authConfig.authMode === 'all_allowed' || authConfig.authMode === 'demo_allowed'
          
          if (isDevelopment && allowsDemo && !shop) {
            // 開発環境でデモモードが許可されている場合、認証選択画面へ
            console.log('🔍 [ルートページ] 開発環境 & デモモード許可: 認証選択画面へリダイレクト')
            setStatusMessage('認証方法を選択中...')
            router.replace('/auth/select')
          } else {
            // それ以外の場合はインストールページへ
            const redirectUrl = buildRedirectUrl('/install')
            console.log('⚠️ [ルートページ] インストールページへリダイレクト:', redirectUrl)
            setStatusMessage('インストールページへ移動中...')
            router.replace(redirectUrl)
          }
        }
      } else {
        // 未認証の場合
        // 重要: Shopify Adminからアクセスされている場合（shop/hostパラメータがある場合）、
        // Shopify側が自動的にOAuthフローにリダイレクトするため、フロントエンド側でリダイレクトしない
        // 成功時（26日21時ごろ）は、Shopify側が以下のように自動的にリダイレクトしていた：
        // 1. /oauth/install_custom_app
        // 2. /oauth/install
        // 3. /app/grant
        
        if (shop || host) {
          // Shopify Adminからアクセスされている場合、Shopify側のOAuthフローに任せる
          console.log('⏳ [ルートページ] Shopify Adminからアクセスされています。Shopify側のOAuthフローを待機中...', { shop, host })
          console.log('⏳ [ルートページ] Shopify側が自動的にOAuthフローにリダイレクトすることを期待します')
          setStatusMessage('Shopify認証を待機中...')
          // リダイレクトしない（Shopify側の処理を待つ）
          return
        }
        
        // Shopify Adminからアクセスされていない場合（ブラウザで直接アクセス）のみ、リダイレクト処理を実行
        const authConfig = getAuthModeConfig()
        const isDevelopment = authConfig.environment === 'development'
        const allowsDemo = authConfig.authMode === 'all_allowed' || authConfig.authMode === 'demo_allowed'
        
        // デバッグログを追加
        console.log('🔍 [ルートページ] 認証設定確認:', {
          environment: authConfig.environment,
          authMode: authConfig.authMode,
          isDevelopment,
          allowsDemo,
          shop,
          NEXT_PUBLIC_ENVIRONMENT: process.env.NEXT_PUBLIC_ENVIRONMENT,
          NEXT_PUBLIC_AUTH_MODE: process.env.NEXT_PUBLIC_AUTH_MODE,
        })
        
        // 開発環境でデモモードが許可されている場合、認証選択画面にリダイレクト
        if (isDevelopment && allowsDemo) {
          console.log('🔍 [ルートページ] 開発環境 & デモモード許可: 認証選択画面へリダイレクト')
          setStatusMessage('認証方法を選択中...')
          router.replace('/auth/select')
        } else {
          // それ以外の場合はインストールページへ
          const redirectUrl = buildRedirectUrl('/install')
          console.log('⚠️ [ルートページ] 未認証: リダイレクト:', redirectUrl, {
            reason: !isDevelopment ? 'not-development' : !allowsDemo ? 'demo-not-allowed' : 'shop-param-exists'
          })
          setStatusMessage('インストールページへ移動中...')
          router.replace(redirectUrl)
        }
      }
    }

    // 少し遅延してからリダイレクト（認証状態の安定を待つ）
    const timeoutId = setTimeout(processRedirect, 100)

    return () => clearTimeout(timeoutId)
  }, [isAuthenticated, isInitializing, isApiClientReady, router, searchParams])

  // クライアントサイドでのみレンダリング（Hydrationエラー対策）
  if (!isMounted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-2 text-gray-600">アプリケーションを初期化中...</p>
        </div>
      </div>
    )
  }

  // 常にローディング画面を表示（ダッシュボードUIは表示しない）
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
        <p className="mt-2 text-gray-600">{statusMessage}</p>
      </div>
    </div>
  )
}