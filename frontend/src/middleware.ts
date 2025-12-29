import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// 初期設定チェックをスキップするパス
const SKIP_PATHS = [
  '/setup/initial',
  '/setup/syncing',
  '/install',
  '/auth',
  '/api',
  '/_next',
  '/favicon.ico',
]

// 開発用ページのパスパターン
const DEV_PATHS = [
  '/dev-bookmarks',
  '/dev/',
  '/test/',
  '/debug/',
  '/api-test',
  '/dormant-api-test',
  '/database-test',
  '/debug-env',
  '/year-over-year-api-test',
  '/purchase-count-api-test',
  '/test-sync',
  '/settings/environment',  // 環境設定（開発用）
]

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // 🆕 ngrokの警告ページをスキップするためのヘッダーを追加
  // ShopifyからのOAuthコールバックリクエストがngrokの警告ページでブロックされるのを防ぐ
  const response = NextResponse.next()
  
  // ngrok経由のリクエストの場合、警告ページをスキップするヘッダーを追加
  if (request.headers.get('host')?.includes('ngrok-free.dev') || 
      request.headers.get('host')?.includes('ngrok.io')) {
    response.headers.set('ngrok-skip-browser-warning', 'true')
  }
  
  // 本番環境で開発用ページへのアクセスをブロック
  const isProduction = process.env.NODE_ENV === 'production' || 
                       process.env.NEXT_PUBLIC_BUILD_ENVIRONMENT === 'production' ||
                       process.env.NEXT_PUBLIC_APP_ENVIRONMENT === 'production'
  
  if (isProduction) {
    // 開発用ページへのアクセスをチェック
    const isDevPath = DEV_PATHS.some(path => {
      if (path.endsWith('/')) {
        return pathname.startsWith(path)
      }
      return pathname === path || pathname.startsWith(path + '/')
    })
    
    if (isDevPath) {
      // 404ページへリダイレクト
      const url = request.nextUrl.clone()
      url.pathname = '/404'
      return NextResponse.redirect(url)
    }
  }

  // スキップパスの場合はそのまま通す
  if (SKIP_PATHS.some(path => pathname.startsWith(path))) {
    return response
  }

  // storeIdがある場合のみ初期設定チェックを行う
  const storeId = request.cookies.get('storeId')?.value
  
  if (storeId) {
    try {
      // 初期設定の状態を確認
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'
      const response = await fetch(`${apiUrl}/api/setup/status`, {
        headers: {
          'X-Store-Id': storeId,
        },
      })

      if (response.ok) {
        const data = await response.json()
        
        // 初期設定が完了していない場合は初期設定画面へリダイレクト
        if (!data.initialSetupCompleted) {
          const url = request.nextUrl.clone()
          url.pathname = '/setup/initial'
          return NextResponse.redirect(url)
        }
      }
    } catch (error) {
      // エラーの場合はログのみ出力して通常のフローを続行
      console.warn('初期設定チェックに失敗しました:', error)
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}