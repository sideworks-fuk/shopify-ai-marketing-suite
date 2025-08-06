'use client'

import React, { useState, useEffect } from 'react'
import { NavMenu } from '@shopify/app-bridge-react'

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
        <a href="/" rel="home">EC Ranger</a>
        <a href="/setup/initial">データ同期</a>
        <a href="/sales/year-over-year">前年同月比分析</a>
        <a href="/purchase/count-analysis">購入回数分析</a>
        <a href="/customers/dormant">休眠顧客分析</a>
      </NavMenu>
    )
  } catch (error) {
    console.warn('ShopifyNavigationMenu: NavMenuの初期化に失敗しました', error)
    // エラー時はフォールバック（通常のナビゲーションとして表示）
    return (
      <nav className="shopify-navigation-fallback">
        <ul style={{ listStyle: 'none', padding: 0, display: 'flex', gap: '1rem' }}>
          <li><a href="/">EC Ranger</a></li>
          <li><a href="/setup/initial">データ同期</a></li>
          <li><a href="/sales/year-over-year">前年同月比分析</a></li>
          <li><a href="/purchase/count-analysis">購入回数分析</a></li>
          <li><a href="/customers/dormant">休眠顧客分析</a></li>
        </ul>
      </nav>
    )
  }
}