"use client"

import React, { createContext, useContext, useEffect, useState } from 'react'
import { authClient } from '@/lib/auth-client'
import { migrateLocalStorageVariables } from '@/lib/localstorage-migration'

/**
 * 認証プロバイダー
 * 
 * @author YUKI  
 * @date 2025-07-28
 * @description アプリ起動時の自動認証とグローバル認証状態管理
 */

interface AuthContextType {
  isAuthenticated: boolean
  isInitializing: boolean
  currentStoreId: number | null
  authError: string | null
  login: (storeId: number) => Promise<void>
  logout: () => void
  clearError: () => void
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

export function AuthProvider({ children }: AuthProviderProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isInitializing, setIsInitializing] = useState(true)
  const [currentStoreId, setCurrentStoreId] = useState<number | null>(null)
  const [authError, setAuthError] = useState<string | null>(null)

  // アプリ起動時の自動認証
  useEffect(() => {
    const initializeAuth = async () => {
      console.log('🚀 認証の初期化を開始...')
      
      try {
        setIsInitializing(true)
        setAuthError(null)

        // LocalStorage変数のマイグレーションを実行
        migrateLocalStorageVariables()

        // Phase 2: currentStoreIdのみを使用
        const savedStoreId = localStorage.getItem('currentStoreId')
        const storeId = savedStoreId ? parseInt(savedStoreId, 10) : 1

        console.log('🏪 Store ID:', storeId)
        setCurrentStoreId(storeId)

        // 既存のトークンの確認
        if (authClient.isAuthenticated()) {
          console.log('✅ 既存のトークンが見つかりました')
          setIsAuthenticated(true)
          return
        }

        // 自動認証を実行
        console.log('🔐 自動認証を実行中...')
        await authClient.authenticate(storeId)
        
        setIsAuthenticated(true)
        console.log('✅ 自動認証が成功しました')

      } catch (error: any) {
        console.error('❌ 認証の初期化に失敗:', error)
        setAuthError(error.message || '認証に失敗しました')
        setIsAuthenticated(false)
        
        // 認証に失敗してもアプリケーションは動作させる（デバッグのため）
        console.log('⚠️ 認証なしでアプリケーションを継続します')
        
      } finally {
        setIsInitializing(false)
      }
    }

    initializeAuth()
  }, [])

  const login = async (storeId: number) => {
    try {
      setAuthError(null)
      console.log('🔐 ログイン開始:', storeId)
      
      await authClient.authenticate(storeId)
      
      setIsAuthenticated(true)
      setCurrentStoreId(storeId)
      
      // LocalStorageにstoreIdを保存
      localStorage.setItem('currentStoreId', storeId.toString())
      
      console.log('✅ ログイン成功')
      
    } catch (error: any) {
      console.error('❌ ログインエラー:', error)
      setAuthError(error.message || 'ログインに失敗しました')
      throw error
    }
  }

  const logout = () => {
    console.log('🚪 ログアウト実行')
    
    authClient.clearTokens()
    setIsAuthenticated(false)
    setCurrentStoreId(null)
    setAuthError(null)
    
    console.log('✅ ログアウト完了')
  }

  const clearError = () => {
    setAuthError(null)
  }

  const value: AuthContextType = {
    isAuthenticated,
    isInitializing,
    currentStoreId,
    authError,
    login,
    logout,
    clearError
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
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
      <div>Store ID: {auth.currentStoreId || 'N/A'}</div>
      {auth.authError && (
        <div className="text-red-300 mt-1">
          エラー: {auth.authError}
        </div>
      )}
      <div className="mt-1">
        <button
          onClick={() => auth.clearError()}
          className="text-blue-300 hover:text-blue-100 mr-2"
        >
          エラークリア
        </button>
        <button
          onClick={() => auth.logout()}
          className="text-red-300 hover:text-red-100"
        >
          ログアウト
        </button>
      </div>
    </div>
  )
}