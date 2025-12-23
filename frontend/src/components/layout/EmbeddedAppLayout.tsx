'use client'

import React, { ReactNode } from 'react'
import { EmbeddedTopNav } from './EmbeddedTopNav'

interface EmbeddedAppLayoutProps {
  children: ReactNode
}

export function EmbeddedAppLayout({ children }: EmbeddedAppLayoutProps) {
  return (
    <div className="shopify-embedded">
      {/* 埋め込み時: サイドメニューは出さず、上部の軽量ナビのみ（host/shop等のクエリ維持） */}
      <EmbeddedTopNav />
      <main className="shopify-app-content">
        {children}
      </main>
    </div>
  )
}