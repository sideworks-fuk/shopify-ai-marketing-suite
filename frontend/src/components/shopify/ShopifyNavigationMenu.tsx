'use client'

import React, { useState, useEffect } from 'react'
import { NavMenu } from '@shopify/app-bridge-react'
import Image from 'next/image'

export function ShopifyNavigationMenu() {
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  // クライアントサイドでのみレンダリング（App Bridgeはクライアントサイドでのみ動作）
  if (!isClient) {
    return null
  }

  // NavMenuを安全にレンダリング
  try {
    return (
      <NavMenu>
        <a href="/" rel="home" className="flex items-center">
          <Image
            src="/branding/logo.png"
            alt="EC Ranger"
            width={150}
            height={48}
            className="h-8 md:h-9 w-auto"
            priority
          />
        </a>
        <a href="/setup/initial">データ同期</a>
        <a href="/sync">同期ステータス</a>
        <a href="/sales/year-over-year">前年同月比分析</a>
        <a href="/purchase/count-analysis">購入回数分析</a>
        <a href="/customers/dormant">休眠顧客分析</a>
      </NavMenu>
    )
  } catch (error) {
    console.warn('ShopifyNavigationMenu: NavMenuの初期化に失敗しました', error)
    // embedded内でページ上にメニューが出ると二重ナビになりUXが悪いので表示しない
    return null
  }
}