"use client"

import React, { createContext, useContext, useEffect, useState } from 'react'
import { AppBridgeProvider, useAppBridge } from '@/lib/shopify/app-bridge-provider'
import { ApiClient } from '@/lib/api-client'
import { migrateLocalStorageVariables } from '@/lib/localstorage-migration'

/**
 * 認証プロバイダー（App Bridge統合版）
 * 
 * @author YUKI  
 * @date 2025-07-28
 * @updated 2025-10-18
 * @description Shopify App Bridgeと統合した認証システム
 */

interface AuthContextType {
  isAuthenticated: boolean
  isInitializing: boolean
  isApiClientReady: boolean
  currentStoreId: number | null
  authError: string | null
  authMode: 'shopify' | 'demo' | null
  login: (storeId: number) => Promise<void>
  logout: () => void
  clearError: () => void
  refreshAuth: () => Promise<void>
  getApiClient: () => ApiClient
  markAuthenticated: (storeId: number) => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: React.ReactNode
}

// 内部のAuthProviderコンポーネント
function AuthProviderInner({ children }: AuthProviderProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isInitializing, setIsInitializing] = useState(true)
  const [currentStoreId, setCurrentStoreId] = useState<number | null>(null)
  const [authError, setAuthError] = useState<string | null>(null)
  const [authMode, setAuthMode] = useState<'shopify' | 'demo' | null>(null)
  const [apiClient, setApiClient] = useState<ApiClient | null>(null)
  const [isApiClientReady, setIsApiClientReady] = useState(false)
  
  const { getToken, isEmbedded } = useAppBridge()

  // APIクライアントの初期化
  useEffect(() => {
    let client: ApiClient;
    
    if (isEmbedded) {
      // Shopify埋め込みアプリの場合
      client = new ApiClient(undefined, {
        getShopifyToken: async () => {
          const token = await getToken();
          if (!token) {
            throw new Error('Shopify session token not available');
          }
          return token;
        }
      });
      setAuthMode('shopify')
      console.log('🔗 Shopify埋め込みアプリモードでAPIクライアントを初期化')
    } else {
      // スタンドアロンアプリの場合
      // OAuth認証成功後は、バックエンドがCookieベースの認証を使用する想定
      // デモトークンがある場合は使用、ない場合はOAuth認証成功フラグを確認
      const oauthAuthenticated = localStorage.getItem('oauth_authenticated')
      const demoToken = localStorage.getItem('demoToken')
      
      if (oauthAuthenticated === 'true') {
        // OAuth認証成功後: Cookieベースの認証を使用（Authorizationヘッダーは不要）
        client = new ApiClient(); // getShopifyTokenなし = Cookieベース認証
        setAuthMode('shopify')
        console.log('🔗 OAuth認証済み: Cookieベース認証を使用')
      } else if (demoToken) {
        // デモモード
        client = new ApiClient(undefined, {
          getDemoToken: () => demoToken
        });
        setAuthMode('demo')
        console.log('🔗 デモモードでAPIクライアントを初期化')
      } else {
        // 認証なし
        client = new ApiClient();
        setAuthMode(null)
        console.log('⚠️ 認証情報が見つかりません')
      }
    }
    
    setApiClient(client)
    setIsApiClientReady(true)
    console.log('✅ APIクライアントの初期化が完了しました')
  }, [getToken, isEmbedded])

  // アプリ起動時の自動認証
  useEffect(() => {
    const initializeAuth = async () => {
      console.log('🚀 認証の初期化を開始...')
      try {
        setIsInitializing(true)
        setAuthError(null)
        migrateLocalStorageVariables()
        
        const savedStoreId = localStorage.getItem('currentStoreId')
        const storeId = savedStoreId ? parseInt(savedStoreId, 10) : 1
        console.log('🏪 Store ID:', storeId)
        setCurrentStoreId(storeId)
        
        if (authMode === 'shopify' && isEmbedded) {
          // Shopify埋め込みアプリの場合、App Bridgeからトークンを取得
          try {
            const token = await getToken()
            if (token) {
              console.log('✅ Shopifyセッショントークンを取得しました')
              setIsAuthenticated(true)
            } else {
              console.log('⚠️ Shopifyセッショントークンが取得できませんでした')
              setIsAuthenticated(false)
            }
          } catch (error) {
            console.error('❌ Shopifyトークン取得エラー:', error)
            setIsAuthenticated(false)
          }
        } else if (authMode === 'demo') {
          // デモモードの場合、ローカルストレージからデモトークンを確認
          const demoToken = localStorage.getItem('demoToken')
          if (demoToken) {
            console.log('✅ デモトークンが見つかりました')
            setIsAuthenticated(true)
          } else {
            console.log('⚠️ デモトークンが見つかりませんでした')
            setIsAuthenticated(false)
          }
        }
      } catch (error: any) {
        console.error('❌ 認証の初期化に失敗:', error)
        setAuthError(error.message || '認証に失敗しました')
        setIsAuthenticated(false)
        console.log('⚠️ 認証なしでアプリケーションを継続します')
      } finally {
        setIsInitializing(false)
      }
    }
    
    if (apiClient) {
      initializeAuth()
    }
  }, [apiClient, authMode, isEmbedded, getToken])

  const login = async (storeId: number) => {
    try {
      setAuthError(null)
      console.log('🔐 ログイン開始:', storeId)
      
      if (authMode === 'demo') {
        // デモモードのログインは別ページで処理
        window.location.href = '/demo/login'
        return
      }
      
      // Shopify埋め込みアプリの場合、App Bridgeからトークンを取得
      if (authMode === 'shopify' && isEmbedded) {
        const token = await getToken()
        if (token) {
          setIsAuthenticated(true)
          setCurrentStoreId(storeId)
          localStorage.setItem('currentStoreId', storeId.toString())
          console.log('✅ Shopifyログイン成功')
        } else {
          throw new Error('Shopifyセッショントークンが取得できませんでした')
        }
      } else {
        throw new Error('サポートされていない認証モードです')
      }
    } catch (error: any) {
      console.error('❌ ログインエラー:', error)
      setAuthError(error.message || 'ログインに失敗しました')
      throw error
    }
  }

  const logout = () => {
    console.log('🚪 ログアウト実行')
    
    if (authMode === 'demo') {
      localStorage.removeItem('demoToken')
    }
    
    setIsAuthenticated(false)
    setCurrentStoreId(null)
    setAuthError(null)
    console.log('✅ ログアウト完了')
  }

  const clearError = () => {
    setAuthError(null)
  }

  const refreshAuth = async () => {
    try {
      setAuthError(null)
      
      if (authMode === 'shopify' && isEmbedded) {
        const token = await getToken()
        if (token) {
          setIsAuthenticated(true)
        } else {
          setIsAuthenticated(false)
          setAuthError('Shopifyセッショントークンが取得できませんでした')
        }
      } else if (authMode === 'demo') {
        const demoToken = localStorage.getItem('demoToken')
        if (demoToken) {
          setIsAuthenticated(true)
        } else {
          setIsAuthenticated(false)
          setAuthError('デモトークンが見つかりませんでした')
        }
      }
    } catch (error: any) {
      setIsAuthenticated(false)
      setAuthError(error.message || '認証の更新に失敗しました')
    }
  }

  const getApiClient = (): ApiClient => {
    if (!apiClient) {
      throw new Error('APIクライアントが初期化されていません')
    }
    return apiClient
  }

  // OAuth認証成功時に認証状態を明示的に設定するメソッド
  const markAuthenticated = (storeId: number) => {
    console.log('✅ OAuth認証成功をマーク:', { storeId })
    setIsAuthenticated(true)
    setCurrentStoreId(storeId)
    setAuthError(null)
    localStorage.setItem('currentStoreId', storeId.toString())
    localStorage.setItem('oauth_authenticated', 'true') // OAuth認証成功フラグ
  }

  // グローバルな認証エラーを監視
  useEffect(() => {
    const handler = (event: Event) => {
      console.error('🔴 グローバル認証エラー発火')
      setAuthError('認証が必要です')
      setIsAuthenticated(false)
    }
    window.addEventListener('auth:error', handler)
    return () => window.removeEventListener('auth:error', handler)
  }, [])

  // OAuth認証成功フラグを確認（初期化完了後）
  // 重要: 初期化が完了してから実行することで、認証状態の変動を防ぐ
  useEffect(() => {
    // 初期化中は実行しない
    if (isInitializing) {
      return
    }

    const oauthAuthenticated = localStorage.getItem('oauth_authenticated')
    if (oauthAuthenticated === 'true' && !isAuthenticated) {
      const savedStoreId = localStorage.getItem('currentStoreId')
      if (savedStoreId) {
        const storeId = parseInt(savedStoreId, 10)
        console.log('🔄 OAuth認証フラグを確認、認証状態を復元:', { storeId })
        setIsAuthenticated(true)
        setCurrentStoreId(storeId)
        setAuthError(null)
      }
    }
  }, [isAuthenticated, isInitializing])

  const value: AuthContextType = {
    isAuthenticated,
    isInitializing,
    isApiClientReady,
    currentStoreId,
    authError,
    authMode,
    login,
    logout,
    clearError,
    refreshAuth,
    getApiClient,
    markAuthenticated,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

// 外部から使用するAuthProvider（AppBridgeProviderでラップ）
export function AuthProvider({ children }: AuthProviderProps) {
  return (
    <AppBridgeProvider>
      <AuthProviderInner>{children}</AuthProviderInner>
    </AppBridgeProvider>
  )
}

// 開発環境でのデバッグヘルパー
export function AuthDebugInfo() {
  const auth = useAuth()
  if (process.env.NODE_ENV !== 'development') {
    return null
  }
  return (
    <div className="fixed bottom-4 right-4 bg-gray-800 text-white text-xs p-2 rounded shadow-lg z-50">
      <div className="font-bold mb-1">認証状態</div>
      <div>認証済み: {auth.isAuthenticated ? '✅' : '❌'}</div>
      <div>初期化中: {auth.isInitializing ? '⏳' : '✅'}</div>
      <div>認証モード: {auth.authMode || 'N/A'}</div>
      <div>Store ID: {auth.currentStoreId || 'N/A'}</div>
      {auth.authError && (
        <div className="text-red-300 mt-1">エラー: {auth.authError}</div>
      )}
      <div className="mt-1">
        <button onClick={() => auth.clearError()} className="text-blue-300 hover:text-blue-100 mr-2">エラークリア</button>
        <button onClick={() => auth.logout()} className="text-red-300 hover:text-red-100">ログアウト</button>
      </div>
    </div>
  )
}