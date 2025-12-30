"use client"

import { usePathname, useSearchParams } from "next/navigation"
import { useState, useEffect } from "react"
import MainLayout from "./MainLayout"
import { EmbeddedAppLayout } from "./EmbeddedAppLayout"
import { useIsEmbedded } from "@/hooks/useIsEmbedded"

interface ConditionalLayoutProps {
  children: React.ReactNode
}

export default function ConditionalLayout({ children }: ConditionalLayoutProps) {
  const pathname = usePathname()
  const isEmbedded = useIsEmbedded()
  const [isMounted, setIsMounted] = useState(false) // クライアントサイドマウント状態（Hydrationエラー対策）
  
  // クライアントサイドマウント状態を設定（Hydrationエラー対策）
  useEffect(() => {
    setIsMounted(true)
  }, [])
  
  // MainLayout/EmbeddedAppLayoutを使わないページのパスを定義
  const noLayoutPaths = [
    '/', // ルートページはリダイレクト専用のため、レイアウトを適用しない
    '/install',
    '/auth/success',
    '/auth/callback',
    '/auth/select',
    '/demo/login',
    '/terms',
    '/privacy'
  ]
  
  // 現在のパスがnoLayoutPathsに含まれているかチェック
  // ルートページ（'/'）の場合は完全一致、それ以外はstartsWithでチェック
  const shouldUseLayout = pathname ? !noLayoutPaths.some(path => {
    if (path === '/') {
      return pathname === '/'
    }
    return pathname.startsWith(path)
  }) : false
  
  // レイアウトを使わないページの場合は、childrenをそのまま返す
  if (!shouldUseLayout) {
    return <>{children}</>
  }
  
  // クライアントサイドマウント前は、最小限のローディング表示を返す（Hydrationエラー対策）
  // 注意: サーバーサイドとクライアントサイドで同じ構造を返す必要がある
  if (!isMounted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">アプリケーションを初期化中...</p>
        </div>
      </div>
    )
  }
  
  // Shopify埋め込みモードの場合
  if (isEmbedded) {
    return <EmbeddedAppLayout>{children}</EmbeddedAppLayout>
  }
  
  // MainLayoutを使う場合
  return <MainLayout>{children}</MainLayout>
}