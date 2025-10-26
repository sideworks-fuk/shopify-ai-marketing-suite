"use client"

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { createApp, Redirect } from '@shopify/app-bridge'
import { getSessionToken } from '@shopify/app-bridge-utils'

/**
 * Shopify App Bridge プロバイダー
 * 
 * @author YUKI
 * @date 2025-10-26
 * @description Shopify App Bridgeの初期化とセッショントークン取得機能を提供
 */

interface AppBridgeContextType {
  app: any | null
  isEmbedded: boolean
  getToken: () => Promise<string | null>
  shop: string | null
  host: string | null
}

const AppBridgeContext = createContext<AppBridgeContextType | undefined>(undefined)

export function useAppBridge() {
  const context = useContext(AppBridgeContext)
  if (context === undefined) {
    throw new Error('useAppBridge must be used within an AppBridgeProvider')
  }
  return context
}

interface AppBridgeProviderProps {
  children: ReactNode
}

export function AppBridgeProvider({ children }: AppBridgeProviderProps) {
  const [app, setApp] = useState<any | null>(null)
  const [isEmbedded, setIsEmbedded] = useState(false)
  const [shop, setShop] = useState<string | null>(null)
  const [host, setHost] = useState<string | null>(null)

  useEffect(() => {
    const initializeAppBridge = () => {
      try {
        // URLパラメータからshopとhostを取得
        const urlParams = new URLSearchParams(window.location.search)
        const shopParam = urlParams.get('shop')
        const hostParam = urlParams.get('host')

        if (shopParam && hostParam) {
          setShop(shopParam)
          setHost(hostParam)
          setIsEmbedded(true)

          // App Bridgeを初期化
          const appBridge = createApp({
            apiKey: process.env.NEXT_PUBLIC_SHOPIFY_API_KEY || '',
            host: hostParam,
            forceRedirect: true
          })

          setApp(appBridge)
          console.log('✅ Shopify App Bridge initialized', { shop: shopParam, host: hostParam })
          
          // トップレベルリダイレクトの処理（条件付き）
          if (window.top !== window.self) {
            // iframeの中にいる場合のみリダイレクト
            appBridge.dispatch(Redirect.toApp({ path: window.location.pathname }))
          }
        } else {
          console.log('ℹ️ Not running in Shopify embedded context')
          setIsEmbedded(false)
        }
      } catch (error) {
        console.error('❌ Failed to initialize App Bridge:', error)
        setIsEmbedded(false)
      }
    }

    initializeAppBridge()
  }, [])

  const getToken = async (): Promise<string | null> => {
    if (!app || !isEmbedded) {
      console.log('⚠️ App Bridge not available for token retrieval')
      return null
    }

    try {
      const token = await getSessionToken(app)
      console.log('✅ Session token retrieved successfully')
      return token
    } catch (error) {
      console.error('❌ Failed to get session token:', error)
      return null
    }
  }

  const value: AppBridgeContextType = {
    app,
    isEmbedded,
    getToken,
    shop,
    host
  }

  return (
    <AppBridgeContext.Provider value={value}>
      {children}
    </AppBridgeContext.Provider>
  )
}