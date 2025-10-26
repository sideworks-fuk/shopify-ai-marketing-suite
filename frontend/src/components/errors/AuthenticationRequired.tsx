"use client"

import React from 'react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/components/providers/AuthProvider'
import { useStore } from '@/contexts/StoreContext'
import { getAuthModeConfig } from '@/lib/config/environments'

type Props = {
  message?: string
}

export default function AuthenticationRequired({ message }: Props) {
  const { login, currentStoreId, isInitializing } = useAuth()
  const { currentStore } = useStore()

  // 環境設定を取得（UI表示用のみ）
  const config = getAuthModeConfig()

  const onShopifyAuth = async () => {
    // Shopify OAuth認証を開始
    // 優先順位: URLパラメータ > StoreContext > エラー
    const urlParams = new URLSearchParams(window.location.search)
    const shopFromUrl = urlParams.get('shop')
    const domain = shopFromUrl || currentStore.shopDomain
    
    if (!domain) {
      // ストアドメインが不明な場合はエラー
      console.error('❌ ストアドメインが見つかりません', {
        currentStore,
        shopDomain: domain,
        shopFromUrl,
        urlParams: window.location.search
      })
      
      // より詳細なエラーメッセージ
      const errorMessage = config.environment === 'production'
        ? 'ストア情報が見つかりません。Shopifyアプリを再インストールしてください。'
        : `ストア情報が見つかりません。\n\n` +
          `現在のストア: ${currentStore.name} (ID: ${currentStore.id})\n` +
          `shopDomain: ${domain ?? '未設定'}\n` +
          `URLパラメータ: ${window.location.search}\n` +
          `shop (URL): ${shopFromUrl ?? '未設定'}\n\n` +
          `デバッグ情報:\n` +
          `- URLパラメータに ?shop=xxx.myshopify.com が含まれていません\n` +
          `- StoreContextからshopDomainを取得できませんでした\n` +
          `- Shopifyアプリは通常、shopパラメータ付きで起動されます`
      
      alert(errorMessage)
      return
    }
    
    // Shopify OAuth認証フローを開始
    const shopifyAuthUrl = `/api/shopify/install?shop=${domain}`
    console.log('🔐 Shopify OAuth認証を開始:', shopifyAuthUrl, {
      source: shopFromUrl ? 'URL parameter' : 'StoreContext',
      domain
    })
    window.location.href = shopifyAuthUrl
  }

  const onDemoAuth = () => {
    // デモモード認証ページへ遷移
    window.location.href = '/dev-bookmarks'
  }

  // URLパラメータから shop を取得
  const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null
  const shopFromUrl = urlParams?.get('shop')
  const hasShopParam = !!shopFromUrl

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
        
        {/* 本番環境 + shop パラメータなし: Shopify管理画面に戻るよう促す */}
        {config.environment === 'production' && !hasShopParam ? (
          <div>
            <p className="text-gray-600 mb-6">
              このアプリはShopify管理画面から起動してください。
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
            <a
              href="https://admin.shopify.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
            >
              Shopify管理画面を開く
            </a>
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
