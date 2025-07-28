"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { getApiUrl } from '@/lib/api-config'
import { authClient } from '@/lib/auth-client'

interface StoreInfo {
  id: number
  name: string
  description: string
  dataType: 'production' | 'test'
}

interface StoreContextType {
  currentStore: StoreInfo
  availableStores: StoreInfo[]
  switchStore: (storeId: number) => void
  isLoading: boolean
  error: string | null
}

// デフォルトストア（API取得失敗時のフォールバック）
const DEFAULT_STORES: StoreInfo[] = [
  {
    id: 1,
    name: "本番ストア",
    description: "実際のデータ",
    dataType: "production"
  },
  {
    id: 2,
    name: "テストストア",
    description: "2020-2025年テストデータ",
    dataType: "test"
  }
]

const StoreContext = createContext<StoreContextType | undefined>(undefined)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [currentStore, setCurrentStore] = useState<StoreInfo>(DEFAULT_STORES[0])
  const [availableStores, setAvailableStores] = useState<StoreInfo[]>(DEFAULT_STORES)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // APIからストア一覧を取得
  useEffect(() => {
    fetchStores()
  }, [])

  // ローカルストレージから復元
  useEffect(() => {
    const savedStoreId = localStorage.getItem('selectedStoreId')
    if (savedStoreId) {
      const store = availableStores.find(s => s.id === parseInt(savedStoreId))
      if (store) {
        setCurrentStore(store)
      }
    }
  }, [availableStores])

  const fetchStores = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await authClient.request(`${getApiUrl()}/api/store`)
      if (!response.ok) {
        throw new Error('ストア一覧の取得に失敗しました')
      }

      const result = await response.json()
      if (result.success && result.data?.stores) {
        setAvailableStores(result.data.stores)
        console.log('APIからストア一覧を取得しました:', result.data.stores)
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
  }

  const switchStore = (storeId: number) => {
    const store = availableStores.find(s => s.id === storeId)
    if (!store) return

    setIsLoading(true)
    setTimeout(() => {
      setCurrentStore(store)
      localStorage.setItem('selectedStoreId', storeId.toString())
      setIsLoading(false)
      
      // ページリロードして新しいデータを取得
      window.location.reload()
    }, 500)
  }

  return (
    <StoreContext.Provider value={{
      currentStore,
      availableStores,
      switchStore,
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