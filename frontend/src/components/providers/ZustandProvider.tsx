"use client"

import { useEffect, useState } from 'react'
import { useAppStore } from '@/stores/appStore'
import { useAnalysisFiltersStore } from '@/stores/analysisFiltersStore'

interface ZustandProviderProps {
  children: React.ReactNode
}

export function ZustandProvider({ children }: ZustandProviderProps) {
  const [isHydrated, setIsHydrated] = useState(false)

  // Zustand stores
  const appStore = useAppStore()
  const filtersStore = useAnalysisFiltersStore()

  useEffect(() => {
    // クライアントサイドでのハイドレーション完了を確認
    const timer = setTimeout(() => {
      setIsHydrated(true)
    }, 500) // 500ms待機でハイドレーション完了を確実に確保

    return () => clearTimeout(timer)
  }, [])

  // ハイドレーション完了前は最小限のUIを表示
  if (!isHydrated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-2 text-gray-600">アプリケーションを初期化中...</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
} 