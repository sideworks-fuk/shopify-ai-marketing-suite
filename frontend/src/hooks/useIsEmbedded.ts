'use client'

import { useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'

/**
 * Shopify埋め込みモードを検出するフック
 * 
 * 注意: Hydrationエラー対策として、以下の設計を採用:
 * - サーバーサイド: 常に false を返す
 * - クライアントサイド初回レンダリング: false を返す（サーバーと一致させる）
 * - クライアントサイドマウント後: 正しい値を返す
 * 
 * これにより、サーバーとクライアントの初回レンダリング結果が一致し、
 * Hydrationエラーが発生しない。
 */
export function useIsEmbedded(): boolean {
  const searchParams = useSearchParams()
  const [isMounted, setIsMounted] = useState(false)
  const [isEmbedded, setIsEmbedded] = useState(false)
  
  // クライアントサイドマウント状態を設定
  useEffect(() => {
    setIsMounted(true)
  }, [])
  
  useEffect(() => {
    // マウント後のみ判定を行う（Hydrationエラー対策）
    if (!isMounted) {
      return
    }
    
    // Shopifyから埋め込まれている場合のパラメータチェック
    const embedded = 
      searchParams?.has('embedded') || 
      searchParams?.has('host') ||
      (typeof window !== 'undefined' && window.location !== window.parent.location)
    
    setIsEmbedded(embedded || false)
    
    // デバッグ情報
    if (embedded) {
      console.log('🛍️ Shopify embedded mode detected')
      console.log('  - embedded:', searchParams?.get('embedded'))
      console.log('  - host:', searchParams?.get('host'))
    }
  }, [searchParams, isMounted])
  
  // マウント前はサーバーと同じ値（false）を返す（Hydrationエラー対策）
  // マウント後は正しい値を返す
  return isMounted ? isEmbedded : false
}