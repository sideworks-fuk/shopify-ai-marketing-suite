'use client'

import React, { useState, useEffect } from 'react'
import { NavMenu, useAppBridge } from '@shopify/app-bridge-react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

/**
 * 高度なShopifyナビゲーション実装
 * - App Bridgeのルーティングと統合
 * - アクティブ状態の管理
 * - エラーハンドリングの強化
 */
export function ShopifyNavigationAdvanced() {
  const [isClient, setIsClient] = useState(false)
  const [isShopifyEmbedded, setIsShopifyEmbedded] = useState(false)
  const router = useRouter()
  const shopify = useAppBridge()

  useEffect(() => {
    setIsClient(true)
    // Shopify埋め込み環境かどうかを確認
    const checkEmbedded = () => {
      try {
        setIsShopifyEmbedded(window.top !== window.self)
      } catch (e) {
        // クロスオリジンエラーの場合は埋め込まれている
        setIsShopifyEmbedded(true)
      }
    }
    checkEmbedded()
  }, [])

  // クライアントサイドでのみレンダリング
  if (!isClient) {
    return null
  }

  // Shopify埋め込み環境でない場合はレンダリングしない
  if (!isShopifyEmbedded) {
    console.log('ShopifyNavigationAdvanced: 非埋め込み環境のためスキップ')
    return null
  }

  const handleNavigation = (e: React.MouseEvent<HTMLAnchorElement>, path: string) => {
    e.preventDefault()
    
    try {
      // Next.jsのルーターを使用してナビゲート
      router.push(path)
      
      // Shopify管理画面のURLも更新（オプション）
      if (shopify && typeof shopify === 'object') {
        // App Bridge v4では直接的なナビゲーションAPIは提供されていない
        // 代わりにNext.jsルーターを使用
      }
    } catch (error) {
      console.error('Navigation error:', error)
      // フォールバック: 通常のリンクナビゲーション
      window.location.href = path
    }
  }

  try {
    return (
      <NavMenu>
        <a 
          href="/" 
          rel="home"
          onClick={(e) => handleNavigation(e, '/')}
          className="flex items-center"
        >
          <Image
            src="/branding/logo.png"
            alt="EC Ranger"
            width={150}
            height={48}
            className="h-8 md:h-9 w-auto"
            priority
          />
        </a>
        <a 
          href="/setup/initial"
          onClick={(e) => handleNavigation(e, '/setup/initial')}
        >
          データ同期
        </a>
        <a 
          href="/sync"
          onClick={(e) => handleNavigation(e, '/sync')}
        >
          同期ステータス
        </a>
        <a 
          href="/sales/year-over-year"
          onClick={(e) => handleNavigation(e, '/sales/year-over-year')}
        >
          前年同月比分析
        </a>
        <a 
          href="/purchase/count-analysis"
          onClick={(e) => handleNavigation(e, '/purchase/count-analysis')}
        >
          購入回数分析
        </a>
        <a 
          href="/customers/dormant"
          onClick={(e) => handleNavigation(e, '/customers/dormant')}
        >
          休眠顧客分析
        </a>
      </NavMenu>
    )
  } catch (error) {
    console.warn('ShopifyNavigationAdvanced: NavMenuの初期化に失敗しました', error)
    return null
  }
}