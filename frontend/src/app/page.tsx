"use client"

import React, { useEffect, useState, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/components/providers/AuthProvider'
import { getCurrentEnvironmentConfig } from '@/lib/config/environments'

/**
 * ルートページ - リダイレクト専用
 * 
 * このページはダッシュボードUIを表示せず、認証状態に基づいて
 * 適切なページにリダイレクトするためだけに使用されます。
 * 
 * - 認証済み → /customers/dormant（メインダッシュボード）
 * - 未認証 → /install（インストールページ）
 */
export default function HomePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { isAuthenticated, isInitializing, isApiClientReady } = useAuth()
  const [statusMessage, setStatusMessage] = useState('認証状態を確認中...')
  const hasProcessedRef = useRef(false)

  // タイムアウト処理: 5秒以上待機してもリダイレクトされない場合はインストールページへ
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (!hasProcessedRef.current) {
        console.warn('⏰ [ルートページ] タイムアウト: 5秒経過しても認証状態が確定しませんでした')
        console.warn('⏰ [ルートページ] 強制的にインストールページへリダイレクトします')
        
        const shop = searchParams?.get('shop')
        const host = searchParams?.get('host')
        const embedded = searchParams?.get('embedded')
        
        const params = new URLSearchParams()
        if (shop) params.set('shop', shop)
        if (host) params.set('host', host)
        if (embedded) params.set('embedded', embedded)
        const queryString = params.toString()
        
        hasProcessedRef.current = true
        setStatusMessage('インストールページへ移動中...')
        router.replace(`/install${queryString ? `?${queryString}` : ''}`)
      }
    }, 5000) // 5秒タイムアウト

    return () => clearTimeout(timeoutId)
  }, [router, searchParams])

  // 認証状態に基づいてリダイレクト
  useEffect(() => {
    // 既に処理済みの場合はスキップ
    if (hasProcessedRef.current) {
      console.log('⏸️ [ルートページ] 既に処理済み、スキップ')
      return
    }

    // 初期化中またはAPIクライアントが準備完了していない場合は待機
    if (isInitializing || !isApiClientReady) {
      console.log('⏳ [ルートページ] 認証状態の初期化中...', { isInitializing, isApiClientReady })
      setStatusMessage('認証状態を確認中...')
      return
    }

    // 処理開始をマーク
    hasProcessedRef.current = true

    const processRedirect = async () => {
      const shop = searchParams?.get('shop')
      const host = searchParams?.get('host')
      const embedded = searchParams?.get('embedded')

      console.log('🔍 [ルートページ] 認証状態をチェック:', { isAuthenticated, shop, host, embedded })

      // クエリパラメータを保持するためのヘルパー関数
      const buildRedirectUrl = (basePath: string) => {
        const params = new URLSearchParams()
        if (shop) params.set('shop', shop)
        if (host) params.set('host', host)
        if (embedded) params.set('embedded', embedded)
        const queryString = params.toString()
        return `${basePath}${queryString ? `?${queryString}` : ''}`
      }

      if (isAuthenticated) {
        // 認証済みの場合、ストアの存在を確認
        setStatusMessage('ストア情報を確認中...')
        
        try {
          console.log('🔍 [ルートページ] ストアの存在を確認中...')
          const config = getCurrentEnvironmentConfig()
          const response = await fetch(`${config.apiBaseUrl}/api/store`, {
            credentials: 'include',
          })
          
          if (response.ok) {
            const result: unknown = await response.json()
            const stores = (result as { data?: { stores?: unknown[] } })?.data?.stores

            if (Array.isArray(stores) && stores.length > 0) {
              // ストアが存在する場合、メインダッシュボードにリダイレクト
              const redirectUrl = buildRedirectUrl('/customers/dormant')
              console.log('✅ [ルートページ] 認証済み & ストア存在: リダイレクト:', redirectUrl)
              setStatusMessage('ダッシュボードを読み込み中...')
              router.replace(redirectUrl)
              return
            }
          }
          
          // ストアが存在しない、またはエラーの場合はインストールページへ
          console.log('⚠️ [ルートページ] ストアが存在しない: インストールページへリダイレクト')
          localStorage.removeItem('oauth_authenticated')
          localStorage.removeItem('currentStoreId')
          
          const redirectUrl = buildRedirectUrl('/install')
          setStatusMessage('インストールページへ移動中...')
          router.replace(redirectUrl)
        } catch (error) {
          console.error('❌ [ルートページ] ストア確認エラー:', error)
          const redirectUrl = buildRedirectUrl('/install')
          setStatusMessage('インストールページへ移動中...')
          router.replace(redirectUrl)
        }
      } else {
        // 未認証の場合、インストールページにリダイレクト
        const redirectUrl = buildRedirectUrl('/install')
        console.log('⚠️ [ルートページ] 未認証: リダイレクト:', redirectUrl)
        setStatusMessage('インストールページへ移動中...')
        router.replace(redirectUrl)
      }
    }

    // 少し遅延してからリダイレクト（認証状態の安定を待つ）
    const timeoutId = setTimeout(processRedirect, 100)

    return () => clearTimeout(timeoutId)
  }, [isAuthenticated, isInitializing, isApiClientReady, router, searchParams])

  // 常にローディング画面を表示（ダッシュボードUIは表示しない）
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-50 to-white">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600 font-medium">{statusMessage}</p>
        <p className="text-gray-400 text-sm mt-2">EC Ranger</p>
      </div>
    </div>
  )
}