'use client'

import React, { ReactNode } from 'react'
import { AppBridgeProvider } from '@/providers/AppBridgeProvider'
import { ShopifyNavigationMenu } from '@/components/shopify/ShopifyNavigationMenu'

interface EmbeddedAppLayoutProps {
  children: ReactNode
}

export function EmbeddedAppLayout({ children }: EmbeddedAppLayoutProps) {
  return (
    <AppBridgeProvider>
      <div className="shopify-embedded">
        <ShopifyNavigationMenu />
        <main className="shopify-app-content">
          {children}
        </main>
      </div>
    </AppBridgeProvider>
  )
}