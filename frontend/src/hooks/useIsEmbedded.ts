'use client'

import { useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'

export function useIsEmbedded(): boolean {
  const searchParams = useSearchParams()
  const [isEmbedded, setIsEmbedded] = useState(false)
  
  useEffect(() => {
    // Shopifyから埋め込まれている場合のパラメータチェック
    const embedded = 
      searchParams.has('embedded') || 
      searchParams.has('host') ||
      (typeof window !== 'undefined' && window.location !== window.parent.location)
    
    setIsEmbedded(embedded)
    
    // デバッグ情報
    if (embedded) {
      console.log('🛍️ Shopify embedded mode detected')
      console.log('  - embedded:', searchParams.get('embedded'))
      console.log('  - host:', searchParams.get('host'))
    }
  }, [searchParams])
    
  return isEmbedded
}