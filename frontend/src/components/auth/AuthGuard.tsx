"use client"

import React, { useEffect, useMemo, useState } from 'react'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/components/providers/AuthProvider'
import AuthenticationRequired from '@/components/errors/AuthenticationRequired'
import { DeveloperModeBanner } from '@/components/dev/DeveloperModeBanner'
import { getAuthModeConfig } from '@/lib/config/environments'

const publicPaths = [
  // '/', // 🔒 ルートページも認証が必要な場合はコメントアウト
  '/install',
  '/auth/login',
  '/auth/callback',
  '/auth/success',
  '/auth/error',
  '/terms',
  '/privacy',
  '/dev-bookmarks', // 開発者ツールは独自認証
]

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { isAuthenticated, isInitializing, authError } = useAuth()
  const [showAuthRequired, setShowAuthRequired] = useState(false)
  const [isDeveloperMode, setIsDeveloperMode] = useState(false)

  // 環境設定を取得（UI表示用のみ）
  const config = getAuthModeConfig()

  const isPublic = useMemo(() => {
    console.log('🔍 [AuthGuard] Path check DETAILED:', {
      pathname: pathname,
      pathnameType: typeof pathname,
      pathnameLength: pathname?.length,
      publicPaths: publicPaths,
      publicPathsLength: publicPaths.length
    })

    if (!pathname) {
      console.log('✅ [AuthGuard] pathname is null/undefined, returning isPublic=true')
      return true
    }

    const result = publicPaths.some(p => {
      const matches = pathname.startsWith(p)
      console.log(`  - Checking "${p}": ${matches}`)
      return matches
    })

    console.log('🔒 [AuthGuard] Path check result:', { pathname, isPublic: result })
    return result
  }, [pathname])

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

  useEffect(() => {
    const handleAuthError = (event: Event) => {
      setShowAuthRequired(true)
    }
    window.addEventListener('auth:error', handleAuthError)
    return () => window.removeEventListener('auth:error', handleAuthError)
  }, [])

  useEffect(() => {
    console.log('🔒 [AuthGuard] State update:', { authError, isAuthenticated, showAuthRequired })
    if (authError) {
      console.log('🔒 [AuthGuard] Setting showAuthRequired=true (authError)')
      setShowAuthRequired(true)
    } else if (isAuthenticated) {
      console.log('🔒 [AuthGuard] Setting showAuthRequired=false (authenticated)')
      setShowAuthRequired(false)
    }
  }, [authError, isAuthenticated])

  // デバッグログ（環境設定に基づく）
  if (config.debugMode) {
    console.log('🔒 [AuthGuard] Render:', {
      pathname,
      isPublic,
      isInitializing,
      isAuthenticated,
      authError,
      showAuthRequired,
      isDeveloperMode,
      environment: config.environment,
      authMode: config.authMode,
      willShowAuthScreen: !isPublic && !isInitializing && (!isAuthenticated || showAuthRequired)
    })
  }

  // デモモードの場合は全ページで認証をスキップ（バナー付き）
  if (isDeveloperMode) {
    console.log('🔓 デモモード: 認証をスキップ', { pathname })
    return (
      <>
        <DeveloperModeBanner />
        {children}
      </>
    )
  }

  if (isPublic) {
    console.log('🔒 [AuthGuard] Rendering: Public page (no auth required)')
    return <>{children}</>
  }

  if (isInitializing) {
    console.log('🔒 [AuthGuard] Rendering: Initializing...')
    return <div className="min-h-screen flex items-center justify-center">読み込み中...</div>
  }

  if (!isAuthenticated || showAuthRequired) {
    console.log('🔒 [AuthGuard] Rendering: Authentication Required Screen')
    return <AuthenticationRequired message={authError ?? undefined} />
  }

  console.log('🔒 [AuthGuard] Rendering: Protected content (authenticated)')
  return <>{children}</>
}
