"use client"

import React from 'react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/components/providers/AuthProvider'
import { useStore } from '@/contexts/StoreContext'
import { getAuthModeConfig, getCurrentEnvironmentConfig } from '@/lib/config/environments'
import { useIsEmbedded } from '@/hooks/useIsEmbedded'

type Props = {
  message?: string
}

export default function AuthenticationRequired({ message }: Props) {
  const { login, currentStoreId, isInitializing } = useAuth()
  const { currentStore } = useStore()
  const isEmbedded = useIsEmbedded()

  // 環境設定を取得（UI表示用のみ）
  const config = getAuthModeConfig()
  const envConfig = getCurrentEnvironmentConfig()

  // URLパラメータから shop を取得
  const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null
  const shopFromUrl = urlParams?.get('shop')
  const shopFromLocalStorage = typeof window !== 'undefined' ? localStorage.getItem('shopDomain') : null
  const hasShopParam = !!shopFromUrl

  // ストアドメインを取得する関数（Shopify標準フローに従う）
  const getShopDomain = (): string | null => {
    // 優先順位: URLパラメータ > localStorage > StoreContext
    // 手動入力は削除（Shopify標準フローに従う）
    return shopFromUrl || shopFromLocalStorage || currentStore.shopDomain || null
  }

  const onShopifyAuth = async () => {
    // Shopify OAuth認証を開始
    // Shopify標準フロー: shopパラメータが必要
    
    // ドメインを取得
    let domain = getShopDomain()
    
    // ドメインが取得できた場合、.myshopify.comを自動補完
    if (domain && !domain.includes('.myshopify.com')) {
      domain = `${domain}.myshopify.com`
    }
    
    if (!domain) {
      // ストアドメインが不明な場合は、/install ページにリダイレクト
      // または、Shopify管理画面から起動するよう促す
      console.warn('⚠️ ストアドメインが見つかりません。/install ページにリダイレクトします。')
      window.location.href = '/install'
      return
    }
    
    // API Keyを環境変数から取得（マルチアプリ対応）
    const apiKey = process.env.NEXT_PUBLIC_SHOPIFY_API_KEY
    
    // ==========================================================
    // 重要: HTTPリダイレクト方式を使用（iframeセキュリティ対応）
    // ==========================================================
    // 埋め込みアプリ（iframe内）からwindow.top.locationにアクセスすると
    // クロスオリジンポリシーでブロックされるため、
    // バックエンドの/api/shopify/installエンドポイントに直接リダイレクトし、
    // HTTPレベルの302リダイレクトでOAuth URLに遷移させる
    // ==========================================================
    
    const installParams = new URLSearchParams({
      shop: domain,
    })
    
    // API Keyが設定されている場合は追加
    if (apiKey) {
      installParams.append('apiKey', apiKey)
    }
    
    // バックエンドのinstallエンドポイントURL（HTTP 302リダイレクトを返す）
    const installUrl = `${envConfig.apiBaseUrl}/api/shopify/install?${installParams.toString()}`
    
    console.log('🔐 Shopify OAuth認証を開始（HTTPリダイレクト方式）:', installUrl, {
      source: shopFromUrl ? 'URL parameter' : shopFromLocalStorage ? 'localStorage' : 'StoreContext',
      domain,
      apiKey: apiKey ? '設定済み' : '未設定',
      isEmbedded
    })
    console.log('📝 この方式はiframe内のクロスオリジン制限を回避できます')
    
    // バックエンドにリダイレクト（HTTP 302リダイレクトでOAuth URLに遷移）
    window.location.href = installUrl
  }

  const onDemoAuth = () => {
    // デモモード認証ページへ遷移
    // TODO: /demo/loginページを実装後に有効化
    window.location.href = '/demo/login'
  }

  const onGoToInstall = () => {
    // /install ページにリダイレクト（ストアドメインを入力できる）
    window.location.href = '/install'
  }

  // 環境に応じたタイトル
  const title = config.environment === 'production' 
    ? 'Shopify認証が必要です' 
    : '認証が必要です'
  
  // 環境に応じたメッセージ
  const defaultMessage = config.environment === 'production'
    ? 'セッションが無効または期限切れです。Shopify認証を実行してください。'
    : 'このアプリにアクセスするには認証が必要です。'
  
  // デモリンク表示判定（authMode設定に基づく）
  const showDemoLink = config.authMode !== 'oauth_required'

  // デバッグ情報
  if (config.debugMode) {
    console.log('🔍 [AuthenticationRequired] Config:', {
      environment: config.environment,
      authMode: config.authMode,
      showDemoLink,
      hasShopParam,
      title,
      enableDevTools: config.enableDevTools
    })
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="max-w-md w-full bg-white rounded-lg shadow p-8 text-center">
        {/* タイトル（環境別） */}
        <h1 className="text-2xl font-bold mb-2">
          {title}
          {/* デバッグ用: 環境情報を表示 */}
          {config.debugMode && (
            <span className="text-xs text-gray-500 block mt-1">
              (ENV: {config.environment} | AUTH: {config.authMode})
            </span>
          )}
        </h1>
        
        {/* shop パラメータがない場合: Shopify管理画面から起動するよう促す */}
        {!hasShopParam ? (
          <div>
            <p className="text-gray-600 mb-6">
              {config.environment === 'production' 
                ? 'このアプリはShopify管理画面から起動してください。'
                : 'ストアドメインが取得できませんでした。Shopify管理画面から起動するか、インストールページでストアドメインを入力してください。'}
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-left">
              <p className="text-sm text-blue-800 font-semibold mb-2">
                📱 アプリの起動方法:
              </p>
              <ol className="text-sm text-blue-700 space-y-1 list-decimal list-inside">
                <li>Shopify管理画面にログイン</li>
                <li>左メニューから「アプリ」をクリック</li>
                <li>「EC Ranger」を選択</li>
              </ol>
            </div>
            <div className="space-y-3">
              <a
                href="https://admin.shopify.com"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-center"
              >
                Shopify管理画面を開く
              </a>
              {config.environment !== 'production' && (
                <Button
                  onClick={onGoToInstall}
                  variant="outline"
                  className="w-full"
                >
                  インストールページでストアドメインを入力
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div>
            {/* メッセージ（環境別） */}
            <p className="text-gray-600 mb-6">
              {message ?? defaultMessage}
            </p>
        
            {/* Shopify OAuth認証ボタン */}
            <div className="space-y-3">
              <Button 
                onClick={onShopifyAuth} 
                disabled={isInitializing} 
                className="w-full"
                variant="default"
              >
                Shopifyで認証する
              </Button>
              
              {config.environment !== 'production' && (
                <p className="text-xs text-gray-500">
                  💡 Shopify OAuth認証フローをテストできます。
                </p>
              )}
            </div>
        
            {/* デモリンク（authMode設定に基づく） */}
            {showDemoLink && (
              <div className="mt-6 pt-4 border-t border-gray-200">
                <div className="bg-blue-50 rounded-lg p-4 text-left border border-blue-100">
                  <p className="text-sm font-semibold text-blue-800 mb-2">
                    🎯 デモ・プレゼンテーション用
                  </p>
                  <p className="text-xs text-blue-700 mb-3">
                    Shopify認証なしでデータを確認できます。<br/>
                    お客様へのデモやプレゼンテーションにご利用ください。
                  </p>
                  <Button 
                    onClick={onDemoAuth}
                    className="w-full"
                    variant="outline"
                  >
                    デモサイトを開く
                  </Button>
                  <p className="text-xs text-blue-600 mt-2">
                    ※ パスワード認証でアクセスできます
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
