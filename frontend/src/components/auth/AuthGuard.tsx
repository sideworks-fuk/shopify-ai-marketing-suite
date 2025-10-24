"use client"

import React, { useEffect, useMemo, useState } from 'react'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/components/providers/AuthProvider'
import { useDeveloperMode } from '@/contexts/DeveloperModeContext'
import AuthenticationRequired from '@/components/errors/AuthenticationRequired'
import { DeveloperModeBanner } from '@/components/dev/DeveloperModeBanner'

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
  const { isDeveloperMode } = useDeveloperMode()
  const [showAuthRequired, setShowAuthRequired] = useState(false)

  const isPublic = useMemo(() => {
    if (!pathname) return true
    const result = publicPaths.some(p => pathname.startsWith(p))
    console.log('🔒 [AuthGuard] Path check:', { pathname, isPublic: result })
    return result
  }, [pathname])

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

  console.log('🔒 [AuthGuard] Render:', {
    pathname,
    isPublic,
    isInitializing,
    isAuthenticated,
    authError,
    showAuthRequired,
    isDeveloperMode,
    willShowAuthScreen: !isPublic && !isInitializing && (!isAuthenticated || showAuthRequired)
  })

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
