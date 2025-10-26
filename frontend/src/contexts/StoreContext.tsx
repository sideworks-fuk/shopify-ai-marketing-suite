"use client"

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { getApiUrl } from '@/lib/api-config'

interface StoreInfo {
  id: number
  name: string
  description: string
  dataType: 'production' | 'test' | 'demo' // 🆕 'demo' を追加
  shopDomain?: string  // 🆕 Shopifyストアドメイン
}

interface StoreContextType {
  currentStore: StoreInfo
  availableStores: StoreInfo[]
  switchStore: (storeId: number) => void
  refreshStores: () => Promise<void>
  setCurrentStore: (storeId: number) => void
  isLoading: boolean
  error: string | null
}

// URLパラメータからshopドメインを取得する関数
const getShopFromUrl = (): string | null => {
  if (typeof window === 'undefined') return null
  const params = new URLSearchParams(window.location.search)
  return params.get('shop')
}

// デフォルトストア（API取得失敗時のフォールバック）
// 注意: shopDomainはURLパラメータから動的に取得されます
const DEFAULT_STORES: StoreInfo[] = [
  {
    id: 1,
    name: "本番ストア",
    description: "実際のデータ",
    dataType: "production",
    shopDomain: getShopFromUrl() || undefined  // 🆕 URLパラメータから取得
  },
  {
    id: 2,
    name: "テストストア",
    description: "2020-2025年テストデータ",
    dataType: "test",
    shopDomain: getShopFromUrl() || undefined  // 🆕 URLパラメータから取得
  }
]

const StoreContext = createContext<StoreContextType | undefined>(undefined)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [currentStore, setCurrentStore] = useState<StoreInfo>(DEFAULT_STORES[0])
  const [availableStores, setAvailableStores] = useState<StoreInfo[]>(DEFAULT_STORES)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isDeveloperMode, setIsDeveloperMode] = useState(false)

  // デモモード状態を監視
  useEffect(() => {
    const checkDeveloperMode = () => {
      if (typeof window !== 'undefined') {
        const devMode = localStorage.getItem('dev_mode_auth') === 'true'
        setIsDeveloperMode(devMode)
      }
    }
    
    checkDeveloperMode()
    
    // localStorageの変更を監視
    window.addEventListener('storage', checkDeveloperMode)
    return () => window.removeEventListener('storage', checkDeveloperMode)
  }, [])

  // ローカルストレージから復元
  useEffect(() => {
    // Phase 2: currentStoreIdのみを使用
    const savedStoreId = localStorage.getItem('currentStoreId')
    
    if (savedStoreId) {
      const store = availableStores.find(s => s.id === parseInt(savedStoreId))
      if (store) {
        setCurrentStore(store)
      }
    }
  }, [availableStores])

  const fetchStores = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      console.log('🔄 ストア一覧を取得中... デモモード:', isDeveloperMode)

      const response = await fetch(`${getApiUrl()}/api/store`)
      if (!response.ok) {
        throw new Error('ストア一覧の取得に失敗しました')
      }

      const result = await response.json()
      if (result.success && result.data?.stores) {
        let stores = result.data.stores

        // デモモード時は DataType = 'demo' のストアのみフィルタ
        if (isDeveloperMode) {
          stores = stores.filter((store: StoreInfo) => store.dataType === 'demo')
          console.log('🎯 デモモード: デモ用ストアのみ表示', stores)
        } else {
          console.log('📋 通常モード: 全ストアを表示', stores)
        }

        setAvailableStores(stores)
        console.log('✅ APIからストア一覧を取得しました:', stores)
      } else {
        console.warn('APIレスポンスが不正です。デフォルトストアを使用します。')
      }
    } catch (error) {
      console.error('ストア一覧取得エラー:', error)
      setError('ストア情報の取得に失敗しました。デフォルト設定を使用します。')
      // エラー時はデフォルトストアを使用
      setAvailableStores(DEFAULT_STORES)
    } finally {
      setIsLoading(false)
    }
  }, [isDeveloperMode])

  // APIからストア一覧を取得（デモモード状態変化時も再取得）
  useEffect(() => {
    fetchStores()
  }, [fetchStores])

  const switchStore = (storeId: number) => {
    const store = availableStores.find(s => s.id === storeId)
    if (!store) return

    setIsLoading(true)
    setTimeout(() => {
      setCurrentStore(store)
      // Phase 2: currentStoreIdのみを使用
      localStorage.setItem('currentStoreId', storeId.toString())
      setIsLoading(false)
      
      // ページリロードして新しいデータを取得
      window.location.reload()
    }, 500)
  }

  const refreshStores = async () => {
    await fetchStores()
  }

  const setCurrentStoreById = (storeId: number) => {
    const store = availableStores.find(s => s.id === storeId)
    if (store) {
      setCurrentStore(store)
      // Phase 2: currentStoreIdのみを使用
      localStorage.setItem('currentStoreId', storeId.toString())
    }
  }

  return (
    <StoreContext.Provider value={{
      currentStore,
      availableStores,
      switchStore,
      refreshStores,
      setCurrentStore: setCurrentStoreById,
      isLoading,
      error
    }}>
      {children}
    </StoreContext.Provider>
  )
}

export function useStore() {
  const context = useContext(StoreContext)
  if (!context) {
    throw new Error('useStore must be used within a StoreProvider')
  }
  return context
}