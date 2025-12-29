"use client"

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { useAppStore } from '@/stores/appStore'
import { useAnalysisFiltersStore } from '@/stores/analysisFiltersStore'

interface ZustandProviderProps {
  children: React.ReactNode
}

export function ZustandProvider({ children }: ZustandProviderProps) {
  const pathname = usePathname()
  
  // ローディング画面をスキップするページのパスを定義
  const skipLoadingPaths = [
    '/',
    '/install',
    '/auth/success',
    '/auth/callback',
    '/auth/exit-iframe', // OAuth認証フローでiframeから脱出するページ
    '/auth/select',
    '/demo/login',
    '/terms',
    '/privacy'
  ]
  
  // 現在のパスがskipLoadingPathsに含まれているかチェック
  const shouldSkipLoading = pathname ? skipLoadingPaths.some(path => {
    if (path === '/') {
      return pathname === '/'
    }
    return pathname.startsWith(path)
  }) : false
  
  // セッション内でハイドレーション完了状態を保持（ページ遷移後も再表示しない）
  const [isHydrated, setIsHydrated] = useState(() => {
    if (typeof window === 'undefined') return false
    // セッション内で既にハイドレーション完了している場合は即座にtrue
    return sessionStorage.getItem('zustand_hydrated') === 'true'
  })
  
  // pathnameが変更されたときにshouldSkipLoadingを再評価
  useEffect(() => {
    // ローディングをスキップするページの場合は即座にハイドレーション完了とする
    if (shouldSkipLoading && !isHydrated) {
      setIsHydrated(true)
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('zustand_hydrated', 'true')
      }
    }
  }, [pathname, shouldSkipLoading, isHydrated])

  // Zustand stores
  const appStore = useAppStore()
  const filtersStore = useAnalysisFiltersStore()

  useEffect(() => {
    // 既にハイドレーション完了している場合はスキップ
    if (isHydrated) {
      return
    }

    // クライアントサイドでのハイドレーション完了を確認
    // タイマーを短縮（500ms → 100ms）し、実際のハイドレーション完了も確認
    const checkHydration = () => {
      if (typeof window !== 'undefined') {
        setIsHydrated(true)
        // セッション内でハイドレーション完了状態を保存
        sessionStorage.setItem('zustand_hydrated', 'true')
      }
    }

    // 即座にチェック（windowが利用可能な場合）
    if (typeof window !== 'undefined') {
      // 次のティックで実行（Reactのレンダリングサイクルを考慮）
      const immediateTimer = setTimeout(checkHydration, 0)
      
      // フォールバック: 100ms後に確実に完了させる
      const fallbackTimer = setTimeout(checkHydration, 100)

      return () => {
        clearTimeout(immediateTimer)
        clearTimeout(fallbackTimer)
      }
    }
  }, [isHydrated])

  // ハイドレーション完了前は最小限のUIを表示
  // ただし、ローディングをスキップするページの場合はスキップ
  // suppressHydrationWarning: サーバーサイドとクライアントサイドで異なる可能性があるため
  if (!isHydrated && !shouldSkipLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center" suppressHydrationWarning>
        <div className="text-center" suppressHydrationWarning>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto" suppressHydrationWarning></div>
          <p className="mt-2 text-gray-600" suppressHydrationWarning>アプリケーションを初期化中...</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
} 