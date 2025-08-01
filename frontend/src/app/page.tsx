"use client"

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function HomePage() {
  const router = useRouter()

  useEffect(() => {
    console.log('🔍 [DEBUG] HomePage: useEffect triggered')
    console.log('🔍 [DEBUG] HomePage: Current pathname:', window.location.pathname)
    
    // 一時的にリダイレクトを無効化（デバッグ用）
    console.log('🔍 [DEBUG] HomePage: Redirect temporarily disabled for debugging')
    return
    
    // 既にdev-bookmarksにいる場合はリダイレクトしない
    if (window.location.pathname === '/dev-bookmarks' || window.location.pathname === '/dev-bookmarks/') {
      console.log('🔍 [DEBUG] HomePage: Already on dev-bookmarks, skipping redirect')
      return
    }
    
    console.log('🔍 [DEBUG] HomePage: Redirecting to /dev-bookmarks/')
    // デフォルトページとしてdev-bookmarksにリダイレクト
    // Next.js App Routerの適切なリダイレクト方法を使用
    router.push('/dev-bookmarks/')
  }, [router])

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      fontFamily: 'system-ui, sans-serif'
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{
          width: '48px',
          height: '48px',
          border: '2px solid #e5e7eb',
          borderTop: '2px solid #2563eb',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          margin: '0 auto'
        }}></div>
        <p style={{ marginTop: '16px', color: '#6b7280' }}>リダイレクト中...</p>
        <p style={{ marginTop: '8px', color: '#9ca3af', fontSize: '12px' }}>
          デバッグ: {window.location.pathname}
        </p>
        <p style={{ marginTop: '8px', color: '#ef4444', fontSize: '12px' }}>
          ⚠️ リダイレクト一時無効化中（デバッグ用）
        </p>
      </div>
      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
