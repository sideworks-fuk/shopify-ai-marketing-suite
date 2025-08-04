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
  
  // MainLayoutを使わないページのパスを定義
  const noLayoutPaths = [
    '/install',
    '/auth/success',
    '/auth/callback',
    '/terms',
    '/privacy'
  ]
  
  // 現在のパスがnoLayoutPathsに含まれているかチェック
  const shouldUseMainLayout = !noLayoutPaths.some(path => pathname.startsWith(path))
  
  // Shopify埋め込みモードの場合
  if (isEmbedded) {
    return <EmbeddedAppLayout>{children}</EmbeddedAppLayout>
  }
  
  // MainLayoutを使う場合と使わない場合で分岐
  if (shouldUseMainLayout) {
    return <MainLayout>{children}</MainLayout>
  }
  
  // MainLayoutを使わない場合は、childrenをそのまま返す
  return <>{children}</>
}