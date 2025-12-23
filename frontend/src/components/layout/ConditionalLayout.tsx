"use client"

import { usePathname, useSearchParams } from "next/navigation"
import MainLayout from "./MainLayout"
import { EmbeddedAppLayout } from "./EmbeddedAppLayout"
import { useIsEmbedded } from "@/hooks/useIsEmbedded"

interface ConditionalLayoutProps {
  children: React.ReactNode
}

export default function ConditionalLayout({ children }: ConditionalLayoutProps) {
  const pathname = usePathname()
  const isEmbedded = useIsEmbedded()
  
  // MainLayout/EmbeddedAppLayoutを使わないページのパスを定義
  const noLayoutPaths = [
    '/install',
    '/auth/success',
    '/auth/callback',
    '/terms',
    '/privacy'
  ]
  
  // 現在のパスがnoLayoutPathsに含まれているかチェック
  const shouldUseLayout = pathname ? !noLayoutPaths.some(path => pathname.startsWith(path)) : false
  
  // レイアウトを使わないページの場合は、childrenをそのまま返す
  if (!shouldUseLayout) {
    return <>{children}</>
  }
  
  // Shopify埋め込みモードの場合
  if (isEmbedded) {
    return <EmbeddedAppLayout>{children}</EmbeddedAppLayout>
  }
  
  // MainLayoutを使う場合
  return <MainLayout>{children}</MainLayout>
}