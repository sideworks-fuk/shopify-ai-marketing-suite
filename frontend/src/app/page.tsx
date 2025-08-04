"use client"

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSearchParams } from 'next/navigation'

export default function HomePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const isEmbedded = searchParams.has('embedded') || searchParams.has('host')

  useEffect(() => {
    console.log('🔍 [DEBUG] HomePage: useEffect triggered')
    console.log('🔍 [DEBUG] HomePage: Current pathname:', window.location.pathname)
    
    // Shopifyアプリとして埋め込まれている場合の処理
    if (isEmbedded) {
      console.log('🛍️ Shopify embedded app mode')
      
      // タイトルバーをシンプルに
      const title = 'AI Marketing Suite'
      if ((window as any).shopify) {
        (window as any).shopify.title = title
      }
    }
    
    // 開発環境でのリダイレクトカウンターリセット（デバッグ用）
    if (process.env.NODE_ENV === 'development') {
      const urlParams = new URLSearchParams(window.location.search)
      if (urlParams.get('reset') === 'true') {
        sessionStorage.removeItem('redirectCount')
        console.log('🔍 [DEBUG] HomePage: Redirect counter reset for development')
      }
    }
    
    // リダイレクト回数制限のチェック
    const redirectCount = sessionStorage.getItem('redirectCount') || '0'
    const currentCount = parseInt(redirectCount)
    
    if (currentCount > 2) {
      console.log('🔍 [DEBUG] HomePage: Max redirect limit reached, stopping redirects')
      return
    }
    
    // 既にdev-bookmarksにいる場合はリダイレクトしない
    if (window.location.pathname === '/dev-bookmarks' || window.location.pathname === '/dev-bookmarks/') {
      console.log('🔍 [DEBUG] HomePage: Already on dev-bookmarks, skipping redirect')
      return
    }
    
    // ルートページ（/）の場合のみリダイレクト
    if (window.location.pathname === '/') {
      console.log('🔍 [DEBUG] HomePage: Redirecting to /dev-bookmarks/')
      
      // リダイレクト回数をカウント
      sessionStorage.setItem('redirectCount', (currentCount + 1).toString())
      
      // デフォルトページとしてdev-bookmarksにリダイレクト
      router.push('/dev-bookmarks/')
    } else {
      console.log('🔍 [DEBUG] HomePage: Not on root path, skipping redirect')
    }
  }, [router, isEmbedded])

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
        <p style={{ marginTop: '8px', color: '#10b981', fontSize: '12px' }}>
          ✅ リダイレクト処理有効化済み
        </p>
        {process.env.NODE_ENV === 'development' && (
          <p style={{ marginTop: '8px', color: '#f59e0b', fontSize: '12px' }}>
            🔧 開発モード: ?reset=true でカウンターリセット
          </p>
        )}
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
