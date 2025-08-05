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

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // スキップパスの場合はそのまま通す
  if (SKIP_PATHS.some(path => pathname.startsWith(path))) {
    return NextResponse.next()
  }

  // storeIdがある場合のみ初期設定チェックを行う
  const storeId = request.cookies.get('storeId')?.value
  
  if (storeId) {
    try {
      // 初期設定の状態を確認
      const apiUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000'
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